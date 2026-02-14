# Backend Scaffold Spec

> Scaffolding spec for the Python backend. Agents should implement exactly what's described — no feature logic, no auth middleware, just the foundation.

## Tech Stack

- **Runtime:** Python 3.12+
- **Framework:** FastAPI (async)
- **GraphQL:** Strawberry with FastAPI integration
- **ORM:** SQLAlchemy 2.0 async (asyncpg driver)
- **Migrations:** Alembic (async template)
- **Database:** PostgreSQL 16+ with pgvector extension
- **IDs:** ULID via `python-ulid`
- **Testing:** pytest + pytest-asyncio + httpx (async test client)
- **Working directory:** `src/backend/`

## 1. Project Init + Dependencies

Create `src/backend/` with this structure:

```
src/backend/
├── pyproject.toml          # Project metadata + dependencies
├── alembic.ini             # Alembic config pointing to migrations/
├── migrations/
│   ├── env.py              # Async Alembic env (imports all models)
│   ├── script.py.mako      # Migration template
│   └── versions/           # Empty — migrations generated later
├── app/
│   ├── __init__.py
│   ├── main.py             # FastAPI app factory + Strawberry mount
│   ├── config.py           # Pydantic Settings (DATABASE_URL, etc.)
│   ├── db/
│   │   ├── __init__.py
│   │   ├── engine.py       # create_async_engine + async sessionmaker
│   │   └── base.py         # DeclarativeBase + common mixins
│   ├── models/
│   │   ├── __init__.py     # Re-export all models (Alembic needs this)
│   │   ├── user.py
│   │   ├── skill.py
│   │   ├── project.py
│   │   ├── tribe.py
│   │   └── feed_event.py
│   ├── graphql/
│   │   ├── __init__.py
│   │   ├── schema.py       # Root Query + Mutation + schema
│   │   ├── context.py      # GraphQL context (db session, current user stub)
│   │   ├── types/
│   │   │   ├── __init__.py
│   │   │   ├── user.py
│   │   │   ├── skill.py
│   │   │   ├── project.py
│   │   │   ├── tribe.py
│   │   │   └── feed_event.py
│   │   ├── queries/
│   │   │   ├── __init__.py
│   │   │   └── health.py   # health query (DB connectivity check)
│   │   └── mutations/
│   │       └── __init__.py  # Empty — mutations added per feature
│   └── seed/
│       ├── __init__.py
│       ├── run.py           # CLI entrypoint: `python -m app.seed.run`
│       ├── skills.py        # Skill taxonomy (80+ skills, 8 categories)
│       ├── users.py         # 10 seed builders matching prototype data
│       ├── projects.py      # 6 seed projects matching prototype data
│       ├── tribes.py        # 3 seed tribes matching prototype data
│       └── feed_events.py   # 15 seed feed events matching prototype
├── tests/
│   ├── __init__.py
│   ├── conftest.py          # Fixtures: async engine, test DB, session, client
│   └── test_health.py       # Health query returns ok + DB connected
└── docker-compose.yml       # PostgreSQL 16 + pgvector for local dev
```

### Dependencies (`pyproject.toml`)

```toml
[project]
name = "find-your-tribe-backend"
version = "0.1.0"
requires-python = ">=3.12"

dependencies = [
    "fastapi[standard]",
    "strawberry-graphql[fastapi]",
    "sqlalchemy[asyncio]>=2.0",
    "asyncpg",
    "alembic",
    "pgvector",
    "python-ulid",
    "pydantic-settings",
    "uvicorn[standard]",
]

[project.optional-dependencies]
dev = [
    "pytest",
    "pytest-asyncio",
    "httpx",
    "ruff",
]
```

## 2. Database Engine + Base Model

### `app/config.py`

Pydantic Settings loading from environment:

```python
DATABASE_URL = "postgresql+asyncpg://tribe:tribe@localhost:5432/tribe"
ENVIRONMENT = "development"
DEBUG = True
```

### `app/db/engine.py`

- `create_async_engine(DATABASE_URL)` with reasonable pool settings
- `async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)`
- `get_session()` async generator for dependency injection

### `app/db/base.py`

Declarative base with common mixins:

```python
class Base(DeclarativeBase):
    pass

class TimestampMixin:
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )

class ULIDMixin:
    id: Mapped[str] = mapped_column(
        String(26), primary_key=True, default=lambda: str(ULID())
    )
```

