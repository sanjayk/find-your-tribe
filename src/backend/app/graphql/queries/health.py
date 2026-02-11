"""Health check query for GraphQL API."""

import strawberry
from sqlalchemy import text
from strawberry.types import Info

from app.graphql.context import Context


@strawberry.type
class Query:
    """GraphQL Query type containing health check."""

    @strawberry.field
    async def health(self, info: Info[Context, None]) -> str:
        """
        Health check endpoint that verifies database connectivity.

        Executes a simple SELECT 1 query to ensure the database is reachable
        and responsive. Returns 'ok' if the database connection is healthy.

        Args:
            info: Strawberry Info object containing the GraphQL context.

        Returns:
            str: 'ok' if database is connected and healthy.

        Raises:
            Exception: If database connection fails or query cannot be executed.
        """
        # Get the session from the context
        session = info.context.session

        # Execute SELECT 1 to verify database connectivity
        await session.execute(text("SELECT 1"))

        return "ok"
