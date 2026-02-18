"""GraphQL helper utilities for authentication and authorization."""

from strawberry.types import Info

from app.graphql.context import Context


class AuthError(Exception):
    """Raised when authentication or authorization fails."""

    def __init__(self, message: str = "Authentication required", code: str = "UNAUTHORIZED"):
        self.message = message
        self.code = code
        super().__init__(message)


def require_auth(info: Info[Context, None]) -> str:
    """Extract and validate the authenticated user ID from context.

    Returns the current_user_id string.
    Raises AuthError if not authenticated.
    """
    user_id = info.context.current_user_id
    if not user_id:
        raise AuthError("Authentication required")
    return user_id
