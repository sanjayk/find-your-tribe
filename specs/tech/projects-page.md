# Product Specification: Projects Listing Page

## Overview

Add a `/projects` route that displays a paginated grid of all projects in the community. The nav already links to `/projects` for logged-in users but the route returns a 404. This spec also addresses a backend bug where `UserType` constructors in `project.py` and `tribe.py` manually spell out fields instead of using `UserType.from_model()`, causing crashes when new fields are added to `UserType`.

## Goals

- Provide a browsable listing of shipped and in-progress projects
- Fix the backend `UserType` field-sync bug that crashes `/graphql` queries involving project owners or tribe members
- Follow existing patterns (discover page) for consistency

## Features

### Feature 1: Projects Listing Page

**Description:** A client-rendered page at `/projects` showing a responsive grid of project cards with pagination.

**User flow:** User clicks "Projects" in nav → sees a grid of project cards → clicks a card → navigates to `/project/{id}` detail page.

**Acceptance criteria:**
- [ ] `/projects` route exists and renders without error
- [ ] Page header: serif 40px "Projects" with secondary subtitle
- [ ] Uses `GET_PROJECTS` query from `src/frontend/src/lib/graphql/queries/projects.ts` with `limit: 12, offset: 0`
- [ ] Renders `ProjectCard` from `src/frontend/src/components/features/project-card.tsx` for each project
- [ ] Each card links to `/project/${project.id}` (singular, matching existing route at `src/frontend/src/app/project/[id]/`)
- [ ] Status mapping: `IN_PROGRESS` → `'in-progress'`, `SHIPPED` and `ARCHIVED` → `'shipped'`
- [ ] 3-column responsive grid: `grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6`
- [ ] Skeleton loader while data is fetching (animated pulse)
- [ ] Error state with "Something went wrong" message
- [ ] "Load more" button when results >= PAGE_SIZE, using `fetchMore` with offset pagination
- [ ] Layout file with metadata: title "Projects", description "Browse shipped and in-progress projects from the builder community."

**Files:**
- `src/frontend/src/app/projects/page.tsx` (create)
- `src/frontend/src/app/projects/layout.tsx` (create)
- `src/frontend/src/app/projects/page.test.tsx` (create)

**Pattern reference:** `src/frontend/src/app/discover/page.tsx` and `src/frontend/src/app/discover/layout.tsx`

### Feature 2: Backend UserType Constructor Refactor

**Description:** `ProjectType.from_model()` and `TribeType.from_model()` manually construct `UserType(...)` by spelling out every field. When `preferences` was added to `UserType`, these call sites were not updated, causing `TypeError: UserType.__init__() missing 1 required keyword-only argument: 'preferences'` on any query that loads project owners, collaborators, or tribe members.

**Root cause:** Manual field duplication across 4 call sites instead of delegating to `UserType.from_model()`.

**Acceptance criteria:**
- [ ] `ProjectType.from_model()` uses `UserType.from_model(owner)` instead of manual `UserType(id=owner.id, ...)` for owner
- [ ] `ProjectType.from_model()` uses `UserType.from_model(collab)` instead of manual `UserType(...)` for collaborators
- [ ] `TribeType.from_model()` uses `UserType.from_model(tribe.owner)` instead of manual `UserType(...)` for owner
- [ ] `TribeType.from_model()` uses `UserType.from_model(member)` instead of manual `UserType(...)` for members
- [ ] Zero manual `UserType()` constructors in any production (non-test) Python file
- [ ] No circular recursion: `UserType.from_model()` called without `projects`/`tribes`/`skills` args produces empty lists
- [ ] Test files updated: all manual `UserType()` calls in test files include `preferences={}` field
- [ ] `/profile/mayachen` loads without error
- [ ] `/projects` loads without error

**Files:**
- `src/backend/app/graphql/types/project.py` (modify)
- `src/backend/app/graphql/types/tribe.py` (modify)
- `src/backend/tests/test_project_types.py` (modify)
- `src/backend/tests/test_tribe_types.py` (modify)
- `src/backend/tests/test_types_auth.py` (modify)

## Technical Requirements

- Language: TypeScript (frontend), Python (backend)
- Framework: Next.js 16 App Router (frontend), FastAPI + Strawberry GraphQL (backend)
- Existing components and queries to reuse — no new dependencies

## Non-Functional Requirements

- Frontend typecheck passes: `cd src/frontend && npx tsc --noEmit`
- Frontend tests pass: `cd src/frontend && npx vitest run`
- Frontend lint has no new errors: `cd src/frontend && npx eslint .`
- Backend does not crash on queries involving project owners or tribe members

## Out of Scope

- Filtering or search on the projects page
- Sorting options
- Modifying `GET_PROJECTS` query fields
- Modifying `ProjectCard` component
- Backend test suite execution (requires running PostgreSQL)
