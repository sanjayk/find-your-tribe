"""GraphQL queries for health check, builder profiles, projects, tribes, and feed."""

import strawberry
from sqlalchemy import select, text
from sqlalchemy.orm import selectinload
from strawberry.types import Info

from app.graphql.context import Context
from app.graphql.types.burn import BurnDayType as _BurnDayType
from app.graphql.types.burn import BurnReceiptType, BurnSummaryType
from app.graphql.types.feed_event import FeedEventType
from app.graphql.types.project import ProjectType
from app.graphql.types.tribe import TribeType
from app.graphql.types.user import UserType
from app.models.enums import ProjectStatus, TribeStatus
from app.models.feed_event import FeedEvent
from app.models.project import Project, project_collaborators
from app.models.tribe import Tribe
from app.models.user import User
from app.services import burn_service, project_service, tribe_service


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

        # Load collaborator role/status from association table
        collab_info: dict[str, dict[str, dict]] = {}
        project_ids = [p.id for p in user.owned_projects]
        if project_ids:
            collab_stmt = (
                select(
                    project_collaborators.c.project_id,
                    project_collaborators.c.user_id,
                    project_collaborators.c.role,
                    project_collaborators.c.status,
                )
                .where(project_collaborators.c.project_id.in_(project_ids))
            )
            collab_rows = (await session.execute(collab_stmt)).fetchall()
            for row in collab_rows:
                collab_info.setdefault(row.project_id, {})[row.user_id] = {
                    "role": row.role,
                    "status": row.status,
                }

        return UserType.from_model(
            user,
            skills=user.skills,
            projects=user.owned_projects,
            tribes=user.tribes,
            collab_info=collab_info,
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

    @strawberry.field
    async def project(
        self,
        info: Info[Context, None],
        id: strawberry.ID,
    ) -> ProjectType | None:
        """Fetch a single project by ID with owner and collaborators."""
        session = info.context.session
        proj = await project_service.get_with_details(session, str(id))
        if proj is None:
            return None

        # Load collaborator details from the association table
        collab_details: dict[str, dict] = {}
        if proj.collaborators:
            collab_stmt = select(
                project_collaborators.c.user_id,
                project_collaborators.c.role,
                project_collaborators.c.status,
            ).where(project_collaborators.c.project_id == proj.id)
            collab_rows = (await session.execute(collab_stmt)).fetchall()
            for row in collab_rows:
                collab_details[row.user_id] = {
                    "role": row.role,
                    "status": row.status,
                }

        return ProjectType.from_model(
            proj,
            owner=proj.owner,
            collaborators=proj.collaborators,
            collab_details=collab_details,
        )

    @strawberry.field
    async def projects(
        self,
        info: Info[Context, None],
        limit: int = 20,
        offset: int = 0,
        status: str | None = None,
    ) -> list[ProjectType]:
        """Paginated list of projects, optionally filtered by status."""
        session = info.context.session
        stmt = (
            select(Project)
            .options(
                selectinload(Project.owner),
                selectinload(Project.collaborators),
            )
            .order_by(Project.updated_at.desc())
            .limit(limit)
            .offset(offset)
        )
        if status is not None:
            stmt = stmt.where(Project.status == ProjectStatus(status))

        result = await session.execute(stmt)
        project_list = result.scalars().all()

        # Batch-load collaborator details for all returned projects
        all_project_ids = [p.id for p in project_list]
        collab_info: dict[str, dict[str, dict]] = {}
        if all_project_ids:
            collab_stmt = select(
                project_collaborators.c.project_id,
                project_collaborators.c.user_id,
                project_collaborators.c.role,
                project_collaborators.c.status,
            ).where(project_collaborators.c.project_id.in_(all_project_ids))
            collab_rows = (await session.execute(collab_stmt)).fetchall()
            for row in collab_rows:
                collab_info.setdefault(row.project_id, {})[row.user_id] = {
                    "role": row.role,
                    "status": row.status,
                }

        return [
            ProjectType.from_model(
                p,
                owner=p.owner,
                collaborators=p.collaborators,
                collab_details=collab_info.get(p.id),
            )
            for p in project_list
        ]

    @strawberry.field
    async def tribe(
        self,
        info: Info[Context, None],
        id: strawberry.ID,
    ) -> TribeType | None:
        """Fetch a single tribe by ID with owner, members, and open roles."""
        session = info.context.session
        t = await tribe_service.get_with_details(session, str(id))
        if t is None:
            return None
        return TribeType.from_model(t)

    @strawberry.field
    async def tribes(
        self,
        info: Info[Context, None],
        limit: int = 20,
        offset: int = 0,
        status: str | None = None,
    ) -> list[TribeType]:
        """Paginated list of tribes, optionally filtered by status."""
        session = info.context.session
        stmt = (
            select(Tribe)
            .options(
                selectinload(Tribe.owner),
                selectinload(Tribe.members),
                selectinload(Tribe.open_roles),
            )
            .order_by(Tribe.updated_at.desc())
            .limit(limit)
            .offset(offset)
        )
        if status is not None:
            stmt = stmt.where(Tribe.status == TribeStatus(status))

        result = await session.execute(stmt)
        tribe_list = result.scalars().all()
        return [TribeType.from_model(t) for t in tribe_list]

    @strawberry.field
    async def feed(
        self,
        info: Info[Context, None],
        limit: int = 20,
        offset: int = 0,
    ) -> list[FeedEventType]:
        """Paginated feed of events, newest first."""
        session = info.context.session
        stmt = (
            select(FeedEvent)
            .order_by(FeedEvent.created_at.desc())
            .limit(limit)
            .offset(offset)
        )
        result = await session.execute(stmt)
        events = result.scalars().all()
        return [
            FeedEventType(
                id=event.id,
                event_type=event.event_type,
                target_type=event.target_type,
                target_id=event.target_id,
                metadata=event.event_metadata,
                created_at=event.created_at,
            )
            for event in events
        ]
