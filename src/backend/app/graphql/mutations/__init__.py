"""GraphQL mutations module — composed from all domain mutation classes."""

import strawberry

from app.graphql.mutations.auth import AuthMutations
from app.graphql.mutations.burn import BurnMutations
from app.graphql.mutations.feed import FeedMutations
from app.graphql.mutations.profile import ProfileMutations
from app.graphql.mutations.projects import ProjectMutations
from app.graphql.mutations.tribes import TribeMutations


@strawberry.type
class Mutation:
    """GraphQL Mutation type — namespaced by domain."""

    @strawberry.field
    def auth(self) -> AuthMutations:
        return AuthMutations()

    @strawberry.field
    def profile(self) -> ProfileMutations:
        return ProfileMutations()

    @strawberry.field
    def projects(self) -> ProjectMutations:
        return ProjectMutations()

    @strawberry.field
    def burn(self) -> BurnMutations:
        return BurnMutations()

    @strawberry.field
    def tribes(self) -> TribeMutations:
        return TribeMutations()

    @strawberry.field
    def feed(self) -> FeedMutations:
        return FeedMutations()


__all__ = ["Mutation"]
