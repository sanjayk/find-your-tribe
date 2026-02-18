"""Auth mutations — signup, login, token refresh, logout, and onboarding."""

import strawberry
from strawberry.types import Info

from app.graphql.context import Context
from app.graphql.helpers import require_auth
from app.graphql.types.auth import AuthPayload
from app.graphql.types.user import UserType
from app.services import auth_service


def _to_auth_payload(data: dict) -> AuthPayload:
    """Convert auth_service result dict to an AuthPayload GraphQL type."""
    return AuthPayload(
        access_token=data["access_token"],
        refresh_token=data["refresh_token"],
        user=UserType.from_model(data["user"]),
    )


@strawberry.type
class AuthMutations:
    """Authentication and onboarding mutations."""

    @strawberry.mutation
    async def signup(
        self,
        info: Info[Context, None],
        email: str,
        password: str,
        username: str,
        display_name: str,
    ) -> AuthPayload:
        """Register a new user account."""
        session = info.context.session
        result = await auth_service.signup(session, email, password, username, display_name)
        return _to_auth_payload(result)

    @strawberry.mutation
    async def login(
        self,
        info: Info[Context, None],
        email: str,
        password: str,
    ) -> AuthPayload:
        """Authenticate with email and password."""
        session = info.context.session
        result = await auth_service.login(session, email, password)
        return _to_auth_payload(result)

    @strawberry.mutation
    async def refresh_token(
        self,
        info: Info[Context, None],
        token: str,
    ) -> AuthPayload:
        """Exchange a refresh token for a new token pair."""
        session = info.context.session
        result = await auth_service.refresh_token(session, token)
        return _to_auth_payload(result)

    @strawberry.mutation
    async def logout(
        self,
        info: Info[Context, None],
        token: str,
    ) -> bool:
        """Revoke a refresh token."""
        session = info.context.session
        await auth_service.logout(session, token)
        return True

    @strawberry.mutation
    async def complete_onboarding(
        self,
        info: Info[Context, None],
        display_name: str,
        headline: str | None = None,
        primary_role: str | None = None,
        timezone: str | None = None,
        availability_status: str | None = None,
        skill_ids: list[strawberry.ID] | None = None,
    ) -> UserType:
        """Complete user onboarding by setting profile fields and skills."""
        user_id = require_auth(info)
        session = info.context.session
        user = await auth_service.complete_onboarding(
            session,
            user_id=user_id,
            display_name=display_name,
            headline=headline,
            primary_role=primary_role,
            timezone_str=timezone,
            availability_status=availability_status,
            skill_ids=[str(sid) for sid in skill_ids] if skill_ids else None,
        )
        return UserType.from_model(user)
