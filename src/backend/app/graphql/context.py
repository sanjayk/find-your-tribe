"""GraphQL context for Strawberry GraphQL integration with FastAPI."""

from fastapi import Depends, Request
from sqlalchemy.ext.asyncio import AsyncSession
from strawberry.fastapi import BaseContext

from app.db import get_session


class Context(BaseContext):
    """GraphQL context containing database session and user information."""

    def __init__(self, session: AsyncSession, current_user_id: str | None = None):
        super().__init__()
        self.session = session
        self.current_user_id = current_user_id


async def context_getter(
    request: Request,
    session: AsyncSession = Depends(get_session),  # noqa: B008
) -> Context:
    """Context getter for Strawberry GraphQL Router."""
    return Context(session=session, current_user_id=None)
