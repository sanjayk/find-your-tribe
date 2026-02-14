"""Strawberry GraphQL types for Project model."""

from datetime import datetime
from typing import TYPE_CHECKING

import strawberry

from app.models.enums import CollaboratorStatus, ProjectStatus

if TYPE_CHECKING:
    from app.models.project import Project
    from app.models.user import User


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

    _owner: strawberry.Private[object | None]
    _collaborators: strawberry.Private[list]

    @strawberry.field
    def owner(self) -> "UserType":
        return self._owner  # type: ignore[return-value]

    @strawberry.field
    def collaborators(self) -> list["CollaboratorType"]:
        return self._collaborators  # type: ignore[return-value]

    @classmethod
    def from_model(
        cls,
        project: "Project",
        owner: "User | None" = None,
        collaborators: "list[User] | None" = None,
    ) -> "ProjectType":
        owner_type = None
        if owner is not None:
            owner_type = UserType(
                id=owner.id,
                email=owner.email,
                username=owner.username,
                display_name=owner.display_name,
                avatar_url=owner.avatar_url,
                headline=owner.headline,
                primary_role=owner.primary_role,
                timezone=owner.timezone,
                availability_status=owner.availability_status,
                builder_score=owner.builder_score,
                bio=owner.bio,
                contact_links=owner.contact_links,
                github_username=owner.github_username,
                onboarding_completed=owner.onboarding_completed,
                agent_tools=[],
                agent_workflow_style=None,
                human_agent_ratio=None,
                created_at=owner.created_at,
                _skills=[],
                _owned_projects=[],
                _tribes=[],
            )

        collaborator_types = []
        for collab in (collaborators or []):
            collab_user = UserType(
                id=collab.id,
                email=collab.email,
                username=collab.username,
                display_name=collab.display_name,
                avatar_url=collab.avatar_url,
                headline=collab.headline,
                primary_role=collab.primary_role,
                timezone=collab.timezone,
                availability_status=collab.availability_status,
                builder_score=collab.builder_score,
                bio=collab.bio,
                contact_links=collab.contact_links,
                github_username=collab.github_username,
                onboarding_completed=collab.onboarding_completed,
                agent_tools=[],
                agent_workflow_style=None,
                human_agent_ratio=None,
                created_at=collab.created_at,
                _skills=[],
                _owned_projects=[],
                _tribes=[],
            )
            collaborator_types.append(
                CollaboratorType(
                    user=collab_user,
                    role=None,
                    status=CollaboratorStatus.CONFIRMED,
                    invited_at=project.created_at,
                    confirmed_at=project.created_at,
                )
            )

        return cls(
            id=project.id,
            title=project.title,
            description=project.description,
            status=project.status,
            role=project.role,
            thumbnail_url=project.thumbnail_url,
            links=project.links,
            tech_stack=project.tech_stack,
            impact_metrics=project.impact_metrics,
            github_repo_full_name=project.github_repo_full_name,
            github_stars=project.github_stars,
            created_at=project.created_at,
            updated_at=project.updated_at,
            _owner=owner_type,
            _collaborators=collaborator_types,
        )


@strawberry.type
class CollaboratorType:
    """GraphQL type for ProjectCollaborator."""

    user: "UserType"
    role: str | None
    status: CollaboratorStatus
    invited_at: datetime
    confirmed_at: datetime | None


# Import after class definitions to avoid circular import at module level
from app.graphql.types.user import UserType  # noqa: E402
