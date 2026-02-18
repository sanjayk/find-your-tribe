"""Tests for project_service — CRUD and collaborator management."""

import pytest

from app.models.enums import CollaboratorStatus, ProjectStatus
from app.models.project import Project
from app.services import project_service

# ---------------------------------------------------------------------------
# create
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_create_happy_path(async_session, seed_test_data):
    """Creating a project returns the project with correct fields."""
    user = seed_test_data["users"]["testuser1"]
    project = await project_service.create(
        async_session,
        owner_id=user.id,
        title="My Project",
        description="A great project",
        tech_stack=["Python", "FastAPI"],
    )
    assert project.title == "My Project"
    assert project.description == "A great project"
    assert project.owner_id == user.id
    assert project.status == ProjectStatus.IN_PROGRESS
    assert project.tech_stack == ["Python", "FastAPI"]
    assert project.id is not None


@pytest.mark.asyncio
async def test_create_title_validation_empty(async_session, seed_test_data):
    """Empty title raises ValueError."""
    user = seed_test_data["users"]["testuser1"]
    with pytest.raises(ValueError, match="Title must be between 1 and 200 characters"):
        await project_service.create(
            async_session,
            owner_id=user.id,
            title="",
        )


@pytest.mark.asyncio
async def test_create_title_validation_too_long(async_session, seed_test_data):
    """Title longer than 200 characters raises ValueError."""
    user = seed_test_data["users"]["testuser1"]
    with pytest.raises(ValueError, match="Title must be between 1 and 200 characters"):
        await project_service.create(
            async_session,
            owner_id=user.id,
            title="x" * 201,
        )


@pytest.mark.asyncio
async def test_create_tech_stack_limit(async_session, seed_test_data):
    """Tech stack with more than 20 items raises ValueError."""
    user = seed_test_data["users"]["testuser1"]
    with pytest.raises(ValueError, match="Tech stack cannot exceed 20 items"):
        await project_service.create(
            async_session,
            owner_id=user.id,
            title="Overloaded",
            tech_stack=[f"tech_{i}" for i in range(21)],
        )


# ---------------------------------------------------------------------------
# update
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_update_happy_path(async_session, seed_test_data):
    """Updating a project changes its fields and returns updated object."""
    user = seed_test_data["users"]["testuser1"]
    project = await project_service.create(
        async_session, owner_id=user.id, title="Original"
    )
    updated, shipped = await project_service.update(
        async_session,
        project_id=project.id,
        user_id=user.id,
        title="Updated Title",
        description="New description",
    )
    assert updated.title == "Updated Title"
    assert updated.description == "New description"
    assert shipped is False


@pytest.mark.asyncio
async def test_update_owner_only(async_session, seed_test_data):
    """Non-owner updating a project raises PermissionError."""
    owner = seed_test_data["users"]["testuser1"]
    other = seed_test_data["users"]["testuser2"]
    project = await project_service.create(
        async_session, owner_id=owner.id, title="Owner's Project"
    )
    with pytest.raises(PermissionError, match="Only the project owner"):
        await project_service.update(
            async_session,
            project_id=project.id,
            user_id=other.id,
            title="Hijacked",
        )


@pytest.mark.asyncio
async def test_update_status_changed_to_shipped(async_session, seed_test_data):
    """Changing status to shipped sets the flag to True."""
    user = seed_test_data["users"]["testuser1"]
    project = await project_service.create(
        async_session, owner_id=user.id, title="Ship It"
    )
    updated, shipped = await project_service.update(
        async_session,
        project_id=project.id,
        user_id=user.id,
        status="shipped",
    )
    assert updated.status == ProjectStatus.SHIPPED
    assert shipped is True


@pytest.mark.asyncio
async def test_update_status_shipped_to_shipped_no_flag(async_session, seed_test_data):
    """Updating an already-shipped project to shipped does not set the flag."""
    user = seed_test_data["users"]["testuser1"]
    project = await project_service.create(
        async_session, owner_id=user.id, title="Already Shipped",
        status="shipped",
    )
    updated, shipped = await project_service.update(
        async_session,
        project_id=project.id,
        user_id=user.id,
        status="shipped",
    )
    assert shipped is False


# ---------------------------------------------------------------------------
# delete
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_delete_happy_path(async_session, seed_test_data):
    """Deleting a project succeeds for the owner."""
    user = seed_test_data["users"]["testuser1"]
    project = await project_service.create(
        async_session, owner_id=user.id, title="To Delete"
    )
    await project_service.delete(async_session, project_id=project.id, user_id=user.id)

    deleted = await async_session.get(Project, project.id)
    assert deleted is None


@pytest.mark.asyncio
async def test_delete_owner_only(async_session, seed_test_data):
    """Non-owner deleting a project raises PermissionError."""
    owner = seed_test_data["users"]["testuser1"]
    other = seed_test_data["users"]["testuser2"]
    project = await project_service.create(
        async_session, owner_id=owner.id, title="Protected"
    )
    with pytest.raises(PermissionError, match="Only the project owner"):
        await project_service.delete(
            async_session, project_id=project.id, user_id=other.id
        )


@pytest.mark.asyncio
async def test_delete_not_found(async_session):
    """Deleting a nonexistent project raises ValueError."""
    with pytest.raises(ValueError, match="Project not found"):
        await project_service.delete(
            async_session,
            project_id="nonexistent_00000000000",
            user_id="anyone_0000000000000000",
        )


