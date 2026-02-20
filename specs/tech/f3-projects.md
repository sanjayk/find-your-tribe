# F3: Projects — Tech Spec

> See [overview.md](./overview.md) for full architecture context.
> Depends on: [F1 Auth](./f1-auth-onboarding.md), [F2 Profiles](./f2-builder-profiles.md).

## Data Models

> **Codebase conventions:** All models use SQLAlchemy 2.0 `mapped_column()` with `Mapped[]` type
> annotations. Models inherit from `Base`, `ULIDMixin` (provides `id: Mapped[str]`), and
> `TimestampMixin` (provides `created_at`, `updated_at`). Enums live in `app/models/enums.py`.
> The `project_collaborators` table uses a SQLAlchemy association `Table()` (not a mapped class)
> because it's a many-to-many join with extra columns.

```python
# app/models/enums.py (add to existing)
class MilestoneType(str, enum.Enum):
    START = "start"
    MILESTONE = "milestone"
    DEPLOY = "deploy"
    LAUNCH = "launch"

# ProjectStatus and CollaboratorStatus already exist in enums.py

# app/models/project.py — fields to ADD to existing Project model
# (Project already has: owner_id, title, description, status, role, thumbnail_url,
#  links, tech_stack, impact_metrics, github_repo_full_name, github_stars,
#  search_vector, embedding, tribe_id, and relationships)

# Build story tags — add these JSONB columns to the existing Project class:
domains: Mapped[list] = mapped_column(JSONB, nullable=False, default=list, server_default="[]")
ai_tools: Mapped[list] = mapped_column(JSONB, nullable=False, default=list, server_default="[]")
build_style: Mapped[list] = mapped_column(JSONB, nullable=False, default=list, server_default="[]")
services: Mapped[list] = mapped_column(JSONB, nullable=False, default=list, server_default="[]")

# project_collaborators — ALREADY EXISTS as association Table() with composite PK
# Columns: project_id (PK), user_id (PK), role, status, invited_at, confirmed_at
# DO NOT create a separate ProjectCollaborator class — use the existing Table()

# app/models/project_milestone.py — NEW model
class ProjectMilestone(Base, ULIDMixin, TimestampMixin):
    """A milestone in a project's build timeline."""

    __tablename__ = "project_milestones"

    project_id: Mapped[str] = mapped_column(
        String(26), ForeignKey("projects.id", ondelete="CASCADE"), nullable=False, index=True,
    )
    title: Mapped[str] = mapped_column(String(200), nullable=False)
    date: Mapped[date] = mapped_column(Date, nullable=False)
    milestone_type: Mapped[MilestoneType] = mapped_column(
        SQLEnum(MilestoneType, values_callable=lambda x: [e.value for e in x]),
        nullable=False, default=MilestoneType.MILESTONE, server_default="milestone",
    )

    project: Mapped["Project"] = relationship("Project", back_populates="milestones")

    __table_args__ = (
        Index("ix_project_milestones_project_date", "project_id", "date"),
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
    domains: list[str]
    ai_tools: list[str]
    build_style: list[str]
    services: list[str]
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

    @strawberry.field
    async def milestones(self, info: strawberry.types.Info) -> list["MilestoneType"]:
        return await info.context.loaders.project_milestones.load(self.id)

@strawberry.type
class CollaboratorType:
    user: UserType
    role: str | None
    status: str  # pending | confirmed
    confirmed_at: datetime | None

@strawberry.type
class MilestoneType:
    id: strawberry.ID
    title: str
    date: date
    milestone_type: str  # start | milestone | deploy | launch
    created_at: datetime

@strawberry.input
class CreateProjectInput:
    title: str          # 1-200 chars
    description: str | None = None  # max 10000 chars
    status: str = "in_progress"
    role: str | None = None
    links: strawberry.scalars.JSON | None = None

@strawberry.input
class UpdateProjectInput:
    title: str | None = None
    description: str | None = None
    status: str | None = None
    role: str | None = None
    links: strawberry.scalars.JSON | None = None
    tech_stack: list[str] | None = None       # max 20
    domains: list[str] | None = None          # max 20
    ai_tools: list[str] | None = None         # max 20
    build_style: list[str] | None = None      # max 20
    services: list[str] | None = None         # max 20
    impact_metrics: strawberry.scalars.JSON | None = None

@strawberry.input
class AddMilestoneInput:
    title: str          # 1-200 chars
    date: date
    milestone_type: str = "milestone"  # start | milestone | deploy | launch
```

