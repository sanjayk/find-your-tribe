"""Feed mutations — user-created posts tied to build artifacts."""

import strawberry
from strawberry.types import Info

from app.graphql.context import Context
from app.graphql.helpers import require_auth
from app.graphql.types.feed_event import FeedEventType
from app.services import feed_service


def _event_to_type(event) -> FeedEventType:
    """Convert FeedEvent model to FeedEventType."""
    return FeedEventType(
        id=event.id,
        event_type=event.event_type,
        target_type=event.target_type,
        target_id=event.target_id,
        metadata=event.event_metadata,
        created_at=event.created_at,
    )


@strawberry.type
class FeedMutations:
    """Mutations for user-created feed posts."""

    @strawberry.mutation
    async def create_post(
        self,
        info: Info[Context, None],
        target_type: str,
        target_id: strawberry.ID,
        content: str,
    ) -> FeedEventType:
        """Create a user-authored post tied to a project or tribe."""
        user_id = require_auth(info)
        session = info.context.session
        event = await feed_service.create_post(
            session, actor_id=user_id,
            target_type=target_type, target_id=str(target_id),
            content=content,
        )
        return _event_to_type(event)

    @strawberry.mutation
    async def update_post(
        self,
        info: Info[Context, None],
        id: strawberry.ID,
        content: str,
    ) -> FeedEventType | None:
        """Update a user-created post. System events cannot be edited."""
        user_id = require_auth(info)
        session = info.context.session
        event = await feed_service.update_post(
            session, event_id=str(id), actor_id=user_id, content=content,
        )
        if event is None:
            return None
        return _event_to_type(event)

    @strawberry.mutation
    async def delete_post(
        self,
        info: Info[Context, None],
        id: strawberry.ID,
    ) -> bool:
        """Delete a user-created post. System events cannot be deleted."""
        user_id = require_auth(info)
        session = info.context.session
        return await feed_service.delete_post(
            session, event_id=str(id), actor_id=user_id,
        )
