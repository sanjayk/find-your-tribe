# F1: Authentication & Onboarding — Tech Spec

> See [overview.md](./overview.md) for full architecture context.

## Auth Architecture

Two auth paths, one user table:

- **Primary (Firebase Auth):** Google + GitHub OAuth via Firebase SDK. Frontend handles sign-in, backend verifies Firebase ID tokens. No session infrastructure needed.
- **Fallback (home-grown):** Email/password with JWT. Fully built, not exposed in UI. Used for dev, tests, and emergencies.

---

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
    firebase_uid = Column(String(128), unique=True, nullable=True, index=True)  # Firebase Auth UID
    email = Column(String(255), unique=True, nullable=False, index=True)
    password_hash = Column(String(255), nullable=True)  # Fallback auth only. NULL for Firebase users
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

    # GitHub (from Firebase GitHub provider)
    github_username = Column(String(100), nullable=True, unique=True)
    github_access_token_encrypted = Column(String(500), nullable=True)  # For GitHub API access

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
# backend/models/refresh_token.py (fallback auth only)
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

---

## Firebase Auth Integration (Primary)

### Backend: Token Verification

```python
# backend/auth/firebase.py
import firebase_admin
from firebase_admin import auth as firebase_auth, credentials

# Initialize once at app startup
cred = credentials.Certificate("path/to/service-account.json")  # or from env var
firebase_admin.initialize_app(cred)

async def verify_firebase_token(token: str) -> dict:
    """Verify a Firebase ID token. Returns decoded claims."""
    try:
        decoded = firebase_auth.verify_id_token(token)
        return decoded
    except firebase_auth.InvalidIdTokenError:
        raise AuthError("Invalid Firebase token", code="INVALID_TOKEN")
    except firebase_auth.ExpiredIdTokenError:
        raise AuthError("Firebase token expired", code="TOKEN_EXPIRED")
```

### Backend: User Resolution from Firebase Claims

```python
# backend/services/firebase_auth_service.py
async def find_or_create_user_from_firebase(
    session: AsyncSession,
    firebase_claims: dict,
) -> tuple[User, bool]:
    """Resolve a Firebase ID token to a User. Returns (user, is_new).

    Account linking strategy: auto-merge on matching email.
    1. If firebase_uid exists in DB → return existing user.
    2. If email matches an existing user → link firebase_uid, return user.
    3. Otherwise → create new user.
    """
    firebase_uid = firebase_claims["uid"]
    email = firebase_claims.get("email")
    name = firebase_claims.get("name", "")
    picture = firebase_claims.get("picture")
    provider = firebase_claims.get("firebase", {}).get("sign_in_provider", "")

    # 1. Look up by firebase_uid
    stmt = select(User).where(User.firebase_uid == firebase_uid)
    user = (await session.execute(stmt)).scalar_one_or_none()
    if user:
        return user, False

    # 2. Look up by email (account linking)
    if email:
        stmt = select(User).where(User.email == email)
        user = (await session.execute(stmt)).scalar_one_or_none()
        if user:
            user.firebase_uid = firebase_uid
            if picture and not user.avatar_url:
                user.avatar_url = picture
            # Extract GitHub username if signing in via GitHub
            if provider == "github.com":
                github_username = firebase_claims.get("firebase", {}).get("identities", {}).get("github.com", [None])[0]
                if github_username:
                    user.github_username = str(github_username)
            await session.commit()
            await session.refresh(user)
            return user, False

    # 3. Create new user
    username = _generate_username(name or email.split("@")[0])
    user = User(
        id=str(ULID()),
        firebase_uid=firebase_uid,
        email=email,
        username=username,
        display_name=name or username,
        avatar_url=picture,
        onboarding_completed=False,
    )
    if provider == "github.com":
        # Extract GitHub-specific data from Firebase claims
        pass  # GitHub username extraction as above
    session.add(user)
    await session.commit()
    await session.refresh(user)
    return user, True
```

### Backend: Auth Middleware (Dual-Path)