Note: `CreateProjectInput` is intentionally minimal — only core fields. Tags, milestones, and metrics are added via `UpdateProjectInput` or dedicated mutations from the detail page after creation.

## Collaborator Invite Tokens

For inviting non-members via shareable links:

```python
# app/models/collaborator_invite_token.py — NEW model
class CollaboratorInviteToken(Base, ULIDMixin, TimestampMixin):
    """Shareable invite link for non-members to join as collaborator."""

    __tablename__ = "collaborator_invite_tokens"

    project_id: Mapped[str] = mapped_column(
        String(26), ForeignKey("projects.id", ondelete="CASCADE"), nullable=False,
    )
    invited_by: Mapped[str] = mapped_column(
        String(26), ForeignKey("users.id", ondelete="CASCADE"), nullable=False,
    )
    token: Mapped[str] = mapped_column(
        String(64), nullable=False, unique=True, index=True,
    )  # secrets.token_urlsafe(32)
    role: Mapped[str | None] = mapped_column(String(100), nullable=True)
    expires_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False,
    )  # 30-day expiry from creation
    redeemed_by: Mapped[str | None] = mapped_column(
        String(26), ForeignKey("users.id", ondelete="SET NULL"), nullable=True,
    )
    redeemed_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True,
    )

    project: Mapped["Project"] = relationship("Project")
    inviter: Mapped["User"] = relationship("User", foreign_keys=[invited_by])
```

### Invite link URL format

`findyourtribe.dev/invite/[token]`

Landing page shows: "[Inviter Name] invited you to collaborate on [Project Title]". If the visitor is not logged in, they see a signup form with this context. After signup/login, the collaboration invitation is auto-created (pending status) and the user can accept or decline.

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

    @strawberry.mutation
    async def add_milestone(self, project_id: strawberry.ID, input: AddMilestoneInput, info: strawberry.types.Info) -> MilestoneType:
        user = require_auth(info)
        project = await project_service.get(project_id)
        require_owner(user, project)
        milestone = await project_service.add_milestone(project_id, input)
        return MilestoneType.from_model(milestone)

    @strawberry.mutation
    async def delete_milestone(self, milestone_id: strawberry.ID, info: strawberry.types.Info) -> bool:
        user = require_auth(info)
        await project_service.delete_milestone(milestone_id, user.id)
        return True

    @strawberry.mutation
    async def generate_invite_link(
        self, project_id: strawberry.ID, role: str | None = None,
        info: strawberry.types.Info
    ) -> str:
        """Generate a shareable invite link for non-members. Returns the full URL."""
        user = require_auth(info)
        project = await project_service.get(project_id)
        require_owner(user, project)
        token = await project_service.create_invite_token(project_id, user.id, role)
        return f"https://findyourtribe.dev/invite/{token}"

    @strawberry.mutation
    async def redeem_invite_token(self, token: str, info: strawberry.types.Info) -> CollaboratorType:
        """Redeem an invite link token. Creates a pending collaboration for the authenticated user."""
        user = require_auth(info)
        collab = await project_service.redeem_invite_token(token, user.id)
        return CollaboratorType.from_model(collab)
```

## Queries (User Search for Collaborator Typeahead)

```python
@strawberry.type
class Query:
    @strawberry.field
    async def search_users(self, query: str, limit: int = 5, info: strawberry.types.Info) -> list[UserType]:
        """Search users by name or username for the collaborator invitation typeahead.
        Returns max `limit` results. Excludes the current user."""
        user = require_auth(info)
        results = await user_service.search(query, exclude_user_id=user.id, limit=limit)
        return [UserType.from_model(u) for u in results]

    @strawberry.field
    async def invite_token_info(self, token: str) -> "InviteTokenInfoType | None":
        """Public query: given an invite token, return the project title and inviter name.
        Used on the /invite/[token] landing page before the user signs up."""
        return await project_service.get_invite_token_info(token)

    @strawberry.field
    async def my_pending_invitations(self, info: strawberry.types.Info) -> list["PendingInvitationType"]:
        """Return all pending collaboration invitations for the current user.
        Used on the profile page 'Pending Invitations' section and for the nav badge."""
        user = require_auth(info)
        return await project_service.get_pending_invitations(user.id)

