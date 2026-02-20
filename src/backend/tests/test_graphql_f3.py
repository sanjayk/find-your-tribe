"""Integration tests for F3 GraphQL mutations and queries.

Covers F3-sprint additions:
  Mutations: createProject, updateProject (new tag fields), addMilestone,
             deleteMilestone, generateInviteLink, redeemInviteToken,
             inviteCollaborator, confirmCollaboration
  Queries:   tagSuggestions, searchUsers, inviteTokenInfo,
             myPendingInvitations, project (new fields)
"""

from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession

from app.graphql.context import Context, context_getter
from app.main import app
from app.services import auth_service

# ---------------------------------------------------------------------------
# GQL strings — mutations
# ---------------------------------------------------------------------------

CREATE_PROJECT_MUTATION = """
mutation CreateProject($input: CreateProjectInput!) {
  projects {
    createProject(input: $input) {
      id
      title
      description
      status
      role
      links
    }
  }
}
"""

UPDATE_PROJECT_MUTATION = """
mutation UpdateProject($id: ID!, $input: UpdateProjectInput!) {
  projects {
    updateProject(id: $id, input: $input) {
      id
      title
      description
      status
      domains
      aiTools
      buildStyle
      services
    }
  }
}
"""

ADD_MILESTONE_MUTATION = """
mutation AddMilestone($projectId: ID!, $input: AddMilestoneInput!) {
  projects {
    addMilestone(projectId: $projectId, input: $input) {
      id
      title
      date
      milestoneType
      createdAt
    }
  }
}
"""

DELETE_MILESTONE_MUTATION = """
mutation DeleteMilestone($milestoneId: ID!) {
  projects {
    deleteMilestone(milestoneId: $milestoneId)
  }
}
"""

GENERATE_INVITE_LINK_MUTATION = """
mutation GenerateInviteLink($projectId: ID!, $role: String) {
  projects {
    generateInviteLink(projectId: $projectId, role: $role)
  }
}
"""

REDEEM_INVITE_TOKEN_MUTATION = """
mutation RedeemInviteToken($token: String!) {
  projects {
    redeemInviteToken(token: $token) {
      user { id username }
      role
      status
    }
  }
}
"""

INVITE_COLLABORATOR_MUTATION = """
mutation InviteCollaborator($projectId: ID!, $userId: ID!, $role: String) {
  projects {
    inviteCollaborator(projectId: $projectId, userId: $userId, role: $role) {
      user { id username }
      role
      status
    }
  }
}
"""

CONFIRM_COLLABORATION_MUTATION = """
mutation ConfirmCollaboration($projectId: ID!) {
  projects {
    confirmCollaboration(projectId: $projectId) {
      user { id }
      role
      status
      confirmedAt
    }
  }
}
"""

# ---------------------------------------------------------------------------
# GQL strings — queries
# ---------------------------------------------------------------------------

TAG_SUGGESTIONS_QUERY = """
query TagSuggestions($field: String!, $query: String, $limit: Int) {
  tagSuggestions(field: $field, query: $query, limit: $limit)
}
"""

SEARCH_USERS_QUERY = """
query SearchUsers($query: String!, $limit: Int) {
  searchUsers(query: $query, limit: $limit) {
    id
    username
    displayName
  }
}
"""

INVITE_TOKEN_INFO_QUERY = """
query InviteTokenInfo($token: String!) {
  inviteTokenInfo(token: $token) {
    projectTitle
    projectId
    inviterName
    inviterAvatarUrl
    role
    expired
  }
}
"""

MY_PENDING_INVITATIONS_QUERY = """
query MyPendingInvitations {
  myPendingInvitations {
    projectId
    projectTitle
    role
    inviter { id username }
    invitedAt
  }
}
"""

PROJECT_QUERY = """
query Project($id: ID!) {
  project(id: $id) {
    id
    title
    domains
    aiTools
    buildStyle
    services
    milestones {
      id
      title
      date
      milestoneType
    }
  }
}
"""

# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------


async def _gql(client: AsyncClient, query: str, variables: dict | None = None) -> dict:
    resp = await client.post("/graphql", json={"query": query, "variables": variables or {}})
    assert resp.status_code == 200
    return resp.json()


