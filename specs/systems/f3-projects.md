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
| id | UUID | PK, DEFAULT gen_random_uuid() | |
| owner_id | UUID | FK -> users(id) ON DELETE CASCADE, NOT NULL | |
| title | VARCHAR(200) | NOT NULL | |
| description | TEXT | NULLABLE | Markdown supported |
| status | VARCHAR(20) | NOT NULL, DEFAULT 'in_progress' | 'shipped', 'in_progress', 'archived' |
| links | JSONB | DEFAULT '{}' | `{"repo": "...", "live_url": "...", "product_hunt": "...", "app_store": "..."}` |
| tech_stack | TEXT[] | DEFAULT '{}' | Array of tech/framework names |
| impact_metrics | JSONB | DEFAULT '{}' | `{"users": 1000, "stars": 500, "revenue": "10k MRR"}` |
| thumbnail_url | VARCHAR(500) | NULLABLE | |
| github_repo_id | BIGINT | NULLABLE | For GitHub-synced projects |
| search_vector | TSVECTOR | NULLABLE | Auto-updated via trigger |
| created_at | TIMESTAMPTZ | DEFAULT NOW() | |
| updated_at | TIMESTAMPTZ | DEFAULT NOW() | |

### `project_collaborators`

| Column | Type | Constraints | Notes |
|--------|------|-------------|-------|
| id | UUID | PK, DEFAULT gen_random_uuid() | |
| project_id | UUID | FK -> projects(id) ON DELETE CASCADE, NOT NULL | |
| user_id | UUID | FK -> users(id) ON DELETE CASCADE, NOT NULL | |
| role_description | VARCHAR(200) | NULLABLE | "Led frontend development" |
| status | VARCHAR(20) | NOT NULL, DEFAULT 'pending' | 'pending', 'confirmed', 'declined' |
| invited_at | TIMESTAMPTZ | DEFAULT NOW() | |
| confirmed_at | TIMESTAMPTZ | NULLABLE | |

**Unique constraint**: (project_id, user_id) -- a user can only be invited once per project.

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
CREATE OR REPLACE FUNCTION projects_search_vector_update() RETURNS trigger AS $$
BEGIN
  NEW.search_vector :=
    setweight(to_tsvector('english', COALESCE(NEW.title, '')), 'A') ||
    setweight(to_tsvector('english', COALESCE(NEW.description, '')), 'B') ||
    setweight(to_tsvector('english', array_to_string(COALESCE(NEW.tech_stack, '{}'), ' ')), 'C');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER projects_search_vector_trigger
  BEFORE INSERT OR UPDATE OF title, description, tech_stack
  ON projects
  FOR EACH ROW EXECUTE FUNCTION projects_search_vector_update();
```

**Weight assignments**:
- **A** (highest): `title` -- exact title matches are most relevant
- **B**: `description` -- project description text
- **C** (lowest): `tech_stack` -- technology tags

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
| id | UUID | PK, DEFAULT gen_random_uuid() | |
| source_type | VARCHAR(20) | NOT NULL | 'user', 'project' |
| source_id | UUID | NOT NULL | FK to users or projects |
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

-- Tech stack search (GIN for array containment)
CREATE INDEX idx_projects_tech_stack ON projects USING GIN (tech_stack);
```

**Indexing rationale**:
- **GIN indexes** for tsvector full-text search and array containment (`@>` operator on tech_stack).
- **Descending index** on `created_at` for chronological project listing.

---

## Data Flow: Creating a Project and Inviting Collaborators

```
Builder (owner)                FastAPI                  PostgreSQL             Collaborator
      |                           |                        |                       |
      | 1. createProject mutation |                        |                       |
      |    {title, desc, links,   |                        |                       |
      |     tech_stack, status,   |                        |                       |
      |     collaborator_ids}     |                        |                       |
      |-------------------------->|                        |                       |
      |                           | 2. Validate input      |                       |
      |                           |                        |                       |
      |                           | 3. BEGIN TRANSACTION   |                       |
      |                           |---INSERT project------>|                       |
      |                           |                        |                       |
      |                           | 4. For each collaborator_id:                   |
      |                           |---INSERT project_collaborator-->|              |
      |                           |    (status: 'pending')  |                      |
      |                           |                        |                       |
      |                           | 5. INSERT feed_event   |                       |
      |                           |    (project_created)   |                       |
      |                           |    COMMIT              |                       |
      |                           |                        |                       |
      |                           | 6. Background tasks:   |                       |
      |                           |    - Generate embedding|                       |
      |                           |                        |                       |
      |<--project created---------|                        |                       |
      |                           |                        |                       |
      |                           |  ... later ...         |                       |
      |                           |                        |                       |
      |                           |<-----confirmCollaboration(project_id)----------|
      |                           |                        |                       |
      |                           | 7. Verify user_id matches                     |
      |                           |    a pending invitation |                      |
      |                           |---UPDATE collaborator-->|                      |
      |                           |    status='confirmed'   |                      |
      |                           |    confirmed_at=NOW()   |                      |
      |                           |                        |                       |
      |                           | 8. Recalculate builder |                       |
      |                           |    scores (background) |                       |
      |                           |                        |                       |
      |                           |<--confirmation result--|                       |
```

---

## GraphQL Schema

```
src/backend/schema/
  types/
    project.py         # ProjectType, ProjectInput, ProjectConnection
  queries/
    project_queries.py # project(id), projects(filters), searchProjects
  mutations/
    project_mutations.py # createProject, updateProject, deleteProject, inviteCollaborator, confirmCollaboration
```

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
