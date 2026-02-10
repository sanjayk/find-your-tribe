# RFC / Technical Specification — Overview

> Find Your Tribe: Technical architecture, API contracts, and data models.

## Tech Stack

| Layer | Technology | Version |
|-------|-----------|---------|
| Frontend | Next.js (App Router) + Tailwind CSS + Apollo Client | 14.x |
| Backend | Python FastAPI + Strawberry GraphQL | FastAPI 0.110+, Strawberry 0.220+ |
| Database | PostgreSQL + pgvector | 16+ |
| ORM | SQLAlchemy 2.0+ + Alembic | async |
| AI Layer | MCP Server (Python) + Claude API | — |
| Auth | JWT (access + refresh) + GitHub OAuth | — |

## Project Structure

```
src/
├── frontend/                  # Next.js app
│   ├── app/                   # App Router pages
│   │   ├── layout.tsx
│   │   ├── page.tsx           # Landing / feed
│   │   ├── (auth)/            # Auth group (login, signup)
│   │   ├── onboarding/
│   │   ├── profile/[username]/
│   │   ├── project/[id]/
│   │   ├── tribe/[id]/
│   │   ├── discover/
│   │   └── feed/
│   ├── components/
│   │   ├── ui/                # Primitives (Button, Input, Card, Avatar)
│   │   ├── layout/            # Shell, Nav, Footer
│   │   └── features/          # Feature-specific (ProjectCard, BuilderCard, TribeCard)
│   ├── lib/
│   │   ├── graphql/           # Apollo client, queries, mutations
│   │   ├── auth.ts            # Token helpers, auth context
│   │   └── utils.ts
│   ├── styles/
│   │   └── globals.css
│   ├── tailwind.config.ts
│   └── next.config.js
├── backend/
│   ├── main.py                # FastAPI app + Strawberry mount
│   ├── schema/
│   │   ├── types.py           # Strawberry GraphQL types
│   │   ├── queries.py         # Query resolvers
│   │   ├── mutations.py       # Mutation resolvers
│   │   └── inputs.py          # Input types
│   ├── models/
│   │   ├── base.py            # SQLAlchemy Base, mixins
│   │   ├── user.py
│   │   ├── project.py
│   │   ├── tribe.py
│   │   ├── skill.py
│   │   └── feed.py
│   ├── services/
│   │   ├── user_service.py
│   │   ├── project_service.py
│   │   ├── tribe_service.py
│   │   ├── feed_service.py
│   │   └── score_service.py
│   ├── auth/
│   │   ├── jwt.py             # Token creation/verification
│   │   ├── github.py          # GitHub OAuth
│   │   ├── middleware.py       # Auth middleware
│   │   └── dependencies.py    # FastAPI dependencies
│   ├── migrations/            # Alembic
│   │   ├── env.py
│   │   └── versions/
│   ├── seeds/
│   └── tests/
├── mcp/
│   ├── server.py              # MCP server entrypoint
│   ├── tools/
│   │   ├── search_builders.py
│   │   ├── match_tribe.py
│   │   ├── analyze_project.py
│   │   └── suggest_collaborators.py
│   ├── embeddings/
│   │   ├── generator.py       # Embedding creation
│   │   └── search.py          # Vector similarity search
│   └── tests/
└── shared/
    └── constants.json         # Skill taxonomy, role enums
```

## GraphQL Schema Overview

### Queries

| Query | Auth | Description |
|-------|------|-------------|
| `me` | Required | Current authenticated user with full profile |
| `user(username: String!)` | Optional | Public builder profile |
| `project(id: ID!)` | Optional | Project detail |
| `tribe(id: ID!)` | Optional | Tribe detail |
| `searchBuilders(query: String, filters: BuilderFilters, limit: Int, offset: Int)` | Optional | Builder discovery |
| `searchProjects(query: String, filters: ProjectFilters, limit: Int, offset: Int)` | Optional | Project discovery |
| `searchTribes(query: String, filters: TribeFilters, limit: Int, offset: Int)` | Optional | Tribe discovery |
| `feed(cursor: String, limit: Int)` | Optional | Paginated build feed |
| `suggestedCollaborators(limit: Int)` | Required | AI-powered suggestions |
| `myGithubRepos` | Required | List importable GitHub repos |