async def _create_user(session: AsyncSession, email: str, username: str) -> str:
    result = await auth_service.signup(
        session,
        email=email,
        password="securepass1",
        username=username,
        display_name=f"User {username}",
    )
    return result["user"].id


def _set_auth(session: AsyncSession, user_id: str):
    async def authed_getter(request=None, session_dep=None):
        return Context(session=session, current_user_id=user_id)
    app.dependency_overrides[context_getter] = authed_getter


def _clear_auth():
    app.dependency_overrides.pop(context_getter, None)


# ---------------------------------------------------------------------------
# createProject — verify accepted input fields
# ---------------------------------------------------------------------------


async def test_create_project_all_accepted_fields(
    async_client: AsyncClient, async_session: AsyncSession,
):
    """createProject accepts and returns title, description, status, role, links."""
    user_id = await _create_user(async_session, "f3create@example.com", "f3create")
    _set_auth(async_session, user_id)
    try:
        body = await _gql(async_client, CREATE_PROJECT_MUTATION, {
            "input": {
                "title": "F3 Launch Project",
                "description": "Built with Claude Code",
                "status": "in_progress",
                "role": "Founder",
                "links": {"repo": "https://github.com/f3/launch"},
            },
        })
        assert body.get("errors") is None, body.get("errors")
        data = body["data"]["projects"]["createProject"]
        assert data["id"]
        assert data["title"] == "F3 Launch Project"
        assert data["description"] == "Built with Claude Code"
        assert data["status"] == "IN_PROGRESS"
        assert data["role"] == "Founder"
        assert data["links"]["repo"] == "https://github.com/f3/launch"
    finally:
        _clear_auth()


async def test_create_project_unauthenticated(async_client: AsyncClient):
    """createProject requires authentication."""
    body = await _gql(async_client, CREATE_PROJECT_MUTATION, {"input": {"title": "Nope"}})
    assert body.get("errors")
    assert "Authentication required" in body["errors"][0]["message"]


# ---------------------------------------------------------------------------
# updateProject — verify all four new F3 tag fields are persisted
# ---------------------------------------------------------------------------


async def test_update_project_new_tag_fields(
    async_client: AsyncClient, async_session: AsyncSession,
):
    """updateProject persists domains, ai_tools, build_style, and services."""
    user_id = await _create_user(async_session, "f3upd@example.com", "f3upd")
    _set_auth(async_session, user_id)
    try:
        create_body = await _gql(async_client, CREATE_PROJECT_MUTATION, {
            "input": {"title": "Tag Fields Proj"},
        })
        project_id = create_body["data"]["projects"]["createProject"]["id"]

        body = await _gql(async_client, UPDATE_PROJECT_MUTATION, {
            "id": project_id,
            "input": {
                "domains": ["AI/ML", "Developer Tools"],
                "aiTools": ["Claude Code", "Cursor"],
                "buildStyle": ["AI-first", "Ship fast"],
                "services": ["Stripe", "Resend"],
            },
        })
        assert body.get("errors") is None, body.get("errors")
        data = body["data"]["projects"]["updateProject"]
        assert data["domains"] == ["AI/ML", "Developer Tools"]
        assert data["aiTools"] == ["Claude Code", "Cursor"]
        assert data["buildStyle"] == ["AI-first", "Ship fast"]
        assert data["services"] == ["Stripe", "Resend"]
    finally:
        _clear_auth()


async def test_update_project_tag_fields_persisted_to_db(
    async_client: AsyncClient, async_session: AsyncSession,
):
    """Tag fields set via updateProject are returned by a subsequent project query."""
    user_id = await _create_user(async_session, "f3updq@example.com", "f3updq")
    _set_auth(async_session, user_id)
    try:
        create_body = await _gql(async_client, CREATE_PROJECT_MUTATION, {
            "input": {"title": "Persist Tags Proj"},
        })
        project_id = create_body["data"]["projects"]["createProject"]["id"]

        await _gql(async_client, UPDATE_PROJECT_MUTATION, {
            "id": project_id,
            "input": {
                "domains": ["Fintech"],
                "aiTools": ["GitHub Copilot"],
                "buildStyle": ["Test-driven"],
                "services": ["Auth0"],
            },
        })

        # Re-fetch via project query to confirm persistence
        query_body = await _gql(async_client, PROJECT_QUERY, {"id": project_id})
        assert query_body.get("errors") is None, query_body.get("errors")
        proj = query_body["data"]["project"]
        assert proj["domains"] == ["Fintech"]
        assert proj["aiTools"] == ["GitHub Copilot"]
        assert proj["buildStyle"] == ["Test-driven"]
        assert proj["services"] == ["Auth0"]
    finally:
        _clear_auth()


