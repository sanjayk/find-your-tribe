# F3: Projects — Tech Spec

> See [overview.md](./overview.md) for full architecture context.
> Depends on: [F1 Auth](./f1-auth-onboarding.md), [F2 Profiles](./f2-builder-profiles.md).

## Data Models

```python
# backend/models/project.py
class ProjectStatus(str, enum.Enum):
    SHIPPED = "shipped"
    IN_PROGRESS = "in_progress"
    ARCHIVED = "archived"

class CollaboratorStatus(str, enum.Enum):
    PENDING = "pending"
    CONFIRMED = "confirmed"
    DECLINED = "declined"

class Project(Base):
    __tablename__ = "projects"

    id = Column(String(26), primary_key=True)  # ULID
    owner_id = Column(String(26), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    title = Column(String(200), nullable=False)
    description = Column(Text, nullable=True)
    status = Column(Enum(ProjectStatus), default=ProjectStatus.IN_PROGRESS)
    role = Column(String(100), nullable=True)  # What the owner did
    thumbnail_url = Column(String(500), nullable=True)

    # Flexible JSON fields
    links = Column(JSONB, default=dict)
    # {"repo": "https://...", "live_url": "https://...", "product_hunt": "https://...",
    #  "app_store": "https://...", "play_store": "https://..."}

    tech_stack = Column(JSONB, default=list)  # ["React", "Python", "PostgreSQL"]

    impact_metrics = Column(JSONB, default=dict)
    # {"users": 1000, "stars": 250, "downloads": 5000, "revenue": "10k MRR"}

    # Tribe attribution (null = solo project)
    tribe_id = Column(String(26), ForeignKey("tribes.id", ondelete="SET NULL"), nullable=True)

    # GitHub import metadata
    github_repo_full_name = Column(String(200), nullable=True, unique=True)
    github_stars = Column(Integer, nullable=True)

    # Full-text search
    search_vector = Column(TSVECTOR)

    # Embedding for AI search
    embedding = Column(Vector(1536), nullable=True)  # pgvector

    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    __table_args__ = (
        Index("ix_projects_search", "search_vector", postgresql_using="gin"),
        Index("ix_projects_owner_status", "owner_id", "status"),
        Index("ix_projects_created", "created_at"),
        Index("ix_projects_embedding", "embedding", postgresql_using="hnsw",
              postgresql_ops={"embedding": "vector_cosine_ops"}),
    )

class ProjectCollaborator(Base):
    __tablename__ = "project_collaborators"

    project_id = Column(String(26), ForeignKey("projects.id", ondelete="CASCADE"), primary_key=True)
    user_id = Column(String(26), ForeignKey("users.id", ondelete="CASCADE"), primary_key=True)
    role = Column(String(100), nullable=True)  # Their role on the project
    status = Column(Enum(CollaboratorStatus), default=CollaboratorStatus.PENDING)
    invited_at = Column(DateTime(timezone=True), server_default=func.now())
    confirmed_at = Column(DateTime(timezone=True), nullable=True)

    __table_args__ = (
        Index("ix_project_collaborators_user", "user_id"),
        Index("ix_project_collaborators_status", "status"),
    )
```

## GraphQL Types

```python
@strawberry.type
class ProjectType:
    id: strawberry.ID
    title: str
    description: str | None
    status: str
    role: str | None
    thumbnail_url: str | None
    links: strawberry.scalars.JSON
    tech_stack: list[str]
    impact_metrics: strawberry.scalars.JSON
    github_repo_full_name: str | None
    github_stars: int | None
    created_at: datetime
    updated_at: datetime

    @strawberry.field
    async def owner(self, info: strawberry.types.Info) -> UserType:
        return await info.context.loaders.users.load(self.owner_id)

    @strawberry.field
    async def collaborators(self, info: strawberry.types.Info) -> list["CollaboratorType"]:
        return await info.context.loaders.project_collaborators.load(self.id)

@strawberry.type
class CollaboratorType:
    user: UserType
    role: str | None
    status: str  # pending | confirmed
    confirmed_at: datetime | None

@strawberry.input
class CreateProjectInput:
    title: str          # 1-200 chars
    description: str | None = None  # max 10000 chars
    status: str = "in_progress"
    role: str | None = None
    links: strawberry.scalars.JSON | None = None
    tech_stack: list[str] | None = None  # max 20 tags
    impact_metrics: strawberry.scalars.JSON | None = None

@strawberry.input
class UpdateProjectInput:
    title: str | None = None
    description: str | None = None
    status: str | None = None
    role: str | None = None
    links: strawberry.scalars.JSON | None = None
    tech_stack: list[str] | None = None
    impact_metrics: strawberry.scalars.JSON | None = None
```

## Mutations

