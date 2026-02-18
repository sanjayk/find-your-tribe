"""Tests for feed GraphQL mutations (createPost, updatePost, deletePost)."""

from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession

from app.graphql.context import Context, context_getter
from app.main import app
from app.services import auth_service, project_service, tribe_service

# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

CREATE_POST_MUTATION = """
mutation CreatePost($targetType: String!, $targetId: ID!, $content: String!) {
  feed {
    createPost(targetType: $targetType, targetId: $targetId, content: $content) {
      id
      eventType
      targetType
      targetId
      metadata
      createdAt
    }
  }
}
"""

UPDATE_POST_MUTATION = """
mutation UpdatePost($id: ID!, $content: String!) {
  feed {
    updatePost(id: $id, content: $content) {
      id
      eventType
      metadata
    }
  }
}
"""

DELETE_POST_MUTATION = """
mutation DeletePost($id: ID!) {
  feed {
    deletePost(id: $id)
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
# createPost (project target)
# ---------------------------------------------------------------------------


async def test_create_post_for_project(
    async_client: AsyncClient, async_session: AsyncSession,
):
    """createPost on a project creates a PROJECT_UPDATE feed event."""
    user_id = await _create_user(async_session, "poster@example.com", "poster")
    project = await project_service.create(async_session, owner_id=user_id, title="My Project")
    _set_auth(async_session, user_id)
    try:
        body = await _gql(async_client, CREATE_POST_MUTATION, {
            "targetType": "project",
            "targetId": project.id,
            "content": "Shipped a new feature!",
        })
        assert body.get("errors") is None, body.get("errors")
        data = body["data"]["feed"]["createPost"]
        assert data["id"]
        assert data["eventType"] == "PROJECT_UPDATE"
        assert data["targetType"] == "project"
        assert data["targetId"] == project.id
        assert data["metadata"]["content"] == "Shipped a new feature!"
    finally:
        _clear_auth()


# ---------------------------------------------------------------------------
# createPost (tribe target)
# ---------------------------------------------------------------------------


async def test_create_post_for_tribe(
    async_client: AsyncClient, async_session: AsyncSession,
):
    """createPost on a tribe creates a TRIBE_ANNOUNCEMENT feed event."""
    user_id = await _create_user(async_session, "tribeposter@example.com", "tribeposter")
    tribe = await tribe_service.create(async_session, owner_id=user_id, name="My Tribe")
    _set_auth(async_session, user_id)
    try:
        body = await _gql(async_client, CREATE_POST_MUTATION, {
            "targetType": "tribe",
            "targetId": tribe.id,
            "content": "Welcome everyone!",
        })
        assert body.get("errors") is None, body.get("errors")
        data = body["data"]["feed"]["createPost"]
        assert data["eventType"] == "TRIBE_ANNOUNCEMENT"
        assert data["metadata"]["content"] == "Welcome everyone!"
    finally:
        _clear_auth()


# ---------------------------------------------------------------------------
# createPost — error cases
# ---------------------------------------------------------------------------


async def test_create_post_unauthenticated(async_client: AsyncClient):
    """createPost without auth returns an error."""
    body = await _gql(async_client, CREATE_POST_MUTATION, {
        "targetType": "project",
        "targetId": "fake-id",
        "content": "test",
    })
    assert body.get("errors")
    assert "Authentication required" in body["errors"][0]["message"]


async def test_create_post_invalid_target_type(
    async_client: AsyncClient, async_session: AsyncSession,
):
    """createPost with an invalid target_type returns an error."""
    user_id = await _create_user(async_session, "badtarget@example.com", "badtarget")
    _set_auth(async_session, user_id)
    try:
        body = await _gql(async_client, CREATE_POST_MUTATION, {
            "targetType": "user",
            "targetId": "whatever",
            "content": "test",
        })
        assert body.get("errors")
        assert "project or tribe" in body["errors"][0]["message"].lower()
    finally:
        _clear_auth()


async def test_create_post_content_too_long(
    async_client: AsyncClient, async_session: AsyncSession,
):
    """createPost with content exceeding 2000 chars returns an error."""
    user_id = await _create_user(async_session, "longpost@example.com", "longpost")
    project = await project_service.create(async_session, owner_id=user_id, title="Long Project")
    _set_auth(async_session, user_id)
    try:
        body = await _gql(async_client, CREATE_POST_MUTATION, {
            "targetType": "project",
            "targetId": project.id,
            "content": "x" * 2001,
        })
        assert body.get("errors")
        assert "2000" in body["errors"][0]["message"]
    finally:
        _clear_auth()


async def test_create_post_not_owner(
    async_client: AsyncClient, async_session: AsyncSession,
):
    """createPost on a project by a non-owner returns a permission error."""
    owner_id = await _create_user(async_session, "owner@example.com", "owner")
    other_id = await _create_user(async_session, "other@example.com", "other")
    project = await project_service.create(async_session, owner_id=owner_id, title="Owner Proj")
    _set_auth(async_session, other_id)
    try:
        body = await _gql(async_client, CREATE_POST_MUTATION, {
            "targetType": "project",
            "targetId": project.id,
            "content": "I should not be able to post here",
        })
        assert body.get("errors")
        assert "owner" in body["errors"][0]["message"].lower()
    finally:
        _clear_auth()


async def test_create_post_project_not_found(
    async_client: AsyncClient, async_session: AsyncSession,
):
    """createPost referencing a non-existent project returns an error."""
    user_id = await _create_user(async_session, "noproj@example.com", "noproj")
    _set_auth(async_session, user_id)
    try:
        body = await _gql(async_client, CREATE_POST_MUTATION, {
            "targetType": "project",
            "targetId": "00000000000000000000000000",
            "content": "test",
        })
        assert body.get("errors")
        assert "not found" in body["errors"][0]["message"].lower()
    finally:
        _clear_auth()


# ---------------------------------------------------------------------------
# updatePost
# ---------------------------------------------------------------------------


async def test_update_post_happy_path(
    async_client: AsyncClient, async_session: AsyncSession,
):
    """updatePost modifies post content and sets edited flag."""
    user_id = await _create_user(async_session, "editor@example.com", "editor")
    project = await project_service.create(async_session, owner_id=user_id, title="Editor Proj")
    _set_auth(async_session, user_id)
    try:
        create_body = await _gql(async_client, CREATE_POST_MUTATION, {
            "targetType": "project",
            "targetId": project.id,
            "content": "Original content",
        })
        post_id = create_body["data"]["feed"]["createPost"]["id"]

        body = await _gql(async_client, UPDATE_POST_MUTATION, {
            "id": post_id,
            "content": "Updated content",
        })
        assert body.get("errors") is None, body.get("errors")
        data = body["data"]["feed"]["updatePost"]
        assert data["metadata"]["content"] == "Updated content"
        assert data["metadata"]["edited"] is True
    finally:
        _clear_auth()


async def test_update_post_not_found(
    async_client: AsyncClient, async_session: AsyncSession,
):
    """updatePost with a nonexistent ID returns null."""
    user_id = await _create_user(async_session, "nopost@example.com", "nopost")
    _set_auth(async_session, user_id)
    try:
        body = await _gql(async_client, UPDATE_POST_MUTATION, {
            "id": "00000000000000000000000000",
            "content": "test",
        })
        assert body.get("errors") is None, body.get("errors")
        assert body["data"]["feed"]["updatePost"] is None
    finally:
        _clear_auth()


async def test_update_post_wrong_user(
    async_client: AsyncClient, async_session: AsyncSession,
):
    """updatePost by a different user returns an error."""
    owner_id = await _create_user(async_session, "postowner@example.com", "postowner")
    other_id = await _create_user(async_session, "impostor@example.com", "impostor")
    project = await project_service.create(async_session, owner_id=owner_id, title="Owner Proj")

    # Create post as owner
    _set_auth(async_session, owner_id)
    try:
        create_body = await _gql(async_client, CREATE_POST_MUTATION, {
            "targetType": "project",
            "targetId": project.id,
            "content": "Original",
        })
        post_id = create_body["data"]["feed"]["createPost"]["id"]
    finally:
        _clear_auth()

    # Try to update as other user
    _set_auth(async_session, other_id)
    try:
        body = await _gql(async_client, UPDATE_POST_MUTATION, {
            "id": post_id,
            "content": "Hacked",
        })
        assert body.get("errors")
        assert "author" in body["errors"][0]["message"].lower()
    finally:
        _clear_auth()


async def test_update_post_unauthenticated(async_client: AsyncClient):
    """updatePost without auth returns an error."""
    body = await _gql(async_client, UPDATE_POST_MUTATION, {
        "id": "fake-id",
        "content": "test",
    })
    assert body.get("errors")
    assert "Authentication required" in body["errors"][0]["message"]


# ---------------------------------------------------------------------------
# deletePost
# ---------------------------------------------------------------------------


async def test_delete_post_happy_path(
    async_client: AsyncClient, async_session: AsyncSession,
):
    """deletePost removes a post and returns True."""
    user_id = await _create_user(async_session, "deleter@example.com", "deleter")
    project = await project_service.create(async_session, owner_id=user_id, title="Del Proj")
    _set_auth(async_session, user_id)
    try:
        create_body = await _gql(async_client, CREATE_POST_MUTATION, {
            "targetType": "project",
            "targetId": project.id,
            "content": "Delete me",
        })
        post_id = create_body["data"]["feed"]["createPost"]["id"]

        body = await _gql(async_client, DELETE_POST_MUTATION, {"id": post_id})
        assert body.get("errors") is None, body.get("errors")
        assert body["data"]["feed"]["deletePost"] is True
    finally:
        _clear_auth()


async def test_delete_post_not_found(
    async_client: AsyncClient, async_session: AsyncSession,
):
    """deletePost with a nonexistent ID returns False."""
    user_id = await _create_user(async_session, "delnf@example.com", "delnf")
    _set_auth(async_session, user_id)
    try:
        body = await _gql(async_client, DELETE_POST_MUTATION, {"id": "00000000000000000000000000"})
        assert body.get("errors") is None, body.get("errors")
        assert body["data"]["feed"]["deletePost"] is False
    finally:
        _clear_auth()


async def test_delete_post_wrong_user(
    async_client: AsyncClient, async_session: AsyncSession,
):
    """deletePost by a non-author returns an error."""
    owner_id = await _create_user(async_session, "delowner@example.com", "delowner")
    other_id = await _create_user(async_session, "delother@example.com", "delother")
    project = await project_service.create(async_session, owner_id=owner_id, title="Del Proj 2")

    _set_auth(async_session, owner_id)
    try:
        create_body = await _gql(async_client, CREATE_POST_MUTATION, {
            "targetType": "project",
            "targetId": project.id,
            "content": "Don't delete me",
        })
        post_id = create_body["data"]["feed"]["createPost"]["id"]
    finally:
        _clear_auth()

    _set_auth(async_session, other_id)
    try:
        body = await _gql(async_client, DELETE_POST_MUTATION, {"id": post_id})
        assert body.get("errors")
        assert "author" in body["errors"][0]["message"].lower()
    finally:
        _clear_auth()


async def test_delete_post_unauthenticated(async_client: AsyncClient):
    """deletePost without auth returns an error."""
    body = await _gql(async_client, DELETE_POST_MUTATION, {"id": "fake-id"})
    assert body.get("errors")
    assert "Authentication required" in body["errors"][0]["message"]