async def test_update_project_unauthenticated(async_client: AsyncClient):
    """updateProject requires authentication."""
    body = await _gql(async_client, UPDATE_PROJECT_MUTATION, {
        "id": "fake-id",
        "input": {"domains": ["AI/ML"]},
    })
    assert body.get("errors")
    assert "Authentication required" in body["errors"][0]["message"]


# ---------------------------------------------------------------------------
# addMilestone — verify milestone created with correct fields
# ---------------------------------------------------------------------------


async def test_add_milestone_returns_correct_fields(
    async_client: AsyncClient, async_session: AsyncSession,
):
    """addMilestone returns id, title, date, milestoneType, and createdAt."""
    user_id = await _create_user(async_session, "f3mil@example.com", "f3mil")
    _set_auth(async_session, user_id)
    try:
        create_body = await _gql(async_client, CREATE_PROJECT_MUTATION, {
            "input": {"title": "Milestone F3 Proj"},
        })
        project_id = create_body["data"]["projects"]["createProject"]["id"]

        body = await _gql(async_client, ADD_MILESTONE_MUTATION, {
            "projectId": project_id,
            "input": {
                "title": "Initial Launch",
                "date": "2025-01-10",
                "milestoneType": "launch",
            },
        })
        assert body.get("errors") is None, body.get("errors")
        data = body["data"]["projects"]["addMilestone"]
        assert data["id"]
        assert data["title"] == "Initial Launch"
        assert data["date"] == "2025-01-10"
        assert data["milestoneType"] == "launch"
        assert data["createdAt"] is not None
    finally:
        _clear_auth()


async def test_add_milestone_unauthenticated(async_client: AsyncClient):
    """addMilestone requires authentication."""
    body = await _gql(async_client, ADD_MILESTONE_MUTATION, {
        "projectId": "fake",
        "input": {"title": "X", "date": "2025-01-01"},
    })
    assert body.get("errors")
    assert "Authentication required" in body["errors"][0]["message"]


# ---------------------------------------------------------------------------
# deleteMilestone — verify milestone removed
# ---------------------------------------------------------------------------


async def test_delete_milestone_removes_milestone(
    async_client: AsyncClient, async_session: AsyncSession,
):
    """deleteMilestone returns True and the milestone no longer exists."""
    user_id = await _create_user(async_session, "f3delmil@example.com", "f3delmil")
    _set_auth(async_session, user_id)
    try:
        create_body = await _gql(async_client, CREATE_PROJECT_MUTATION, {
            "input": {"title": "DelMil F3 Proj"},
        })
        project_id = create_body["data"]["projects"]["createProject"]["id"]

        add_body = await _gql(async_client, ADD_MILESTONE_MUTATION, {
            "projectId": project_id,
            "input": {"title": "To Remove", "date": "2025-03-01"},
        })
        milestone_id = add_body["data"]["projects"]["addMilestone"]["id"]

        body = await _gql(async_client, DELETE_MILESTONE_MUTATION, {
            "milestoneId": milestone_id,
        })
        assert body.get("errors") is None, body.get("errors")
        assert body["data"]["projects"]["deleteMilestone"] is True

        # Deleting the same milestone again should fail
        body2 = await _gql(async_client, DELETE_MILESTONE_MUTATION, {
            "milestoneId": milestone_id,
        })
        assert body2.get("errors")
        assert "not found" in body2["errors"][0]["message"].lower()
    finally:
        _clear_auth()


async def test_delete_milestone_unauthenticated(async_client: AsyncClient):
    """deleteMilestone requires authentication."""
    body = await _gql(async_client, DELETE_MILESTONE_MUTATION, {"milestoneId": "fake"})
    assert body.get("errors")
    assert "Authentication required" in body["errors"][0]["message"]


