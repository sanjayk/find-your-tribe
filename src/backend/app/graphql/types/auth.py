"""Strawberry GraphQL types for authentication payloads."""

import strawberry

from app.graphql.types.user import UserType


@strawberry.type
class AuthPayload:
    """Payload returned by signup, login, and token refresh mutations."""

    access_token: str
    refresh_token: str
    user: UserType
