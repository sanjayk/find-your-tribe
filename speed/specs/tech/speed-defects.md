# RFC: Defect Pipeline

> See [product spec](../product/speed-defects.md) for product context.
> Depends on: [Phase 1: Spec Templates](speed-templates.md), [Phase 2: Intake Agent](speed-intake.md)
> Parent RFC: [Unified Intake & Defect Pipeline](../spec-templates-defects-integrations.md)

## Triage Agent

### Agent definition

**File:** `speed/agents/triage.md`
**Model:** `support_model` (sonnet by default)
**Access:** Full codebase read, no write. Investigative — finds code, doesn't change it.

### System prompt context

The Triage Agent receives:
- The defect report markdown
- Related feature spec (auto-resolved from `Related Feature` field in the defect report)
- Related tech spec (auto-derived: `specs/tech/<feature-name>.md`)
- Full codebase read access
- Project conventions from `CLAUDE.md`

### Output format

```json
{
  "is_defect": true,
  "complexity": "trivial | moderate | complex",
  "root_cause_hypothesis": "Invite resolver doesn't check github_connected before sending invite email",
  "affected_files": ["src/backend/app/graphql/mutations/tribe.py"],
  "blast_radius": "low | medium | high",
  "blast_radius_detail": "Isolated to invite flow, no other callers of send_invite()",
  "related_spec": "specs/product/f4-tribes.md",
  "suggested_approach": "Add guard clause in resolve_invite checking user.github_connected before calling send_invite()",
  "regression_risks": ["invite happy path", "tribe membership count"],
  "escalation_reason": null
}
```

### Complexity classification criteria

| Complexity | Criteria | Pipeline path |
|------------|----------|---------------|
| **Trivial** | 1 file affected, obvious fix, low blast radius, Triage has high confidence in approach | Fix → Gates → Integrate |
| **Moderate** | 2-4 files, non-obvious fix or medium blast radius, Triage has a hypothesis but wants test confirmation | Reproduce → Fix → Gates → Review → Integrate |
| **Complex** | 5+ files, requires schema change or migration, high blast radius, or Triage can't isolate root cause | Escalate to feature pipeline |

## Defect Pipeline Stages

### CLI commands

```bash
# Run triage
./speed/speed defect specs/defects/<name>.md

# Execute fix (after human reviews triage)
./speed/speed run --defect <name>

# Integrate fixed branch
./speed/speed integrate --defect <name>

# Retry with context or model escalation
./speed/speed retry --defect <name> [--context "hint"] [--escalate]

# Check defect status
./speed/speed status --defects
```

### Stage 1: Triage (`speed defect`)

Implementation in `cmd_defect()`:

1. Parse defect report from the provided path
2. Extract `Related Feature` field → resolve to spec paths
3. Build Triage Agent system prompt with report, specs, codebase access
4. Run agent via `provider_run_json()`
5. Parse triage output
6. Write triage result to `.speed/defects/<name>/triage.json`
7. Update state: `filed → triaging → triaged`
8. Print triage summary to stdout
9. Route based on classification:
   - `trivial`: update state, proceed to fix automatically (no human gate)
   - `moderate`: update state, stop (human reviews before `speed run --defect`)
   - `complex`: pre-populate PRD, update state to `escalated`, stop
10. If `is_defect` is false: update state to `rejected`, print explanation, stop

### Stage 2: Reproduce (`speed run --defect`, moderate only)

Implementation: reuse `cmd_run()` with defect-specific developer prompt.

1. Create isolated branch: `speed/defect-<name>-reproduce`
2. Build Developer Agent prompt:
   - "Write a failing test that demonstrates this defect"
   - "Do NOT fix the bug"
   - Include: triage output, defect report, related specs
3. Run Developer Agent
4. Run quality gates (lint, typecheck should pass; new test expected to fail)
5. Commit the failing test
6. Update state: `triaged → reproducing → reproduced`

### Stage 3: Fix (`speed run --defect`)

Implementation: reuse `cmd_run()` with defect-specific developer prompt.

1. Branch:
   - Trivial: create new branch `speed/defect-<name>-fix`
   - Moderate: continue on reproduce branch (test already there)
