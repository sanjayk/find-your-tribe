# F1: Authentication & Onboarding -- Systems Design

**Feature**: Auth & Onboarding
**Context**: See [overview.md](./overview.md) for architecture overview, service boundaries, and deployment.
**Source**: Extracted from [SYSTEMS_DESIGN.md](../SYSTEMS_DESIGN.md)

---

## Table of Contents

1. [JWT Token Lifecycle](#jwt-token-lifecycle)
2. [GitHub OAuth Flow](#github-oauth-flow)
3. [Token Storage (Cookies)](#token-storage-cookies)
4. [Authentication Middleware Flow](#authentication-middleware-flow)
5. [Authorization Model](#authorization-model)
6. [CORS Configuration](#cors-configuration)
7. [CSRF Protection](#csrf-protection)
8. [Rate Limiting on Auth Endpoints](#rate-limiting-on-auth-endpoints)
9. [Data Flow: User Signup (Email)](#data-flow-user-signup-email)
10. [Data Flow: User Signup (GitHub OAuth)](#data-flow-user-signup-github-oauth)
11. [Database Tables](#database-tables)
12. [Frontend Auth State Management](#frontend-auth-state-management)

---

## JWT Token Lifecycle

```
+---------+      +----------+      +--------+
| Access  |      | Refresh  |      | Cookie |
| Token   |      | Token    |      | Config |
+---------+      +----------+      +--------+
| Lifetime|      | Lifetime |      | httpOnly: true
| 15 min  |      | 7 days   |      | secure: true (prod)
| Payload:|      | Stored:  |      | sameSite: lax
|  sub:   |      |  DB hash |      | path: /
|  user_id|      |  of token|      | domain: .findyourtribe.com
|  iat    |      |          |      |
|  exp    |      |          |      |
+---------+      +----------+      +--------+
```

**Token creation**:
```python
# Access token (short-lived, stateless)
access_payload = {
    "sub": str(user.id),
    "iat": now,
    "exp": now + timedelta(minutes=15),
    "type": "access"
}
access_token = jwt.encode(access_payload, SECRET_KEY, algorithm="HS256")

# Refresh token (long-lived, stateful)
refresh_token = secrets.token_urlsafe(32)
refresh_hash = hashlib.sha256(refresh_token.encode()).hexdigest()
# Store hash in refresh_tokens table
```

**Token rotation**: When a refresh token is used, the old token is revoked and a new one is issued.
This limits the window of abuse if a refresh token is compromised.

---

## GitHub OAuth Flow

```
                    Browser                    Next.js Server           FastAPI Backend          GitHub
                       |                            |                        |                     |
                       | 1. Click "Sign in          |                        |                     |
                       |    with GitHub"             |                        |                     |
                       |--------------------------->|                        |                     |
                       |                            |                        |                     |
                       | 2. Redirect to GitHub      |                        |                     |
                       |    OAuth authorize URL      |                        |                     |
                       |    with client_id,          |                        |                     |
                       |    redirect_uri, scope,     |                        |                     |
                       |    state (CSRF token)       |                        |                     |
                       |---------------------------------------------------------->                |
                       |                            |                        |                     |
                       |                            |                        |   3. User authorizes|
                       |                            |                        |      on GitHub      |
                       |                            |                        |                     |
                       | 4. GitHub redirects back   |                        |                     |
                       |    with ?code=xxx&state=yyy|                        |                     |
                       |--------------------------->|                        |                     |
                       |                            |                        |                     |
                       |                            | 5. POST /auth/github   |                     |
                       |                            |    {code, state}       |                     |
                       |                            |----------------------->|                     |
                       |                            |                        |                     |
                       |                            |                        | 6. Exchange code    |
                       |                            |                        |    for access_token |
                       |                            |                        |------------------->|
                       |                            |                        |                     |
                       |                            |                        | 7. Fetch user info  |
                       |                            |                        |    GET /user        |
                       |                            |                        |------------------->|
                       |                            |                        |                     |
                       |                            |                        | 8. Find or create   |
                       |                            |                        |    user by github_id|
                       |                            |                        |    Store encrypted  |
                       |                            |                        |    GitHub token     |
                       |                            |                        |                     |
                       |                            | 9. Return JWT tokens   |                     |
                       |                            |    (Set-Cookie headers)|                     |
                       |                            |<-----------------------|                     |
                       |                            |                        |                     |
                       | 10. Redirect to /feed      |                        |                     |
                       |    (or /onboarding if new) |                        |                     |
                       |<---------------------------|                        |                     |
```

**Scopes requested**: `read:user`, `user:email`, `repo` (optional, for project import)

**State parameter**: A random string stored in a short-lived httpOnly cookie before redirect.
Verified on callback to prevent CSRF.

---

## Token Storage (Cookies)

- Access token (15min) stored in httpOnly cookie
- Refresh token (7 days) stored in separate httpOnly cookie
- Cookie config:
  - `httpOnly: true` -- not accessible to JavaScript
  - `secure: true` -- HTTPS only (in production)
  - `sameSite: lax` -- CSRF protection
  - `path: /`
  - `domain: .findyourtribe.com`

---

## Authentication Middleware Flow

```
Request arrives
     |
     v
[Extract JWT from cookie or Authorization header]
     |
     v
[Is token present?] --No--> [Set context.user = None (anonymous)]
     |
     Yes
     v
[Decode JWT, verify signature + expiry]
     |
     v
[Valid?] --No--> [Return 401 or set user = None for optional-auth routes]
     |
     Yes
     v
[Load user from DB (cached per-request via DataLoader)]
     |
     v
[Set context.user = User object]
     |
     v
[Resolver checks context.user for authorization]
```

The middleware uses a custom Strawberry extension that attaches the authenticated user to the
GraphQL context. Resolvers that require auth use a `@requires_auth` decorator that raises
`PermissionError` (translated to a GraphQL error) if `context.user` is None.

---

## Authorization Model

| Resource | Action | Who Can Do It |
|----------|--------|---------------|
| **Profile** | View | Anyone (public) |
| **Profile** | Edit | Owner only |
| **Profile** | Delete account | Owner only |
| **Project** | View | Anyone (public) |
| **Project** | Create | Any authenticated user |
| **Project** | Edit | Owner only |
| **Project** | Delete | Owner only |
| **Project** | Invite collaborator | Owner only |
| **Project** | Confirm collaboration | Invited user only |
| **Project** | Decline collaboration | Invited user only |
| **Tribe** | View | Anyone (public) |
| **Tribe** | Create | Any authenticated user |
| **Tribe** | Edit | Owner only |
| **Tribe** | Delete | Owner only |
| **Tribe** | Request to join | Any authenticated user (not already a member) |
| **Tribe** | Approve member | Owner only |
| **Tribe** | Remove member | Owner only |
| **Tribe** | Leave tribe | Active member (not owner) |
| **Feed** | View | Any authenticated user |
| **AI Search** | Query | Any authenticated user |

Implementation: Authorization checks live in the **service layer**, not in resolvers. Resolvers call
services, services check permissions and raise `PermissionError` if unauthorized. This keeps auth
logic testable and consistent regardless of how services are called.

```python
# services/project_service.py
class ProjectService:
    async def update_project(self, user_id: str, project_id: str, data: dict) -> Project:
        project = await self.repo.get(project_id)
        if not project:
            raise NotFoundError("Project not found")
        if str(project.owner_id) != user_id:
            raise PermissionError("Only the project owner can edit this project")
        return await self.repo.update(project, data)
```

---

## CORS Configuration

```python
# main.py
from fastapi.middleware.cors import CORSMiddleware

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",           # Local dev
        "https://findyourtribe.com",       # Production
        "https://www.findyourtribe.com",   # Production www
    ],
    allow_credentials=True,                # Required for cookie-based auth
    allow_methods=["GET", "POST", "OPTIONS"],
    allow_headers=["Content-Type", "Authorization", "X-Request-ID"],
    max_age=86400,                         # Cache preflight for 24 hours
)
```

---

## CSRF Protection

- **Primary defense**: `SameSite=Lax` on auth cookies prevents CSRF from third-party sites for state-changing requests.
- **Secondary defense**: For mutation requests from the browser, Apollo Client sends a custom header (`X-Requested-With: XMLHttpRequest`). The backend rejects cookie-authenticated requests that lack this header.
- **GitHub OAuth**: Uses the `state` parameter (random token in a short-lived cookie) to prevent CSRF on the OAuth callback.

---

## Rate Limiting on Auth Endpoints

V1 uses `slowapi` (built on `limits`) with in-memory storage:

| Endpoint | Limit | Notes |
|----------|-------|-------|
| `/auth/login` | 5 req/min per IP | Brute-force prevention |
| `/auth/register` | 3 req/min per IP | Spam prevention |
| `/graphql` (anonymous) | 30 req/min per IP | General rate limit |
| `/graphql` (authenticated) | 120 req/min per user | Higher limit for logged-in users |
| `/upload/*` | 10 req/min per user | Prevent abuse |
| `/auth/refresh` | 10 req/min per IP | Token refresh |

Future: Move to Redis-backed rate limiting for distributed deployment.

---

## Data Flow: User Signup (Email)

```
Browser                     Next.js                  FastAPI                  PostgreSQL
   |                           |                        |                        |
   | 1. Fill signup form       |                        |                        |
   |    (name, email, pwd,     |                        |                        |
   |     role, skills)         |                        |                        |
   |                           |                        |                        |
   | 2. Submit                 |                        |                        |
   |--------mutation---------->|                        |                        |
   |    registerUser(input)    |                        |                        |
   |                           |---GraphQL POST-------->|                        |
   |                           |                        |                        |
   |                           |                        | 3. Validate input      |
   |                           |                        |    - email format      |
   |                           |                        |    - username unique   |
   |                           |                        |    - password strength |
   |                           |                        |                        |
   |                           |                        | 4. Hash password       |
   |                           |                        |    (bcrypt, 12 rounds) |
   |                           |                        |                        |
   |                           |                        | 5. BEGIN TRANSACTION   |
   |                           |                        |---INSERT user--------->|
   |                           |                        |---INSERT user_skills-->|
   |                           |                        |---INSERT feed_event--->|
   |                           |                        |    (builder_joined)    |
   |                           |                        |    COMMIT              |
   |                           |                        |                        |
   |                           |                        | 6. Generate JWT tokens |
   |                           |                        |---INSERT refresh_token>|
   |                           |                        |                        |
   |                           |                        | 7. Enqueue background: |
   |                           |                        |    - Generate embedding|
   |                           |                        |                        |
   |                           |<--Set-Cookie + user----|                        |
   |<--redirect to /onboarding-|                        |                        |
```

---

## Data Flow: User Signup (GitHub OAuth)

```
Browser                     Next.js                  FastAPI                  GitHub API       PostgreSQL
   |                           |                        |                       |                  |
   | 1. Click "GitHub"         |                        |                       |                  |
   |-------------------------->|                        |                       |                  |
   |                           | 2. Set state cookie    |                       |                  |
   |<--redirect to GitHub------|                        |                       |                  |
   |----authorize on GitHub------------------------------------------>|         |                  |
   |<--redirect with code,state-----------------------------------------|      |                  |
   |-------------------------->|                        |                       |                  |
   |                           | 3. Verify state cookie |                       |                  |
   |                           |---POST /auth/github--->|                       |                  |
   |                           |    {code, state}       |                       |                  |
   |                           |                        |---exchange code------>|                  |
   |                           |                        |<--access_token--------|                  |
   |                           |                        |---GET /user---------->|                  |
   |                           |                        |<--github profile------|                  |
   |                           |                        |                       |                  |
   |                           |                        | 4. Find user by       |                  |
   |                           |                        |    github_id          |                  |
   |                           |                        |---SELECT user-------->|                  |
   |                           |                        |                       |                  |
   |                           |                        | 5a. Existing user:    |                  |
   |                           |                        |     update github_token                  |
   |                           |                        | 5b. New user:         |                  |
   |                           |                        |     INSERT user with  |                  |
   |                           |                        |     github data       |                  |
   |                           |                        |---INSERT/UPDATE------>|                  |
   |                           |                        |                       |                  |
   |                           |                        | 6. Generate JWT       |                  |
   |                           |<--Set-Cookie + user----|                       |                  |
   |<--redirect (feed/onboard)-|                        |                       |                  |
```

---

## Database Tables

### `users` (auth-relevant columns)

| Column | Type | Constraints | Notes |
|--------|------|-------------|-------|
| id | UUID | PK, DEFAULT gen_random_uuid() | |
| email | VARCHAR(255) | UNIQUE, NOT NULL | |
| username | VARCHAR(50) | UNIQUE, NOT NULL | URL-safe, lowercase |
| password_hash | VARCHAR(255) | NULLABLE | NULL if GitHub-only auth |
| github_id | BIGINT | UNIQUE, NULLABLE | GitHub user ID |
| github_username | VARCHAR(100) | NULLABLE | |
| github_token_enc | TEXT | NULLABLE | Encrypted GitHub access token |
| created_at | TIMESTAMPTZ | DEFAULT NOW() | |
| updated_at | TIMESTAMPTZ | DEFAULT NOW() | |

### `refresh_tokens`

| Column | Type | Constraints | Notes |
|--------|------|-------------|-------|
| id | UUID | PK, DEFAULT gen_random_uuid() | |
| user_id | UUID | FK -> users(id) ON DELETE CASCADE, NOT NULL | |
| token_hash | VARCHAR(64) | UNIQUE, NOT NULL | SHA-256 hash of the token |
| expires_at | TIMESTAMPTZ | NOT NULL | |
| created_at | TIMESTAMPTZ | DEFAULT NOW() | |
| revoked_at | TIMESTAMPTZ | NULLABLE | Set on logout / rotation |

### Auth-Related Indexes

```sql
CREATE INDEX idx_users_email ON users (email);
CREATE INDEX idx_users_username ON users (username);
CREATE INDEX idx_users_github_id ON users (github_id) WHERE github_id IS NOT NULL;
CREATE INDEX idx_refresh_tokens_user ON refresh_tokens (user_id);
CREATE INDEX idx_refresh_tokens_expires ON refresh_tokens (expires_at)
  WHERE revoked_at IS NULL;
```

### Secret Management (Auth-Related)

| Secret | Storage | Rotation |
|--------|---------|----------|
| JWT signing key | Environment variable (from cloud secrets manager) | Rotate quarterly; support multiple valid keys during rotation |
| GitHub OAuth secret | Environment variable (from cloud secrets manager) | Rotate as needed |
| GitHub user tokens | Encrypted in DB (Fernet, key from env var) | Managed by GitHub OAuth flow |

**Encryption at rest** for GitHub tokens:
```python
from cryptography.fernet import Fernet

# ENCRYPTION_KEY loaded from environment variable
fernet = Fernet(ENCRYPTION_KEY)

def encrypt_token(token: str) -> str:
    return fernet.encrypt(token.encode()).decode()

def decrypt_token(encrypted: str) -> str:
    return fernet.decrypt(encrypted.encode()).decode()
```

---

## Frontend Auth State Management

```
1. On app load:
   - Server Component reads httpOnly cookie on initial SSR
   - If valid JWT present, injects user data into RSC payload
   - AuthProvider (Client Component) initializes with SSR user data

2. On client-side navigation:
   - Apollo Client sends cookies automatically (credentials: "include")
   - If 401 response, AuthProvider triggers silent token refresh

3. Token refresh flow:
   - Access token (15min) stored in httpOnly cookie
   - Refresh token (7 days) stored in separate httpOnly cookie
   - When access token expires, middleware intercepts 401
   - Calls /auth/refresh with refresh cookie
   - Server returns new access token cookie
   - Original request retries automatically

4. Logout:
   - POST /auth/logout (clears both cookies, revokes refresh token in DB)
   - Apollo Client cache cleared
   - Redirect to /login
```
