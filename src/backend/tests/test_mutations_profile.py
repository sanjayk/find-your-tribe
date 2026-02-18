"""Tests for profile GraphQL mutations (updateProfile, addSkill, removeSkill)."""

import pytest
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession

from app.graphql.context import Context, context_getter
from app.main import app
from app.services import auth_service

# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

UPDATE_PROFILE_MUTATION = """
mutation UpdateProfile(
  $displayName: String,
  $headline: String,
  $bio: String,
  $primaryRole: String,
  $timezone: String,
  $availabilityStatus: String,
  $contactLinks: JSON,
  $agentTools: JSON,
  $agentWorkflowStyle: String,
  $humanAgentRatio: Float,
) {
  profile {
    updateProfile(
      displayName: $displayName,
      headline: $headline,
      bio: $bio,
      primaryRole: $primaryRole,
      timezone: $timezone,
      availabilityStatus: $availabilityStatus,
      contactLinks: $contactLinks,
      agentTools: $agentTools,
      agentWorkflowStyle: $agentWorkflowStyle,
      humanAgentRatio: $humanAgentRatio,
    ) {
      id
      displayName
      headline
      bio
      primaryRole
      timezone
      availabilityStatus
      contactLinks
      agentTools
      agentWorkflowStyle
      humanAgentRatio
    }
  }
}
"""

ADD_SKILL_MUTATION = """
mutation AddSkill($skillId: ID!) {
  profile {
    addSkill(skillId: $skillId) {
      id
      displayName
      skills {
        id
        name
      }
    }
  }
}
"""

REMOVE_SKILL_MUTATION = """
mutation RemoveSkill($skillId: ID!) {
  profile {
    removeSkill(skillId: $skillId) {
      id
      displayName
      skills {
        id
        name
      }
    }
  }
}
"""


async def _gql(client: AsyncClient, query: str, variables: dict | None = None) -> dict:
    resp = await client.post("/graphql", json={"query": query, "variables": variables or {}})
    assert resp.status_code == 200
    return resp.json()


async def _create_user(
    session: AsyncSession, email: str = "profuser@example.com", username: str = "profuser",
) -> str:
    result = await auth_service.signup(
        session, email=email, password="securepass1",
        username=username, display_name=f"User {username}",
    )
    return result["user"].id


def _set_auth(session: AsyncSession, user_id: str):
    async def authed_getter(request=None, session_dep=None):
        return Context(session=session, current_user_id=user_id)
    app.dependency_overrides[context_getter] = authed_getter


def _clear_auth():
    app.dependency_overrides.pop(context_getter, None)


# ---------------------------------------------------------------------------
# updateProfile
# ---------------------------------------------------------------------------


async def test_update_profile_display_name(
    async_client: AsyncClient, async_session: AsyncSession,
):
    """updateProfile changes the display name."""
    user_id = await _create_user(async_session)
    _set_auth(async_session, user_id)
    try:
        body = await _gql(async_client, UPDATE_PROFILE_MUTATION, {
            "displayName": "New Name",
        })
        assert body.get("errors") is None, body.get("errors")
        data = body["data"]["profile"]["updateProfile"]
        assert data["displayName"] == "New Name"
    finally:
        _clear_auth()


async def test_update_profile_multiple_fields(
    async_client: AsyncClient, async_session: AsyncSession,
):
    """updateProfile can change multiple fields at once."""
    user_id = await _create_user(async_session, "multi@example.com", "multiuser")
    _set_auth(async_session, user_id)
    try:
        body = await _gql(async_client, UPDATE_PROFILE_MUTATION, {
            "displayName": "Updated User",
            "headline": "Full-Stack Dev",
            "bio": "Building cool stuff",
            "primaryRole": "engineer",
            "timezone": "Europe/London",
            "availabilityStatus": "open_to_tribe",
            "contactLinks": {"github_username": "multiuser"},
            "agentTools": ["claude", "cursor"],
            "agentWorkflowStyle": "pair",
            "humanAgentRatio": 0.7,
        })
        assert body.get("errors") is None, body.get("errors")
        data = body["data"]["profile"]["updateProfile"]
        assert data["displayName"] == "Updated User"
        assert data["headline"] == "Full-Stack Dev"
        assert data["bio"] == "Building cool stuff"
        assert data["primaryRole"] == "ENGINEER"
        assert data["timezone"] == "Europe/London"
        assert data["availabilityStatus"] == "OPEN_TO_TRIBE"
        assert data["contactLinks"]["github_username"] == "multiuser"
        assert data["agentTools"] == ["claude", "cursor"]
        assert data["agentWorkflowStyle"] == "PAIR"
        assert data["humanAgentRatio"] == pytest.approx(0.7)
    finally:
        _clear_auth()


