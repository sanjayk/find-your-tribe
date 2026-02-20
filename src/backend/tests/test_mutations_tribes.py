"""Tests for tribes GraphQL mutations.

Covers: createTribe, updateTribe, addOpenRole, removeOpenRole,
        requestToJoin, approveMember, rejectMember, removeMember, leaveTribe.
"""

from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession

from app.graphql.context import Context, context_getter
from app.main import app
from app.services import auth_service

# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

CREATE_TRIBE_MUTATION = """
mutation CreateTribe($name: String!, $mission: String, $maxMembers: Int!) {
  tribes {
    createTribe(name: $name, mission: $mission, maxMembers: $maxMembers) {
      id
      name
      mission
      status
      maxMembers
    }
  }
}
"""

UPDATE_TRIBE_MUTATION = """
mutation UpdateTribe($id: ID!, $name: String, $mission: String, $status: String, $maxMembers: Int) {
  tribes {
    updateTribe(id: $id, name: $name, mission: $mission, status: $status, maxMembers: $maxMembers) {
      id
      name
      mission
      status
      maxMembers
    }
  }
}
"""

ADD_OPEN_ROLE_MUTATION = """
mutation AddOpenRole($tribeId: ID!, $title: String!, $skillsNeeded: [String!]) {
  tribes {
    addOpenRole(tribeId: $tribeId, title: $title, skillsNeeded: $skillsNeeded) {
      id
      title
      skillsNeeded
      filled
    }
  }
}
"""

REMOVE_OPEN_ROLE_MUTATION = """
mutation RemoveOpenRole($roleId: ID!) {
  tribes {
    removeOpenRole(roleId: $roleId)
  }
}
"""

REQUEST_TO_JOIN_MUTATION = """
mutation RequestToJoin($tribeId: ID!, $roleId: ID!) {
  tribes {
    requestToJoin(tribeId: $tribeId, roleId: $roleId)
  }
}
"""

APPROVE_MEMBER_MUTATION = """
mutation ApproveMember($tribeId: ID!, $memberId: ID!) {
  tribes {
    approveMember(tribeId: $tribeId, memberId: $memberId)
  }
}
"""

REJECT_MEMBER_MUTATION = """
mutation RejectMember($tribeId: ID!, $memberId: ID!) {
  tribes {
    rejectMember(tribeId: $tribeId, memberId: $memberId)
  }
}
"""

REMOVE_MEMBER_MUTATION = """
mutation RemoveMember($tribeId: ID!, $memberId: ID!) {
  tribes {
    removeMember(tribeId: $tribeId, memberId: $memberId)
  }
}
"""

LEAVE_TRIBE_MUTATION = """
mutation LeaveTribe($tribeId: ID!) {
  tribes {
    leaveTribe(tribeId: $tribeId)
  }
}
"""


async def _gql(client: AsyncClient, query: str, variables: dict | None = None) -> dict:
    resp = await client.post("/graphql", json={"query": query, "variables": variables or {}})
    assert resp.status_code == 200
    return resp.json()


async def _create_user(session: AsyncSession, email: str, username: str) -> str:
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


async def _create_tribe_via_gql(
    client: AsyncClient,
    name: str = "Test Tribe",
    mission: str | None = None,
    max_members: int = 8,
) -> dict:
    """Create a tribe via GraphQL and return the tribe data dict."""
    body = await _gql(client, CREATE_TRIBE_MUTATION, {
        "name": name,
        "mission": mission,
        "maxMembers": max_members,
    })
    assert body.get("errors") is None, body.get("errors")
    return body["data"]["tribes"]["createTribe"]


async def _add_open_role_via_gql(
    client: AsyncClient,
    tribe_id: str,
    title: str = "Engineer",
) -> str:
    """Add an open role via GraphQL and return the role ID."""
    body = await _gql(client, ADD_OPEN_ROLE_MUTATION, {
        "tribeId": tribe_id,
        "title": title,
    })
    assert body.get("errors") is None, body.get("errors")
    return body["data"]["tribes"]["addOpenRole"]["id"]


