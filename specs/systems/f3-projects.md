# F3: Projects -- Systems Design

**Feature**: Projects
**Context**: See [overview.md](./overview.md) for architecture overview, service boundaries, and deployment.
**Source**: Extracted from [SYSTEMS_DESIGN.md](../SYSTEMS_DESIGN.md)

---

## Table of Contents

1. [Database Tables](#database-tables)
2. [JSONB Columns](#jsonb-columns)
3. [Full-Text Search Setup](#full-text-search-setup)
4. [File Upload for Thumbnails](#file-upload-for-thumbnails)
5. [GitHub Integration Data Flow](#github-integration-data-flow)
6. [Embedding Generation for Projects](#embedding-generation-for-projects)
7. [Indexing Strategy](#indexing-strategy)
8. [Data Flow: Creating a Project and Inviting Collaborators](#data-flow-creating-a-project-and-inviting-collaborators)
9. [GraphQL Schema](#graphql-schema)
10. [N+1 Prevention (DataLoaders)](#n1-prevention-dataloaders)
11. [Input Validation](#input-validation)
12. [Background Jobs](#background-jobs)

---

## Database Tables

### `projects`

| Column | Type | Constraints | Notes |
|--------|------|-------------|-------|
| id | CHAR(26) | PK | ULID |
| owner_id | CHAR(26) | FK -> users(id) ON DELETE CASCADE, NOT NULL | |
| title | VARCHAR(200) | NOT NULL | |
| description | TEXT | NULLABLE | Markdown supported |
| status | VARCHAR(20) | NOT NULL, DEFAULT 'in_progress' | 'shipped', 'in_progress', 'archived' |
| role | VARCHAR(100) | NULLABLE | What the owner did on this project |
| links | JSONB | DEFAULT '{}' | `{"repo": "...", "live_url": "...", "product_hunt": "...", "app_store": "..."}` |
| tech_stack | JSONB | DEFAULT '[]' | Array of tech/framework names |
| domains | JSONB | DEFAULT '[]' | Industry/space tags: fintech, devtools, health, etc. |
| ai_tools | JSONB | DEFAULT '[]' | AI tools used: claude-code, cursor, chatgpt, etc. |
| build_style | JSONB | DEFAULT '[]' | How it was built: agent-driven, solo-with-ai, etc. |
| services | JSONB | DEFAULT '[]' | Infra/services: stripe, vercel, supabase, etc. |
| impact_metrics | JSONB | DEFAULT '{}' | `{"users": 1000, "stars": 500, "revenue": "10k MRR"}` |
| thumbnail_url | VARCHAR(500) | NULLABLE | |
| github_repo_full_name | VARCHAR(200) | NULLABLE, UNIQUE | For GitHub-imported projects |
| github_stars | INTEGER | NULLABLE | |
| tribe_id | CHAR(26) | FK -> tribes(id) ON DELETE SET NULL, NULLABLE | |
| search_vector | TSVECTOR | NULLABLE | Auto-updated via trigger |
| embedding | VECTOR(1536) | NULLABLE | pgvector for semantic search |
| created_at | TIMESTAMPTZ | DEFAULT NOW() | |
| updated_at | TIMESTAMPTZ | DEFAULT NOW() | |

### `project_milestones`

| Column | Type | Constraints | Notes |
|--------|------|-------------|-------|
| id | CHAR(26) | PK | ULID |
| project_id | CHAR(26) | FK -> projects(id) ON DELETE CASCADE, NOT NULL | |
| title | VARCHAR(200) | NOT NULL | "Launched on Product Hunt" |
| date | DATE | NOT NULL | The date of the milestone |
| milestone_type | VARCHAR(20) | NOT NULL, DEFAULT 'milestone' | start, milestone, deploy, launch |
| created_at | TIMESTAMPTZ | DEFAULT NOW() | |

### `project_collaborators`

Implemented as a SQLAlchemy association `Table()` (not a mapped class) with composite primary key.

| Column | Type | Constraints | Notes |
|--------|------|-------------|-------|
| project_id | CHAR(26) | PK, FK -> projects(id) ON DELETE CASCADE | ULID, composite PK with user_id |
| user_id | CHAR(26) | PK, FK -> users(id) ON DELETE CASCADE | ULID, composite PK with project_id |
| role | VARCHAR(100) | NULLABLE | "Designer", "Growth Lead" |
| status | VARCHAR(20) | NOT NULL, DEFAULT 'pending' | 'pending', 'confirmed', 'declined' |
| invited_at | TIMESTAMPTZ | DEFAULT NOW() | |
| confirmed_at | TIMESTAMPTZ | NULLABLE | |

**Primary key**: Composite (project_id, user_id) -- a user can only be invited once per project. No separate `id` column.

### `collaborator_invite_tokens`

Shareable invite links for non-members. Each token is a unique, URL-safe string that maps to a project + inviter.

| Column | Type | Constraints | Notes |
|--------|------|-------------|-------|
| id | CHAR(26) | PK | ULID |
| project_id | CHAR(26) | FK -> projects(id) ON DELETE CASCADE, NOT NULL | |
| invited_by | CHAR(26) | FK -> users(id) ON DELETE CASCADE, NOT NULL | The owner who generated the link |
| token | VARCHAR(64) | NOT NULL, UNIQUE | Crypto-random URL-safe token (`secrets.token_urlsafe(32)`) |
| role | VARCHAR(100) | NULLABLE | Optional role suggestion for the invitee |
| created_at | TIMESTAMPTZ | DEFAULT NOW() | |
| expires_at | TIMESTAMPTZ | NOT NULL | 30 days from creation |
| redeemed_by | CHAR(26) | FK -> users(id) ON DELETE SET NULL, NULLABLE | User who redeemed the token |
| redeemed_at | TIMESTAMPTZ | NULLABLE | When the token was redeemed |

**Index**: `token` (unique, for fast lookup on the `/invite/[token]` page).
**Expiry**: Tokens expire after 30 days. Expired tokens return an error on redemption. A background job can clean up expired tokens periodically.
**Redemption**: A token can only be redeemed once. After redemption, a `project_collaborators` row is created with `status='pending'`. The invitee still needs to accept.

---

## JSONB Columns

### `projects.links`

```json
{
  "repo": "https://github.com/user/project",
  "live_url": "https://myproject.com",
  "product_hunt": "https://producthunt.com/posts/myproject",
  "app_store": null,
  "play_store": null
}
```

### `projects.impact_metrics`

```json
{
  "users": 12000,
  "github_stars": 450,
  "monthly_revenue_usd": 8500,
  "downloads": null,
  "custom": [
    { "label": "API calls/day", "value": "2M" }
  ]
}
```

---

## Full-Text Search Setup

```sql
-- Trigger function for projects search vector
-- Includes new tag fields (domains, ai_tools, services) in search
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
- **A** (highest): `title` -- exact title matches are most relevant
- **B**: `description` -- project description text
- **C** (lowest): `tech_stack`, `domains`, `ai_tools`, `services` -- all tag fields

---

## File Upload for Thumbnails

```
Client (browser)
     |
     | 1. POST /upload/thumbnail (multipart/form-data)
     |    - Authorization: Bearer <JWT>
     |    - file: <binary>
     v
FastAPI /upload/thumbnail endpoint
     |
     | 2. Validate:
     |    - File type (JPEG, PNG, WebP only)
     |    - File size (max 10MB for thumbnails)
     |    - Image dimensions (resize if needed)
     |
     | 3. Process:
     |    - Generate unique filename: {project_id}/{uuid}.{ext}
     |    - Resize to standard dimensions (800x600 thumbnail)
     |    - Strip EXIF metadata
     |
     | 4. Upload to object storage (S3 / MinIO)
     |
     | 5. Return { url: "https://storage.example.com/thumbnails/{project_id}/{uuid}.webp" }
     v
Client updates project via GraphQL mutation with new thumbnail_url
```

Libraries:
- `python-multipart` for file parsing
- `Pillow` for image processing (resize, format conversion, EXIF stripping)
- `boto3` for S3/MinIO uploads

### Image Sizes
- Project thumbnails: 400x300 (card), 800x600 (detail page)
- Placeholder: blurred low-quality image placeholder (LQIP) generated at upload time

---

## GitHub Integration Data Flow

The MCP server provides a tool to analyze a project URL:

```python
@mcp.tool()
async def analyze_project(url: str) -> dict:
    """Analyze a project URL (GitHub repo, website) and extract metadata.

    Returns: title, description, tech stack, languages, stars, last commit date.
    """
    ...
```

Claude API is used for project analysis:
```
Claude analyzes GitHub repo README + metadata to produce:
{
  description: "...",
  tech_stack: ["Next.js", "PostgreSQL", "Stripe"],
  category: "fintech",
  maturity: "shipped"
}
```

**GitHub sync as a background job**:

| Job | Trigger | Priority | Notes |
|-----|---------|----------|-------|
| Sync GitHub repos | User connects GitHub / manual refresh | Low | Rate-limited to 1 sync/user/hour |

**SSRF protection**: MCP server's `analyze_project` tool validates URLs against an allowlist of domains (github.com, gitlab.com, etc.). No arbitrary URL fetching.

---

## Embedding Generation for Projects

**What gets embedded**:

| Source | Text Assembled For Embedding | Trigger |
|--------|------------------------------|---------|
| Project | `{title}. {description}. Tech: {tech_stack joined}. Status: {status}.` | Project create/update |

**When embeddings are generated/updated**:
1. **On create**: Background task enqueued immediately after project creation
2. **On update**: Background task enqueued after relevant field changes; `content_hash` is checked to skip recomputation if text hasn't changed
3. **Batch recomputation**: Scheduled nightly job recomputes any embeddings where the source has been modified since the embedding was last updated (catch-up for failed tasks)

**Generation flow**:
```
Project saved
       |
       v
[Compute SHA-256 of assembled text]
       |
       v
[Compare with stored content_hash] --Same--> [Skip, no update needed]
       |
       Different
       v
[Call embedding API (Claude/Voyage AI)]
       |
       v
[Upsert into embeddings table with new vector + content_hash]
```

### `embeddings` table (pgvector)

| Column | Type | Constraints | Notes |
|--------|------|-------------|-------|
| id | CHAR(26) | PK | ULID |
| source_type | VARCHAR(20) | NOT NULL | 'user', 'project' |
| source_id | CHAR(26) | NOT NULL | FK to users or projects (ULID) |
| embedding | VECTOR(1536) | NOT NULL | OpenAI-compatible dimension |
| content_hash | VARCHAR(64) | NOT NULL | SHA-256 of input text; skip recompute if unchanged |
| created_at | TIMESTAMPTZ | DEFAULT NOW() | |
| updated_at | TIMESTAMPTZ | DEFAULT NOW() | |

**Unique constraint**: (source_type, source_id)

**Storage**: pgvector extension in the same PostgreSQL database.
- Dimension: 1536 (compatible with common embedding models)
- Index: HNSW with cosine similarity
- This is sufficient for V1 scale (< 100K builders, < 500K projects)
- Future: If scale exceeds ~1M vectors, consider a dedicated vector database (Pinecone, Qdrant)

---

## Indexing Strategy

```sql
-- Project queries
CREATE INDEX idx_projects_owner ON projects (owner_id);
CREATE INDEX idx_projects_status ON projects (status);
CREATE INDEX idx_projects_created ON projects (created_at DESC);

-- Collaborator lookups
CREATE INDEX idx_collab_project ON project_collaborators (project_id);
CREATE INDEX idx_collab_user ON project_collaborators (user_id);
CREATE INDEX idx_collab_status ON project_collaborators (status);

-- Full-text search (GIN index)
CREATE INDEX idx_projects_search ON projects USING GIN (search_vector);

-- Tag search (GIN for JSONB array containment via @> operator)
CREATE INDEX idx_projects_tech_stack ON projects USING GIN (tech_stack);
CREATE INDEX idx_projects_domains ON projects USING GIN (domains);
CREATE INDEX idx_projects_ai_tools ON projects USING GIN (ai_tools);
CREATE INDEX idx_projects_services ON projects USING GIN (services);

-- Milestones
CREATE INDEX idx_milestones_project_date ON project_milestones (project_id, date);

-- Invite tokens
CREATE UNIQUE INDEX idx_invite_tokens_token ON collaborator_invite_tokens (token);
CREATE INDEX idx_invite_tokens_project ON collaborator_invite_tokens (project_id);
```

**Indexing rationale**:
- **GIN indexes** for tsvector full-text search and JSONB array containment (`@>` operator on tag fields).
- **Descending index** on `created_at` for chronological project listing.
- **Composite index** on milestones for efficient timeline queries per project.

---

## Build Timeline Query

The build timeline interleaves milestones with burn sessions. This is assembled in the resolver:

```python
async def resolve_build_timeline(project_id: str) -> list[TimelineEntry]:
    # 1. Fetch milestones for this project
    milestones = await milestone_service.get_by_project(project_id)

    # 2. Fetch burn sessions attributed to this project (from build_activity table)
    burn_sessions = await burn_service.get_by_project(project_id)

    # 3. Group burn sessions by date range (consecutive days → one range)
    burn_ranges = group_burn_by_date_range(burn_sessions)

    # 4. Merge and sort by date
    timeline = sorted(
        [*milestone_entries, *burn_range_entries],
        key=lambda e: e.date
    )
    return timeline
```

The timeline is read-only for visitors and editable (add/delete milestones) for the owner.

---

## Data Flow: Creating a Project and Inviting Collaborators

### Path A: Inviting a Platform Member (Search Typeahead)

```
Builder (owner)                FastAPI                  PostgreSQL             Collaborator
      |                           |                        |                       |
      | 1. createProject mutation |                        |                       |
      |    {title, desc, links,   |                        |                       |
      |     status, role}         |                        |                       |
      |-------------------------->|                        |                       |
      |                           | 2. Validate input      |                       |
      |                           | 3. INSERT project      |                       |
      |                           |----------------------->|                       |
      |                           | 4. Background: embed   |                       |
      |<--project created---------|                        |                       |
      |                           |                        |                       |
      |  ... later, on detail page ...                     |                       |
      |                           |                        |                       |
      | 5. searchUsers("james")   |                        |                       |
      |-------------------------->|                        |                       |
      |                           | 6. Query users by name |                       |
      |<--[James Okafor, ...]-----|                        |                       |
      |                           |                        |                       |
      | 7. inviteCollaborator     |                        |                       |
      |    {project_id, user_id,  |                        |                       |
      |     role: "Designer"}     |                        |                       |
      |-------------------------->|                        |                       |
      |                           | 8. INSERT collaborator |                       |
      |                           |    (status: 'pending') |                       |
      |                           |----------------------->|                       |
      |<--invitation sent---------|                        |                       |
      |                           |                        |                       |
      |                           |  ... collaborator visits project page ...      |
      |                           |                        |                       |
      |                           |<-----confirmCollaboration(project_id)----------|
      |                           | 9. UPDATE collaborator |                       |
      |                           |    status='confirmed'  |                       |
      |                           |    confirmed_at=NOW()  |                       |
      |                           |----------------------->|                       |
      |                           | 10. Background: recalc |                       |
      |                           |     builder scores     |                       |
```

### Path B: Inviting a Non-Member (Copy Link)

```
Builder (owner)                FastAPI                  PostgreSQL         Non-member
      |                           |                        |                    |
      | 1. generateInviteLink     |                        |                    |
      |    {project_id,           |                        |                    |
      |     role: "Designer"}     |                        |                    |
      |-------------------------->|                        |                    |
      |                           | 2. Generate token      |                    |
      |                           |    (secrets.token_urlsafe)                  |
      |                           | 3. INSERT invite_token |                    |
      |                           |    expires_at=+30 days |                    |
      |                           |----------------------->|                    |
      |<--invite URL returned-----|                        |                    |
      |                           |                        |                    |
      | 4. Builder copies link,   |                        |                    |
      |    shares via SMS/email/  |                        |                    |
      |    WhatsApp/Slack/etc.    |                        |                    |
      |-----(out of band)---------|------------------------|---> non-member     |
      |                           |                        |                    |
      |                           |<--- GET /invite/[token] -------------------|
      |                           | 5. inviteTokenInfo     |                    |
      |                           |    query (public)      |                    |
      |                           |----------------------->|                    |
      |                           |<--project title,       |                    |
      |                           |   inviter name---------|                    |
      |                           |                        |                    |
      |                           |    Landing page shows: |                    |
      |                           |    "[Name] invited you  |                   |
      |                           |     to collaborate on   |                   |
      |                           |     [Project]"          |                   |
      |                           |                        |                    |
      |                           |  ... non-member signs up ...               |
      |                           |                        |                    |
      |                           |<--- redeemInviteToken(token) --------------|
      |                           | 6. Validate token      |                    |
      |                           |    (not expired,       |                    |
      |                           |     not redeemed)      |                    |
      |                           | 7. INSERT collaborator |                    |
      |                           |    (status: 'pending') |                    |
      |                           | 8. UPDATE invite_token |                    |
      |                           |    redeemed_by, at     |                    |
      |                           |----------------------->|                    |
      |                           |                        |                    |
      |                           |  ... user accepts from profile/project ... |
      |                           |                        |                    |
      |                           |<--- confirmCollaboration ------------------|
      |                           | 9. UPDATE collaborator |                    |
      |                           |    status='confirmed'  |                    |
```

---

## GraphQL Schema

Actual codebase directory structure (not `src/backend/schema/`):

```
src/backend/app/graphql/
  types/
    project.py         # ProjectType, CollaboratorType, from_model() converters
  queries/
    health.py          # project(id), projects(filters) — add searchUsers, myPendingInvitations, tagSuggestions here
  mutations/
    projects.py        # createProject, updateProject, deleteProject, inviteCollaborator, confirmCollaboration, declineCollaboration
```

New mutations to add: `addMilestone`, `deleteMilestone`, `generateInviteLink`, `redeemInviteToken`.
New queries to add: `searchUsers`, `inviteTokenInfo` (public), `myPendingInvitations`, `tagSuggestions`.

---

## N+1 Prevention (DataLoaders)

```python
async def load_projects_by_owner(keys: list[str]) -> list[list[Project]]:
    async with get_session() as session:
        result = await session.execute(
            select(Project).where(Project.owner_id.in_(keys))
        )
        projects_by_owner: dict[str, list] = {key: [] for key in keys}
        for p in result.scalars().all():
            projects_by_owner[str(p.owner_id)].append(p)
        return [projects_by_owner[key] for key in keys]

class DataLoaders:
    def __init__(self):
        self.projects_by_owner = DataLoader(load_fn=load_projects_by_owner)
        self.collaborators_by_project = DataLoader(load_fn=load_collaborators_by_project)
```

---

## Input Validation

```python
# Custom validated types
@strawberry.input
class CreateProjectInput:
    title: Annotated[str, strawberry.argument(description="Max 200 chars")]
    description: Annotated[str | None, strawberry.argument(description="Max 10000 chars")]
    # Validation happens in the service layer with pydantic
```

Service-layer validation using Pydantic:
```python
class ProjectCreateSchema(BaseModel):
    title: str = Field(max_length=200, min_length=1)
    description: str | None = Field(max_length=10000, default=None)
    status: Literal["shipped", "in_progress", "archived"] = "in_progress"
    links: dict = Field(default_factory=dict)
    tech_stack: list[str] = Field(max_length=20)  # Max 20 tags

    @field_validator("links")
    def validate_links(cls, v):
        allowed_keys = {"repo", "live_url", "product_hunt", "app_store", "play_store"}
        for key in v:
            if key not in allowed_keys:
                raise ValueError(f"Unknown link type: {key}")
            if v[key] and not v[key].startswith("https://"):
                raise ValueError(f"Links must use HTTPS")
        return v
```

---

## Background Jobs

| Job | Trigger | Priority | Notes |
|-----|---------|----------|-------|
| Generate embedding | Project create/update | Medium | Debounced (skip if content unchanged) |
| Sync GitHub repos | User connects GitHub / manual refresh | Low | Rate-limited to 1 sync/user/hour |
| Recalculate builder score | Collaborator confirmed, project status change | Medium | Debounced per user (max 1 calc/5min) |

V1 uses `FastAPI.BackgroundTasks` for simplicity:

```python
@router.post("/projects")
async def create_project(data: ProjectInput, background_tasks: BackgroundTasks):
    project = await project_service.create(data)
    background_tasks.add_task(generate_project_embedding, project.id)
    background_tasks.add_task(create_feed_event, "project_created", project)
    return project
```