async def test_update_profile_unauthenticated(async_client: AsyncClient):
    """updateProfile without auth returns an error."""
    body = await _gql(async_client, UPDATE_PROFILE_MUTATION, {
        "displayName": "Ghost",
    })
    assert body.get("errors")
    assert "Authentication required" in body["errors"][0]["message"]


# ---------------------------------------------------------------------------
# addSkill
# ---------------------------------------------------------------------------


async def test_add_skill_happy_path(
    async_client: AsyncClient, async_session: AsyncSession, seed_test_data,
):
    """addSkill adds a skill to the user's profile."""
    user_id = await _create_user(async_session, "skilled@example.com", "skilled")
    _set_auth(async_session, user_id)
    try:
        python_skill = seed_test_data["skills"]["Python"]
        body = await _gql(async_client, ADD_SKILL_MUTATION, {"skillId": python_skill.id})
        assert body.get("errors") is None, body.get("errors")
        data = body["data"]["profile"]["addSkill"]
        skill_names = [s["name"] for s in data["skills"]]
        assert "Python" in skill_names
    finally:
        _clear_auth()


async def test_add_skill_idempotent(
    async_client: AsyncClient, async_session: AsyncSession, seed_test_data,
):
    """addSkill twice for the same skill is a no-op (idempotent)."""
    user_id = await _create_user(async_session, "idempotent@example.com", "idempotent")
    _set_auth(async_session, user_id)
    try:
        python_skill = seed_test_data["skills"]["Python"]
        await _gql(async_client, ADD_SKILL_MUTATION, {"skillId": python_skill.id})
        body = await _gql(async_client, ADD_SKILL_MUTATION, {"skillId": python_skill.id})
        assert body.get("errors") is None, body.get("errors")
        data = body["data"]["profile"]["addSkill"]
        python_count = sum(1 for s in data["skills"] if s["name"] == "Python")
        assert python_count == 1
    finally:
        _clear_auth()


async def test_add_skill_not_found(
    async_client: AsyncClient, async_session: AsyncSession,
):
    """addSkill with a nonexistent skill ID returns an error."""
    user_id = await _create_user(async_session, "badskill@example.com", "badskill")
    _set_auth(async_session, user_id)
    try:
        body = await _gql(async_client, ADD_SKILL_MUTATION, {"skillId": "00000000000000000000000000"})
        assert body.get("errors")
        assert "not found" in body["errors"][0]["message"].lower()
    finally:
        _clear_auth()


async def test_add_skill_unauthenticated(async_client: AsyncClient):
    """addSkill without auth returns an error."""
    body = await _gql(async_client, ADD_SKILL_MUTATION, {"skillId": "fake-id"})
    assert body.get("errors")
    assert "Authentication required" in body["errors"][0]["message"]


# ---------------------------------------------------------------------------
# removeSkill
# ---------------------------------------------------------------------------


async def test_remove_skill_happy_path(
    async_client: AsyncClient, async_session: AsyncSession, seed_test_data,
):
    """removeSkill removes a skill from the user's profile."""
    user_id = await _create_user(async_session, "unskilll@example.com", "unskill")
    _set_auth(async_session, user_id)
    try:
        python_skill = seed_test_data["skills"]["Python"]
        # Add it first
        await _gql(async_client, ADD_SKILL_MUTATION, {"skillId": python_skill.id})
        # Then remove it
        body = await _gql(async_client, REMOVE_SKILL_MUTATION, {"skillId": python_skill.id})
        assert body.get("errors") is None, body.get("errors")
        data = body["data"]["profile"]["removeSkill"]
        skill_names = [s["name"] for s in data["skills"]]
        assert "Python" not in skill_names
    finally:
        _clear_auth()


async def test_remove_skill_not_present(
    async_client: AsyncClient, async_session: AsyncSession, seed_test_data,
):
    """removeSkill for a skill the user doesn't have is a no-op."""
    user_id = await _create_user(async_session, "noskill@example.com", "noskill")
    _set_auth(async_session, user_id)
    try:
        react_skill = seed_test_data["skills"]["React"]
        body = await _gql(async_client, REMOVE_SKILL_MUTATION, {"skillId": react_skill.id})
        assert body.get("errors") is None, body.get("errors")
    finally:
        _clear_auth()


async def test_remove_skill_unauthenticated(async_client: AsyncClient):
    """removeSkill without auth returns an error."""
    body = await _gql(async_client, REMOVE_SKILL_MUTATION, {"skillId": "fake-id"})
    assert body.get("errors")
    assert "Authentication required" in body["errors"][0]["message"]