## 3. SQLAlchemy Models

Implement ALL models from the feature specs. No business logic — just column definitions, relationships, indexes, and enums.

### Enums (define in each model file or a shared `enums.py`)

```python
class UserRole(str, Enum):
    ENGINEER = "engineer"
    DESIGNER = "designer"
    PM = "pm"
    MARKETER = "marketer"
    GROWTH = "growth"
    FOUNDER = "founder"
    OTHER = "other"

class AvailabilityStatus(str, Enum):
    OPEN_TO_TRIBE = "open_to_tribe"
    AVAILABLE_FOR_PROJECTS = "available_for_projects"
    JUST_BROWSING = "just_browsing"

class ProjectStatus(str, Enum):
    SHIPPED = "shipped"
    IN_PROGRESS = "in_progress"
    ARCHIVED = "archived"

class CollaboratorStatus(str, Enum):
    PENDING = "pending"
    CONFIRMED = "confirmed"
    DECLINED = "declined"

class TribeStatus(str, Enum):
    OPEN = "open"
    ACTIVE = "active"
    ALUMNI = "alumni"

class MemberRole(str, Enum):
    OWNER = "owner"
    MEMBER = "member"

class MemberStatus(str, Enum):
    PENDING = "pending"
    ACTIVE = "active"
    REJECTED = "rejected"
    LEFT = "left"
    REMOVED = "removed"

class EventType(str, Enum):
    PROJECT_CREATED = "project_created"
    PROJECT_SHIPPED = "project_shipped"
    COLLABORATION_CONFIRMED = "collaboration_confirmed"
    TRIBE_CREATED = "tribe_created"
    MEMBER_JOINED_TRIBE = "member_joined_tribe"
    BUILDER_JOINED = "builder_joined"
```

### `models/user.py` — User + RefreshToken + UserSkill

**User table columns:**
- `id` String(26) PK ULID
- `email` String(255) unique indexed
- `password_hash` String(255) nullable
- `username` String(50) unique indexed
- `display_name` String(100)
- `avatar_url` String(500) nullable
- `headline` String(200) nullable
- `primary_role` Enum(UserRole) nullable
- `timezone` String(50) nullable
- `availability_status` Enum(AvailabilityStatus) default JUST_BROWSING
- `builder_score` Float default 0.0
- `bio` Text nullable
- `contact_links` JSONB default {}
- `github_username` String(100) nullable unique
- `github_access_token_encrypted` String(500) nullable
- `onboarding_completed` Boolean default False
- `search_vector` TSVECTOR (GIN indexed)
- `embedding` Vector(1536) nullable (HNSW indexed, cosine)
- `created_at`, `updated_at` via TimestampMixin

**Relationships:**
- `skills` → many-to-many via `user_skills`
- `projects` → one-to-many
- `collaborations` → one-to-many via `project_collaborators`
- `tribes` → many-to-many via `tribe_members`
- `refresh_tokens` → one-to-many

**Indexes:**
- GIN on `search_vector`
- HNSW on `embedding` (vector_cosine_ops)
- Composite on `(primary_role, availability_status)`

**RefreshToken table:**
- `id` String(26) PK
- `user_id` FK → users.id CASCADE indexed
- `token_hash` String(64) unique
- `expires_at` DateTime(tz)
- `revoked_at` DateTime(tz) nullable
- `created_at` DateTime(tz)

**UserSkill junction:**
- `user_id` FK → users.id CASCADE (composite PK)
- `skill_id` FK → skills.id CASCADE (composite PK)
- `added_at` DateTime(tz)

### `models/skill.py` — Skill

- `id` String(26) PK
- `name` String(100) unique
- `slug` String(100) unique indexed
- `category` Enum(SkillCategory)

### `models/project.py` — Project + ProjectCollaborator

**Project table:**
- `id` String(26) PK
- `owner_id` FK → users.id CASCADE indexed
- `title` String(200)
- `description` Text nullable
- `status` Enum(ProjectStatus) default IN_PROGRESS
- `role` String(100) nullable
- `thumbnail_url` String(500) nullable
- `links` JSONB default {}
- `tech_stack` JSONB default []
- `impact_metrics` JSONB default {}
- `github_repo_full_name` String(200) nullable unique
- `github_stars` Integer nullable
- `search_vector` TSVECTOR (GIN indexed)
- `embedding` Vector(1536) nullable (HNSW indexed)
- `created_at`, `updated_at`