### Mutations

| Mutation | Auth | Description |
|----------|------|-------------|
| `signup(input: SignupInput!)` | None | Create account |
| `login(email: String!, password: String!)` | None | Get tokens |
| `refreshToken` | Refresh token | Get new access token |
| `loginWithGithub(code: String!)` | None | GitHub OAuth |
| `updateProfile(input: UpdateProfileInput!)` | Required | Edit profile |
| `addSkill(skillId: ID!)` | Required | Add skill to profile |
| `removeSkill(skillId: ID!)` | Required | Remove skill |
| `createProject(input: CreateProjectInput!)` | Required | Create project |
| `updateProject(id: ID!, input: UpdateProjectInput!)` | Required (owner) | Edit project |
| `deleteProject(id: ID!)` | Required (owner) | Delete project |
| `inviteCollaborator(projectId: ID!, userId: ID!, role: String!)` | Required (owner) | Invite |
| `confirmCollaboration(projectId: ID!)` | Required (invitee) | Accept invite |
| `declineCollaboration(projectId: ID!)` | Required (invitee) | Decline invite |
| `importGithubRepo(repoFullName: String!)` | Required | Import repo as project |
| `createTribe(input: CreateTribeInput!)` | Required | Create tribe |
| `updateTribe(id: ID!, input: UpdateTribeInput!)` | Required (owner) | Edit tribe |
| `addOpenRole(tribeId: ID!, input: OpenRoleInput!)` | Required (owner) | Add role |
| `requestToJoin(tribeId: ID!, roleId: ID!)` | Required | Request membership |
| `approveMember(tribeId: ID!, userId: ID!)` | Required (owner) | Approve join |
| `rejectMember(tribeId: ID!, userId: ID!)` | Required (owner) | Reject join |
| `leaveTribe(tribeId: ID!)` | Required (member) | Leave tribe |

### REST Endpoints (non-GraphQL)

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `POST` | `/auth/github/callback` | None | GitHub OAuth callback |
| `POST` | `/upload/avatar` | Required | Upload avatar image (max 5MB, image/*) |
| `POST` | `/upload/project-thumbnail` | Required | Upload thumbnail (max 10MB, image/*) |
| `GET` | `/health` | None | Health check |
| `GET` | `/health/ready` | None | Readiness (DB connectivity) |

## Error Format

All GraphQL errors follow this shape:

```json
{
  "errors": [
    {
      "message": "Human-readable error message",
      "extensions": {
        "code": "VALIDATION_ERROR",
        "field": "email",
        "details": "Email is already registered"
      }
    }
  ]
}
```

Error codes: `VALIDATION_ERROR`, `NOT_FOUND`, `UNAUTHORIZED`, `FORBIDDEN`, `RATE_LIMITED`, `INTERNAL_ERROR`.

## Rate Limiting

| Endpoint Group | Limit | Window |
|---------------|-------|--------|
| Auth (login, signup) | 5 requests | 1 minute |
| GraphQL mutations | 30 requests | 1 minute |
| GraphQL queries | 100 requests | 1 minute |
| File uploads | 10 requests | 1 minute |
| AI search | 10 requests | 1 minute |

Implemented via FastAPI middleware using in-memory sliding window (Redis in future).

## Pagination

- **Feed**: Cursor-based (`cursor` + `limit`). Cursor is the last `feed_event.id`.
- **Search/Discovery**: Offset-based (`offset` + `limit`). Max `limit` = 50.
- **Lists** (skills, collaborators): No pagination needed in V1 (bounded size).

## Feature Tech Specs

Each feature has its own detailed spec:
- [F1: Auth & Onboarding](./f1-auth-onboarding.md)
- [F2: Builder Profiles](./f2-builder-profiles.md)
- [F3: Projects](./f3-projects.md)
- [F4: Tribes](./f4-tribes.md)
- [F5: Discovery & Search](./f5-discovery-search.md)
- [F6: Build Feed](./f6-build-feed.md)
- [F7: Builder Score](./f7-builder-score.md)
