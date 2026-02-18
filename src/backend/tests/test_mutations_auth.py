"""Tests for auth GraphQL mutations (signup, login, refreshToken, logout, completeOnboarding)."""

from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession

# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

SIGNUP_MUTATION = """
mutation Signup($email: String!, $password: String!, $username: String!, $displayName: String!) {
  auth {
    signup(email: $email, password: $password, username: $username, displayName: $displayName) {
      accessToken
      refreshToken
      user {
        id
        email
        username
        displayName
        onboardingCompleted
      }
    }
  }
}
"""

LOGIN_MUTATION = """
mutation Login($email: String!, $password: String!) {
  auth {
    login(email: $email, password: $password) {
      accessToken
      refreshToken
      user {
        id
        email
        username
      }
    }
  }
}
"""

REFRESH_TOKEN_MUTATION = """
mutation RefreshToken($token: String!) {
  auth {
    refreshToken(token: $token) {
      accessToken
      refreshToken
      user {
        id
        email
      }
    }
  }
}
"""

LOGOUT_MUTATION = """
mutation Logout($token: String!) {
  auth {
    logout(token: $token)
  }
}
"""

COMPLETE_ONBOARDING_MUTATION = """
mutation CompleteOnboarding(
  $displayName: String!,
  $headline: String,
  $primaryRole: String,
  $timezone: String,
  $availabilityStatus: String,
) {
  auth {
    completeOnboarding(
      displayName: $displayName,
      headline: $headline,
      primaryRole: $primaryRole,
      timezone: $timezone,
      availabilityStatus: $availabilityStatus,
    ) {
      id
      displayName
      headline
      onboardingCompleted
    }
  }
}
"""


async def _gql(client: AsyncClient, query: str, variables: dict | None = None) -> dict:
    """Send a GraphQL request and return the JSON body."""
    resp = await client.post("/graphql", json={"query": query, "variables": variables or {}})
    assert resp.status_code == 200
    return resp.json()


async def _signup_user(
    client: AsyncClient,
    email: str = "alice@example.com",
    password: str = "securepass123",
    username: str = "alice",
    display_name: str = "Alice A",
) -> dict:
    """Convenience: sign up a user and return the full auth payload data."""
    body = await _gql(client, SIGNUP_MUTATION, {
        "email": email,
        "password": password,
        "username": username,
        "displayName": display_name,
    })
    return body["data"]["auth"]["signup"]


# ---------------------------------------------------------------------------
# signup
# ---------------------------------------------------------------------------


async def test_signup_happy_path(async_client: AsyncClient):
    """Signup returns access/refresh tokens and the new user."""
    data = await _signup_user(async_client)
    assert data["accessToken"]
    assert data["refreshToken"]
    assert data["user"]["email"] == "alice@example.com"
    assert data["user"]["username"] == "alice"
    assert data["user"]["displayName"] == "Alice A"
    assert data["user"]["onboardingCompleted"] is False


async def test_signup_duplicate_email(async_client: AsyncClient):
    """Signup with an already-registered email returns an error."""
    await _signup_user(async_client)
    body = await _gql(async_client, SIGNUP_MUTATION, {
        "email": "alice@example.com",
        "password": "anotherpass1",
        "username": "alice2",
        "displayName": "Alice 2",
    })
    assert body.get("errors")
    assert "Email already registered" in body["errors"][0]["message"]


async def test_signup_duplicate_username(async_client: AsyncClient):
    """Signup with an already-taken username returns an error."""
    await _signup_user(async_client)
    body = await _gql(async_client, SIGNUP_MUTATION, {
        "email": "other@example.com",
        "password": "securepass123",
        "username": "alice",
        "displayName": "Other Alice",
    })
    assert body.get("errors")
    assert "Username already taken" in body["errors"][0]["message"]


async def test_signup_invalid_email(async_client: AsyncClient):
    """Signup with malformed email returns an error."""
    body = await _gql(async_client, SIGNUP_MUTATION, {
        "email": "not-an-email",
        "password": "securepass123",
        "username": "badmail",
        "displayName": "Bad Mail",
    })
    assert body.get("errors")
    assert "Invalid email format" in body["errors"][0]["message"]


async def test_signup_short_password(async_client: AsyncClient):
    """Signup with a password shorter than 8 characters returns an error."""
    body = await _gql(async_client, SIGNUP_MUTATION, {
        "email": "short@example.com",
        "password": "abc",
        "username": "shortpw",
        "displayName": "Short PW",
    })
    assert body.get("errors")
    assert "Password must be at least 8 characters" in body["errors"][0]["message"]


# ---------------------------------------------------------------------------
# login
# ---------------------------------------------------------------------------


async def test_login_happy_path(async_client: AsyncClient):
    """Login with correct credentials returns tokens and user."""
    await _signup_user(async_client, email="bob@example.com", username="bob", display_name="Bob B")
    body = await _gql(async_client, LOGIN_MUTATION, {
        "email": "bob@example.com",
        "password": "securepass123",
    })
    data = body["data"]["auth"]["login"]
    assert data["accessToken"]
    assert data["refreshToken"]
    assert data["user"]["email"] == "bob@example.com"