# ---------------------------------------------------------------------------
# createTribe
# ---------------------------------------------------------------------------


async def test_create_tribe_happy_path(
    async_client: AsyncClient, async_session: AsyncSession,
):
    """createTribe creates a tribe with the owner as a member."""
    user_id = await _create_user(async_session, "towner@example.com", "towner")
    _set_auth(async_session, user_id)
    try:
        data = await _create_tribe_via_gql(
            async_client, name="My Tribe", mission="Build things", max_members=5,
        )
        assert data["id"]
        assert data["name"] == "My Tribe"
        assert data["mission"] == "Build things"
        assert data["status"] == "OPEN"
        assert data["maxMembers"] == 5
    finally:
        _clear_auth()


async def test_create_tribe_name_too_long(
    async_client: AsyncClient, async_session: AsyncSession,
):
    """createTribe with a name > 100 chars returns a validation error."""
    user_id = await _create_user(async_session, "longname@example.com", "longname")
    _set_auth(async_session, user_id)
    try:
        body = await _gql(async_client, CREATE_TRIBE_MUTATION, {
            "name": "x" * 101,
            "maxMembers": 8,
        })
        assert body.get("errors")
        assert "Name" in body["errors"][0]["message"] or "100" in body["errors"][0]["message"]
    finally:
        _clear_auth()


async def test_create_tribe_invalid_max_members(
    async_client: AsyncClient, async_session: AsyncSession,
):
    """createTribe with max_members < 2 returns a validation error."""
    user_id = await _create_user(async_session, "badmax@example.com", "badmax")
    _set_auth(async_session, user_id)
    try:
        body = await _gql(async_client, CREATE_TRIBE_MUTATION, {
            "name": "Small Tribe",
            "maxMembers": 1,
        })
        assert body.get("errors")
        assert "members" in body["errors"][0]["message"].lower()
    finally:
        _clear_auth()


async def test_create_tribe_unauthenticated(async_client: AsyncClient):
    """createTribe without auth returns an error."""
    body = await _gql(async_client, CREATE_TRIBE_MUTATION, {
        "name": "Nope",
        "maxMembers": 8,
    })
    assert body.get("errors")
    assert "Authentication required" in body["errors"][0]["message"]


# ---------------------------------------------------------------------------
# updateTribe
# ---------------------------------------------------------------------------


async def test_update_tribe_happy_path(
    async_client: AsyncClient, async_session: AsyncSession,
):
    """updateTribe modifies tribe fields."""
    user_id = await _create_user(async_session, "tupd@example.com", "tupd")
    _set_auth(async_session, user_id)
    try:
        tribe = await _create_tribe_via_gql(async_client)
        body = await _gql(async_client, UPDATE_TRIBE_MUTATION, {
            "id": tribe["id"],
            "name": "Updated Tribe",
            "mission": "New mission",
            "status": "active",
        })
        assert body.get("errors") is None, body.get("errors")
        data = body["data"]["tribes"]["updateTribe"]
        assert data["name"] == "Updated Tribe"
        assert data["mission"] == "New mission"
        assert data["status"] == "ACTIVE"
    finally:
        _clear_auth()


async def test_update_tribe_not_owner(
    async_client: AsyncClient, async_session: AsyncSession,
):
    """updateTribe by non-owner returns a permission error."""
    owner_id = await _create_user(async_session, "townt@example.com", "townt")
    other_id = await _create_user(async_session, "toth@example.com", "toth")

    _set_auth(async_session, owner_id)
    try:
        tribe = await _create_tribe_via_gql(async_client)
    finally:
        _clear_auth()

    _set_auth(async_session, other_id)
    try:
        body = await _gql(async_client, UPDATE_TRIBE_MUTATION, {
            "id": tribe["id"],
            "name": "Stolen",
        })
        assert body.get("errors")
        assert "owner" in body["errors"][0]["message"].lower()
    finally:
        _clear_auth()


