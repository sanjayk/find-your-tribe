# F7: Builder Score Algorithm

## Context

This spec covers the Builder Score algorithm for **Find Your Tribe**, a proof-of-work social network for builders. For full product vision, positioning, personas, and success metrics, see [overview.md](./overview.md). For the complete PRD, see [../PRD.md](../PRD.md).

**Find Your Tribe** is a platform where your identity is defined by what you have shipped, not what you claim. Builder Score is the computed reputation metric that quantifies this principle -- it is derived entirely from objective signals tied to real building activity, not from social engagement or self-reported claims.

---

## Feature Summary

Builder Score is a computed reputation metric displayed on builder profiles and used to rank discovery results. It is derived algorithmically from four objective signal categories: shipped projects, mutual collaborator verifications, project impact metrics, and profile completeness. There is no way to directly increase your score through platform activity like posting or commenting. The formula is transparent so builders understand what it measures.

---

## MoSCoW Priority

| Component | Priority |
|---|---|
| Builder Score Computation | **Should** |
| Builder Score Display (on profiles and search results) | **Should** |
| Builder Score Transparency (how it is calculated) | **Should** |

**Note:** Builder Score is a "Should Have" feature -- it significantly improves discovery quality but needs project data to be meaningful. It cannot be launched until there are enough projects and collaborator verifications to make the score informative rather than arbitrary.

---

## User Stories

| ID | Story | Priority |
|---|---|---|
| BS-1 | As a builder, I want my Builder Score to be computed from my shipped projects, collaborator vouches, impact metrics, and profile completeness so that it reflects genuine building activity. | Should |
| BS-2 | As a builder, I want to understand how my Builder Score is calculated so that I know what contributes to my reputation. | Should |
| BS-3 | As a visitor, I want to see a builder's score on their profile and in search results so that I can quickly gauge reputation. | Should |

---

## Score Inputs

Builder Score is derived from four signal categories:

### 1. Shipped Projects

- Number of projects with status "Shipped"
- Project completeness: description, links, tech stack tags all present
- Recency: more recent projects may carry slightly more weight
- Empty or incomplete projects contribute minimally

### 2. Collaborator Verifications

- Number of mutually verified collaborator relationships
- This is the hardest signal to fake -- it requires another real builder to confirm
- More verified collaborators across different projects indicates a stronger builder

### 3. Impact Metrics (when provided)

- Users, revenue, downloads, GitHub stars, or other quantifiable outcomes
- These are optional and self-reported, so they carry weight but do not dominate
- Having impact metrics at all signals a builder who thinks about outcomes

### 4. Profile Completeness

- All onboarding fields completed (name, headline, role, skills, timezone)
- Avatar uploaded
- Availability status set
- External contact links provided
- This is the easiest signal to maximize, so it carries the least weight

---

## Key Product Decision: Builder Score Is Computed, Not Gamed

**Decision:** Builder Score is derived algorithmically from objective signals. There is no way to directly increase your score through platform activity like posting or commenting.

**Rationale:** Any system that rewards activity will be gamed. LinkedIn's algorithm rewards engagement, so people optimize for engagement over substance. Builder Score must correlate with actual building output. The inputs are hard to fake: you need real projects, real collaborators who verify you, and real impact metrics. The formula will be transparent so builders understand what it measures, but there is no shortcut to inflating it.

### Anti-Gaming Properties

- **Mutual verification is structural.** Fake collaborations require two accounts to collude. This is a much higher bar than LinkedIn's unilateral endorsements.
- **Multi-signal.** No single input dominates the score. A builder cannot inflate their score by creating many empty projects -- project completeness, impact metrics, and collaborator count all factor in.
- **Link verification.** Projects require external links that are verifiable. In future versions, the AI layer can crawl and validate these links.
- **Transparency.** Publishing the formula discourages gaming because the community can identify and call out manipulation.

---

## Score Display

### On Builder Profiles

