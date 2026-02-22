# RFC: {Feature Name}

> See [{product-spec}]({product-spec}) for product context.
> Depends on: [{dep}]({dep}).

## Basic Example
<!-- A concrete code snippet, API call, or GraphQL query showing the feature
     in action. Grounds the reader before the detailed design.
     This is the React RFC pattern — show what it looks like to USE the feature
     before explaining how it works. Omit if not applicable. -->

## Data Model
<!-- Tables, columns, relationships, constraints.
     This becomes the contract source of truth. Be precise about types,
     nullability, defaults, and foreign keys.
     Read by: Architect (contract generation), Coherence Checker (interface verification) -->

## State Machine
<!-- If applicable: valid states, transitions, triggers, side effects.
     A table or diagram is better than prose. Include impossible transitions
     explicitly ("archived → active is not allowed because...").
     Omit this section if the feature has no stateful entities. -->

## API Surface
<!-- Endpoints, GraphQL types, mutations, queries.
     For each: input types, return types, error cases.
     Be specific about error responses — "returns 400" is not enough.
     "Returns 400 with {field, message} when name exceeds 100 chars" is.
     Read by: Architect (task decomposition), Developer (implementation), Coherence Checker -->

## Validation Rules
<!-- Business logic constraints. What inputs are rejected and why?
     These become test cases. Every rule here should map to at least one test. -->
| Field | Constraints |
|-------|-------------|
| | |

## Security & Controls
<!-- Auth: which endpoints need authentication? What roles/permissions?
     Data: any PII? Encryption at rest or in transit?
     Input: sanitization rules, injection prevention.
     Rate limiting: which endpoints? What limits?
     Audit: what actions get logged?
     Think OWASP top 10 for this specific feature. -->

## Key Decisions
<!-- Architectural choices and their rationale. The "Alternatives Considered"
     column is the most important — it proves you did the thinking.
     If alternatives is empty, you haven't explored the design space.
     Read by: Plan Verifier (checks for semantic drift from stated rationale) -->
| Decision | Choice | Alternatives Considered | Rationale |
|----------|--------|------------------------|-----------|
| | | | |

## Drawbacks
<!-- Why should we NOT do this? Implementation cost, complexity, maintenance burden.
     "There are no drawbacks" is never true. Every design choice trades something.
     Be honest — this section builds trust with reviewers and catches problems
     you'd otherwise discover during implementation. -->

## Search / Query Strategy
<!-- If applicable: indexing approach, query patterns, expected performance.
     Include estimated data volumes and access patterns.
     Omit this section if the feature doesn't introduce new queries. -->

## Migration Strategy
<!-- If changing existing data: how do we get from A to B safely?
     Sequence: migrations first or code first? Feature flags? Phased rollout?
     What's the rollback plan if something goes wrong?
     Omit this section if there are no data changes. -->

## File Impact
<!-- Which files, modules, or services does this change touch?
     e.g., "src/backend/app/models/tribe.py (new model),
     src/backend/app/graphql/mutations/tribe.py (new mutations),
     src/frontend/components/features/tribe-card.tsx (new component)"
     Helps the Architect scope tasks and the Developer navigate the codebase. -->

## Dependencies
<!-- What must exist before this can be built?
     Be specific: not "needs auth" but "needs the User model from F1 and
     the session middleware from PR #23." -->

## Unresolved Questions
<!-- What parts of the design are still TBD? What needs investigation?
     Each question should state what it blocks and a proposed path to resolve.
     This section should shrink to zero before speed plan runs. -->