2. Build Developer Agent prompt:
   - "Minimal change. Fix the defect described in the triage output."
   - "Do not refactor, do not improve surrounding code, do not add features."
   - Include: triage output (root cause, affected files, approach), defect report
   - For moderate: "The failing test on this branch defines 'done' — make it pass."
3. Run Developer Agent
4. Run quality gates:
   - Gates for the affected subsystem (determined from `affected_files` glob matching against `[subsystems]` config)
   - Related feature's test suite if identifiable from `related_spec`
5. Grounding gates: non-empty diff, files touched within declared scope
6. Update state: `fixing → fixed`

### Stage 4: Review (moderate only)

Implementation: reuse the Reviewer agent with defect-specific prompt.

1. Build Reviewer prompt with defect-specific questions:
   - "Does this fix address the reported defect?"
   - "Does it introduce any new behavior beyond the fix?"
   - "Is the change minimal and scoped — no drive-by refactoring?"
   - "Are there obvious regressions introduced?"
2. Input: the diff, the defect report, the triage output
3. If review passes → update state: `fixed → reviewed`
4. If review flags issues → log issues, update state remains `fixed` (human decides)

**Product Guardian (conditional):** If diff > 100 lines changed or > 3 files touched, run the Product Guardian. Same prompt as feature pipeline Guardian but scoped to "is this fix staying in scope?"

### Stage 5: Integrate (`speed integrate --defect`)

Implementation: reuse `cmd_integrate()`.

1. Merge defect branch into main
2. Run regression tests
3. Update state: `reviewed → integrating → resolved`
4. Clean up branch

### Escalation: Complex → Feature Pipeline

When Triage classifies as `complex`:

1. Load the defect report
2. Map fields to PRD template:
   - Defect `Observed Behavior` → PRD `Problem`
   - Defect `Expected Behavior` → PRD `Success Criteria`
   - Defect `Reproduction Steps` → PRD `User Flows`
   - Defect `Related Feature` → PRD `Dependencies`
3. Write draft PRD to `specs/product/<name>.md`
4. Print: "Escalated to feature pipeline. Draft PRD: specs/product/<name>.md"
5. Update defect state to `escalated`

## Defect State

### Directory structure

```
.speed/defects/<name>/
  report.md              # Copy of the defect spec (snapshot)
  triage.json            # Triage Agent output
  state.json             # Runtime state
  logs/
    triage.log           # Triage agent conversation
    reproduce.log        # Reproduce agent conversation (moderate)
    fix.log              # Fix agent conversation
    review.log           # Review agent output (moderate)
```

### State machine

```json
{
  "status": "filed | triaging | triaged | reproducing | fixing | reviewing | integrating | resolved | rejected | escalated",
  "complexity": "trivial | moderate | complex | null",
  "branch": "speed/defect-invite-failure-fix",
  "created_at": "2026-02-21T10:30:00Z",
  "updated_at": "2026-02-21T10:35:00Z",
  "source_spec": "specs/defects/invite-failure.md"
}
```

Valid transitions:
```
filed → triaging → triaged → reproducing → fixing → reviewing → integrating → resolved
                            → fixing (trivial skips reproduce)
                 → rejected
                 → escalated
```

### `speed status --defects`

Add defect summary to `cmd_status()` output:

```
Defects:
  invite-failure     moderate   fixing     speed/defect-invite-failure-fix
  login-redirect     trivial    resolved   (merged)
  tribe-count        complex    escalated  → specs/product/tribe-count.md
```

## Files changed

| File | Change |
|------|--------|
| `speed/speed` | Add `cmd_defect()`, modify `cmd_run()` for `--defect`, modify `cmd_integrate()` for `--defect`, modify `cmd_status()` for `--defects`, modify `cmd_retry()` for `--defect` |
| `speed/agents/triage.md` | New file — Triage Agent definition |
| `speed/agents/developer.md` | Add defect-specific prompt variants (reproduce, fix) |
| `speed/agents/reviewer.md` | Add defect-specific prompt variant |
| `speed/lib/tasks.sh` | Add defect state CRUD functions (or new `speed/lib/defects.sh`) |

## Dependencies

- Phase 1: defect report template must exist
- Existing infrastructure: Developer Agent, Reviewer Agent, Integrator, quality gates, grounding gates
- `provider_run_json()` for Triage Agent output parsing
