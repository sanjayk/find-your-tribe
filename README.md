# Find Your Tribe

The best companies of the next decade will be built by small teams wielding AI. This is the network they start from.

LinkedIn optimized for performative credentialism. Find Your Tribe optimizes for proof of work. Your profile is your portfolio. Your reputation is earned through shipped projects, verified collaborations, and token burn -- the universal, discipline-agnostic measure of AI-era building. No endorsements. No thought leadership posts. Just what you've built and who you built it with.

## Architecture

| Layer | Stack |
|-------|-------|
| **Frontend** | Next.js 16, React 19, Tailwind CSS 4, Apollo Client 4 |
| **Backend** | Python 3.12+, FastAPI, Strawberry GraphQL (async) |
| **Database** | PostgreSQL 16 + pgvector |
| **ORM** | SQLAlchemy 2.0 async, Alembic migrations |

## Getting Started

### Prerequisites

- Node.js 20+
- Python 3.12+
- Docker (for PostgreSQL)

### 1. Start the database

```bash
docker compose up -d
```

### 2. Set up the backend

```bash
cd src/backend
pip install -e '.[dev]'
alembic upgrade head
python -m app.seed.run
uvicorn app.main:app --reload
```

The GraphQL playground is at `http://localhost:8000/graphql`.

### 3. Set up the frontend

```bash
cd src/frontend
npm install
npm run dev
```

The app is at `http://localhost:3000`.

## Development

### Quality gates

```bash
# Frontend
cd src/frontend
npx eslint .          # lint
npx tsc --noEmit      # typecheck
npx vitest run        # test

# Backend
cd src/backend
ruff check .          # lint
python -m pytest      # test (requires PostgreSQL running)
```

### Project structure

```
src/
  frontend/           # Next.js app
    src/
      app/            # Pages (App Router)
      components/     # ui/, layout/, features/
      lib/graphql/    # Apollo queries, mutations, types
  backend/            # FastAPI + Strawberry GraphQL
    app/
      models/         # SQLAlchemy models
      graphql/        # Types, queries, mutations
      services/       # Business logic
      seed/           # Seed data
    migrations/       # Alembic
    tests/
specs/                # Product specs and design system docs
```

## License

[MIT](LICENSE)
