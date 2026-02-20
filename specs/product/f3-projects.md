# F3: Projects, Collaborator Verification & GitHub Import

## Context

This spec covers projects, collaborator verification, and GitHub import for **Find Your Tribe**, a proof-of-work social network for builders. For full product vision, positioning, personas, and success metrics, see [overview.md](./overview.md). For the complete PRD, see [../PRD.md](../PRD.md).

**Find Your Tribe** is a platform where your identity is defined by what you have shipped, not what you claim. Projects are the atomic unit of the platform -- every reputation signal, every discovery result, and every tribe is anchored to real, shipped work. The platform answers: **What have you actually built, and who did you build it with?**

---

## Feature Summary

Projects are the foundational data entity of Find Your Tribe. A project represents something a builder has shipped -- code, design, a go-to-market strategy, an operational system, or any other tangible work product.

Unlike a traditional portfolio item, a project on Find Your Tribe captures not just **what** was built and **who** built it, but **how** it was built -- the AI tools, build methodology, services, and a chronological build timeline that interleaves milestones with token burn data. This is the "build recipe" that makes the platform valuable to other builders evaluating collaborators.

Projects have rich metadata (title, description, role, links, tech stack, domain, AI tools, build style, services, impact metrics, build timeline) and support mutual collaborator verification, which is the trust backbone of the platform. GitHub import allows engineers to auto-populate projects from their repositories.

This feature has four components:
1. **Project Creation & Management** -- creating, editing, and progressively enriching projects
2. **Build Story** -- domain tags, AI tools, build style, services, and build timeline
3. **Collaborator Invitations & Verification** -- the mutual verification system
4. **GitHub Project Import** -- auto-populating projects from GitHub repos

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

## User Stories (New)

| ID | Story | Priority |
|---|---|---|
| PR-8 | As a builder, I want to tag my project with a domain (fintech, devtools, health, etc.) so that other builders can find work relevant to their industry. | Should |
| PR-9 | As a builder, I want to list the AI tools I used (Claude Code, Cursor, ChatGPT, etc.) so that my build methodology is visible. | Should |
| PR-10 | As a builder, I want to tag my build style (agent-driven, pair-programming, solo-with-ai, etc.) so that potential collaborators understand how I work. | Should |
| PR-11 | As a builder, I want to list the services my project depends on (Stripe, Supabase, Vercel, etc.) so that the full build recipe is documented. | Should |
| PR-12 | As a builder, I want to add milestones to a build timeline so that the story of how I built the project is visible. | Should |
| PR-13 | As a visitor, I want to see a build timeline that interleaves milestones with token burn data so that I can understand the effort and process behind a project. | Should |

---

## Project Data Model

A project consists of:

### Core Fields (set at creation)
- **Title:** Name of the project
- **Description:** What was built and why
- **Role:** What the builder's role was on this project (e.g., "Lead Engineer," "Product Designer," "Growth Lead")
- **Status:** Shipped / In Progress / Archived
- **Links:** External links -- live URL, repository, app store listing, case study, etc.
- **Creator:** The builder who created the project entry

### Build Story (enriched after creation)
- **Tech Stack:** Technologies used (tags, e.g., React, Python, Figma, Webflow)
- **Domains:** What industry/space the project is in (tags, e.g., fintech, devtools, health, hospitality, education)
- **AI Tools:** AI tools used to build (tags, e.g., Claude Code, Cursor, ChatGPT, Midjourney, v0, Copilot)
- **Build Style:** How the builder works (tags, e.g., agent-driven, pair-programming, human-led, solo-with-ai, no-code)
- **Services:** Infrastructure and services the project depends on (tags, e.g., Stripe, Supabase, Vercel, Cloudflare, Resend)
- **Build Timeline:** Chronological milestones interleaved with auto-tracked burn sessions
- **Impact Metrics (optional):** Users, revenue, downloads, GitHub stars, or other quantifiable outcomes

### Social
- **Collaborators:** Other builders who worked on the project (mutually verified)

---

## Collaborator Verification System

### How It Works

**Inviting platform members:**

