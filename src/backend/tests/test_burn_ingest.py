"""Tests for burn ingest REST endpoints.

Covers POST /api/burn/ingest and GET /api/burn/verify-token.
Uses httpx.AsyncClient with the transactional test session.
"""

import hashlib
import secrets

import pytest
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.api_token import ApiToken
from app.models.project import Project
from app.models.user import User

# ---------------------------------------------------------------------------
# Fixtures
# ---------------------------------------------------------------------------


@pytest.fixture
async def api_token_fixture(async_session: AsyncSession, async_client: AsyncClient) -> dict:
    """Create a test user and API token, returning the raw fyt_ token string.

    Returns a dict with:
      - raw_token: the plaintext fyt_<64hex> token string
      - user: the User ORM object
      - api_token: the ApiToken ORM object
    """
    user = User(
        username="burntester",
        display_name="Burn Tester",
        email="burntester@example.com",
    )
    async_session.add(user)
    await async_session.flush()

    raw_token = f"fyt_{secrets.token_hex(32)}"
    token_hash = hashlib.sha256(raw_token.encode()).hexdigest()

    api_token = ApiToken(
        user_id=user.id,
        token_hash=token_hash,
        name="Test Extension",
    )
    async_session.add(api_token)
    await async_session.commit()

    return {"raw_token": raw_token, "user": user, "api_token": api_token}


# ---------------------------------------------------------------------------
# Tests
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_successful_ingest_returns_200_and_burn_id(
    async_client: AsyncClient,
    api_token_fixture: dict,
) -> None:
    """Valid API token + valid payload returns 200 with burn_id and day_total."""
    raw_token = api_token_fixture["raw_token"]

    resp = await async_client.post(
        "/api/burn/ingest",
        headers={"Authorization": f"Bearer {raw_token}"},
        json={
            "tokens_burned": 5000,
            "source": "anthropic",
            "verification": "provider_verified",
        },
    )

    assert resp.status_code == 200
    data = resp.json()
    assert data["status"] == "ok"
    assert "burn_id" in data
    assert len(data["burn_id"]) > 0
    assert data["project_matched"] is False
    assert data["project_id"] is None
    assert data["day_total"] >= 5000


@pytest.mark.asyncio
async def test_session_id_deduplication_returns_same_burn_id(
    async_client: AsyncClient,
    api_token_fixture: dict,
) -> None:
    """Second POST with same session_id returns the same burn_id without double-counting."""
    raw_token = api_token_fixture["raw_token"]
    session_id = f"sess_{secrets.token_hex(8)}"

    resp1 = await async_client.post(
        "/api/burn/ingest",
        headers={"Authorization": f"Bearer {raw_token}"},
        json={
            "tokens_burned": 3000,
            "source": "anthropic",
            "verification": "provider_verified",
            "session_id": session_id,
        },
    )
    assert resp1.status_code == 200
    burn_id_1 = resp1.json()["burn_id"]
    day_total_1 = resp1.json()["day_total"]

    resp2 = await async_client.post(
        "/api/burn/ingest",
        headers={"Authorization": f"Bearer {raw_token}"},
        json={
            "tokens_burned": 3000,
            "source": "anthropic",
            "verification": "provider_verified",
            "session_id": session_id,
        },
    )
    assert resp2.status_code == 200
    burn_id_2 = resp2.json()["burn_id"]
    day_total_2 = resp2.json()["day_total"]

    assert burn_id_1 == burn_id_2, "Duplicate session_id must return the same burn record"
    assert day_total_2 == day_total_1, "Day total must not increase on duplicate ingest"


