# Find Your Tribe — Product Specification

## The Pitch

LinkedIn rewards talking about work. Find Your Tribe rewards doing work.

AI is collapsing team sizes. A designer, an engineer, and a growth person with AI tools can outship a 30-person company. But finding your co-builders is still luck, Twitter DMs, and warm intros. Resumes are meaningless. Endorsements are performative. The only question that matters is: **what have you actually shipped?**

Find Your Tribe is a social network where your identity is your portfolio — what you've built, who you built it with, and what impact it had. Reputation is proof-of-work. Discovery is skill-based. Tribes form around projects, not content.

## Core Concepts

### Builders
A builder is anyone who makes things — engineers, designers, PMs, marketers, growth people, founders. A builder's profile is a living portfolio:
- **Projects** they've shipped (with links, screenshots, descriptions)
- **Skills** demonstrated through those projects (not self-declared)
- **Collaborators** they've built with (verified mutual connections)
- **Builder Score** — a reputation metric derived from project impact, collaborator vouches, and contribution history

### Projects
The atomic unit of proof. A project is something that shipped:
- Title, description, status (shipped / in progress / archived)
- Links: repo, live URL, app store, Product Hunt, etc.
- Role: what the builder did on this project
- Collaborators: tagged builders who also worked on it (mutual verification)
- Tech stack tags
- Impact metrics (optional): users, revenue, downloads, stars

### Tribes
Small groups (2-8 builders) with complementary skills. A tribe can be:
- **Active** — currently building something together
- **Open** — looking for specific roles to fill
- **Alumni** — past collaboration, preserved for reputation

### The Feed
Not a content feed. A **build feed**:
- New projects shipped
- Tribes forming and looking for members
- Builders joining the platform
- Milestone updates on active projects

No text-only posts. No "thought leadership." Every feed item is tied to a build artifact.

### AI Layer (MCP Server)
AI-first features that make the platform intelligent:
- **Builder Matching** — "Find me a designer who's shipped B2B SaaS and is in PST timezone"
- **Tribe Recommendations** — suggest complementary builders based on skills gaps
- **Project Analysis** — analyze linked repos/URLs to auto-extract tech stack, contribution patterns
- **Smart Search** — natural language search across builders, projects, skills

## Features (MVP)

### F1: Authentication & Onboarding
- Sign up with email or GitHub OAuth
- Onboarding flow: name, headline, primary role, top skills, timezone
- Connect GitHub account to auto-import projects (optional)

### F2: Builder Profiles
- Display: name, avatar, headline, role, skills, timezone, builder score
- Projects section: grid of shipped projects with thumbnails
- Collaborators section: builders they've worked with
- "Open to" status: looking for tribe, available for projects, just browsing
- Edit profile with real-time preview

### F3: Projects
- Create project: title, description, role, links, tech stack, collaborators
- Invite collaborators (they must confirm — mutual verification)
- Project detail page with full info
- GitHub integration: auto-populate from repos (name, description, languages, stars)

### F4: Tribe Formation
- Create a tribe: name, mission, current members, open roles
- Browse open tribes filtered by skills needed, timezone, project type
- Request to join a tribe
- Tribe dashboard: members, active project, status updates

### F5: Discovery & Search
- Browse builders by skill, role, timezone, availability
- Browse projects by tech stack, category, recency
- Browse open tribes by skills needed
- AI-powered natural language search via MCP server

### F6: Build Feed
- Chronological feed of build activity
- Filter: projects, tribes, builders
- Each feed item links to the underlying artifact (project, tribe, profile)

### F7: Builder Score
- Computed from: number of shipped projects, collaborator vouches, project impact metrics, profile completeness
- Visible on profile
- Used for discovery ranking

## Technical Architecture

### Frontend — Next.js + Tailwind CSS
- App Router (Next.js 14+)
- Server components by default, client components where needed
- Tailwind CSS with custom theme matching "Modern Editorial Luxury" aesthetic:
  - Cream/beige background (#f5f0e8)
  - Terracotta coral accent (#c4775a)
  - Serif headings, clean sans-serif body
  - Generous whitespace, subtle shadows, no borders
- Apollo Client for GraphQL
- Responsive: mobile-first

### Backend — FastAPI + Strawberry GraphQL
- Strawberry GraphQL schema with queries, mutations, subscriptions
- FastAPI for REST endpoints where needed (webhooks, file upload, health)
- SQLAlchemy ORM with Alembic migrations
- JWT authentication (access + refresh tokens)
- GitHub OAuth integration

### Database — PostgreSQL
- Tables: users, projects, project_collaborators, tribes, tribe_members, skills, user_skills, feed_events
- Full-text search indexes for discovery
- JSONB columns for flexible metadata (project links, impact metrics)

### AI Layer — MCP Server (Python)
- Model Context Protocol server exposing tools:
  - `search_builders(query: str)` — natural language builder search
  - `match_tribe(skills_needed: list, preferences: dict)` — find matching builders
  - `analyze_project(url: str)` — extract project metadata from URL/repo
  - `suggest_collaborators(builder_id: str)` — recommend potential co-builders
- Backed by embeddings (builder profiles + project descriptions)
- Uses Claude API for natural language understanding

### Project Structure
```
src/
├── frontend/               # Next.js app
│   ├── app/                # App Router pages
│   │   ├── layout.tsx
│   │   ├── page.tsx        # Landing / feed
│   │   ├── login/
│   │   ├── signup/
│   │   ├── onboarding/
│   │   ├── profile/[id]/
│   │   ├── project/[id]/
│   │   ├── tribe/[id]/
│   │   ├── discover/
│   │   └── feed/
│   ├── components/         # Shared UI components
│   ├── lib/                # GraphQL client, auth helpers, utils
│   └── styles/             # Tailwind config, global styles
├── backend/                # FastAPI app
│   ├── main.py             # App entrypoint
│   ├── schema/             # Strawberry GraphQL types & resolvers
│   ├── models/             # SQLAlchemy models
│   ├── services/           # Business logic
│   ├── auth/               # JWT + OAuth
│   └── migrations/         # Alembic
├── mcp/                    # MCP Server
│   ├── server.py           # MCP server entrypoint
│   ├── tools/              # Tool implementations
│   └── embeddings/         # Vector search utilities
└── shared/                 # Shared types/constants
```

## Non-Functional Requirements
- Page load under 2 seconds
- Mobile responsive (375px+)
- Accessible (WCAG 2.1 AA)
- Secure: OWASP top 10 mitigated, no secrets in client code

## Out of Scope (V1)
- Messaging / DMs (use external links for now)
- Payment / monetization
- Mobile native apps
- Content creation (blog posts, articles)
- Job listings
- Notifications (email or push)
