# F4: Tribes — Tech Spec

> See [overview.md](./overview.md) for full architecture context.
> Depends on: [F1 Auth](./f1-auth-onboarding.md), [F2 Profiles](./f2-builder-profiles.md).

## Data Models

```python
# backend/models/tribe.py
class TribeStatus(str, enum.Enum):
    OPEN = "open"       # Looking for members
    ACTIVE = "active"   # Full team, building
    ALUMNI = "alumni"   # Past collaboration

class MemberRole(str, enum.Enum):
    OWNER = "owner"
    MEMBER = "member"

class MemberStatus(str, enum.Enum):
    PENDING = "pending"      # Requested to join, waiting for owner
    ACTIVE = "active"        # Full member
    REJECTED = "rejected"    # Join request declined
    LEFT = "left"            # Member voluntarily left
    REMOVED = "removed"      # Owner kicked them

class Tribe(Base):
    __tablename__ = "tribes"

    id = Column(String(26), primary_key=True)  # ULID
    owner_id = Column(String(26), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    name = Column(String(100), nullable=False)
    mission = Column(Text, nullable=True)
    status = Column(Enum(TribeStatus), default=TribeStatus.OPEN)
    max_members = Column(Integer, default=8)

    # Full-text search
    search_vector = Column(TSVECTOR)

    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    __table_args__ = (
        Index("ix_tribes_search_vector", "search_vector", postgresql_using="gin"),
        Index("ix_tribes_status", "status"),
    )

# Association table (not a mapped ORM class)
tribe_members = Table(
    "tribe_members",
    Base.metadata,
    Column("tribe_id", String(26), ForeignKey("tribes.id", ondelete="CASCADE"), primary_key=True),
    Column("user_id", String(26), ForeignKey("users.id", ondelete="CASCADE"), primary_key=True),
    Column("role", Enum(MemberRole), nullable=False, default=MemberRole.MEMBER, server_default="member"),
    Column("status", Enum(MemberStatus), nullable=False, default=MemberStatus.PENDING, server_default="pending"),
    Column("requested_role_id", String(26), ForeignKey("tribe_open_roles.id"), nullable=True),  # which open role they applied for
    Column("joined_at", DateTime(timezone=True), nullable=True),
    Column("requested_at", DateTime(timezone=True), nullable=False, server_default=func.now()),
)

class TribeOpenRole(Base):
    __tablename__ = "tribe_open_roles"

    id = Column(String(26), primary_key=True)
    tribe_id = Column(String(26), ForeignKey("tribes.id", ondelete="CASCADE"), nullable=False, index=True)
    title = Column(String(100), nullable=False)  # "Backend Engineer"
    skills_needed = Column(JSONB, default=list)   # ["Python", "PostgreSQL"]
    filled = Column(Boolean, default=False)
    filled_by = Column(String(26), ForeignKey("users.id"), nullable=True)
```

## State Machine

```
OPEN ──(owner sets active)──> ACTIVE
OPEN ──(owner archives)────> ALUMNI
ACTIVE ──(owner archives)──> ALUMNI
ACTIVE ──(owner reopens)───> OPEN
ALUMNI ──(owner reopens)───> OPEN
```

All status transitions are manual via the `updateTribe` mutation. There is no automatic transition.

When a member is approved:
1. Set member status to `active`, `joined_at = now()`
2. If `requested_role_id` is set, mark that `TribeOpenRole` as `filled = true`, `filled_by = user_id`

## GraphQL Types

```python
@strawberry.type
class TribeType:
    id: str
    name: str
    mission: str | None
    status: TribeStatus          # enum, not string
    max_members: int
    created_at: datetime
    updated_at: datetime

    # Resolved via from_model(), not DataLoaders (eager-loaded)
    _owner: strawberry.Private[object | None]
    _members: strawberry.Private[list]
    _open_roles: strawberry.Private[list]

    @strawberry.field
    def owner(self) -> UserType: ...

    @strawberry.field
    def members(self) -> list["TribeMemberType"]: ...

    @strawberry.field
    def open_roles(self) -> list["OpenRoleType"]: ...

    @classmethod
    def from_model(cls, tribe: TribeModel) -> "TribeType": ...

@strawberry.type
class TribeMemberType:
    user: UserType
    role: MemberRole      # owner | member
    status: MemberStatus  # pending | active | rejected | left | removed
    requested_role: OpenRoleType | None  # the open role they applied for
    joined_at: datetime | None

@strawberry.type
class OpenRoleType:
    id: str
    title: str
    skills_needed: strawberry.scalars.JSON  # JSONB list
    filled: bool
    filled_by: UserType | None  # set when role is filled via member approval
```

Note: The actual implementation uses `from_model()` with eager-loaded relationships rather than DataLoaders. Mutations accept inline arguments (not input types).

## Queries

