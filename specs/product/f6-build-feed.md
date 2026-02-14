# F6: Build Feed

## Context

This spec covers the build feed for **Find Your Tribe**, a proof-of-work social network for builders. For full product vision, positioning, personas, and success metrics, see [overview.md](./overview.md). For the complete PRD, see [../PRD.md](../PRD.md).

**Find Your Tribe** is a platform where your identity is defined by what you have shipped, not what you claim. The build feed is an extension of this principle -- it surfaces building activity, not social content. Every item in the feed represents something someone actually made or a team that is forming. It is a changelog, not a social media timeline.

---

## Feature Summary

The build feed is a chronological feed of build activity across the platform. It displays new projects shipped, tribes forming, new builders joining, and milestone updates on active projects. Every feed item links to a concrete artifact (project, tribe, or profile). The feed does not include text-only posts, reactions, comments, or any content not tied to a build artifact.

---

## MoSCoW Priority

| Component | Priority |
|---|---|
| Build Feed (chronological activity feed) | **Could** |
| Feed Filtering (by category) | **Could** |
| Feed Item Linking (to underlying artifact) | **Could** |

**Note:** The build feed is a "Could Have" feature -- valuable for engagement but not core to finding collaborators. It can wait for post-MVP iterations. The primary engagement drivers in V1 are discovery (F5) and collaborator invitations (F3).

---

## User Stories

| ID | Story | Priority |
|---|---|---|
| F-1 | As a builder, I want to see a chronological feed of build activity (new projects, forming tribes, new builders) so that I stay informed about the community. | Could |
| F-2 | As a builder, I want to filter the feed by category (projects, tribes, builders) so that I see what is relevant to me. | Could |
| F-3 | As a builder, I want each feed item to link to the underlying artifact so that I can explore further. | Could |

---

## Feed Item Types

The feed displays four types of events:

1. **New Project Shipped** -- A builder creates a new project with status "Shipped"
   - Shows: project title, brief description, creator name, tech stack tags
   - Links to: project detail page

2. **Tribe Forming** -- A builder creates a new tribe with open roles
   - Shows: tribe name, mission (truncated), open roles, creator name
   - Links to: tribe page

3. **New Builder Joined** -- A new builder completes onboarding
   - Shows: builder name, headline, role, key skills
   - Links to: builder profile

4. **Milestone Update** -- A project status changes or significant update is made
   - Shows: project title, what changed, builder name
   - Links to: project detail page

---

## Key Product Decisions

### No text-only posts

**Decision:** The platform does not support text-only posts, articles, status updates, or any content that is not tied to a build artifact.

**Rationale:** This is the defining anti-LinkedIn differentiator. LinkedIn's feed is dominated by performative content -- motivational posts, hot takes, engagement farming. Find Your Tribe's feed is exclusively build artifacts. Every item represents something someone actually made. It keeps the signal-to-noise ratio high and prevents the platform from devolving into a content game.

### Feed is build artifacts only

**Decision:** The feed displays only: new projects shipped, tribes forming, builders joining, and milestone updates. Every feed item links to a concrete artifact.

**Rationale:** The feed exists to surface building activity, not to be a content consumption experience. It should feel more like a changelog than a social media timeline.

### No reactions, comments, or engagement mechanics

The feed does not include likes, reactions, comments, shares, or any engagement mechanics. These features incentivize performative behavior and content optimization. The feed is informational -- if a builder sees something interesting, they click through to the artifact and evaluate the work directly.

---

## Feed Display

- **Sort:** Chronological (newest first)
- **Filters:** By category -- All / Projects / Tribes / Builders
- **Pagination:** Infinite scroll or paginated (implementation decision)
- **Each item includes:** Timestamp, event type indicator, summary, and link to artifact

---

## Relevant Personas

- **Maya Chen (Indie Hacker):** Browses the feed to see what other builders are shipping. Discovers potential collaborators through their shipped projects in the feed.
- **James Okafor (Agency Escapee):** Checks the feed for tribes forming that need a designer.
- **Priya Sharma (Senior Engineer):** Monitors the feed for interesting projects in her domain (fintech, backend systems).
- **David Morales (Non-Technical Founder):** Uses the feed to understand what the community is building and identify engineers working in his space.

---

## Relevant Risks

### Cold Start

During early platform life, the feed may be sparse. **Mitigations:**
- Curate and highlight interesting projects in the build feed during the early phase to make the platform feel alive
- Seed with curated builders who have active projects
- The feed is "Could Have" precisely because it depends on activity volume

### Scope Creep Toward LinkedIn

User requests may push for text posts, reactions, comments, follower counts, or content algorithms. **Mitigation:** The "no text-only posts" and "feed is build artifacts only" decisions are documented as product principles, not V1 constraints. Any feature request that conflicts must clear a high bar. Decision framework: "Does this reward building or performing?"

### Retention

The build feed is a potential re-engagement surface. If implemented, it gives builders a reason to browse regularly and stay informed about community activity. However, it is not the primary retention driver -- connections made through discovery and tribes are.

---

## Success Metrics

| Metric | Definition | Target |
|---|---|---|
| **Feed sessions per week** | Average feed views per active builder per week | Tracked post-launch |
| **Feed-to-artifact click-through** | % of feed views that result in clicking through to a project, tribe, or profile | Tracked post-launch |

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
  +-------> Build Feed (this feature)
  |
  +-------> Tribe Formation (F4) -------> Build Feed (this feature)
```

The build feed depends on projects (F3), profiles (F2), and optionally tribes (F4) to generate feed items. It is downstream of all content-creating features. The feed has no features that depend on it.

---

## Implementation Status

| Component | Status | Notes |
|-----------|--------|-------|
| FeedEvent model (backend) | Built | SQLAlchemy model with all event types |
| FeedEvent GraphQL type | Built | Strawberry type with actor, metadata |
| Seed data (feed events) | Built | Generated from demo users/projects/tribes |
| Feed page (frontend) | Not built | |
| Feed filtering | Not built | |
| Feed card component | Not built | Design spec exists in components.md |

## Out of Scope (V1)

- Text-only posts, articles, or status updates
- Reactions (likes, claps, upvotes)
- Comments on feed items
- Personalized or algorithmic feed ranking
- Follow-based feed (showing only people you follow)
- Push or email notifications for feed activity
- Bookmarking or saving feed items
