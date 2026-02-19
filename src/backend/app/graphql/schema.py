"""GraphQL schema combining queries and mutations."""

import strawberry
from strawberry.types import Info

from app.graphql.context import Context
from app.graphql.mutations import Mutation as BaseMutation
from app.graphql.mutations.api_token import (
    ApiTokenInfo,
    ApiTokenMutations,
    resolve_my_api_tokens,
)
from app.graphql.queries import Query as BaseQuery


@strawberry.type
class Query(BaseQuery):
    """GraphQL Query type — extends base queries with API token queries."""

    @strawberry.field
    async def my_api_tokens(self, info: Info[Context, None]) -> list[ApiTokenInfo]:
        """List non-revoked API tokens for the authenticated user, newest first."""
        return await resolve_my_api_tokens(info)


@strawberry.type
class Mutation(BaseMutation):
    """GraphQL Mutation type — extends base mutations with API token mutations."""

    @strawberry.field
    def api_tokens(self) -> ApiTokenMutations:
        return ApiTokenMutations()


schema = strawberry.Schema(query=Query, mutation=Mutation)

__all__ = ["schema"]
