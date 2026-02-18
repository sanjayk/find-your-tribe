"""GraphQL mutations for the Projects domain."""

import strawberry
from strawberry.types import Info

from app.graphql.context import Context
from app.graphql.helpers import require_auth
from app.graphql.types.project import ProjectType
from app.services import project_service


@strawberry.type
class ProjectMutations:
    """Mutations for creating, updating, and managing projects and collaborators."""

    @strawberry.mutation
    async def create_project(
        self,
        info: Info[Context, None],
        title: str,
        description: str | None = None,
        status: str | None = None,
        role: str | None = None,
        links: strawberry.scalars.JSON | None = None,
        tech_stack: list[str] | None = None,
        impact_metrics: strawberry.scalars.JSON | None = None,
    ) -> ProjectType:
        """Create a new project owned by the authenticated user."""
        user_id = require_auth(info)
        session = info.context.session
        project = await project_service.create(
            session,
            owner_id=user_id,
            title=title,
            description=description,
            status=status,
            role=role,
            links=links,
            tech_stack=tech_stack,
            impact_metrics=impact_metrics,
        )
        return ProjectType.from_model(project)

    @strawberry.mutation
    async def update_project(
        self,
        info: Info[Context, None],
        id: strawberry.ID,
        title: str | None = None,
        description: str | None = None,
        status: str | None = None,
        role: str | None = None,
        links: strawberry.scalars.JSON | None = None,
        tech_stack: list[str] | None = None,
        impact_metrics: strawberry.scalars.JSON | None = None,
    ) -> ProjectType:
        """Update an existing project. Only the owner may update."""
        user_id = require_auth(info)
        session = info.context.session
        project, _shipped = await project_service.update(
            session,
            project_id=str(id),
            user_id=user_id,
            title=title,
            description=description,
            status=status,
            role=role,
            links=links,
            tech_stack=tech_stack,
            impact_metrics=impact_metrics,
        )
        return ProjectType.from_model(project)

    @strawberry.mutation
    async def delete_project(
        self,
        info: Info[Context, None],
        id: strawberry.ID,
    ) -> bool:
        """Delete a project. Only the owner may delete."""
        user_id = require_auth(info)
        session = info.context.session
        await project_service.delete(session, project_id=str(id), user_id=user_id)
        return True

    @strawberry.mutation
    async def invite_collaborator(
        self,
        info: Info[Context, None],
        project_id: strawberry.ID,
        user_id: strawberry.ID,
        role: str | None = None,
    ) -> bool:
        """Invite a user to collaborate on a project. Only the owner may invite."""
        current_user_id = require_auth(info)
        session = info.context.session
        await project_service.invite_collaborator(
            session,
            project_id=str(project_id),
            user_id=str(user_id),
            inviter_id=current_user_id,
            role=role,
        )
        return True

    @strawberry.mutation
    async def confirm_collaboration(
        self,
        info: Info[Context, None],
        project_id: strawberry.ID,
    ) -> bool:
        """Confirm a pending collaboration invitation."""
        user_id = require_auth(info)
        session = info.context.session
        await project_service.confirm_collaboration(session, project_id=str(project_id), user_id=user_id)
        return True

    @strawberry.mutation
    async def decline_collaboration(
        self,
        info: Info[Context, None],
        project_id: strawberry.ID,
    ) -> bool:
        """Decline a pending collaboration invitation."""
        user_id = require_auth(info)
        session = info.context.session
        await project_service.decline_collaboration(session, project_id=str(project_id), user_id=user_id)
        return True

    @strawberry.mutation
    async def remove_collaborator(
        self,
        info: Info[Context, None],
        project_id: strawberry.ID,
        user_id: strawberry.ID,
    ) -> bool:
        """Remove a collaborator from a project. Only the owner may remove."""
        current_user_id = require_auth(info)
        session = info.context.session
        await project_service.remove_collaborator(
            session,
            project_id=str(project_id),
            collaborator_id=str(user_id),
            owner_id=current_user_id,
        )
        return True