async def test_update_tribe_not_found(
    async_client: AsyncClient, async_session: AsyncSession,
):
    """updateTribe with nonexistent ID returns an error."""
    user_id = await _create_user(async_session, "tnf@example.com", "tnf")
    _set_auth(async_session, user_id)
    try:
        body = await _gql(async_client, UPDATE_TRIBE_MUTATION, {
            "id": "00000000000000000000000000",
            "name": "Ghost",
        })
        assert body.get("errors")
        assert "not found" in body["errors"][0]["message"].lower()
    finally:
        _clear_auth()


async def test_update_tribe_unauthenticated(async_client: AsyncClient):
    """updateTribe without auth returns an error."""
    body = await _gql(async_client, UPDATE_TRIBE_MUTATION, {
        "id": "fake",
        "name": "nope",
    })
    assert body.get("errors")
    assert "Authentication required" in body["errors"][0]["message"]


# ---------------------------------------------------------------------------
# addOpenRole
# ---------------------------------------------------------------------------


async def test_add_open_role_happy_path(
    async_client: AsyncClient, async_session: AsyncSession,
):
    """addOpenRole creates an open role on a tribe."""
    user_id = await _create_user(async_session, "roleown@example.com", "roleown")
    _set_auth(async_session, user_id)
    try:
        tribe = await _create_tribe_via_gql(async_client)
        body = await _gql(async_client, ADD_OPEN_ROLE_MUTATION, {
            "tribeId": tribe["id"],
            "title": "Backend Engineer",
            "skillsNeeded": ["Python", "FastAPI"],
        })
        assert body.get("errors") is None, body.get("errors")
        data = body["data"]["tribes"]["addOpenRole"]
        assert data["id"]
        assert data["title"] == "Backend Engineer"
        assert data["skillsNeeded"] == ["Python", "FastAPI"]
        assert data["filled"] is False
    finally:
        _clear_auth()


async def test_add_open_role_not_owner(
    async_client: AsyncClient, async_session: AsyncSession,
):
    """addOpenRole by non-owner returns a permission error."""
    owner_id = await _create_user(async_session, "rown@example.com", "rown")
    other_id = await _create_user(async_session, "roth@example.com", "roth")

    _set_auth(async_session, owner_id)
    try:
        tribe = await _create_tribe_via_gql(async_client)
    finally:
        _clear_auth()

    _set_auth(async_session, other_id)
    try:
        body = await _gql(async_client, ADD_OPEN_ROLE_MUTATION, {
            "tribeId": tribe["id"],
            "title": "Hacker",
        })
        assert body.get("errors")
        assert "owner" in body["errors"][0]["message"].lower()
    finally:
        _clear_auth()


async def test_add_open_role_tribe_not_found(
    async_client: AsyncClient, async_session: AsyncSession,
):
    """addOpenRole for a nonexistent tribe returns an error."""
    user_id = await _create_user(async_session, "rnf@example.com", "rnf")
    _set_auth(async_session, user_id)
    try:
        body = await _gql(async_client, ADD_OPEN_ROLE_MUTATION, {
            "tribeId": "00000000000000000000000000",
            "title": "Ghost Role",
        })
        assert body.get("errors")
        assert "not found" in body["errors"][0]["message"].lower()
    finally:
        _clear_auth()


async def test_add_open_role_unauthenticated(async_client: AsyncClient):
    """addOpenRole without auth returns an error."""
    body = await _gql(async_client, ADD_OPEN_ROLE_MUTATION, {
        "tribeId": "fake",
        "title": "nope",
    })
    assert body.get("errors")
    assert "Authentication required" in body["errors"][0]["message"]


# ---------------------------------------------------------------------------
# removeOpenRole
# ---------------------------------------------------------------------------