```python
# backend/graphql/context.py (updated)
async def _extract_user_id(request: Request, session: AsyncSession) -> str | None:
    """Extract user_id from Authorization header. Tries Firebase first, then fallback JWT."""
    auth_header = request.headers.get("Authorization")
    if not auth_header or not auth_header.startswith("Bearer "):
        return None

    token = auth_header.split(" ", 1)[1]

    # Primary: Firebase ID token
    try:
        claims = await verify_firebase_token(token)
        user, is_new = await find_or_create_user_from_firebase(session, claims)
        return user.id
    except Exception:
        pass

    # Fallback: home-grown JWT
    try:
        payload = verify_access_token(token)
        return payload["sub"]
    except Exception:
        return None
```

---

## Home-Grown Auth (Fallback — Unchanged)

### JWT Implementation

```python
# backend/auth/jwt.py
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

---

## GraphQL Types

```python
# backend/schema/types.py (auth-related)
import strawberry
from datetime import datetime

@strawberry.type
class AuthPayload:
    access_token: str
    refresh_token: str  # Only used by fallback auth
    user: "UserType"

@strawberry.input
class SignupInput:
    email: str
    password: str
    username: str
    display_name: str
```

---

## Mutations

### Fallback Auth Mutations (Unexposed — Kept for Dev/Tests)

```python
@strawberry.type
class AuthMutations:
    @strawberry.mutation
    async def signup(self, email: str, password: str, username: str, display_name: str,
                     info: strawberry.types.Info) -> AuthPayload:
        # Existing implementation — unchanged
        ...

    @strawberry.mutation
    async def login(self, email: str, password: str, info: strawberry.types.Info) -> AuthPayload:
        # Existing implementation — unchanged
        ...

    @strawberry.mutation
    async def refresh_token(self, token: str, info: strawberry.types.Info) -> AuthPayload:
        # Existing implementation — unchanged
        ...

    @strawberry.mutation
    async def logout(self, token: str, info: strawberry.types.Info) -> bool:
        # Existing implementation — unchanged
        ...

    @strawberry.mutation
    async def complete_onboarding(self, info: strawberry.types.Info) -> "UserType":
        # Marks onboarding_completed = True. No profile fields — those are in Settings.
        user_id = require_auth(info)
        session = info.context.session
        user = await get_user(session, user_id)
        user.onboarding_completed = True
        await session.commit()
        await session.refresh(user)
        return UserType.from_model(user)
```

### Queries

```python
@strawberry.type
class Query:
    @strawberry.field
    async def me(self, info: strawberry.types.Info) -> "UserType | None":
        """Return the current authenticated user. Works with both Firebase and fallback auth."""
        user_id = info.context.current_user_id
        if not user_id:
            return None
        session = info.context.session
        user = await get_user(session, user_id)
        return UserType.from_model(user) if user else None
```

---

## Frontend Implementation

### Dependencies

```json
{
  "firebase": "^11.x",
  "@firebase/auth": "^1.x"
}
```

### Firebase Client Setup

```typescript
// lib/firebase/config.ts
import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
};

export const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
```

### Auth Hook (Updated)

```typescript
// hooks/use-auth.ts
import { useEffect, useState, useCallback } from 'react';
import {
  signInWithPopup,
  GithubAuthProvider,
  GoogleAuthProvider,
  onAuthStateChanged,
  signOut,
  type User as FirebaseUser,
} from 'firebase/auth';
import { auth } from '@/lib/firebase/config';

interface AuthState {
  user: FirebaseUser | null;
  accessToken: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
}

export function useAuth() {
  const [state, setState] = useState<AuthState>({
    user: null, accessToken: null, isAuthenticated: false, isLoading: true,
  });

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        const token = await firebaseUser.getIdToken();
        setState({
          user: firebaseUser,
          accessToken: token,
          isAuthenticated: true,
          isLoading: false,
        });
      } else {
        setState({
          user: null, accessToken: null, isAuthenticated: false, isLoading: false,
        });
      }
    });
    return unsubscribe;
  }, []);

  const signInWithGitHub = useCallback(async () => {
    const provider = new GithubAuthProvider();
    provider.addScope('read:user');
    provider.addScope('user:email');
    return signInWithPopup(auth, provider);
  }, []);

  const signInWithGoogle = useCallback(async () => {
    const provider = new GoogleAuthProvider();
    return signInWithPopup(auth, provider);
  }, []);

  const logout = useCallback(async () => {
    await signOut(auth);
  }, []);

  // Get fresh token for API calls (Firebase auto-refreshes)
  const getToken = useCallback(async () => {
    const user = auth.currentUser;
    if (!user) return null;
    return user.getIdToken();
  }, []);

  return { ...state, signInWithGitHub, signInWithGoogle, logout, getToken };
}
```

### Apollo Client Auth Link (Updated)

```typescript
// lib/graphql/client.ts
import { setContext } from '@apollo/client/link/context';
import { auth } from '@/lib/firebase/config';

