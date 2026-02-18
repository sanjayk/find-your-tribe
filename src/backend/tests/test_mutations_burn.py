"""Tests for burn GraphQL mutations (recordBurn, updateBurn, deleteBurn)."""

import datetime

from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession

from app.graphql.context import Context, context_getter
from app.main import app
from app.models.build_activity import BuildActivity
from app.services import auth_service

# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

RECORD_BURN_MUTATION = """
mutation RecordBurn($tokensBurned: Int!, $source: String!, $projectId: ID, $activityDate: Date) {
  burn {
    recordBurn(
      tokensBurned: $tokensBurned,
      source: $source,
      projectId: $projectId,
      activityDate: $activityDate,
    ) {
      daysActive
      totalTokens
      activeWeeks
      totalWeeks
      weeklyStreak
      dailyActivity {
        date
        tokens
      }
    }
  }
}
"""

UPDATE_BURN_MUTATION = """
mutation UpdateBurn($id: ID!, $tokensBurned: Int, $source: String) {
  burn {
    updateBurn(id: $id, tokensBurned: $tokensBurned, source: $source)
  }
}
"""

DELETE_BURN_MUTATION = """
mutation DeleteBurn($id: ID!) {
  burn {
    deleteBurn(id: $id)
  }
}
"""


async def _gql(client: AsyncClient, query: str, variables: dict | None = None) -> dict:
    resp = await client.post("/graphql", json={"query": query, "variables": variables or {}})
    assert resp.status_code == 200
    return resp.json()


async def _create_authed_user(session: AsyncSession) -> str:
    """Create a user via auth_service and return the user ID."""
    result = await auth_service.signup(
        session, email="burner@example.com", password="securepass1",
        username="burner", display_name="Burner",
    )
    return result["user"].id


def _set_auth(session: AsyncSession, user_id: str):
    """Override context_getter via FastAPI dependency overrides."""
    async def authed_getter(request=None, session_dep=None):
        return Context(session=session, current_user_id=user_id)
    app.dependency_overrides[context_getter] = authed_getter


def _clear_auth():
    """Remove the context_getter override."""
    app.dependency_overrides.pop(context_getter, None)


# ---------------------------------------------------------------------------
# recordBurn
# ---------------------------------------------------------------------------


async def test_record_burn_happy_path(
    async_client: AsyncClient, async_session: AsyncSession,
):
    """recordBurn creates a burn record and returns updated summary."""
    user_id = await _create_authed_user(async_session)
    _set_auth(async_session, user_id)
    try:
        body = await _gql(async_client, RECORD_BURN_MUTATION, {
            "tokensBurned": 500,
            "source": "anthropic",
            "activityDate": "2025-06-01",
        })
        assert body.get("errors") is None, body.get("errors")
        data = body["data"]["burn"]["recordBurn"]
        assert data["totalTokens"] == 500
        assert data["daysActive"] == 1
        assert len(data["dailyActivity"]) == 1
        assert data["dailyActivity"][0]["tokens"] == 500
    finally:
        _clear_auth()


async def test_record_burn_upsert_adds_tokens(
    async_client: AsyncClient, async_session: AsyncSession,
):
    """Recording burn for the same day/source upserts and increments tokens."""
    user_id = await _create_authed_user(async_session)
    _set_auth(async_session, user_id)
    try:
        await _gql(async_client, RECORD_BURN_MUTATION, {
            "tokensBurned": 300,
            "source": "anthropic",
            "activityDate": "2025-06-01",
        })
        body = await _gql(async_client, RECORD_BURN_MUTATION, {
            "tokensBurned": 200,
            "source": "anthropic",
            "activityDate": "2025-06-01",
        })
        assert body.get("errors") is None, body.get("errors")
        data = body["data"]["burn"]["recordBurn"]
        # 300 + 200 = 500
        assert data["totalTokens"] == 500
        assert data["daysActive"] == 1
    finally:
        _clear_auth()


async def test_record_burn_unauthenticated(async_client: AsyncClient):
    """recordBurn without auth returns an error."""
    body = await _gql(async_client, RECORD_BURN_MUTATION, {
        "tokensBurned": 100,
        "source": "anthropic",
    })
    assert body.get("errors")
    assert "Authentication required" in body["errors"][0]["message"]