async def test_remove_open_role_happy_path(
    async_client: AsyncClient, async_session: AsyncSession,
):
    """removeOpenRole deletes an open role and returns True."""
    user_id = await _create_user(async_session, "remroleown@example.com", "remroleown")
    _set_auth(async_session, user_id)
    try:
        tribe = await _create_tribe_via_gql(async_client)
        role_body = await _gql(async_client, ADD_OPEN_ROLE_MUTATION, {
            "tribeId": tribe["id"],
            "title": "Remove Me",
        })
        role_id = role_body["data"]["tribes"]["addOpenRole"]["id"]

        body = await _gql(async_client, REMOVE_OPEN_ROLE_MUTATION, {"roleId": role_id})
        assert body.get("errors") is None, body.get("errors")
        assert body["data"]["tribes"]["removeOpenRole"] is True
    finally:
        _clear_auth()


async def test_remove_open_role_not_owner(
    async_client: AsyncClient, async_session: AsyncSession,
):
    """removeOpenRole by non-owner returns a permission error."""
    owner_id = await _create_user(async_session, "rrown@example.com", "rrown")
    other_id = await _create_user(async_session, "rroth@example.com", "rroth")

    _set_auth(async_session, owner_id)
    try:
        tribe = await _create_tribe_via_gql(async_client)
        role_body = await _gql(async_client, ADD_OPEN_ROLE_MUTATION, {
            "tribeId": tribe["id"],
            "title": "Protected Role",
        })
        role_id = role_body["data"]["tribes"]["addOpenRole"]["id"]
    finally:
        _clear_auth()

    _set_auth(async_session, other_id)
    try:
        body = await _gql(async_client, REMOVE_OPEN_ROLE_MUTATION, {"roleId": role_id})
        assert body.get("errors")
        assert "owner" in body["errors"][0]["message"].lower()
    finally:
        _clear_auth()


async def test_remove_open_role_not_found(
    async_client: AsyncClient, async_session: AsyncSession,
):
    """removeOpenRole with nonexistent ID returns an error."""
    user_id = await _create_user(async_session, "rrnf@example.com", "rrnf")
    _set_auth(async_session, user_id)
    try:
        body = await _gql(async_client, REMOVE_OPEN_ROLE_MUTATION, {
            "roleId": "00000000000000000000000000",
        })
        assert body.get("errors")
        assert "not found" in body["errors"][0]["message"].lower()
    finally:
        _clear_auth()


async def test_remove_open_role_unauthenticated(async_client: AsyncClient):
    """removeOpenRole without auth returns an error."""
    body = await _gql(async_client, REMOVE_OPEN_ROLE_MUTATION, {"roleId": "fake"})
    assert body.get("errors")
    assert "Authentication required" in body["errors"][0]["message"]


# ---------------------------------------------------------------------------
# requestToJoin
# ---------------------------------------------------------------------------


async def test_request_to_join_happy_path(
    async_client: AsyncClient, async_session: AsyncSession,
):
    """requestToJoin creates a pending membership and returns True."""
    owner_id = await _create_user(async_session, "jown@example.com", "jown")
    joiner_id = await _create_user(async_session, "joiner@example.com", "joiner")

    _set_auth(async_session, owner_id)
    try:
        tribe = await _create_tribe_via_gql(async_client)
        role_id = await _add_open_role_via_gql(async_client, tribe["id"])
    finally:
        _clear_auth()

    _set_auth(async_session, joiner_id)
    try:
        body = await _gql(async_client, REQUEST_TO_JOIN_MUTATION, {
            "tribeId": tribe["id"], "roleId": role_id,
        })
        assert body.get("errors") is None, body.get("errors")
        assert body["data"]["tribes"]["requestToJoin"] is True
    finally:
        _clear_auth()


async def test_request_to_join_already_member(
    async_client: AsyncClient, async_session: AsyncSession,
):
    """requestToJoin when already a member returns an error."""
    owner_id = await _create_user(async_session, "already@example.com", "already")
    _set_auth(async_session, owner_id)
    try:
        tribe = await _create_tribe_via_gql(async_client)
        role_id = await _add_open_role_via_gql(async_client, tribe["id"])
        # Owner is already a member
        body = await _gql(async_client, REQUEST_TO_JOIN_MUTATION, {
            "tribeId": tribe["id"], "roleId": role_id,
        })
        assert body.get("errors")
        assert "already" in body["errors"][0]["message"].lower()
    finally:
        _clear_auth()


