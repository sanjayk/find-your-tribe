# F2: Builder Profiles — Tech Spec

> See [overview.md](./overview.md) for full architecture context.
> Depends on: [F1 Auth](./f1-auth-onboarding.md) for User model.

## Data Models

User model is defined in F1. Additional models for profiles:

```python
# backend/models/skill.py
class SkillCategory(str, enum.Enum):
    ENGINEERING = "engineering"
    DESIGN = "design"
    PRODUCT = "product"
    MARKETING = "marketing"
    GROWTH = "growth"
    DATA = "data"
    OPERATIONS = "operations"
    OTHER = "other"

class Skill(Base):
    __tablename__ = "skills"

    id = Column(String(26), primary_key=True)
    name = Column(String(100), unique=True, nullable=False)
    slug = Column(String(100), unique=True, nullable=False, index=True)
    category = Column(Enum(SkillCategory), nullable=False)

class UserSkill(Base):
    __tablename__ = "user_skills"

    user_id = Column(String(26), ForeignKey("users.id", ondelete="CASCADE"), primary_key=True)
    skill_id = Column(String(26), ForeignKey("skills.id", ondelete="CASCADE"), primary_key=True)
    added_at = Column(DateTime(timezone=True), server_default=func.now())

    __table_args__ = (
        Index("ix_user_skills_skill", "skill_id"),
    )
```

## Agent Workflow Fields (on User model)

```python
# Added to User model (src/backend/app/models/user.py)
class User(Base, ULIDMixin):
    # ... existing fields ...

    # AI workflow signals
    agent_tools: Mapped[list | None] = mapped_column(JSONB, nullable=True)
    # e.g. ["Claude Code", "Cursor", "GitHub Copilot"]

    agent_workflow_style: Mapped[str | None] = mapped_column(
        SQLEnum(AgentWorkflowStyle, values_callable=lambda x: [e.value for e in x]),
        nullable=True,
    )
    # "pair", "swarm", "review", "autonomous", "minimal"

    human_agent_ratio: Mapped[float | None] = mapped_column(Float, nullable=True)
    # 0.0 = fully human, 1.0 = fully AI-assisted
```

## BuildActivity Model

Token burn is the universal unit of work — every builder uses AI agents. This table tracks the raw evidence.

```python
# backend/models/build_activity.py
class BuildActivitySource(str, enum.Enum):
    ANTHROPIC = "anthropic"
    OPENAI = "openai"
    GOOGLE = "google"
    MANUAL = "manual"
    OTHER = "other"

class BuildActivity(Base, ULIDMixin):
    __tablename__ = "build_activities"

    user_id: Mapped[str] = mapped_column(
        String(26), ForeignKey("users.id", ondelete="CASCADE"), nullable=False
    )
    project_id: Mapped[str | None] = mapped_column(
        String(26), ForeignKey("projects.id", ondelete="SET NULL"), nullable=True
    )
    activity_date: Mapped[date] = mapped_column(Date, nullable=False)
    tokens_burned: Mapped[int] = mapped_column(Integer, nullable=False)
    source: Mapped[str] = mapped_column(
        SQLEnum(BuildActivitySource, values_callable=lambda x: [e.value for e in x]),
        nullable=False,
    )
    metadata_: Mapped[dict | None] = mapped_column("metadata", JSONB, default=dict)

    # Relationships
    user: Mapped["User"] = relationship(back_populates="build_activities")
    project: Mapped["Project | None"] = relationship()

    __table_args__ = (
        UniqueConstraint("user_id", "project_id", "activity_date", "source",
                         name="uq_build_activity_per_day"),
        Index("ix_build_activities_user_date", "user_id", activity_date.desc()),
        Index("ix_build_activities_project", "project_id",
              postgresql_where=text("project_id IS NOT NULL")),
    )
```

### Burn Heatmap Query (52 weeks of daily totals)