# ---------------------------------------------------------------------------
# generateInviteLink — verify returns URL with token
# ---------------------------------------------------------------------------


async def test_generate_invite_link_returns_url_with_token(
    async_client: AsyncClient, async_session: AsyncSession,
):
    """generateInviteLink returns an HTTPS URL containing an opaque token."""
    user_id = await _create_user(async_session, "f3link@example.com", "f3link")
    _set_auth(async_session, user_id)
    try:
        create_body = await _gql(async_client, CREATE_PROJECT_MUTATION, {
            "input": {"title": "Invite Link F3 Proj"},
        })
        project_id = create_body["data"]["projects"]["createProject"]["id"]

        body = await _gql(async_client, GENERATE_INVITE_LINK_MUTATION, {
            "projectId": project_id,
            "role": "Engineer",
        })
        assert body.get("errors") is None, body.get("errors")
        url = body["data"]["projects"]["generateInviteLink"]
        assert url.startswith("https://findyourtribe.dev/invite/")
        token = url.split("/invite/")[1]
        assert len(token) > 10  # opaque URL-safe token, not trivially guessable
    finally:
        _clear_auth()


async def test_generate_invite_link_unauthenticated(async_client: AsyncClient):
    """generateInviteLink requires authentication."""
    body = await _gql(async_client, GENERATE_INVITE_LINK_MUTATION, {"projectId": "fake"})
    assert body.get("errors")
    assert "Authentication required" in body["errors"][0]["message"]


# ---------------------------------------------------------------------------
# redeemInviteToken — verify creates pending collaboration
# ---------------------------------------------------------------------------


async def test_redeem_invite_token_creates_pending_collaboration(
    async_client: AsyncClient, async_session: AsyncSession,
):
    """redeemInviteToken returns a CollaboratorType with status PENDING."""
    owner_id = await _create_user(async_session, "f3rdmown@example.com", "f3rdmown")
    redeemer_id = await _create_user(async_session, "f3rdmer@example.com", "f3rdmer")

    _set_auth(async_session, owner_id)
    try:
        create_body = await _gql(async_client, CREATE_PROJECT_MUTATION, {
            "input": {"title": "Redeem F3 Proj"},
        })
        project_id = create_body["data"]["projects"]["createProject"]["id"]

        link_body = await _gql(async_client, GENERATE_INVITE_LINK_MUTATION, {
            "projectId": project_id,
            "role": "Designer",
        })
        token = link_body["data"]["projects"]["generateInviteLink"].split("/invite/")[1]
    finally:
        _clear_auth()

    _set_auth(async_session, redeemer_id)
    try:
        body = await _gql(async_client, REDEEM_INVITE_TOKEN_MUTATION, {"token": token})
        assert body.get("errors") is None, body.get("errors")
        data = body["data"]["projects"]["redeemInviteToken"]
        # Verify CollaboratorType shape
        assert data["user"]["id"] == redeemer_id
        assert data["user"]["username"] == "f3rdmer"
        assert data["role"] == "Designer"
        assert data["status"] == "PENDING"
    finally:
        _clear_auth()


async def test_redeem_invite_token_unauthenticated(async_client: AsyncClient):
    """redeemInviteToken requires authentication."""
    body = await _gql(async_client, REDEEM_INVITE_TOKEN_MUTATION, {"token": "anytoken"})
    assert body.get("errors")
    assert "Authentication required" in body["errors"][0]["message"]


# ---------------------------------------------------------------------------
# inviteCollaborator — verify returns CollaboratorType (not bool)
# ---------------------------------------------------------------------------


