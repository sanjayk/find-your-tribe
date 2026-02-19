"""Burn ingest REST endpoints — plugin API for recording token burns."""

from datetime import date

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy import func, select
from sqlalchemy.dialects.postgresql import insert
from sqlalchemy.ext.asyncio import AsyncSession
from ulid import ULID

from app.api.auth_token import get_api_token_user
from app.db.engine import get_session
from app.models.build_activity import BuildActivity
from app.models.user import User
from app.services.project_resolution import resolve_project

router = APIRouter(tags=["burn"])


class BurnIngestRequest(BaseModel):
    tokens_burned: int = Field(gt=0)
    source: str
    verification: str
    tool: str | None = None
    activity_date: str | None = None
    session_id: str | None = None
    project_hint: str | None = None
    token_precision: str = "approximate"
    metadata: dict | None = None


class BurnIngestResponse(BaseModel):
    status: str = "ok"
    burn_id: str
    project_id: str | None
    project_matched: bool
    day_total: int


async def _get_day_total(
    session: AsyncSession, user_id: str, target_date: date
) -> int:
    """Sum all tokens burned by a user on a given date."""
    stmt = select(func.sum(BuildActivity.tokens_burned)).where(
        BuildActivity.user_id == user_id,
        BuildActivity.activity_date == target_date,
    )
    result = await session.execute(stmt)
    total = result.scalar_one_or_none()
    return int(total) if total else 0


@router.post("/ingest", response_model=BurnIngestResponse)
async def ingest_burn(
    body: BurnIngestRequest,
    user_id: str = Depends(get_api_token_user),  # noqa: B008
    session: AsyncSession = Depends(get_session),  # noqa: B008
) -> BurnIngestResponse:
    """Record a token burn from a plugin, returning cumulative day totals.

    Idempotent when session_id is provided — repeated calls with the same
    session_id return the existing record without creating duplicates.
    """
    # Idempotency: return existing record for known session_id
    if body.session_id:
        existing_stmt = select(BuildActivity).where(
            BuildActivity.session_id == body.session_id,
            BuildActivity.user_id == user_id,
        )
        result = await session.execute(existing_stmt)
        existing = result.scalar_one_or_none()
        if existing is not None:
            day_total = await _get_day_total(session, user_id, existing.activity_date)
            return BurnIngestResponse(
                burn_id=existing.id,
                project_id=existing.project_id,
                project_matched=existing.project_id is not None,
                day_total=day_total,
            )

    # Resolve project from hint
    project_id: str | None = None
    if body.project_hint:
        project_id = await resolve_project(session, user_id, body.project_hint)

    # Parse activity_date
    if body.activity_date:
        try:
            target_date = date.fromisoformat(body.activity_date)
        except ValueError:
            raise HTTPException(
                status_code=400,
                detail="Invalid activity_date format, expected YYYY-MM-DD",
            ) from None
    else:
        target_date = date.today()

    # Upsert BuildActivity — additive on tokens_burned for the same day/source
    new_id = str(ULID())
    stmt = (
        insert(BuildActivity)
        .values(
            id=new_id,
            user_id=user_id,
            project_id=project_id,
            activity_date=target_date,
            tokens_burned=body.tokens_burned,
            source=body.source,
            verification=body.verification,
            tool=body.tool,
            session_id=body.session_id,
            token_precision=body.token_precision,
            metadata_=body.metadata,
        )
        .on_conflict_do_update(
            constraint="uq_build_activity_per_day",
            set_={
                "tokens_burned": BuildActivity.tokens_burned + body.tokens_burned,
                "verification": body.verification,
                "tool": body.tool,
                "session_id": body.session_id,
                "token_precision": body.token_precision,
                "metadata": body.metadata,
            },
        )
        .returning(BuildActivity.id)
    )
    result = await session.execute(stmt)
    burn_id = result.scalar_one()
    await session.commit()

    day_total = await _get_day_total(session, user_id, target_date)

    return BurnIngestResponse(
        burn_id=burn_id,
        project_id=project_id,
        project_matched=project_id is not None,
        day_total=day_total,
    )


@router.get("/verify-token")
async def verify_token(
    user_id: str = Depends(get_api_token_user),  # noqa: B008
    session: AsyncSession = Depends(get_session),  # noqa: B008
) -> dict:
    """Verify an API token and return user info with recent burn history."""
    user_stmt = select(User).where(User.id == user_id)
    user = (await session.execute(user_stmt)).scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=401, detail="User not found")

    activities_stmt = (
        select(BuildActivity)
        .where(BuildActivity.user_id == user_id)
        .order_by(BuildActivity.activity_date.desc(), BuildActivity.created_at.desc())
        .limit(5)
    )
    result = await session.execute(activities_stmt)
    activities = result.scalars().all()

    recent_burns = [
        {
            "date": str(a.activity_date),
            "tokens": a.tokens_burned,
            "project": a.project_id,
            "verification": a.verification,
        }
        for a in activities
    ]

    return {
        "username": user.username,
        "display_name": user.display_name,
        "recent_burns": recent_burns,
    }
