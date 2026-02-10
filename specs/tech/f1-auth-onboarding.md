# F1: Authentication & Onboarding — Tech Spec

> See [overview.md](./overview.md) for full architecture context.

## Data Models

```python
# backend/models/user.py
from sqlalchemy import Column, String, DateTime, Boolean, Float, Enum, Text
from sqlalchemy.dialects.postgresql import JSONB, TSVECTOR
from sqlalchemy.sql import func
import enum

class UserRole(str, enum.Enum):
    ENGINEER = "engineer"
    DESIGNER = "designer"
    PM = "pm"
    MARKETER = "marketer"
    GROWTH = "growth"
    FOUNDER = "founder"
    OTHER = "other"

class AvailabilityStatus(str, enum.Enum):
    OPEN_TO_TRIBE = "open_to_tribe"
    AVAILABLE_FOR_PROJECTS = "available_for_projects"
    JUST_BROWSING = "just_browsing"

class User(Base):
    __tablename__ = "users"

    id = Column(String(26), primary_key=True)  # ULID
    email = Column(String(255), unique=True, nullable=False, index=True)
    password_hash = Column(String(255), nullable=True)  # null for GitHub-only users
    username = Column(String(50), unique=True, nullable=False, index=True)
    display_name = Column(String(100), nullable=False)
    avatar_url = Column(String(500), nullable=True)
    headline = Column(String(200), nullable=True)
    primary_role = Column(Enum(UserRole), nullable=True)
    timezone = Column(String(50), nullable=True)
    availability_status = Column(Enum(AvailabilityStatus), default=AvailabilityStatus.JUST_BROWSING)
    builder_score = Column(Float, default=0.0)
    bio = Column(Text, nullable=True)
    contact_links = Column(JSONB, default=dict)  # {"twitter": "...", "email": "...", "calendly": "..."}

    # GitHub
    github_username = Column(String(100), nullable=True, unique=True)
    github_access_token_encrypted = Column(String(500), nullable=True)

    # Onboarding
    onboarding_completed = Column(Boolean, default=False)

    # Full-text search
    search_vector = Column(TSVECTOR)

    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    __table_args__ = (
        Index("ix_users_search", "search_vector", postgresql_using="gin"),
        Index("ix_users_role_availability", "primary_role", "availability_status"),
    )
```

```python
# backend/models/refresh_token.py
class RefreshToken(Base):
    __tablename__ = "refresh_tokens"

    id = Column(String(26), primary_key=True)  # ULID
    user_id = Column(String(26), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    token_hash = Column(String(64), unique=True, nullable=False)  # SHA-256 of token
    expires_at = Column(DateTime(timezone=True), nullable=False)
    revoked_at = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    __table_args__ = (
        Index("ix_refresh_tokens_cleanup", "expires_at", "revoked_at"),
    )
```

## JWT Implementation

```python
# backend/auth/jwt.py
from datetime import datetime, timedelta, timezone
import jwt
from ulid import ULID

SECRET_KEY = os.environ["SECRET_KEY"]
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 15
REFRESH_TOKEN_EXPIRE_DAYS = 7

def create_access_token(user_id: str) -> str:
    payload = {
        "sub": user_id,
        "type": "access",
        "exp": datetime.now(timezone.utc) + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES),
        "iat": datetime.now(timezone.utc),
        "jti": str(ULID()),
    }
    return jwt.encode(payload, SECRET_KEY, algorithm=ALGORITHM)

def create_refresh_token(user_id: str) -> tuple[str, str]:
    """Returns (raw_token, token_hash) — store hash in DB, send raw to client."""
    raw_token = str(ULID()) + secrets.token_urlsafe(32)
    token_hash = hashlib.sha256(raw_token.encode()).hexdigest()
    return raw_token, token_hash

def verify_access_token(token: str) -> dict:
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        if payload.get("type") != "access":
            raise ValueError("Not an access token")
        return payload
    except jwt.ExpiredSignatureError:
        raise AuthError("Token expired", code="TOKEN_EXPIRED")
    except jwt.InvalidTokenError:
        raise AuthError("Invalid token", code="INVALID_TOKEN")
```

## Token Storage Strategy

- **Access token**: Stored in memory (React state / Apollo reactive var). Short-lived (15min), never persisted.
- **Refresh token**: `httpOnly`, `Secure`, `SameSite=Lax` cookie. Cannot be accessed by JavaScript.
- **CSRF protection**: `SameSite=Lax` prevents cross-site requests. Double-submit cookie for mutations.

```python
# backend/auth/middleware.py
from fastapi import Request, Response

def set_refresh_token_cookie(response: Response, token: str):
    response.set_cookie(
        key="refresh_token",
        value=token,
        httponly=True,
        secure=True,  # HTTPS only (disabled in dev)
        samesite="lax",
        max_age=7 * 24 * 3600,  # 7 days
        path="/",
    )

def clear_refresh_token_cookie(response: Response):
    response.delete_cookie(key="refresh_token", path="/")

async def get_current_user(request: Request) -> User | None:
    """FastAPI dependency — extracts user from Authorization header."""
    auth_header = request.headers.get("Authorization")
    if not auth_header or not auth_header.startswith("Bearer "):
        return None
    token = auth_header.split(" ")[1]
    payload = verify_access_token(token)
    user = await user_service.get_by_id(payload["sub"])
    return user
```

## GitHub OAuth Flow

**Scopes requested**: `read:user`, `user:email`, `repo` (for project import)

