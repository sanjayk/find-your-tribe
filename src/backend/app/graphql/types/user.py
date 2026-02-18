"""Strawberry GraphQL type for User model."""

from datetime import datetime
from typing import TYPE_CHECKING

import strawberry

from app.models.enums import AgentWorkflowStyle, AvailabilityStatus, UserRole

if TYPE_CHECKING:
    from app.graphql.types.project import ProjectType
    from app.graphql.types.skill import SkillType
    from app.graphql.types.tribe import TribeType
    from app.models.user import User


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
    agent_tools: list[str]
    agent_workflow_style: AgentWorkflowStyle | None
    human_agent_ratio: float | None
    created_at: datetime

    _skills: strawberry.Private[list]
    _owned_projects: strawberry.Private[list]
    _tribes: strawberry.Private[list]

    @strawberry.field
    def skills(self) -> list["SkillType"]:
        """Lazy resolver for user skills."""
        return self._skills  # type: ignore[return-value]

    @strawberry.field
    def projects(self) -> list["ProjectType"]:
        """Lazy resolver for user projects."""
        return self._owned_projects  # type: ignore[return-value]

    @strawberry.field
    def owned_projects(self) -> list["ProjectType"]:
        """Lazy resolver for owned projects (alias for projects)."""
        return self._owned_projects  # type: ignore[return-value]

    @strawberry.field
    def tribes(self) -> list["TribeType"]:
        """Lazy resolver for tribes."""
        return self._tribes  # type: ignore[return-value]

    @classmethod
    def from_model(
        cls,
        user: "User",
        skills: "list | None" = None,
        projects: "list | None" = None,
        tribes: "list | None" = None,
        collab_info: "dict | None" = None,
    ) -> "UserType":
        """Create UserType from User model with optional relationships."""
        from app.graphql.types.project import ProjectType
        from app.graphql.types.skill import SkillType
        from app.graphql.types.tribe import TribeType

        _collab_info = collab_info or {}
        skills_types = [SkillType.from_model(s) for s in (skills or [])]
        projects_types = [
            ProjectType.from_model(
                p,
                owner=user,
                collaborators=p.collaborators if hasattr(p, "collaborators") else None,
                collab_details=_collab_info.get(p.id, {}),
            )
            for p in (projects or [])
        ]
        tribes_types = [TribeType.from_model(t) for t in (tribes or [])]

        return cls(
            id=user.id,
            email=user.email,
            username=user.username,
            display_name=user.display_name,
            avatar_url=user.avatar_url,
            headline=user.headline,
            primary_role=user.primary_role,
            timezone=user.timezone,
            availability_status=user.availability_status,
            builder_score=user.builder_score,
            bio=user.bio,
            contact_links=user.contact_links,
            github_username=user.github_username,
            onboarding_completed=user.onboarding_completed,
            agent_tools=user.agent_tools,
            agent_workflow_style=user.agent_workflow_style,
            human_agent_ratio=user.human_agent_ratio,
            created_at=user.created_at,
            _skills=skills_types,
            _owned_projects=projects_types,
            _tribes=tribes_types,
        )


# Import after class definitions to avoid circular import at module level
from app.graphql.types.project import ProjectType  # noqa: E402
from app.graphql.types.skill import SkillType  # noqa: E402, F811
from app.graphql.types.tribe import TribeType  # noqa: E402
