# F{n}: {Feature Name}

## Problem
<!-- Why does this need to exist? Focus on user pain, not the solution.
     2-3 sentences max. If you can't explain the problem in one paragraph,
     you don't understand it yet. Avoid "we need X" — describe what the
     user suffers without it.
     Read by: Architect (decomposition), Product Guardian (vision alignment) -->

## Users
<!-- Which personas are affected? Describe by their problems, not demographics.
     "Sarah, 34, marketing manager" adds zero signal. "A team lead who can't
     see which members are active" tells you what to build.
     Reference overview.md personas where applicable. -->

## User Stories
<!-- As a {persona}, I want to {action}, so that {outcome}.
     Every story needs acceptance criteria in Given/When/Then format —
     these become the Architect's task boundaries and the Reviewer's checklist.
     Read by: Architect (task decomposition), Plan Verifier (blind verification) -->
| ID | Story | Acceptance Criteria | Priority |
|----|-------|---------------------|----------|
| | | Given... When... Then... | Must / Should / Could |

## User Flows
<!-- Step-by-step interaction sequences. One flow per key scenario.
     Start from a concrete state ("User is on the profile page, not logged in").
     Include the unhappy paths — what happens when validation fails, when data
     is missing, when the user cancels halfway through.
     Read by: Architect (task boundaries), Reviewer (behavior verification) -->

## Success Criteria
<!-- Measurable outcomes with concrete thresholds. Not vibes — numbers.
     Bad: "Page loads fast." Good: "Profile page renders in < 2s on 3G."
     Bad: "Users can find tribes." Good: "Search returns results for 90% of
     queries with >= 1 matching tribe."
     Each criterion should be mechanically verifiable. -->
- [ ] Criterion 1
- [ ] Criterion 2

## Scope
### In Scope
- ...
### Out of Scope (and why)
<!-- The most underrated section. Explicit boundaries prevent scope creep
     more than any other mechanism. Every "out of scope" needs a reason —
     "because it's complex" isn't enough. "Because it requires the payments
     integration which ships in Phase 3" is. -->
- ...

## Dependencies
<!-- Explicit dependency graph between features. Not just "requires auth" but
     "Requires F3 (Auth) user model and session API — specifically the
     /auth/me endpoint for current user resolution."
     The Architect uses this to order tasks and detect blocking chains. -->

## Security & Controls
<!-- Authentication: which actions require login? Which roles?
     Authorization: who can see/edit/delete what?
     Data sensitivity: any PII? What needs encryption at rest?
     Rate limiting: any endpoints that need throttling?
     Audit logging: what actions should be logged? -->

## Risks
<!-- What could go wrong? Be honest — "there are no risks" is never true. -->
| Risk | Severity | Mitigation |
|------|----------|------------|
| | | |

## Open Questions
<!-- Unresolved decisions that block implementation. If this section is empty,
     you either have perfect clarity (unlikely) or haven't thought hard enough.
     Each question should state what decision it blocks and who can answer it. -->