async def test_invite_collaborator_returns_collaborator_type(
    async_client: AsyncClient, async_session: AsyncSession,
):
    """inviteCollaborator returns CollaboratorType with user, role, and status fields."""
    owner_id = await _create_user(async_session, "f3invown@example.com", "f3invown")
    target_id = await _create_user(async_session, "f3invtgt@example.com", "f3invtgt")

    _set_auth(async_session, owner_id)
    try:
        create_body = await _gql(async_client, CREATE_PROJECT_MUTATION, {
            "input": {"title": "Collab F3 Proj"},
        })
        project_id = create_body["data"]["projects"]["createProject"]["id"]

        body = await _gql(async_client, INVITE_COLLABORATOR_MUTATION, {
            "projectId": project_id,
            "userId": target_id,
            "role": "Backend Engineer",
        })
        assert body.get("errors") is None, body.get("errors")
        data = body["data"]["projects"]["inviteCollaborator"]

        # Verify response is CollaboratorType (has user sub-object), not bool
        assert isinstance(data, dict), "inviteCollaborator must return CollaboratorType, not bool"
        assert data["user"]["id"] == target_id
        assert data["user"]["username"] == "f3invtgt"
        assert data["role"] == "Backend Engineer"
        assert data["status"] == "PENDING"
    finally:
        _clear_auth()


async def test_invite_collaborator_unauthenticated(async_client: AsyncClient):
    """inviteCollaborator requires authentication."""
    body = await _gql(async_client, INVITE_COLLABORATOR_MUTATION, {
        "projectId": "fake",
        "userId": "fake",
    })
    assert body.get("errors")
    assert "Authentication required" in body["errors"][0]["message"]


# ---------------------------------------------------------------------------
# confirmCollaboration — verify returns CollaboratorType (not bool)
# ---------------------------------------------------------------------------


async def test_confirm_collaboration_returns_collaborator_type(
    async_client: AsyncClient, async_session: AsyncSession,
):
    """confirmCollaboration returns CollaboratorType with status CONFIRMED and confirmedAt."""
    owner_id = await _create_user(async_session, "f3confown@example.com", "f3confown")
    target_id = await _create_user(async_session, "f3conftgt@example.com", "f3conftgt")

    _set_auth(async_session, owner_id)
    try:
        create_body = await _gql(async_client, CREATE_PROJECT_MUTATION, {
            "input": {"title": "Confirm F3 Proj"},
        })
        project_id = create_body["data"]["projects"]["createProject"]["id"]
        await _gql(async_client, INVITE_COLLABORATOR_MUTATION, {
            "projectId": project_id,
            "userId": target_id,
        })
    finally:
        _clear_auth()

    _set_auth(async_session, target_id)
    try:
        body = await _gql(async_client, CONFIRM_COLLABORATION_MUTATION, {
            "projectId": project_id,
        })
        assert body.get("errors") is None, body.get("errors")
        data = body["data"]["projects"]["confirmCollaboration"]

        # Verify response is CollaboratorType (has user sub-object), not bool
        assert isinstance(data, dict), "confirmCollaboration must return CollaboratorType, not bool"
        assert data["user"]["id"] == target_id
        assert data["status"] == "CONFIRMED"
        assert data["confirmedAt"] is not None
    finally:
        _clear_auth()


async def test_confirm_collaboration_unauthenticated(async_client: AsyncClient):
    """confirmCollaboration requires authentication."""
    body = await _gql(async_client, CONFIRM_COLLABORATION_MUTATION, {"projectId": "fake"})
    assert body.get("errors")
    assert "Authentication required" in body["errors"][0]["message"]


# ---------------------------------------------------------------------------
# tagSuggestions — verify filtering and limit
# ---------------------------------------------------------------------------


async def test_tag_suggestions_returns_list_for_known_field(async_client: AsyncClient):
    """tagSuggestions returns a non-empty list for a known field."""
    body = await _gql(async_client, TAG_SUGGESTIONS_QUERY, {"field": "domains"})
    assert body.get("errors") is None, body.get("errors")
    tags = body["data"]["tagSuggestions"]
    assert isinstance(tags, list)
    assert len(tags) > 0


async def test_tag_suggestions_unknown_field_returns_empty(async_client: AsyncClient):
    """tagSuggestions returns an empty list for an unknown field."""
    body = await _gql(async_client, TAG_SUGGESTIONS_QUERY, {"field": "nonexistent_field"})
    assert body.get("errors") is None, body.get("errors")
    assert body["data"]["tagSuggestions"] == []