const authLink = setContext(async (_, { headers }) => {
  // Get fresh Firebase ID token (auto-refreshed by SDK)
  const user = auth.currentUser;
  const token = user ? await user.getIdToken() : null;

  // Fallback: check localStorage for home-grown JWT (dev/test only)
  const fallbackToken = typeof window !== 'undefined'
    ? JSON.parse(localStorage.getItem('tribe_auth') || 'null')?.accessToken
    : null;

  return {
    headers: {
      ...headers,
      Authorization: token ? `Bearer ${token}` : fallbackToken ? `Bearer ${fallbackToken}` : '',
    },
  };
});
```

### Frontend Pages

```
app/
├── (auth)/
│   ├── login/page.tsx        # Kept but removed from nav (fallback only)
│   └── signup/page.tsx       # Kept but removed from nav (fallback only)
├── onboarding/
│   ├── page.tsx              # 4-screen onboarding flow (client component)
│   └── layout.tsx            # Onboarding-specific layout (no nav, logo only)
```

**Removed:** No `/auth/callback` page needed. Firebase SDK handles OAuth callbacks internally via popup.

---

## Onboarding Flow (Frontend)

### Component Structure

```typescript
// app/onboarding/page.tsx (client component)
"use client";

// 4-screen flow managed by local state
// Screen 1: Constellation — role selection
// Screen 2: What Counts — project examples (static)
// Screen 3: Builder Identity — aspirational profile card (static)
// Screen 4: Go — CTAs to feed or settings

interface OnboardingState {
  currentStep: number;        // 0-3
  selectedRole: string | null; // from Screen 1: "code" | "design" | "product" | "growth" | "operations" | "other"
}
```

### Screen 1: Role Capture

```typescript
// Role selection is captured and sent to backend on completion
// Updates user.primary_role via a GraphQL mutation

const ROLE_OPTIONS = [
  { id: "code", label: "Code" },
  { id: "design", label: "Design" },
  { id: "product", label: "Product" },
  { id: "growth", label: "Growth" },
  { id: "operations", label: "Operations" },
  { id: "other", label: "Other" },
] as const;
```

### Completion: Mutation

```python
# Updated complete_onboarding mutation — now accepts role from Screen 1
@strawberry.mutation
async def complete_onboarding(
    self,
    primary_role: str | None = None,
    info: strawberry.types.Info,
) -> "UserType":
    user_id = require_auth(info)
    session = info.context.session
    user = await get_user(session, user_id)
    if primary_role:
        user.primary_role = primary_role
    user.onboarding_completed = True
    await session.commit()
    await session.refresh(user)
    return UserType.from_model(user)
```

### Constellation Animation

```typescript
// CSS animation for the constellation (Screen 1)
// 5 circles appear with staggered delay (200ms each)
// Lines connect between circles (150ms each, after circles)
// Total animation: ~1.5s
// Implementation: CSS keyframes + animation-delay, no JS animation library needed
// Circles: 12px, surface-secondary fill, ink-tertiary stroke
// Lines: 1px ink-tertiary, SVG paths
```

---

## Validation Rules

| Field | Constraints |
|-------|------------|
| `email` | Valid format, max 255 chars, unique (from Firebase claims) |
| `username` | 3-50 chars, alphanumeric + hyphens, unique, no reserved words (auto-generated on first sign-in) |
| `display_name` | 1-100 chars (from Firebase claims, editable in settings) |
| `password` | Min 8 chars, max 128 chars (fallback auth only) |
| `headline` | Max 200 chars (set in settings, not onboarding) |

---

## Backend Dependencies

```
firebase-admin>=6.0        # Firebase ID token verification
```

## Frontend Dependencies

```
firebase>=11.0             # Firebase Auth SDK (Google + GitHub OAuth)
```