```python
@strawberry.type
class Query:
    @strawberry.field
    async def tribe(self, id: strawberry.ID, info: strawberry.types.Info) -> TribeType | None:
        """Fetch a single tribe by ID with owner, members, and open roles."""
        session = info.context.session
        t = await tribe_service.get_with_details(session, str(id))
        return TribeType.from_model(t) if t else None

    @strawberry.field
    async def tribes(
        self, info: strawberry.types.Info,
        limit: int = 20, offset: int = 0, status: str | None = None,
    ) -> list[TribeType]:
        """Paginated list of tribes, optionally filtered by status."""
        ...

    @strawberry.field
    async def search_tribes(
        self, info: strawberry.types.Info,
        query: str, limit: int = 20, offset: int = 0,
    ) -> list[TribeType]:
        """Search tribes via query-time joins across related tables.
        Single search bar — no filter params. Matches against:
          - tribes: name, mission (via tribes.search_vector)
          - tribe_open_roles: title, skills_needed
          - users (members): display_name, timezone
        Uses plainto_tsquery for text matching and ILIKE fallback for
        short/partial terms. Results ranked by ts_rank. Deduped by tribe ID.
        """
        ...
```

## Search Strategy

**Approach:** Query-time joins (Option B). Each table maintains its own `search_vector`. At search time, a single SQL query joins across `tribes`, `tribe_open_roles`, and `tribe_members → users`, matching the search term against each table's fields. No denormalization, no triggers — always fresh data.

**Note:** Project search is deferred until the Associated Project relationship is implemented (see product spec TBD).

**Searchable fields:**

| Source | Fields | Match method |
|--------|--------|--------------|
| `tribes` | name, mission | TSVECTOR (GIN) |
| `tribe_open_roles` | title, skills_needed (JSONB array elements) | ILIKE |
| `users` (via tribe_members) | display_name, timezone | TSVECTOR (GIN) or ILIKE |

**Query structure:**
```sql
SELECT DISTINCT t.*
FROM tribes t
LEFT JOIN tribe_open_roles tor ON tor.tribe_id = t.id
LEFT JOIN tribe_members tm ON tm.tribe_id = t.id AND tm.status = 'active'
LEFT JOIN users u ON u.id = tm.user_id
WHERE
  t.search_vector @@ plainto_tsquery(:q)
  OR u.search_vector @@ plainto_tsquery(:q)
  OR tor.title ILIKE :pattern
  OR EXISTS (SELECT 1 FROM jsonb_array_elements_text(tor.skills_needed) s WHERE s ILIKE :pattern)
  OR u.timezone ILIKE :pattern
ORDER BY ts_rank(t.search_vector, plainto_tsquery(:q)) DESC NULLS LAST
LIMIT :limit OFFSET :offset;
```

## Mutations

```python
@strawberry.type
class TribeMutations:
    @strawberry.mutation
    async def create_tribe(self, info, name: str, mission: str | None = None, max_members: int = 8) -> TribeType:
        user_id = require_auth(info)
        # Creates tribe + auto-adds owner as active member
        # Open roles are NOT part of creation — frontend calls addOpenRole separately for each role
        tribe = await tribe_service.create(session, owner_id=user_id, name=name, mission=mission, max_members=max_members)
        return TribeType.from_model(tribe)

    @strawberry.mutation
    async def update_tribe(self, info, id: strawberry.ID, name: str | None = None, mission: str | None = None, status: str | None = None, max_members: int | None = None) -> TribeType:
        # Owner only
        ...

    @strawberry.mutation
    async def add_open_role(self, info, tribe_id: strawberry.ID, title: str, skills_needed: list[str] | None = None) -> OpenRoleType:
        # Owner only
        ...

    @strawberry.mutation
    async def remove_open_role(self, info, role_id: strawberry.ID) -> bool:
        # Owner only
        ...

    @strawberry.mutation
    async def request_to_join(self, info, tribe_id: strawberry.ID, role_id: strawberry.ID) -> bool:
        # Validate: tribe is open, user not already member, role exists and not filled
        ...

    @strawberry.mutation
    async def approve_member(self, info, tribe_id: strawberry.ID, member_id: strawberry.ID) -> bool:
        # Owner only
        ...

    @strawberry.mutation
    async def reject_member(self, info, tribe_id: strawberry.ID, member_id: strawberry.ID) -> bool:
        # Owner only
        ...

    @strawberry.mutation
    async def remove_member(self, info, tribe_id: strawberry.ID, member_id: strawberry.ID) -> bool:
        # Owner only — removes an active member
        ...

    @strawberry.mutation
    async def leave_tribe(self, info, tribe_id: strawberry.ID) -> bool:
        # Owner cannot leave (must archive)
        ...
```

## Validation Rules

| Field | Constraints |
|-------|------------|
| `name` | 1-100 chars |
| `mission` | Max 2000 chars |
| `max_members` | Positive integer (no upper bound) |
| `open_role.title` | 1-100 chars |
| `open_role.skills_needed` | Max 10 items |
| Cannot join a tribe you're already in | |
| `role_id` must reference an unfilled open role on the tribe | |
| Owner cannot leave (must archive) | |
| Cannot have more active members than `max_members` | |
