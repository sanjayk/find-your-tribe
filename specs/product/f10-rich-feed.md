# F10: Rich Feed

## Problem

The authenticated feed page renders event data as a bare text list with raw ULID references. Builders navigating from the polished landing page hit a wall of `project / 01KJJ0QT88JYFTRF9EKBRDCDC1` strings. The feed is the primary surface for seeing what's happening in the community, and right now it communicates nothing about the actors, projects, or tribes involved.

## Users

**Maya (Indie Hacker)** — Checks the feed daily to spot potential collaborators and interesting projects. A text dump of event types gives her no reason to scroll or click through.

**James (Product Designer)** — Uses the feed to find projects that need design help. Without project context (tech stack, team size), he can't evaluate opportunities at a glance.

**David (Growth Marketer)** — Browses the feed to find tribes and projects where his skills add value. Names and mission statements matter more than ULIDs.

## User Stories

| ID | Story | Acceptance Criteria | Priority |
|----|-------|---------------------|----------|
| RF-1 | As a builder, I want to see who performed each action in the feed, so I can discover interesting people. | Given a feed event with an actor, When the feed renders, Then the actor's name and avatar (initials with deterministic color) are visible on a timeline node. | Must |
| RF-2 | As a builder, I want to see project details inline when someone ships or starts building, so I can evaluate the work without leaving the feed. | Given a PROJECT_SHIPPED event, When the feed renders, Then a milestone card with gradient header, project name, and tech stack is visible. Given a PROJECT_CREATED event, Then a content embed with project icon, name, and tech stack is visible. | Must |
| RF-3 | As a builder, I want to see tribe context when a tribe is formed or someone joins, so I can discover tribes worth joining. | Given a TRIBE_CREATED event, When the feed renders, Then the tribe name and mission are visible as a content embed. Given a MEMBER_JOINED_TRIBE event, Then the tribe name is visible as a compact activity line. | Must |
| RF-4 | As a builder, I want to see skills when a new builder joins, so I can spot complementary skill sets. | Given a BUILDER_JOINED event, When the feed renders, Then the builder's skills are shown inline as monospace text separated by `/`. | Must |
| RF-5 | As a builder, I want feed items to link to the relevant profile, project, or tribe, so I can explore further. | Given any feed event with a target, When I click the event, Then I navigate to the target's detail page. | Should |

## User Flows

### Flow 1: Browsing the feed (authenticated)
1. Builder navigates to `/feed` from the nav
2. Page shows skeleton loading state matching the timeline shape (avatar circles + content areas)
3. Feed loads as a vertical timeline: a thin thread connects avatar nodes, each event shows actor avatar + name, action text, timestamp, and a body appropriate to the event's visual type
4. Milestone events (ships) command attention with gradient-header cards. Content embeds (new projects, new tribes) provide enough context to evaluate. Activity lines (joins) stay compact and scannable.
5. Builder scrolls, sees "Load more" button if more events exist
6. Builder clicks a shipped project card → navigates to `/project/[id]`

### Flow 2: Empty feed
1. New user with no community activity navigates to `/feed`
2. Empty state renders with guidance ("When builders ship projects...")

## Success Criteria
- [ ] Feed renders as a vertical timeline with connected avatar nodes
- [ ] Four visual types are distinct: milestones (tall, gradient), content embeds (medium, structured), text cards (quote-block), activity lines (compact, one-line)
- [ ] All 8 event types render with actor name and avatar (initials-based, deterministic color)
- [ ] PROJECT_SHIPPED renders as a milestone card with gradient header, project name, and tech stack
- [ ] PROJECT_CREATED renders as a content embed with icon, project name, and tech stack
- [ ] TRIBE_CREATED renders as a content embed with tribe name and mission
- [ ] BUILDER_JOINED renders skills inline as monospace text with `/` separators
- [ ] PROJECT_UPDATE and TRIBE_ANNOUNCEMENT render as text cards with quoted content and source attribution
- [ ] Activity lines (MEMBER_JOINED_TRIBE, COLLABORATION_CONFIRMED, BUILDER_JOINED) are compact and scannable
- [ ] Feed items link to their target detail page (project, tribe, or profile)
- [ ] No raw ULIDs visible to the user
- [ ] Hover states: cards show subtle background tint; activity lines underline actor name

## Scope

### In Scope
- Replace the `EventCard` component in `feed/page.tsx` with a timeline layout using four visual types (milestone, content embed, text, activity line)
- Vertical timeline thread connecting avatar nodes
- Deterministic gradient generation for milestone cards (hash project title → gradient palette)
- Deterministic avatar initials and colors from actor names (hash → color palette)
- Map API metadata fields to rendered components
- Add navigation links from feed items to target detail pages
- Enrich seed event metadata with `actor_name` and `actor_username` where missing
- Hover interactions on cards and activity lines
- Updated skeleton loading state matching the timeline shape

### Out of Scope (and why)
- **Backend actor resolution via dataloaders** — the feed already stores actor info in metadata. Resolving actors server-side is an optimization for a later phase when metadata denormalization becomes a maintenance burden.
- **Real-time feed updates (WebSocket/SSE)** — the feed is currently poll-based. Real-time adds infrastructure complexity with no proportional user benefit at current scale.
- **Feed filtering by event type** — the landing page previews a filter bar (All/Ships/Tribes/People) but this is additive UX that can ship separately.
- **Tribe member avatars on TRIBE_CREATED** — the API metadata doesn't include member data. Enriching events with member lists adds backend complexity; tribe name + mission is sufficient context.
- **GitHub star counts in feed** — would require live GitHub API calls or cached data. Stars are in seed metadata but shouldn't be treated as a reliable field.

## Dependencies

- F6 (Build Feed) — the feed query, event model, and seed data already exist
- F1 (Auth) — the feed page requires authentication for the nav state

## Security & Controls

- Feed is read-only. No mutations introduced.
- All feed data is public — events about shipped projects and tribe formations are community-visible by design.
- No PII beyond display names and usernames, which are already public on profiles.

## Risks

| Risk | Severity | Mitigation |
|------|----------|------------|
| Metadata fields vary across seed events (some have `actor_name`, some don't) | Medium | Enrich seed data to guarantee consistent metadata fields. Frontend falls back gracefully when fields are missing. |
| Deterministic gradients may produce clashing or muddy color combinations | Low | Curated palette of 4 gradient pairs, all tested against the warm surface background. Hash selects from vetted options only. |

## Open Questions

None.
