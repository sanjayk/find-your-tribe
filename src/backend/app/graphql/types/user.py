"""Strawberry GraphQL type for User model."""

from datetime import datetime
from typing import TYPE_CHECKING

import strawberry

from app.models.enums import AvailabilityStatus, UserRole

if TYPE_CHECKING:
    from app.graphql.types.skill import SkillType


@strawberry.type
class UserType:
    """GraphQL type for User."""

    id: str
    email: str
    username: str
    display_name: str
    avatar_url: str | None
    headline: str | None
    primary_role: UserRole | None
    timezone: str | None
    availability_status: AvailabilityStatus
    builder_score: float
    bio: str | None
    contact_links: strawberry.scalars.JSON
    github_username: str | None
    onboarding_completed: bool
    created_at: datetime

    @strawberry.field
    def skills(self) -> list["SkillType"]:
        """
        Lazy resolver for user skills.

        This field will be implemented later with proper data loading logic.
        For now, it returns an empty list as a placeholder.
        """
        # TODO: Implement proper skills loading from database
        return []