# ---------------------------------------------------------------------------
# invite_collaborator
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_invite_collaborator_happy_path(async_session, seed_test_data):
    """Owner can invite another user to collaborate."""
    owner = seed_test_data["users"]["testuser1"]
    invitee = seed_test_data["users"]["testuser2"]
    project = await project_service.create(
        async_session, owner_id=owner.id, title="Collab Project"
    )
    result = await project_service.invite_collaborator(
        async_session,
        project_id=project.id,
        user_id=invitee.id,
        inviter_id=owner.id,
        role="frontend",
    )
    assert result["project_id"] == project.id
    assert result["user_id"] == invitee.id
    assert result["status"] == CollaboratorStatus.PENDING
    assert result["role"] == "frontend"


@pytest.mark.asyncio
async def test_invite_collaborator_duplicate(async_session, seed_test_data):
    """Inviting the same user twice raises ValueError."""
    owner = seed_test_data["users"]["testuser1"]
    invitee = seed_test_data["users"]["testuser2"]
    project = await project_service.create(
        async_session, owner_id=owner.id, title="Dupe Invite"
    )
    await project_service.invite_collaborator(
        async_session,
        project_id=project.id,
        user_id=invitee.id,
        inviter_id=owner.id,
    )
    with pytest.raises(ValueError, match="already a collaborator"):
        await project_service.invite_collaborator(
            async_session,
            project_id=project.id,
            user_id=invitee.id,
            inviter_id=owner.id,
        )


@pytest.mark.asyncio
async def test_invite_collaborator_owner_only(async_session, seed_test_data):
    """Non-owner inviting a collaborator raises PermissionError."""
    owner = seed_test_data["users"]["testuser1"]
    non_owner = seed_test_data["users"]["testuser2"]
    invitee = seed_test_data["users"]["testuser3"]
    project = await project_service.create(
        async_session, owner_id=owner.id, title="No Invite"
    )
    with pytest.raises(PermissionError, match="Only the project owner"):
        await project_service.invite_collaborator(
            async_session,
            project_id=project.id,
            user_id=invitee.id,
            inviter_id=non_owner.id,
        )


# ---------------------------------------------------------------------------
# confirm_collaboration
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_confirm_collaboration_happy_path(async_session, seed_test_data):
    """Invitee can confirm a pending invitation."""
    owner = seed_test_data["users"]["testuser1"]
    invitee = seed_test_data["users"]["testuser2"]
    project = await project_service.create(
        async_session, owner_id=owner.id, title="Confirm Collab"
    )
    await project_service.invite_collaborator(
        async_session,
        project_id=project.id,
        user_id=invitee.id,
        inviter_id=owner.id,
    )
    result = await project_service.confirm_collaboration(
        async_session,
        project_id=project.id,
        user_id=invitee.id,
    )
    assert result["status"] == CollaboratorStatus.CONFIRMED
    assert result["confirmed_at"] is not None


@pytest.mark.asyncio
async def test_confirm_collaboration_no_pending(async_session, seed_test_data):
    """Confirming without a pending invite raises ValueError."""
    user = seed_test_data["users"]["testuser1"]
    project = await project_service.create(
        async_session, owner_id=user.id, title="No Pending"
    )
    with pytest.raises(ValueError, match="No pending collaboration found"):
        await project_service.confirm_collaboration(
            async_session,
            project_id=project.id,
            user_id=seed_test_data["users"]["testuser2"].id,
        )


# ---------------------------------------------------------------------------
# decline_collaboration
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_decline_collaboration_happy_path(async_session, seed_test_data):
    """Invitee can decline a pending invitation."""
    owner = seed_test_data["users"]["testuser1"]
    invitee = seed_test_data["users"]["testuser2"]
    project = await project_service.create(
        async_session, owner_id=owner.id, title="Decline Collab"
    )
    await project_service.invite_collaborator(
        async_session,
        project_id=project.id,
        user_id=invitee.id,
        inviter_id=owner.id,
    )
    # Should not raise
    await project_service.decline_collaboration(
        async_session,
        project_id=project.id,
        user_id=invitee.id,
    )


# ---------------------------------------------------------------------------
# remove_collaborator
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_remove_collaborator_happy_path(async_session, seed_test_data):
    """Owner can remove a confirmed collaborator."""
    owner = seed_test_data["users"]["testuser1"]
    collab = seed_test_data["users"]["testuser2"]
    project = await project_service.create(
        async_session, owner_id=owner.id, title="Remove Collab"
    )
    await project_service.invite_collaborator(
        async_session,
        project_id=project.id,
        user_id=collab.id,
        inviter_id=owner.id,
    )
    await project_service.confirm_collaboration(
        async_session,
        project_id=project.id,
        user_id=collab.id,
    )
    # Should not raise
    await project_service.remove_collaborator(
        async_session,
        project_id=project.id,
        collaborator_id=collab.id,
        owner_id=owner.id,
    )


@pytest.mark.asyncio
async def test_remove_collaborator_not_found(async_session, seed_test_data):
    """Removing a non-collaborator raises ValueError."""
    owner = seed_test_data["users"]["testuser1"]
    project = await project_service.create(
        async_session, owner_id=owner.id, title="No Collab"
    )
    with pytest.raises(ValueError, match="Collaborator not found"):
        await project_service.remove_collaborator(
            async_session,
            project_id=project.id,
            collaborator_id=seed_test_data["users"]["testuser2"].id,
            owner_id=owner.id,
        )
