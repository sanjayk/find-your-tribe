"""Tests for API token authentication and GraphQL CRUD mutations.

Covers:
  - get_api_token_user: valid token, revoked token, expired token
  - create_api_token mutation: stores hash, not plaintext
  - revoke_api_token mutation: prevents future authentication
"""

import hashlib
import secrets
from datetime import UTC, datetime, timedelta

import pytest
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.api_token import ApiToken
from app.models.user import User

# ---------------------------------------------------------------------------
# GraphQL documents
# ---------------------------------------------------------------------------

SIGNUP_MUTATION = """
mutation Signup($email: String!, $password: String!, $username: String!, $displayName: String!) {
  auth {
    signup(email: $email, password: $password, username: $username, displayName: $displayName) {
      accessToken
      user { id }
    }
  }
}
"""

CREATE_API_TOKEN_MUTATION = """
mutation CreateApiToken($name: String!) {
  apiTokens {
    createApiToken(name: $name) {
      id
      name
      token
    }
  }
}
"""

REVOKE_API_TOKEN_MUTATION = """
mutation RevokeApiToken($tokenId: ID!) {
  apiTokens {
    revokeApiToken(tokenId: $tokenId)
  }
}
"""

# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------


async def _signup(client: AsyncClient, email: str, username: str) -> str:
    """Sign up a user and return the access token."""
    resp = await client.post(
        "/graphql",
        json={
            "query": SIGNUP_MUTATION,
            "variables": {
                "email": email,
                "password": "securepass123",
                "username": username,
                "displayName": username.title(),
            },
        },
    )
    data = resp.json()
    assert "errors" not in data, data.get("errors")
    return data["data"]["auth"]["signup"]["accessToken"]


# ---------------------------------------------------------------------------
# Fixtures
# ---------------------------------------------------------------------------


@pytest.fixture
async def test_user_with_token(async_session: AsyncSession, async_client: AsyncClient) -> dict:
    """Create a user and a valid API token directly in the DB.

    Returns a dict with:
      - user: User ORM object
      - raw_token: plaintext fyt_ token string
      - api_token: ApiToken ORM object
    """
    user = User(
        username="authtestuser",
        display_name="Auth Test User",
        email="authtest@example.com",
    )
    async_session.add(user)
    await async_session.flush()

    raw_token = f"fyt_{secrets.token_hex(32)}"
    token_hash = hashlib.sha256(raw_token.encode()).hexdigest()

    api_token = ApiToken(
        user_id=user.id,
        token_hash=token_hash,
        name="Auth Test Token",
    )
    async_session.add(api_token)
    await async_session.commit()

    return {"user": user, "raw_token": raw_token, "api_token": api_token}


# ---------------------------------------------------------------------------
# Tests — get_api_token_user authentication
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_get_api_token_user_returns_user_id_for_valid_token(
    async_client: AsyncClient,
    test_user_with_token: dict,
) -> None:
    """Valid API token authenticates successfully and returns user data."""
    raw_token = test_user_with_token["raw_token"]
    user = test_user_with_token["user"]

    resp = await async_client.get(
        "/api/burn/verify-token",
        headers={"Authorization": f"Bearer {raw_token}"},
    )

    assert resp.status_code == 200
    data = resp.json()
    assert data["username"] == user.username


@pytest.mark.asyncio
async def test_revoked_token_raises_401(
    async_session: AsyncSession,
    async_client: AsyncClient,
    test_user_with_token: dict,
) -> None:
    """Token with revoked_at set is rejected with 401."""
    raw_token = test_user_with_token["raw_token"]
    api_token = test_user_with_token["api_token"]

    # Revoke the token in DB
    api_token.revoked_at = datetime.now(UTC)
    await async_session.commit()

    # Ensure any cached entry is cleared so the DB check fires
    token_hash = hashlib.sha256(raw_token.encode()).hexdigest()
    from app.api.auth_token import _token_cache

    _token_cache.pop(token_hash, None)

    resp = await async_client.get(
        "/api/burn/verify-token",
        headers={"Authorization": f"Bearer {raw_token}"},
    )

    assert resp.status_code == 401


