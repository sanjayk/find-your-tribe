"""Tests for tag_suggestions, search_users, invite_token_info, my_pending_invitations queries."""

from datetime import UTC, datetime
from unittest.mock import AsyncMock, MagicMock, patch

import pytest

from app.graphql.context import Context
from app.graphql.helpers import AuthError
from app.graphql.queries.health import Query

# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------


def _make_info(session, current_user_id=None):
    context = Context(session=session, current_user_id=current_user_id)

    class MockInfo:
        def __init__(self, ctx):
            self.context = ctx

    return MockInfo(context)


# ---------------------------------------------------------------------------
# tag_suggestions
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_tag_suggestions_returns_matching_tags():
    """tag_suggestions filters by query substring (case-insensitive)."""
    query = Query()
    results = await query.tag_suggestions(field="tech_stack", query="Re")
    assert "React" in results
    assert "Redis" in results
    # Non-matching tags should not appear
    assert all("re" in tag.lower() for tag in results)


@pytest.mark.asyncio
async def test_tag_suggestions_returns_all_when_no_query():
    """tag_suggestions returns first 10 results when query is empty."""
    query = Query()
    results = await query.tag_suggestions(field="tech_stack", query="")
    assert len(results) == 10


@pytest.mark.asyncio
async def test_tag_suggestions_invalid_field_returns_empty():
    """tag_suggestions returns [] for an unknown field."""
    query = Query()
    results = await query.tag_suggestions(field="invalid_field", query="anything")
    assert results == []


@pytest.mark.asyncio
async def test_tag_suggestions_respects_limit():
    """tag_suggestions respects the limit parameter."""
    query = Query()
    results = await query.tag_suggestions(field="tech_stack", query="", limit=3)
    assert len(results) == 3


@pytest.mark.asyncio
async def test_tag_suggestions_case_insensitive_match():
    """tag_suggestions matches case-insensitively (uppercase query against mixed-case tags)."""
    query = Query()
    results = await query.tag_suggestions(field="tech_stack", query="REACT")
    assert "React" in results


@pytest.mark.asyncio
async def test_tag_suggestions_domains_field():
    """tag_suggestions works for domains field."""
    query = Query()
    results = await query.tag_suggestions(field="domains", query="AI")
    assert "AI/ML" in results


@pytest.mark.asyncio
async def test_tag_suggestions_empty_field_candidates():
    """tag_suggestions with a valid field but no query matches returns all candidates up to limit."""
    query = Query()
    results = await query.tag_suggestions(field="build_style", query="", limit=5)
    assert len(results) == 5


# ---------------------------------------------------------------------------
# search_users
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_search_users_requires_auth():
    """search_users raises AuthError when not authenticated."""
    mock_session = AsyncMock()
    info = _make_info(mock_session, current_user_id=None)

    query = Query()
    with pytest.raises(AuthError):
        await query.search_users(info=info, query="john")


@pytest.mark.asyncio
async def test_search_users_calls_service_with_exclude():
    """search_users calls user_service.search with current user excluded."""
    mock_session = AsyncMock()
    info = _make_info(mock_session, current_user_id="user-123")

    mock_user = MagicMock()
    mock_user.id = "user-456"
    mock_user.email = "john@example.com"
    mock_user.username = "john"
    mock_user.display_name = "John Doe"
    mock_user.avatar_url = None
    mock_user.headline = None
    mock_user.primary_role = None
    mock_user.timezone = None
    mock_user.availability_status = MagicMock(value="just_browsing")
    mock_user.builder_score = 0.0
    mock_user.bio = None
    mock_user.contact_links = {}
    mock_user.preferences = {}
    mock_user.github_username = None
    mock_user.onboarding_completed = False
    mock_user.agent_tools = []
    mock_user.agent_workflow_style = None
    mock_user.human_agent_ratio = None
    mock_user.created_at = datetime.now(UTC)

    with patch("app.graphql.queries.health.user_service") as mock_svc:
        mock_svc.search = AsyncMock(return_value=[mock_user])
        query = Query()
        results = await query.search_users(info=info, query="john", limit=5)

    mock_svc.search.assert_awaited_once_with(
        mock_session, "john", exclude_user_id="user-123", limit=5
    )
    assert len(results) == 1
    assert results[0].username == "john"


@pytest.mark.asyncio
async def test_search_users_returns_empty_list_when_no_match():
    """search_users returns [] when service finds nothing."""
    mock_session = AsyncMock()
    info = _make_info(mock_session, current_user_id="user-123")

    with patch("app.graphql.queries.health.user_service") as mock_svc:
        mock_svc.search = AsyncMock(return_value=[])
        query = Query()
        results = await query.search_users(info=info, query="zzznomatch")

    assert results == []


# ---------------------------------------------------------------------------
# invite_token_info
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_invite_token_info_returns_none_for_unknown_token():
    """invite_token_info returns None when token does not exist."""
    mock_session = AsyncMock()
    info = _make_info(mock_session, current_user_id=None)  # no auth required

    with patch("app.graphql.queries.health.project_service") as mock_svc:
        mock_svc.get_invite_token_info = AsyncMock(return_value=None)
        query = Query()
        result = await query.invite_token_info(info=info, token="bad-token")

    assert result is None


@pytest.mark.asyncio
async def test_invite_token_info_returns_type_for_valid_token():
    """invite_token_info returns InviteTokenInfoType for a valid token."""
    mock_session = AsyncMock()
    info = _make_info(mock_session, current_user_id=None)  # public — no auth

    token_data = {
        "project_title": "My Project",
        "project_id": "proj-001",
        "inviter_name": "Alice",
        "inviter_avatar_url": "https://example.com/alice.png",
        "role": "Backend Developer",
        "expired": False,
    }

    with patch("app.graphql.queries.health.project_service") as mock_svc:
        mock_svc.get_invite_token_info = AsyncMock(return_value=token_data)
        query = Query()
        result = await query.invite_token_info(info=info, token="valid-token")

    assert result is not None
    assert result.project_title == "My Project"
    assert result.project_id == "proj-001"
    assert result.inviter_name == "Alice"
    assert result.inviter_avatar_url == "https://example.com/alice.png"
    assert result.role == "Backend Developer"
    assert result.expired is False


