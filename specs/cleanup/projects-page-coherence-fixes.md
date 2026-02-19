# Projects Page — Coherence Fixes

Fixes identified by the coherence checker after the initial projects-page implementation.

## Context

The projects listing page (`src/frontend/src/app/projects/page.tsx`) was implemented in the previous swarm run. The coherence checker identified three issues that need to be resolved.

## Feature 1: Add Link Wrapper to Project Cards

**Problem:** `ProjectCard` is rendered bare with no wrapping `<Link>` element. Users cannot click a card to navigate to the project detail page. The route `/project/[id]` exists and is functional, but is unreachable from the listing page.

**Fix:** In `src/frontend/src/app/projects/page.tsx`, in the `ProjectGrid` component, wrap each `<ProjectCard>` in `<Link href={`/project/${project.id}`}>` from `next/link`.

**Files:**
- `src/frontend/src/app/projects/page.tsx` — add `import Link from 'next/link'` and wrap each ProjectCard
- `src/frontend/src/app/projects/page.test.tsx` — add mock for `next/link` and test asserting links exist with correct hrefs

**Acceptance criteria:**
- Each project card in the grid is wrapped in a `<Link href="/project/${project.id}">`
- Test verifies links exist with correct href attributes
- All existing tests continue to pass

## Feature 2: Fix ARCHIVED Status Mapping

**Problem:** `mapStatus()` only checks `status === 'SHIPPED'` and falls through to `'in-progress'` for everything else. This means `ARCHIVED` projects display with the "Building" badge instead of "Shipped".

**Fix:** In `src/frontend/src/app/projects/page.tsx`, change `mapStatus` to: `if (status === 'IN_PROGRESS') return 'in-progress'; return 'shipped';` — this correctly maps both SHIPPED and ARCHIVED to 'shipped'.

**Files:**
- `src/frontend/src/app/projects/page.tsx` — fix mapStatus function

**Acceptance criteria:**
- `mapStatus('SHIPPED')` returns `'shipped'`
- `mapStatus('ARCHIVED')` returns `'shipped'`
- `mapStatus('IN_PROGRESS')` returns `'in-progress'`

## Feature 3: Fix Layout Metadata Description

**Problem:** `layout.tsx` metadata description says "Explore projects from your tribe and discover what they are shipping." but the spec requires "Browse shipped and in-progress projects from the builder community."

**Fix:** Update the description string in `src/frontend/src/app/projects/layout.tsx`.

**Files:**
- `src/frontend/src/app/projects/layout.tsx` — update description

**Acceptance criteria:**
- Metadata description exactly matches: "Browse shipped and in-progress projects from the builder community."

## Quality Gates

- `cd src/frontend && npx tsc --noEmit` — zero type errors
- `cd src/frontend && npx eslint .` — zero lint errors
- `cd src/frontend && npx vitest run` — all tests pass
