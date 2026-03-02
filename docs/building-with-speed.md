# Building a Feature with SPEED: A Walkthrough

This document follows the end-to-end process of building **F9: Profile Completeness** for Find Your Tribe using the SPEED orchestration framework. Each section corresponds to a pipeline stage, written as we go through it.

**Feature:** Profile Completeness — show builders how complete their profile is, which fields are missing, and nudge them to finish.

**Why this feature:** The Builder Score algorithm already penalizes sparse profiles (15 of 100 points come from completeness), but builders never see the penalty. The backend calculation exists in `score_service.py`. The frontend has zero UI for it. Closing this feedback loop is small, self-contained, and touches the full stack.

## How This Was Built

SPEED automates the middle of the pipeline: planning, parallel execution, code review, coherence checking, integration. Everything before and between those stages is a conversation between a human and a coding agent (Claude Code in this case).

The human decides what to build and runs the CLI commands. The agent explores the codebase, writes the specs, diagnoses failures, fixes blocking issues, and documents results. Neither works alone.

**What the human did:**
- Chose the feature constraints (small, complete, E2E)
- Rejected the agent's first suggestion after the agent discovered it was already built
- Ran every SPEED CLI command from their terminal
- Decided when to retry, when to reset, when to move to the next stage
- Directed spec revisions (add aesthetic constraints, make file impact more prescriptive)

**What the agent did:**
- Explored the codebase to find unbuilt features (checked 4 candidates, 3 were already implemented)
- Wrote all three specs (PRD, RFC, design) from the SPEED templates
- Investigated every pipeline failure: read logs, traced root causes, proposed fixes
- Fixed pre-existing test failures on `main` that blocked quality gates
- Wrote this walkthrough, updating it after each stage

**What SPEED did autonomously:**
- Guardian gate (product vision alignment check)
- Architect decomposition (spec → task DAG + contract)
- Plan verification (adversarial blind-check against actual codebase)
- Parallel developer agents on isolated branches
- Quality gates (lint, typecheck, test) after each task
- Code review against specs (not just task acceptance criteria)
- Coherence checking (cross-branch interface verification)
- Integration (dependency-ordered merge with regression tests)

The specs are the handoff point. The human and agent collaborate to get the specs right. Once `plan` runs, SPEED takes over. When something breaks, the human and agent collaborate again to diagnose and fix before handing back to SPEED.

---

## 0. Picking the Feature

Before touching SPEED, we needed a feature that fits three constraints:

