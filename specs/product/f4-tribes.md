# F4: Tribe Formation, Join & Management

## Context

This spec covers tribe formation, joining, and management for **Find Your Tribe**, a proof-of-work social network for builders. For full product vision, positioning, personas, and success metrics, see [overview.md](./overview.md). For the complete PRD, see [../PRD.md](../PRD.md).

**Find Your Tribe** is a platform where your identity is defined by what you have shipped, not what you claim. Tribes are the collaboration mechanism -- small groups of complementary builders who come together to build something. The platform is the only one designed specifically for assembling high-leverage small teams, not freelancer-client transactions.

---

## Feature Summary

A tribe is a team of builders with complementary skills, either actively building together or recruiting members. Tribes have a name, mission statement, current members, and open roles. Builders can create tribes, browse and search tribes, request to join, and manage membership. Tribes are the key differentiator of Find Your Tribe -- no other platform offers structured team formation around shipped work.

This feature has three components:
1. **Tribe Creation & Management** -- creating tribes, defining roles, managing status
2. **Tribe Join Requests** -- requesting to join, accepting/declining
3. **Tribe Page** -- viewing members, open roles, and status (with contextual owner controls)

---

## MoSCoW Priority

| Component | Priority |
|---|---|
| Tribe Creation & Management | **Should** |
| Tribe Discovery (browse and search) | **Should** |
| Tribe Join Requests | **Should** |

**Note:** Tribes are a "Should Have" feature -- a key differentiator that significantly improves the experience but is not a blocker for initial launch. The rationale: tribes require a critical mass of builders to be meaningful. Discovery and projects must come first to build that base.

---

## User Stories

| ID | Story | Priority |
|---|---|---|
| T-1 | As a builder, I want to create a tribe with a name, mission, and open roles so that I can recruit co-builders. | Should |
| T-2 | As a builder, I want to search tribes via a single search bar (matching skills, roles, members, regions) so that I can find teams to join. | Should |
| T-3 | As a builder, I want to request to join a tribe for a specific open role so that the owner knows what I'm offering. | Should |
| T-4 | As a tribe owner, I want to accept or decline join requests so that I control team composition. | Should |
| T-5 | As a tribe member, I want to see the tribe page with members, open roles, and status so that I have context on the team. | Should |
| T-6 | As a tribe owner, I want open roles to be automatically marked as filled when I approve a member who applied for that role. | Should |
| T-7 | As a tribe member (non-owner), I want to leave a tribe so that I can move on. | Should |

---

## Tribe Data Model

A tribe consists of:

- **Name:** Tribe name (e.g., "Hospitality OS")
- **Mission:** Mission statement (e.g., "Building an operations platform for boutique hotels")
- **Owner:** The builder who created the tribe
- **Members:** List of builders in the tribe (including owner)
- **Open Roles:** Roles the tribe needs filled (e.g., "Backend Engineer," "Product Designer"), with optional skill requirements
- **Status:** Open (recruiting members) / Active (full team, building) / Alumni (past collaboration)
- **Max Members:** Owner-defined team size (positive integer, no upper bound)

---

## Key Product Decision: Tribes Are Teams, Not Communities

**Decision:** Tribes have no enforced size cap. The owner sets `max_members` to whatever makes sense for their team.

**Rationale:** This is not a community platform or a Discord alternative. Tribes represent working teams — builders actively collaborating on a project. Most will naturally stay small, but the platform doesn't impose an artificial limit.

---

## User Flow: Creating a Tribe and Recruiting Members

```
1. Builder navigates to the Tribes section and clicks "Create a Tribe."
2. Builder fills in tribe details:
   a. Tribe name (e.g., "Hospitality OS").
   b. Mission statement (e.g., "Building an operations platform for boutique hotels").
   c. Current members: auto-includes the creator. Can share the tribe link
      via personal channels (WhatsApp, SMS, email) to invite builders.
   d. Open roles: selects roles needed (e.g., "Backend Engineer," "Product Designer")
      with optional skill requirements.
3. Tribe is created with status "Open." (Backend: `createTribe` creates the tribe,
   then `addOpenRole` is called for each role — two-step creation.)
4. Tribe appears in discovery for builders browsing tribes.
5. Other builders find the tribe via discovery:
   a. They search using a single search bar (matches tribe name, mission,
      skills, roles, member names, regions).
   b. They click into the tribe page to see the mission, current members
      (with links to their profiles), and open roles.
6. A builder clicks "Request to Join" for a specific open role.
7. The tribe owner receives the join request:
   a. They review the requesting builder's profile and projects.
   b. They accept or decline the request.
8. If accepted:
   a. The new member appears on the tribe page.
   b. The open role they applied for is automatically marked as filled.
9. The owner manually transitions the tribe status via Edit Tribe
   (Open → Active when the team is ready, Active → Alumni when done).
```

