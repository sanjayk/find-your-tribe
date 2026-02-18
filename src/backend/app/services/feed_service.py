"""Feed service — system events and user-created posts."""

from sqlalchemy.ext.asyncio import AsyncSession
from ulid import ULID

from app.models.enums import EventType
from app.models.feed_event import FeedEvent
from app.models.project import Project
from app.models.tribe import Tribe

USER_POST_TYPES = {EventType.PROJECT_UPDATE, EventType.TRIBE_ANNOUNCEMENT}


async def create_event(
    session: AsyncSession,
    event_type: str,
    actor_id: str,
    target_type: str,
    target_id: str,
    metadata: dict | None = None,
) -> FeedEvent:
    """Create a system-generated feed event.

    Called as a side effect from other mutations (project created, tribe formed, etc.).
    Does NOT commit — let the calling mutation handle the transaction.
    """
    event = FeedEvent(
        id=str(ULID()),
        event_type=EventType(event_type),
        actor_id=actor_id,
        target_type=target_type,
        target_id=target_id,
        event_metadata=metadata or {},
    )
    session.add(event)
    return event


async def create_post(
    session: AsyncSession,
    actor_id: str,
    target_type: str,
    target_id: str,
    content: str,
) -> FeedEvent:
    """Create a user-authored post tied to a build artifact.

    target_type must be "project" or "tribe".
    Content max 2000 chars.
    """
    if len(content) > 2000:
        raise ValueError("Post content must be 2000 characters or less")
    if target_type not in ("project", "tribe"):
        raise ValueError("Posts must be tied to a project or tribe")

    if target_type == "project":
        project = await session.get(Project, target_id)
        if project is None:
            raise ValueError(f"Project {target_id} not found")
        if project.owner_id != actor_id:
            raise PermissionError("Only the project owner can post updates")
        event_type = EventType.PROJECT_UPDATE
    else:
        tribe = await session.get(Tribe, target_id)
        if tribe is None:
            raise ValueError(f"Tribe {target_id} not found")
        if tribe.owner_id != actor_id:
            raise PermissionError("Only the tribe owner can post announcements")
        event_type = EventType.TRIBE_ANNOUNCEMENT

    event = FeedEvent(
        id=str(ULID()),
        event_type=event_type,
        actor_id=actor_id,
        target_type=target_type,
        target_id=target_id,
        event_metadata={"content": content},
    )
    session.add(event)
    await session.commit()
    await session.refresh(event)
    return event


async def update_post(
    session: AsyncSession,
    event_id: str,
    actor_id: str,
    content: str,
) -> FeedEvent | None:
    """Update a user-created post. System events cannot be edited."""
    if len(content) > 2000:
        raise ValueError("Post content must be 2000 characters or less")

    event = await session.get(FeedEvent, event_id)
    if event is None:
        return None
    if event.actor_id != actor_id:
        raise PermissionError("Only the author can edit a post")
    if event.event_type not in USER_POST_TYPES:
        raise ValueError("System events cannot be edited")

    event.event_metadata = {**event.event_metadata, "content": content, "edited": True}
    await session.commit()
    await session.refresh(event)
    return event


async def delete_post(
    session: AsyncSession,
    event_id: str,
    actor_id: str,
) -> bool:
    """Delete a user-created post. System events cannot be deleted."""
    event = await session.get(FeedEvent, event_id)
    if event is None:
        return False
    if event.actor_id != actor_id:
        raise PermissionError("Only the author can delete a post")
    if event.event_type not in USER_POST_TYPES:
        raise ValueError("System events cannot be deleted")

    await session.delete(event)
    await session.commit()
    return True
