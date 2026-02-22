# Phase 3: Defect Pipeline

> Parent RFC: [Unified Intake & Defect Pipeline](../unified-intake.md)
> Depends on: [Phase 1: Spec Templates](speed-templates.md), [Phase 2: Audit Agent](speed-audit.md)

## Problem

SPEED handles features but not bugs. When something breaks, the fix happens ad-hoc — stuffed into a feature branch or done outside the system entirely. There's no structured path from "this is broken" to "it's fixed, tested, and merged." The Debugger and Supervisor handle build-time failures, not user-reported bugs.

## Users

### Any Team Member (Product, Engineering, Design)
Discovers a bug in production, during development, or during design review. Wants to file it with minimal friction and have it triaged automatically — not figure out who to tell or which Slack channel to post in.

### Engineering
Owns the fix. Wants a structured pipeline from triage to resolution with quality gates — not an untracked ad-hoc commit.

### Product
Needs visibility into what bugs exist, what's being investigated, and what's been fixed. Wants defect handling to be as observable as feature delivery. Wants assurance that "bug fixes" don't sneak in scope changes.

## User Stories

| ID | Story | Priority |
|----|-------|----------|
| S1 | As any team member, I want to submit a defect report and have it triaged automatically | Must |
| S2 | As an engineer, I want to see the triage result (root cause, complexity, approach) before the fix proceeds | Must |
| S3 | As an engineer, I want trivial defects to be fixed with minimal ceremony (no reproduction step, no review) | Must |
| S4 | As an engineer, I want moderate defects to include a failing test before the fix | Must |
| S5 | As an engineer, I want complex defects to be escalated to a feature spec rather than hacked into a fix | Must |
| S6 | As an engineer, I want to see defect status alongside feature status in `speed status` | Should |
| S7 | As a product person, I want the defect fix to be minimal — no drive-by refactoring or scope creep | Must |
| S8 | As a designer, I want to file visual/UX bugs (wrong tokens, broken states, layout issues) and have them triaged like any other defect | Must |
| S9 | As an engineer, I want to retry a failed defect fix with additional context or an escalated model | Should |

## User Flows

### Trivial defect (happy path)

1. User runs `speed defect specs/defects/invite-failure.md`
2. Triage Agent investigates: reads codebase, finds root cause
3. Triage classifies as "trivial" — single file, obvious fix, low blast radius
4. Triage output printed: root cause, affected files, suggested approach
5. Fix proceeds automatically (no human gate between triage and fix for trivial)
6. Developer Agent applies minimal fix on isolated branch
7. Quality gates run (lint, test, typecheck)
8. User runs `speed integrate --defect invite-failure`
9. Branch merged, defect marked resolved

### Moderate defect

1. User runs `speed defect specs/defects/invite-failure.md`
2. Triage classifies as "moderate" — multiple files or non-obvious fix
3. Triage output printed: root cause, affected files, blast radius, suggested approach
4. SPEED stops — human reviews triage analysis
5. User runs `speed run --defect invite-failure`
6. Developer Agent writes a failing test (reproduce stage)
7. Developer Agent applies fix (fix stage)
8. Quality gates run
9. Reviewer checks: fix addresses defect, no extra behavior, minimal scope
10. User runs `speed integrate --defect invite-failure`

### Complex defect (escalation)

1. User runs `speed defect specs/defects/invite-failure.md`
2. Triage classifies as "complex" — requires schema change, 5+ files, unclear blast radius
3. Triage explains why this can't be a simple fix
4. SPEED pre-populates a PRD template from the defect report:
   - Problem → Observed Behavior
   - User Stories → Reproduction Steps
   - Success Criteria → Expected Behavior
5. SPEED prints: "Escalated to feature. Draft PRD at specs/product/invite-failure.md"
6. User completes the PRD, enters feature pipeline

### Not a defect (rejection)

1. User runs `speed defect specs/defects/invite-failure.md`
2. Triage determines: working as designed per spec
3. Triage explains: "The spec says X, the code does X. If the spec is wrong, this is a feature change."
4. SPEED stops. Defect marked "rejected."
5. User can override and re-file, or accept the rejection

## Success Criteria

- [ ] `speed defect <path>` runs triage and prints the analysis
- [ ] Triage correctly identifies root cause files in >80% of cases
- [ ] Trivial defects proceed to fix automatically after triage
- [ ] Moderate defects stop after triage for human review
- [ ] Complex defects pre-populate a PRD and stop
- [ ] Rejected (not-a-defect) reports explain why with spec references
- [ ] `speed run --defect <name>` runs reproduce (moderate only) + fix stages
- [ ] Fix stage applies minimal changes — diff is scoped to affected files
- [ ] Quality gates run for the affected subsystem + related feature's test suite
- [ ] Review stage (moderate only) checks for scope creep in the fix
- [ ] `speed integrate --defect <name>` merges the fix branch
- [ ] Product Guardian runs only if diff exceeds size threshold (>100 lines or >3 files)
- [ ] `speed status --defects` shows all defects with current state
- [ ] Defect state is stored in `.speed/defects/<name>/` as readable JSON
- [ ] `speed retry --defect <name>` retries with optional `--context` and `--escalate`
- [ ] Defect severity (P0-P3) is preserved in triage output and visible in `speed status --defects`

## Scope

### In Scope
- Triage Agent definition (`speed/agents/triage.md`)
- `speed defect` CLI command
- Three-tier routing (trivial → fix, moderate → reproduce → fix → review, complex → escalate)
- Defect state machine (`filed → triaging → triaged → ... → resolved`)
- Reproduce stage (failing test) for moderate defects
- Fix stage with minimal-change instruction
- Review stage for moderate defects
- Escalation to feature pipeline with PRD pre-population
- `speed status --defects` integration
- `speed retry --defect` support
- `speed integrate --defect` support

### Out of Scope (and why)
- External adapter integration (GitHub issues → defect reports) — Phase 4+
- Defect prioritization queue — each defect is standalone, not managed as a backlog
- SLA tracking — not a project management tool
- Auto-discovery from logs/monitoring — future
- Batch defect processing — one at a time

## Dependencies

- Phase 1 (Spec Templates) — defect report template must exist
- Phase 2 (Audit Agent) — `speed audit` can validate defect reports before triage, but is not required
- Existing SPEED pipeline infrastructure: Developer Agent, Reviewer Agent, Integrator, quality gates

## Risks

| Risk | Severity | Mitigation |
|------|----------|------------|
| Triage misidentifies root cause | Medium | Triage proposes a hypothesis, not a certainty. The fix stage validates by running tests. Wrong hypothesis → fix fails → retry with `--context`. |
| Developer Agent over-fixes (refactors surrounding code) | Medium | Explicit "minimal change" instruction in system prompt. Reviewer checks for scope creep. Guardian triggers on large diffs. |
| Complex escalation feels heavyweight for users | Low | The pre-populated PRD reduces the burden. User only completes what the agent couldn't determine. |
