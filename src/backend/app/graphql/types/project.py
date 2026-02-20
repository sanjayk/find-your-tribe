"""Strawberry GraphQL types for Project model."""

from datetime import date, datetime
from typing import TYPE_CHECKING

import strawberry

from app.models.enums import CollaboratorStatus, ProjectStatus

if TYPE_CHECKING:
    from app.models.project import Project
    from app.models.project_milestone import ProjectMilestone
    from app.models.user import User


@strawberry.type
class ProjectMilestoneGQLType:
    """GraphQL type for ProjectMilestone."""

    id: str
    title: str
    date: date
    milestone_type: str  # start | milestone | deploy | launch
    created_at: datetime

    @classmethod
    def from_model(cls, m: "ProjectMilestone") -> "ProjectMilestoneGQLType":
        return cls(
            id=m.id,
            title=m.title,
            date=m.date,
            milestone_type=m.milestone_type.value,
            created_at=m.created_at,
        )


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
    domains: list[str]
    ai_tools: list[str]
    build_style: list[str]
    services: list[str]
    github_repo_full_name: str | None
    github_stars: int | None
    created_at: datetime
    updated_at: datetime

    _owner: strawberry.Private[object | None]
    _collaborators: strawberry.Private[list]
    _milestones: strawberry.Private[list]

    @strawberry.field
    def owner(self) -> "UserType":
        return self._owner  # type: ignore[return-value]

    @strawberry.field
    def collaborators(self) -> list["CollaboratorType"]:
        return self._collaborators  # type: ignore[return-value]

    @strawberry.field
    def milestones(self) -> list[ProjectMilestoneGQLType]:
        return self._milestones  # type: ignore[return-value]

    @classmethod
    def from_model(
        cls,
        project: "Project",
        owner: "User | None" = None,
        collaborators: "list[User] | None" = None,
        collab_details: "dict | None" = None,
        milestones: "list | None" = None,
    ) -> "ProjectType":
        owner_type = None
        if owner is not None:
            owner_type = UserType.from_model(owner)

        _details = collab_details or {}
        collaborator_types = []
        for collab in (collaborators or []):
            info = _details.get(collab.id, {})
            collab_user = UserType.from_model(collab)
            collaborator_types.append(
                CollaboratorType(
                    user=collab_user,
                    role=info.get("role"),
                    status=CollaboratorStatus(info["status"]) if "status" in info else CollaboratorStatus.CONFIRMED,
                    invited_at=project.created_at,
                    confirmed_at=project.created_at,
                )
            )

        milestone_types = [ProjectMilestoneGQLType.from_model(m) for m in (milestones or [])]

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
            domains=project.domains,
            ai_tools=project.ai_tools,
            build_style=project.build_style,
            services=project.services,
            github_repo_full_name=project.github_repo_full_name,
            github_stars=project.github_stars,
            created_at=project.created_at,
            updated_at=project.updated_at,
            _owner=owner_type,
            _collaborators=collaborator_types,
            _milestones=milestone_types,
        )


@strawberry.type
class CollaboratorType:
    """GraphQL type for ProjectCollaborator."""

    user: "UserType"
    role: str | None
    status: CollaboratorStatus
    invited_at: datetime
    confirmed_at: datetime | None


@strawberry.type
class InviteTokenInfoType:
    """GraphQL type for invite token info."""

    project_title: str
    project_id: str
    inviter_name: str
    inviter_avatar_url: str | None
    role: str | None
    expired: bool


@strawberry.type
class PendingInvitationType:
    """GraphQL type for a pending collaboration invitation."""

    project_id: str
    project_title: str
    role: str | None
    inviter: "UserType"
    invited_at: datetime


@strawberry.input
class CreateProjectInput:
    """Input type for creating a project."""

    title: str
    description: str | None = None
    status: str = "in_progress"
    role: str | None = None
    links: strawberry.scalars.JSON | None = None


@strawberry.input
class UpdateProjectInput:
    """Input type for updating a project."""

    title: str | None = None
    description: str | None = None
    status: str | None = None
    role: str | None = None
    links: strawberry.scalars.JSON | None = None
    tech_stack: list[str] | None = None
    domains: list[str] | None = None
    ai_tools: list[str] | None = None
    build_style: list[str] | None = None
    services: list[str] | None = None
    impact_metrics: strawberry.scalars.JSON | None = None


@strawberry.input
class AddMilestoneInput:
    """Input type for adding a milestone to a project."""

    title: str
    date: date
    milestone_type: str = "milestone"


# Import after class definitions to avoid circular import at module level
from app.graphql.types.user import UserType  # noqa: E402
