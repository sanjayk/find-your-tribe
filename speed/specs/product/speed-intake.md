# Phase 2: Intake Agent

> Parent RFC: [Unified Intake & Defect Pipeline](../spec-templates-defects-integrations.md)
> Depends on: [Phase 1: Spec Templates](speed-templates.md)

## Problem

Templates solve the blank-page structure problem but not the blank-page content problem. A user with an idea still has to fill in every section manually. The Intake Agent bridges the gap: give it rough input and it drafts structured specs the human reviews and refines.

## Users

### SPEED Operator
Has a feature idea or bug report. Wants to get from rough description to reviewable specs without manually filling every template section. Needs drafts that are good enough to review and refine, not perfect.

### Team Lead
Receives feature requests from GitHub Issues, Linear, or conversations. Wants to convert them into SPEED-ready specs without re-typing everything into templates.

## User Stories

| ID | Story | Priority |
|----|-------|----------|
| S1 | As an operator, I want to describe a feature in plain text and get draft PRD + RFC + Design specs | Must |
| S2 | As an operator, I want to describe a bug and get a draft defect report | Must |
| S3 | As an operator, I want the agent to classify my input as feature or defect automatically | Must |
| S4 | As an operator, I want to override the classification if the agent gets it wrong | Must |
| S5 | As an operator, I want the RFC draft to reflect my existing codebase (tables, API patterns) | Must |
| S6 | As an operator, I want TODO markers in sections the agent couldn't fill so I know what to complete | Must |
| S7 | As an operator, I want large inputs automatically split into right-sized spec triplets | Should |
| S8 | As a team lead, I want to pull a GitHub issue into SPEED as a spec draft | Should (Phase 4 — external adapters) |

## User Flows

### Draft specs from a description

1. User runs `./speed/speed intake "users should be able to invite friends to their tribe"`
2. Intake Agent classifies input as "feature"
3. Intake Agent reads codebase (existing models, API patterns, vision file, existing specs)
4. Intake Agent drafts three specs:
   - `specs/product/tribe-invites.md` (PRD)
   - `specs/tech/tribe-invites.md` (RFC)
   - `specs/design/tribe-invites.md` (design)
5. Agent marks sections it couldn't fill with `<!-- TODO: ... -->` markers
6. SPEED prints the file paths and a summary of gaps
7. User opens files, reviews, edits, refines
8. User runs `speed plan specs/tech/tribe-invites.md` when satisfied

### Draft a defect report

1. User runs `./speed/speed intake "tribe invites fail when invitee has no GitHub"`
2. Intake Agent classifies input as "defect"
3. Intake Agent drafts `specs/defects/tribe-invite-no-github.md`
4. SPEED prints the path
5. User reviews/edits the report
6. User runs `speed defect specs/defects/tribe-invite-no-github.md` to start triage

### Force classification

1. User runs `./speed/speed intake "..." --as feature`
2. Intake Agent skips classification, drafts as feature
3. Flow continues as above

### Auto-split large input

1. User runs `./speed/speed intake "build a reading app with bookshelves, activity feeds, and challenges"`
2. Intake Agent identifies three distinct feature areas
3. Intake Agent drafts three separate spec triplets with cross-references
4. SPEED prints all 9 file paths grouped by feature, with suggested dependency ordering

## Success Criteria

- [ ] `speed intake "<description>"` drafts spec files to `specs/` and prints their paths
- [ ] Agent correctly classifies features vs. defects in >80% of cases (no external measurement — just reasonable behavior)
- [ ] `--as feature` and `--as defect` override classification
- [ ] Feature input produces all three specs (PRD + RFC + design)
- [ ] Defect input produces one defect report
- [ ] RFC drafts reference existing codebase tables and API patterns where relevant
- [ ] Unfillable sections have `<!-- TODO: ... -->` markers
- [ ] Agent output includes a summary of gaps (what it couldn't determine)
- [ ] Multi-feature inputs produce separate spec triplets with dependency cross-references
- [ ] Spec files follow the canonical template format from Phase 1
- [ ] `speed intake` stops after drafting — does not auto-chain into `speed plan` or `speed defect`

## Scope

### In Scope
- Intake Agent definition (`speed/agents/intake.md`)
- `speed intake` CLI command
- Classification (feature vs. defect vs. design change)
- Agent-assisted drafting with codebase awareness
- TODO markers for gaps
- Spec sizing: auto-split at draft time for multi-feature inputs
- `--as` flag for classification override

### Out of Scope (and why)
- External system adapters (GitHub, Linear, JIRA, Figma) — Phase 4+
- Defect pipeline execution — Phase 3 (this phase only drafts defect reports, doesn't triage or fix)
- Architect RFC review — already exists in the `speed plan` flow, not part of intake
- Interactive clarification (agent asking follow-up questions) — future enhancement

## Dependencies

- Phase 1 (Spec Templates) — templates must exist as the output format for the Intake Agent
- Requires a coding agent provider (e.g., Claude Code) for the Intake Agent

## Risks

| Risk | Severity | Mitigation |
|------|----------|------------|
| RFC drafts are low quality, requiring heavy human editing | Medium | The RFC is a starting point. Codebase awareness helps. The Architect RFC review (during `speed plan`) catches technical issues. |
| Classification gets it wrong (feature labeled as defect or vice versa) | Low | `--as` flag provides override. Agent errors are caught at the human review gate. |
| Large inputs split poorly | Medium | The Architect's 8-task hard gate catches bad splits during planning. Human reviews all drafts before planning. |