@pytest.mark.asyncio
async def test_invite_token_info_no_auth_required():
    """invite_token_info succeeds without authentication (public endpoint)."""
    mock_session = AsyncMock()
    # current_user_id is None — unauthenticated
    info = _make_info(mock_session, current_user_id=None)

    token_data = {
        "project_title": "Public Project",
        "project_id": "proj-002",
        "inviter_name": "Bob",
        "inviter_avatar_url": None,
        "role": None,
        "expired": True,
    }

    with patch("app.graphql.queries.health.project_service") as mock_svc:
        mock_svc.get_invite_token_info = AsyncMock(return_value=token_data)
        query = Query()
        result = await query.invite_token_info(info=info, token="expired-token")

    assert result is not None
    assert result.expired is True
    assert result.inviter_avatar_url is None
    assert result.role is None


# ---------------------------------------------------------------------------
# my_pending_invitations
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_my_pending_invitations_requires_auth():
    """my_pending_invitations raises AuthError when not authenticated."""
    mock_session = AsyncMock()
    info = _make_info(mock_session, current_user_id=None)

    query = Query()
    with pytest.raises(AuthError):
        await query.my_pending_invitations(info=info)


@pytest.mark.asyncio
async def test_my_pending_invitations_returns_empty_when_none():
    """my_pending_invitations returns [] when user has no pending invitations."""
    mock_session = AsyncMock()
    info = _make_info(mock_session, current_user_id="user-123")

    with patch("app.graphql.queries.health.project_service") as mock_svc:
        mock_svc.get_pending_invitations = AsyncMock(return_value=[])
        query = Query()
        results = await query.my_pending_invitations(info=info)

    assert results == []


@pytest.mark.asyncio
async def test_my_pending_invitations_maps_results_to_type():
    """my_pending_invitations maps invitation dicts to PendingInvitationType."""
    mock_session = AsyncMock()
    info = _make_info(mock_session, current_user_id="user-456")

    mock_inviter = MagicMock()
    mock_inviter.id = "user-789"
    mock_inviter.email = "owner@example.com"
    mock_inviter.username = "projectowner"
    mock_inviter.display_name = "Project Owner"
    mock_inviter.avatar_url = None
    mock_inviter.headline = None
    mock_inviter.primary_role = None
    mock_inviter.timezone = None
    mock_inviter.availability_status = MagicMock(value="just_browsing")
    mock_inviter.builder_score = 0.0
    mock_inviter.bio = None
    mock_inviter.contact_links = {}
    mock_inviter.preferences = {}
    mock_inviter.github_username = None
    mock_inviter.onboarding_completed = False
    mock_inviter.agent_tools = []
    mock_inviter.agent_workflow_style = None
    mock_inviter.human_agent_ratio = None
    mock_inviter.created_at = datetime.now(UTC)

    invited_at = datetime.now(UTC)
    pending = [
        {
            "project_id": "proj-100",
            "project_title": "Awesome App",
            "role": "Frontend Developer",
            "inviter": mock_inviter,
            "invited_at": invited_at,
        }
    ]

    with patch("app.graphql.queries.health.project_service") as mock_svc:
        mock_svc.get_pending_invitations = AsyncMock(return_value=pending)
        query = Query()
        results = await query.my_pending_invitations(info=info)

    mock_svc.get_pending_invitations.assert_awaited_once_with(mock_session, "user-456")
    assert len(results) == 1
    assert results[0].project_id == "proj-100"
    assert results[0].project_title == "Awesome App"
    assert results[0].role == "Frontend Developer"
    assert results[0].inviter.username == "projectowner"
    assert results[0].invited_at == invited_at


@pytest.mark.asyncio
async def test_my_pending_invitations_multiple_results():
    """my_pending_invitations returns all pending invitations."""
    mock_session = AsyncMock()
    info = _make_info(mock_session, current_user_id="user-456")

    now = datetime.now(UTC)

    def _make_inviter(username: str):
        m = MagicMock()
        m.id = f"id-{username}"
        m.email = f"{username}@example.com"
        m.username = username
        m.display_name = username
        m.avatar_url = None
        m.headline = None
        m.primary_role = None
        m.timezone = None
        m.availability_status = MagicMock(value="just_browsing")
        m.builder_score = 0.0
        m.bio = None
        m.contact_links = {}
        m.preferences = {}
        m.github_username = None
        m.onboarding_completed = False
        m.agent_tools = []
        m.agent_workflow_style = None
        m.human_agent_ratio = None
        m.created_at = now
        return m

    pending = [
        {
            "project_id": "proj-1",
            "project_title": "Project Alpha",
            "role": None,
            "inviter": _make_inviter("alice"),
            "invited_at": now,
        },
        {
            "project_id": "proj-2",
            "project_title": "Project Beta",
            "role": "Designer",
            "inviter": _make_inviter("bob"),
            "invited_at": now,
        },
    ]

    with patch("app.graphql.queries.health.project_service") as mock_svc:
        mock_svc.get_pending_invitations = AsyncMock(return_value=pending)
        query = Query()
        results = await query.my_pending_invitations(info=info)

    assert len(results) == 2
    assert results[0].project_id == "proj-1"
    assert results[0].role is None
    assert results[1].project_id == "proj-2"
    assert results[1].role == "Designer"