async def test_request_to_join_tribe_not_found(
    async_client: AsyncClient, async_session: AsyncSession,
):
    """requestToJoin for a nonexistent tribe returns an error."""
    user_id = await _create_user(async_session, "jnf@example.com", "jnf")
    _set_auth(async_session, user_id)
    try:
        body = await _gql(async_client, REQUEST_TO_JOIN_MUTATION, {
            "tribeId": "00000000000000000000000000",
            "roleId": "00000000000000000000000000",
        })
        assert body.get("errors")
        assert "not found" in body["errors"][0]["message"].lower()
    finally:
        _clear_auth()


async def test_request_to_join_unauthenticated(async_client: AsyncClient):
    """requestToJoin without auth returns an error."""
    body = await _gql(async_client, REQUEST_TO_JOIN_MUTATION, {
        "tribeId": "fake", "roleId": "fake",
    })
    assert body.get("errors")
    assert "Authentication required" in body["errors"][0]["message"]


# ---------------------------------------------------------------------------
# approveMember
# ---------------------------------------------------------------------------


async def test_approve_member_happy_path(
    async_client: AsyncClient, async_session: AsyncSession,
):
    """approveMember transitions a pending member to active."""
    owner_id = await _create_user(async_session, "aown@example.com", "aown")
    joiner_id = await _create_user(async_session, "ajoiner@example.com", "ajoiner")

    _set_auth(async_session, owner_id)
    try:
        tribe = await _create_tribe_via_gql(async_client)
        role_id = await _add_open_role_via_gql(async_client, tribe["id"])
    finally:
        _clear_auth()

    _set_auth(async_session, joiner_id)
    try:
        await _gql(async_client, REQUEST_TO_JOIN_MUTATION, {
            "tribeId": tribe["id"], "roleId": role_id,
        })
    finally:
        _clear_auth()

    _set_auth(async_session, owner_id)
    try:
        body = await _gql(async_client, APPROVE_MEMBER_MUTATION, {
            "tribeId": tribe["id"],
            "memberId": joiner_id,
        })
        assert body.get("errors") is None, body.get("errors")
        assert body["data"]["tribes"]["approveMember"] is True
    finally:
        _clear_auth()


async def test_approve_member_not_owner(
    async_client: AsyncClient, async_session: AsyncSession,
):
    """approveMember by non-owner returns a permission error."""
    owner_id = await _create_user(async_session, "aownno@example.com", "aownno")
    joiner_id = await _create_user(async_session, "ajoinerno@example.com", "ajoinerno")
    other_id = await _create_user(async_session, "aotherno@example.com", "aotherno")

    _set_auth(async_session, owner_id)
    try:
        tribe = await _create_tribe_via_gql(async_client)
        role_id = await _add_open_role_via_gql(async_client, tribe["id"])
    finally:
        _clear_auth()

    _set_auth(async_session, joiner_id)
    try:
        await _gql(async_client, REQUEST_TO_JOIN_MUTATION, {
            "tribeId": tribe["id"], "roleId": role_id,
        })
    finally:
        _clear_auth()

    _set_auth(async_session, other_id)
    try:
        body = await _gql(async_client, APPROVE_MEMBER_MUTATION, {
            "tribeId": tribe["id"],
            "memberId": joiner_id,
        })
        assert body.get("errors")
        assert "owner" in body["errors"][0]["message"].lower()
    finally:
        _clear_auth()