**Relationships:**
- `owner` → User
- `collaborators` → many-to-many via `project_collaborators`

**ProjectCollaborator junction:**
- `project_id` FK → projects.id CASCADE (composite PK)
- `user_id` FK → users.id CASCADE (composite PK)
- `role` String(100) nullable
- `status` Enum(CollaboratorStatus) default PENDING
- `invited_at` DateTime(tz)
- `confirmed_at` DateTime(tz) nullable

### `models/tribe.py` — Tribe + TribeMember + TribeOpenRole

**Tribe table:**
- `id` String(26) PK
- `owner_id` FK → users.id CASCADE indexed
- `name` String(100)
- `mission` Text nullable
- `status` Enum(TribeStatus) default OPEN
- `max_members` Integer default 8
- `search_vector` TSVECTOR (GIN indexed)
- `created_at`, `updated_at`

**TribeMember junction:**
- `tribe_id` FK → tribes.id CASCADE (composite PK)
- `user_id` FK → users.id CASCADE (composite PK)
- `role` Enum(MemberRole) default MEMBER
- `status` Enum(MemberStatus) default PENDING
- `joined_at` DateTime(tz) nullable
- `requested_at` DateTime(tz)

**TribeOpenRole table:**
- `id` String(26) PK
- `tribe_id` FK → tribes.id CASCADE indexed
- `title` String(100)
- `skills_needed` JSONB default []
- `filled` Boolean default False
- `filled_by` FK → users.id nullable

### `models/feed_event.py` — FeedEvent

- `id` String(26) PK ULID (time-ordered)
- `event_type` Enum(EventType)
- `actor_id` FK → users.id CASCADE
- `target_type` String(20)
- `target_id` String(26)
- `metadata` JSONB default {}
- `created_at` DateTime(tz)

**Indexes:**
- `(created_at)` descending
- `(event_type, created_at)`
- `(actor_id)`

## 4. Alembic Setup (Async)

### `alembic.ini`

- `sqlalchemy.url` = use env var `DATABASE_URL`
- `script_location` = `migrations`

### `migrations/env.py`

- Use async engine from `app.db.engine`
- Import `app.models` to register all models with metadata
- `target_metadata = Base.metadata`
- Use `run_async_migrations()` pattern from Alembic async template
- Register pgvector extension in migration context

### Generate initial migration

After models are defined, generate the first migration:
```bash
cd src/backend && alembic revision --autogenerate -m "initial schema"
```

This should create all tables, enums, indexes, and the pgvector extension.

## 5. Strawberry GraphQL Schema

### `graphql/context.py`

```python
@dataclasses.dataclass
class Context:
    session: AsyncSession
    current_user_id: str | None = None  # Stub — auth fills this later
```

Context factory that injects an async session from the request.

### `graphql/types/`

Define Strawberry types mirroring each model. For the scaffold, these are read-only types — no input types yet (those come with feature mutations).

**UserType fields:** id, email, username, display_name, avatar_url, headline, primary_role, timezone, availability_status, builder_score, bio, contact_links, github_username, onboarding_completed, created_at
- Lazy fields (resolver): skills → [SkillType], projects → [ProjectType], tribes → [TribeType]

**SkillType fields:** id, name, slug, category

**ProjectType fields:** id, title, description, status, role, thumbnail_url, links, tech_stack, impact_metrics, github_repo_full_name, github_stars, created_at, updated_at
- Lazy fields: owner → UserType, collaborators → [CollaboratorType]

**CollaboratorType fields:** user → UserType, role, status, invited_at, confirmed_at

**TribeType fields:** id, name, mission, status, max_members, created_at, updated_at
- Lazy fields: owner → UserType, members → [TribeMemberType], open_roles → [OpenRoleType]

**TribeMemberType fields:** user → UserType, role, status, joined_at

**OpenRoleType fields:** id, title, skills_needed, filled

**FeedEventType fields:** id, event_type, target_type, target_id, metadata, created_at
- Lazy fields: actor → UserType

### `graphql/queries/health.py`

```python
@strawberry.type
class Query:
    @strawberry.field
    async def health(self, info: strawberry.types.Info) -> str:
        # Verify DB connectivity
        session = info.context.session
        await session.execute(text("SELECT 1"))
        return "ok"
```