async def test_tag_suggestions_limit_respected(async_client: AsyncClient):
    """tagSuggestions respects the limit parameter."""
    body = await _gql(async_client, TAG_SUGGESTIONS_QUERY, {
        "field": "tech_stack",
        "limit": 3,
    })
    assert body.get("errors") is None, body.get("errors")
    tags = body["data"]["tagSuggestions"]
    assert len(tags) <= 3


async def test_tag_suggestions_query_filters_results(async_client: AsyncClient):
    """tagSuggestions returns only tags matching the query substring."""
    body = await _gql(async_client, TAG_SUGGESTIONS_QUERY, {
        "field": "ai_tools",
        "query": "claude",
    })
    assert body.get("errors") is None, body.get("errors")
    tags = body["data"]["tagSuggestions"]
    assert len(tags) > 0
    # Every returned tag must contain "claude" (case-insensitive)
    for tag in tags:
        assert "claude" in tag.lower()


async def test_tag_suggestions_all_field_keys(async_client: AsyncClient):
    """tagSuggestions returns results for all valid field keys."""
    valid_fields = ["tech_stack", "domains", "ai_tools", "build_style", "services"]
    for field in valid_fields:
        body = await _gql(async_client, TAG_SUGGESTIONS_QUERY, {"field": field})
        assert body.get("errors") is None, f"Error for field {field}: {body.get('errors')}"
        tags = body["data"]["tagSuggestions"]
        assert len(tags) > 0, f"Expected suggestions for field {field!r}"


# ---------------------------------------------------------------------------
# searchUsers — verify user search returns UserType list
# ---------------------------------------------------------------------------


async def test_search_users_returns_matching_users(
    async_client: AsyncClient, async_session: AsyncSession,
):
    """searchUsers returns users whose name/username matches the query."""
    # Create a user with a distinctive username to search for
    searcher_id = await _create_user(async_session, "f3srcher@example.com", "f3srcher")
    await _create_user(async_session, "f3uniquename@example.com", "f3uniquename")

    _set_auth(async_session, searcher_id)
    try:
        body = await _gql(async_client, SEARCH_USERS_QUERY, {
            "query": "f3uniquename",
            "limit": 5,
        })
        assert body.get("errors") is None, body.get("errors")
        users = body["data"]["searchUsers"]
        assert isinstance(users, list)
        assert len(users) >= 1
        usernames = [u["username"] for u in users]
        assert "f3uniquename" in usernames
        # Verify UserType shape
        for user in users:
            assert "id" in user
            assert "username" in user
            assert "displayName" in user
    finally:
        _clear_auth()


async def test_search_users_excludes_self(
    async_client: AsyncClient, async_session: AsyncSession,
):
    """searchUsers does not include the authenticated user in results."""
    user_id = await _create_user(async_session, "f3selfexcl@example.com", "f3selfexcl")

    _set_auth(async_session, user_id)
    try:
        body = await _gql(async_client, SEARCH_USERS_QUERY, {
            "query": "f3selfexcl",
        })
        assert body.get("errors") is None, body.get("errors")
        users = body["data"]["searchUsers"]
        ids = [u["id"] for u in users]
        assert user_id not in ids
    finally:
        _clear_auth()


async def test_search_users_requires_auth(async_client: AsyncClient):
    """searchUsers requires authentication."""
    body = await _gql(async_client, SEARCH_USERS_QUERY, {"query": "anyone"})
    assert body.get("errors")
    assert "Authentication required" in body["errors"][0]["message"]


async def test_search_users_limit_respected(
    async_client: AsyncClient, async_session: AsyncSession,
):
    """searchUsers respects the limit parameter."""
    searcher_id = await _create_user(async_session, "f3limiter@example.com", "f3limiter")
    # Create several users with a common prefix
    for i in range(4):
        await _create_user(
            async_session,
            f"f3limituser{i}@example.com",
            f"f3limituser{i}",
        )

    _set_auth(async_session, searcher_id)
    try:
        body = await _gql(async_client, SEARCH_USERS_QUERY, {
            "query": "f3limituser",
            "limit": 2,
        })
        assert body.get("errors") is None, body.get("errors")
        users = body["data"]["searchUsers"]
        assert len(users) <= 2
    finally:
        _clear_auth()


