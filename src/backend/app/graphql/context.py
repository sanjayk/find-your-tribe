"""GraphQL context for Strawberry GraphQL integration with FastAPI."""

import jwt
from fastapi import Depends, Request
from sqlalchemy.ext.asyncio import AsyncSession
from strawberry.fastapi import BaseContext

from app.config import settings
from app.db import get_session


class Context(BaseContext):
    """GraphQL context containing database session and user information."""

    def __init__(self, session: AsyncSession, current_user_id: str | None = None):
        super().__init__()
        self.session = session
        self.current_user_id = current_user_id


def _extract_user_id(request: Request) -> str | None:
    """Extract user ID from the Authorization Bearer token, if valid."""
    auth_header = request.headers.get("Authorization")
    if not auth_header or not auth_header.startswith("Bearer "):
        return None
    token = auth_header[7:]
    try:
        payload = jwt.decode(token, settings.secret_key, algorithms=[settings.jwt_algorithm])
        if payload.get("type") != "access":
            return None
        return payload.get("sub")
    except (jwt.InvalidTokenError, jwt.ExpiredSignatureError):
        return None


async def context_getter(
    request: Request,
    session: AsyncSession = Depends(get_session),  # noqa: B008
) -> Context:
    """Context getter for Strawberry GraphQL Router."""
    user_id = _extract_user_id(request)
    return Context(session=session, current_user_id=user_id)
