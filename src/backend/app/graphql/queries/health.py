"""GraphQL queries for health check and builder profiles."""

import strawberry
from sqlalchemy import select, text
from sqlalchemy.orm import selectinload
from strawberry.types import Info

from app.graphql.context import Context
from app.graphql.types.burn import BurnDayType as _BurnDayType
from app.graphql.types.burn import BurnReceiptType, BurnSummaryType
from app.graphql.types.user import UserType
from app.models.project import Project
from app.models.tribe import Tribe
from app.models.user import User
from app.services import burn_service


def _dict_to_burn_summary(data: dict) -> BurnSummaryType:
    """Convert a burn_service.get_summary dict to BurnSummaryType."""
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


def _dict_to_burn_receipt(data: dict) -> BurnReceiptType:
    """Convert a burn_service.get_receipt dict to BurnReceiptType."""
    return BurnReceiptType(
        project_id=strawberry.ID(data["project_id"]),
        total_tokens=data["total_tokens"],
        duration_weeks=data["duration_weeks"],
        peak_week_tokens=data["peak_week_tokens"],
        daily_activity=[
            _BurnDayType(date=d["date"], tokens=d["tokens"])
            for d in data["daily_activity"]
        ],
    )


@strawberry.type
class Query:
    """GraphQL Query type."""

    @strawberry.field
    async def health(self, info: Info[Context, None]) -> str:
        """Health check that verifies database connectivity."""
        session = info.context.session
        await session.execute(text("SELECT 1"))
        return "ok"

    @strawberry.field
    async def user(
        self, info: Info[Context, None], username: str
    ) -> UserType | None:
        """Fetch a single user by username with skills, projects, and tribes."""
        session = info.context.session
        stmt = (
            select(User)
            .where(User.username == username)
            .options(
                selectinload(User.skills),
                selectinload(User.owned_projects).selectinload(Project.collaborators),
                selectinload(User.tribes).options(
                    selectinload(Tribe.owner),
                    selectinload(Tribe.members),
                    selectinload(Tribe.open_roles),
                ),
            )
        )
        result = await session.execute(stmt)
        user = result.scalar_one_or_none()
        if user is None:
            return None
        return UserType.from_model(
            user,
            skills=user.skills,
            projects=user.owned_projects,
            tribes=user.tribes,
        )

    @strawberry.field
    async def builders(
        self,
        info: Info[Context, None],
        limit: int = 20,
        offset: int = 0,
    ) -> list[UserType]:
        """Paginated list of builders ordered by score descending."""
        session = info.context.session
        stmt = (
            select(User)
            .options(selectinload(User.skills))
            .order_by(User.builder_score.desc())
            .limit(limit)
            .offset(offset)
        )
        result = await session.execute(stmt)
        users = result.scalars().all()
        return [UserType.from_model(u, skills=u.skills) for u in users]

    @strawberry.field
    async def burn_summary(
        self,
        info: Info[Context, None],
        user_id: strawberry.ID,
        weeks: int = 52,
    ) -> BurnSummaryType | None:
        """Aggregated burn summary for a user over the specified number of weeks."""
        session = info.context.session
        data = await burn_service.get_summary(session, str(user_id), weeks=weeks)
        return _dict_to_burn_summary(data)

    @strawberry.field
    async def burn_receipt(
        self,
        info: Info[Context, None],
        user_id: strawberry.ID,
        project_id: strawberry.ID,
    ) -> BurnReceiptType | None:
        """Per-project burn receipt for a user."""
        session = info.context.session
        data = await burn_service.get_receipt(session, str(user_id), str(project_id))
        if data is None:
            return None
        return _dict_to_burn_receipt(data)
