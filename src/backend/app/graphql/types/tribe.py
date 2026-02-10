"""Strawberry GraphQL types for Tribe model."""

from datetime import datetime
from typing import TYPE_CHECKING

import strawberry

from app.models.enums import MemberRole, MemberStatus, TribeStatus

if TYPE_CHECKING:
    from app.graphql.types.user import UserType


@strawberry.type
class TribeType:
    """GraphQL type for Tribe."""

    id: str
    name: str
    mission: str | None
    status: TribeStatus
    max_members: int
    created_at: datetime
    updated_at: datetime

    @strawberry.field
    def owner(self) -> "UserType":
        """
        Lazy resolver for tribe owner.

        This field will be implemented later with proper data loading logic.
        For now, it returns a placeholder as the implementation requires
        database context and data loaders.
        """
        # TODO: Implement proper owner loading from database using dataloaders
        # Placeholder - will be replaced with actual dataloader
        raise NotImplementedError("Owner loading not yet implemented")

    @strawberry.field
    def members(self) -> list["TribeMemberType"]:
        """
        Lazy resolver for tribe members.

        This field will be implemented later with proper data loading logic.
        For now, it returns an empty list as a placeholder.
        """
        # TODO: Implement proper members loading from database
        return []

    @strawberry.field
    def open_roles(self) -> list["OpenRoleType"]:
        """
        Lazy resolver for tribe open roles.

        This field will be implemented later with proper data loading logic.
        For now, it returns an empty list as a placeholder.
        """
        # TODO: Implement proper open_roles loading from database
        return []


@strawberry.type
class TribeMemberType:
    """GraphQL type for TribeMember."""

    user: "UserType"
    role: MemberRole
    status: MemberStatus
    joined_at: datetime | None


@strawberry.type
class OpenRoleType:
    """GraphQL type for TribeOpenRole."""

    id: str
    title: str
    skills_needed: strawberry.scalars.JSON
    filled: bool
