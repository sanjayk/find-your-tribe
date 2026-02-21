# RFC: Intake Agent

> See [product spec](../product/speed-intake.md) for product context.
> Depends on: [Phase 1: Spec Templates](speed-templates.md)
> Parent RFC: [Unified Intake & Defect Pipeline](../spec-templates-defects-integrations.md)

## Intake Agent

### Agent definition

**File:** `speed/agents/intake.md`
**Model:** `support_model` (sonnet by default)
**Access:** Full codebase read, no write. Agent drafts specs; the CLI writes the files.

### System prompt context

The Intake Agent receives:
- The user's raw input text
- The product vision file (`specs/product/overview.md`)
- All four spec templates (as output format reference)
- List of existing specs in `specs/` (to understand what's already been specified)
- Codebase file tree (for RFC drafting — understanding project structure)
- Existing model definitions (for RFC drafting — proposing schemas that fit)
- Existing API patterns (for RFC drafting — consistent query/mutation style)
- Classification hint (if `--as` flag provided, or label hints from an external adapter)

### Output format

The agent returns structured JSON:

```json
{
  "classification": "feature | defect | design",
  "slug": "tribe-invites",
  "specs": [
    {
      "type": "product",
      "path": "specs/product/tribe-invites.md",
      "content": "# F: Tribe Invites\n\n## Problem\n..."
    },
    {
      "type": "tech",
      "path": "specs/tech/tribe-invites.md",
      "content": "# RFC: Tribe Invites\n\n## Data Model\n..."
    },
    {
      "type": "design",
      "path": "specs/design/tribe-invites.md",
      "content": "# Design: Tribe Invites\n\n## Pages / Routes\n..."
    }
  ],
  "gaps": [
    "Could not determine validation rules — marked as TODO in tech spec",
    "No design reference provided — design spec is skeletal"
  ]
}
```

For defects, `specs` contains a single defect report.

### Classification logic

The agent classifies based on input signals:

| Signal | Classification |
|--------|---------------|
| Language: "fails", "broken", "should work", "error", "crash" | Defect |
| Language: "add", "build", "implement", "support", "enable" | Feature |
| Language: "redesign", "restyle", "move", "layout" | Design change |
| `--as feature` flag | Feature (override) |
| `--as defect` flag | Defect (override) |
| External adapter label: `bug`, `defect`, `fix` | Suggest defect |
| External adapter label: `feature`, `enhancement` | Suggest feature |
| Ambiguous | Default to feature, note uncertainty in gaps |

### Spec sizing enforcement

When the input describes multiple distinct feature areas:

1. Agent identifies separable concerns (different entities, different user flows, different pages)
2. Agent drafts separate spec triplets for each concern
3. Each triplet gets a unique slug and cross-references the others in `Dependencies`
4. Agent proposes dependency ordering

The trigger is semantic, not length-based. A long description of one feature stays as one spec. A short description of three features becomes three specs.

## CLI command: `speed intake`

### Command signature

```bash
./speed/speed intake "<description>" [--as feature|defect] [--specs-dir DIR]
```

### Implementation

Add `cmd_intake()` function to `speed/speed`:

1. Parse arguments: description text, optional `--as` override, optional `--specs-dir`
2. Validate: description is non-empty
3. Assemble agent context:
   - Load vision file (from `speed.toml` → `specs.vision_file`)
   - Load template files from `speed/templates/`
   - List existing specs in `specs/`
   - If `--specs-dir` provided, include those specs as additional context
4. Build Intake Agent system prompt with all context
5. Run agent via `provider_run_json()` (expects JSON output)
6. Parse agent response
7. For each spec in the response:
   - Check if output path already exists → warn (append `-2` suffix or prompt)
   - Create output directory if needed (`mkdir -p`)
   - Write spec content to file
8. Print summary: classification, files created, gaps
9. Exit (do not chain to `speed plan` or `speed defect`)

### Spec sizing: Architect hard gate

In addition to the Intake Agent splitting at draft time, the Architect enforces a hard gate during `speed plan`:

Modify `cmd_plan()` in `speed/speed`:

1. After the Architect produces a task DAG, count the tasks
2. If task count > 8:
   - Print the task count and a warning
   - Architect proposes a split: sub-feature names, which acceptance criteria go where, dependency ordering
   - Exit with `EXIT_CONFIG_ERROR` (plan not saved)
3. User can override with `--allow-large` flag (skips the task count check)

### Architect RFC review

Modify `cmd_plan()` to add an RFC review phase before task decomposition:

1. Load the tech spec (primary input) and sibling specs (product, design)
2. Run the Architect with an RFC review prompt:
   - "Review this RFC for feasibility, codebase fit, completeness, and consistency"
   - "Check: Can this data model support the features in the PRD?"
   - "Check: Does the schema conflict with or duplicate existing tables?"
   - "Check: Are there API endpoints in the PRD that the RFC doesn't define?"
   - "Check: Do the RFC's relationships match the PRD's descriptions?"
3. Architect returns: `{ "approved": true/false, "issues": [...] }`
4. If approved → proceed to task decomposition (same `cmd_plan()` invocation)
5. If not approved → print issues, exit with `EXIT_GATE_FAILURE` (human fixes RFC, re-runs)

## Files changed

| File | Change |
|------|--------|
| `speed/speed` | Add `cmd_intake()`, modify `cmd_plan()` for RFC review + sizing gate |
| `speed/agents/intake.md` | New file — Intake Agent definition |
| `speed/agents/architect.md` | Add RFC review prompt section |

## Dependencies

- Phase 1 templates must exist (output format for the agent)
- Requires a working agent provider (e.g., Claude Code)
