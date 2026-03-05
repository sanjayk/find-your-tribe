# F11: Builder Matching

## Problem

Discovery on Find Your Tribe is pull-based. A builder opens the Discover page, sets filters, scrolls through cards, clicks into profiles, and evaluates each one manually. The friction is high enough that most builders browse once or twice and stop. The platform knows what skills each builder has, what skills their projects use, what roles their tribes need filled, and where the gaps are — but it does nothing with that knowledge. Builders are left to find complementary collaborators through manual search, the same way they would on LinkedIn or Twitter.

The data for intelligent matching already exists. Users have skills, roles, timezones, availability statuses, shipped projects with tech stacks, tribe memberships with open roles, and Builder Scores. The `embedding` column on the User model (pgvector, 1536 dimensions) is populated but unused. Connecting these signals into proactive suggestions turns the platform from a directory into a matchmaker.

## Users

**Maya (Indie Hacker)** — Has shipped 3 projects solo, all React + Python. She needs a designer and a growth person but has never searched for either because she doesn't know what filters to set for "designer who ships." She wants the platform to surface people whose shipped work proves they can execute.

**James (Agency Escapee)** — His entire network is other designers. He has never met an engineer socially. He set his availability to "Open to tribe" three weeks ago and nothing happened. He needs the platform to introduce him to engineers whose projects need design help.

**Priya (Senior Engineer)** — She wants to find a product person and a growth marketer in overlapping timezones (IST +/- 4 hours). She tried the timezone filter on Discover but the results were sparse. She'd rather the platform show her 3 strong matches than make her construct the query herself.

**David (Non-Technical Founder)** — He can't evaluate engineers. He doesn't know React from Rails. He needs the platform to recommend engineers who have actually shipped in his domain (hospitality, marketplaces) so he can evaluate based on output rather than resume keywords.

## User Stories

| ID | Story | Acceptance Criteria | Priority |
|----|-------|---------------------|----------|
| BM-1 | As a builder, I want to see suggested co-builders on my profile page so that I can discover complementary people without searching. | Given I am viewing my own profile, When the page loads, Then a "Suggested Co-Builders" section displays up to 3 builder cards ranked by match strength. | Must |
| BM-2 | As a builder, I want match suggestions to reflect skills I lack, not skills I have, so that I find complementary collaborators. | Given I am an engineer with React and Python skills, When I view suggestions, Then suggested builders have design, growth, or product skills rather than more engineering skills. | Must |
| BM-3 | As a builder, I want to understand why someone was suggested so that I can evaluate the match quickly. | Given a suggested builder card, When I view it, Then a match reason line explains the suggestion (e.g., "Designer with 2 shipped projects · IST timezone"). | Must |
| BM-4 | As a builder, I want suggestions to prioritize builders who are available for collaboration so that I don't reach out to people who aren't interested. | Given a builder with availability "Just browsing", When the matching algorithm runs, Then that builder is deprioritized or excluded from suggestions. | Should |
| BM-5 | As a builder, I want to dismiss a suggestion I'm not interested in so that future suggestions improve. | Given a suggested builder card, When I click dismiss, Then the card disappears and that builder is not suggested again. | Should |
| BM-6 | As a tribe owner, I want to see suggested builders for my tribe's open roles so that I can recruit targeted candidates. | Given I am viewing my tribe's page and it has unfilled open roles, When the page loads, Then each open role shows up to 3 suggested builders whose skills match the role requirements. | Should |

## User Flows

### Flow 1: Viewing suggestions on own profile

```
1. Builder navigates to their own profile (/profile/[username]).
2. Below the projects section, a "Suggested Co-Builders" section loads.
3. Section shows up to 3 builder cards, each with:
   - Avatar, name, headline, Builder Score
   - Match reason line (e.g., "Complements your stack · UX Design, Prototyping")
   - Primary role badge
4. Builder clicks a card → navigates to that builder's profile.
5. Builder clicks dismiss (×) on a card → card fades out, not shown again.
6. When all 3 are dismissed, section shows "Check back soon" message.
```

### Flow 2: Viewing suggestions for tribe open roles

```
1. Tribe owner navigates to their tribe page (/tribe/[id]).
2. Under each unfilled open role, a "Suggested Builders" subsection shows up to 3 cards.
3. Each card shows the builder's name, relevant skills, Builder Score, and match reason
   (e.g., "Has React + Node.js · 3 shipped projects").
4. Tribe owner clicks a card → navigates to builder's profile to evaluate further.
5. Tribe owner invites builder through existing tribe join flow.
```

### Flow 3: Builder with insufficient data

