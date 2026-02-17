"""GraphQL mutations module."""

import datetime

import strawberry
from strawberry.types import Info

from app.graphql.context import Context
from app.graphql.types.burn import BurnDayType as _BurnDayType
from app.graphql.types.burn import BurnSummaryType
from app.services import burn_service


def _dict_to_burn_summary(data: dict) -> BurnSummaryType:
    """Convert a burn_service dict to BurnSummaryType."""
    return BurnSummaryType(
        days_active=data["days_active"],
        total_tokens=data["total_tokens"],
        active_weeks=data["active_weeks"],
        total_weeks=data["total_weeks"],
        weekly_streak=data["weekly_streak"],
        daily_activity=[
            _BurnDayType(date=d["date"], tokens=d["tokens"])
            for d in data["daily_activity"]
        ],
    )


@strawberry.type
class Mutation:
    """GraphQL Mutation type."""

    @strawberry.field
    def _placeholder(self) -> str:
        """Placeholder field to satisfy Strawberry schema validation."""
        return "placeholder"

    @strawberry.mutation
    async def log_build_session(
        self,
        info: Info[Context, None],
        tokens_burned: int,
        source: str,
        project_id: strawberry.ID | None = None,
        activity_date: datetime.date | None = None,
    ) -> BurnSummaryType:
        """Log a build session's token burn and return updated burn summary."""
        session = info.context.session
        # TODO: replace "placeholder" with real user ID from auth context
        await burn_service.log_session(
            session,
            user_id="placeholder",
            tokens_burned=tokens_burned,
            source=source,
            project_id=str(project_id) if project_id else None,
            activity_date=activity_date,
        )
        await session.commit()
        data = await burn_service.get_summary(session, "placeholder")
        return _dict_to_burn_summary(data)


__all__ = ["Mutation"]