### `graphql/schema.py`

Combine Query (just health for now) + empty Mutation stub. Mount as Strawberry schema.

### `app/main.py`

```python
app = FastAPI(title="Find Your Tribe API")
schema = strawberry.Schema(query=Query)
graphql_app = GraphQLRouter(schema, context_getter=get_context)
app.include_router(graphql_app, prefix="/graphql")
```

Add CORS middleware allowing `localhost:3000`.

## 6. Seed Data

Seed files populate the database with realistic data matching the prototype landing page. Each file exports an async `seed_*()` function.

Run all seeds: `python -m app.seed.run`

### `seed/skills.py` — 80+ skills across 8 categories

```
ENGINEERING: Python, JavaScript, TypeScript, React, Next.js, Node.js, Go, Rust, PostgreSQL, FastAPI, GraphQL, Docker, Kubernetes, AWS, gRPC, Redis, ...
DESIGN: Figma, UI/UX, Prototyping, Design Systems, User Research, Interaction Design, Visual Design, Motion Design, ...
PRODUCT: Product Strategy, Roadmapping, User Stories, Analytics, A/B Testing, ...
MARKETING: Content Strategy, SEO, Social Media, Brand Design, Copywriting, ...
GROWTH: Growth Hacking, Paid Acquisition, Partnerships, Community Building, Funnel Optimization, ...
DATA: Machine Learning, Data Engineering, Analytics, SQL, Python (Data), Visualization, ...
OPERATIONS: Project Management, Agile, DevOps, CI/CD, Technical Writing, ...
OTHER: Public Speaking, Fundraising, Legal, Recruiting, ...
```

### `seed/users.py` — 10 builders from prototype

Match the landing page mock data exactly:

1. **Maya Chen** — Full-Stack Developer, score 72, skills: React, Python, PostgreSQL, FastAPI. Open to collaborate.
2. **James Okafor** — Product Designer, score 58, skills: Figma, UI/UX, Prototyping. Collaborating.
3. **Priya Sharma** — Backend Engineer, score 65, skills: Go, Kubernetes, gRPC. Open to collaborate.
4. **David Morales** — Growth Marketer, score 45, skills: SEO, Analytics, Content Strategy. Available for projects.
5. **Sarah Kim** — ML Engineer, score 71, skills: Python, TensorFlow, Data Engineering. Open to collaborate.
6. **Alex Rivera** — Frontend Developer, score 38, skills: React, TypeScript, Next.js. Just browsing.
7. **Elena Volkov** — Product Manager, score 52, skills: Roadmapping, Analytics, User Stories.
8. **Marcus Johnson** — DevOps Engineer, score 61, skills: Docker, Kubernetes, AWS, CI/CD.
9. **Aisha Patel** — UX Researcher, score 44, skills: User Research, Prototyping, Analytics.
10. **Tom Nakamura** — Founder/Engineer, score 68, skills: Python, React, PostgreSQL, AWS.

Each user gets: username, display_name, email (fake), headline, bio, primary_role, availability_status, builder_score, contact_links (twitter, github_username).

### `seed/projects.py` — 6 projects from prototype

1. **AI Resume Builder** — Maya Chen, SHIPPED, tech: React, Python, OpenAI, PostgreSQL. 1.2k users, 340 stars.
2. **Tribe Finder** — Maya Chen + Priya Sharma collab, IN_PROGRESS, tech: Next.js, Go, PostgreSQL.
3. **Open Source CRM** — David Morales, IN_PROGRESS, tech: React, Node.js, PostgreSQL. 89 stars.
4. **Design System Kit** — James Okafor, SHIPPED, tech: Figma, React, Storybook. 520 stars.
5. **ML Pipeline Framework** — Sarah Kim, SHIPPED, tech: Python, TensorFlow, Docker. 2.1k stars.
6. **Growth Analytics Dashboard** — David Morales + Elena Volkov collab, IN_PROGRESS, tech: Next.js, Python, Grafana.

Include collaborator records with CONFIRMED status for collabs.

### `seed/tribes.py` — 3 tribes from prototype