async def test_approve_member_no_pending(
    async_client: AsyncClient, async_session: AsyncSession,
):
    """approveMember with no pending request returns an error."""
    owner_id = await _create_user(async_session, "anp@example.com", "anp")
    stranger_id = await _create_user(async_session, "astr@example.com", "astr")

    _set_auth(async_session, owner_id)
    try:
        tribe = await _create_tribe_via_gql(async_client)

        body = await _gql(async_client, APPROVE_MEMBER_MUTATION, {
            "tribeId": tribe["id"],
            "memberId": stranger_id,
        })
        assert body.get("errors")
        assert "pending" in body["errors"][0]["message"].lower()
    finally:
        _clear_auth()


async def test_approve_member_unauthenticated(async_client: AsyncClient):
    """approveMember without auth returns an error."""
    body = await _gql(async_client, APPROVE_MEMBER_MUTATION, {
        "tribeId": "fake",
        "memberId": "fake",
    })
    assert body.get("errors")
    assert "Authentication required" in body["errors"][0]["message"]


# ---------------------------------------------------------------------------
# rejectMember
# ---------------------------------------------------------------------------


async def test_reject_member_happy_path(
    async_client: AsyncClient, async_session: AsyncSession,
):
    """rejectMember transitions a pending member to rejected."""
    owner_id = await _create_user(async_session, "rejown@example.com", "rejown")
    joiner_id = await _create_user(async_session, "rejjoin@example.com", "rejjoin")

    _set_auth(async_session, owner_id)
    try:
        tribe = await _create_tribe_via_gql(async_client)
        role_id = await _add_open_role_via_gql(async_client, tribe["id"])
    finally:
        _clear_auth()

    _set_auth(async_session, joiner_id)
    try:
        await _gql(async_client, REQUEST_TO_JOIN_MUTATION, {
            "tribeId": tribe["id"], "roleId": role_id,
        })
    finally:
        _clear_auth()

    _set_auth(async_session, owner_id)
    try:
        body = await _gql(async_client, REJECT_MEMBER_MUTATION, {
            "tribeId": tribe["id"],
            "memberId": joiner_id,
        })
        assert body.get("errors") is None, body.get("errors")
        assert body["data"]["tribes"]["rejectMember"] is True
    finally:
        _clear_auth()


async def test_reject_member_not_owner(
    async_client: AsyncClient, async_session: AsyncSession,
):
    """rejectMember by non-owner returns a permission error."""
    owner_id = await _create_user(async_session, "rejown2@example.com", "rejown2")
    joiner_id = await _create_user(async_session, "rejjoin2@example.com", "rejjoin2")
    other_id = await _create_user(async_session, "rejoth@example.com", "rejoth")

    _set_auth(async_session, owner_id)
    try:
        tribe = await _create_tribe_via_gql(async_client)
        role_id = await _add_open_role_via_gql(async_client, tribe["id"])
    finally:
        _clear_auth()

    _set_auth(async_session, joiner_id)
    try:
        await _gql(async_client, REQUEST_TO_JOIN_MUTATION, {
            "tribeId": tribe["id"], "roleId": role_id,
        })
    finally:
        _clear_auth()

    _set_auth(async_session, other_id)
    try:
        body = await _gql(async_client, REJECT_MEMBER_MUTATION, {
            "tribeId": tribe["id"],
            "memberId": joiner_id,
        })
        assert body.get("errors")
        assert "owner" in body["errors"][0]["message"].lower()
    finally:
        _clear_auth()


async def test_reject_member_no_pending(
    async_client: AsyncClient, async_session: AsyncSession,
):
    """rejectMember with no pending request returns an error."""
    owner_id = await _create_user(async_session, "rejnp@example.com", "rejnp")

    _set_auth(async_session, owner_id)
    try:
        tribe = await _create_tribe_via_gql(async_client)

        body = await _gql(async_client, REJECT_MEMBER_MUTATION, {
            "tribeId": tribe["id"],
            "memberId": "00000000000000000000000000",
        })
        assert body.get("errors")
        assert "pending" in body["errors"][0]["message"].lower()
    finally:
        _clear_auth()