async def test_login_wrong_password(async_client: AsyncClient):
    """Login with wrong password returns an error."""
    await _signup_user(async_client, email="carol@example.com", username="carol")
    body = await _gql(async_client, LOGIN_MUTATION, {
        "email": "carol@example.com",
        "password": "wrong_password",
    })
    assert body.get("errors")
    assert "Invalid email or password" in body["errors"][0]["message"]


async def test_login_nonexistent_email(async_client: AsyncClient):
    """Login with an email that does not exist returns an error."""
    body = await _gql(async_client, LOGIN_MUTATION, {
        "email": "nobody@example.com",
        "password": "password123",
    })
    assert body.get("errors")
    assert "Invalid email or password" in body["errors"][0]["message"]


# ---------------------------------------------------------------------------
# refreshToken
# ---------------------------------------------------------------------------


async def test_refresh_token_happy_path(async_client: AsyncClient):
    """Refreshing a valid token returns new access and refresh tokens."""
    signup = await _signup_user(async_client)
    old_refresh = signup["refreshToken"]
    body = await _gql(async_client, REFRESH_TOKEN_MUTATION, {"token": old_refresh})
    data = body["data"]["auth"]["refreshToken"]
    assert data["accessToken"]
    assert data["refreshToken"]
    assert data["refreshToken"] != old_refresh


async def test_refresh_token_invalid(async_client: AsyncClient):
    """Refreshing with a bogus token returns an error."""
    body = await _gql(async_client, REFRESH_TOKEN_MUTATION, {"token": "totally-bogus"})
    assert body.get("errors")
    assert "Invalid refresh token" in body["errors"][0]["message"]


async def test_refresh_token_reuse_returns_error(async_client: AsyncClient):
    """Using a refresh token twice returns a 'revoked' error (token rotation)."""
    signup = await _signup_user(async_client, email="rotate@example.com", username="rotate")
    old_refresh = signup["refreshToken"]
    # First use succeeds
    await _gql(async_client, REFRESH_TOKEN_MUTATION, {"token": old_refresh})
    # Second use fails
    body = await _gql(async_client, REFRESH_TOKEN_MUTATION, {"token": old_refresh})
    assert body.get("errors")
    assert "revoked" in body["errors"][0]["message"].lower()


# ---------------------------------------------------------------------------
# logout
# ---------------------------------------------------------------------------


async def test_logout_happy_path(async_client: AsyncClient):
    """Logout revokes the refresh token."""
    signup = await _signup_user(async_client, email="eve@example.com", username="eve")
    refresh = signup["refreshToken"]
    body = await _gql(async_client, LOGOUT_MUTATION, {"token": refresh})
    assert body["data"]["auth"]["logout"] is True

    # The refresh token should now be revoked
    body2 = await _gql(async_client, REFRESH_TOKEN_MUTATION, {"token": refresh})
    assert body2.get("errors")
    assert "revoked" in body2["errors"][0]["message"].lower()


async def test_logout_double_logout_is_safe(async_client: AsyncClient):
    """Logging out twice with the same token does not raise."""
    signup = await _signup_user(async_client, email="frank@example.com", username="frank")
    refresh = signup["refreshToken"]
    body1 = await _gql(async_client, LOGOUT_MUTATION, {"token": refresh})
    assert body1["data"]["auth"]["logout"] is True
    body2 = await _gql(async_client, LOGOUT_MUTATION, {"token": refresh})
    assert body2["data"]["auth"]["logout"] is True


# ---------------------------------------------------------------------------
# completeOnboarding (requires auth)
# ---------------------------------------------------------------------------


async def test_complete_onboarding_happy_path(
    async_client: AsyncClient, async_session: AsyncSession,
):
    """completeOnboarding sets profile fields and marks onboarding done."""
    signup = await _signup_user(async_client, email="grace@example.com", username="grace")
    user_id = signup["user"]["id"]

    # Override context_getter via FastAPI dependency overrides
    from app.graphql.context import Context, context_getter
    from app.main import app

    async def authed_context_getter(request=None, session=None):
        return Context(session=async_session, current_user_id=user_id)

    app.dependency_overrides[context_getter] = authed_context_getter
    try:
        body = await _gql(async_client, COMPLETE_ONBOARDING_MUTATION, {
            "displayName": "Grace Updated",
            "headline": "Full-Stack Engineer",
            "primaryRole": "engineer",
            "timezone": "America/New_York",
            "availabilityStatus": "open_to_tribe",
        })
        assert body.get("errors") is None, body.get("errors")
        data = body["data"]["auth"]["completeOnboarding"]
        assert data["displayName"] == "Grace Updated"
        assert data["headline"] == "Full-Stack Engineer"
        assert data["onboardingCompleted"] is True
    finally:
        app.dependency_overrides.pop(context_getter, None)


async def test_complete_onboarding_unauthenticated(async_client: AsyncClient):
    """completeOnboarding without auth returns an error."""
    body = await _gql(async_client, COMPLETE_ONBOARDING_MUTATION, {
        "displayName": "Ghost",
    })
    assert body.get("errors")
    assert "Authentication required" in body["errors"][0]["message"]
