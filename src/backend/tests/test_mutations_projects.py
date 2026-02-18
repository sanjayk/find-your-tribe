"""Tests for projects GraphQL mutations.

Covers: createProject, updateProject, deleteProject,
        inviteCollaborator, confirmCollaboration, declineCollaboration, removeCollaborator.
"""

from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession

from app.graphql.context import Context, context_getter
from app.main import app
from app.services import auth_service

# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

CREATE_PROJECT_MUTATION = """
mutation CreateProject(
  $title: String!,
  $description: String,
  $status: String,
  $role: String,
  $links: JSON,
  $techStack: [String!],
  $impactMetrics: JSON,
) {
  projects {
    createProject(
      title: $title,
      description: $description,
      status: $status,
      role: $role,
      links: $links,
      techStack: $techStack,
      impactMetrics: $impactMetrics,
    ) {
      id
      title
      description
      status
      role
      links
      techStack
      impactMetrics
    }
  }
}
"""

UPDATE_PROJECT_MUTATION = """
mutation UpdateProject(
  $id: ID!,
  $title: String,
  $description: String,
  $status: String,
  $role: String,
  $links: JSON,
  $techStack: [String!],
  $impactMetrics: JSON,
) {
  projects {
    updateProject(
      id: $id,
      title: $title,
      description: $description,
      status: $status,
      role: $role,
      links: $links,
      techStack: $techStack,
      impactMetrics: $impactMetrics,
    ) {
      id
      title
      description
      status
    }
  }
}
"""

DELETE_PROJECT_MUTATION = """
mutation DeleteProject($id: ID!) {
  projects {
    deleteProject(id: $id)
  }
}
"""

INVITE_COLLABORATOR_MUTATION = """
mutation InviteCollaborator($projectId: ID!, $userId: ID!, $role: String) {
  projects {
    inviteCollaborator(projectId: $projectId, userId: $userId, role: $role)
  }
}
"""

CONFIRM_COLLABORATION_MUTATION = """
mutation ConfirmCollaboration($projectId: ID!) {
  projects {
    confirmCollaboration(projectId: $projectId)
  }
}
"""

DECLINE_COLLABORATION_MUTATION = """
mutation DeclineCollaboration($projectId: ID!) {
  projects {
    declineCollaboration(projectId: $projectId)
  }
}
"""

