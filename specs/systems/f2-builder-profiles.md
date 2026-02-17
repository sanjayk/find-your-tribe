# F2: Builder Profiles -- Systems Design

**Feature**: Builder Profiles
**Context**: See [overview.md](./overview.md) for architecture overview, service boundaries, and deployment.
**Source**: Extracted from [SYSTEMS_DESIGN.md](../SYSTEMS_DESIGN.md)

---

## Table of Contents

1. [Database Tables](#database-tables)
2. [Full-Text Search Setup](#full-text-search-setup)
3. [File Upload for Avatars](#file-upload-for-avatars)
4. [Caching Strategy for Profiles](#caching-strategy-for-profiles)
5. [Embedding Generation for Profiles](#embedding-generation-for-profiles)
6. [JSONB Column: preferences](#jsonb-column-preferences)
7. [Indexing Strategy](#indexing-strategy)
8. [GraphQL Schema](#graphql-schema)
9. [N+1 Prevention (DataLoaders)](#n1-prevention-dataloaders)
10. [SEO for Profile Pages](#seo-for-profile-pages)

---

## Database Tables

### `users`

| Column | Type | Constraints | Notes |
|--------|------|-------------|-------|
| id | UUID | PK, DEFAULT gen_random_uuid() | |
| email | VARCHAR(255) | UNIQUE, NOT NULL | |
| username | VARCHAR(50) | UNIQUE, NOT NULL | URL-safe, lowercase |
| display_name | VARCHAR(100) | NOT NULL | |
| avatar_url | VARCHAR(500) | NULLABLE | S3/object storage URL |
| headline | VARCHAR(200) | NULLABLE | "Full-stack engineer shipping AI tools" |
| primary_role | VARCHAR(50) | NOT NULL | engineer, designer, pm, marketer, growth, founder |
| timezone | VARCHAR(50) | NULLABLE | IANA timezone string |
| availability | VARCHAR(20) | DEFAULT 'browsing' | 'open_to_tribe', 'open_to_projects', 'browsing' |
| builder_score | INTEGER | DEFAULT 0 | Computed metric, cached |
| github_id | BIGINT | UNIQUE, NULLABLE | GitHub user ID |
| github_username | VARCHAR(100) | NULLABLE | |
| github_token_enc | TEXT | NULLABLE | Encrypted GitHub access token |
| password_hash | VARCHAR(255) | NULLABLE | NULL if GitHub-only auth |
| preferences | JSONB | DEFAULT '{}' | Notification prefs, UI settings |
| search_vector | TSVECTOR | NULLABLE | Auto-updated via trigger |
| created_at | TIMESTAMPTZ | DEFAULT NOW() | |
| updated_at | TIMESTAMPTZ | DEFAULT NOW() | |

**Agent workflow columns** (on `users` table):

| Column | Type | Constraints | Notes |
|--------|------|-------------|-------|
| agent_tools | JSONB | NULLABLE | List of AI tools, e.g. `["Claude Code", "Cursor"]` |
| agent_workflow_style | VARCHAR(20) | NULLABLE | 'pair', 'swarm', 'review', 'autonomous', 'minimal' |
| human_agent_ratio | FLOAT | NULLABLE | 0.0 (fully human) to 1.0 (fully AI-assisted) |

### `build_activities`

Token burn is the universal unit of work — every builder on the platform uses AI agents, regardless of discipline. This table tracks the raw evidence.

| Column | Type | Constraints | Notes |
|--------|------|-------------|-------|
| id | ULID | PK | |
| user_id | ULID | FK -> users(id) ON DELETE CASCADE, NOT NULL | The builder who burned tokens |
| project_id | ULID | FK -> projects(id) ON DELETE SET NULL, NULLABLE | Which project (null = unattributed) |
| activity_date | DATE | NOT NULL | Day of activity |
| tokens_burned | INTEGER | NOT NULL, CHECK > 0 | Raw token count |
| source | VARCHAR(20) | NOT NULL | 'anthropic', 'openai', 'google', 'manual', 'other' |
| metadata | JSONB | DEFAULT '{}' | Source-specific data (model, session_id, etc.) |
| created_at | TIMESTAMPTZ | DEFAULT NOW() | |

**Unique constraint**: `(user_id, project_id, activity_date, source)` — one record per user per project per day per source. Multiple sources on the same day for the same project create separate records.

**Indexes**:
```sql
CREATE INDEX idx_build_activities_user_date ON build_activities (user_id, activity_date DESC);
CREATE INDEX idx_build_activities_project ON build_activities (project_id) WHERE project_id IS NOT NULL;
CREATE INDEX idx_build_activities_date ON build_activities (activity_date DESC);
```

**Query for heatmap** (52 weeks of daily totals):
```sql
SELECT activity_date, SUM(tokens_burned) AS daily_tokens
FROM build_activities
WHERE user_id = ? AND activity_date >= CURRENT_DATE - INTERVAL '52 weeks'
GROUP BY activity_date
ORDER BY activity_date;
```

**Query for per-project burn receipt**:
```sql
SELECT activity_date, SUM(tokens_burned) AS daily_tokens
FROM build_activities
WHERE user_id = ? AND project_id = ?
GROUP BY activity_date
ORDER BY activity_date;
```

### `projects` — new column

| Column | Type | Constraints | Notes |
|--------|------|-------------|-------|
| tribe_id | ULID | FK -> tribes(id) ON DELETE SET NULL, NULLABLE | Which tribe shipped this project (null = solo) |

A project is either a **tribe project** (`tribe_id` is set) or a **solo project** (`tribe_id` is null). A tribe's credibility = its shipped projects.

### `skills`

| Column | Type | Constraints | Notes |
|--------|------|-------------|-------|
| id | SERIAL | PK | Integer for join performance |
| name | VARCHAR(100) | UNIQUE, NOT NULL | "React", "System Design", "Growth Marketing" |
| category | VARCHAR(50) | NOT NULL | 'engineering', 'design', 'product', 'marketing', 'growth' |
| slug | VARCHAR(100) | UNIQUE, NOT NULL | URL-safe lowercase |
| created_at | TIMESTAMPTZ | DEFAULT NOW() | |

### `user_skills`

| Column | Type | Constraints | Notes |
|--------|------|-------------|-------|
| id | UUID | PK, DEFAULT gen_random_uuid() | |
| user_id | UUID | FK -> users(id) ON DELETE CASCADE, NOT NULL | |
| skill_id | INTEGER | FK -> skills(id) ON DELETE CASCADE, NOT NULL | |
| proficiency | VARCHAR(20) | DEFAULT 'intermediate' | 'beginner', 'intermediate', 'expert' |
| created_at | TIMESTAMPTZ | DEFAULT NOW() | |

**Unique constraint**: (user_id, skill_id)

### Query Plan for Profile Page

The `user()` query uses `selectinload` chains to fetch all profile data in a single round-trip:

```
SELECT users WHERE username = ?
  + selectinload(skills)                          -- user_skills JOIN skills
  + selectinload(owned_projects)
      + selectinload(collaborators)               -- project_collaborators JOIN users
  + selectinload(tribes)
      + selectinload(owner)                       -- tribes.owner_id JOIN users
      + selectinload(members)                     -- tribe_members JOIN users
      + selectinload(open_roles)                  -- tribe_open_roles
```

This produces ~6 SQL queries (one per `selectinload`) but avoids N+1 issues.

---

## Full-Text Search Setup

```sql
-- Trigger function for users search vector
CREATE OR REPLACE FUNCTION users_search_vector_update() RETURNS trigger AS $$
BEGIN
  NEW.search_vector :=
    setweight(to_tsvector('english', COALESCE(NEW.display_name, '')), 'A') ||
    setweight(to_tsvector('english', COALESCE(NEW.headline, '')), 'B') ||
    setweight(to_tsvector('english', COALESCE(NEW.primary_role, '')), 'B') ||
    setweight(to_tsvector('english', COALESCE(NEW.username, '')), 'C');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER users_search_vector_trigger
  BEFORE INSERT OR UPDATE OF display_name, headline, primary_role, username
  ON users
  FOR EACH ROW EXECUTE FUNCTION users_search_vector_update();
```

Query example:
```sql
SELECT id, display_name, headline,
       ts_rank(search_vector, query) AS rank
FROM users, plainto_tsquery('english', 'react native designer') AS query
WHERE search_vector @@ query
ORDER BY rank DESC
LIMIT 20;
```

**Weight assignments**:
- **A** (highest): `display_name` -- exact name matches are most relevant
- **B**: `headline`, `primary_role` -- role and self-description
- **C** (lowest): `username` -- fallback match

---

## File Upload for Avatars

```
Client (browser)
     |
     | 1. POST /upload/avatar (multipart/form-data)
     |    - Authorization: Bearer <JWT>
     |    - file: <binary>
     v
FastAPI /upload/avatar endpoint
     |
     | 2. Validate:
     |    - File type (JPEG, PNG, WebP only)
     |    - File size (max 5MB for avatars)
     |    - Image dimensions (resize if > 800x800)
     |
     | 3. Process:
     |    - Generate unique filename: {user_id}/{uuid}.{ext}
     |    - Resize to standard dimensions (400x400 avatar)
     |    - Strip EXIF metadata
     |
     | 4. Upload to object storage (S3 / MinIO)
     |
     | 5. Return { url: "https://storage.example.com/avatars/{user_id}/{uuid}.webp" }
     v
Client updates profile via GraphQL mutation with new avatar_url
```

Libraries:
- `python-multipart` for file parsing
- `Pillow` for image processing (resize, format conversion, EXIF stripping)
- `boto3` for S3/MinIO uploads

### File Upload Security

| Check | Implementation |
|-------|---------------|
| File type | Validate MIME type AND magic bytes (not just extension). Allow: image/jpeg, image/png, image/webp |
| File size | 5MB max for avatars. Enforced at the web server level AND application level |
| Image processing | Re-encode with Pillow (strips embedded scripts in image metadata). Convert to WebP |
| EXIF stripping | `Pillow.Image.save()` without EXIF data |
| Filename | Generate UUID-based filename; never use user-provided filename |
| Storage path | `{entity_type}/{entity_id}/{uuid}.webp` -- never user-controlled path segments |
| Malware | V1: rely on re-encoding (Pillow) to neutralize image-based exploits. Future: integrate ClamAV scan |

### Image Optimization

- Use Next.js `<Image>` component for all images (automatic WebP conversion, lazy loading, srcSet)
- Avatar sizes: 40x40 (list), 80x80 (card), 160x160 (profile page) -- serve appropriate size via URL params
- Placeholder: blurred low-quality image placeholder (LQIP) generated at upload time
- Object storage serves images with `Cache-Control: public, max-age=31536000, immutable` (content-addressed filenames)

---

## Caching Strategy for Profiles

| What | Where | TTL | Invalidation |
|------|-------|-----|--------------|
| User profiles (by ID) | In-memory (per-request DataLoader) | Request lifetime | Automatic |
| User profiles (by username) | Backend in-memory LRU | 5 min | On profile update |
| Skill list | Backend in-memory | 1 hour | On skill table change |
| GraphQL responses (SSR) | Next.js fetch cache | 60 sec | `revalidate: 60` |

V1: in-memory caching only (single instance). Future: Redis as shared cache.

Cache strategy for profile pages:
- **Profile pages**: `cache-first` (data changes infrequently, mutations update cache directly)
- **Mutations**: Use `update` or `refetchQueries` to keep cache consistent after writes

---

## Embedding Generation for Profiles

**What gets embedded**:

| Source | Text Assembled For Embedding | Trigger |
|--------|------------------------------|---------|
| Builder profile | `{display_name}. {headline}. Role: {primary_role}. Skills: {skills joined}. {availability}.` | Profile create/update |

**When embeddings are generated/updated**:
1. **On create**: Background task enqueued immediately after profile creation
2. **On update**: Background task enqueued after relevant field changes; `content_hash` is checked to skip recomputation if text hasn't changed
3. **Batch recomputation**: Scheduled nightly job recomputes any embeddings where the source has been modified since the embedding was last updated (catch-up for failed tasks)

**Generation flow**:
```
Profile saved
       |
       v
[Assemble text for embedding]
       |
       v
[Call embedding API (Claude/Voyage AI)]
       |
       v
[Update embedding column on users table]
```

### Embedding Storage

Embeddings are stored as a `VECTOR(1536)` column directly on the `users` and `projects` tables (not a separate table). This simplifies queries — similarity search is a single-table operation with no joins.

**Trade-off**: The separate `embeddings` table approach offered `content_hash` dedup (skip recomputation if text unchanged). With column-on-model, this check must be implemented in the service layer (hash the assembled text and compare before calling the API).

**TODO**: Implement content hash check in the embedding generation service to avoid unnecessary API calls.

---

## JSONB Column: preferences

```json
{
  "email_digest": "weekly",
  "show_timezone": true,
  "profile_visibility": "public",
  "discovery_opt_in": true
}
```

---

## Indexing Strategy

```sql
-- Primary lookups
CREATE INDEX idx_users_email ON users (email);
CREATE INDEX idx_users_username ON users (username);
CREATE INDEX idx_users_github_id ON users (github_id) WHERE github_id IS NOT NULL;

-- User discovery
CREATE INDEX idx_users_availability ON users (availability) WHERE availability != 'browsing';
CREATE INDEX idx_users_primary_role ON users (primary_role);
CREATE INDEX idx_users_builder_score ON users (builder_score DESC);

-- Full-text search (GIN index)
CREATE INDEX idx_users_search ON users USING GIN (search_vector);

-- Skills
CREATE INDEX idx_user_skills_user ON user_skills (user_id);
CREATE INDEX idx_user_skills_skill ON user_skills (skill_id);
```

**Indexing rationale**:
- **Partial indexes** (`WHERE` clauses) keep index sizes small for filtered queries (e.g., only non-browsing users).
- **GIN indexes** for tsvector full-text search.
- **Descending indexes** on `builder_score` for common sort orders.

---

## GraphQL Schema

```
src/backend/schema/
  types/
    user.py            # UserType, UserInput, UserConnection
    skill.py           # SkillType
  queries/
    user_queries.py    # me, user(id), user(username), searchUsers
  mutations/
    user_mutations.py  # updateProfile, updateAvatar
```

### Offset-based pagination for search results

```graphql
type UserSearchResult {
  users: [User!]!
  totalCount: Int!
  page: Int!
  pageSize: Int!
}

# Usage
query {
  searchUsers(query: "react designer", page: 1, pageSize: 20) {
    users { ... }
    totalCount
  }
}
```

---

## N+1 Prevention (DataLoaders)

```python
async def load_users_by_id(keys: list[str]) -> list[User | None]:
    async with get_session() as session:
        result = await session.execute(
            select(User).where(User.id.in_(keys))
        )
        users = {str(u.id): u for u in result.scalars().all()}
        return [users.get(key) for key in keys]

async def load_skills_by_user(keys: list[str]) -> list[list[Skill]]:
    # Batch load skills for multiple users
    ...

class DataLoaders:
    def __init__(self):
        self.user_by_id = DataLoader(load_fn=load_users_by_id)
        self.skills_by_user = DataLoader(load_fn=load_skills_by_user)
```

Usage in a resolver:
```python
@strawberry.type
class UserType:
    id: strawberry.ID
    display_name: str

    @strawberry.field
    async def projects(self, info: strawberry.types.Info) -> list["ProjectType"]:
        return await info.context.loaders.projects_by_owner.load(self.id)
```

---

## SEO for Profile Pages

```typescript
// app/(main)/profile/[username]/page.tsx
import { Metadata } from "next";

export async function generateMetadata({ params }): Promise<Metadata> {
  const user = await fetchUser(params.username);  // Server-side fetch
  return {
    title: `${user.displayName} - ${user.headline} | Find Your Tribe`,
    description: `${user.displayName} is a ${user.primaryRole} who has shipped ${user.projectCount} projects. Builder Score: ${user.builderScore}.`,
    openGraph: {
      title: `${user.displayName} | Find Your Tribe`,
      description: user.headline,
      images: [user.avatarUrl || "/og/default-profile.png"],
      type: "profile",
    },
    twitter: {
      card: "summary",
      title: user.displayName,
      description: user.headline,
    },
  };
}
```

Key SEO decisions:
- **Profile pages** are Server Components with full SSR for search engine crawlability
- Dynamic `<meta>` tags via `generateMetadata` for each profile
- OpenGraph images for rich link previews when profiles are shared
- Structured data (JSON-LD) for builder profiles (Person schema)
- `robots.txt` and `sitemap.xml` generated dynamically from public profiles
