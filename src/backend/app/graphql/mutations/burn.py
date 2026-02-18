"""Burn mutations — token burn CRUD (replaces old log_build_session)."""

import datetime

import strawberry
from strawberry.types import Info

from app.graphql.context import Context
from app.graphql.helpers import require_auth
from app.graphql.types.burn import BurnDayType, BurnSummaryType
from app.services import burn_service


def _dict_to_burn_summary(data: dict) -> BurnSummaryType:
    """Convert burn_service dict to BurnSummaryType."""
    return BurnSummaryType(
        days_active=data["days_active"],
        total_tokens=data["total_tokens"],
        active_weeks=data["active_weeks"],
        total_weeks=data["total_weeks"],
        weekly_streak=data["weekly_streak"],
        daily_activity=[
            BurnDayType(date=d["date"], tokens=d["tokens"])
            for d in data["daily_activity"]
        ],
    )


@strawberry.type
class BurnMutations:
    """Token burn CRUD mutations."""

    @strawberry.mutation
    async def record_burn(
        self,
        info: Info[Context, None],
        tokens_burned: int,
        source: str,
        project_id: strawberry.ID | None = None,
        activity_date: datetime.date | None = None,
    ) -> BurnSummaryType:
        """Record a token burn session and return updated summary."""
        user_id = require_auth(info)
        session = info.context.session
        await burn_service.log_session(
            session,
            user_id=user_id,
            tokens_burned=tokens_burned,
            source=source,
            project_id=str(project_id) if project_id else None,
            activity_date=activity_date,
        )
        await session.commit()
        data = await burn_service.get_summary(session, user_id)
        return _dict_to_burn_summary(data)

    @strawberry.mutation
    async def update_burn(
        self,
        info: Info[Context, None],
        id: strawberry.ID,
        tokens_burned: int | None = None,
        source: str | None = None,
    ) -> bool:
        """Update a specific burn record."""
        user_id = require_auth(info)
        session = info.context.session
        result = await burn_service.update_burn(
            session, burn_id=str(id), user_id=user_id,
            tokens_burned=tokens_burned, source=source,
        )
        return result is not None

    @strawberry.mutation
    async def delete_burn(
        self,
        info: Info[Context, None],
        id: strawberry.ID,
    ) -> bool:
        """Delete a specific burn record."""
        user_id = require_auth(info)
        session = info.context.session
        return await burn_service.delete_burn(session, burn_id=str(id), user_id=user_id)
