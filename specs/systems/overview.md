# Find Your Tribe -- Systems Design: Architecture Overview

**Version**: 1.0 (V1 / MVP)
**Last Updated**: 2026-02-10
**Status**: Draft
**Source**: Extracted from [SYSTEMS_DESIGN.md](../SYSTEMS_DESIGN.md)

---

## Table of Contents

1. [Architecture Overview](#1-architecture-overview)
2. [API Architecture (Shared Infrastructure)](#2-api-architecture-shared-infrastructure)
3. [Frontend Architecture](#3-frontend-architecture)
4. [Deployment Architecture](#4-deployment-architecture)
5. [Scalability Considerations](#5-scalability-considerations)
6. [Security Design](#6-security-design)
7. [Monitoring & Observability](#7-monitoring--observability)
8. [Development Workflow](#8-development-workflow)
9. [Appendices](#appendices)

---

## 1. Architecture Overview

### System Context

Find Your Tribe is a social network for builders where reputation is earned through shipping.
The system consists of four primary services communicating over well-defined boundaries:
a Next.js frontend, a FastAPI/GraphQL backend, a PostgreSQL database, and an AI-powered
MCP server for intelligent discovery.

### High-Level System Diagram

```
                                 +------------------+
                                 |   GitHub OAuth   |
                                 |    (External)    |
                                 +--------+---------+
                                          |
                                          | OAuth callback
                                          |
+-------------------+    GraphQL/REST     +-------------------+
|                   | ==================> |                   |
|   Next.js 16      |    (HTTPS/JSON)    |   FastAPI +       |
|   Frontend        | <================= |   Strawberry      |
|                   |                    |   GraphQL Server  |
|  - App Router     |                    |                   |
|  - Apollo Client  |                    |  - Auth middleware |
|  - SSR / RSC      |                    |  - Business logic |
|  - Tailwind CSS   |                    |  - DataLoaders    |
|                   |                    |  - File uploads   |
+-------------------+                    +---------+---------+
        |                                    |           |
        |  Static assets                     |           |
        v                                    |           | HTTP (internal)
+-------------------+               SQL/ORM  |           | (V2 only)
|   Object Storage  |                        |           |
|   (S3 / local)    |                        v           v
|                   |               +-----------+   +-----------+
|  - Avatars        |               |           |   |   MCP     |
|  - Thumbnails     |               | PostgreSQL|   |   Server  |
|                   |               |           |   |  (V2)     |
+-------------------+               | - Tables  |   |           |
                                    | - pgvector|   | - Claude  |
                                    | - FTS     |   |   API     |
                                    | - JSONB   |   | - Embed   |
                                    |           |   |   pipeline|
                                    +-----------+   | - Tools   |
                                         ^          +-----------+
                                         |               |
                                         +--- SQL/ORM ---+
```

### Service Boundaries

| Service | Responsibility | Port (local) |
|---------|---------------|------|
| **Frontend** (Next.js) | UI rendering, SSR, static generation, client interactivity | 3000 |
| **Backend** (FastAPI + Strawberry) | GraphQL API, REST endpoints, auth, business logic | 8787 |
| **MCP Server** (Python) **(V2 — not built for V1)** | AI-powered search, embeddings, Claude API integration | 8100 |
| **PostgreSQL** | Primary data store, full-text search, vector search | 5433 |
| **Object Storage** | Avatars, project thumbnails, uploaded media | 9000 (MinIO local) |

### Communication Patterns

**Synchronous (request/response)**:
- Frontend <-> Backend: GraphQL over HTTPS (Apollo Client <-> Strawberry)
- Frontend <-> Backend: REST over HTTPS (file uploads, webhooks, health checks)
- Backend <-> MCP Server: HTTP JSON-RPC (MCP protocol over HTTP transport) **(V2)**

**Asynchronous (background processing)**:
- V1 uses in-process background tasks via FastAPI's `BackgroundTasks`
- Jobs: embedding generation, GitHub repo sync, builder score recalculation, feed event creation
- Future: migrate to a proper task queue (Celery + Redis) when volume demands it

**AI (MCP protocol) — V2**:
- The backend calls the MCP server using the MCP client SDK over HTTP/SSE transport
- The MCP server exposes tools that the backend invokes programmatically
- The MCP server calls the Claude API for natural language understanding
- The MCP server queries PostgreSQL directly for vector similarity search

### Next.js SSR/RSC Communication with Backend

```
Browser Request
       |
       v
+------------------+
| Next.js Server   |  Server Components fetch data at render time
|                  |  using server-side GraphQL calls (no Apollo
|  Server          |  Client needed -- direct fetch() to backend)
|  Components      |------> fetch("http://backend:8787/graphql")
|                  |         with auth cookie forwarded
|  Client          |
|  Components      |  Client Components use Apollo Client in the
|                  |  browser for mutations and reactive queries
+------------------+
       |
       v
   HTML + RSC payload sent to browser
       |
       v
   Apollo Client hydrates, handles mutations & cache
```

Key decisions:
- **Server Components** use plain `fetch()` to the backend GraphQL endpoint (no Apollo overhead on the server)
- **Client Components** use Apollo Client for mutations, optimistic updates, and reactive cache
- Auth tokens are stored in httpOnly cookies, automatically forwarded by Next.js server on SSR requests
- The Next.js server acts as a BFF (Backend for Frontend), never exposing the raw backend URL to browsers in production

---

## 2. API Architecture (Shared Infrastructure)

### Request Flow

```
Browser / SSR
     |
     | HTTPS (GraphQL or REST)
     v
+----+----------+
| Next.js       |   For SSR: server-side fetch to backend
| (port 3000)   |   For CSR: Apollo Client in browser
+----+----------+
     |
     | HTTP (internal network in production, localhost in dev)
     v
+----+----------+
| FastAPI        |
| (port 8787)    |
|                |
| Middleware:    |
|  1. CORS       |
|  2. Rate limit |
|  3. Auth (JWT) |
|  4. Request ID |
|                |
| Routes:        |
|  /graphql  --> Strawberry GraphQL  ---> Resolvers ---> Services ---> SQLAlchemy ---> PostgreSQL
|  /auth/*   --> Auth endpoints (login, register, oauth callback, refresh)
|  /upload/* --> File upload (multipart form)
|  /health   --> Health check
|  /webhook  --> GitHub webhooks
+---------------+
```

### GraphQL Schema Organization

```
src/backend/app/graphql/
  __init__.py          # Root schema assembly
  context.py           # GraphQL context (session, loaders)
  types/
    __init__.py
    user.py            # UserType
    project.py         # ProjectType
    tribe.py           # TribeType
    skill.py           # SkillType
    feed_event.py      # FeedEventType
  queries/
    __init__.py
    health.py          # health query
  mutations/           # Future: mutation resolvers
```

**Root schema** (assembled in `__init__.py`):
```python
import strawberry
from .queries import Query

schema = strawberry.Schema(query=Query)
```

### Pagination Strategy

**Cursor-based** (for feed and time-ordered lists):
```graphql
type FeedConnection {
  edges: [FeedEdge!]!
  pageInfo: PageInfo!
}

type FeedEdge {
  node: FeedEvent!
  cursor: String!  # Base64-encoded created_at timestamp
}

type PageInfo {
  hasNextPage: Boolean!
  endCursor: String
}

# Usage
query {
  feed(first: 20, after: "MjAyNi0wMi0xMFQxMjowMDowMFo=") {
    edges {
      cursor
      node { ... }
    }
    pageInfo {
      hasNextPage
      endCursor
    }
  }
}
```

The cursor encodes a `(created_at, id)` tuple to handle ties in timestamp ordering. The query uses
`WHERE (created_at, id) < (cursor_time, cursor_id) ORDER BY created_at DESC, id DESC LIMIT N+1`
(fetching N+1 to determine `hasNextPage`).

**Offset-based** (for search results and filtered lists):
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

Offset pagination is acceptable for search because:
- Users rarely paginate beyond page 3-4 in search results
- Full-text search with `ts_rank` ordering is hard to cursor-paginate
- `totalCount` is useful for search UX

### File Upload Flow

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
     |    - File size (max 5MB for avatars, 10MB for thumbnails)
     |    - Image dimensions (resize if > 800x800)
     |
     | 3. Process:
     |    - Generate unique filename: {user_id}/{uuid}.{ext}
     |    - Resize to standard dimensions (400x400 avatar, 800x600 thumbnail)
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

### N+1 Query Prevention (DataLoader Pattern)

Strawberry supports DataLoaders natively. Each request gets fresh DataLoader instances
(loaders are per-request to avoid stale data across requests).

```python
# dataloaders.py
from strawberry.dataloader import DataLoader
from sqlalchemy import select
from .models import User, Project, Skill

async def load_users_by_id(keys: list[str]) -> list[User | None]:
    async with get_session() as session:
        result = await session.execute(
            select(User).where(User.id.in_(keys))
        )
        users = {str(u.id): u for u in result.scalars().all()}
        return [users.get(key) for key in keys]

async def load_projects_by_owner(keys: list[str]) -> list[list[Project]]:
    async with get_session() as session:
        result = await session.execute(
            select(Project).where(Project.owner_id.in_(keys))
        )
        projects_by_owner: dict[str, list] = {key: [] for key in keys}
        for p in result.scalars().all():
            projects_by_owner[str(p.owner_id)].append(p)
        return [projects_by_owner[key] for key in keys]

# Context setup
class DataLoaders:
    def __init__(self):
        self.user_by_id = DataLoader(load_fn=load_users_by_id)
        self.projects_by_owner = DataLoader(load_fn=load_projects_by_owner)
        self.skills_by_user = DataLoader(load_fn=load_skills_by_user)
        self.collaborators_by_project = DataLoader(load_fn=load_collaborators_by_project)
        self.tribe_members_by_tribe = DataLoader(load_fn=load_members_by_tribe)
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

This ensures that when rendering a list of 20 users with their projects, we issue 2 SQL queries
(one for users, one batch for all their projects) instead of 21.

### Database: ER Diagram

```
+------------------+       +------------------------+       +------------------+
|     users        |       |       projects         |       |     tribes       |
+------------------+       +------------------------+       +------------------+
| id (PK, uuid)   |<--+   | id (PK, uuid)          |   +-->| id (PK, uuid)   |
| email            |   |   | owner_id (FK->users)   |   |   | name             |
| username         |   |   | title                  |   |   | mission          |
| display_name     |   |   | description            |   |   | owner_id (FK)    |
| avatar_url       |   |   | status (enum)          |   |   | status (enum)    |
| headline         |   |   | links (JSONB)          |   |   | max_members      |
| primary_role     |   |   | tech_stack (text[])    |   |   | created_at       |
| timezone         |   |   | impact_metrics (JSONB) |   |   | updated_at       |
| availability     |   |   | thumbnail_url          |   |   +--------+---------+
| builder_score    |   |   | search_vector (tsvec)  |   |            |
| embedding (vec)  |   |   | embedding (vec)        |   |            |
| github_id        |   |   | created_at             |   |            |
| github_username  |   |   | updated_at             |   |   +--------+---------+
| github_token_enc |   |   +----------+-------------+   |   | tribe_members    |
| preferences(JSONB|   |              |                  |   +------------------+
| password_hash    |   |              |                  |   | id (PK, uuid)   |
| search_vector    |   |   +----------+-------------+   |   | tribe_id (FK)    |
| created_at       |   |   | project_collaborators  |   |   | user_id (FK)     |
| updated_at       |   |   +------------------------+   |   | role             |
+--------+---------+   |   | id (PK, uuid)          |   |   | status (enum)    |
         |             +---| user_id (FK->users)    |   |   | joined_at        |
         |             +---| project_id (FK)        |   |   +------------------+
         |             |   | role_description       |   |
         |             |   | status (enum)          |   |
         |             |   | invited_at             |   |   +------------------+
         |             |   | confirmed_at           |   |   |   feed_events    |
         |             |   +------------------------+   |   +------------------+
         |             |                                |   | id (PK, uuid)   |
         |             |   +------------------------+   |   | event_type (enum)|
         |             |   |       skills           |   |   | actor_id (FK)    |
+--------+---------+   |   +------------------------+   |   | target_type      |
|   user_skills    |   |   | id (PK, serial)        |   |   | target_id (uuid) |
+------------------+   |   | name (unique)          |   |   | metadata (JSONB) |
| id (PK, uuid)   |   |   | category               |   |   | created_at       |
| user_id (FK)  ---+---+   | slug (unique)          |   |   +------------------+
| skill_id (FK) ---+------>| created_at             |   |
| proficiency      |       +------------------------+   |   +------------------+
| created_at       |                                    |   | refresh_tokens   |
| created_at       |   +------------------------+      |   +------------------+
+------------------+   | tribe_open_roles        |      |   | id (PK, uuid)   |
                       +------------------------+      |   | user_id (FK)     |
                       | id (PK, uuid)          |      |   | token_hash       |
                       | tribe_id (FK) ---------+------+   | expires_at       |
                       | role_name              |          | created_at       |
                       | description            |          | revoked_at       |
                       | skills_needed (text[]) |          +------------------+
                       | created_at             |
                       +------------------------+
```

### Indexing Strategy

```sql
-- Primary lookups
CREATE INDEX idx_users_email ON users (email);
CREATE INDEX idx_users_username ON users (username);
CREATE INDEX idx_users_github_id ON users (github_id) WHERE github_id IS NOT NULL;

-- User discovery
CREATE INDEX idx_users_availability ON users (availability) WHERE availability != 'browsing';
CREATE INDEX idx_users_primary_role ON users (primary_role);
CREATE INDEX idx_users_builder_score ON users (builder_score DESC);

-- Project queries
CREATE INDEX idx_projects_owner ON projects (owner_id);
CREATE INDEX idx_projects_status ON projects (status);
CREATE INDEX idx_projects_created ON projects (created_at DESC);

-- Collaborator lookups
CREATE INDEX idx_collab_project ON project_collaborators (project_id);
CREATE INDEX idx_collab_user ON project_collaborators (user_id);
CREATE INDEX idx_collab_status ON project_collaborators (status);

-- Tribe queries
CREATE INDEX idx_tribes_owner ON tribes (owner_id);
CREATE INDEX idx_tribes_status ON tribes (status);
CREATE INDEX idx_tribe_members_tribe ON tribe_members (tribe_id);
CREATE INDEX idx_tribe_members_user ON tribe_members (user_id);

-- Feed (cursor-based pagination on created_at)
CREATE INDEX idx_feed_created ON feed_events (created_at DESC);
CREATE INDEX idx_feed_type ON feed_events (event_type);
CREATE INDEX idx_feed_actor ON feed_events (actor_id);

-- Full-text search (GIN indexes)
CREATE INDEX idx_users_search ON users USING GIN (search_vector);
CREATE INDEX idx_projects_search ON projects USING GIN (search_vector);

-- Tech stack search (GIN for array containment)
CREATE INDEX idx_projects_tech_stack ON projects USING GIN (tech_stack);

-- Skills
CREATE INDEX idx_user_skills_user ON user_skills (user_id);
CREATE INDEX idx_user_skills_skill ON user_skills (skill_id);

-- Refresh tokens
CREATE INDEX idx_refresh_tokens_user ON refresh_tokens (user_id);
CREATE INDEX idx_refresh_tokens_expires ON refresh_tokens (expires_at)
  WHERE revoked_at IS NULL;

-- Vector similarity search (HNSW for approximate nearest neighbor)
-- Embedding stored as column on users and projects tables (not a separate table)
CREATE INDEX idx_users_embedding ON users
  USING hnsw (embedding vector_cosine_ops)
  WITH (m = 16, ef_construction = 64);
CREATE INDEX idx_projects_embedding ON projects
  USING hnsw (embedding vector_cosine_ops)
  WITH (m = 16, ef_construction = 64);
```

**Indexing rationale**:
- **Partial indexes** (`WHERE` clauses) keep index sizes small for filtered queries (e.g., only non-browsing users, only non-revoked tokens).
- **GIN indexes** for tsvector full-text search and array containment (`@>` operator on tech_stack).
- **HNSW index** on pgvector for fast approximate nearest neighbor search; chosen over IVFFlat because it does not require retraining and works well up to ~1M vectors.
- **Descending indexes** on `created_at` and `builder_score` for common sort orders.

### Migration Strategy (Alembic)

- Alembic is configured with `async` support via `sqlalchemy[asyncio]` and `asyncpg`.
- Each migration is a single `.py` file in `src/backend/migrations/versions/`.
- Naming convention: `YYYY_MM_DD_HHMM_short_description.py` (Alembic revision IDs are auto-generated).
- The initial migration creates all tables, indexes, triggers, and the `pgvector` + `pg_trgm` extensions.
- **Schema changes require a migration** -- no manual DDL in production.
- `alembic upgrade head` runs automatically on backend startup in development.
- In production, migrations run as a separate step before deployment (CI/CD or manual).

```
src/backend/
  alembic.ini
  migrations/
    env.py
    versions/
      001_initial_schema.py
      002_add_embeddings_table.py
      ...
```

---

## 3. Frontend Architecture

### Next.js App Router Structure

```
src/frontend/src/
  app/
    layout.tsx                 # Root layout: fonts, theme, Apollo Provider
    page.tsx                   # Landing page
    globals.css                # Tailwind v4 @theme tokens + custom properties
    discover/
      page.tsx                 # Discovery hub (builders tab)
      page.test.tsx
    profile/
      [username]/
        page.tsx               # Public builder profile (SSR for SEO)
        page.test.tsx

  components/
    ui/                        # shadcn/ui primitives (Button, Card, Avatar, Badge, etc.)
    features/                  # Product-specific components
      builder-card.tsx         # Builder summary card
      project-card.tsx         # Project summary card
      score-display.tsx        # Builder score display
      shipping-timeline.tsx    # Horizontal time axis with project dots
      collaborator-network.tsx # Deduplicated collaborator avatars
      agent-workflow-card.tsx  # AI workflow style, tools, human/AI ratio
      burn-map.tsx             # Building activity dot grid
    layout/                    # Nav, Footer

  lib/
    graphql/
      client.ts               # Apollo Client instance + cache config
      types.ts                 # TypeScript types for GraphQL
      queries/
        builders.ts            # Builder queries

  test/
    setup.ts                   # Vitest test setup
```

### Server Components vs Client Components Decision Tree

```
Is it a page that needs SEO / first-paint data?
  |
  Yes --> Server Component (fetch data server-side)
  |         Examples: profile/[username], project/[id], feed
  |
  No
  |
  Does it need browser APIs (event handlers, useState, useEffect)?
    |
    Yes --> Client Component ("use client")
    |         Examples: forms, modals, search input with debounce
    |
    No
    |
    Does it need Apollo Client reactive cache?
      |
      Yes --> Client Component (Apollo hooks)
      |         Examples: optimistic mutation results, real-time polling
      |
      No --> Server Component (default)
              Examples: static content, layout shells, nav
```

**Principle**: Default to Server Components. Only add `"use client"` when the component needs
interactivity, browser APIs, or Apollo reactive features. Keep the client bundle small.

### Apollo Client Setup and Cache Strategy

```typescript
// lib/apollo-client.ts
import { ApolloClient, InMemoryCache, HttpLink } from "@apollo/client";

const httpLink = new HttpLink({
  uri: process.env.NEXT_PUBLIC_GRAPHQL_URL || "http://localhost:8787/graphql",
  credentials: "include",  // Send cookies (httpOnly JWT)
});

export const apolloClient = new ApolloClient({
  link: httpLink,
  cache: new InMemoryCache({
    typePolicies: {
      Query: {
        fields: {
          // Cursor-based pagination merge for feed
          feed: {
            keyArgs: ["filters"],
            merge(existing, incoming, { args }) {
              if (!args?.after) return incoming;
              return {
                ...incoming,
                edges: [...(existing?.edges || []), ...incoming.edges],
              };
            },
          },
          // Offset pagination for search
          searchUsers: {
            keyArgs: ["query", "filters"],
          },
        },
      },
      User: { keyFields: ["id"] },
      Project: { keyFields: ["id"] },
      Tribe: { keyFields: ["id"] },
    },
  }),
  defaultOptions: {
    watchQuery: {
      fetchPolicy: "cache-and-network",  // Show cached data, then update
    },
  },
});
```

Cache strategy:
- **Profile pages**: `cache-first` (data changes infrequently, mutations update cache directly)
- **Feed**: `cache-and-network` (show stale, then refresh)
- **Search results**: `network-only` (always fresh)
- **Mutations**: Use `update` or `refetchQueries` to keep cache consistent after writes

### Authentication State Management

```
1. On app load:
   - Server Component reads httpOnly cookie on initial SSR
   - If valid JWT present, injects user data into RSC payload
   - AuthProvider (Client Component) initializes with SSR user data

2. On client-side navigation:
   - Apollo Client sends cookies automatically (credentials: "include")
   - If 401 response, AuthProvider triggers silent token refresh

3. Token refresh flow:
   - Access token (15min) stored in httpOnly cookie
   - Refresh token (7 days) stored in separate httpOnly cookie
   - When access token expires, middleware intercepts 401
   - Calls /auth/refresh with refresh cookie
   - Server returns new access token cookie
   - Original request retries automatically

4. Logout:
   - POST /auth/logout (clears both cookies, revokes refresh token in DB)
   - Apollo Client cache cleared
   - Redirect to /login
```

### Image Optimization Strategy

- Use Next.js `<Image>` component for all images (automatic WebP conversion, lazy loading, srcSet)
- Avatar sizes: 40x40 (list), 80x80 (card), 160x160 (profile page) -- serve appropriate size via URL params
- Project thumbnails: 400x300 (card), 800x600 (detail page)
- Placeholder: blurred low-quality image placeholder (LQIP) generated at upload time
- Object storage serves images with `Cache-Control: public, max-age=31536000, immutable` (content-addressed filenames)

### SEO Approach

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
- **Profile pages** and **project pages** are Server Components with full SSR for search engine crawlability
- Dynamic `<meta>` tags via `generateMetadata` for each profile and project
- OpenGraph images for rich link previews when profiles/projects are shared
- Semantic HTML (`<article>`, `<section>`, `<nav>`, `<main>`)
- Structured data (JSON-LD) for builder profiles (Person schema) and projects (CreativeWork schema)
- `robots.txt` and `sitemap.xml` generated dynamically from public profiles/projects

---

## 4. Deployment Architecture

### Local Development Setup (Docker Compose)

```yaml
# docker-compose.yml
version: "3.9"

services:
  postgres:
    image: pgvector/pgvector:pg16
    environment:
      POSTGRES_DB: findyourtribe
      POSTGRES_USER: fyt_dev
      POSTGRES_PASSWORD: dev_password
    ports:
      - "5433:5432"
    volumes:
      - pg_data:/var/lib/postgresql/data
      - ./scripts/init.sql:/docker-entrypoint-initdb.d/init.sql
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U fyt_dev -d findyourtribe"]
      interval: 5s
      timeout: 3s
      retries: 5

  backend:
    build:
      context: ./src/backend
      dockerfile: Dockerfile
    environment:
      DATABASE_URL: postgresql+asyncpg://fyt_dev:dev_password@postgres:5433/findyourtribe
      SECRET_KEY: dev-secret-key-change-in-production
      GITHUB_CLIENT_ID: ${GITHUB_CLIENT_ID}
      GITHUB_CLIENT_SECRET: ${GITHUB_CLIENT_SECRET}
      MCP_SERVER_URL: http://mcp:8100
      CORS_ORIGINS: http://localhost:3000
      ENVIRONMENT: development
    ports:
      - "8787:8787"
    depends_on:
      postgres:
        condition: service_healthy
    volumes:
      - ./src/backend:/app
    command: uvicorn main:app --host 0.0.0.0 --port 8787 --reload

  frontend:
    build:
      context: ./src/frontend
      dockerfile: Dockerfile
    environment:
      NEXT_PUBLIC_GRAPHQL_URL: http://localhost:8787/graphql
      INTERNAL_GRAPHQL_URL: http://backend:8787/graphql
      NEXT_PUBLIC_UPLOAD_URL: http://localhost:8787/upload
    ports:
      - "3000:3000"
    depends_on:
      - backend
    volumes:
      - ./src/frontend:/app
      - /app/node_modules
      - /app/.next
    command: npm run dev

  # MCP server — V2, not built for V1
  # mcp:
  #   build:
  #     context: ./src/mcp
  #     dockerfile: Dockerfile
  #   environment:
  #     DATABASE_URL: postgresql+asyncpg://fyt_dev:dev_password@postgres:5433/findyourtribe
  #     ANTHROPIC_API_KEY: ${ANTHROPIC_API_KEY}
  #     EMBEDDING_MODEL: voyage-3
  #     VOYAGE_API_KEY: ${VOYAGE_API_KEY}
  #   ports:
  #     - "8100:8100"
  #   depends_on:
  #     postgres:
  #       condition: service_healthy
  #   volumes:
  #     - ./src/mcp:/app
  #   command: python server.py

  minio:
    image: minio/minio
    environment:
      MINIO_ROOT_USER: minioadmin
      MINIO_ROOT_PASSWORD: minioadmin
    ports:
      - "9000:9000"
      - "9001:9001"
    volumes:
      - minio_data:/data
    command: server /data --console-address ":9001"

volumes:
  pg_data:
  minio_data:
```

### Environment Variables and Secrets Management

**Development** (`.env` file, git-ignored):
```bash
# .env (NOT committed to git)
GITHUB_CLIENT_ID=your_github_oauth_app_id
GITHUB_CLIENT_SECRET=your_github_oauth_app_secret
ANTHROPIC_API_KEY=sk-ant-...
VOYAGE_API_KEY=pa-...
```

**Production**:
- Secrets stored in the cloud provider's secret manager (AWS Secrets Manager, GCP Secret Manager, or Doppler)
- Injected as environment variables at container runtime
- Never baked into Docker images
- Rotated on a regular schedule

**Full environment variable reference**:

| Variable | Service | Required | Notes |
|----------|---------|----------|-------|
| `DATABASE_URL` | backend, mcp | Yes | PostgreSQL connection string |
| `SECRET_KEY` | backend | Yes | JWT signing key (min 32 bytes) |
| `GITHUB_CLIENT_ID` | backend | Yes | GitHub OAuth App |
| `GITHUB_CLIENT_SECRET` | backend | Yes | GitHub OAuth App |
| `MCP_SERVER_URL` | backend | Yes | URL to MCP server |
| `CORS_ORIGINS` | backend | Yes | Comma-separated allowed origins |
| `ANTHROPIC_API_KEY` | mcp | Yes | Claude API key |
| `VOYAGE_API_KEY` | mcp | Yes | Voyage AI embedding API key |
| `EMBEDDING_MODEL` | mcp | No | Default: `voyage-3` |
| `NEXT_PUBLIC_GRAPHQL_URL` | frontend | Yes | Public GraphQL URL (browser) |
| `INTERNAL_GRAPHQL_URL` | frontend | Yes | Internal GraphQL URL (SSR) |
| `S3_BUCKET` | backend | Yes | Object storage bucket name |
| `S3_ENDPOINT` | backend | No | MinIO endpoint (dev only) |
| `S3_ACCESS_KEY` | backend | Yes | Object storage credentials |
| `S3_SECRET_KEY` | backend | Yes | Object storage credentials |
| `ENVIRONMENT` | all | No | `development` or `production` |

### Database Seeding Strategy

```
src/backend/app/seed/
    __init__.py             # Package exports (seed_all)
    users.py                # 10-15 demo builders with realistic profiles
    projects.py             # 20-30 demo projects with varied tech stacks and statuses
    tribes.py               # 5-8 demo tribes in various states
    feed_events.py          # Generated from the demo data above
    run.py                  # Orchestrator: runs all seeds in order
```

**Usage**:
```bash
# After docker-compose up
cd src/backend && python -m app.seed.run

# Or during development, auto-seed if DB is empty:
# backend startup checks if users table has 0 rows, runs seeds if so
```

The skill seed is **canonical** -- it runs on every deployment (upsert by slug) to ensure the skill
taxonomy is consistent. Demo data seeds only run in development.

---

## 5. Scalability Considerations

### Where Bottlenecks Will Appear First

```
Load Phase 1 (0-10K users):
  No bottlenecks. Single PostgreSQL, single backend instance handles everything.

Load Phase 2 (10K-100K users):
  1. Embedding generation queue backs up -> need proper task queue (Celery + Redis)
  2. Feed queries slow down -> add composite index on (event_type, created_at)
  3. Full-text search gets slow -> consider materialized views for popular queries
  4. AI search latency -> cache aggressively, batch embedding updates

Load Phase 3 (100K-1M users):
  1. PostgreSQL read load -> add read replica, route read queries
  2. Vector search slows -> evaluate dedicated vector DB
  3. File storage costs -> CDN for frequently accessed images
  4. Backend CPU on search -> horizontal scaling (multiple FastAPI instances)
```

### Database Scaling

**Connection pooling** (V1):
```python
# SQLAlchemy async engine with pool
engine = create_async_engine(
    DATABASE_URL,
    pool_size=20,           # Steady-state connections
    max_overflow=10,        # Burst connections
    pool_timeout=30,        # Wait for available connection
    pool_recycle=1800,      # Recycle connections every 30 min
    pool_pre_ping=True,     # Test connection health before use
)
```

**Future scaling path**:
1. **Read replicas**: Route all GraphQL queries to read replica, mutations to primary
2. **PgBouncer**: Connection pooler in front of PostgreSQL for >100 concurrent connections
3. **Table partitioning**: Partition `feed_events` by month (time-series data grows fastest)
4. **Archival**: Move feed events older than 1 year to cold storage

### Caching Layer

| What | Where | TTL | Invalidation |
|------|-------|-----|--------------|
| User profiles (by ID) | In-memory (per-request DataLoader) | Request lifetime | Automatic |
| User profiles (by username) | Backend in-memory LRU | 5 min | On profile update |
| Skill list | Backend in-memory | 1 hour | On skill table change |
| Feed page (first page) | Backend in-memory LRU | 1 min | On new feed event |
| Search results | Backend in-memory LRU | 5 min | TTL-based |
| Static assets | CDN / browser cache | 1 year | Content-addressed URLs |
| GraphQL responses (SSR) | Next.js fetch cache | 60 sec | `revalidate: 60` |

V1: in-memory caching only (single instance). Future: Redis as shared cache.

### Background Job Processing

V1 uses `FastAPI.BackgroundTasks` for simplicity:

```python
@router.post("/projects")
async def create_project(data: ProjectInput, background_tasks: BackgroundTasks):
    project = await project_service.create(data)
    background_tasks.add_task(generate_project_embedding, project.id)
    background_tasks.add_task(create_feed_event, "project_created", project)
    return project
```

**Jobs and their triggers**:

| Job | Trigger | Priority | Notes |
|-----|---------|----------|-------|
| Generate embedding | Profile/project create/update | Medium | Debounced (skip if content unchanged) |
| Sync GitHub repos | User connects GitHub / manual refresh | Low | Rate-limited to 1 sync/user/hour |
| Recalculate builder score | Collaborator confirmed, project status change | Medium | Debounced per user (max 1 calc/5min) |
| Clean expired tokens | Scheduled (daily) | Low | DELETE WHERE expires_at < NOW() AND revoked_at IS NOT NULL |

**Future migration path**: When background tasks need reliability guarantees (retry, dead-letter,
monitoring), migrate to Celery + Redis:
```
FastAPI --> Redis (broker) --> Celery Workers --> PostgreSQL
```

### CDN for Static Assets and Images

- Next.js static assets (`/_next/static/`) served with immutable cache headers
- Uploaded images served through CDN (CloudFront, Cloudflare R2, or similar)
- Image URLs include content hash: `/avatars/{user_id}/{content_hash}.webp`
- CDN cache TTL: 1 year (content-addressed = immutable)
- Origin: S3/MinIO bucket with restricted public read access

---

## 6. Security Design

### OWASP Top 10 Mitigations

| # | Vulnerability | Mitigation |
|---|--------------|------------|
| A01 | Broken Access Control | Authorization checks in service layer (not just resolvers). Owner-only mutations verified against `context.user.id`. |
| A02 | Cryptographic Failures | Passwords hashed with bcrypt (cost=12). JWTs signed with HS256 + 256-bit secret. GitHub tokens encrypted at rest (Fernet/AES-256). TLS in production. |
| A03 | Injection | SQLAlchemy ORM uses parameterized queries exclusively. GraphQL input types validated via Strawberry type system. No raw SQL. |
| A04 | Insecure Design | Principle of least privilege: GitHub OAuth scopes minimized. Refresh tokens are one-time-use (rotation). Rate limiting on all auth endpoints. |
| A05 | Security Misconfiguration | CORS locked to specific origins. Debug mode disabled in production. Default PostgreSQL credentials overridden. Security headers set (see below). |
| A06 | Vulnerable Components | `pip-audit` and `npm audit` in CI. Dependabot alerts enabled. Base Docker images pinned to specific digests. |
| A07 | Auth Failures | Rate limiting on login (5/min). Account lockout after 10 failed attempts (15-min cooldown). No user enumeration (generic error messages). |
| A08 | Software/Data Integrity | Docker images built from pinned base images. Alembic migrations are code-reviewed. No client-side JWT verification. |
| A09 | Logging Failures | Structured logging for all auth events (login, failed login, token refresh, logout). Log actor, action, IP, timestamp. No sensitive data in logs. |
| A10 | SSRF | MCP server's `analyze_project` tool validates URLs against an allowlist of domains (github.com, gitlab.com, etc.). No arbitrary URL fetching. |

**Security headers** (set via FastAPI middleware):
```python
@app.middleware("http")
async def security_headers(request, call_next):
    response = await call_next(request)
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-Frame-Options"] = "DENY"
    response.headers["X-XSS-Protection"] = "0"  # Disabled; CSP is the modern approach
    response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
    response.headers["Permissions-Policy"] = "camera=(), microphone=(), geolocation=()"
    # CSP set by Next.js for frontend; backend sets it for /graphiql in dev only
    return response
```

### Input Sanitization (GraphQL)

- **Type validation**: Strawberry enforces types at the schema level. String inputs have max length enforced via custom scalars.
- **Query depth limiting**: Strawberry query depth limiter set to max depth 10 to prevent deeply nested queries.
- **Query complexity**: Custom extension estimates query cost; rejects queries exceeding complexity threshold (e.g., 1000 points).
- **Introspection**: Disabled in production (`schema = strawberry.Schema(..., extensions=[DisableIntrospection()])`)

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

### File Upload Security

| Check | Implementation |
|-------|---------------|
| File type | Validate MIME type AND magic bytes (not just extension). Allow: image/jpeg, image/png, image/webp |
| File size | 5MB max for avatars, 10MB max for project thumbnails. Enforced at the web server level AND application level |
| Image processing | Re-encode with Pillow (strips embedded scripts in image metadata). Convert to WebP |
| EXIF stripping | `Pillow.Image.save()` without EXIF data |
| Filename | Generate UUID-based filename; never use user-provided filename |
| Storage path | `{entity_type}/{entity_id}/{uuid}.webp` -- never user-controlled path segments |
| Malware | V1: rely on re-encoding (Pillow) to neutralize image-based exploits. Future: integrate ClamAV scan |

### Secret Management

| Secret | Storage | Rotation |
|--------|---------|----------|
| JWT signing key | Environment variable (from cloud secrets manager) | Rotate quarterly; support multiple valid keys during rotation |
| PostgreSQL password | Environment variable (from cloud secrets manager) | Rotate quarterly |
| GitHub OAuth secret | Environment variable (from cloud secrets manager) | Rotate as needed |
| GitHub user tokens | Encrypted in DB (Fernet, key from env var) | Managed by GitHub OAuth flow |
| Anthropic API key | Environment variable (from cloud secrets manager) | Rotate as needed |
| Voyage API key | Environment variable (from cloud secrets manager) | Rotate as needed |

**Encryption at rest** for GitHub tokens:
```python
from cryptography.fernet import Fernet

# ENCRYPTION_KEY loaded from environment variable
fernet = Fernet(ENCRYPTION_KEY)

def encrypt_token(token: str) -> str:
    return fernet.encrypt(token.encode()).decode()

def decrypt_token(encrypted: str) -> str:
    return fernet.decrypt(encrypted.encode()).decode()
```

### Dependency Security

- `pip-audit` runs in CI for Python dependencies
- `npm audit` runs in CI for Node.js dependencies
- Dependabot (or Renovate) enabled for automated dependency update PRs
- Docker base images pinned to specific SHA digests (not just tags)
- `.dockerignore` excludes `.env`, `.git`, `node_modules`, `__pycache__`

### SQL Injection Prevention

All database access goes through SQLAlchemy ORM, which uses parameterized queries exclusively.
**No raw SQL strings** are constructed anywhere in the codebase. The one exception is the
full-text search query, which uses SQLAlchemy's `func.plainto_tsquery()`:

```python
# Safe: parameterized via SQLAlchemy
from sqlalchemy import func

query = select(User).where(
    User.search_vector.match(search_term)  # SQLAlchemy generates parameterized query
).order_by(
    func.ts_rank(User.search_vector, func.plainto_tsquery("english", search_term)).desc()
)
```

---

## 7. Monitoring & Observability (Lightweight V1)

### Health Check Endpoints

```python
# Backend health
@app.get("/health")
async def health():
    """Basic health check for load balancers and Docker healthcheck."""
    return {"status": "ok", "service": "backend", "timestamp": datetime.utcnow().isoformat()}

@app.get("/health/ready")
async def readiness():
    """Readiness check: verifies database connectivity."""
    try:
        async with get_session() as session:
            await session.execute(text("SELECT 1"))
        return {"status": "ready", "database": "connected"}
    except Exception as e:
        return JSONResponse(
            status_code=503,
            content={"status": "not_ready", "database": str(e)}
        )

# MCP server health
@mcp_app.get("/health")
async def mcp_health():
    return {"status": "ok", "service": "mcp-server"}
```

### Structured Logging

Using `structlog` for Python services:

```python
import structlog

logger = structlog.get_logger()

# Request logging middleware
@app.middleware("http")
async def log_requests(request, call_next):
    request_id = request.headers.get("X-Request-ID", str(uuid4()))
    structlog.contextvars.bind_contextvars(request_id=request_id)

    logger.info(
        "request_started",
        method=request.method,
        path=request.url.path,
        client_ip=request.client.host,
    )

    start = time.monotonic()
    response = await call_next(request)
    duration = time.monotonic() - start

    logger.info(
        "request_completed",
        method=request.method,
        path=request.url.path,
        status_code=response.status_code,
        duration_ms=round(duration * 1000, 2),
    )
    response.headers["X-Request-ID"] = request_id
    return response
```

Log format (JSON lines):
```json
{
  "event": "request_completed",
  "method": "POST",
  "path": "/graphql",
  "status_code": 200,
  "duration_ms": 45.2,
  "request_id": "abc-123",
  "timestamp": "2026-02-10T12:00:00Z",
  "level": "info"
}
```

### Key Metrics to Track

| Metric | Type | Purpose |
|--------|------|---------|
| Request latency (p50, p95, p99) | Histogram | Performance baseline |
| Request count by endpoint | Counter | Traffic patterns |
| Error rate (4xx, 5xx) | Counter | Reliability |
| Database query duration | Histogram | DB performance |
| Active database connections | Gauge | Pool health |
| Background task queue depth | Gauge | Processing backlog |
| AI search latency | Histogram | MCP server performance |
| Embedding generation duration | Histogram | AI pipeline health |
| User signups per day | Counter | Growth |
| Projects created per day | Counter | Engagement |

V1: Metrics are logged as structured log events. Future: Prometheus + Grafana for dashboards.

### Error Reporting

V1 approach:
- Unhandled exceptions caught by FastAPI exception handler, logged with full stack trace
- Strawberry GraphQL errors include error codes and user-friendly messages (no stack traces to client)
- Frontend: Next.js error boundaries catch rendering errors, log to console
- Future: Integrate Sentry for error aggregation, alerting, and stack trace analysis

```python
# GraphQL error handling
@app.exception_handler(Exception)
async def global_exception_handler(request, exc):
    logger.error(
        "unhandled_exception",
        error=str(exc),
        traceback=traceback.format_exc(),
        path=request.url.path,
    )
    return JSONResponse(
        status_code=500,
        content={"detail": "An internal error occurred. Please try again."}
    )
```

---

## 8. Development Workflow

### Monorepo Structure

```
find-your-tribe/
  CLAUDE.md                    # Project instructions and conventions
  specs/
    product/                   # Product specs per feature (f2-f7)
    tech/                      # Technical specs per feature
    systems/                   # Systems design per feature
    design/                    # Design specs, component library
  src/
    frontend/                  # Next.js 16 app
      package.json
      tsconfig.json
      next.config.ts
      vitest.config.ts
      src/
        app/
        components/
        lib/
        test/
    backend/                   # FastAPI app
      pyproject.toml
      alembic.ini
      docker-compose.yml       # PostgreSQL + pgvector
      app/
        main.py
        config.py
        db/
        graphql/
        models/
        seed/
      migrations/
      tests/
  .gitignore
```

### How to Run Locally

```bash
# 1. Clone and setup
git clone <repo-url> find-your-tribe
cd find-your-tribe

# 2. Copy environment file
cp .env.example .env
# Edit .env with your GitHub OAuth and API keys

# 3. Start everything
docker compose up

# This starts:
#   - PostgreSQL (port 5433) with pgvector extension
#   - FastAPI backend (port 8787) with hot reload
#   - Next.js frontend (port 3000) with hot reload

# 4. Run database migrations
cd src/backend && alembic upgrade head

# 5. Seed demo data (optional)
cd src/backend && python -m app.seed.run

# 6. Open browser
open http://localhost:3000
```

**Makefile shortcuts**:
```makefile
.PHONY: up down reset seed test lint

up:
	docker compose up -d

down:
	docker compose down

reset:
	docker compose down -v
	docker compose up -d
	sleep 5
	docker compose exec backend alembic upgrade head
	docker compose exec backend python seeds/run_seeds.py

seed:
	docker compose exec backend python seeds/run_seeds.py

test:
	docker compose exec backend pytest tests/ -v
	docker compose exec frontend npm test
	docker compose exec mcp pytest tests/ -v

lint:
	docker compose exec backend ruff check .
	docker compose exec frontend npm run lint
```

### Testing Strategy

**Unit tests** (fast, isolated, no external dependencies):

| Layer | Tool | What to Test |
|-------|------|-------------|
| Backend services | `pytest` + `pytest-asyncio` | Business logic, validation, authorization rules |
| Backend models | `pytest` | Model methods, computed properties |
| GraphQL resolvers | `pytest` + Strawberry test client | Query/mutation input validation, response shapes |
| MCP tools | `pytest` | Tool logic with mocked Claude API and DB |
| Frontend components | `vitest` + React Testing Library | Component rendering, user interactions |
| Frontend utils | `vitest` | Helper functions, formatters |

**Integration tests** (test real service interactions):

| Scope | Tool | What to Test |
|-------|------|-------------|
| Backend + DB | `pytest` + test PostgreSQL (testcontainers) | Full request flow, database state, migrations |
| Auth flow | `pytest` + httpx | Login, signup, token refresh, OAuth (mocked GitHub) |
| GraphQL API | `pytest` + Strawberry test client + real DB | Full query/mutation resolution with actual data |

**End-to-end tests** (full stack, browser-based):

| Scope | Tool | What to Test |
|-------|------|-------------|
| Critical user journeys | Playwright | Signup, create project, browse feed, search builders |
| Auth flows | Playwright | Login, logout, token expiration handling |
| Responsive design | Playwright | Mobile and desktop viewports |

**Test database management**:
- Integration tests use a dedicated test database (`findyourtribe_test`)
- Each test module gets a clean database (tables truncated between test functions)
- Fixtures provide factory functions for creating test users, projects, tribes

```python
# conftest.py
@pytest.fixture
async def db_session():
    """Provide a clean database session for each test."""
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    async with AsyncSession(engine) as session:
        yield session

    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)

@pytest.fixture
def user_factory(db_session):
    async def _create_user(**kwargs):
        defaults = {
            "email": f"test-{uuid4()}@example.com",
            "username": f"testuser-{uuid4().hex[:8]}",
            "display_name": "Test Builder",
            "primary_role": "engineer",
        }
        defaults.update(kwargs)
        user = User(**defaults)
        db_session.add(user)
        await db_session.commit()
        return user
    return _create_user
```

### CI Pipeline (Future)

```
on: [push, pull_request]

jobs:
  lint:
    - ruff check src/backend/
    - ruff check src/mcp/
    - npm run lint (frontend)

  test-backend:
    services: [postgres with pgvector]
    steps:
      - alembic upgrade head
      - pytest src/backend/tests/ --cov

  test-mcp:
    services: [postgres with pgvector]
    steps:
      - pytest src/mcp/tests/ --cov

  test-frontend:
    steps:
      - npm test -- --coverage

  test-e2e:
    services: [postgres, backend, frontend, mcp]
    steps:
      - npx playwright test

  security:
    steps:
      - pip-audit
      - npm audit
      - trivy image scan (Docker images)

  build:
    steps:
      - docker build (all services)
      - docker push to registry (on main branch only)
```

---

## Appendices

### Appendix A: Technology Version Pinning

| Technology | Version | Notes |
|------------|---------|-------|
| Python | 3.12+ | Type hints, performance improvements |
| Node.js | 20 LTS | Stable for Next.js 16 |
| Next.js | 16.x | App Router, Server Components, Turbopack |
| FastAPI | 0.110+ | Async support, Pydantic v2 |
| Strawberry GraphQL | 0.220+ | DataLoader support, extensions |
| SQLAlchemy | 2.0+ | Async engine, modern query style |
| Alembic | 1.13+ | Async migration support |
| PostgreSQL | 16 | pgvector, full-text search |
| pgvector | 0.7+ | HNSW index support |
| Apollo Client | 4.x | App Router compatibility |
| Tailwind CSS | 4.x | CSS-first config, @theme directive |
| Docker Compose | 3.9 | Service dependencies, healthchecks |

### Appendix B: Glossary

| Term | Definition |
|------|-----------|
| **Builder** | A user of Find Your Tribe -- anyone who makes things |
| **Builder Score** | Computed reputation metric based on shipped projects, collaborator vouches, and impact |
| **Tribe** | A small group (2-8) of builders with complementary skills |
| **MCP** | Model Context Protocol -- Anthropic's protocol for AI tool integration |
| **Feed Event** | An immutable record of a build-related action (project shipped, tribe formed, etc.) |
| **DataLoader** | A batching/caching utility that prevents N+1 query problems in GraphQL |
| **pgvector** | PostgreSQL extension for vector similarity search |
| **RRF** | Reciprocal Rank Fusion -- a method for combining multiple ranked lists |
| **HNSW** | Hierarchical Navigable Small World -- an approximate nearest neighbor search algorithm |
| **BFF** | Backend for Frontend -- a server-side layer that mediates between frontend and backend services |