# ---------------------------------------------------------------------------
# inviteTokenInfo — verify returns project/inviter info
# ---------------------------------------------------------------------------


async def test_invite_token_info_returns_correct_shape(
    async_client: AsyncClient, async_session: AsyncSession,
):
    """inviteTokenInfo returns project title, projectId, inviterName, role, expired."""
    owner_id = await _create_user(async_session, "f3tokown@example.com", "f3tokown")

    _set_auth(async_session, owner_id)
    try:
        create_body = await _gql(async_client, CREATE_PROJECT_MUTATION, {
            "input": {"title": "Token Info Proj"},
        })
        project_id = create_body["data"]["projects"]["createProject"]["id"]

        link_body = await _gql(async_client, GENERATE_INVITE_LINK_MUTATION, {
            "projectId": project_id,
            "role": "QA Lead",
        })
        token = link_body["data"]["projects"]["generateInviteLink"].split("/invite/")[1]
    finally:
        _clear_auth()

    # inviteTokenInfo does NOT require auth
    body = await _gql(async_client, INVITE_TOKEN_INFO_QUERY, {"token": token})
    assert body.get("errors") is None, body.get("errors")
    info = body["data"]["inviteTokenInfo"]
    assert info is not None
    assert info["projectTitle"] == "Token Info Proj"
    assert info["projectId"] == project_id
    assert info["inviterName"] is not None  # display_name of owner
    assert info["role"] == "QA Lead"
    assert info["expired"] is False


async def test_invite_token_info_unknown_token_returns_null(async_client: AsyncClient):
    """inviteTokenInfo returns null for a token that does not exist."""
    body = await _gql(async_client, INVITE_TOKEN_INFO_QUERY, {"token": "totally-bogus-token"})
    assert body.get("errors") is None, body.get("errors")
    assert body["data"]["inviteTokenInfo"] is None


# ---------------------------------------------------------------------------
# myPendingInvitations — verify returns pending invitations
# ---------------------------------------------------------------------------


async def test_my_pending_invitations_returns_invited_projects(
    async_client: AsyncClient, async_session: AsyncSession,
):
    """myPendingInvitations returns projects where the user has a pending invite."""
    owner_id = await _create_user(async_session, "f3pendow@example.com", "f3pendow")
    invitee_id = await _create_user(async_session, "f3pendee@example.com", "f3pendee")

    _set_auth(async_session, owner_id)
    try:
        create_body = await _gql(async_client, CREATE_PROJECT_MUTATION, {
            "input": {"title": "Pending Inv Proj"},
        })
        project_id = create_body["data"]["projects"]["createProject"]["id"]
        await _gql(async_client, INVITE_COLLABORATOR_MUTATION, {
            "projectId": project_id,
            "userId": invitee_id,
            "role": "Frontend Dev",
        })
    finally:
        _clear_auth()

    _set_auth(async_session, invitee_id)
    try:
        body = await _gql(async_client, MY_PENDING_INVITATIONS_QUERY)
        assert body.get("errors") is None, body.get("errors")
        invitations = body["data"]["myPendingInvitations"]
        assert isinstance(invitations, list)
        assert len(invitations) >= 1

        # Verify the specific invitation is present
        found = next((i for i in invitations if i["projectId"] == project_id), None)
        assert found is not None
        assert found["projectTitle"] == "Pending Inv Proj"
        assert found["role"] == "Frontend Dev"
        assert found["inviter"]["id"] == owner_id
        assert found["invitedAt"] is not None
    finally:
        _clear_auth()


async def test_my_pending_invitations_empty_when_none(
    async_client: AsyncClient, async_session: AsyncSession,
):
    """myPendingInvitations returns empty list when the user has no pending invites."""
    user_id = await _create_user(async_session, "f3nopend@example.com", "f3nopend")

    _set_auth(async_session, user_id)
    try:
        body = await _gql(async_client, MY_PENDING_INVITATIONS_QUERY)
        assert body.get("errors") is None, body.get("errors")
        assert body["data"]["myPendingInvitations"] == []
    finally:
        _clear_auth()


async def test_my_pending_invitations_requires_auth(async_client: AsyncClient):
    """myPendingInvitations requires authentication."""
    body = await _gql(async_client, MY_PENDING_INVITATIONS_QUERY)
    assert body.get("errors")
    assert "Authentication required" in body["errors"][0]["message"]


