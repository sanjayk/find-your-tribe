# F4: Tribe Formation, Join & Management

## Context

This spec covers tribe formation, joining, and management for **Find Your Tribe**, a proof-of-work social network for builders. For full product vision, positioning, personas, and success metrics, see [overview.md](./overview.md). For the complete PRD, see [../PRD.md](../PRD.md).

**Find Your Tribe** is a platform where your identity is defined by what you have shipped, not what you claim. Tribes are the collaboration mechanism -- small groups of complementary builders who come together to build something. The platform is the only one designed specifically for assembling high-leverage small teams, not freelancer-client transactions.

---

## Feature Summary

A tribe is a small team (2-8 members) of builders with complementary skills, either actively building together or recruiting members. Tribes have a name, mission statement, current members, and open roles. Builders can create tribes, browse and filter open tribes, request to join, and manage membership. Tribes are the key differentiator of Find Your Tribe -- no other platform offers structured team formation around shipped work.

This feature has three components:
1. **Tribe Creation & Management** -- creating tribes, defining roles, managing status
2. **Tribe Join Requests** -- requesting to join, accepting/declining
3. **Tribe Dashboard** -- viewing members, active project, and status

---

## MoSCoW Priority

| Component | Priority |
|---|---|
| Tribe Creation & Management | **Should** |
| Tribe Discovery (browse and filter) | **Should** |
| Tribe Join Requests | **Should** |

**Note:** Tribes are a "Should Have" feature -- a key differentiator that significantly improves the experience but is not a blocker for initial launch. The rationale: tribes require a critical mass of builders to be meaningful. Discovery and projects must come first to build that base.

---

## User Stories

| ID | Story | Priority |
|---|---|---|
| T-1 | As a builder, I want to create a tribe with a name, mission, and open roles so that I can recruit co-builders. | Should |
| T-2 | As a builder, I want to browse open tribes filtered by skills needed, timezone, and project type so that I can find teams to join. | Should |
| T-3 | As a builder, I want to request to join a tribe so that I can offer my skills to a team. | Should |
| T-4 | As a tribe creator, I want to accept or decline join requests so that I control team composition. | Should |
| T-5 | As a tribe member, I want to see a tribe dashboard with members, the active project, and status so that I have context on the team. | Should |
| T-6 | As a tribe creator, I want to mark roles as filled so that the tribe's open positions are accurate. | Should |

---

## Tribe Data Model

A tribe consists of:

- **Name:** Tribe name (e.g., "Hospitality OS")
- **Mission:** Mission statement (e.g., "Building an operations platform for boutique hotels")
- **Creator:** The builder who created the tribe
- **Members:** List of builders in the tribe (2-8 members, including creator)
- **Open Roles:** Roles the tribe needs filled (e.g., "Backend Engineer," "Product Designer"), with optional skill requirements
- **Status:** Open (has unfilled roles) / Active (all roles filled) / Closed
- **Associated Project:** The project the tribe is building (optional, links to F3)

---

## Key Product Decision: Tribes Are Small by Design

**Decision:** Tribes are capped at 2-8 members.

**Rationale:** This is not a community platform or a Discord alternative. Tribes represent working teams -- small groups of complementary builders actively collaborating on a project. The 2-8 range reflects the reality of high-leverage small teams in the AI era. Larger groups can form multiple tribes.

---

## User Flow: Creating a Tribe and Recruiting Members

```
1. Builder navigates to the Tribes section and clicks "Create a Tribe."
2. Builder fills in tribe details:
   a. Tribe name (e.g., "Hospitality OS").
   b. Mission statement (e.g., "Building an operations platform for boutique hotels").
   c. Current members: auto-includes the creator. Can invite existing platform builders.
   d. Open roles: selects roles needed (e.g., "Backend Engineer," "Product Designer")
      with optional skill requirements.
3. Tribe is created with status "Open."
4. Tribe appears in discovery for builders browsing open tribes.
5. Other builders find the tribe via discovery:
   a. They filter by skills needed, timezone, or project type.
   b. They click into the tribe page to see the mission, current members
      (with links to their profiles), and open roles.
6. A builder clicks "Request to Join" and selects the role they want to fill.
7. The tribe creator receives the join request:
   a. They review the requesting builder's profile and projects.
   b. They accept or decline the request.
8. If accepted:
   a. The new member appears on the tribe page.
   b. The open role is marked as filled (or remains open if multiple slots exist).
   c. The tribe status updates based on whether roles are still open.
9. When all roles are filled, the tribe status changes to "Active."
```

## User Flow: Finding and Joining a Tribe

```
1. Builder sets their availability to "Open to tribe" on their profile.
2. Builder navigates to Discover and selects the "Tribes" tab.
3. Builder applies filters:
   a. Skills needed: e.g., "React, TypeScript" (matches their skills).
   b. Timezone: compatible with their own.
4. Builder browses open tribes.
5. Builder clicks into a tribe that interests them:
   a. Reads the mission statement.
   b. Reviews current members by clicking through to their profiles.
   c. Checks the open roles to see if their skills match.
6. Builder clicks "Request to Join" for a specific open role.
7. Builder waits for the tribe creator to review and respond.
8. If accepted, builder sees the tribe on their profile and gains access
   to the tribe dashboard.
```

---

## Tribe Page

The tribe page is a public view of a tribe. It includes:

- Tribe name and mission statement
- Current members with links to their profiles
- Open roles with skill requirements
- Tribe status (Open / Active / Closed)
- Associated project (if linked)

## Tribe Dashboard

The tribe dashboard is visible only to tribe members. It includes:

- All information from the tribe page
- Pending join requests (visible to creator only)
- Active project status and details

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

Builders in tribes have a reason to check the tribe dashboard for updates and new join requests. Tribe activity is a key re-engagement surface.

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

## Out of Scope (V1)

- In-tribe messaging or chat (builders use external tools)
- Tribe project management tools (kanban, tasks, etc.)
- Tribe recommendations (AI-suggested tribes based on skills)
- Multiple active projects per tribe
- Tribe analytics or activity metrics
- Tribe dissolution or archival workflows (manual for V1)