```python
stmt = (
    select(
        BuildActivity.activity_date,
        func.sum(BuildActivity.tokens_burned).label("daily_tokens"),
    )
    .where(
        BuildActivity.user_id == user_id,
        BuildActivity.activity_date >= date.today() - timedelta(weeks=52),
    )
    .group_by(BuildActivity.activity_date)
    .order_by(BuildActivity.activity_date)
)
```

### Per-Project Burn Receipt Query

```python
stmt = (
    select(
        BuildActivity.activity_date,
        func.sum(BuildActivity.tokens_burned).label("daily_tokens"),
    )
    .where(
        BuildActivity.user_id == user_id,
        BuildActivity.project_id == project_id,
    )
    .group_by(BuildActivity.activity_date)
    .order_by(BuildActivity.activity_date)
)
```

### Project.tribe_id (new column)

```python
# Added to Project model (src/backend/app/models/project.py)
class Project(Base, ULIDMixin):
    # ... existing fields ...

    tribe_id: Mapped[str | None] = mapped_column(
        String(26), ForeignKey("tribes.id", ondelete="SET NULL"), nullable=True
    )

    # Relationships
    tribe: Mapped["Tribe | None"] = relationship(back_populates="projects")
```

The Tribe model gains a `projects` relationship:
```python
class Tribe(Base, ULIDMixin):
    # ... existing fields ...
    projects: Mapped[list["Project"]] = relationship(back_populates="tribe")
```

## GraphQL Types

```python
@strawberry.type
class BurnDayType:
    date: datetime.date
    tokens: int

@strawberry.type
class BurnReceiptType:
    """Per-project burn stats for the burn receipt panel."""
    project_id: strawberry.ID
    total_tokens: int
    duration_weeks: int
    peak_week_tokens: int
    daily_activity: list[BurnDayType]

@strawberry.type
class BurnSummaryType:
    """Aggregate burn stats for the heatmap section."""
    days_active: int
    total_tokens: int
    active_weeks: int
    total_weeks: int
    weekly_streak: int  # current consecutive active weeks
    daily_activity: list[BurnDayType]  # 52 weeks of daily data

@strawberry.type
class SkillType:
    id: strawberry.ID
    name: str
    slug: str
    category: str

@strawberry.type
class UserType:
    id: strawberry.ID
    username: str
    display_name: str
    avatar_url: str | None
    headline: str | None
    primary_role: str | None
    timezone: str | None
    availability_status: str
    builder_score: float
    bio: str | None
    contact_links: strawberry.scalars.JSON  # {"twitter": "...", "email": "..."}
    github_username: str | None
    onboarding_completed: bool
    created_at: datetime

    @strawberry.field
    async def skills(self, info: strawberry.types.Info) -> list[SkillType]:
        return await info.context.loaders.user_skills.load(self.id)

    @strawberry.field
    async def projects(self, info: strawberry.types.Info) -> list["ProjectType"]:
        return await info.context.loaders.user_projects.load(self.id)

    @strawberry.field
    async def collaborators(self, info: strawberry.types.Info) -> list["UserType"]:
        return await info.context.loaders.user_collaborators.load(self.id)

    @strawberry.field
    async def tribes(self, info: strawberry.types.Info) -> list["TribeType"]:
        return await info.context.loaders.user_tribes.load(self.id)

    @strawberry.field
    async def project_count(self, info: strawberry.types.Info) -> int:
        return await info.context.loaders.user_project_count.load(self.id)

    @strawberry.field
    async def collaborator_count(self, info: strawberry.types.Info) -> int:
        return await info.context.loaders.user_collaborator_count.load(self.id)
```

## Queries

