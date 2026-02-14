# F3: Projects, Collaborator Verification & GitHub Import

## Context

This spec covers projects, collaborator verification, and GitHub import for **Find Your Tribe**, a proof-of-work social network for builders. For full product vision, positioning, personas, and success metrics, see [overview.md](./overview.md). For the complete PRD, see [../PRD.md](../PRD.md).

**Find Your Tribe** is a platform where your identity is defined by what you have shipped, not what you claim. Projects are the atomic unit of the platform -- every reputation signal, every discovery result, and every tribe is anchored to real, shipped work. The platform answers: **What have you actually built, and who did you build it with?**

---

## Feature Summary

Projects are the foundational data entity of Find Your Tribe. A project represents something a builder has shipped -- code, design, a go-to-market strategy, an operational system, or any other tangible work product. Projects have rich metadata (title, description, role, links, tech stack, status, impact metrics) and support mutual collaborator verification, which is the trust backbone of the platform. GitHub import allows engineers to auto-populate projects from their repositories.

This feature has three components:
1. **Project Creation & Management** -- creating, editing, and archiving projects
2. **Collaborator Invitations & Verification** -- the mutual verification system
3. **GitHub Project Import** -- auto-populating projects from GitHub repos

---

## MoSCoW Priority

| Component | Priority |
|---|---|
| Project Creation & Management | **Must** |
| Collaborator Invitations & Verification | **Must** |
| Project Detail Pages | **Must** |
| GitHub Project Import | **Should** |
| Impact Metrics (users, revenue, downloads, stars) | **Should** |

---

## User Stories

### Project Showcase

| ID | Story | Priority |
|---|---|---|
| PR-1 | As a builder, I want to create a project with title, description, role, links, tech stack, and status so that I can showcase what I have built. | Must |
| PR-2 | As a builder, I want to invite collaborators to my project so that our shared work is mutually verified. | Must |
| PR-3 | As a collaborator, I want to confirm or decline a collaboration invite so that only real working relationships are recorded. | Must |
| PR-4 | As a builder, I want to add impact metrics (users, revenue, downloads, GitHub stars) to a project so that outcomes are visible. | Should |
| PR-5 | As a builder, I want to import a project from a GitHub repository so that the name, description, languages, and stars auto-populate. | Should |
| PR-6 | As a visitor, I want to view a project detail page with full information, collaborators, and links so that I can evaluate the work. | Must |
| PR-7 | As a builder, I want to update a project's status (shipped, in progress, archived) so that my portfolio reflects current state. | Must |

### Related Onboarding Story

| ID | Story | Priority |
|---|---|---|
| O-4 | As an engineer signing up, I want to import projects from my GitHub repositories so that I do not have to manually re-enter my portfolio. | Should |
| O-5 | As a new builder, I want to see a prompt to add my first project during onboarding so that I immediately contribute a build artifact. | Must |

---

## Project Data Model

A project consists of:

- **Title:** Name of the project
- **Description:** What was built and why
- **Role:** What the builder's role was on this project (e.g., "Lead Engineer," "Product Designer," "Growth Lead")
- **Links:** External links -- live URL, repository, app store listing, case study, etc.
- **Tech Stack:** Technologies used (tags from a searchable list, e.g., React, Python, Figma, Webflow)
- **Status:** Shipped / In Progress / Archived
- **Impact Metrics (optional):** Users, revenue, downloads, GitHub stars, or other quantifiable outcomes
- **Collaborators:** Other builders who worked on the project (mutually verified)
- **Creator:** The builder who created the project entry

---

## Collaborator Verification System

### How It Works

1. Builder A creates a project and invites Builder B as a collaborator.
2. Builder B receives the invitation.
   - If Builder B is already on the platform, they see the invitation in their account.
   - If Builder B is NOT on the platform, they receive a personalized signup invitation: "Maya tagged you as a collaborator on ProjectX. Claim your profile."
3. Builder B can **confirm** or **decline** the collaboration.
4. Only confirmed collaborations are displayed publicly on the project and on both builders' profiles.
5. Unconfirmed collaborators are never shown.

### Key Product Decision: Mutual Verification

**Decision:** When a builder tags a collaborator on a project, the collaborator must confirm the relationship before it appears publicly.

**Rationale:** This is the trust foundation of the platform. On LinkedIn, anyone can claim they worked at any company or on any project. On Find Your Tribe, collaboration claims are bilateral. This makes every displayed collaborator relationship a verified signal. It also creates a natural viral loop: inviting a collaborator who is not yet on the platform sends them a signup invitation.

### Viral Loop

Collaborator invitations are the primary organic growth mechanism:
- Every time a builder tags a collaborator who is not on the platform, they receive a personalized invitation
- Target: 50% of collaborator invitations to non-members result in a new signup
- Target: 30% of all signups come through collaborator invitations

---

## GitHub Project Import