REMOVE_COLLABORATOR_MUTATION = """
mutation RemoveCollaborator($projectId: ID!, $userId: ID!) {
  projects {
    removeCollaborator(projectId: $projectId, userId: $userId)
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


# ---------------------------------------------------------------------------
# createProject
# ---------------------------------------------------------------------------


async def test_create_project_happy_path(
    async_client: AsyncClient, async_session: AsyncSession,
):
    """createProject creates a project with all provided fields."""
    user_id = await _create_user(async_session, "projowner@example.com", "projowner")
    _set_auth(async_session, user_id)
    try:
        body = await _gql(async_client, CREATE_PROJECT_MUTATION, {
            "title": "My Cool Project",
            "description": "A description",
            "status": "in_progress",
            "role": "Lead Engineer",
            "links": {"github": "https://github.com/foo"},
            "techStack": ["python", "fastapi"],
            "impactMetrics": {"users": 100},
        })
        assert body.get("errors") is None, body.get("errors")
        data = body["data"]["projects"]["createProject"]
        assert data["id"]
        assert data["title"] == "My Cool Project"
        assert data["description"] == "A description"
        assert data["status"] == "IN_PROGRESS"
        assert data["role"] == "Lead Engineer"
        assert data["links"]["github"] == "https://github.com/foo"
        assert data["techStack"] == ["python", "fastapi"]
        assert data["impactMetrics"]["users"] == 100
    finally:
        _clear_auth()


async def test_create_project_minimal(
    async_client: AsyncClient, async_session: AsyncSession,
):
    """createProject with just a title defaults to in_progress status."""
    user_id = await _create_user(async_session, "minimal@example.com", "minimal")
    _set_auth(async_session, user_id)
    try:
        body = await _gql(async_client, CREATE_PROJECT_MUTATION, {"title": "Minimal Project"})
        assert body.get("errors") is None, body.get("errors")
        data = body["data"]["projects"]["createProject"]
        assert data["title"] == "Minimal Project"
        assert data["status"] == "IN_PROGRESS"
    finally:
        _clear_auth()


async def test_create_project_empty_title(
    async_client: AsyncClient, async_session: AsyncSession,
):
    """createProject with an empty title returns a validation error."""
    user_id = await _create_user(async_session, "emptytitle@example.com", "emptytitle")
    _set_auth(async_session, user_id)
    try:
        body = await _gql(async_client, CREATE_PROJECT_MUTATION, {"title": ""})
        assert body.get("errors")
        assert "Title" in body["errors"][0]["message"]
    finally:
        _clear_auth()


async def test_create_project_unauthenticated(async_client: AsyncClient):
    """createProject without auth returns an error."""
    body = await _gql(async_client, CREATE_PROJECT_MUTATION, {"title": "Nope"})
    assert body.get("errors")
    assert "Authentication required" in body["errors"][0]["message"]


# ---------------------------------------------------------------------------
# updateProject
# ---------------------------------------------------------------------------


async def test_update_project_happy_path(
    async_client: AsyncClient, async_session: AsyncSession,
):
    """updateProject changes project fields."""
    user_id = await _create_user(async_session, "upd@example.com", "updater")
    _set_auth(async_session, user_id)
    try:
        create_body = await _gql(async_client, CREATE_PROJECT_MUTATION, {"title": "Original"})
        project_id = create_body["data"]["projects"]["createProject"]["id"]

        body = await _gql(async_client, UPDATE_PROJECT_MUTATION, {
            "id": project_id,
            "title": "Updated Title",
            "description": "New description",
            "status": "shipped",
        })
        assert body.get("errors") is None, body.get("errors")
        data = body["data"]["projects"]["updateProject"]
        assert data["title"] == "Updated Title"
        assert data["description"] == "New description"
        assert data["status"] == "SHIPPED"
    finally:
        _clear_auth()


async def test_update_project_not_owner(
    async_client: AsyncClient, async_session: AsyncSession,
):
    """updateProject by non-owner returns a permission error."""
    owner_id = await _create_user(async_session, "powner@example.com", "powner")
    other_id = await _create_user(async_session, "pother@example.com", "pother")

    _set_auth(async_session, owner_id)
    try:
        create_body = await _gql(async_client, CREATE_PROJECT_MUTATION, {"title": "Owner's Proj"})
        project_id = create_body["data"]["projects"]["createProject"]["id"]
    finally:
        _clear_auth()

    _set_auth(async_session, other_id)
    try:
        body = await _gql(async_client, UPDATE_PROJECT_MUTATION, {
            "id": project_id,
            "title": "Hacked Title",
        })
        assert body.get("errors")
        assert "owner" in body["errors"][0]["message"].lower()
    finally:
        _clear_auth()


async def test_update_project_not_found(
    async_client: AsyncClient, async_session: AsyncSession,
):
    """updateProject with nonexistent ID returns an error."""
    user_id = await _create_user(async_session, "nfproj@example.com", "nfproj")
    _set_auth(async_session, user_id)
    try:
        body = await _gql(async_client, UPDATE_PROJECT_MUTATION, {
            "id": "00000000000000000000000000",
            "title": "Ghost",
        })
        assert body.get("errors")
        assert "not found" in body["errors"][0]["message"].lower()
    finally:
        _clear_auth()


async def test_update_project_unauthenticated(async_client: AsyncClient):
    """updateProject without auth returns an error."""
    body = await _gql(async_client, UPDATE_PROJECT_MUTATION, {
        "id": "fake-id",
        "title": "nope",
    })
    assert body.get("errors")
    assert "Authentication required" in body["errors"][0]["message"]


# ---------------------------------------------------------------------------
# deleteProject
# ---------------------------------------------------------------------------


async def test_delete_project_happy_path(
    async_client: AsyncClient, async_session: AsyncSession,
):
    """deleteProject removes the project and returns True."""
    user_id = await _create_user(async_session, "dproj@example.com", "dproj")
    _set_auth(async_session, user_id)
    try:
        create_body = await _gql(async_client, CREATE_PROJECT_MUTATION, {"title": "Delete Me"})
        project_id = create_body["data"]["projects"]["createProject"]["id"]

        body = await _gql(async_client, DELETE_PROJECT_MUTATION, {"id": project_id})
        assert body.get("errors") is None, body.get("errors")
        assert body["data"]["projects"]["deleteProject"] is True
    finally:
        _clear_auth()


async def test_delete_project_not_owner(
    async_client: AsyncClient, async_session: AsyncSession,
):
    """deleteProject by non-owner returns a permission error."""
    owner_id = await _create_user(async_session, "downer@example.com", "downer")
    other_id = await _create_user(async_session, "dother@example.com", "dother")

    _set_auth(async_session, owner_id)
    try:
        create_body = await _gql(async_client, CREATE_PROJECT_MUTATION, {"title": "Protected"})
        project_id = create_body["data"]["projects"]["createProject"]["id"]
    finally:
        _clear_auth()

    _set_auth(async_session, other_id)
    try:
        body = await _gql(async_client, DELETE_PROJECT_MUTATION, {"id": project_id})
        assert body.get("errors")
        assert "owner" in body["errors"][0]["message"].lower()
    finally:
        _clear_auth()


async def test_delete_project_not_found(
    async_client: AsyncClient, async_session: AsyncSession,
):
    """deleteProject with nonexistent ID returns an error."""
    user_id = await _create_user(async_session, "delnfp@example.com", "delnfp")
    _set_auth(async_session, user_id)
    try:
        body = await _gql(async_client, DELETE_PROJECT_MUTATION, {"id": "00000000000000000000000000"})
        assert body.get("errors")
        assert "not found" in body["errors"][0]["message"].lower()
    finally:
        _clear_auth()


async def test_delete_project_unauthenticated(async_client: AsyncClient):
    """deleteProject without auth returns an error."""
    body = await _gql(async_client, DELETE_PROJECT_MUTATION, {"id": "fake-id"})
    assert body.get("errors")
    assert "Authentication required" in body["errors"][0]["message"]


# ---------------------------------------------------------------------------
# inviteCollaborator
# ---------------------------------------------------------------------------


async def test_invite_collaborator_happy_path(
    async_client: AsyncClient, async_session: AsyncSession,
):
    """inviteCollaborator adds a pending collaborator and returns True."""
    owner_id = await _create_user(async_session, "invowner@example.com", "invowner")
    target_id = await _create_user(async_session, "invtarget@example.com", "invtarget")

    _set_auth(async_session, owner_id)
    try:
        create_body = await _gql(async_client, CREATE_PROJECT_MUTATION, {"title": "Collab Proj"})
        project_id = create_body["data"]["projects"]["createProject"]["id"]

        body = await _gql(async_client, INVITE_COLLABORATOR_MUTATION, {
            "projectId": project_id,
            "userId": target_id,
            "role": "Designer",
        })
        assert body.get("errors") is None, body.get("errors")
        assert body["data"]["projects"]["inviteCollaborator"] is True
    finally:
        _clear_auth()


async def test_invite_collaborator_not_owner(
    async_client: AsyncClient, async_session: AsyncSession,
):
    """inviteCollaborator by non-owner returns a permission error."""
    owner_id = await _create_user(async_session, "iown@example.com", "iown")
    other_id = await _create_user(async_session, "iother@example.com", "iother")
    target_id = await _create_user(async_session, "itarget@example.com", "itarget")

    _set_auth(async_session, owner_id)
    try:
        create_body = await _gql(async_client, CREATE_PROJECT_MUTATION, {"title": "Owned Proj"})
        project_id = create_body["data"]["projects"]["createProject"]["id"]
    finally:
        _clear_auth()

    _set_auth(async_session, other_id)
    try:
        body = await _gql(async_client, INVITE_COLLABORATOR_MUTATION, {
            "projectId": project_id,
            "userId": target_id,
        })
        assert body.get("errors")
        assert "owner" in body["errors"][0]["message"].lower()
    finally:
        _clear_auth()


async def test_invite_collaborator_duplicate(
    async_client: AsyncClient, async_session: AsyncSession,
):
    """Inviting the same user twice returns an error."""
    owner_id = await _create_user(async_session, "dupown@example.com", "dupown")
    target_id = await _create_user(async_session, "duptarget@example.com", "duptarget")

    _set_auth(async_session, owner_id)
    try:
        create_body = await _gql(async_client, CREATE_PROJECT_MUTATION, {"title": "Dup Proj"})
        project_id = create_body["data"]["projects"]["createProject"]["id"]

        await _gql(async_client, INVITE_COLLABORATOR_MUTATION, {
            "projectId": project_id,
            "userId": target_id,
        })
        body = await _gql(async_client, INVITE_COLLABORATOR_MUTATION, {
            "projectId": project_id,
            "userId": target_id,
        })
        assert body.get("errors")
        assert "already" in body["errors"][0]["message"].lower()
    finally:
        _clear_auth()


async def test_invite_collaborator_unauthenticated(async_client: AsyncClient):
    """inviteCollaborator without auth returns an error."""
    body = await _gql(async_client, INVITE_COLLABORATOR_MUTATION, {
        "projectId": "fake",
        "userId": "fake",
    })
    assert body.get("errors")
    assert "Authentication required" in body["errors"][0]["message"]


# ---------------------------------------------------------------------------
# confirmCollaboration
# ---------------------------------------------------------------------------


async def test_confirm_collaboration_happy_path(
    async_client: AsyncClient, async_session: AsyncSession,
):
    """confirmCollaboration changes status from PENDING to CONFIRMED."""
    owner_id = await _create_user(async_session, "confown@example.com", "confown")
    target_id = await _create_user(async_session, "conftarget@example.com", "conftarget")

    _set_auth(async_session, owner_id)
    try:
        create_body = await _gql(async_client, CREATE_PROJECT_MUTATION, {"title": "Conf Proj"})
        project_id = create_body["data"]["projects"]["createProject"]["id"]
        await _gql(async_client, INVITE_COLLABORATOR_MUTATION, {
            "projectId": project_id,
            "userId": target_id,
        })
    finally:
        _clear_auth()

    # Confirm as the invited user
    _set_auth(async_session, target_id)
    try:
        body = await _gql(async_client, CONFIRM_COLLABORATION_MUTATION, {"projectId": project_id})
        assert body.get("errors") is None, body.get("errors")
        assert body["data"]["projects"]["confirmCollaboration"] is True
    finally:
        _clear_auth()


async def test_confirm_collaboration_no_pending(
    async_client: AsyncClient, async_session: AsyncSession,
):
    """confirmCollaboration without a pending invite returns an error."""
    user_id = await _create_user(async_session, "nopend@example.com", "nopend")
    owner_id = await _create_user(async_session, "nopown@example.com", "nopown")

    _set_auth(async_session, owner_id)
    try:
        create_body = await _gql(async_client, CREATE_PROJECT_MUTATION, {"title": "NoPend Proj"})
        project_id = create_body["data"]["projects"]["createProject"]["id"]
    finally:
        _clear_auth()

    _set_auth(async_session, user_id)
    try:
        body = await _gql(async_client, CONFIRM_COLLABORATION_MUTATION, {"projectId": project_id})
        assert body.get("errors")
        assert "pending" in body["errors"][0]["message"].lower()
    finally:
        _clear_auth()


async def test_confirm_collaboration_unauthenticated(async_client: AsyncClient):
    """confirmCollaboration without auth returns an error."""
    body = await _gql(async_client, CONFIRM_COLLABORATION_MUTATION, {"projectId": "fake"})
    assert body.get("errors")
    assert "Authentication required" in body["errors"][0]["message"]


# ---------------------------------------------------------------------------
# declineCollaboration
# ---------------------------------------------------------------------------


async def test_decline_collaboration_happy_path(
    async_client: AsyncClient, async_session: AsyncSession,
):
    """declineCollaboration changes status from PENDING to DECLINED."""
    owner_id = await _create_user(async_session, "decown@example.com", "decown")
    target_id = await _create_user(async_session, "dectarget@example.com", "dectarget")

    _set_auth(async_session, owner_id)
    try:
        create_body = await _gql(async_client, CREATE_PROJECT_MUTATION, {"title": "Dec Proj"})
        project_id = create_body["data"]["projects"]["createProject"]["id"]
        await _gql(async_client, INVITE_COLLABORATOR_MUTATION, {
            "projectId": project_id,
            "userId": target_id,
        })
    finally:
        _clear_auth()

    _set_auth(async_session, target_id)
    try:
        body = await _gql(async_client, DECLINE_COLLABORATION_MUTATION, {"projectId": project_id})
        assert body.get("errors") is None, body.get("errors")
        assert body["data"]["projects"]["declineCollaboration"] is True
    finally:
        _clear_auth()


async def test_decline_collaboration_no_pending(
    async_client: AsyncClient, async_session: AsyncSession,
):
    """declineCollaboration without a pending invite returns an error."""
    user_id = await _create_user(async_session, "decnp@example.com", "decnp")
    _set_auth(async_session, user_id)
    try:
        body = await _gql(async_client, DECLINE_COLLABORATION_MUTATION, {
            "projectId": "00000000000000000000000000",
        })
        assert body.get("errors")
    finally:
        _clear_auth()


async def test_decline_collaboration_unauthenticated(async_client: AsyncClient):
    """declineCollaboration without auth returns an error."""
    body = await _gql(async_client, DECLINE_COLLABORATION_MUTATION, {"projectId": "fake"})
    assert body.get("errors")
    assert "Authentication required" in body["errors"][0]["message"]


# ---------------------------------------------------------------------------
# removeCollaborator
# ---------------------------------------------------------------------------


async def test_remove_collaborator_happy_path(
    async_client: AsyncClient, async_session: AsyncSession,
):
    """removeCollaborator removes a confirmed collaborator."""
    owner_id = await _create_user(async_session, "remown@example.com", "remown")
    target_id = await _create_user(async_session, "remtarget@example.com", "remtarget")

    _set_auth(async_session, owner_id)
    try:
        create_body = await _gql(async_client, CREATE_PROJECT_MUTATION, {"title": "Rem Proj"})
        project_id = create_body["data"]["projects"]["createProject"]["id"]
        await _gql(async_client, INVITE_COLLABORATOR_MUTATION, {
            "projectId": project_id,
            "userId": target_id,
        })
    finally:
        _clear_auth()

    # Confirm first
    _set_auth(async_session, target_id)
    try:
        await _gql(async_client, CONFIRM_COLLABORATION_MUTATION, {"projectId": project_id})
    finally:
        _clear_auth()

    # Remove as owner
    _set_auth(async_session, owner_id)
    try:
        body = await _gql(async_client, REMOVE_COLLABORATOR_MUTATION, {
            "projectId": project_id,
            "userId": target_id,
        })
        assert body.get("errors") is None, body.get("errors")
        assert body["data"]["projects"]["removeCollaborator"] is True
    finally:
        _clear_auth()


async def test_remove_collaborator_not_owner(
    async_client: AsyncClient, async_session: AsyncSession,
):
    """removeCollaborator by non-owner returns a permission error."""
    owner_id = await _create_user(async_session, "remown2@example.com", "remown2")
    target_id = await _create_user(async_session, "remtarget2@example.com", "remtarget2")
    other_id = await _create_user(async_session, "remoth@example.com", "remoth")

    _set_auth(async_session, owner_id)
    try:
        create_body = await _gql(async_client, CREATE_PROJECT_MUTATION, {"title": "Rem Proj 2"})
        project_id = create_body["data"]["projects"]["createProject"]["id"]
        await _gql(async_client, INVITE_COLLABORATOR_MUTATION, {
            "projectId": project_id,
            "userId": target_id,
        })
    finally:
        _clear_auth()

    _set_auth(async_session, other_id)
    try:
        body = await _gql(async_client, REMOVE_COLLABORATOR_MUTATION, {
            "projectId": project_id,
            "userId": target_id,
        })
        assert body.get("errors")
        assert "owner" in body["errors"][0]["message"].lower()
    finally:
        _clear_auth()


async def test_remove_collaborator_not_on_project(
    async_client: AsyncClient, async_session: AsyncSession,
):
    """removeCollaborator for a user not on the project returns an error."""
    owner_id = await _create_user(async_session, "remown3@example.com", "remown3")
    stranger_id = await _create_user(async_session, "stranger@example.com", "stranger")

    _set_auth(async_session, owner_id)
    try:
        create_body = await _gql(async_client, CREATE_PROJECT_MUTATION, {"title": "Rem Proj 3"})
        project_id = create_body["data"]["projects"]["createProject"]["id"]

        body = await _gql(async_client, REMOVE_COLLABORATOR_MUTATION, {
            "projectId": project_id,
            "userId": stranger_id,
        })
        assert body.get("errors")
        assert "not found" in body["errors"][0]["message"].lower()
    finally:
        _clear_auth()


async def test_remove_collaborator_unauthenticated(async_client: AsyncClient):
    """removeCollaborator without auth returns an error."""
    body = await _gql(async_client, REMOVE_COLLABORATOR_MUTATION, {
        "projectId": "fake",
        "userId": "fake",
    })
    assert body.get("errors")
    assert "Authentication required" in body["errors"][0]["message"]
