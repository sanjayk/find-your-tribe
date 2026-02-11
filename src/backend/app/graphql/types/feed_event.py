"""Strawberry GraphQL type for FeedEvent model."""

from datetime import datetime
from typing import TYPE_CHECKING

import strawberry

from app.models.enums import EventType

if TYPE_CHECKING:
    from app.graphql.types.user import UserType


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
    def actor(self) -> "UserType":
        """
        Lazy resolver for event actor.

        This field will be implemented later with proper data loading logic.
        For now, it returns a placeholder as the implementation requires
        database context and data loaders.
        """
        # TODO: Implement proper actor loading from database using dataloaders
        # Placeholder - will be replaced with actual dataloader
        raise NotImplementedError("Actor loading not yet implemented")
