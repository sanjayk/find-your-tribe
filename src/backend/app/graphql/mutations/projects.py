"""GraphQL mutations for the Projects domain."""

import strawberry
from strawberry.types import Info

from app.graphql.context import Context
from app.graphql.helpers import require_auth
from app.graphql.types.project import (
    AddMilestoneInput,
    CollaboratorType,
    CreateProjectInput,
    ProjectMilestoneGQLType,
    ProjectType,
    UpdateProjectInput,
)
from app.graphql.types.user import UserType
from app.models.user import User
from app.services import project_service


@strawberry.type
class ProjectMutations:
    """Mutations for creating, updating, and managing projects and collaborators."""

    @strawberry.mutation
    async def create_project(
        self,
        info: Info[Context, None],
        input: CreateProjectInput,
    ) -> ProjectType:
        """Create a new project owned by the authenticated user."""
        user_id = require_auth(info)
        session = info.context.session
        project = await project_service.create(
            session,
            owner_id=user_id,
            title=input.title,
            description=input.description,
            status=input.status,
            role=input.role,
            links=input.links,
        )
        return ProjectType.from_model(project)

    @strawberry.mutation
    async def update_project(
        self,
        info: Info[Context, None],
        id: strawberry.ID,
        input: UpdateProjectInput,
    ) -> ProjectType:
        """Update an existing project. Only the owner may update."""
        user_id = require_auth(info)
        session = info.context.session
        project, _shipped = await project_service.update(
            session,
            project_id=str(id),
            user_id=user_id,
            title=input.title,
            description=input.description,
            status=input.status,
            role=input.role,
            links=input.links,
            tech_stack=input.tech_stack,
            impact_metrics=input.impact_metrics,
            domains=input.domains,
            ai_tools=input.ai_tools,
            build_style=input.build_style,
            services=input.services,
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
    async def add_milestone(
        self,
        info: Info[Context, None],
        project_id: strawberry.ID,
        input: AddMilestoneInput,
    ) -> ProjectMilestoneGQLType:
        """Add a milestone to a project. Only the owner may add milestones."""
        user_id = require_auth(info)
        session = info.context.session
        milestone = await project_service.add_milestone(
            session,
            project_id=str(project_id),
            user_id=user_id,
            title=input.title,
            date_=input.date,
            milestone_type=input.milestone_type,
        )
        return ProjectMilestoneGQLType.from_model(milestone)

    @strawberry.mutation
    async def delete_milestone(
        self,
        info: Info[Context, None],
        milestone_id: strawberry.ID,
    ) -> bool:
        """Delete a project milestone. Only the project owner may delete."""
        user_id = require_auth(info)
        session = info.context.session
        await project_service.delete_milestone(
            session,
            milestone_id=str(milestone_id),
            user_id=user_id,
        )
        return True

    @strawberry.mutation
    async def invite_collaborator(
        self,
        info: Info[Context, None],
        project_id: strawberry.ID,
        user_id: strawberry.ID,
        role: str | None = None,
    ) -> CollaboratorType:
        """Invite a user to collaborate on a project. Only the owner may invite."""
        current_user_id = require_auth(info)
        session = info.context.session
        result = await project_service.invite_collaborator(
            session,
            project_id=str(project_id),
            user_id=str(user_id),
            inviter_id=current_user_id,
            role=role,
        )
        invited_user = await session.get(User, str(user_id))
        return CollaboratorType(
            user=UserType.from_model(invited_user),
            role=result["role"],
            status=result["status"],
            invited_at=result["invited_at"],
            confirmed_at=None,
        )

    @strawberry.mutation
    async def confirm_collaboration(
        self,
        info: Info[Context, None],
        project_id: strawberry.ID,
    ) -> CollaboratorType:
        """Confirm a pending collaboration invitation."""
        user_id = require_auth(info)
        session = info.context.session
        result = await project_service.confirm_collaboration(
            session,
            project_id=str(project_id),
            user_id=user_id,
        )
        confirmed_user = await session.get(User, user_id)
        return CollaboratorType(
            user=UserType.from_model(confirmed_user),
            role=result["role"],
            status=result["status"],
            invited_at=result["invited_at"],
            confirmed_at=result.get("confirmed_at"),
        )

    @strawberry.mutation
    async def decline_collaboration(
        self,
        info: Info[Context, None],
        project_id: strawberry.ID,
    ) -> bool:
        """Decline a pending collaboration invitation."""
        user_id = require_auth(info)
        session = info.context.session
        await project_service.decline_collaboration(
            session, project_id=str(project_id), user_id=user_id
        )
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

    @strawberry.mutation
    async def generate_invite_link(
        self,
        info: Info[Context, None],
        project_id: strawberry.ID,
        role: str | None = None,
    ) -> str:
        """Generate a shareable invite link for a project."""
        user_id = require_auth(info)
        session = info.context.session
        token = await project_service.create_invite_token(
            session,
            project_id=str(project_id),
            inviter_id=user_id,
            role=role,
        )
        return f"https://findyourtribe.dev/invite/{token}"

    @strawberry.mutation
    async def redeem_invite_token(
        self,
        info: Info[Context, None],
        token: str,
    ) -> CollaboratorType:
        """Redeem an invite token to join a project as a pending collaborator."""
        user_id = require_auth(info)
        session = info.context.session
        result = await project_service.redeem_invite_token(
            session,
            token=token,
            user_id=user_id,
        )
        redeemed_user = await session.get(User, user_id)
        return CollaboratorType(
            user=UserType.from_model(redeemed_user),
            role=result["role"],
            status=result["status"],
            invited_at=result["invited_at"],
            confirmed_at=None,
        )