```python
@strawberry.type
class Query:
    @strawberry.field
    async def me(self, info: strawberry.types.Info) -> UserType | None:
        user = info.context.user
        if not user:
            return None
        return UserType.from_model(user)

    @strawberry.field
    async def user(self, username: str, info: strawberry.types.Info) -> UserType | None:
        user = await user_service.get_by_username(username)
        if not user:
            raise GraphQLError("User not found", extensions={"code": "NOT_FOUND"})
        return UserType.from_model(user)

    @strawberry.field
    async def skills(self, category: str | None = None, info: strawberry.types.Info) -> list[SkillType]:
        return await skill_service.list_skills(category=category)

    @strawberry.field
    async def burn_summary(self, user_id: strawberry.ID, weeks: int = 52, info: strawberry.types.Info) -> BurnSummaryType:
        """Get burn heatmap data for a user's profile."""
        return await burn_service.get_summary(user_id, weeks=weeks)

    @strawberry.field
    async def burn_receipt(self, user_id: strawberry.ID, project_id: strawberry.ID, info: strawberry.types.Info) -> BurnReceiptType:
        """Get per-project burn receipt for a project card."""
        return await burn_service.get_receipt(user_id, project_id)
```

## Mutations

```python
@strawberry.input
class UpdateProfileInput:
    display_name: str | None = None
    headline: str | None = None
    bio: str | None = None
    primary_role: str | None = None
    timezone: str | None = None
    availability_status: str | None = None
    contact_links: strawberry.scalars.JSON | None = None

@strawberry.type
class Mutation:
    @strawberry.mutation
    async def update_profile(self, input: UpdateProfileInput, info: strawberry.types.Info) -> UserType:
        user = require_auth(info)
        updated = await user_service.update_profile(user.id, input)
        # Trigger embedding regeneration in background
        background_tasks.add_task(regenerate_user_embedding, user.id)
        return UserType.from_model(updated)

    @strawberry.mutation
    async def add_skill(self, skill_id: strawberry.ID, info: strawberry.types.Info) -> UserType:
        user = require_auth(info)
        await user_service.add_skill(user.id, skill_id)
        return UserType.from_model(await user_service.get_by_id(user.id))

    @strawberry.mutation
    async def remove_skill(self, skill_id: strawberry.ID, info: strawberry.types.Info) -> UserType:
        user = require_auth(info)
        await user_service.remove_skill(user.id, skill_id)
        return UserType.from_model(await user_service.get_by_id(user.id))

    @strawberry.mutation
    async def log_build_session(
        self,
        tokens_burned: int,
        source: str,
        project_id: strawberry.ID | None = None,
        activity_date: datetime.date | None = None,  # defaults to today
        info: strawberry.types.Info = None,
    ) -> BurnSummaryType:
        """Log a build session. Creates or updates the BuildActivity for the day."""
        user = require_auth(info)
        await burn_service.log_session(
            user_id=user.id,
            tokens_burned=tokens_burned,
            source=source,
            project_id=project_id,
            activity_date=activity_date or date.today(),
        )
        return await burn_service.get_summary(user.id)
```

## DataLoaders (N+1 prevention)

```python
# backend/schema/loaders.py
from strawberry.dataloader import DataLoader

async def load_user_skills(user_ids: list[str]) -> list[list[Skill]]:
    """Batch load skills for multiple users."""
    rows = await db.execute(
        select(UserSkill, Skill)
        .join(Skill, UserSkill.skill_id == Skill.id)
        .where(UserSkill.user_id.in_(user_ids))
    )
    skills_by_user: dict[str, list[Skill]] = defaultdict(list)
    for user_skill, skill in rows:
        skills_by_user[user_skill.user_id].append(skill)
    return [skills_by_user.get(uid, []) for uid in user_ids]

async def load_user_collaborators(user_ids: list[str]) -> list[list[User]]:
    """Batch load verified collaborators for multiple users."""
    rows = await db.execute(
        select(ProjectCollaborator.user_id, User)
        .join(User, ProjectCollaborator.collaborator_id == User.id)
        .where(
            ProjectCollaborator.user_id.in_(user_ids),
            ProjectCollaborator.status == "confirmed",
        )
    )
    collabs_by_user: dict[str, list[User]] = defaultdict(list)
    for owner_id, user in rows:
        collabs_by_user[owner_id].append(user)
    return [collabs_by_user.get(uid, []) for uid in user_ids]
```

