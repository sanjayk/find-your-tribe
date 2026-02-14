# Find Your Tribe — Backend

> A GraphQL API built with FastAPI, Strawberry, and PostgreSQL with pgvector.

## Quick Start

Follow these steps to set up the backend development environment:

### 1. Start PostgreSQL

Start the PostgreSQL database with pgvector extension using Docker Compose:

```bash
docker compose up -d
```

This starts PostgreSQL 16 with pgvector on `localhost:5432` with credentials:
- **Database:** `tribe`
- **User:** `tribe`
- **Password:** `tribe`

### 2. Install Dependencies

Install the package and development dependencies:

```bash
pip install -e '.[dev]'
```

This installs:
- **Production dependencies:** FastAPI, Strawberry GraphQL, SQLAlchemy 2.0 (async), asyncpg, Alembic, pgvector, python-ulid, pydantic-settings, uvicorn
- **Dev dependencies:** pytest, pytest-asyncio, httpx, ruff

### 3. Run Migrations

Create all database tables and indexes:

```bash
alembic upgrade head
```

This applies all Alembic migrations to create the database schema including:
- Users, Skills, Projects, Tribes, Feed Events tables
- Many-to-many relationship tables
- pgvector Vector(1536) columns with HNSW indexes
- TSVECTOR columns with GIN indexes for full-text search

### 4. Seed Database

Populate the database with seed data:

```bash
python -m app.seed.run
```

This seeds:
- 80+ skills across 8 categories
- 10 builders with profiles matching the prototype
- 6 projects with tech stacks and collaborators
- 3 tribes with members and open roles
- 15 feed events (project shipped, tribe created, member joined, etc.)

**Note:** This command is idempotent — it drops and recreates all tables before seeding.

### 5. Start Server

Start the FastAPI development server:

```bash
uvicorn app.main:app --reload
```

The API server starts on `http://localhost:8000`

### 6. Access GraphQL Playground

Open your browser to:

```
http://localhost:8000/graphql
```

This opens the interactive GraphQL Playground where you can explore the schema and run queries.

### 7. Test the Health Query

In the GraphQL Playground, run:

```graphql
{
  health
}
```

Expected response:
```json
{
  "data": {
    "health": "ok"
  }
}
```

## Development Workflow

### Run Tests

Execute all tests with pytest:

```bash
python -m pytest
```

Tests include:
- Health query integration test
- Model tests for all entities
- Seed data validation tests
- Database fixture tests

### Run Linter

Check code quality with ruff:

```bash
ruff check .
```

All code must pass linting with 0 errors before committing.

## Architecture

### Tech Stack
- **Language:** Python 3.12+
- **Framework:** FastAPI (async)
- **GraphQL:** Strawberry with FastAPI integration
- **ORM:** SQLAlchemy 2.0 async (asyncpg driver)
- **Migrations:** Alembic (async template)
- **Database:** PostgreSQL 16 + pgvector
- **IDs:** ULID via python-ulid

### Project Structure

```
src/backend/
├── alembic.ini             # Alembic configuration
├── docker-compose.yml      # PostgreSQL 16 + pgvector
├── pytest.ini              # Pytest configuration
├── migrations/             # Alembic migrations
│   ├── env.py              # Async environment
│   └── versions/           # Migration files
├── app/
│   ├── config.py           # Pydantic settings
│   ├── main.py             # FastAPI app + GraphQL mount
│   ├── db/
│   │   ├── base.py         # DeclarativeBase + mixins
│   │   └── engine.py       # Async engine + sessionmaker
│   ├── models/             # SQLAlchemy models
│   │   ├── user.py
│   │   ├── skill.py
│   │   ├── project.py
│   │   ├── tribe.py
│   │   └── feed_event.py
│   ├── graphql/
│   │   ├── schema.py       # Root Query + schema
│   │   ├── context.py      # GraphQL context
│   │   ├── types/          # Strawberry types
│   │   ├── queries/        # Query resolvers
│   │   └── mutations/      # Mutation resolvers (empty)
│   └── seed/               # Seed data scripts
│       ├── run.py          # Main seed runner
│       ├── skills.py
│       ├── users.py
│       ├── projects.py
│       ├── tribes.py
│       └── feed_events.py
└── tests/                  # Test suite
    ├── conftest.py         # Pytest fixtures
    └── test_*.py           # Test modules
```

### Database Schema

**Core Models:**
- **User:** Builder profiles with skills, availability, bio, builder score
- **Skill:** Skill taxonomy with categories
- **Project:** Projects with status, tech stack, links, impact metrics
- **Tribe:** Teams with status, mission, members, open roles
- **FeedEvent:** Activity feed with actor, target, metadata

**Features:**
- ULID primary keys (26-character strings, sortable by time)
- Timestamps on all entities (created_at, updated_at)
- pgvector embeddings for semantic search
- TSVECTOR columns for full-text search with GIN indexes
- Many-to-many relationships (user skills, project collaborators, tribe members)

## Configuration

Environment variables are loaded via Pydantic Settings from `.env` file:

```bash
DATABASE_URL=postgresql+asyncpg://tribe:tribe@localhost:5432/tribe
ENVIRONMENT=development
DEBUG=true
```

Default values are provided in `app/config.py` for local development.

## Troubleshooting

### Database Connection Errors

If you see database connection errors:

```bash
# Check if PostgreSQL is running
docker compose ps

# View PostgreSQL logs
docker compose logs db

# Restart database
docker compose restart db
```

### Migration Errors

If migrations fail:

```bash
# Check current migration version
alembic current

# View migration history
alembic history

# Downgrade and re-upgrade
alembic downgrade base
alembic upgrade head
```

### Seed Data Issues

If seeding fails partway through:

```bash
# Re-run the seed script (it drops and recreates tables)
python -m app.seed.run
```

The seed script is idempotent and safe to run multiple times.

## Quality Gates

Before committing code, ensure:

1. **Linting passes:** `ruff check .` → 0 errors
2. **Tests pass:** `python -m pytest` → all tests green
3. **Server starts:** `uvicorn app.main:app` → no errors
4. **Health query works:** `{ health }` → returns `"ok"`

**Note:** Tests require PostgreSQL to be running via `docker compose up -d`.