```
1. New builder with no skills and no projects visits their profile.
2. "Suggested Co-Builders" section shows an empty state:
   "Add skills and projects to your profile to get matched with co-builders."
3. Link to /settings for profile completion.
```

## Success Criteria

- [ ] Suggested co-builders appear on own-profile page for builders with at least 2 skills
- [ ] Suggestions are complementary: the overlap between the viewer's skills and suggested builder's skills is less than 50%
- [ ] Match reason line is present on every suggestion and references at least one concrete attribute (skill, role, project count, timezone)
- [ ] Builders with availability "Just browsing" do not appear in suggestions unless fewer than 3 available builders match
- [ ] Dismiss persists across sessions (stored server-side)
- [ ] Tribe role suggestions show builders whose skills intersect with the role's `skills_needed`
- [ ] Matching query completes in under 200ms for the profile page (3 results)
- [ ] Empty state renders when the builder has fewer than 2 skills

## Scope

### In Scope

- Backend matching service that scores builder pairs by skill complementarity, timezone proximity, availability, and Builder Score
- GraphQL query `suggestedBuilders(limit: Int)` on the authenticated user, returning ranked matches with reason strings
- GraphQL query `suggestedBuildersForRole(roleId: ID!, limit: Int)` on TribeOpenRole
- Frontend "Suggested Co-Builders" section on the profile page (own profile only)
- Frontend "Suggested Builders" subsection on tribe open roles (tribe owner only)
- Dismiss mutation (`dismissSuggestion(builderId: ID!)`) persisted in a `dismissed_suggestions` table
- Match reason generation (deterministic, template-based — not LLM-generated)
- Empty state when builder has insufficient profile data
- Seed data: ensure enough skill diversity across seed users for meaningful matches

### Out of Scope (and why)

- **Embedding-based semantic matching** — The `embedding` column exists on User and Project but is not populated with meaningful vectors yet. Populating embeddings requires an LLM pipeline (generate embeddings from profile + project text). The V1 matching algorithm uses structured data (skills, roles, timezone, availability) which is sufficient and deterministic. Embedding-based matching is the V2 upgrade path.
- **"Builders like you" (similarity matching)** — Complementarity is the goal, not similarity. Suggesting builders with the same skills defeats the purpose. Similarity matching may be useful for community features later.
- **Email or push notification of new matches** — The platform does not send notifications (product decision). Matches surface when the builder visits their profile.
- **Two-way match confirmation (mutual interest)** — Adds complexity without proportional value in V1. Suggestions are one-directional recommendations. Mutual matching is a V2 feature that could enable a "handshake" flow.
- **Match quality feedback ("Was this helpful?")** — Requires a feedback UI and analytics pipeline. Dismiss is sufficient signal for V1.

## Dependencies

- **F2 (Builder Profiles)** — Skills, role, timezone, availability data on the User model. Already built.
- **F4 (Tribes)** — TribeOpenRole with `skills_needed` for role-based matching. Already built.
- **F7 (Builder Score)** — Used as a tiebreaker signal in ranking. Score field exists; computation is partial.
- **F9 (Profile Completeness)** — The empty state nudge leverages the same "is this profile filled enough" concept. Already built.

## Security & Controls

- **Authentication:** `suggestedBuilders` requires an authenticated session. Returns matches only for the requesting user.
- **Authorization:** `suggestedBuildersForRole` is restricted to the tribe owner. Other members and visitors do not see role-based suggestions.
- **Privacy:** Dismissed suggestions are stored per-user and never exposed to other users. The `dismissed_suggestions` table contains only user ID pairs and a timestamp.
- **No PII exposure:** Suggestions return the same public profile data already available on the Discover page. No private data is surfaced through matching.
- **Rate limiting:** The matching query is read-only and bounded (max 10 results per call). No additional rate limiting required beyond existing GraphQL query limits.

## Risks

| Risk | Severity | Mitigation |
|------|----------|------------|
| Cold start: new builders with few skills get poor or no matches | Medium | Empty state with clear guidance ("Add skills and projects..."). Minimum threshold of 2 skills before suggestions appear. |
| Skill taxonomy gaps: builders use different words for the same skill | Low | Skills are selected from a predefined list (Skill model), not free-text. The taxonomy is controlled. |
| Matching feels stale if the same 3 people appear for weeks | Medium | Factor recency into scoring. Recently active builders score higher. Dismissed builders are excluded permanently. |
| Performance: matching N builders against all others is O(N²) | Low | V1 uses pre-filtered SQL queries (filter by complementary skill categories, availability, timezone range) then scores the top candidates. With seed-scale data (<1000 users), this is fast. Index on `primary_role` + `availability_status` already exists. |

## Open Questions

None.
