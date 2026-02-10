"""Strawberry GraphQL types for Project model."""

from datetime import datetime
from typing import TYPE_CHECKING

import strawberry

from app.models.enums import CollaboratorStatus, ProjectStatus

if TYPE_CHECKING:
    from app.graphql.types.user import UserType


@strawberry.type
class ProjectType:
    """GraphQL type for Project."""

    id: str
    title: str
    description: str | None
    status: ProjectStatus
    role: str | None
    thumbnail_url: str | None
    links: strawberry.scalars.JSON
    tech_stack: strawberry.scalars.JSON
    impact_metrics: strawberry.scalars.JSON
    github_repo_full_name: str | None
    github_stars: int | None
    created_at: datetime
    updated_at: datetime

    @strawberry.field
    def owner(self) -> "UserType":
        """
        Lazy resolver for project owner.

        This field will be implemented later with proper data loading logic.
        For now, it returns a placeholder as the implementation requires
        database context and data loaders.
        """
        # TODO: Implement proper owner loading from database using dataloaders
        # Placeholder - will be replaced with actual dataloader
        raise NotImplementedError("Owner loading not yet implemented")

    @strawberry.field
    def collaborators(self) -> list["CollaboratorType"]:
        """
        Lazy resolver for project collaborators.

        This field will be implemented later with proper data loading logic.
        For now, it returns an empty list as a placeholder.
        """
        # TODO: Implement proper collaborators loading from database
        return []


@strawberry.type
class CollaboratorType:
    """GraphQL type for ProjectCollaborator."""

    user: "UserType"
    role: str | None
    status: CollaboratorStatus
    invited_at: datetime
    confirmed_at: datetime | None