1. **Small** — 3 tasks or fewer (realistically ended up at 7 after the Architect's decomposition)
2. **Complete** — not a fragment; delivers a full user-visible outcome
3. **E2E** — touches backend, API, and frontend so the walkthrough exercises the whole pipeline

We considered and rejected several candidates:

| Feature | Why rejected |
|---|---|
| Collaborator Invite Landing Page | Already fully built (backend + frontend + tests) |
| Pending Invitations Dashboard | Also already built — profile page section, nav dot, accept/decline actions |
| Tribe Open Roles Display | Already built on tribe detail page |
| Project Status Badges | Too small — pure frontend, no backend work |

**Profile Completeness** survived because:
- The backend function `calculate_profile_completeness()` exists but is private to `score_service.py`
- No GraphQL field exposes it
- No UI renders it anywhere
- The product spec for Builder Score (F7) references profile completeness but never specs how a builder sees or acts on it

---

## 1. Writing the Three Specs

SPEED uses a **three-spec model**. Every feature needs all three before the pipeline runs.

| Spec | Path | Answers |
|------|------|---------|
| Product (PRD) | `specs/product/f9-profile-completeness.md` | What does the user need? |
| Tech (RFC) | `specs/tech/f9-profile-completeness.md` | How is it built? |
| Design | `specs/design/f9-profile-completeness.md` | What does it look like? |

### Scaffolding

SPEED provides a `new` command that drops template files into the right directories:

```bash
./speed/speed new prd f9-profile-completeness
./speed/speed new rfc f9-profile-completeness
./speed/speed new design f9-profile-completeness
```

Each template is a markdown file with every required section pre-populated as a heading with comment guidance. The comments explain what each section is for, who reads it, and common mistakes. Filling in a template takes thought — the comments prevent the usual failure mode of skipping sections or writing vague acceptance criteria.

### What went into the specs

**PRD** — 4 user stories (PC-1 through PC-4), 3 user flows (settings page discovery, profile page nudge, already-complete state), explicit scope boundaries. The hardest part was the Out of Scope section: we explicitly excluded gamification, onboarding integration, email reminders, and visibility to other users, each with a reason.

**Tech RFC** — Starts with a Basic Example (a GraphQL query showing the two new fields in action). No new tables, no new mutations. Two computed fields on the existing `UserType`. The Key Decisions table forced us to justify why we compute instead of store, why we return strings instead of structured objects, and why we expose the field on all `UserType` instances instead of just the `me` query.

**Design Spec** — Three new components (`CompletenessRing`, `CompletenessSection`, `CompletenessNudge`), ASCII mockups for every state (0%, partial, 100%), data binding table mapping API fields to UI elements, field-label-to-scroll-target mapping, and all design tokens referencing `globals.css` values by name.

### Structural Audit

After writing the specs, we ran the SPEED audit:

```bash
./speed/speed audit specs/tech/f9-profile-completeness.md
```

Result:

```json
{
  "status": "pass",
  "issues": [],
  "estimated_tasks": 6,
  "sizing": {
    "recommendation": "ok"
  }
}
```

The audit checks structural completeness — are all required sections present? Are acceptance criteria defined? Does the tech spec reference the product spec? It estimated 6 tasks, which aligns with our expectation for a small feature.

---

## 2. Validate — Cross-Reference Specs

*Status: Skipped*

```bash
../speed/speed validate specs/
```

The Validator agent reads all specs in the `specs/` directory and checks for cross-spec consistency. We skipped this step because `plan` runs its own structural audit before the Architect proceeds. For a project with 9 feature specs across 3 directories, a full cross-validation is valuable. For a single new feature where the other 8 specs are stable, it's redundant with the audit that `plan` performs.

---

## 3. Plan — Decompose into Task DAG

*Status: Complete*

```bash
../speed/speed plan specs/tech/f9-profile-completeness.md --specs-dir specs/
```

The `plan` command runs three sub-stages sequentially: **Guardian gate → Audit → Architect**.

### 3a. Product Guardian Gate

Before the Architect touches the spec, the Product Guardian reads the product vision (`specs/product/overview.md`) and the feature specs, then makes a go/no-go call.

**Result: `flagged`** (not `pass`, not `fail` — flagged with items to resolve).

The Guardian found the feature mission-aligned and persona-grounded across all four personas (Maya, James, Priya, David). It correctly identified that profile completeness feeds the Activation KPI (70% profile completion rate, 3 months post-launch) and the Builder Score formula.

Two flags raised:

| Severity | Flag | Resolution |
|----------|------|------------|
| **Warning** | The tech RFC exposes `profileCompleteness` on all `UserType` instances with no auth gating, but the product spec explicitly says "completeness visible to other users" is out of scope because it "leaks private information and creates a judgment signal." The Guardian called this a product boundary being overridden by a tech decision without acknowledgment. | Must resolve before implementation: either add auth gating in the resolver or explicitly override the product spec with a documented decision. |
| **Note** | F9 is the first feature outside the F1-F8 index in `overview.md`. The spec index will drift if unindexed features accumulate. | Update the Feature Spec Index table. Low effort. |

The warning is a genuine catch. The tech spec argued the exposure is harmless because the underlying data (has bio? has avatar?) is already visible on the profile. The Guardian correctly noted that the *inference* ("33% complete") is different from the raw data ("no bio"), and the product spec treats them differently. This is the kind of conflict that compounds silently without a Guardian gate.

### 3b. Structural Audit

The audit ran automatically before the Architect. Same check as the standalone `audit` command we ran earlier. Passed with zero issues.

### 3c. Architect Decomposition

The Architect produced 7 tasks with a dependency DAG, a data model contract, and a validation report. All state is stored in `.speed/features/f9-profile-completeness/`.

**Task DAG:**

```
Task 1: Backend — Extract COMPLETENESS_FIELDS constant + add UserType resolvers  (no deps)
Task 2: Frontend — Update GraphQL types and queries          (no deps)
Task 3: Frontend — Create CompletenessRing component         (no deps)
Task 4: Frontend — Create CompletenessSection component      (→ 3)
Task 5: Frontend — Create CompletenessNudge component        (→ 3)
Task 6: Frontend — Integrate CompletenessSection into settings (→ 2, 4)
Task 7: Frontend — Integrate CompletenessNudge into profile   (→ 2, 5)
```

Compared to Run 1's 8-task plan, the Architect consolidated the two backend tasks into one. The dependency structure is similar: tasks 1, 2, and 3 run in the first wave, tasks 4 and 5 in the second, tasks 6 and 7 as leaf nodes.

**Data model contract:** 9 entities declared — the `COMPLETENESS_FIELDS` constant, two resolver functions, three component/test file pairs. Core question: "How complete is a builder's profile and which fields are missing?"

**Validation report (4 items):**

| Severity | Issue |
|----------|-------|
| Note | The tech spec says to inline boolean checks rather than calling `calculate_profile_completeness` directly, but also requires a shared `COMPLETENESS_FIELDS` constant. The plan resolves this by having Task 1 refactor the existing function to use the constant, and Task 2's resolver also uses it. |
| Warning | The design spec specifies a 48px mobile ring, but `CompletenessRing` only defines `sm` (16px) and `lg` (64px). Task 5 handles this via responsive CSS scaling rather than a third size variant. |
| Note | The settings page may use a different query than `GET_BUILDER`. Task 7 instructs the developer to inspect and adapt. |
| Note | PC-3 (real-time update) depends on `updateProfile` triggering a refetch. If the current implementation uses cache-only updates, the developer must add a refetch call. |

---

## 4. Verify — Blind-Check the Plan

*Status: Complete (Pass)*

```bash
../speed/speed verify
```

The Plan Verifier reads the product spec and the Architect's plan, then checks whether the plan actually delivers what the spec requires. It also reads the actual codebase to validate assumptions.

### What the Verifier Found

**Result: `PASS`** — all 15 spec requirements mapped to tasks with zero critical failures.

The verifier traced each product requirement to its implementing task:

| Requirement | Task(s) | Status |
|---|---|---|
| PC-1: Settings page percentage + visual indicator | 3, 4, 6 | Covered |
| PC-2: Missing fields with scroll-to links | 4, 6 | Covered |
| PC-3: Real-time update after save | 6 | Covered |
| PC-4: Profile page nudge for own incomplete profile | 5, 7 | Covered |
| 100% state: ring filled, "Complete" label, list hidden | 3, 4 | Covered |
| Inline badge hidden for visitors | 7 | Covered |
| No new mutations or queries | — | Covered |

Two non-critical recommendations:

| Type | Issue |
|------|-------|
| **Note** | The RFC's File Impact table references `page.test.tsx` for the profile page tests, but the task targets `profile-content.test.tsx` (testing the component, not the page wrapper). The task's choice is more precise but deviates from the RFC. |
| **Note** | The PRD says completeness is "private to the profile owner." The RFC deliberately exposes `profileCompleteness` on all `UserType` instances, arguing the underlying data is already public. The frontend gates display on `isOwnProfile`, but the API response reveals completeness for any queried user. |

The validation report also surfaced four advisory notes about query selection sets, settings page layout placement, the COMPLETENESS_FIELDS constant approach vs. inline duplication, and test file creation. All informational — no task patches required.

---

## 5. Run — Execute Tasks in Parallel

*Status: Complete*

```bash
../speed/speed run --max-parallel 3
```

Developer agents execute tasks on isolated git branches (git worktrees). Each agent gets its task description, acceptance criteria, the project's CLAUDE.md conventions, and codebase access. After implementation, quality gates (lint, typecheck, test) run automatically.

### Wave 1 (parallel: tasks 1, 2, 3)

Tasks 1, 2, and 3 have no dependencies, so SPEED launched all three simultaneously.

- **Task 1** (Backend: COMPLETENESS_FIELDS + resolvers): Extracted the constant, refactored `calculate_profile_completeness` to use it, added `_field_filled` helper with per-type evaluation logic, added `profile_completeness` and `missing_profile_fields` resolvers to `UserType`, wrote 5 tests. Quality gates: 30 backend tests pass, ruff clean.
- **Task 2** (Frontend: GraphQL types + query): Added `profileCompleteness` and `missingProfileFields` to the `Builder` TypeScript interface, updated `GET_BUILDER` query to request both fields, updated test fixtures across 5 files. Quality gates: 1140 frontend tests pass, no lint or type errors.
- **Task 3** (Frontend: CompletenessRing): SVG circular progress component with `sm` (16px) and `lg` (64px) size variants, checkmark icon at 100%, `aria-progressbar` attributes. Tests cover 0%, 50%, 100%, both sizes, accessibility.

### Wave 2 (parallel: tasks 4, 5)

Both depend only on Task 3 (done).

- **Task 4** (Frontend: CompletenessSection): Ring + checklist layout, 0% motivational copy vs. partial "N fields remaining," scroll-to-field links with `scrollIntoView` + delayed `focus()`. Tests for rendering, click handlers, 100% state.
- **Task 5** (Frontend: CompletenessNudge): Inline badge with small ring, "N% complete" with "Finish profile" link to `/settings`, returns `null` at `>= 100%`. Tests for visibility gating, link target, percentage display.

### Wave 3 (parallel: tasks 6, 7)

These are the leaf nodes — integration tasks that wire components into existing pages.

- **Task 6** (Frontend: Settings integration): Imported `CompletenessSection`, placed it above form sections, added `field-*` IDs to form inputs for scroll targeting, confirmed real-time update via existing refetch behavior. 13 new tests.
- **Task 7** (Frontend: Profile integration): Imported `CompletenessNudge`, rendered below availability badge gated on `isOwnProfile && completeness < 1.0`. 4 new tests.

All 7 tasks completed across three waves with a maximum concurrency of 3 agents. No failures, no retries needed during execution.

### Pre-requisite: Clean Test Suite

SPEED's quality gates are strict: any test failure = task failure, even if the failures pre-date the feature. Before running, we fixed two pre-existing test issues on `main`:

| File | Problem | Fix |
|------|---------|-----|
| `src/backend/tests/test_project_types.py` | 4 test cases missing `domains`, `ai_tools`, `build_style`, `services`, `_milestones` kwargs added by a prior feature | Added the 5 missing fields to all `ProjectType()` constructor calls |
| `src/frontend/src/components/layout/footer.test.tsx` | 3 tests asserting About/GitHub/Twitter links that were removed from the Footer component | Replaced with a copyright year test |

---

## 6. Review — Code Review Against Spec

*Status: Complete*

```bash
../speed/speed review
```

The Reviewer agent checks each completed task's git diff against the **product spec** (not just the task description). This catches scope drift — a task that passes its own acceptance criteria but violates a product requirement.

### Results

5 of 7 tasks approved. Two received `REQUEST_CHANGES`.

**Task 1 (Backend): Whitespace divergence.** The reviewer traced a subtle inconsistency: `calculate_profile_completeness` uses `bool(getattr(user, attr))` for all fields, while the new `_field_filled` helper applies three strategies (whitespace-trimming for strings, `is not None` for role, `isinstance` + `len` for contact_links). A headline of `"   "` returns `True` from `bool()` but `False` from `_field_filled`. The spec requires "no divergence" between the two implementations.

**Task 4 (CompletenessSection): Design token violation.** The hollow bullet character inherited `text-accent` from its parent button instead of using `text-ink-tertiary` as the design spec's token table requires. The reviewer also flagged a missing `focus()` assertion in the scroll-to-field test.

9 non-blocking nits across all tasks, including: unclamped `aria-valuenow`, no test for `completeness > 1.0`, verbose mock casts, and a placeholder `field-avatar` div where no avatar upload UI exists yet.

### Re-runs

SPEED reset both `request_changes` tasks to `pending` and re-ran them.

Task 1's developer addressed all feedback: moved `_field_filled` to `score_service.py`, updated `calculate_profile_completeness` to use it instead of `bool()`, added a whitespace-only string test to confirm both implementations agree. Two commits.

Task 4's developer fixed the hollow bullet color (`text-ink-tertiary`) and added the missing `focus()` assertion with `vi.advanceTimersByTime(300)`. One commit.

### Guardian Post-Review

The Product Guardian ran post-review alignment checks and confirmed the implementation rewards building identity infrastructure, not performance signaling. Completeness nudges push builders toward verifiable signals (role, bio, contact links), not engagement metrics. The nudge disappears at 100% — an anti-nag design that exits once it has served its purpose.

---

## 7. Coherence — Cross-Task Consistency

*Status: Complete (Pass)*

```bash
../speed/speed coherence
```

The Coherence Checker verifies that independently-developed branches compose correctly. It reads all task branches, traces imports and interfaces across them, and checks the Architect's data model contract.

### Contract Satisfaction

All contract items satisfied:

| Entity | Verification |
|--------|-------------|
| `COMPLETENESS_FIELDS` constant | Defined in `score_service.py` with 6 entries, consistency test asserts count and key set |
| `profile_completeness` resolver | `@strawberry.field` on UserType, iterates COMPLETENESS_FIELDS with `_field_filled` |
| `missing_profile_fields` resolver | Returns `list[str]` of API keys for unfilled fields |
| CompletenessRing | SVG component with `sm`/`lg` sizes, imported by both Section and Nudge |
| CompletenessSection | `FIELD_LABELS` and `FIELD_TARGETS` keys match the 6 API keys from COMPLETENESS_FIELDS |
| CompletenessNudge | Returns null at `completeness >= 1.0`, renders percentage and link otherwise |
| Settings integration | Imports CompletenessSection, passes correct props, adds `field-*` IDs, refetch on save |
| Profile integration | Imports CompletenessNudge, gated on `isOwnProfile && completeness < 1.0` |

### Cross-Branch Interface Tracing

The coherence checker traced the full data flow:

1. `COMPLETENESS_FIELDS` (Task 1) → imported by resolvers on `UserType` (no circular import)
2. Strawberry auto-converts `snake_case` → `camelCase`, matching the frontend's TypeScript types (Task 2)
3. CompletenessSection's `FIELD_TARGETS` map keys exactly match the `field-*` IDs Task 6 added to settings form inputs
4. CompletenessNudge receives the correct prop from Task 7's profile page integration
5. `GET_BUILDER` query (Task 2) requests both completeness fields, enabling real-time update after save

One minor finding: Task 7's test mock uses `completenessFields` instead of the canonical `missingProfileFields`. Harmless today (the profile page only passes `profileCompleteness` to CompletenessNudge), but the mock shape doesn't match the actual GraphQL response.

Zero interface mismatches. Zero duplicate implementations.

---

## 8. Integrate — Merge and Verify

*Status: Complete*

```bash
../speed/speed integrate
```

Five tasks (2, 3, 5, 6, 7) were merged to `main` during the coherence step. The Integrator merged the two remaining branches — Task 1 (re-run for whitespace fix) and Task 4 (re-run for bullet color fix) — running regression tests after each merge.

Both merges clean, no conflicts. 30 backend tests pass, 1140 frontend tests pass. Contract verification confirmed all entities present in the codebase.

The Product Guardian ran a final post-integration alignment check: `aligned`. No vision drift across the complete feature.

---

## 9. Manual Testing

### Prerequisites

Start the services via Docker Compose from the project root:

```bash
docker-compose up
```

Three containers start:

| Service | Container | Port | URL |
|---------|-----------|------|-----|
| PostgreSQL 16 (pgvector) | find-your-tribe-db | 5433 | — |
| Backend (FastAPI + Strawberry) | find-your-tribe-api | 8787 | http://localhost:8787/graphql |
| Frontend (Next.js 16) | find-your-tribe-web | 4200 | http://localhost:4200 |

The backend container runs migrations and seeds the database on first start. Wait for `Uvicorn running on http://0.0.0.0:8000` in the backend logs before testing.

### Test Scenarios

**1. Settings Page — Completeness Ring**

Navigate to http://localhost:4200/settings (authenticated). The CompletenessSection should appear above the form:
- Partially filled profile: circular ring with percentage (e.g., "67%"), list of missing fields as clickable items
- Clicking a missing field scrolls to and focuses the corresponding input
- 100% complete profile: filled ring with checkmark, "Profile Complete" label, no missing fields list

**2. Profile Page — Nudge Badge**

Navigate to your own profile page. If your profile is incomplete:
- An inline badge below the availability status shows "N% complete" with a "Finish profile" link
- The link navigates to `/settings`
- The badge does not appear when visiting another builder's profile

**3. Real-Time Update**

On the settings page with an incomplete profile:
- Fill in a missing field (e.g., add a headline)
- Save the profile
- The completeness percentage and missing fields list update without a page reload
- Fill all remaining fields → ring shows checkmark, missing fields list disappears

**4. GraphQL Verification**

Open the GraphQL playground at http://localhost:8787/graphql and run:

```graphql
query {
  builder(username: "maya_chen") {
    profileCompleteness
    missingProfileFields
  }
}
```

Verify `profileCompleteness` returns a float in [0.0, 1.0] and `missingProfileFields` returns a string array of missing field labels.

---

## Observations

### Spec Writing

- The three-spec model forces completeness. Writing the design spec separately from the tech spec caught a gap: the tech spec didn't specify scroll-target IDs for settings form inputs, which the design spec's "scroll to field" interaction requires.
- The Out of Scope section is the most valuable part of the PRD. Without it, gamification and onboarding integration would have crept in during planning.
- The Basic Example in the RFC (a GraphQL query) grounds everything. Seeing the query as a user would write it clarifies what fields are actually needed, before the data model section is written.
- Specs needed a revision pass after the initial audit. The design spec lacked an explicit constraint to use existing base components (`components/ui/`), and the tech spec's file impact section was too vague for the Developer agent. Two small edits before `plan` saved rework later.

### Guardian Gate

- The Guardian caught a genuine product-spec/tech-spec conflict about public exposure of completeness data. The tech spec argued it's harmless because underlying fields are already visible. The Guardian correctly distinguished between raw data ("no bio") and the inference ("33% complete"), pointing out the product spec explicitly rejects the latter for other users. Without this gate, a tech decision would have silently overridden a product boundary.

### Plan Verification

- The Verifier confirmed all 15 spec requirements were covered by the 7-task plan. The most valuable check was tracing PC-3 (real-time update) through the actual codebase: verifying that the settings page query includes completeness fields and that the save flow updates them. In an earlier planning iteration, this same check caught a critical failure where the mutation had no `refetchQueries` and computed fields weren't in the response type. That finding was addressed at the plan level before any code was written.
- The API exposure recommendation surfaced the same tension the Guardian flagged: the PRD says completeness is private to the owner, but the RFC exposes it on all `UserType` instances. Consistent pressure from multiple gates makes this harder to ignore.

### Execution

- Three waves of parallelism: tasks 1/2/3 (no deps), tasks 4/5 (depend on 3), tasks 6/7 (depend on 2+4 and 2+5). Maximum concurrency of 3 agents. The dependency graph determined the critical path, not the developer speed.
- Clean execution required fixing pre-existing test failures on `main` before running SPEED. The quality gates are strict: any test failure = task failure, even if the failures pre-date the feature. Two fixes (4 missing kwargs in `test_project_types.py`, 3 broken social link tests in `footer.test.tsx`) were committed before the run.

### Review

- The reviewer found a subtle whitespace divergence that would have been invisible in production for months. `calculate_profile_completeness` uses `bool()` on all fields; the new `_field_filled` helper strips whitespace for strings. A whitespace-only headline evaluates differently in each. The spec says "no divergence." The developer addressed this by unifying both implementations behind `_field_filled` in `score_service.py`.
- The hollow bullet color catch in Task 4 demonstrates review against design spec tokens, not just product spec. The reviewer compared the rendered color against the design spec's token table and flagged `text-accent` where `text-ink-tertiary` was specified.
- The re-run workflow (review → request_changes → re-run → re-review) closed the loop without human intervention. Both developers addressed all feedback in their re-runs.

### Coherence

- All contract items satisfied on first check. The coherence checker traced the full data flow from backend constant through GraphQL resolvers, across the API boundary, through TypeScript types, into React components, and verified the field ID mapping between CompletenessSection's `FIELD_TARGETS` and Task 6's form input IDs.
- Zero interface mismatches despite 7 tasks developed independently on isolated branches. The Architect's data model contract and the task-level file ownership constraints prevented the common failure mode of two agents implementing the same interface differently.