# ---------------------------------------------------------------------------
# updateBurn
# ---------------------------------------------------------------------------


async def test_update_burn_happy_path(
    async_client: AsyncClient, async_session: AsyncSession,
):
    """updateBurn modifies a burn record."""
    user_id = await _create_authed_user(async_session)
    _set_auth(async_session, user_id)
    try:
        from ulid import ULID

        record = BuildActivity(
            id=str(ULID()),
            user_id=user_id,
            tokens_burned=100,
            source="anthropic",
            activity_date=datetime.date(2025, 6, 1),
        )
        async_session.add(record)
        await async_session.commit()
        await async_session.refresh(record)

        body = await _gql(async_client, UPDATE_BURN_MUTATION, {
            "id": record.id,
            "tokensBurned": 999,
        })
        assert body.get("errors") is None, body.get("errors")
        assert body["data"]["burn"]["updateBurn"] is True
    finally:
        _clear_auth()


async def test_update_burn_not_found(
    async_client: AsyncClient, async_session: AsyncSession,
):
    """updateBurn with a nonexistent ID returns False."""
    user_id = await _create_authed_user(async_session)
    _set_auth(async_session, user_id)
    try:
        body = await _gql(async_client, UPDATE_BURN_MUTATION, {
            "id": "00000000000000000000000000",
            "tokensBurned": 999,
        })
        assert body.get("errors") is None, body.get("errors")
        assert body["data"]["burn"]["updateBurn"] is False
    finally:
        _clear_auth()


async def test_update_burn_unauthenticated(async_client: AsyncClient):
    """updateBurn without auth returns an error."""
    body = await _gql(async_client, UPDATE_BURN_MUTATION, {
        "id": "00000000000000000000000000",
    })
    assert body.get("errors")
    assert "Authentication required" in body["errors"][0]["message"]


# ---------------------------------------------------------------------------
# deleteBurn
# ---------------------------------------------------------------------------


async def test_delete_burn_happy_path(
    async_client: AsyncClient, async_session: AsyncSession,
):
    """deleteBurn removes a burn record and returns True."""
    user_id = await _create_authed_user(async_session)
    _set_auth(async_session, user_id)
    try:
        from ulid import ULID

        record = BuildActivity(
            id=str(ULID()),
            user_id=user_id,
            tokens_burned=100,
            source="anthropic",
            activity_date=datetime.date(2025, 6, 1),
        )
        async_session.add(record)
        await async_session.commit()
        await async_session.refresh(record)

        body = await _gql(async_client, DELETE_BURN_MUTATION, {"id": record.id})
        assert body.get("errors") is None, body.get("errors")
        assert body["data"]["burn"]["deleteBurn"] is True
    finally:
        _clear_auth()


async def test_delete_burn_not_found(
    async_client: AsyncClient, async_session: AsyncSession,
):
    """deleteBurn with a nonexistent ID returns False."""
    user_id = await _create_authed_user(async_session)
    _set_auth(async_session, user_id)
    try:
        body = await _gql(async_client, DELETE_BURN_MUTATION, {"id": "00000000000000000000000000"})
        assert body.get("errors") is None, body.get("errors")
        assert body["data"]["burn"]["deleteBurn"] is False
    finally:
        _clear_auth()


async def test_delete_burn_wrong_user(
    async_client: AsyncClient, async_session: AsyncSession,
):
    """deleteBurn by a different user returns False (ownership check)."""
    user_id = await _create_authed_user(async_session)

    # Create a second user
    result2 = await auth_service.signup(
        async_session, email="other@example.com", password="securepass1",
        username="other", display_name="Other",
    )
    other_id = result2["user"].id

    # Create a burn record owned by the first user
    from ulid import ULID

    record = BuildActivity(
        id=str(ULID()),
        user_id=user_id,
        tokens_burned=100,
        source="anthropic",
        activity_date=datetime.date(2025, 6, 1),
    )
    async_session.add(record)
    await async_session.commit()
    await async_session.refresh(record)

    # Authenticate as the other user and try to delete
    _set_auth(async_session, other_id)
    try:
        body = await _gql(async_client, DELETE_BURN_MUTATION, {"id": record.id})
        assert body.get("errors") is None, body.get("errors")
        assert body["data"]["burn"]["deleteBurn"] is False
    finally:
        _clear_auth()