async def test_reject_member_unauthenticated(async_client: AsyncClient):
    """rejectMember without auth returns an error."""
    body = await _gql(async_client, REJECT_MEMBER_MUTATION, {
        "tribeId": "fake",
        "memberId": "fake",
    })
    assert body.get("errors")
    assert "Authentication required" in body["errors"][0]["message"]


# ---------------------------------------------------------------------------
# removeMember
# ---------------------------------------------------------------------------


async def test_remove_member_happy_path(
    async_client: AsyncClient, async_session: AsyncSession,
):
    """removeMember sets an active member's status to removed."""
    owner_id = await _create_user(async_session, "rmown@example.com", "rmown")
    joiner_id = await _create_user(async_session, "rmjoin@example.com", "rmjoin")

    _set_auth(async_session, owner_id)
    try:
        tribe = await _create_tribe_via_gql(async_client)
        role_id = await _add_open_role_via_gql(async_client, tribe["id"])
    finally:
        _clear_auth()

    # Join and get approved
    _set_auth(async_session, joiner_id)
    try:
        await _gql(async_client, REQUEST_TO_JOIN_MUTATION, {
            "tribeId": tribe["id"], "roleId": role_id,
        })
    finally:
        _clear_auth()

    _set_auth(async_session, owner_id)
    try:
        await _gql(async_client, APPROVE_MEMBER_MUTATION, {
            "tribeId": tribe["id"],
            "memberId": joiner_id,
        })

        # Remove
        body = await _gql(async_client, REMOVE_MEMBER_MUTATION, {
            "tribeId": tribe["id"],
            "memberId": joiner_id,
        })
        assert body.get("errors") is None, body.get("errors")
        assert body["data"]["tribes"]["removeMember"] is True
    finally:
        _clear_auth()


async def test_remove_member_not_owner(
    async_client: AsyncClient, async_session: AsyncSession,
):
    """removeMember by non-owner returns a permission error."""
    owner_id = await _create_user(async_session, "rmown2@example.com", "rmown2")
    joiner_id = await _create_user(async_session, "rmjoin2@example.com", "rmjoin2")
    other_id = await _create_user(async_session, "rmother@example.com", "rmother")

    _set_auth(async_session, owner_id)
    try:
        tribe = await _create_tribe_via_gql(async_client)
        role_id = await _add_open_role_via_gql(async_client, tribe["id"])
    finally:
        _clear_auth()

    _set_auth(async_session, joiner_id)
    try:
        await _gql(async_client, REQUEST_TO_JOIN_MUTATION, {
            "tribeId": tribe["id"], "roleId": role_id,
        })
    finally:
        _clear_auth()

    _set_auth(async_session, owner_id)
    try:
        await _gql(async_client, APPROVE_MEMBER_MUTATION, {
            "tribeId": tribe["id"],
            "memberId": joiner_id,
        })
    finally:
        _clear_auth()

    _set_auth(async_session, other_id)
    try:
        body = await _gql(async_client, REMOVE_MEMBER_MUTATION, {
            "tribeId": tribe["id"],
            "memberId": joiner_id,
        })
        assert body.get("errors")
        assert "owner" in body["errors"][0]["message"].lower()
    finally:
        _clear_auth()


async def test_remove_member_self_as_owner(
    async_client: AsyncClient, async_session: AsyncSession,
):
    """Owner cannot remove themselves from the tribe."""
    owner_id = await _create_user(async_session, "rmself@example.com", "rmself")
    _set_auth(async_session, owner_id)
    try:
        tribe = await _create_tribe_via_gql(async_client)
        body = await _gql(async_client, REMOVE_MEMBER_MUTATION, {
            "tribeId": tribe["id"],
            "memberId": owner_id,
        })
        assert body.get("errors")
        err_msg = body["errors"][0]["message"].lower()
        assert "owner" in err_msg or "yourself" in err_msg
    finally:
        _clear_auth()