- Builder Score is displayed prominently on the profile page
- A brief explanation or link to "How is this calculated?" is provided
- The score updates as the builder adds projects, receives collaborator verifications, etc.

### In Discovery Results

- Builder Score is shown on each builder card in discovery results
- Discovery results are sorted by Builder Score by default (see F5)
- This ensures high-quality builders surface first in search

### Transparency Page

- A page or section explaining the Builder Score calculation
- Lists the four input categories and their relative importance
- Explains what does and does not contribute to the score
- Emphasizes that the score reflects building activity, not platform engagement

---

## Score Distribution Goals

The Builder Score distribution across the platform should form a healthy bell curve, not a bimodal distribution (where most builders have either very low or very high scores). A bimodal distribution would indicate that the score is not differentiating meaningfully.

**Target:** Normal (bell curve) distribution of Builder Scores across the platform.

---

## Relevant Personas

- **Maya Chen (Indie Hacker):** High Builder Score due to 3 shipped projects, verified collaborators, impact metrics ($2K MRR), and complete profile. She evaluates potential collaborators by looking at their builder scores.
- **James Okafor (Agency Escapee):** Moderate Builder Score. His NDA agency work cannot be showcased, so his score comes primarily from his side project and profile completeness. His score will grow as he ships more independent work and gains collaborator verifications.
- **Priya Sharma (Senior Engineer):** Strong Builder Score from open-source contributions (GitHub stars as impact metrics) and verified collaborators from open-source work.
- **David Morales (Non-Technical Founder):** Lower initial Builder Score since his "projects" are operational systems that may not have traditional impact metrics. His score grows as he adds collaborators and receives verifications. He uses other builders' scores to evaluate technical talent he cannot assess himself.

---

## Relevant Risks

### Quality Control -- Preventing Gaming

- Users may attempt to create fake projects, inflate impact metrics, or form reciprocal verification rings
- **Mitigations:** Multi-signal scoring, mutual verification requirement, link verification, community reporting, and transparency (see Key Product Decision above)

### Score Meaningfulness at Low Data Volume

At launch, most builders will have 0-1 projects and 0 collaborator verifications. The score may not differentiate meaningfully. **Mitigation:** Builder Score is "Should Have," not "Must Have." Launch it only when there is enough data to make it informative. In early stages, discovery can sort by profile completeness or recency instead.

### Non-Technical Builder Score Disparity

Non-technical builders (designers, PMs, founders) may systematically score lower if the algorithm over-weights code-related signals (GitHub stars, tech stack complexity). **Mitigation:** Ensure all four signal categories are role-neutral. Impact metrics should include revenue, users, and downloads -- not just GitHub stars. Collaborator verifications are equally available to all roles.

---

## Success Metrics

| Metric | Definition | Target |
|---|---|---|
| **Builder Score distribution** | Distribution shape across all builders | Healthy bell curve |
| **Score correlation with collaboration** | Whether higher-scored builders receive more collaboration invitations | Positive correlation |
| **Transparency engagement** | % of builders who view the "How is Builder Score calculated?" page | Tracked post-launch |

---

## Dependencies

```
Authentication & Onboarding (F1)
  |
  v
Builder Profiles (F2)
  |
  v
Project Creation (F3) + Collaborator Verification (F3)
  |
  v
Builder Score (this feature) -------> Ranked Discovery (F5)
```

Builder Score depends on projects (F3) and collaborator verifications (F3) to have meaningful inputs. It is consumed by discovery (F5) for ranking results and displayed on builder profiles (F2).

---

## Out of Scope (V1)

- Score decay over time (penalizing inactive builders)
- Score weighting based on collaborator quality (PageRank-style recursive scoring)
- Score badges or tiers (e.g., "Top Builder," "Rising Builder")
- Comparative scoring (leaderboards, rankings)
- AI-powered fraud detection for gaming
- Score export or embedding (for use on external sites)