```python
@strawberry.type
class Mutation:
    @strawberry.mutation
    async def create_project(self, input: CreateProjectInput, info: strawberry.types.Info) -> ProjectType:
        user = require_auth(info)
        project = await project_service.create(user.id, input)
        # Background: generate embedding, create feed event
        background_tasks.add_task(generate_project_embedding, project.id)
        background_tasks.add_task(create_feed_event, "project_created", user.id, "project", project.id)
        return ProjectType.from_model(project)

    @strawberry.mutation
    async def update_project(self, id: strawberry.ID, input: UpdateProjectInput, info: strawberry.types.Info) -> ProjectType:
        user = require_auth(info)
        project = await project_service.get(id)
        require_owner(user, project)
        updated = await project_service.update(id, input)
        background_tasks.add_task(generate_project_embedding, id)
        return ProjectType.from_model(updated)

    @strawberry.mutation
    async def delete_project(self, id: strawberry.ID, info: strawberry.types.Info) -> bool:
        user = require_auth(info)
        project = await project_service.get(id)
        require_owner(user, project)
        await project_service.delete(id)
        return True

    @strawberry.mutation
    async def invite_collaborator(
        self, project_id: strawberry.ID, user_id: strawberry.ID, role: str | None = None,
        info: strawberry.types.Info
    ) -> CollaboratorType:
        user = require_auth(info)
        project = await project_service.get(project_id)
        require_owner(user, project)
        collab = await project_service.invite_collaborator(project_id, user_id, role)
        # Feed event: collaboration_invited
        return CollaboratorType.from_model(collab)

    @strawberry.mutation
    async def confirm_collaboration(self, project_id: strawberry.ID, info: strawberry.types.Info) -> CollaboratorType:
        user = require_auth(info)
        collab = await project_service.confirm_collaboration(project_id, user.id)
        # Background: recalculate builder scores for both users, create feed event
        background_tasks.add_task(recalculate_builder_score, user.id)
        background_tasks.add_task(recalculate_builder_score, collab.project.owner_id)
        background_tasks.add_task(create_feed_event, "collaboration_confirmed", user.id, "project", project_id)
        return CollaboratorType.from_model(collab)

    @strawberry.mutation
    async def decline_collaboration(self, project_id: strawberry.ID, info: strawberry.types.Info) -> bool:
        user = require_auth(info)
        await project_service.decline_collaboration(project_id, user.id)
        return True
```

## GitHub Import

```python
# backend/services/github_service.py

async def list_importable_repos(user: User) -> list[dict]:
    """List user's GitHub repos that haven't been imported yet."""
    token = decrypt_token(user.github_access_token_encrypted)
    async with httpx.AsyncClient() as client:
        response = await client.get(
            "https://api.github.com/user/repos",
            params={"sort": "updated", "per_page": 100, "type": "owner"},
            headers={"Authorization": f"Bearer {token}"},
        )
        repos = response.json()

    # Filter out already-imported repos
    imported = await project_service.get_imported_repo_names(user.id)
    return [r for r in repos if r["full_name"] not in imported]

async def import_repo(user: User, repo_full_name: str) -> Project:
    """Import a GitHub repo as a project."""
    token = decrypt_token(user.github_access_token_encrypted)
    async with httpx.AsyncClient() as client:
        response = await client.get(
            f"https://api.github.com/repos/{repo_full_name}",
            headers={"Authorization": f"Bearer {token}"},
        )
        repo = response.json()

    # Map repo → project
    project = await project_service.create(user.id, CreateProjectInput(
        title=repo["name"].replace("-", " ").replace("_", " ").title(),
        description=repo["description"] or "",
        status="shipped" if not repo["archived"] else "archived",
        links={"repo": repo["html_url"], "live_url": repo.get("homepage") or None},
        tech_stack=[repo["language"]] if repo["language"] else [],
        impact_metrics={"stars": repo["stargazers_count"], "forks": repo["forks_count"]},
    ))

    # Store GitHub metadata
    await project_service.set_github_metadata(project.id, repo_full_name, repo["stargazers_count"])

    return project
```

## Full-Text Search

```sql
CREATE OR REPLACE FUNCTION projects_search_vector_update() RETURNS trigger AS $$
BEGIN
    NEW.search_vector :=
        setweight(to_tsvector('english', coalesce(NEW.title, '')), 'A') ||
        setweight(to_tsvector('english', coalesce(NEW.description, '')), 'B') ||
        setweight(to_tsvector('english', coalesce(array_to_string(
            ARRAY(SELECT jsonb_array_elements_text(NEW.tech_stack)), ' '
        ), '')), 'B');
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;
```

## Validation Rules

| Field | Constraints |
|-------|------------|
| `title` | 1-200 chars |
| `description` | Max 10000 chars |
| `status` | One of: shipped, in_progress, archived |
| `role` | Max 100 chars |
| `links` | Keys must be: repo, live_url, product_hunt, app_store, play_store. Values must be HTTPS URLs. |
| `tech_stack` | Max 20 items, each max 50 chars |
| `impact_metrics` | Keys must be: users, stars, downloads, revenue, forks. Values are strings or numbers. |
