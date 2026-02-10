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

## GraphQL Types

```python
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

### Profile Page Layout
- Hero: avatar, display_name, headline, role badge, builder score, availability pill
- Skills: horizontal chip list
- Contact: icon links (Twitter, email, Calendly, GitHub)
- Projects: grid of ProjectCards (sorted by recency)
- Collaborators: avatar row with names
- Tribes: list of active/alumni tribes