```
1. Frontend redirects to:
   https://github.com/login/oauth/authorize?
     client_id={GITHUB_CLIENT_ID}&
     redirect_uri={BACKEND_URL}/auth/github/callback&
     scope=read:user,user:email,repo&
     state={random_csrf_token}

2. GitHub redirects to callback with ?code=xxx&state=yyy

3. Backend POST /auth/github/callback:
   a. Verify state matches CSRF token
   b. Exchange code for access_token via GitHub API
   c. Fetch user profile: GET https://api.github.com/user
   d. Fetch emails: GET https://api.github.com/user/emails
   e. Find or create User:
      - If github_username exists in DB → login (update token)
      - If email exists in DB → link GitHub account
      - Else → create new User with github info
   f. Encrypt and store GitHub access_token
   g. Issue JWT access_token + refresh_token
   h. Redirect to frontend with access_token in URL fragment:
      {FRONTEND_URL}/auth/callback#access_token=xxx

4. Frontend extracts token, stores in memory, sets refresh cookie
```

```python
# backend/auth/github.py
GITHUB_CLIENT_ID = os.environ["GITHUB_CLIENT_ID"]
GITHUB_CLIENT_SECRET = os.environ["GITHUB_CLIENT_SECRET"]

async def exchange_code_for_token(code: str) -> str:
    async with httpx.AsyncClient() as client:
        response = await client.post(
            "https://github.com/login/oauth/access_token",
            json={
                "client_id": GITHUB_CLIENT_ID,
                "client_secret": GITHUB_CLIENT_SECRET,
                "code": code,
            },
            headers={"Accept": "application/json"},
        )
        data = response.json()
        if "error" in data:
            raise AuthError(f"GitHub OAuth error: {data['error_description']}")
        return data["access_token"]

async def get_github_user(access_token: str) -> dict:
    async with httpx.AsyncClient() as client:
        response = await client.get(
            "https://api.github.com/user",
            headers={"Authorization": f"Bearer {access_token}"},
        )
        return response.json()

async def get_github_emails(access_token: str) -> list[dict]:
    async with httpx.AsyncClient() as client:
        response = await client.get(
            "https://api.github.com/user/emails",
            headers={"Authorization": f"Bearer {access_token}"},
        )
        return response.json()
```

## GraphQL Types

```python
# backend/schema/types.py (auth-related)
import strawberry
from datetime import datetime

@strawberry.type
class AuthPayload:
    access_token: str
    user: "UserType"

@strawberry.input
class SignupInput:
    email: str
    password: str
    username: str
    display_name: str

@strawberry.input
class OnboardingInput:
    display_name: str
    headline: str | None = None
    primary_role: str
    timezone: str
    availability_status: str = "just_browsing"
    skill_ids: list[str] = strawberry.field(default_factory=list)
```

## Mutations

```python
# backend/schema/mutations.py (auth)
@strawberry.type
class Mutation:
    @strawberry.mutation
    async def signup(self, input: SignupInput, info: strawberry.types.Info) -> AuthPayload:
        # Validate email format, password strength (min 8 chars)
        # Check email/username uniqueness
        # Hash password with bcrypt (cost=12)
        # Create User with ULID
        # Create access + refresh tokens
        # Set refresh cookie on response
        # Create feed event: builder_joined
        ...

    @strawberry.mutation
    async def login(self, email: str, password: str, info: strawberry.types.Info) -> AuthPayload:
        # Find user by email
        # Verify password with bcrypt
        # Create access + refresh tokens
        # Set refresh cookie
        ...

    @strawberry.mutation
    async def refresh_token(self, info: strawberry.types.Info) -> AuthPayload:
        # Read refresh_token from cookie
        # Hash and look up in DB
        # Verify not expired, not revoked
        # Revoke old refresh token (one-time use)
        # Issue new access + refresh tokens
        # Set new refresh cookie
        ...

    @strawberry.mutation
    async def login_with_github(self, code: str, info: strawberry.types.Info) -> AuthPayload:
        # Exchange code for GitHub access token
        # Get GitHub user profile + emails
        # Find or create user
        # Store encrypted GitHub token
        # Issue JWT tokens
        ...

    @strawberry.mutation
    async def complete_onboarding(self, input: OnboardingInput, info: strawberry.types.Info) -> "UserType":
        # Requires auth
        # Update user profile fields
        # Add selected skills
        # Set onboarding_completed = True
        ...

    @strawberry.mutation
    async def logout(self, info: strawberry.types.Info) -> bool:
        # Revoke refresh token
        # Clear cookie
        ...
```

## Frontend Pages

```
app/
├── (auth)/
│   ├── login/page.tsx        # Email + password form, GitHub OAuth button
│   ├── signup/page.tsx       # Registration form, GitHub OAuth button
│   └── callback/page.tsx     # GitHub OAuth callback handler
├── onboarding/
│   ├── page.tsx              # Multi-step onboarding form
│   └── layout.tsx            # Onboarding-specific layout (no nav)
```

### Onboarding Steps (single page, multi-step form)

1. **Identity**: display_name, avatar upload, headline
2. **Role**: select primary_role from predefined list
3. **Skills**: multi-select from skill taxonomy (searchable)
4. **Availability**: timezone (auto-detected), availability_status
5. **First Project**: create or import from GitHub (or skip)

## Validation Rules

| Field | Constraints |
|-------|------------|
| `email` | Valid format, max 255 chars, unique |
| `password` | Min 8 chars, max 128 chars |
| `username` | 3-50 chars, alphanumeric + hyphens, unique, no reserved words |
| `display_name` | 1-100 chars |
| `headline` | Max 200 chars |