## User Flow: Finding and Joining a Tribe

```
1. Builder sets their availability to "Open to tribe" on their profile.
2. Builder navigates to Discover and selects the "Tribes" tab.
3. Builder types into a single search bar. No filter dropdowns.
   The search matches across tribe name, mission, open role titles,
   skills needed, member names, and member timezones/regions.
   Examples: "React", "hotel", "Europe", "Maya Chen", "Python backend"
4. Builder browses matching tribes (all statuses shown; open, active, alumni).
5. Builder clicks into a tribe that interests them:
   a. Reads the mission statement.
   b. Reviews current members by clicking through to their profiles.
   c. Checks the open roles to see if their skills match.
6. Builder clicks "Request to Join" for a specific open role.
7. Builder waits for the tribe owner to review and respond.
8. If accepted, builder sees the tribe on their profile and can view
   the tribe page as a member.
```

---

## Tribe Page (`/tribe/:id`)

The tribe page is public. It shows the tribe's mission, members, open roles, and status. There is no separate dashboard — the same page renders contextual controls based on who is viewing it:

- **Visitor / non-member:** Sees the public page. Can click "Request to Join" on open roles (if tribe is open).
- **Member (non-owner):** Sees the public page plus a "Leave Tribe" action.
- **Owner:** Sees the public page plus inline management controls throughout — edit tribe, remove members, add/edit/remove roles, and a "Pending Requests" section below open roles.

Public page includes:
- Tribe name and mission statement
- Status overline (Open / Active / Alumni)
- Current members with links to their profiles
- Open roles with skill requirements and join CTAs
- Owner attribution and creation date

---

## Relevant Personas

- **Maya Chen (Indie Hacker):** Creates an open tribe for her product with "Designer" and "Growth" as open roles. Browses open tribes that need an engineer.
- **James Okafor (Agency Escapee):** Sets status to "Open to tribe." Browses engineers who have shipped design-related tools. Joins a tribe that needs a designer.
- **Priya Sharma (Senior Engineer):** Creates a tribe around a fintech idea, listing non-engineering roles she needs. Uses discovery to find designers and growth people in overlapping timezones.
- **David Morales (Non-Technical Founder):** Searches for engineers who have built in hospitality or marketplace verticals. Browses open tribes that need operational or domain expertise.

---

## Relevant Risks

### Cold Start

Tribes require a critical mass of builders with complete profiles and projects to be meaningful. If launched too early, discovery will return empty results and the feature will feel broken. **Mitigation:** Tribes are "Should Have," not "Must Have," precisely because they depend on the builder and project base being established first.

### Non-Technical User Adoption

Non-technical builders may be more motivated by "find a technical co-builder" than by "showcase your portfolio." Position tribe discovery as the primary value proposition for this segment. Tribes are the hook that draws non-technical founders (like David Morales) into the platform.

### Retention

Builders in tribes have a reason to check the tribe page for updates and new join requests. Tribe activity is a key re-engagement surface.

---

## Success Metrics