## Full-Text Search (profile search)

```sql
-- Trigger to update search_vector on user changes
CREATE OR REPLACE FUNCTION users_search_vector_update() RETURNS trigger AS $$
BEGIN
    NEW.search_vector :=
        setweight(to_tsvector('english', coalesce(NEW.display_name, '')), 'A') ||
        setweight(to_tsvector('english', coalesce(NEW.headline, '')), 'A') ||
        setweight(to_tsvector('english', coalesce(NEW.username, '')), 'B') ||
        setweight(to_tsvector('english', coalesce(NEW.bio, '')), 'C');
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER users_search_vector_trigger
    BEFORE INSERT OR UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION users_search_vector_update();
```

## Avatar Upload

```python
# backend/routes/upload.py
@router.post("/upload/avatar")
async def upload_avatar(
    file: UploadFile,
    user: User = Depends(require_auth),
):
    # Validate: image/*, max 5MB
    validate_image(file, max_size_mb=5)

    # Process: strip EXIF, resize to 400x400, convert to WebP
    image = Image.open(file.file)
    image = image.convert("RGB")
    image.thumbnail((400, 400))
    buffer = io.BytesIO()
    image.save(buffer, format="WEBP", quality=85)

    # Upload to S3/MinIO
    key = f"avatars/{user.id}/{ulid()}.webp"
    await s3.upload(key, buffer.getvalue(), content_type="image/webp")
    url = f"{CDN_URL}/{key}"

    # Update user
    await user_service.update_avatar(user.id, url)

    return {"url": url}
```

## Frontend Pages

```
app/
├── profile/
│   └── [username]/
│       ├── page.tsx          # Public profile view (server component)
│       └── edit/
│           └── page.tsx      # Edit profile form (client component)
```

### Profile Page Layout (PROVE → VOUCH → STATE)

Full-width editorial flow — **no sidebar**. Hierarchy enforced by scroll position.

1. **Identity strip**: avatar (80px), name, handle, headline, availability badge, builder score, timezone — compact horizontal row
2. **Shipping activity (burn)**: 52-week heatmap with project markers, summary stats (days active, tokens burned, weekly streak, projects shipped)
3. **Proof of work (projects)**: Featured card (currently building) with burn receipt panel. 2-column grid for shipped projects, each with inline sparkline and token stats. Tribe projects show "via [Tribe Name]"
4. **Witnessed by**: 2-column grid of witness cards — collaborators with the projects they co-built
5. **Tribes**: Compact chips with project count and member avatars
6. **Skills / How they build / Links**: 3-column footer strip, lowest trust weight

### GraphQL Query (Eager-Loading Chain)

```python
stmt = (
    select(User)
    .where(User.username == username)
    .options(
        selectinload(User.skills),
        selectinload(User.owned_projects).selectinload(Project.collaborators),
        selectinload(User.tribes).options(
            selectinload(Tribe.owner),
            selectinload(Tribe.members),
            selectinload(Tribe.open_roles),
        ),
    )
)
```

### New Frontend Components

| Component | File | Purpose |
|-----------|------|---------|
| `BurnHeatmap` | `components/features/burn-heatmap.tsx` | 52-week × 7-day token burn grid with project markers |
| `BurnReceipt` | `components/features/burn-receipt.tsx` | Per-project sparkline + duration/tokens/peak stats |
| `ProofCard` | `components/features/proof-card.tsx` | Project card with burn receipt panel |
| `WitnessCard` | `components/features/witness-card.tsx` | Collaborator with co-built projects listed |
| `TribeChip` | `components/features/tribe-chip.tsx` | Compact tribe display with project count |
| `AgentWorkflowCard` | `components/features/agent-workflow-card.tsx` | AI workflow style, tools, human/AI ratio |
