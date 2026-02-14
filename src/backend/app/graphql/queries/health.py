"""GraphQL queries for health check and builder profiles."""

import strawberry
from sqlalchemy import select, text
from sqlalchemy.orm import selectinload
from strawberry.types import Info

from app.graphql.context import Context
from app.graphql.types.user import UserType
from app.models.project import Project
from app.models.tribe import Tribe
from app.models.user import User


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
