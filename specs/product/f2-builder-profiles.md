# F2: Builder Profiles

## Context

This spec covers builder profiles for **Find Your Tribe**, a proof-of-work social network for builders. For full product vision, positioning, personas, and success metrics, see [overview.md](./overview.md). For the complete PRD, see [../PRD.md](../PRD.md).

**Find Your Tribe** is a platform where your identity is defined by what you have shipped, not what you claim. Your profile is your portfolio. Your reputation is earned through shipped projects and verified collaborations. The platform answers: **What have you actually built, and who did you build it with?**

---

## Feature Summary

Builder profiles are the core identity layer of the platform. A profile is not a resume -- it is a portfolio of shipped work. Profiles display a builder's role, skills, timezone, availability status, projects (as a grid), verified collaborators, Builder Score, and external contact links. Both the profile owner and visitors can view profiles. Builders can edit their own profiles to keep them current.

---

## MoSCoW Priority

| Component | Priority |
|---|---|
| Builder Profiles (view and edit with portfolio display) | **Must** |
| Profile Detail Pages (public view) | **Must** |
| Availability Status (open to tribe, available for projects, just browsing) | **Should** |

---

## User Stories

| ID | Story | Priority |
|---|---|---|
| P-1 | As a builder, I want to edit my profile (name, headline, avatar, role, skills, timezone) so that it accurately reflects who I am. | Must |
| P-2 | As a builder, I want to set my availability status (open to tribe, available for projects, just browsing) so that others know my intent. | Must |
| P-3 | As a builder, I want to see my Builder Score on my profile so that I understand my reputation standing. | Should |
| P-4 | As a builder, I want to see all my projects displayed in a grid on my profile so that visitors see my portfolio at a glance. | Must |
| P-5 | As a builder, I want to see my verified collaborators on my profile so that my working relationships are visible. | Must |
| P-6 | As a visitor, I want to view any builder's public profile so that I can evaluate whether to collaborate with them. | Must |

---

## Profile Data Model

A builder profile consists of:

- **Identity:** Full name, avatar (optional), headline (e.g., "Full-stack engineer building fintech tools")
- **Role:** Primary role from predefined list (Engineer, Designer, PM, Marketer, Growth, Founder, Other)
- **Skills:** Up to 10 skills from a searchable list, plus custom skills
- **Timezone:** Builder's timezone
- **Availability status:** Open to tribe / Available for projects / Just browsing
- **Projects grid:** All projects created by or verified for the builder, displayed as a visual grid
- **Verified collaborators:** List of builders with mutually confirmed collaboration relationships
- **Builder Score:** Computed reputation metric (displayed when available, see F7)
- **External contact links:** Twitter, email, Calendly, or other external contact methods (for V1 outreach -- no in-platform messaging)

---

## Key Product Decisions

### No in-platform messaging for V1

**Decision:** Builders contact each other through external channels (email, Twitter, Calendly links on profiles). The platform does not include messaging, DMs, or chat.

**Rationale:** Messaging is a massive feature surface area -- real-time infrastructure, spam prevention, abuse moderation, notification systems, read receipts, and more. The platform's core value is discovery and evaluation, not communication. Builders who find each other can use any of dozens of existing communication tools.

**Implication for profiles:** Profiles must include prominent external contact links so that visitors have a clear way to reach out after evaluating a builder.

### Profile is a portfolio, not a resume

The profile does not have fields for job history, education, company names, or traditional resume content. The identity is built entirely from: what you have built (projects), who you built it with (collaborators), your skills, and your availability. This is the anti-LinkedIn positioning.

---

## User Flow: Evaluating a Builder's Profile

This flow is part of the discovery experience (see F5) but is included here because it describes how profiles are consumed.

```
1. Visitor (another builder) lands on a profile page.
2. Visitor reviews:
   a. Headline and role -- quick understanding of who this person is.
   b. Projects grid -- clicks into 1-2 projects to see what they shipped.
   c. Collaborators section -- sees who they have built with and whether
      those relationships are verified.
   d. Builder Score -- quick reputation signal.
   e. Availability status -- are they looking for collaborators?
3. Visitor decides this person is a good fit.
4. Visitor uses the external contact link (Twitter, email, Calendly) on
   the profile to reach out.
```

---

## Relevant Personas

- **Maya Chen (Indie Hacker):** Creates detailed project entries for her 3 shipped products. Profile becomes a strong portfolio. Uses "Open to tribe" status. Evaluates potential collaborators by looking at their project history and builder scores.
- **James Okafor (Agency Escapee):** Builds a profile focused on his side project and independent design work, not agency clients. Sets status to "Open to tribe" and lists the roles he is looking for.
- **Priya Sharma (Senior Engineer):** Imports GitHub projects and adds open-source contributions. Uses discovery to find builders in overlapping timezones.
- **David Morales (Non-Technical Founder):** Creates projects based on operational work. Evaluates technical builders by their project history and verified collaborations, which he can understand even without technical depth.

---

## Relevant Risks

### Non-Technical User Adoption

Non-technical builders (designers, PMs, marketers, founders) may struggle to see their work reflected in a "projects" grid. The profile and project system must communicate that a "project" is any shipped work, not just code.

### Retention Beyond Initial Profile Setup

