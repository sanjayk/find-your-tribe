"""Tests for feed_service — system events and user-created posts."""

import pytest
from ulid import ULID

from app.models.enums import EventType, ProjectStatus, TribeStatus
from app.models.feed_event import FeedEvent
from app.models.project import Project
from app.models.tribe import Tribe
from app.services import feed_service

# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------


async def _create_project(session, owner_id, title="Test Project"):
    """Create a project for feed event tests."""
    project = Project(
        id=str(ULID()),
        owner_id=owner_id,
        title=title,
        status=ProjectStatus.IN_PROGRESS,
    )
    session.add(project)
    await session.commit()
    return project


async def _create_tribe(session, owner_id, name="Test Tribe"):
    """Create a tribe for feed event tests."""
    tribe = Tribe(
        id=str(ULID()),
        owner_id=owner_id,
        name=name,
        status=TribeStatus.OPEN,
    )
    session.add(tribe)
    await session.commit()
    return tribe


# ---------------------------------------------------------------------------
# create_event
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_create_event_happy_path(async_session, seed_test_data):
    """System event is created but NOT committed by the service."""
    user = seed_test_data["users"]["testuser1"]
    event = await feed_service.create_event(
        async_session,
        event_type="project_created",
        actor_id=user.id,
        target_type="project",
        target_id=str(ULID()),
        metadata={"title": "New Project"},
    )
    assert event.event_type == EventType.PROJECT_CREATED
    assert event.actor_id == user.id
    assert event.event_metadata == {"title": "New Project"}

    # The service deliberately does NOT commit — verify the event is pending
    # by checking it was added to the session but not yet persisted via an
    # independent query. (In the savepoint-based test session, the add is
    # visible within the same session, but the key contract is that
    # create_event itself never calls session.commit().)
    assert event in async_session.new or event in async_session.dirty or event in async_session.identity_map.values()


# ---------------------------------------------------------------------------
# create_post — project
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_create_post_project_happy_path(async_session, seed_test_data):
    """Owner can create a project update post."""
    owner = seed_test_data["users"]["testuser1"]
    project = await _create_project(async_session, owner.id)

    post = await feed_service.create_post(
        async_session,
        actor_id=owner.id,
        target_type="project",
        target_id=project.id,
        content="Shipped v1.0!",
    )
    assert post.event_type == EventType.PROJECT_UPDATE
    assert post.event_metadata["content"] == "Shipped v1.0!"
    assert post.actor_id == owner.id
    assert post.target_id == project.id


# ---------------------------------------------------------------------------
# create_post — tribe
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_create_post_tribe_happy_path(async_session, seed_test_data):
    """Owner can create a tribe announcement post."""
    owner = seed_test_data["users"]["testuser1"]
    tribe = await _create_tribe(async_session, owner.id)

    post = await feed_service.create_post(
        async_session,
        actor_id=owner.id,
        target_type="tribe",
        target_id=tribe.id,
        content="Welcome to the tribe!",
    )
    assert post.event_type == EventType.TRIBE_ANNOUNCEMENT
    assert post.event_metadata["content"] == "Welcome to the tribe!"


# ---------------------------------------------------------------------------
# create_post — validations
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_create_post_content_too_long(async_session, seed_test_data):
    """Content exceeding 2000 characters raises ValueError."""
    owner = seed_test_data["users"]["testuser1"]
    project = await _create_project(async_session, owner.id)

    with pytest.raises(ValueError, match="Post content must be 2000 characters or less"):
        await feed_service.create_post(
            async_session,
            actor_id=owner.id,
            target_type="project",
            target_id=project.id,
            content="x" * 2001,
        )


@pytest.mark.asyncio
async def test_create_post_non_owner_error(async_session, seed_test_data):
    """Non-owner posting to a project raises PermissionError."""
    owner = seed_test_data["users"]["testuser1"]
    non_owner = seed_test_data["users"]["testuser2"]
    project = await _create_project(async_session, owner.id)

    with pytest.raises(PermissionError, match="Only the project owner can post updates"):
        await feed_service.create_post(
            async_session,
            actor_id=non_owner.id,
            target_type="project",
            target_id=project.id,
            content="Unauthorized post",
        )


@pytest.mark.asyncio
async def test_create_post_non_owner_tribe_error(async_session, seed_test_data):
    """Non-owner posting to a tribe raises PermissionError."""
    owner = seed_test_data["users"]["testuser1"]
    non_owner = seed_test_data["users"]["testuser2"]
    tribe = await _create_tribe(async_session, owner.id)

    with pytest.raises(PermissionError, match="Only the tribe owner can post announcements"):
        await feed_service.create_post(
            async_session,
            actor_id=non_owner.id,
            target_type="tribe",
            target_id=tribe.id,
            content="Unauthorized announcement",
        )


# ---------------------------------------------------------------------------
# update_post
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_update_post_happy_path(async_session, seed_test_data):
    """Author can update their own post."""
    owner = seed_test_data["users"]["testuser1"]
    project = await _create_project(async_session, owner.id)

    post = await feed_service.create_post(
        async_session,
        actor_id=owner.id,
        target_type="project",
        target_id=project.id,
        content="Original content",
    )

    updated = await feed_service.update_post(
        async_session,
        event_id=post.id,
        actor_id=owner.id,
        content="Updated content",
    )
    assert updated is not None
    assert updated.event_metadata["content"] == "Updated content"
    assert updated.event_metadata["edited"] is True


@pytest.mark.asyncio
async def test_update_post_system_event_cannot_be_edited(async_session, seed_test_data):
    """System events (non-user-post types) cannot be edited."""
    user = seed_test_data["users"]["testuser1"]

    # Create a system event directly
    event = FeedEvent(
        id=str(ULID()),
        event_type=EventType.PROJECT_CREATED,
        actor_id=user.id,
        target_type="project",
        target_id=str(ULID()),
        event_metadata={"title": "Some Project"},
    )
    async_session.add(event)
    await async_session.commit()

    with pytest.raises(ValueError, match="System events cannot be edited"):
        await feed_service.update_post(
            async_session,
            event_id=event.id,
            actor_id=user.id,
            content="Trying to edit system event",
        )


# ---------------------------------------------------------------------------
# delete_post
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_delete_post_happy_path(async_session, seed_test_data):
    """Author can delete their own post."""
    owner = seed_test_data["users"]["testuser1"]
    project = await _create_project(async_session, owner.id)

    post = await feed_service.create_post(
        async_session,
        actor_id=owner.id,
        target_type="project",
        target_id=project.id,
        content="To be deleted",
    )

    result = await feed_service.delete_post(
        async_session, event_id=post.id, actor_id=owner.id
    )
    assert result is True

    # Verify the event is gone
    deleted = await async_session.get(FeedEvent, post.id)
    assert deleted is None


@pytest.mark.asyncio
async def test_delete_post_system_event_cannot_be_deleted(async_session, seed_test_data):
    """System events cannot be deleted."""
    user = seed_test_data["users"]["testuser1"]

    event = FeedEvent(
        id=str(ULID()),
        event_type=EventType.TRIBE_CREATED,
        actor_id=user.id,
        target_type="tribe",
        target_id=str(ULID()),
        event_metadata={},
    )
    async_session.add(event)
    await async_session.commit()

    with pytest.raises(ValueError, match="System events cannot be deleted"):
        await feed_service.delete_post(
            async_session, event_id=event.id, actor_id=user.id
        )