1. **Hospitality OS** — Tom Nakamura (owner), Maya Chen + James Okafor (members). OPEN. Mission: "Building the operating system for independent hotels." Open roles: Backend Engineer (Go, PostgreSQL), Growth Marketer (SEO, Partnerships).
2. **AI for Education** — Sarah Kim (owner), Alex Rivera (member). OPEN. Mission: "Making personalized learning accessible to every student." Open roles: Product Designer (Figma, User Research).
3. **Creator Economy Tools** — Elena Volkov (owner), Marcus Johnson (member). ACTIVE. Mission: "Empowering independent creators with better business tools."

### `seed/feed_events.py` — 15 events matching prototype feed

In reverse chronological order:
1. Maya shipped AI Resume Builder (PROJECT_SHIPPED)
2. Priya formed "Hospitality OS" tribe (TRIBE_CREATED) — *note: use actual tribe*
3. Alex started building a project (PROJECT_CREATED)
4. James joined Hospitality OS (MEMBER_JOINED_TRIBE)
5. Sarah shipped ML Pipeline Framework (PROJECT_SHIPPED)
6. David created Growth Analytics Dashboard (PROJECT_CREATED)
7. Elena and David confirmed collaboration (COLLABORATION_CONFIRMED)
8. Tom created Hospitality OS tribe (TRIBE_CREATED)
9. Marcus joined Creator Economy Tools (MEMBER_JOINED_TRIBE)
10. Maya created Tribe Finder project (PROJECT_CREATED)
11. Priya confirmed collaboration on Tribe Finder (COLLABORATION_CONFIRMED)
12. Sarah created AI for Education tribe (TRIBE_CREATED)
13. Alex joined as builder (BUILDER_JOINED)
14. James shipped Design System Kit (PROJECT_SHIPPED)
15. Aisha joined as builder (BUILDER_JOINED)

Each event has correct `actor_id`, `target_type`, `target_id`, and `metadata` (project titles, tribe names, collaborator names, tech stacks).

### `seed/run.py`

```python
async def main():
    """Seed the database. Idempotent — clears and re-seeds."""
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)
        await conn.run_sync(Base.metadata.create_all)

    async with async_sessionmaker() as session:
        await seed_skills(session)
        await seed_users(session)
        await seed_projects(session)
        await seed_tribes(session)
        await seed_feed_events(session)
        await session.commit()

    print("Seeded successfully.")

if __name__ == "__main__":
    asyncio.run(main())
```

## 7. Docker Compose (Local Dev)

```yaml
services:
  db:
    image: pgvector/pgvector:pg16
    environment:
      POSTGRES_USER: tribe
      POSTGRES_PASSWORD: tribe
      POSTGRES_DB: tribe
    ports:
      - "5432:5432"
    volumes:
      - pgdata:/var/lib/postgresql/data

volumes:
  pgdata:
```

## 8. Tests

### `tests/conftest.py`

- Create a test database (or use same DB with transaction rollback)
- Async engine + session fixtures via `pytest-asyncio`
- `httpx.AsyncClient` fixture pointed at the FastAPI app
- Seed test data fixture

### `tests/test_health.py`

```python
async def test_health_query(client):
    response = await client.post("/graphql", json={
        "query": "{ health }"
    })
    assert response.status_code == 200
    assert response.json()["data"]["health"] == "ok"
```

## 9. Quality Gates

Add to CLAUDE.md:

```
- lint: cd src/backend && ruff check .
- typecheck: cd src/backend && ruff check . --select=E,W
- test: cd src/backend && python -m pytest
```

## 10. Acceptance Criteria

- [ ] `docker compose up -d` starts PostgreSQL with pgvector
- [ ] `cd src/backend && alembic upgrade head` creates all tables
- [ ] `cd src/backend && python -m app.seed.run` populates DB with seed data
- [ ] `cd src/backend && uvicorn app.main:app` starts the API server
- [ ] `curl localhost:8000/graphql` returns GraphQL Playground
- [ ] Health query `{ health }` returns `"ok"`
- [ ] All SQLAlchemy models define correct columns, types, relationships, indexes
- [ ] All enums defined and used in models
- [ ] pgvector Vector(1536) columns on users and projects with HNSW indexes
- [ ] TSVECTOR columns on users, projects, tribes with GIN indexes
- [ ] Seed data matches prototype landing page exactly (names, scores, tech stacks)
- [ ] `python -m pytest` passes
- [ ] `ruff check .` passes with 0 errors