async def test_my_pending_invitations_excludes_confirmed(
    async_client: AsyncClient, async_session: AsyncSession,
):
    """myPendingInvitations does not include already-confirmed invitations."""
    owner_id = await _create_user(async_session, "f3pendconf@example.com", "f3pendconf")
    invitee_id = await _create_user(async_session, "f3pendcee@example.com", "f3pendcee")

    _set_auth(async_session, owner_id)
    try:
        create_body = await _gql(async_client, CREATE_PROJECT_MUTATION, {
            "input": {"title": "Confirmed Proj"},
        })
        project_id = create_body["data"]["projects"]["createProject"]["id"]
        await _gql(async_client, INVITE_COLLABORATOR_MUTATION, {
            "projectId": project_id,
            "userId": invitee_id,
        })
    finally:
        _clear_auth()

    # Confirm the invite
    _set_auth(async_session, invitee_id)
    try:
        await _gql(async_client, CONFIRM_COLLABORATION_MUTATION, {"projectId": project_id})

        # After confirming, it should no longer appear in pending invitations
        body = await _gql(async_client, MY_PENDING_INVITATIONS_QUERY)
        assert body.get("errors") is None, body.get("errors")
        invitations = body["data"]["myPendingInvitations"]
        project_ids = [i["projectId"] for i in invitations]
        assert project_id not in project_ids
    finally:
        _clear_auth()


# ---------------------------------------------------------------------------
# project(id) query — verify new F3 fields in response
# ---------------------------------------------------------------------------


async def test_project_query_includes_domain_and_tag_fields(
    async_client: AsyncClient, async_session: AsyncSession,
):
    """project(id) query includes domains, aiTools, buildStyle, and services fields."""
    user_id = await _create_user(async_session, "f3projq@example.com", "f3projq")
    _set_auth(async_session, user_id)
    try:
        create_body = await _gql(async_client, CREATE_PROJECT_MUTATION, {
            "input": {"title": "F3 Query Proj"},
        })
        project_id = create_body["data"]["projects"]["createProject"]["id"]

        await _gql(async_client, UPDATE_PROJECT_MUTATION, {
            "id": project_id,
            "input": {
                "domains": ["Education", "Social"],
                "aiTools": ["Claude", "v0"],
                "buildStyle": ["Weekend project"],
                "services": ["Clerk"],
            },
        })
    finally:
        _clear_auth()

    # project query is public — no auth needed
    body = await _gql(async_client, PROJECT_QUERY, {"id": project_id})
    assert body.get("errors") is None, body.get("errors")
    proj = body["data"]["project"]
    assert proj["id"] == project_id
    assert proj["title"] == "F3 Query Proj"
    assert proj["domains"] == ["Education", "Social"]
    assert proj["aiTools"] == ["Claude", "v0"]
    assert proj["buildStyle"] == ["Weekend project"]
    assert proj["services"] == ["Clerk"]


async def test_project_query_includes_milestones_field(
    async_client: AsyncClient, async_session: AsyncSession,
):
    """project(id) query response includes a milestones field (list type)."""
    user_id = await _create_user(async_session, "f3projmil@example.com", "f3projmil")
    _set_auth(async_session, user_id)
    try:
        create_body = await _gql(async_client, CREATE_PROJECT_MUTATION, {
            "input": {"title": "Milestones F3 Query Proj"},
        })
        project_id = create_body["data"]["projects"]["createProject"]["id"]
    finally:
        _clear_auth()

    body = await _gql(async_client, PROJECT_QUERY, {"id": project_id})
    assert body.get("errors") is None, body.get("errors")
    proj = body["data"]["project"]
    # milestones field must be present and be a list
    assert "milestones" in proj
    assert isinstance(proj["milestones"], list)


async def test_project_query_returns_null_for_unknown_id(async_client: AsyncClient):
    """project(id) query returns null for a non-existent project."""
    body = await _gql(async_client, PROJECT_QUERY, {"id": "00000000000000000000000000"})
    assert body.get("errors") is None, body.get("errors")
    assert body["data"]["project"] is None
