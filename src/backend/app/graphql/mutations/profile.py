"""GraphQL mutations for user profile management."""

import strawberry
from strawberry.types import Info

from app.graphql.context import Context
from app.graphql.helpers import require_auth
from app.graphql.types.user import UserType
from app.services import user_service


@strawberry.type
class ProfileMutations:
    """Mutations for managing user profiles."""

    @strawberry.mutation
    async def update_profile(
        self,
        info: Info[Context, None],
        display_name: str | None = None,
        headline: str | None = None,
        bio: str | None = None,
        primary_role: str | None = None,
        timezone: str | None = None,
        availability_status: str | None = None,
        contact_links: strawberry.scalars.JSON | None = None,
        agent_tools: strawberry.scalars.JSON | None = None,
        agent_workflow_style: str | None = None,
        human_agent_ratio: float | None = None,
        preferences: strawberry.scalars.JSON | None = None,
    ) -> UserType:
        """Update the authenticated user's profile fields."""
        user_id = require_auth(info)
        session = info.context.session
        user = await user_service.update_profile(
            session,
            user_id,
            display_name=display_name,
            headline=headline,
            bio=bio,
            primary_role=primary_role,
            timezone=timezone,
            availability_status=availability_status,
            contact_links=contact_links,
            agent_tools=agent_tools,
            agent_workflow_style=agent_workflow_style,
            human_agent_ratio=human_agent_ratio,
            preferences=preferences,
        )
        return UserType.from_model(user)

    @strawberry.mutation
    async def add_skill(
        self,
        info: Info[Context, None],
        skill_id: strawberry.ID,
    ) -> UserType:
        """Add a skill to the authenticated user's profile."""
        user_id = require_auth(info)
        session = info.context.session
        await user_service.add_skill(session, user_id, str(skill_id))
        user = await user_service.get_by_id_with_skills(session, user_id)
        return UserType.from_model(user, skills=user.skills)

    @strawberry.mutation
    async def remove_skill(
        self,
        info: Info[Context, None],
        skill_id: strawberry.ID,
    ) -> UserType:
        """Remove a skill from the authenticated user's profile."""
        user_id = require_auth(info)
        session = info.context.session
        await user_service.remove_skill(session, user_id, str(skill_id))
        user = await user_service.get_by_id_with_skills(session, user_id)
        return UserType.from_model(user, skills=user.skills)