1. Builder A views their project detail page and clicks "+ Invite" in the collaborators section.
2. A search typeahead appears. Builder A searches by name or username.
3. Builder A selects Builder B from the results.
4. Builder A optionally specifies Builder B's role on the project (e.g., "Designer", "Growth Lead").
5. Builder A clicks "Send Invite."
6. Builder B discovers the pending invitation in three places:
   - **Profile page:** A "Pending Invitations" section appears at the top of their profile (visible only to them). Shows who invited them, which project, and Accept/Decline actions.
   - **Project detail page:** A yellow highlight bar at the top of the collaborators section with Accept/Decline buttons.
   - **Nav indicator:** A small dot on the profile/avatar nav item signals unresolved invitations.
7. Builder B can **confirm** or **decline** the collaboration from any of these surfaces.
8. Only confirmed collaborations are displayed publicly.

**Inviting non-members (viral loop):**

1. Builder A clicks "Copy invite link" in the collaborators section.
2. The system generates a unique invite URL: `findyourtribe.dev/invite/[token]`
3. Builder A copies the link and shares it however they choose — SMS, WhatsApp, email, Slack, Twitter DM.
4. The non-member clicks the link and lands on a signup page with context: "Maya Chen invited you to collaborate on AI Resume Builder."
5. After signup, the collaboration invitation is auto-created (pending status).
6. The new user can accept or decline from their profile or the project page.

**The platform never sends emails or notifications.** The builder owns the distribution channel. This is simpler to build, respects user preferences, and avoids spam infrastructure.

### Key Product Decision: Mutual Verification

**Decision:** When a builder tags a collaborator on a project, the collaborator must confirm the relationship before it appears publicly.

**Rationale:** This is the trust foundation of the platform. On LinkedIn, anyone can claim they worked at any company or on any project. On Find Your Tribe, collaboration claims are bilateral. This makes every displayed collaborator relationship a verified signal. It also creates a natural viral loop: inviting a collaborator who is not yet on the platform generates a shareable signup link.

### Key Product Decision: Role Assignment is Optional

**Decision:** When inviting a collaborator, specifying their role is optional. The owner may provide it, or leave it blank.

**Rationale:** The owner may not know the best way to describe a collaborator's contribution. Forcing a role label adds friction to the invitation flow. An invitation with no role is better than no invitation at all.

### Viral Loop

Collaborator invitations are the primary organic growth mechanism:
- The "Copy invite link" feature lets builders share personalized signup links via any channel
- The signup page shows context (who invited them, which project) to maximize conversion
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

## Key Product Decision: Lightweight Create, Progressive Enrichment

**Decision:** Project creation is a dedicated page (`/projects/new`) with only essential fields: title, status, description, role, and links. After creation, the page becomes the project detail page (`/project/[id]`) with all enrichment sections available for inline editing.

**Rationale:** The activation target is 40% of signups adding a project within 7 days. Every field in the creation form is friction. A project with just a title and a link is better than no project. The detail page grows as the builder adds tags, milestones, collaborators, and metrics over time. For visitors, empty sections are hidden entirely -- a sparse project looks intentional, not empty.

### Creation Flow

```
1. Builder navigates to /projects/new (from profile page, nav, or onboarding).
2. Builder fills in essentials: title, status, description, role, links.
3. Builder clicks "Create Project."
4. Page saves. URL becomes /project/[id].
5. The full detail page renders with all enrichment sections visible to the owner.
6. Each section has inline "+ Add" affordances for progressive enrichment.
7. From onboarding: same flow, returns to onboarding after creation.
```

### Owner View vs Visitor View

- **Owner view:** Sees all sections with inline "+ Add" actions. Empty sections show as invitations to add content. Edit button and collaborator invite actions visible.
- **Visitor view:** Only sees sections that have content. Empty sections are hidden entirely. The project looks complete regardless of how much data is present.

### Projects on Profile Page

The profile page shows a builder's projects in a grid. To keep the profile focused:

- **Maximum 6 projects shown** on the profile page.
- **Sort order:** In Progress first, then Shipped, then Archived. Within each status group, sorted by most recently updated.
- **"View all projects" link** appears below the grid when the builder has more than 6 projects. Links to a full project listing page filtered to that builder.
- **Rationale:** In-progress work surfaces first because it signals what the builder is actively working on — most relevant for potential collaborators evaluating whether to reach out or join a tribe.

---

## Project Detail Page

The project detail page (`/project/[id]`) is a full view of a project. It serves dual purpose: public showcase for visitors and management surface for the owner.

### Visitor View

