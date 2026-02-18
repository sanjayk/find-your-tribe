"""Strawberry GraphQL type for FeedEvent model."""

from __future__ import annotations

from datetime import datetime

import strawberry

from app.models.enums import EventType


@strawberry.type
class FeedEventType:
    """GraphQL type for FeedEvent."""

    id: str
    event_type: EventType
    target_type: str
    target_id: str
    metadata: strawberry.scalars.JSON
    created_at: datetime

    @strawberry.field
    def actor(self) -> UserType | None:
        """
        Lazy resolver for event actor.

        Returns None until proper dataloaders are implemented.
        The frontend extracts actor info from event metadata instead.
        """
        # TODO: Implement proper actor loading from database using dataloaders
        return None


# Import after class definition to avoid circular import at module level
from app.graphql.types.user import UserType  # noqa: E402