@pytest.mark.asyncio
async def test_matched_project_hint_sets_project_matched_true(
    async_session: AsyncSession,
    async_client: AsyncClient,
    api_token_fixture: dict,
) -> None:
    """project_hint matching github_repo_full_name sets project_matched=True."""
    raw_token = api_token_fixture["raw_token"]
    user = api_token_fixture["user"]

    project = Project(
        owner_id=user.id,
        title="Awesome Repo",
        github_repo_full_name="testowner/awesome-repo",
    )
    async_session.add(project)
    await async_session.commit()

    # Clear project resolution cache so the fresh DB row is picked up
    from app.services.project_resolution import invalidate_project_cache

    invalidate_project_cache(user.id)

    resp = await async_client.post(
        "/api/burn/ingest",
        headers={"Authorization": f"Bearer {raw_token}"},
        json={
            "tokens_burned": 2000,
            "source": "anthropic",
            "verification": "provider_verified",
            "project_hint": "testowner/awesome-repo",
        },
    )

    assert resp.status_code == 200
    data = resp.json()
    assert data["project_matched"] is True
    assert data["project_id"] == project.id


@pytest.mark.asyncio
async def test_unmatched_project_hint_sets_project_matched_false(
    async_client: AsyncClient,
    api_token_fixture: dict,
) -> None:
    """project_hint that resolves to nothing sets project_matched=False and project_id=None."""
    raw_token = api_token_fixture["raw_token"]

    resp = await async_client.post(
        "/api/burn/ingest",
        headers={"Authorization": f"Bearer {raw_token}"},
        json={
            "tokens_burned": 1000,
            "source": "anthropic",
            "verification": "provider_verified",
            "project_hint": "ghost/repo-that-does-not-exist",
        },
    )

    assert resp.status_code == 200
    data = resp.json()
    assert data["project_matched"] is False
    assert data["project_id"] is None


@pytest.mark.asyncio
async def test_missing_authorization_header_returns_4xx(async_client: AsyncClient) -> None:
    """Request with no Authorization header is rejected (HTTPBearer returns 403)."""
    resp = await async_client.post(
        "/api/burn/ingest",
        json={
            "tokens_burned": 1000,
            "source": "anthropic",
            "verification": "provider_verified",
        },
    )
    # HTTPBearer with auto_error=True returns 403 for missing credentials
    assert resp.status_code in (401, 403)


@pytest.mark.asyncio
async def test_invalid_api_token_returns_401(async_client: AsyncClient) -> None:
    """Bearer token without fyt_ prefix is rejected with 401."""
    resp = await async_client.post(
        "/api/burn/ingest",
        headers={"Authorization": "Bearer not-a-valid-fyt-token"},
        json={
            "tokens_burned": 1000,
            "source": "anthropic",
            "verification": "provider_verified",
        },
    )
    assert resp.status_code == 401


@pytest.mark.asyncio
async def test_tokens_burned_zero_returns_422(
    async_client: AsyncClient,
    api_token_fixture: dict,
) -> None:
    """tokens_burned=0 fails Pydantic validation (Field gt=0) and returns 422."""
    raw_token = api_token_fixture["raw_token"]

    resp = await async_client.post(
        "/api/burn/ingest",
        headers={"Authorization": f"Bearer {raw_token}"},
        json={
            "tokens_burned": 0,
            "source": "anthropic",
            "verification": "provider_verified",
        },
    )
    # FastAPI returns 422 Unprocessable Entity for Pydantic validation errors
    assert resp.status_code == 422


@pytest.mark.asyncio
async def test_verify_token_returns_username_and_recent_burns(
    async_client: AsyncClient,
    api_token_fixture: dict,
) -> None:
    """GET /api/burn/verify-token returns username, display_name, and recent_burns list."""
    raw_token = api_token_fixture["raw_token"]
    user = api_token_fixture["user"]

    resp = await async_client.get(
        "/api/burn/verify-token",
        headers={"Authorization": f"Bearer {raw_token}"},
    )

    assert resp.status_code == 200
    data = resp.json()
    assert data["username"] == user.username
    assert data["display_name"] == user.display_name
    assert isinstance(data["recent_burns"], list)
