# F6: Build Feed — Tech Spec

> See [overview.md](./overview.md) for full architecture context.
> Depends on: [F3 Projects](./f3-projects.md), [F4 Tribes](./f4-tribes.md).

## Data Model

```python
# backend/models/feed.py
class EventType(str, enum.Enum):
    PROJECT_CREATED = "project_created"
    PROJECT_SHIPPED = "project_shipped"       # Status changed to "shipped"
    COLLABORATION_CONFIRMED = "collaboration_confirmed"
    TRIBE_CREATED = "tribe_created"
    MEMBER_JOINED_TRIBE = "member_joined_tribe"
    BUILDER_JOINED = "builder_joined"

class FeedEvent(Base):
    __tablename__ = "feed_events"

    id = Column(String(26), primary_key=True)  # ULID (naturally time-ordered)
    event_type = Column(Enum(EventType), nullable=False)
    actor_id = Column(String(26), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    target_type = Column(String(20), nullable=False)  # "project", "tribe", "user"
    target_id = Column(String(26), nullable=False)
    metadata = Column(JSONB, default=dict)  # Extra context (project title, tribe name, etc.)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    __table_args__ = (
        Index("ix_feed_events_created", "created_at"),
        Index("ix_feed_events_type_created", "event_type", "created_at"),
        Index("ix_feed_events_actor", "actor_id"),
    )
```

## Event Generation

Feed events are created **synchronously** within the same transaction as the triggering action. This guarantees consistency.

```python
# backend/services/feed_service.py
async def create_feed_event(
    event_type: str,
    actor_id: str,
    target_type: str,
    target_id: str,
    metadata: dict | None = None,
    session: AsyncSession = None,
):
    event = FeedEvent(
        id=str(ULID()),
        event_type=event_type,
        actor_id=actor_id,
        target_type=target_type,
        target_id=target_id,
        metadata=metadata or {},
    )
    session.add(event)
    # Committed as part of the parent transaction
```

### Event Triggers

| Action | Event Type | Target |
|--------|-----------|--------|
| User creates a project | `project_created` | project |
| Project status → shipped | `project_shipped` | project |
| Collaborator confirms | `collaboration_confirmed` | project |
| User creates a tribe | `tribe_created` | tribe |
| Member approved for tribe | `member_joined_tribe` | tribe |
| User completes onboarding | `builder_joined` | user |

### Metadata Examples

```json
// project_created
{"title": "AI Resume Builder", "tech_stack": ["Python", "React"]}

// collaboration_confirmed
{"project_title": "AI Resume Builder", "collaborator_name": "Maya Chen"}

// tribe_created
{"tribe_name": "Hospitality OS", "open_roles": ["Backend Engineer", "Designer"]}
```

## GraphQL Types

```python
@strawberry.type
class FeedEventType:
    id: strawberry.ID
    event_type: str
    target_type: str
    target_id: str
    metadata: strawberry.scalars.JSON
    created_at: datetime

    @strawberry.field
    async def actor(self, info: strawberry.types.Info) -> UserType:
        return await info.context.loaders.users.load(self.actor_id)

    @strawberry.field
    async def project(self, info: strawberry.types.Info) -> ProjectType | None:
        if self.target_type == "project":
            return await info.context.loaders.projects.load(self.target_id)
        return None

    @strawberry.field
    async def tribe(self, info: strawberry.types.Info) -> TribeType | None:
        if self.target_type == "tribe":
            return await info.context.loaders.tribes.load(self.target_id)
        return None

    @strawberry.field
    async def user(self, info: strawberry.types.Info) -> UserType | None:
        if self.target_type == "user":
            return await info.context.loaders.users.load(self.target_id)
        return None

@strawberry.type
class FeedConnection:
    items: list[FeedEventType]
    next_cursor: str | None
    has_more: bool
```

## Query

```python
@strawberry.type
class Query:
    @strawberry.field
    async def feed(
        self,
        cursor: str | None = None,
        limit: int = 20,
        event_type: str | None = None,
        info: strawberry.types.Info,
    ) -> FeedConnection:
        stmt = select(FeedEvent).order_by(FeedEvent.created_at.desc())

        # Cursor-based pagination (cursor = last event ID)
        if cursor:
            cursor_event = await session.get(FeedEvent, cursor)
            if cursor_event:
                stmt = stmt.where(FeedEvent.created_at < cursor_event.created_at)

        # Optional filter
        if event_type:
            stmt = stmt.where(FeedEvent.event_type == event_type)

        stmt = stmt.limit(min(limit, 50) + 1)  # Fetch one extra to detect has_more
        events = list(await session.scalars(stmt))

        has_more = len(events) > limit
        if has_more:
            events = events[:limit]

        return FeedConnection(
            items=[FeedEventType.from_model(e) for e in events],
            next_cursor=events[-1].id if events else None,
            has_more=has_more,
        )
```

## Frontend Pages

```
app/
├── feed/
│   └── page.tsx              # Build feed (server component with client hydration)
```

### Feed Page Layout
- Filter tabs: All | Projects | Tribes | Builders
- Feed items rendered as cards:
  - `project_created` / `project_shipped`: ProjectCard with actor context
  - `tribe_created`: TribeCard with open roles
  - `collaboration_confirmed`: Two avatars + project link
  - `builder_joined`: Builder avatar + headline
- Infinite scroll (load more on scroll, cursor-based)
- Empty state: "No build activity yet. Be the first to ship something."
