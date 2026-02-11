"""GraphQL mutations module."""

import strawberry


@strawberry.type
class Mutation:
    """GraphQL Mutation type stub."""

    @strawberry.field
    def _placeholder(self) -> str:
        """Placeholder field to satisfy Strawberry schema validation."""
        return "placeholder"


__all__ = ["Mutation"]
