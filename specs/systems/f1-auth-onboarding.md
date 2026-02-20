# F1: Authentication & Onboarding -- Systems Design

**Feature**: Auth & Onboarding
**Context**: See [overview.md](./overview.md) for architecture overview, service boundaries, and deployment.

---

## Table of Contents

1. [Auth Architecture Overview](#auth-architecture-overview)
2. [Firebase Auth (Primary)](#firebase-auth-primary)
3. [Home-Grown Auth (Unexposed Fallback)](#home-grown-auth-unexposed-fallback)
4. [Authentication Middleware Flow](#authentication-middleware-flow)
5. [Account Linking](#account-linking)
6. [Authorization Model](#authorization-model)
7. [CORS Configuration](#cors-configuration)
8. [Rate Limiting](#rate-limiting)
9. [Data Flow: Firebase OAuth Sign-In](#data-flow-firebase-oauth-sign-in)
10. [Data Flow: Fallback Email/Password (Unexposed)](#data-flow-fallback-emailpassword-unexposed)
11. [Database Tables](#database-tables)
12. [Frontend Auth State Management](#frontend-auth-state-management)

---

## Auth Architecture Overview

The platform uses a dual-layer authentication strategy:

```
┌─────────────────────────────────────────────────┐
│                  Frontend                        │
│                                                  │
│  Firebase Auth SDK (primary)                     │
│    ├── Google OAuth                              │
│    └── GitHub OAuth                              │
│                                                  │
│  Returns Firebase ID Token (1hr, auto-refreshed) │
└─────────────────┬───────────────────────────────┘
                  │ Bearer token in Authorization header
                  v
┌─────────────────────────────────────────────────┐
│                  Backend                         │
│                                                  │
│  Middleware: try Firebase → fallback to JWT       │
│    ├── firebase_admin.verify_id_token()          │
│    └── home-grown verify_access_token()          │
│                                                  │
│  Both resolve to → user_id → context.user        │
└─────────────────────────────────────────────────┘
```

**Primary (Firebase Auth):** Handles all user-facing authentication. Google + GitHub OAuth via Firebase. Frontend uses Firebase SDK for sign-in, token refresh, and session persistence. Backend verifies Firebase ID tokens.

**Fallback (home-grown):** Existing email/password auth with JWT access tokens (15min) and refresh tokens (7 days). Not exposed in the UI. Used for: development, seed data, integration tests, emergency access.

---

## Firebase Auth (Primary)

### Token Lifecycle

```
┌──────────────────┐     ┌──────────────────┐
│  Firebase ID     │     │  Firebase SDK     │
│  Token           │     │  (client-side)    │
├──────────────────┤     ├──────────────────┤
│  Lifetime: 1hr   │     │  Auto-refreshes   │
│  Issuer: Google   │     │  silently before  │
│  Audience: project│     │  expiry           │
│  Contains:        │     │  No manual token  │
│    sub (firebase  │     │  management       │
│    uid), email,   │     │  needed           │
│    provider info  │     │                    │
└──────────────────┘     └──────────────────┘
```

- Firebase ID tokens are **1 hour** (not configurable). The Firebase client SDK handles refresh automatically — no refresh token infrastructure needed on our side.
- Backend verifies tokens using Google's public keys via `firebase-admin` SDK. This is **stateless** — no database lookup required for token verification.
- The Firebase UID is the primary link between Firebase Auth and our `users` table.

### Providers

| Provider | Scopes | Notes |
|----------|--------|-------|
| Google | `email`, `profile` | Default scopes, sufficient for sign-in |
| GitHub | `read:user`, `user:email` | Basic profile + email access |
| GitHub (with repo import) | `read:user`, `user:email`, `repo` | Extended scope, requested when builder connects GitHub for project import |

### Firebase Project Configuration

- One Firebase project for the platform.
- Auth providers enabled: Google, GitHub.
- GitHub OAuth app registered on GitHub, client ID + secret configured in Firebase Console.
- Account linking: "Link accounts that use the same email" enabled in Firebase Console.

---

## Home-Grown Auth (Unexposed Fallback)

The existing email/password auth system remains fully functional but is not exposed in the UI.

### JWT Token Lifecycle (Fallback)

```
+---------+      +----------+
| Access  |      | Refresh  |
| Token   |      | Token    |
+---------+      +----------+
| Lifetime|      | Lifetime |
| 15 min  |      | 7 days   |
| Payload:|      | Stored:  |
|  sub:   |      |  DB hash |
|  user_id|      |  of token|
|  iat    |      |          |
|  exp    |      |          |
+---------+      +----------+
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

### When Fallback Auth is Used

- **Integration tests**: Test suites use `signup`/`login` mutations directly without needing Firebase emulator.
- **Seed data**: Seed users are created with email/password, allowing developers to log in locally via direct API calls.
- **Emergency**: If Firebase has an outage, the login/signup forms can be temporarily re-exposed.
- **Admin/developer access**: Developers can call GraphQL mutations directly for debugging.

---

## Authentication Middleware Flow

```
Request arrives
     |
     v
[Extract token from Authorization header]
     |
     v
[Is token present?] --No--> [Set context.user_id = None (anonymous)]
     |
     Yes
     v
[Try: firebase_admin.verify_id_token(token)]
     |
     v
[Valid Firebase token?] --Yes--> [Look up user by firebase_uid]
     |                                    |
     No                                   v
     v                           [User found?] --No--> [Create user from Firebase claims]
[Try: verify_access_token(token)]        |                        |
     |                                   Yes                      |
     v                                   |                        |
[Valid JWT?] --No--> [Return 401]        v                        v
     |                           [Set context.user_id]    [Set context.user_id]
     Yes
     v
[Set context.user_id from JWT sub]
     |
     v
[Resolver checks context.user_id for authorization]
```

The middleware tries Firebase verification first (primary path), then falls back to home-grown JWT verification. Both resolve to a `user_id` that is set on the GraphQL context.

---

## Account Linking

**Strategy:** Auto-merge on matching email.

```
Firebase sign-in
     |
     v
[Backend receives Firebase ID token]
     |
     v
[Look up user by firebase_uid] --Found--> [Return existing user, login]
     |
     Not found
     v
[Look up user by email] --Found--> [Link firebase_uid to existing user, login]
     |
     Not found
     v
[Create new user with firebase_uid + email + provider data]
     |
     v
[Set onboarding_completed = false, redirect to /onboarding]
```

**Key rules:**
- A user can have multiple auth providers linked (GitHub + Google) via the same email.
- The first sign-in with any provider creates the user record.
- Subsequent sign-ins with a different provider but the same email auto-link to the existing user.
- Firebase handles provider linking on its side. The backend links via `firebase_uid` or email match on the `users` table.

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

Implementation: Authorization checks live in the **service layer**, not in resolvers. Resolvers call services, services check permissions and raise `PermissionError` if unauthorized. This keeps auth logic testable and consistent regardless of how services are called.

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
    allow_credentials=True,                # Required for cookie-based auth (fallback)
    allow_methods=["GET", "POST", "OPTIONS"],
    allow_headers=["Content-Type", "Authorization", "X-Request-ID"],
    max_age=86400,                         # Cache preflight for 24 hours
)
```

---

## Rate Limiting

V1 uses `slowapi` (built on `limits`) with in-memory storage:

| Endpoint | Limit | Notes |
|----------|-------|-------|
| `/graphql` (anonymous) | 30 req/min per IP | General rate limit |
| `/graphql` (authenticated) | 120 req/min per user | Higher limit for logged-in users |
| `/upload/*` | 10 req/min per user | Prevent abuse |
| `/auth/login` (fallback) | 5 req/min per IP | Brute-force prevention (unexposed) |
| `/auth/register` (fallback) | 3 req/min per IP | Spam prevention (unexposed) |

Future: Move to Redis-backed rate limiting for distributed deployment.

---

## Data Flow: Firebase OAuth Sign-In

```
Browser                     Firebase Auth            FastAPI Backend           PostgreSQL
   |                           |                        |                        |
   | 1. Click "Continue        |                        |                        |
   |    with GitHub/Google"    |                        |                        |
   |-------------------------->|                        |                        |
   |                           | 2. OAuth popup/redirect|                        |
   |                           |    to provider         |                        |
   |<--provider auth screen----|                        |                        |
   |---authorize on provider-->|                        |                        |
   |                           |                        |                        |
   |                           | 3. Firebase returns    |                        |
   |<--Firebase ID token-------|    ID token to client  |                        |
   |                           |                        |                        |
   | 4. Send ID token as       |                        |                        |
   |    Authorization: Bearer  |                        |                        |
   |    to any GraphQL query   |                        |                        |
   |--------------------------------------------------->|                        |
   |                           |                        |                        |
   |                           |                        | 5. Verify Firebase     |
   |                           |                        |    ID token            |
   |                           |                        |    (firebase_admin)    |
   |                           |                        |                        |
   |                           |                        | 6. Find or create user |
   |                           |                        |    by firebase_uid     |
   |                           |                        |    or email            |
   |                           |                        |---SELECT/INSERT------->|
   |                           |                        |                        |
   |                           |                        | 7. If new user:        |
   |                           |                        |    INSERT user +       |
   |                           |                        |    feed_event          |
   |                           |                        |    (builder_joined)    |
   |                           |                        |---INSERT-------------->|
   |                           |                        |                        |
   |<--user data + redirect----|                        |                        |
   |   (feed or onboarding)    |                        |                        |
```

**Note:** The backend does NOT issue its own JWT for Firebase-authenticated users. The Firebase ID token IS the auth token. The Firebase SDK handles refresh on the client side.

---

## Data Flow: Fallback Email/Password (Unexposed)

```
Developer/Test              FastAPI Backend           PostgreSQL
   |                           |                        |
   | 1. GraphQL mutation       |                        |
   |    login(email, password) |                        |
   |--(direct API call)------->|                        |
   |                           |                        |
   |                           | 2. Validate + hash     |
   |                           |---SELECT user--------->|
   |                           |                        |
   |                           | 3. Issue JWT tokens    |
   |                           |---INSERT refresh_token>|
   |                           |                        |
   |<--access_token + refresh--|                        |
```

This flow is for development and testing only. Not reachable from the production UI.

---

## Database Tables

### `users` (auth-relevant columns)

| Column | Type | Constraints | Notes |
|--------|------|-------------|-------|
| id | CHAR(26) | PK | ULID |
| firebase_uid | VARCHAR(128) | UNIQUE, NULLABLE | Firebase Auth UID — primary auth identifier |
| email | VARCHAR(255) | UNIQUE, NOT NULL | From Firebase claims or signup |
| username | VARCHAR(50) | UNIQUE, NOT NULL | URL-safe, lowercase |
| password_hash | VARCHAR(255) | NULLABLE | Fallback auth only. NULL for Firebase-only users |
| github_username | VARCHAR(100) | NULLABLE, UNIQUE | From GitHub OAuth (via Firebase) |
| github_access_token_encrypted | VARCHAR(500) | NULLABLE | For GitHub API access (repo import) |
| onboarding_completed | BOOLEAN | DEFAULT FALSE | Set true after onboarding flow |
| created_at | TIMESTAMPTZ | DEFAULT NOW() | |
| updated_at | TIMESTAMPTZ | DEFAULT NOW() | |

### `refresh_tokens` (fallback auth only)

| Column | Type | Constraints | Notes |
|--------|------|-------------|-------|
| id | CHAR(26) | PK | ULID |
| user_id | CHAR(26) | FK -> users(id) ON DELETE CASCADE, NOT NULL | |
| token_hash | VARCHAR(64) | UNIQUE, NOT NULL | SHA-256 hash of the token |
| expires_at | TIMESTAMPTZ | NOT NULL | |
| created_at | TIMESTAMPTZ | DEFAULT NOW() | |
| revoked_at | TIMESTAMPTZ | NULLABLE | Set on logout / rotation |

### Auth-Related Indexes

```sql
CREATE INDEX idx_users_email ON users (email);
CREATE INDEX idx_users_username ON users (username);
CREATE UNIQUE INDEX idx_users_firebase_uid ON users (firebase_uid) WHERE firebase_uid IS NOT NULL;
CREATE INDEX idx_users_github_username ON users (github_username) WHERE github_username IS NOT NULL;
CREATE INDEX idx_refresh_tokens_user ON refresh_tokens (user_id);
CREATE INDEX idx_refresh_tokens_expires ON refresh_tokens (expires_at)
  WHERE revoked_at IS NULL;
```

### Secret Management (Auth-Related)

| Secret | Storage | Notes |
|--------|---------|-------|
| Firebase service account key | Environment variable / file | For `firebase-admin` SDK initialization |
| JWT signing key (fallback) | Environment variable | For home-grown token signing |
| GitHub user tokens | Encrypted in DB (Fernet, key from env var) | For GitHub API access (repo import) |

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
   - Firebase Auth SDK initializes, checks for persisted auth state.
   - If user is signed in, Firebase provides a valid ID token.
   - AuthProvider (Client Component) sets user state from Firebase.
   - Apollo Client uses the Firebase ID token in Authorization header.

2. On client-side navigation:
   - Firebase SDK auto-refreshes the ID token before expiry (1hr lifetime).
   - Apollo Client always gets a fresh token from Firebase before each request.
   - No manual refresh token management needed.

3. Token refresh:
   - Handled entirely by Firebase SDK on the client.
   - No backend endpoint needed for token refresh (for Firebase path).
   - Fallback JWT refresh token logic remains for the home-grown path.

4. Logout:
   - Firebase: firebase.auth().signOut() — clears Firebase session.
   - Apollo Client cache cleared.
   - Redirect to /.
   - If using fallback auth: POST /auth/logout revokes refresh token.
```