Builders may sign up, create their profile, then have no reason to return. The profile must serve as a living portfolio that builders want to keep updated -- new projects, new collaborators, evolving availability status.

---

## Success Metrics

| Metric | Definition | Target |
|---|---|---|
| **Profile completion rate** | % of signups who complete all onboarding fields | 70% |
| **Monthly active builders** | Builders who log in and perform at least one meaningful action per month | 60% of registered builders |

---

## Dependencies

```
Authentication & Onboarding (F1)
  |
  v
Builder Profiles (this feature) -------> Builder Discovery (F5)
  |
  v
Project Creation (F3)
```

Builder profiles depend on authentication and onboarding (F1) to exist. They are a prerequisite for builder discovery (F5) and are tightly coupled with projects (F3) since the project grid is the core of the profile.

---

## Implemented Profile Sections

### Shipping Proof
- **Aggregate Impact Row**: Total GitHub stars, shipped count, and total users across all projects — displayed as large mono numbers at the top of the content area.
- **Split Projects**: Projects separated into "Currently Building" (with amber pulse dot) and "Shipped" sections instead of a flat grid.
- **Impact Metrics**: Each project card shows key metrics (users, companies, downloads) as accent-colored pills.
- **Shipping Timeline**: Horizontal time axis showing project dots positioned by creation date. Shipped = filled accent dot, in-progress = outlined amber dot. Hover reveals title.

### Social Proof
- **Tribes**: Tribe cards showing name, mission, member avatars (overlapping circles), member count, and open role count.
- **Collaborator Network ("Built With")**: Unique collaborators deduplicated across all projects (excluding self), rendered as overlapping avatar circles with links to their profiles.

### AI Workflow Signals ("How They Build")

FYT exists in the AI era. The platform asks "What have you built, and who did you build it with?" — the natural extension is "How do you build?" In 2026, a builder's AI workflow is a real compatibility signal:

- A swarm builder and a minimal builder may clash on process
- Tool preferences indicate workflow maturity
- Human/AI ratio indicates working style

This positions FYT as the only professional network that understands how modern builders work.

**Data captured:**
- **Workflow style** (enum): pair, swarm, review, autonomous, minimal — describes how the builder collaborates with AI agents
- **Agent tools** (JSONB list): tools and frameworks the builder uses (e.g., "Claude Code", "Cursor", "GitHub Copilot", "Aider")
- **Human/AI ratio** (float 0-1): self-reported ratio of human vs AI contribution in their workflow (0.0 = fully human, 1.0 = fully AI)

**User stories:**

| ID | Story | Priority |
|---|---|---|
| P-7 | As a builder, I want to set my AI workflow style so that potential collaborators understand how I work. | Should |
| P-8 | As a visitor, I want to see a builder's AI tools and workflow on their profile so that I can assess compatibility. | Should |

### Building Activity ("Burn Map")

The burn map is proof-of-work made visual. It answers: "Is this builder actively shipping, or is this a stale profile?" For tribe formation, this is critical — you want active co-builders, not dormant ones.

Displayed as a dot grid (similar to GitHub's contribution graph but simpler), showing building activity over the past 12 months. Each dot represents a week; intensity indicates activity level.

**V1 data source**: Platform activity events — project creation/updates, collaborator confirmations, tribe activity. These already exist as feed events.

**Future**: Integration with AI tool providers for actual token consumption data.

| ID | Story | Priority |
|---|---|---|
| P-9 | As a visitor, I want to see a builder's activity history so that I know they are actively shipping. | Should |

### Working Style Signals (Sidebar)
- **Timezone Overlap**: Shows builder's timezone plus calculated work-hour overlap (9am-6pm) with viewer's timezone.
- **Preferred Stack**: Top 5 technologies derived from all projects' tech stacks, shown as horizontal bars proportional to frequency.
- **Role Pattern**: Label derived from project ownership — "Usually the founder", "Versatile builder", or "Independent builder".

### Existing Gaps Fixed
- **Headline**: Rendered below display name in italic.
- **Twitter + LinkedIn**: Rendered from `contactLinks` JSON alongside GitHub and website.
- **Real Collaborators on ProjectCard**: Built from actual `project.collaborators` data instead of hardcoding owner-only.

---

## Implementation Status

| Component | Status | Notes |
|-----------|--------|-------|
| User model (backend) | Built | SQLAlchemy model with all profile fields including agent workflow |
| User GraphQL type | Built | Strawberry type with resolvers for skills, projects, tribes |
| Profile page (`/profile/[username]`) | Partial | Page exists with layout, queries wired, but uses mock data fallback |
| Builder Card | Built | Featured and list variants |
| Project Card | Built | With shipping status and impact metrics |
| Score Display | Partial | Component shell exists |
| Shipping Timeline | Partial | Component exists, needs real data integration |
| Collaborator Network | Partial | Component exists, needs real data integration |
| Agent Workflow Card | Partial | Component exists, needs backend query integration |
| Burn Map | Partial | Component exists, needs feed event aggregation query |
| Seed data (users) | Built | 10+ demo builders with realistic profiles |
| Edit profile page | Not built | |
| Avatar upload | Not built | |

## Out of Scope (V1)

- Job history, education, or company name fields
- In-platform messaging or DMs
- Follower / following relationships
- Profile analytics (who viewed your profile)
