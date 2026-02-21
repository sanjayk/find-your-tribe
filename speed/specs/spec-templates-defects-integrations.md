# SPEED: Unified Intake & Defect Pipeline

**Version:** 0.2 (Draft)
**Date:** February 2026
**Status:** RFC

---

## Problem

SPEED has a strong delivery pipeline but no intake layer. Work enters only one way: a human writes a markdown spec from scratch, puts it in `specs/tech/`, and runs `speed plan`. This creates three gaps:

1. **Blank-page authoring.** Every spec starts from zero. No structure, no guidance. Authors spend time deciding what sections to include rather than filling in content. Agents parse unpredictable formats because there is no canonical structure.

2. **Only one pipeline.** SPEED handles features but not defects. There is no way to say "tribe invites silently fail when the invitee has no GitHub connected" and have SPEED take it through diagnosis and fix. Bugs are handled ad-hoc — stuffed into feature branches or fixed outside the system entirely.

3. **No external system connection.** Work lives in GitHub Issues, Linear, JIRA, Figma. SPEED can't pull from any of them. Status stays inside `.speed/` JSON files with no way to push progress back.

These three gaps are one problem: **SPEED has no intake layer.** Templates, integrations, and defect handling are all variations of "how does work enter the system?"

---

## Solution: Unified Intake

One entry point. Multiple input modes. All produce the same output: a structured spec in `specs/`.

```
┌─────────────────────────────────────────────────────┐
│                   INTAKE LAYER                       │
│                                                      │
│   Input Modes:                                       │
│   ┌─────────────┐ ┌───────────────┐ ┌────────────┐  │
│   │ Manual      │ │ Agent-Assisted│ │ External   │  │
│   │ (ad-hoc     │ │ (description  │ │ (GitHub,   │  │
│   │  folder)    │ │  → agent →    │ │  Linear,   │  │
│   │             │ │  draft spec)  │ │  JIRA,     │  │
│   │             │ │               │ │  Figma)    │  │
│   └──────┬──────┘ └──────┬────────┘ └─────┬──────┘  │
│          │               │                │          │
│          └───────────┬───┘────────────────┘          │
│                      ↓                               │
│          ┌───────────────────────┐                   │
│          │   Intake Agent        │                   │
│          │   classify → draft    │                   │
│          │   (or passthrough     │                   │
│          │    for manual mode)   │                   │
│          └───────────┬───────────┘                   │
│                      ↓                               │
│            specs/{type}/{name}.md                    │
│                                                      │
└──────────────────────┬──────────────────────────────┘
                       ↓
         ┌─────────────┴──────────────┐
         ↓                            ↓
   Feature Pipeline             Defect Pipeline
   (existing)                   (new — see below)
```

### Input Modes

#### 1. Manual (existing — no change)

Human writes a spec directly in `specs/`. This is what SPEED does today. No agent involved. The spec folder is the intake.

```bash
# Write specs by hand, run the pipeline
vim specs/tech/my-feature.md
./speed/speed plan specs/tech/my-feature.md
```

This mode is always available. Power users who know the template structure don't need agent assistance.

#### 2. Templated (new — blank scaffold)

Human gets a structured template to fill in. No agent drafting — just the right sections in the right order.

```bash
./speed/speed new prd my-feature          # → specs/product/my-feature.md
./speed/speed new rfc my-feature          # → specs/tech/my-feature.md
./speed/speed new design my-feature       # → specs/design/my-feature.md
./speed/speed new defect invite-failure   # → specs/defects/invite-failure.md
```

Templates define canonical structure. The `new` command copies a template, replaces placeholders, opens `$EDITOR`.

#### 3. Agent-Assisted (new — intelligent drafting)

Human provides rough input. The Intake Agent classifies it and drafts a structured spec.

```bash
# From a description
./speed/speed intake "users should be able to invite friends to their tribe"
# → Intake Agent classifies as feature
# → drafts specs/product/tribe-invites.md (PRD)
# → drafts specs/tech/tribe-invites.md (RFC, with codebase awareness)
# → drafts specs/design/tribe-invites.md (design)
# → opens for human review

# From a bug description
./speed/speed intake "tribe invites silently fail when invitee has no GitHub"
# → Intake Agent classifies as defect
# → drafts specs/defects/tribe-invite-no-github.md
# → opens for human review (or runs triage directly)

# Force a type
./speed/speed intake "..." --as feature
./speed/speed intake "..." --as defect
```