@strawberry.type
class InviteTokenInfoType:
    project_title: str
    project_id: strawberry.ID
    inviter_name: str
    inviter_avatar_url: str | None
    role: str | None  # The suggested role, if the inviter specified one
    expired: bool

@strawberry.type
class PendingInvitationType:
    project_id: strawberry.ID
    project_title: str
    role: str | None  # The role suggested by the inviter (if any)
    inviter: UserType  # Who invited them
    invited_at: datetime
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

## Tag Suggestions

Tag fields use predefined suggestion lists stored as constants in the backend. The frontend queries a `tag_suggestions` field to power the typeahead. Custom tags not on the list are allowed — they are stored as-is in the JSONB array.

```python
@strawberry.type
class Query:
    @strawberry.field
    async def tag_suggestions(self, field: str, query: str = "", limit: int = 10) -> list[str]:
        """Return tag suggestions for a given field, optionally filtered by query prefix.
        field: one of 'tech_stack', 'domains', 'ai_tools', 'build_style', 'services'."""
        suggestions = TAG_SUGGESTIONS.get(field, [])
        if query:
            query_lower = query.lower()
            suggestions = [s for s in suggestions if query_lower in s.lower()]
        return suggestions[:limit]
```

Tag validation: custom tags are accepted as long as they meet the per-field constraints (max items, max chars per item). No allowlist enforcement — the predefined list is for UX convenience, not a constraint.

## Full-Text Search

```sql
-- Trigger function for projects search vector
-- Includes all tag fields (tech_stack, domains, ai_tools, services) in search
CREATE OR REPLACE FUNCTION projects_search_vector_update() RETURNS trigger AS $$
BEGIN
  NEW.search_vector :=
    setweight(to_tsvector('english', COALESCE(NEW.title, '')), 'A') ||
    setweight(to_tsvector('english', COALESCE(NEW.description, '')), 'B') ||
    setweight(to_tsvector('english',
      COALESCE(array_to_string(ARRAY(SELECT jsonb_array_elements_text(NEW.tech_stack)), ' '), '') || ' ' ||
      COALESCE(array_to_string(ARRAY(SELECT jsonb_array_elements_text(NEW.domains)), ' '), '') || ' ' ||
      COALESCE(array_to_string(ARRAY(SELECT jsonb_array_elements_text(NEW.ai_tools)), ' '), '') || ' ' ||
      COALESCE(array_to_string(ARRAY(SELECT jsonb_array_elements_text(NEW.services)), ' '), '')
    ), 'C');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER projects_search_vector_trigger
  BEFORE INSERT OR UPDATE OF title, description, tech_stack, domains, ai_tools, services
  ON projects
  FOR EACH ROW EXECUTE FUNCTION projects_search_vector_update();
```

**Weight assignments**:
- **A** (highest): `title` — exact title matches most relevant
- **B**: `description` — project description text
- **C** (lowest): `tech_stack`, `domains`, `ai_tools`, `services` — all tag fields

## Validation Rules

| Field | Constraints |
|-------|------------|
| `title` | 1-200 chars |
| `description` | Max 10000 chars |
| `status` | One of: shipped, in_progress, archived |
| `role` | Max 100 chars |
| `links` | Keys must be: repo, live_url, product_hunt, app_store, play_store. Values must be HTTPS URLs. |
| `tech_stack` | Max 20 items, each max 50 chars |
| `domains` | Max 20 items, each max 50 chars |
| `ai_tools` | Max 20 items, each max 50 chars |
| `build_style` | Max 20 items, each max 50 chars |
| `services` | Max 20 items, each max 50 chars |
| `impact_metrics` | Keys must be: users, stars, downloads, revenue, forks. Values are strings or numbers. |
| `milestone.title` | 1-200 chars |
| `milestone.date` | Valid date, not in the future |
| `milestone.milestone_type` | One of: start, milestone, deploy, launch |
