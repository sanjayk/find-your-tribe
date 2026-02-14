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
        Index("ix_tribes_search", "search_vector", postgresql_using="gin"),
        Index("ix_tribes_status", "status"),
    )

class TribeMember(Base):
    __tablename__ = "tribe_members"

    tribe_id = Column(String(26), ForeignKey("tribes.id", ondelete="CASCADE"), primary_key=True)
    user_id = Column(String(26), ForeignKey("users.id", ondelete="CASCADE"), primary_key=True)
    role = Column(Enum(MemberRole), default=MemberRole.MEMBER)
    status = Column(Enum(MemberStatus), default=MemberStatus.PENDING)
    joined_at = Column(DateTime(timezone=True), nullable=True)
    requested_at = Column(DateTime(timezone=True), server_default=func.now())

    __table_args__ = (
        Index("ix_tribe_members_user", "user_id"),
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
OPEN ──(all roles filled)──> ACTIVE
OPEN ──(owner archives)───> ALUMNI
ACTIVE ──(owner archives)──> ALUMNI
ALUMNI ──(owner reopens)───> OPEN
```

When a member is approved for an open role:
1. Set `TribeMember.status = active`, `joined_at = now()`
2. Set `TribeOpenRole.filled = true`, `filled_by = user_id`
3. Check if all open roles are filled → if yes, set `Tribe.status = active`

## GraphQL Types

```python
@strawberry.type
class TribeType:
    id: strawberry.ID
    name: str
    mission: str | None
    status: str
    max_members: int
    created_at: datetime

    @strawberry.field
    async def owner(self, info: strawberry.types.Info) -> UserType:
        return await info.context.loaders.users.load(self.owner_id)

    @strawberry.field
    async def members(self, info: strawberry.types.Info) -> list["TribeMemberType"]:
        return await info.context.loaders.tribe_members.load(self.id)

    @strawberry.field
    async def open_roles(self, info: strawberry.types.Info) -> list["OpenRoleType"]:
        return await info.context.loaders.tribe_open_roles.load(self.id)

    @strawberry.field
    async def member_count(self, info: strawberry.types.Info) -> int:
        return await info.context.loaders.tribe_member_count.load(self.id)

@strawberry.type
class TribeMemberType:
    user: UserType
    role: str       # owner | member
    status: str     # pending | active | rejected | left | removed
    joined_at: datetime | None

@strawberry.type
class OpenRoleType:
    id: strawberry.ID
    title: str
    skills_needed: list[str]
    filled: bool
    filled_by: UserType | None

@strawberry.input
class CreateTribeInput:
    name: str           # 1-100 chars
    mission: str | None = None  # max 2000 chars
    max_members: int = 8  # 2-8

@strawberry.input
class UpdateTribeInput:
    name: str | None = None
    mission: str | None = None
    status: str | None = None
    max_members: int | None = None

@strawberry.input
class OpenRoleInput:
    title: str              # 1-100 chars
    skills_needed: list[str] | None = None  # max 10
```

## Mutations

```python
@strawberry.type
class Mutation:
    @strawberry.mutation
    async def create_tribe(self, input: CreateTribeInput, info: strawberry.types.Info) -> TribeType:
        user = require_auth(info)
        tribe = await tribe_service.create(user.id, input)
        # Auto-add owner as active member
        await tribe_service.add_member(tribe.id, user.id, role="owner", status="active")
        background_tasks.add_task(create_feed_event, "tribe_created", user.id, "tribe", tribe.id)
        return TribeType.from_model(tribe)

    @strawberry.mutation
    async def update_tribe(self, id: strawberry.ID, input: UpdateTribeInput, info: strawberry.types.Info) -> TribeType:
        user = require_auth(info)
        tribe = await tribe_service.get(id)
        require_tribe_owner(user, tribe)
        updated = await tribe_service.update(id, input)
        return TribeType.from_model(updated)

    @strawberry.mutation
    async def add_open_role(self, tribe_id: strawberry.ID, input: OpenRoleInput, info: strawberry.types.Info) -> OpenRoleType:
        user = require_auth(info)
        tribe = await tribe_service.get(tribe_id)
        require_tribe_owner(user, tribe)
        role = await tribe_service.add_open_role(tribe_id, input)
        return OpenRoleType.from_model(role)

    @strawberry.mutation
    async def request_to_join(self, tribe_id: strawberry.ID, role_id: strawberry.ID, info: strawberry.types.Info) -> TribeMemberType:
        user = require_auth(info)
        # Validate: tribe is open, user not already member, role not filled
        member = await tribe_service.request_to_join(tribe_id, user.id, role_id)
        return TribeMemberType.from_model(member)

    @strawberry.mutation
    async def approve_member(self, tribe_id: strawberry.ID, user_id: strawberry.ID, info: strawberry.types.Info) -> TribeMemberType:
        owner = require_auth(info)
        tribe = await tribe_service.get(tribe_id)
        require_tribe_owner(owner, tribe)
        member = await tribe_service.approve_member(tribe_id, user_id)
        background_tasks.add_task(create_feed_event, "member_joined_tribe", user_id, "tribe", tribe_id)
        return TribeMemberType.from_model(member)

    @strawberry.mutation
    async def reject_member(self, tribe_id: strawberry.ID, user_id: strawberry.ID, info: strawberry.types.Info) -> bool:
        owner = require_auth(info)
        tribe = await tribe_service.get(tribe_id)
        require_tribe_owner(owner, tribe)
        await tribe_service.reject_member(tribe_id, user_id)
        return True

    @strawberry.mutation
    async def leave_tribe(self, tribe_id: strawberry.ID, info: strawberry.types.Info) -> bool:
        user = require_auth(info)
        # Owner cannot leave (must transfer or archive)
        await tribe_service.leave(tribe_id, user.id)
        return True
```

## Validation Rules

| Field | Constraints |
|-------|------------|
| `name` | 1-100 chars |
| `mission` | Max 2000 chars |
| `max_members` | 2-8 |
| `open_role.title` | 1-100 chars |
| `open_role.skills_needed` | Max 10 items |
| Cannot join a tribe you're already in | |
| Owner cannot leave (must archive) | |
| Cannot have more active members than `max_members` | |