| Metric | Definition | Target |
|---|---|---|
| **Tribes formed per month** | New tribes created per month | Growing after tribe feature launch |
| **Join request rate** | % of tribes that receive at least one join request within 2 weeks | Tracked post-launch |
| **Tribe fill rate** | % of open roles that get filled | Tracked post-launch |

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
Tribe Formation (this feature) -------> Tribe Discovery (F5)
```

Tribes depend on authentication (F1), builder profiles (F2), and projects (F3). Tribe formation is a prerequisite for tribe discovery (F5). Tribes also feed into the build feed (F6) as "tribe forming" events.

---

## Implementation Status

| Component | Status | Notes |
|-----------|--------|-------|
| Tribe model (backend) | Built | SQLAlchemy model with members, open roles, enums |
| Tribe GraphQL type | Built | TribeType, TribeMemberType, OpenRoleType |
| Tribe GraphQL queries | Built | `tribe(id)` and `tribes(limit, offset, status)` |
| Tribe GraphQL mutations | Built | create, update, add/remove role, request join, approve, reject, remove, leave |
| Tribe service layer | Built | `tribe_service.py` with all CRUD and membership ops |
| MemberStatus enum | Built | 5 values: pending, active, rejected, left, removed |
| Seed data (tribes) | Built | 3 demo tribes in various states |
| Tribe Card (frontend) | Built | Compact card with members, tech stack |
| Tribe detail page | Built | Hero, members grid, open roles grid, skeleton, not-found |
| Frontend GraphQL queries | Built | GET_TRIBE, GET_TRIBES |
| Frontend GraphQL mutations | Built | All 8 mutations wired up |
| Tribe creation form | Built | `create-tribe-modal.tsx` exists |
| Join request flow (UI) | Built | Request to Join button with role_id works |
| Owner contextual controls | Built | Pending requests, member/role management, edit tribe modal exist |

### Design Gaps (built but not matching design spec)

These components are functionally built but the **visual design does not match** `specs/design/f4-tribes.md`. This is the remaining work:

| Gap | Current Implementation | Design Spec |
|-----|----------------------|-------------|
| Detail page layout | Wide multi-column grid layout (~1080px) | Single editorial column, 680px max-width, centered |
| Members section | 3-column card grid, each member a separate card | Single `surface-elevated` card with vertical list rows, 48px avatars |
| Open Roles section | Separate cards in a 2-column grid | Single `surface-elevated` card with subtle dividers between roles |
| Status overline | Shows "OPEN" / "ACTIVE" with green dot | Should be "OPEN TRIBE" / "ACTIVE TRIBE" / "ALUMNI TRIBE" with terracotta/shipped/ink-tertiary colors |
| Creator attribution | Shows "Formed February 2026" only | Should show "Created by [Av] Maya Chen · March 2025" with avatar; "You created this" for owner |
| Members count in header | "3 / 8 members" below title | "3 / 5" right-aligned in Members section header |
| Member role badges | No OWNER/MEMBER badges (except Owner badge on some members) | Caption uppercase badges: OWNER (accent-subtle bg) and MEMBER (surface-secondary bg) for all members |
| Open roles button | "Request to Join" positioned next to title | Should be right-aligned primary button within the role row |
| Nav link | No "Tribes" link in main nav | Tribes section should be accessible from nav |
| Create Tribe CTA | No "Create a Tribe" button on /tribes discovery page | Discovery page needs a "Create a Tribe" button |
| Profile tribe display | "Hospitality OS" + "3 builders" in a basic section | Compact inline with accent strip: `│▌ Hospitality OS · MEMBER · 3/5 members · ● Open │` |
| Discovery accent strips | Correct colors | Verify terracotta for Open, accent for Active, ink-tertiary for Alumni |
| Leave Tribe button styling | May use accent/primary | Should be ghost button with error text (sm) |
| Active tribe "Request to Join" | Buttons visible | Spec: tribe not open → roles shown but no buttons |

## TBD

- **Associated Project** — Linking a tribe to the project it's building (FK on `tribes` or `projects`). Not yet in the data model, search, or UI. Deferred until projects and tribes are both stable.
- **Notifications** — Owners need to know when someone requests to join. Builders need to know when they're approved or rejected. No notification system exists yet.
- **Ownership transfer** — Currently the owner cannot leave (must archive). Transferring ownership to another member is not yet specced.
- **Pagination on pending requests** — If a tribe receives many join requests, the owner needs a way to page through them.

## Out of Scope (V1)

- In-tribe messaging or chat (builders use external tools)
- Tribe project management tools (kanban, tasks, etc.)
- Tribe recommendations (AI-suggested tribes based on skills)
- Multiple active projects per tribe
- Tribe analytics or activity metrics
- Tribe dissolution or archival workflows (manual for V1)