- Status badge (shipped / in progress / archived)
- Title and description
- Builder's role on the project
- External links (clickable, open in new tab)
- Tech stack tags
- Domain tags
- AI tools tags
- Build style tags
- Services tags
- Build timeline (milestones interleaved with burn sessions)
- Impact metrics (if provided)
- Collaborators section -- list of mutually verified collaborators with links to their profiles
- Link back to the project creator's profile
- Empty sections are hidden -- visitors only see what has content

### Owner View (additional)

- Edit button and "Invite Collaborators" action bar below hero
- All sections visible with inline "+ Add" affordances
- Empty sections show as prompts ("Add your tech stack", "Add a milestone")
- Inline tag editing (typeahead from predefined list, can add custom)
- Inline milestone addition
- Inline impact metric addition

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

### Backend (Complete)

| Component | Status | Notes |
|-----------|--------|-------|
| Project model | **Built** | All fields including `domains`, `ai_tools`, `build_style`, `services` JSONB columns |
| project_collaborators table | **Built** | Association Table() with composite PK, role, status, invited_at, confirmed_at |
| project_milestones model | **Built** | ProjectMilestone with MilestoneType enum |
| collaborator_invite_tokens model | **Built** | CollaboratorInviteToken with token, expiry, redemption |
| Alembic migration | **Built** | 20260220_f3_project_enhancements.py |
| Project GraphQL type | **Built** | Full type with domains, ai_tools, build_style, services, milestones, collaborators |
| Project CRUD mutations | **Built** | create, update, delete with input types |
| Collaborator mutations | **Built** | invite, confirm, decline, remove |
| Milestone mutations | **Built** | add_milestone, delete_milestone |
| Invite token mutations | **Built** | generate_invite_link, redeem_invite_token |
| New queries | **Built** | tag_suggestions, search_users, invite_token_info, my_pending_invitations |
| Project service layer | **Built** | Full CRUD + collaborator + milestone + invite token operations |
| User service search | **Built** | Collaborator typeahead search |
| GitHub import service | **Built** | Repo listing + import |
| Tag suggestion constants | **Built** | constants/tags.py with all predefined lists |
| Backend tests | **Built** | 90+ tests: service layer + GraphQL integration |
| Seed data (projects) | **Built** | 20+ demo projects with varied tech stacks |

### Frontend (Remaining Work)

| Component | Status | Notes |
|-----------|--------|-------|
| Project Card | **Built** | With status badge, tech stack tags, impact pills |
| Project detail page (visitor) | **Built** | Status, title, description, tech stack, links, impact, collaborators |
| Projects listing page | **Built** | Grid layout with pagination |
| Frontend GraphQL queries | **Built** | GET_PROJECT, GET_PROJECTS |
| Frontend GraphQL mutations | **Built** | CREATE/UPDATE/DELETE_PROJECT, INVITE/CONFIRM/DECLINE_COLLABORATION |
| Project detail page (owner) | Not built | Edit affordances, "+ Add" sections, inline editing |
| Project creation form (/projects/new) | Not built | Dedicated page with title, status, description, role, links |
| Tag typeahead component | Not built | Shared by tech_stack, domains, ai_tools, build_style, services |
| Build timeline component | Not built | Milestones interleaved with burn sessions |
| "Built With" section | Not built | AI tools, build style, services grouped |
| Collaborator invite UI | Not built | Search typeahead + copy invite link |
| Pending invitations (profile) | Not built | Cards with Accept/Decline on profile page |
| Pending invitations (nav badge) | Not built | Dot indicator on avatar nav item |
| /invite/[token] landing page | Not built | Signup context page for non-member invites |
| Edit project overlay | Not built | Modal with pre-filled core fields + danger zone |
| GitHub import flow | Not built | Repo selection list with import |
| Frontend GraphQL queries (new) | Not built | TAG_SUGGESTIONS, SEARCH_USERS, INVITE_TOKEN_INFO, MY_PENDING_INVITATIONS |
| Frontend GraphQL mutations (new) | Not built | ADD_MILESTONE, DELETE_MILESTONE, GENERATE_INVITE_LINK, REDEEM_INVITE_TOKEN |

## Out of Scope (V1)

- AI-powered project analysis (auto-extracting tech stack from URLs/repos)
- Project comments or reactions
- Project forking or cloning
- Media uploads (screenshots, videos) -- projects link to external assets
- Project version history or changelogs