async def test_remove_member_unauthenticated(async_client: AsyncClient):
    """removeMember without auth returns an error."""
    body = await _gql(async_client, REMOVE_MEMBER_MUTATION, {
        "tribeId": "fake",
        "memberId": "fake",
    })
    assert body.get("errors")
    assert "Authentication required" in body["errors"][0]["message"]


# ---------------------------------------------------------------------------
# leaveTribe
# ---------------------------------------------------------------------------


async def test_leave_tribe_happy_path(
    async_client: AsyncClient, async_session: AsyncSession,
):
    """leaveTribe sets an active member's status to left."""
    owner_id = await _create_user(async_session, "lvown@example.com", "lvown")
    joiner_id = await _create_user(async_session, "lvjoin@example.com", "lvjoin")

    _set_auth(async_session, owner_id)
    try:
        tribe = await _create_tribe_via_gql(async_client)
        role_id = await _add_open_role_via_gql(async_client, tribe["id"])
    finally:
        _clear_auth()

    _set_auth(async_session, joiner_id)
    try:
        await _gql(async_client, REQUEST_TO_JOIN_MUTATION, {
            "tribeId": tribe["id"], "roleId": role_id,
        })
    finally:
        _clear_auth()

    _set_auth(async_session, owner_id)
    try:
        await _gql(async_client, APPROVE_MEMBER_MUTATION, {
            "tribeId": tribe["id"],
            "memberId": joiner_id,
        })
    finally:
        _clear_auth()

    _set_auth(async_session, joiner_id)
    try:
        body = await _gql(async_client, LEAVE_TRIBE_MUTATION, {"tribeId": tribe["id"]})
        assert body.get("errors") is None, body.get("errors")
        assert body["data"]["tribes"]["leaveTribe"] is True
    finally:
        _clear_auth()


async def test_leave_tribe_owner_cannot_leave(
    async_client: AsyncClient, async_session: AsyncSession,
):
    """Owner cannot leave their own tribe."""
    owner_id = await _create_user(async_session, "lvownno@example.com", "lvownno")
    _set_auth(async_session, owner_id)
    try:
        tribe = await _create_tribe_via_gql(async_client)
        body = await _gql(async_client, LEAVE_TRIBE_MUTATION, {"tribeId": tribe["id"]})
        assert body.get("errors")
        assert "owner" in body["errors"][0]["message"].lower()
    finally:
        _clear_auth()


async def test_leave_tribe_not_a_member(
    async_client: AsyncClient, async_session: AsyncSession,
):
    """leaveTribe when not an active member returns an error."""
    owner_id = await _create_user(async_session, "lvown3@example.com", "lvown3")
    stranger_id = await _create_user(async_session, "lvstr@example.com", "lvstr")

    _set_auth(async_session, owner_id)
    try:
        tribe = await _create_tribe_via_gql(async_client)
    finally:
        _clear_auth()

    _set_auth(async_session, stranger_id)
    try:
        body = await _gql(async_client, LEAVE_TRIBE_MUTATION, {"tribeId": tribe["id"]})
        assert body.get("errors")
        err_msg = body["errors"][0]["message"].lower()
        assert "not" in err_msg and "member" in err_msg
    finally:
        _clear_auth()


async def test_leave_tribe_tribe_not_found(
    async_client: AsyncClient, async_session: AsyncSession,
):
    """leaveTribe for a nonexistent tribe returns an error."""
    user_id = await _create_user(async_session, "lvnf@example.com", "lvnf")
    _set_auth(async_session, user_id)
    try:
        body = await _gql(async_client, LEAVE_TRIBE_MUTATION, {
            "tribeId": "00000000000000000000000000",
        })
        assert body.get("errors")
        assert "not found" in body["errors"][0]["message"].lower()
    finally:
        _clear_auth()


async def test_leave_tribe_unauthenticated(async_client: AsyncClient):
    """leaveTribe without auth returns an error."""
    body = await _gql(async_client, LEAVE_TRIBE_MUTATION, {"tribeId": "fake"})
    assert body.get("errors")
    assert "Authentication required" in body["errors"][0]["message"]
