# Project: find-your-tribe

> A social network where clout comes from shipping. Connect your GitHub, form a tribe, and let your work speak.

## Rules

- **When instructions are provided, follow them.** Do not substitute your own ideas for what was explicitly asked.
- **Re-read CLAUDE.md every 5 turns** to stay grounded in project conventions and instructions.
- **No lazy design.** Every design decision must be intentional. No generic layouts, no reshuffling the same elements into slightly different boxes and calling them "options." Each option presented must be genuinely distinct with real thought behind it.
- **No AI slop.** Output must be thoughtful, specific, and earned. If you can't articulate why a design choice is better than an alternative, you haven't done the work.
- **Follow the design system.** All design work must use the tokens defined in `globals.css` — colors, fonts, spacing. No inventing new values. The aesthetic is "Modern Editorial Luxury" — read the global CLAUDE.md spec.
- **Prototype before code.** Any visual/layout change must be discussed and approved before writing code. Work with the user to get the design right first. Present prototypes (ASCII, descriptions, or HTML mockups) and iterate until approved.
- **Design for the common case.** Most data will be sparse. Design for minimal data looking complete, not maximum data looking full. A card with just a title and description must look intentional, not empty.
- **Earn every element.** Every data point, every UI element, every visual flourish must have a reason tied to the user's goal. "Because we have the data" is not a reason.

## Architecture

- **Language:** TypeScript (strict mode)
- **Framework:** Next.js 16 (App Router, Turbopack)
- **UI Components:** shadcn/ui (Radix primitives) for interactive primitives, custom for product-specific
- **Styling:** Tailwind CSS v4 with design tokens in CSS via `@theme` directive
- **GraphQL:** Apollo Client 4 (provider setup, no actual queries yet)
- **Backend:** Python 3.12+, FastAPI, Strawberry GraphQL (async)
- **ORM:** SQLAlchemy 2.0 async (asyncpg driver)
- **Migrations:** Alembic (async template)
- **Database:** PostgreSQL 16 + pgvector
- **IDs:** ULID via python-ulid
- **Frontend working directory:** `src/frontend/`
- **Backend working directory:** `src/backend/`

## Conventions

### File Organization
- Frontend source code lives in `src/frontend/`
- Components: `src/frontend/components/` — `ui/`, `layout/`, `features/`
- Hooks: `src/frontend/hooks/`
- GraphQL: `src/frontend/lib/graphql/`
- Backend source code lives in `src/backend/`
- Models: `src/backend/app/models/`
- GraphQL types: `src/backend/app/graphql/types/`
- GraphQL queries: `src/backend/app/graphql/queries/`
- GraphQL mutations: `src/backend/app/graphql/mutations/`
- Seed data: `src/backend/app/seed/`
- Tests co-located or in `tests/` directory
- One module per file, named descriptively

### Naming
- Frontend files: `kebab-case` (e.g., `builder-card.tsx`, `use-auth.ts`)
- Backend files: `snake_case` (e.g., `feed_event.py`, `user.py`)
- Components: `PascalCase` (e.g., `BuilderCard`, `ProjectCard`)
- Hooks: `use` prefix (e.g., `useAuth`, `useBuilderScore`)
- Functions: `camelCase` (JS/TS), `snake_case` (Python)
- Classes: `PascalCase` (both)
- Constants: `UPPER_SNAKE_CASE`
- Route directories: `kebab-case` or Next.js conventions (`[id]`, `(auth)`)

### Code Style
- Prefer explicit over implicit
- Handle errors at the call site
- No magic numbers — use named constants
- Keep functions under 30 lines where possible
- Use `"use client"` directive only when component needs client-side interactivity
- Prefer Server Components by default
- Dynamic route `params` and `searchParams` are async — always `await` them

### Git
- Branch naming: `tribe/task-{id}-{slug}`
- Commit messages: imperative mood, under 72 chars
- One logical change per commit

## Quality Gates

### Frontend
- lint: `cd src/frontend && npx eslint .`
- typecheck: `cd src/frontend && npx tsc --noEmit`
- test: `cd src/frontend && npx vitest run`

### Backend
- lint: `cd src/backend && ruff check .`
- test: `cd src/backend && python -m pytest`

**Note:** Backend tests require PostgreSQL running via docker-compose.

## Testing — TDD Practices

Follow Test-Driven Development:
1. **Write the test first** — before implementing any component or utility
2. **Red** — verify the test fails (component/function doesn't exist yet)
3. **Green** — write the minimum code to make the test pass
4. **Refactor** — clean up while keeping tests green

### Test Stack
- **Framework:** Vitest 4
- **Component testing:** @testing-library/react + @testing-library/jest-dom
- **Setup:** `src/frontend/vitest.config.ts` + `src/frontend/src/test/setup.ts`

### Test Conventions
- Co-locate tests: `component.tsx` → `component.test.tsx` (same directory)
- Test file naming: `{module-name}.test.tsx` or `{module-name}.test.ts`
- Describe blocks mirror component/function names
- Test what the user sees, not implementation details
- Every component must have at least: renders without crashing, renders correct content, variant/prop switching
- Every utility function must have at least: happy path, edge cases

## Design System

Ported from `src/prototype/index.html`. Design tokens defined via Tailwind v4 `@theme` directive in `globals.css`.

### Colors
- `surface-*`: primary (#f9f8f6), secondary (#f2f0ed), elevated (#ffffff), inverse (#1c1917)
- `ink-*`: DEFAULT (#1c1917), secondary (#57534e), tertiary (#a8a29e), inverse (#fafaf9)
- `accent-*`: DEFAULT (#6366f1), hover (#4f46e5), subtle (#eef2ff), muted (#a5b4fc)
- `shipped-*`: DEFAULT (#16a34a), subtle (#f0fdf4)
- `in-progress-*`: DEFAULT (#d97706), subtle (#fffbeb)

### Fonts
- `font-serif`: "DM Serif Display" — display/headlines
- `font-sans`: "DM Sans" 400/500/600 — body/UI
- `font-mono`: "IBM Plex Mono" 400/500 — code/technical

### Aesthetic
Modern Editorial Luxury — warm sophistication, editorial typography, restrained minimalism. No borders — use color, depth, and spacing. No flashy gradients or aggressive CTAs. Like a travel publication for people who read Kinfolk.

## Patterns

- All shadcn/ui components live in `src/frontend/components/ui/`
- Product-specific components (BuilderCard, ProjectCard, etc.) live in `src/frontend/components/features/`
- Layout components (Nav, Footer) live in `src/frontend/components/layout/`
- Apollo Client config in `src/frontend/lib/graphql/client.ts`
- Apollo Provider wraps app in root layout
- Tailwind design tokens defined via `@theme` in CSS (no `tailwind.config.ts`)

## Dependencies

### Frontend (latest versions)
- next 16.x
- react, react-dom 19.x
- tailwindcss 4.x
- @radix-ui/* (via shadcn/ui)
- @apollo/client 4.x, graphql
- lucide-react (icons)
- class-variance-authority, clsx, tailwind-merge (shadcn utils)
- next/font (Google Fonts loading)
- vitest 4.x, @testing-library/react, @testing-library/jest-dom, @testing-library/user-event (testing)
- jsdom (test environment)
- eslint, @next/eslint-plugin-next (linting — `next lint` removed in Next.js 16)

### Backend
- fastapi[standard]
- strawberry-graphql[fastapi]
- sqlalchemy[asyncio] >=2.0
- asyncpg
- alembic
- pgvector
- python-ulid
- pydantic-settings
- uvicorn[standard]
- pytest, pytest-asyncio, httpx (testing)
- ruff (linting)
