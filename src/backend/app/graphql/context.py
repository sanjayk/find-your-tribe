"""GraphQL context for Strawberry GraphQL integration with FastAPI."""

from dataclasses import dataclass

from fastapi import Depends, Request
from sqlalchemy.ext.asyncio import AsyncSession

from app.db import get_session


@dataclass
class Context:
    """
    GraphQL context containing database session and user information.

    Attributes:
        session: AsyncSession for database operations.
        current_user_id: Optional authenticated user ID (ULID string).
    """

    session: AsyncSession
    current_user_id: str | None = None


async def context_getter(
    request: Request,
    session: AsyncSession = Depends(get_session),
) -> Context:
    """
    Context getter function for Strawberry GraphQL Router.

    Extracts the database session from FastAPI dependency injection
    and creates a Context instance. In the future, this will also
    extract authentication information from the request.

    Args:
        request: FastAPI request object (for future auth extraction).
        session: AsyncSession injected via FastAPI dependency.

    Returns:
        Context: GraphQL context with session and optional user ID.
    """
    # Future: Extract current_user_id from request.state or JWT token
    # For now, current_user_id remains None (unauthenticated)
    return Context(session=session, current_user_id=None)
