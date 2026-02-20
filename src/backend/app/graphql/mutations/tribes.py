"""GraphQL mutations for the Tribes domain."""

import strawberry
from strawberry.types import Info

from app.graphql.context import Context
from app.graphql.helpers import require_auth
from app.graphql.types.tribe import OpenRoleType, TribeType
from app.services import tribe_service


@strawberry.type
class TribeMutations:
    """Mutations for creating, updating, and managing tribes and membership."""

    @strawberry.mutation
    async def create_tribe(
        self,
        info: Info[Context, None],
        name: str,
        mission: str | None = None,
        max_members: int = 8,
    ) -> TribeType:
        """Create a new tribe owned by the authenticated user."""
        user_id = require_auth(info)
        session = info.context.session
        tribe = await tribe_service.create(
            session, owner_id=user_id, name=name, mission=mission, max_members=max_members,
        )
        tribe = await tribe_service.get_with_details(session, tribe.id)
        return TribeType.from_model(tribe)

    @strawberry.mutation
    async def update_tribe(
        self,
        info: Info[Context, None],
        id: strawberry.ID,
        name: str | None = None,
        mission: str | None = None,
        status: str | None = None,
        max_members: int | None = None,
    ) -> TribeType:
        """Update a tribe. Only the owner may update."""
        user_id = require_auth(info)
        session = info.context.session
        tribe = await tribe_service.update(
            session, tribe_id=str(id), user_id=user_id,
            name=name, mission=mission, status=status, max_members=max_members,
        )
        tribe = await tribe_service.get_with_details(session, tribe.id)
        return TribeType.from_model(tribe)

    @strawberry.mutation
    async def add_open_role(
        self,
        info: Info[Context, None],
        tribe_id: strawberry.ID,
        title: str,
        skills_needed: list[str] | None = None,
    ) -> OpenRoleType:
        """Add an open role to a tribe. Only the owner may add roles."""
        user_id = require_auth(info)
        session = info.context.session
        role = await tribe_service.add_open_role(
            session, tribe_id=str(tribe_id), user_id=user_id,
            title=title, skills_needed=skills_needed,
        )
        return OpenRoleType(
            id=role.id, title=role.title,
            skills_needed=role.skills_needed, filled=role.filled,
        )

    @strawberry.mutation
    async def remove_open_role(
        self,
        info: Info[Context, None],
        role_id: strawberry.ID,
    ) -> bool:
        """Remove an open role from a tribe. Only the owner may remove."""
        user_id = require_auth(info)
        session = info.context.session
        await tribe_service.remove_open_role(session, role_id=str(role_id), user_id=user_id)
        return True

    @strawberry.mutation
    async def request_to_join(
        self,
        info: Info[Context, None],
        tribe_id: strawberry.ID,
        role_id: strawberry.ID,
    ) -> bool:
        """Request to join a tribe for a specific open role."""
        user_id = require_auth(info)
        session = info.context.session
        await tribe_service.request_to_join(
            session, tribe_id=str(tribe_id), user_id=user_id, role_id=str(role_id),
        )
        return True

    @strawberry.mutation
    async def approve_member(
        self,
        info: Info[Context, None],
        tribe_id: strawberry.ID,
        member_id: strawberry.ID,
    ) -> bool:
        """Approve a pending tribe member. Only the owner may approve."""
        user_id = require_auth(info)
        session = info.context.session
        await tribe_service.approve_member(
            session, tribe_id=str(tribe_id), member_id=str(member_id), owner_id=user_id,
        )
        return True

    @strawberry.mutation
    async def reject_member(
        self,
        info: Info[Context, None],
        tribe_id: strawberry.ID,
        member_id: strawberry.ID,
    ) -> bool:
        """Reject a pending tribe member. Only the owner may reject."""
        user_id = require_auth(info)
        session = info.context.session
        await tribe_service.reject_member(
            session, tribe_id=str(tribe_id), member_id=str(member_id), owner_id=user_id,
        )
        return True

    @strawberry.mutation
    async def remove_member(
        self,
        info: Info[Context, None],
        tribe_id: strawberry.ID,
        member_id: strawberry.ID,
    ) -> bool:
        """Remove a member from a tribe. Only the owner may remove."""
        user_id = require_auth(info)
        session = info.context.session
        await tribe_service.remove_member(
            session, tribe_id=str(tribe_id), member_id=str(member_id), owner_id=user_id,
        )
        return True

    @strawberry.mutation
    async def leave_tribe(
        self,
        info: Info[Context, None],
        tribe_id: strawberry.ID,
    ) -> bool:
        """Leave a tribe. The owner cannot leave."""
        user_id = require_auth(info)
        session = info.context.session
        await tribe_service.leave(session, tribe_id=str(tribe_id), user_id=user_id)
        return True