### How It Works

1. Builder connects their GitHub account (via GitHub OAuth, either at signup or later).
2. Builder navigates to "Import from GitHub" (available during onboarding or from project creation).
3. Platform displays a list of the builder's GitHub repositories.
4. Builder selects a repository to import.
5. The following fields auto-populate:
   - **Title:** Repository name
   - **Description:** Repository description
   - **Tech Stack:** Repository languages
   - **Impact Metrics:** GitHub stars (auto-populated)
6. Builder adds their role and any additional details manually.
7. Project is created with the imported data.

### Rationale

GitHub import reduces friction for engineers and solves the cold-start "empty profile" problem. Engineers who connect GitHub immediately have a populated profile, giving discovery something to index from day one.

---

## Project Detail Page

The project detail page is a full view of a project, accessible to any visitor. It includes:

- Title and description
- Builder's role on the project
- External links (clickable)
- Tech stack tags
- Status (shipped / in progress / archived)
- Impact metrics (if provided)
- Collaborators section -- list of mutually verified collaborators with links to their profiles
- Link back to the project creator's profile

---

## Relevant Personas

- **Maya Chen (Indie Hacker):** Creates detailed project entries for her 3 shipped products with live links, tech stacks, and impact metrics. Imports from GitHub. Invites collaborators.
- **James Okafor (Agency Escapee):** Builds projects focused on his side project and independent design work. Cannot showcase NDA agency work, so his side project IS his proof-of-work.
- **Priya Sharma (Senior Engineer):** Imports GitHub projects and adds open-source contributions. Invites collaborators from her open-source work.
- **David Morales (Non-Technical Founder):** Creates projects based on operational work: systems he designed, workflows he optimized, operational playbooks he built. Not code, but shipped work. Evaluates technical builders by their project history.

---

## Relevant Risks

### Non-Technical User Adoption

The project creation flow must make it clear that a "project" is not just code. Examples in the UI should include: "a brand identity you designed," "a go-to-market strategy you executed," "an operational system you built." Role-specific prompts should be shown when the builder's role is non-technical.

### Quality Control -- Preventing Gaming

- **Link verification.** Projects require external links (live URL, repository, app store listing). These are verifiable.
- **Mutual verification is structural.** Fake collaborations require two accounts to collude -- a much higher bar than unilateral endorsements.
- **Builder Score is multi-signal.** Empty projects without descriptions, links, or collaborators contribute minimally to Builder Score.

### Cold Start -- GitHub Import as Bootstrapping

Engineers who connect GitHub immediately have a populated profile. This reduces the "empty profile" problem and gives discovery something to index from day one.

---

## Success Metrics

| Metric | Definition | Target |
|---|---|---|
| **Project creation rate** | % of signups who add at least 1 project within 7 days | 40% |
| **Time to first project** | Median time from signup to first project created | Under 15 minutes |
| **Projects per builder per month** | Average projects created or updated per active builder per month | 1.5 |
| **Verified collaborator rate** | % of projects with at least one mutually verified collaborator | 30% |
| **Project completeness** | % of projects with description, at least one link, and tech stack tags | 60% |
| **Collaborator invite conversion** | % of collaborator invitations that result in a new signup | 50% |
| **Collaborator connections per month** | Total new mutual collaborator verifications per month | Growing 20% MoM |

---

## Dependencies

```
Authentication & Onboarding (F1)
  |
  v
Builder Profiles (F2)
  |
  v
Project Creation & Management (this feature)
  |
  v
Collaborator Verification (this feature)
  |
  +-------> Builder Score (F7)
  |
  +-------> Tribe Formation (F4)
  |
  +-------> Build Feed (F6)
  |
  +-------> Project Discovery (F5)
  |
  v
GitHub Import (this feature)
  |
  v
AI Search & Matching (F5, Could Have)
```

Projects depend on authentication (F1) and builder profiles (F2). They are a prerequisite for builder score (F7), tribe formation (F4), build feed (F6), and project discovery (F5). Collaborator verification is a prerequisite for Builder Score computation.

---

## Implementation Status

| Component | Status | Notes |
|-----------|--------|-------|
| Project model (backend) | Built | SQLAlchemy model with all fields |
| Project GraphQL type | Built | Strawberry type with collaborators, tech stack |
| Seed data (projects) | Built | 20+ demo projects with varied tech stacks |
| Project Card (frontend) | Built | With status badge, tech stack tags, impact pills |
| Project detail page | Not built | |
| Project creation form | Not built | |
| Collaborator invitation flow | Not built | |
| Collaborator verification UI | Not built | |
| GitHub import | Not built | V2 feature |

## Out of Scope (V1)

- AI-powered project analysis (auto-extracting tech stack from URLs/repos)
- Project comments or reactions
- Project forking or cloning
- Media uploads (screenshots, videos) -- projects link to external assets
- Project version history or changelogs