#### 4. External (new — pull from other systems)

Fetch work from an external system. The Intake Agent receives the fetched data and drafts a spec — same as agent-assisted, but the input comes from an API instead of the human.

```bash
./speed/speed intake github #42
./speed/speed intake linear LIN-423
./speed/speed intake jira PROJ-891
./speed/speed intake figma "https://figma.com/file/abc123" --frame "Profile Page"
```

The external adapter fetches the raw data. The Intake Agent does the intelligent work — classifying, structuring, drafting. The adapter is dumb plumbing; the agent is the brain.

---

## The Intake Agent

**Agent definition:** `speed/agents/intake.md`
**Model:** `support_model` (sonnet by default)

One agent, not four. It knows all four spec templates (PRD, RFC, Design, Defect) and classifies input into the right one. For RFCs, it gets codebase read access to understand existing architecture.

### Input

Any of:
- A freeform text description (from `speed intake "..."`)
- A fetched external ticket (GitHub issue body, Linear ticket, JIRA issue)
- A Figma extraction (component tree, tokens, states)

Plus:
- The product vision file (`specs/product/overview.md`)
- All four spec templates (as output format reference)
- Codebase read access (for RFC drafting — existing models, API patterns, file structure)
- Existing specs in `specs/` (to understand what's already been specified)

### Job

1. **Classify** — Is this a feature, a defect, or a design change? Use signals: language ("fails", "broken", "should work" → defect), scope (new capability → feature), presence of visual/UI focus (→ design).
2. **Draft** — Produce structured spec(s) in the appropriate template format:
   - Feature → product spec + tech spec + design spec (the three-spec triplet)
   - Defect → defect report only
   - Design change → design spec (references existing product/tech specs)
3. **Flag gaps** — Mark sections it couldn't fill with `<!-- TODO: ... -->` markers. Be honest about what it's guessing vs. what the input specified.
4. **Link** — Add cross-references between the three specs for features. Link defects to their related feature spec.

### Output

One or more spec files written to `specs/`. The agent's draft is always a starting point — the human reviews and edits before the pipeline runs.

```json
{
  "classification": "feature | defect | design",
  "specs_created": [
    "specs/product/tribe-invites.md",
    "specs/tech/tribe-invites.md",
    "specs/design/tribe-invites.md"
  ],
  "confidence": 0.85,
  "gaps": [
    "Could not determine validation rules — marked as TODO in tech spec",
    "No design reference provided — design spec is skeletal"
  ],
  "source": "github#42"
}
```

### What the Intake Agent is NOT

- Not autonomous. It drafts; the human approves. No spec enters the pipeline without human review.
- Not the Architect. It doesn't decompose specs into tasks — it produces the specs that the Architect later decomposes.
- Not the Triage agent. For defects, it drafts the *report*. Triage *investigates* the report against the codebase.
- Not a replacement for domain expertise. It can structure information, but it can't invent product strategy or make architectural decisions the human hasn't provided.

---

## Goals

- Establish a unified intake layer with multiple input modes (manual, templated, agent-assisted, external)
- Define canonical spec templates (PRD, RFC, Design, Defect Report) as output formats for the Intake Agent and scaffolds for manual authoring
- Introduce the Intake Agent for classifying and drafting specs from rough input
- Design an integration adapter layer that feeds external systems into the Intake Agent
- Define a lightweight defect pipeline that is structurally different from the feature pipeline — less ceremony, more focused, regression-aware
- Introduce the Triage Agent for investigating and routing defect reports
- Push status back to external systems as work progresses through either pipeline
- Make `speed plan` the trust-building gate — the Architect reviews the RFC for feasibility and codebase fit before decomposing into tasks
- Keep specs as the canonical format — all paths produce markdown specs, agents always read specs

## Non-Goals

- Building a full project management system inside SPEED (Linear/JIRA already exist)
- Real-time sync with external systems (batch/on-demand is sufficient)
- Replacing the feature pipeline for complex work (defects that are actually missing features get escalated)
- Auto-discovering bugs from production monitoring or logs (future)
- Fully autonomous spec writing — human review is always required before pipeline execution

---

## Spec Templates

Four canonical templates that define the output format for each spec type. Templates serve three consumers: the Intake Agent (output schema), the `speed new` command (blank scaffold), and human authors (structural reference).

### Template 1: PRD (Product Requirements Document)

**File:** `speed/templates/prd.md`
**Output:** `specs/product/{name}.md`
**Consumed by:** Architect (decomposition), Product Guardian (vision alignment), Plan Verifier (blind verification)

```markdown
# F{n}: {Feature Name}

## Problem
<!-- Why does this need to exist? What user pain does it solve? -->

## Users
<!-- Which personas are affected? Reference overview.md personas. -->

## User Stories
<!-- As a {persona}, I want to {action}, so that {outcome}. -->
| ID | Story | Priority |
|----|-------|----------|
| | | |

## User Flows
<!-- Step-by-step interaction sequences. -->

## Success Criteria
<!-- Measurable outcomes. How do we know this worked? -->
- [ ] Criterion 1
- [ ] Criterion 2

## Scope
### In Scope
- ...
### Out of Scope (and why)
- ...

## Dependencies
<!-- Which features must exist before this one? -->

## Risks
<!-- What could go wrong? Severity + mitigations. -->

## Open Questions
<!-- Unresolved decisions that block implementation. -->
```

**Key sections for each agent:**
| Agent | Needs | Why |
|-------|-------|-----|
| Architect | User Stories, User Flows, Success Criteria | Decomposes into tasks, derives acceptance criteria |
| Product Guardian | Problem, Scope, Out of Scope | Prevents drift, enforces vision |
| Plan Verifier | Success Criteria, User Stories | Blind-checks whether the plan delivers what the spec requires |
| Reviewer | Success Criteria, User Flows | Checks code against intended behavior, not just task description |

### Template 2: RFC (Technical Spec)

**File:** `speed/templates/rfc.md`
**Output:** `specs/tech/{name}.md`
**Consumed by:** Architect (primary input for task decomposition), Developer (implementation reference), Coherence Checker (interface verification)

```markdown
# RFC: {Feature Name}

> See [{product-spec}]({path}) for product context.
> Depends on: [{dep}]({path}).

## Data Model
<!-- Tables, columns, relationships, constraints. -->
<!-- This becomes the contract source of truth. -->

## State Machine
<!-- If applicable: valid transitions, triggers, side effects. -->

## API Surface
<!-- Endpoints, GraphQL types, mutations, queries. -->
<!-- Input types, return types, error cases. -->

## Validation Rules
<!-- Business logic constraints. What inputs are rejected? -->
| Field | Constraints |
|-------|-------------|
| | |

## Key Decisions
<!-- Architectural choices and their rationale. -->
| Decision | Choice | Alternatives Considered | Rationale |
|----------|--------|------------------------|-----------|
| | | | |

## Search / Query Strategy
<!-- If applicable: indexing approach, query patterns, performance. -->

## Migration Strategy
<!-- If changing existing data: how do we get from A to B safely? -->

## Dependencies
<!-- What must exist before this can be built? -->
```

**Key sections for each agent:**
| Agent | Needs | Why |
|-------|-------|-----|
| Architect | Data Model, API Surface | Generates contract, decomposes tasks, declares files |
| Developer | Everything | Primary implementation reference |
| Plan Verifier | Key Decisions | Checks for semantic drift from stated rationale |
| Coherence Checker | API Surface, Data Model | Verifies interfaces match across independent branches |

### Template 3: Design Spec

**File:** `speed/templates/design.md`
**Output:** `specs/design/{name}.md`
**Consumed by:** Developer (component implementation), Reviewer (visual/UX verification)

```markdown
# Design: {Feature Name}

> See [{product-spec}]({path}) for product context.

## Pages / Routes
<!-- Which URLs? What does the user see at each step? -->

## Component Inventory
<!-- New and modified components. -->
| Component | Type | Props | Notes |
|-----------|------|-------|-------|
| | new / modified | | |

## States
<!-- Every component must account for all states. -->
### Empty State
<!-- What the user sees with no data. Must look intentional, not broken. -->

### Loading State
<!-- Skeleton, spinner, or progressive reveal. -->

### Populated State
<!-- Primary view with typical data. -->

### Error State
<!-- What happens when things fail. -->

## Interactions
<!-- User actions → system responses. -->

## Responsive Behavior
<!-- What changes at mobile / tablet / desktop? -->

## Design Tokens
<!-- Reference globals.css. No inventing new values. -->

## Figma Reference
<!-- Link to Figma file/frame, or FigmaMCP reference. -->
```

**Key sections for each agent:**
| Agent | Needs | Why |
|-------|-------|-----|
| Developer | Component Inventory, States, Design Tokens | Knows exactly what to build and with which tokens |
| Reviewer | States, Interactions | Verifies all states are handled, interactions work as specced |

### Template 4: Defect Report

**File:** `speed/templates/defect.md`
**Output:** `specs/defects/{name}.md`
**Consumed by:** Triage Agent (investigation and routing)

```markdown
# Defect: {Short Description}

**Severity:** critical | high | moderate | low
**Related Feature:** {link to spec, e.g., specs/product/f4-tribes.md}

## Observed Behavior
<!-- What actually happens? Be specific. -->

## Expected Behavior
<!-- What should happen instead? Reference the spec if possible. -->

## Reproduction Steps
1. Step 1
2. Step 2
3. Bug manifests

## Environment
<!-- Browser, OS, user state, data conditions. Anything relevant. -->

## Additional Context
<!-- Screenshots, logs, error messages, related issues. -->
```

Intentionally lightweight. A defect report should take 2 minutes to fill out. The Triage Agent does the investigation — the reporter just describes symptoms.

---

## Defect Pipeline

A structured workflow for fixing bugs. Lighter than the feature pipeline because defects have lower ambiguity — the behavior exists, it's just wrong. Less decomposition, more diagnosis.

### Pipeline Shape

Triage is a router. Not all defects deserve the same process.

```
specs/defects/{name}.md
        │
   [TRIAGE] ─────────────────────────────────────┐
        │                                         │
        ├── trivial ──→ Fix → Gates ──────────────┤
        │                                         │
        ├── moderate ──→ Reproduce → Fix →        │
        │                 Gates → Review ─────────┤
        │                                         │
        └── complex ──→ Escalate                  │
                        (→ intake as feature)      │
                                                  ↓
                                            [INTEGRATE]
```

Three tiers, gated by complexity.

### Entering the Defect Pipeline

Defects reach the pipeline through intake:

```bash
# Agent-assisted: describe the bug, Intake Agent drafts the report
./speed/speed intake "tribe invites fail when invitee has no GitHub"
# → classified as defect → specs/defects/tribe-invite-no-github.md

# Manual: write the report yourself
./speed/speed new defect invite-failure
# → blank template at specs/defects/invite-failure.md

# External: pull from GitHub issue labeled 'bug'
./speed/speed intake github #42
# → classified as defect → specs/defects/issue-42-invite-failure.md

# Run triage on an existing defect report
./speed/speed defect specs/defects/invite-failure.md

# Check status
./speed/speed status --defects
```

### Stage 1: Triage (New Agent)

**Agent definition:** `speed/agents/triage.md`
**Model:** `support_model` (sonnet by default)

**Input:** Defect report markdown + codebase read access (full read, no write) + related specs (auto-resolved from `Related Feature` field)

**Job:**
1. Find the relevant code — which files, which functions
2. Read the related spec to understand *intended* behavior
3. Determine: is this actually a bug, or is the reporter wrong about expected behavior?
4. Classify complexity: trivial, moderate, or complex
5. Identify blast radius — what else could break if this code changes?
6. For trivial/moderate: propose a fix approach
7. For complex: explain why this needs a spec and recommend escalation

**Output:**
```json
{
  "is_defect": true,
  "complexity": "trivial | moderate | complex",
  "root_cause_hypothesis": "Invite resolver doesn't check github_connected...",
  "affected_files": ["src/backend/app/graphql/mutations/tribe.py"],
  "blast_radius": "low | medium | high",
  "blast_radius_detail": "Isolated to invite flow, no other callers",
  "related_spec": "specs/product/f4-tribes.md",
  "suggested_approach": "Add guard clause in resolve_invite checking...",
  "regression_risks": ["invite happy path", "tribe membership count"],
  "escalation_reason": null
}
```

**Not a defect → rejection:**
If `is_defect` is false, Triage explains why (e.g., "Working as designed per spec. The spec says X, the code does X. If the spec is wrong, this is a feature change."). Pipeline stops. User can override.

**Complex → escalation:**
If complexity is `complex`, Triage explains why and pre-populates a PRD template from the defect report (Problem → observed behavior, User Stories → reproduction steps, Success Criteria → expected behavior). The user completes the PRD and enters it through the feature pipeline.

**Key difference from Debugger:** Triage is *investigative* — works from human-described symptoms with no stack trace. The Debugger is *forensic* — explains why a known build failure happened.

**Key difference from Architect:** The Architect decomposes ambiguity into multiple tasks. Triage *reduces* ambiguity to a single root cause. If it can't, that's the signal to escalate.

**Key difference from Intake Agent:** The Intake Agent classifies and *drafts specs*. Triage *investigates code* against a spec. Intake produces the defect report; Triage consumes it.

### Stage 2: Reproduce (Developer Agent, Focused Prompt)

**Runs for:** Moderate defects only
**Agent:** Developer (reused, with defect-specific system prompt)
**Model:** `support_model`

**Job:** Write a failing test that captures the bug. TDD red phase.

The test *is* the acceptance criterion. The Developer is explicitly instructed: "Write a test that fails demonstrating this behavior. Do not fix the bug."

**Output:** A branch with the failing test committed. Quality gates run (lint, typecheck pass; the new test is expected to fail).

**Skip for trivial:** Fix is obvious and scoped. Adding a test during the Fix stage is sufficient.

### Stage 3: Fix (Developer Agent, Reused)

**Runs for:** All defects (trivial and moderate)
**Agent:** Developer (reused, with defect-specific system prompt)
**Model:** `support_model` (escalatable to `planning_model` on retry)

**Input:**
- Triage output (root cause, affected files, suggested approach)
- For moderate: the reproduce branch with the failing test
- Explicit instruction: "Minimal change. Fix the defect. Do not refactor, do not improve surrounding code, do not add features."

**Quality gates:** Run gates for the affected subsystem (from Triage's `affected_files`). Also run the related feature's test suite if identifiable from the `related_spec` field.

**Output:** Branch with the fix. All quality gates must pass, including the reproduction test (now green).

### Stage 4: Review (Reviewer Agent, Adapted Prompt)

**Runs for:** Moderate defects only
**Agent:** Reviewer (reused, with defect-specific prompt)

The defect Reviewer asks:
1. "Does this fix address the reported defect?"
2. "Does it introduce any new behavior beyond the fix?"
3. "Is the change minimal and scoped — no drive-by refactoring?"
4. "Are there obvious regressions introduced?"

**Skip for trivial:** A one-line fix that passes gates doesn't need review. Triage validated the approach. Gates passed.

### Stage 5: Integrate (Integrator, Reused)

Same as the feature pipeline. Merge the branch, run regression tests.

**Product Guardian for defects:** Optional. Runs only if the diff exceeds a size threshold (>100 lines changed or >3 files touched). A small, focused fix doesn't need vision alignment. A large diff that started as a "bug fix" does.

### What Runs When

| Tier | Triage | Reproduce | Fix | Gates | Review | Guardian | Integrate |
|------|--------|-----------|-----|-------|--------|----------|-----------|
| **Trivial** | Yes | No | Yes | Yes | No | No | Yes |
| **Moderate** | Yes | Yes | Yes | Yes | Yes | If large diff | Yes |
| **Complex** | Yes | — | — | — | — | — | — |

**Not used for defects:** Architect, Plan Verifier, Coherence Checker (single branch, nothing to cross-check).

### Defect State

```
.speed/defects/{name}/
  report.md              # Copy of the defect spec
  triage.json            # Triage Agent output
  state.json             # Runtime state
  logs/                  # Agent output logs
```

State transitions:
```
filed → triaging → triaged → reproducing → fixing → reviewing → integrating → resolved
                 ↘ rejected (not a defect)
                 ↘ escalated (pre-populates PRD, enters feature pipeline)
```

---

## External Adapters

External adapters are dumb plumbing. They fetch data from an external system and hand it to the Intake Agent. They also push status updates back as work progresses.

### Architecture

```
speed/integrations/
  github.sh         # GitHub Issues + PRs
  linear.sh         # Linear tickets
  jira.sh           # JIRA tickets
  figma.sh          # FigmaMCP design extraction
```

Each adapter implements two functions:

```bash
adapter_fetch()     # Pull raw data from external system → pass to Intake Agent
adapter_sync()      # Push SPEED status → external system
```

The adapter does NOT classify or draft. It fetches fields (title, body, labels, comments) and hands them to the Intake Agent as structured input. The agent does the intelligent work.

### Adapter 1: GitHub Issues

**Priority:** First (project already lives on GitHub, lowest friction)
**Dependencies:** `gh` CLI

**Fetch:**
```bash
./speed/speed intake github #42
./speed/speed intake github #42 --as defect    # force type
./speed/speed intake github #42 --as feature   # force type
```

1. Reads issue via `gh issue view 42 --json title,body,labels,assignees,comments`
2. Passes to Intake Agent with label hints for classification:
   - `bug`, `defect`, `fix` labels → suggest defect
   - `feature`, `enhancement` labels → suggest feature
3. Intake Agent drafts spec(s), writes to `specs/`
4. Stores source reference: `<!-- source: github#42 -->`

**Sync (opt-in):**
At each pipeline stage transition, adapter comments on the source issue:

| Pipeline | Event | GitHub Action |
|----------|-------|--------------|
| Feature | Plan complete | Comment: task count, scope |
| Feature | Integrated | Close issue, summary comment |
| Feature | Guardian rejected | Comment: concern, label `needs-revision` |
| Defect | Triage complete | Comment: classification, root cause |
| Defect | Integrated | Close issue, summary comment |
| Defect | Escalated | Comment: explanation, label `needs-spec` |
| Defect | Rejected | Comment: explanation (do NOT close — human decides) |

### Adapter 2: Linear

**Priority:** Second
**Dependencies:** Linear API key

```bash
./speed/speed intake linear LIN-423
```

Field mapping: Title → spec title, Description → body, Priority → severity (defects), Labels → type hints, Comments → additional context.

**Sync:** Status transitions via API (In Progress, Done, Backlog) + comments at stage transitions.

```toml
[integrations.linear]
api_key_env = "LINEAR_API_KEY"
sync = true
team_id = "TEAM_ID"
```

### Adapter 3: JIRA

**Priority:** Third (only when an enterprise team needs it)
**Dependencies:** JIRA API key

```bash
./speed/speed intake jira PROJ-891
```

Field mapping: Summary → title, Description → body, Priority → severity, Issue Type → type hint, Epic Link → related feature, Components → subsystem hints.

**Sync:** JIRA transitions via REST API. Transition IDs are configurable (every JIRA instance has different workflow IDs).

```toml
[integrations.jira]
base_url = "https://company.atlassian.net"
api_key_env = "JIRA_API_KEY"
user_email_env = "JIRA_USER_EMAIL"
sync = true
transitions = { in_progress = "31", done = "41", backlog = "11" }
```

### Adapter 4: FigmaMCP

**Priority:** Fourth (highest value for design accuracy, most complex)
**Dependencies:** FigmaMCP server, Figma API access

```bash
./speed/speed intake figma "https://figma.com/file/abc123" --frame "Profile Page"
```

1. Connects to FigmaMCP to extract structured design data
2. Extracts: component tree, design tokens, component states, breakpoint hints
3. Intake Agent drafts a design spec from the extraction
4. Flags token mismatches against `globals.css`

**Verification (separate command):**
```bash
./speed/speed figma-verify "https://figma.com/file/abc123" --frame "Profile Page"
```
Compares implementation against Figma source of truth during review. Separate from the intake flow.

**Sync:** One-directional. SPEED does not push back to Figma.

```toml
[integrations.figma]
mcp_endpoint = "http://localhost:3845"
token_env = "FIGMA_ACCESS_TOKEN"
```

---

## New Agents Summary

| Agent | Role | Input | Output | When |
|-------|------|-------|--------|------|
| **Intake** | Classify input, draft structured specs | Rough text, external ticket data, Figma extraction | Spec files in `specs/` | `speed intake` |
| **Triage** | Investigate defect, classify complexity, route | Defect report + codebase read access | Triage analysis JSON | `speed defect` |

Both are new. Existing agents (Architect, Developer, Reviewer, etc.) are reused without changes — they already read specs, which is what these new agents produce.

**Modified agent:** The Architect gains an RFC review responsibility during `speed plan` (see Human Gates).

---

## Spec Sizing

Large specs produce large task DAGs, and large task DAGs fail in predictable ways: more dependency edges, more coordination failures between branches, harder coherence checking, degraded Architect decomposition quality.

### Recommended limits

- **3-5 features per spec** (targeting 4-8 tasks from the Architect)
- **If a spec would produce 10+ tasks, it should be split**

### Enforcement: two layers

**1. Intake Agent splits at draft time.** When the input describes multiple distinct feature areas, the Intake Agent produces separate spec triplets rather than one large spec. Each triplet gets its own name and cross-references the others via `Dependencies` sections.

Example: `speed intake "build a social reading app with bookshelves, friend activity feeds, and reading challenges"` produces three spec triplets:
```
specs/product/bookshelves.md          specs/tech/bookshelves.md          specs/design/bookshelves.md
specs/product/activity-feeds.md       specs/tech/activity-feeds.md       specs/design/activity-feeds.md
specs/product/reading-challenges.md   specs/tech/reading-challenges.md   specs/design/reading-challenges.md
```
With dependency ordering: bookshelves first (no deps), activity feeds second (depends on bookshelves), reading challenges third (depends on bookshelves).

**2. Architect flags during RFC review.** If the Architect's decomposition would produce more than 8 tasks, it stops and proposes a split before proceeding. This is a hard gate — the Architect reports the recommended split and `speed plan` exits. The human can override with `--allow-large` if they understand the risk.

The Architect's split recommendation includes:
- Proposed sub-features with names
- Which acceptance criteria go to which sub-feature
- Suggested dependency ordering between sub-features

### Why both layers

The Intake Agent catches obvious cases (description mentions 3 distinct features). The Architect catches subtle cases (one feature that looks simple but decomposes into 12 tasks because the data model is complex). Belt and suspenders on the most impactful quality signal.

---

## State & File Structure

### New directories

```
speed/
  templates/
    prd.md              # PRD template (new)
    rfc.md              # RFC template (new)
    design.md           # Design spec template (new)
    defect.md           # Defect report template (new)
    spec.md             # Existing generic template (kept)
  agents/
    intake.md           # Intake Agent definition (new)
    triage.md           # Triage Agent definition (new)
  integrations/         # External adapters (new)
    github.sh
    linear.sh
    jira.sh
    figma.sh

specs/
  defects/              # Defect reports (new)

.speed/
  defects/              # Defect runtime state (new)
```

### Configuration additions

```toml
# speed.toml

[integrations.github]
sync = true
close_on_resolve = true

[integrations.linear]
api_key_env = "LINEAR_API_KEY"
sync = true
team_id = "TEAM_ID"

[integrations.jira]
base_url = "https://company.atlassian.net"
api_key_env = "JIRA_API_KEY"
user_email_env = "JIRA_USER_EMAIL"
sync = true
transitions = { in_progress = "31", done = "41", backlog = "11" }

[integrations.figma]
mcp_endpoint = "http://localhost:3845"
token_env = "FIGMA_ACCESS_TOKEN"
```

---

## Decisions (Closed)

| Question | Decision | Rationale |
|----------|----------|-----------|
| Auto-number features in `speed new`? | No. Author sets the number. | Feature numbers are semantic (F4 = 4th in the vision), not sequential by creation order. |
| Severity vs. classification overlap? | Rename classification to `complexity`. | Different axes: severity = business impact (reporter sets), complexity = technical scope (Triage sets). A critical-severity bug can be trivial-complexity. |
| Integration sync frequency? | Per-stage transition only. | Heartbeats add complexity for marginal value. A 3-minute silence isn't a problem; a 10-minute one is a timeout issue. |
| FigmaMCP as review tool? | Separate command: `speed figma-verify`. | Keeps the review path clean. Optional dependency stays optional. |
| Defect-to-feature escalation? | Pre-populate a PRD from the defect report. | Problem, reproduction steps, and expected behavior map directly to PRD sections. Don't make the user re-type. |
| Template versioning? | Don't. | Agents parse markdown flexibly. Templates evolve. Old specs still work. Solve when it's a problem. |

---

## Human Gates

Every CLI command is a gate. The file system is the handoff. No new mechanism — this is the existing SPEED pattern applied to intake and defects.

### Feature flow

```
speed intake "..."                  → drafts PRD + RFC + Design, prints paths, stops
  human reviews/edits specs
speed plan specs/tech/X.md          → Architect reviews RFC, then decomposes into task DAG
  ├── RFC review passed             → prints task graph, stops
  └── RFC review flagged issues     → prints issues, stops (human fixes RFC, re-runs plan)
  human reviews task graph
speed verify                        → blind-checks plan, stops
speed run                           → executes tasks, stops
speed review                        → reviews diffs, stops
speed coherence                     → checks cross-branch consistency, stops
speed integrate                     → merges, stops
```

**The `speed plan` gate is the most critical.** The Architect reviews the RFC before decomposing it. This is where technical problems get caught before they cascade into a bad task DAG. The Architect checks:

1. **Feasibility** — Can this data model actually support the features in the PRD?
2. **Codebase fit** — Does the proposed schema conflict with or duplicate existing tables?
3. **Completeness** — Are there API endpoints in the PRD's user flows that the RFC doesn't define?
4. **Consistency** — Do the RFC's relationships match the PRD's feature descriptions?

If the Architect flags issues, `speed plan` stops and reports them. The human fixes the RFC and re-runs. If the RFC passes review, the Architect proceeds to task decomposition in the same invocation.

This is the trust-building moment. The human sees the Architect validate their technical decisions before committing to execution. Over time, the Architect's RFC reviews build confidence that the pipeline catches real problems early.

### Defect flow

```
speed intake "bug: ..."             → drafts defect report, prints path, stops
  human reviews/edits report
speed defect specs/defects/X.md     → runs triage, prints analysis, stops
  human reviews triage (classification, root cause, approach)
  — trivial: triage auto-proceeds to fix
  — moderate: human confirms, fix proceeds
  — complex: triage pre-populates PRD, stops (enters feature flow)
speed run --defect X                → fix + gates + review, stops
speed integrate --defect X          → merges, stops
```

### Design principles

- **Every gate is a command boundary.** No implicit auto-chaining. The human decides when to proceed.
- **The file system is the handoff.** Intake writes specs to `specs/`. Triage writes analysis to `.speed/defects/`. The human reads files, edits if needed, runs the next command.
- **No approval prompts.** SPEED doesn't ask "proceed? [y/n]". Running the next command *is* the approval.
- **Override at the gate, not mid-pipeline.** If the Guardian rejects during `speed review`, the command finishes and reports the rejection. The human decides whether to revise the spec or re-run with `SKIP_GUARDIAN=true`.

---

## Implementation Priority

| Phase | What | Why First |
|-------|------|-----------|
| **1** | Spec templates + `speed new` command | Zero external deps, immediately useful, defines output formats for everything else |
| **2** | Intake Agent + `speed intake` (text input) | Core intelligent intake, no external deps, validates the agent-assisted model |
| **3** | Triage Agent + defect pipeline | Completes the defect workflow, validates the template system with a real consumer |
| **4** | GitHub adapter | Project lives on GitHub, lowest friction, tests the adapter architecture |
| **5** | Linear adapter | Second adapter validates the plugin model |
| **6** | FigmaMCP adapter + `speed figma-verify` | Highest design value, most complex |
| **7** | JIRA adapter | Only when an enterprise team needs it |

---

## Out of Scope

- Auto-discovery of bugs from production logs, monitoring, or error tracking (Sentry, Datadog)
- Bi-directional Figma sync
- Integration with Notion, Shortcut, Asana, or other PM tools (pluggable architecture supports future additions)
- Defect prioritization queue or backlog management
- SLA tracking or defect resolution time metrics
- Integration authentication management (keys live in env vars)
- Fully autonomous spec authoring (human review always required)
- `speed validate` for defect specs (defects reference a feature spec but don't have product/tech/design siblings — validation checks that the `Related Feature` link resolves, nothing more)