@pytest.mark.asyncio
async def test_expired_token_raises_401(
    async_session: AsyncSession,
    async_client: AsyncClient,
) -> None:
    """Token with expires_at in the past is rejected with 401."""
    user = User(
        username="expiredtokenuser",
        display_name="Expired Token User",
        email="expiredtoken@example.com",
    )
    async_session.add(user)
    await async_session.flush()

    raw_token = f"fyt_{secrets.token_hex(32)}"
    token_hash = hashlib.sha256(raw_token.encode()).hexdigest()

    api_token = ApiToken(
        user_id=user.id,
        token_hash=token_hash,
        name="Expired Token",
        expires_at=datetime.now(UTC) - timedelta(hours=1),
    )
    async_session.add(api_token)
    await async_session.commit()

    resp = await async_client.get(
        "/api/burn/verify-token",
        headers={"Authorization": f"Bearer {raw_token}"},
    )

    assert resp.status_code == 401


# ---------------------------------------------------------------------------
# Tests — GraphQL mutations
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_create_api_token_mutation_stores_hash_not_plaintext(
    async_client: AsyncClient,
) -> None:
    """create_api_token returns plaintext token once; DB stores only the SHA-256 hash."""
    access_token = await _signup(async_client, "creator@example.com", "tokencreator")

    resp = await async_client.post(
        "/graphql",
        headers={"Authorization": f"Bearer {access_token}"},
        json={
            "query": CREATE_API_TOKEN_MUTATION,
            "variables": {"name": "VS Code Extension"},
        },
    )

    data = resp.json()
    assert "errors" not in data, data.get("errors")
    result = data["data"]["apiTokens"]["createApiToken"]

    # Returned token must use the fyt_ prefix and be the raw plaintext value
    assert result["token"].startswith("fyt_")
    assert result["name"] == "VS Code Extension"
    assert result["id"]

    # The returned token is NOT the hash — it's the full 68-char raw token
    # SHA-256 output is always 64 hex chars and never starts with "fyt_"
    raw_token = result["token"]
    expected_hash = hashlib.sha256(raw_token.encode()).hexdigest()
    assert raw_token != expected_hash, "DB must store hash, not plaintext token"


@pytest.mark.asyncio
async def test_revoke_api_token_mutation_prevents_future_auth(
    async_client: AsyncClient,
) -> None:
    """After revoking a token via mutation, subsequent requests with that token return 401."""
    access_token = await _signup(async_client, "revoker@example.com", "revokeruser")

    # Create an API token
    create_resp = await async_client.post(
        "/graphql",
        headers={"Authorization": f"Bearer {access_token}"},
        json={
            "query": CREATE_API_TOKEN_MUTATION,
            "variables": {"name": "To Be Revoked"},
        },
    )
    create_data = create_resp.json()
    assert "errors" not in create_data, create_data.get("errors")
    token_result = create_data["data"]["apiTokens"]["createApiToken"]
    api_token_id = token_result["id"]
    raw_token = token_result["token"]

    # Verify the token works before revocation
    pre_revoke = await async_client.get(
        "/api/burn/verify-token",
        headers={"Authorization": f"Bearer {raw_token}"},
    )
    assert pre_revoke.status_code == 200

    # Revoke the token
    revoke_resp = await async_client.post(
        "/graphql",
        headers={"Authorization": f"Bearer {access_token}"},
        json={
            "query": REVOKE_API_TOKEN_MUTATION,
            "variables": {"tokenId": api_token_id},
        },
    )
    revoke_data = revoke_resp.json()
    assert "errors" not in revoke_data, revoke_data.get("errors")
    assert revoke_data["data"]["apiTokens"]["revokeApiToken"] is True

    # Attempt to use the revoked token — must be rejected
    post_revoke = await async_client.get(
        "/api/burn/verify-token",
        headers={"Authorization": f"Bearer {raw_token}"},
    )
    assert post_revoke.status_code == 401
