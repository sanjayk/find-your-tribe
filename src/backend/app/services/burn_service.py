"""Burn service — CRUD and aggregation for BuildActivity (token burn records)."""

import datetime
from collections import defaultdict

from sqlalchemy import func, select
from sqlalchemy.dialects.postgresql import insert
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.build_activity import BuildActivity


async def log_session(
    session: AsyncSession,
    user_id: str,
    tokens_burned: int,
    source: str,
    project_id: str | None = None,
    activity_date: datetime.date | None = None,
) -> None:
    """Upsert a BuildActivity row for the given day.

    If a row already exists for (user_id, project_id, activity_date, source),
    tokens_burned is incremented. Otherwise a new row is inserted.

    Note: The unique constraint uq_build_activity_per_day covers
    (user_id, project_id, activity_date, source). PostgreSQL treats NULLs as
    distinct in unique constraints, so project_id=NULL rows use a separate
    partial-upsert path via WHERE clause.
    """
    target_date = activity_date or datetime.date.today()

    stmt = (
        insert(BuildActivity)
        .values(
            user_id=user_id,
            project_id=project_id,
            activity_date=target_date,
            tokens_burned=tokens_burned,
            source=source,
        )
        .on_conflict_do_update(
            constraint="uq_build_activity_per_day",
            set_={"tokens_burned": BuildActivity.tokens_burned + tokens_burned},
        )
    )
    await session.execute(stmt)


async def get_summary(
    session: AsyncSession,
    user_id: str,
    weeks: int = 52,
) -> dict:
    """Return burn summary for a user over the specified number of weeks.

    Returns a dict with:
      - days_active: number of calendar days with any activity
      - total_tokens: sum of all tokens burned
      - active_weeks: number of ISO weeks with any activity
      - total_weeks: number of calendar weeks in the window
      - weekly_streak: consecutive active weeks counting back from most recent activity
      - daily_activity: list of {date, tokens} dicts sorted ascending
    """
    cutoff = datetime.date.today() - datetime.timedelta(weeks=weeks)

    stmt = (
        select(
            BuildActivity.activity_date,
            func.sum(BuildActivity.tokens_burned).label("tokens"),
        )
        .where(
            BuildActivity.user_id == user_id,
            BuildActivity.activity_date >= cutoff,
        )
        .group_by(BuildActivity.activity_date)
        .order_by(BuildActivity.activity_date)
    )
    result = await session.execute(stmt)
    rows = result.all()

    if not rows:
        return {
            "days_active": 0,
            "total_tokens": 0,
            "active_weeks": 0,
            "total_weeks": weeks,
            "weekly_streak": 0,
            "daily_activity": [],
        }

    daily_activity = [{"date": row.activity_date, "tokens": int(row.tokens)} for row in rows]
    total_tokens = sum(d["tokens"] for d in daily_activity)
    days_active = len(daily_activity)

    # Group by ISO (year, week) to calculate active_weeks
    active_week_set: set[tuple[int, int]] = set()
    for d in daily_activity:
        iso = d["date"].isocalendar()
        active_week_set.add((iso[0], iso[1]))
    active_weeks = len(active_week_set)

    # weekly_streak: consecutive active weeks ending at the most recent active week
    if active_week_set:
        # Build ordered list of (year, week) tuples present in data
        sorted_weeks = sorted(active_week_set)
        # Walk backwards from the last active week counting consecutive weeks
        streak = 1
        for i in range(len(sorted_weeks) - 1, 0, -1):
            cur_year, cur_week = sorted_weeks[i]
            prev_year, prev_week = sorted_weeks[i - 1]
            # Check if prev week is immediately before cur week
            cur_date = datetime.date.fromisocalendar(cur_year, cur_week, 1)
            expected_prev = cur_date - datetime.timedelta(weeks=1)
            expected_prev_iso = expected_prev.isocalendar()
            if (prev_year, prev_week) == (expected_prev_iso[0], expected_prev_iso[1]):
                streak += 1
            else:
                break
    else:
        streak = 0

    return {
        "days_active": days_active,
        "total_tokens": total_tokens,
        "active_weeks": active_weeks,
        "total_weeks": weeks,
        "weekly_streak": streak,
        "daily_activity": daily_activity,
    }


async def get_receipt(
    session: AsyncSession,
    user_id: str,
    project_id: str,
) -> dict | None:
    """Return burn receipt for a specific project.

    Returns a dict with:
      - project_id
      - total_tokens: sum of all tokens burned on this project
      - duration_weeks: calendar weeks from first to last activity (inclusive)
      - peak_week_tokens: highest single-week token total
      - daily_activity: list of {date, tokens} dicts sorted ascending

    Returns None if there is no activity for this project.
    """
    stmt = (
        select(
            BuildActivity.activity_date,
            func.sum(BuildActivity.tokens_burned).label("tokens"),
        )
        .where(
            BuildActivity.user_id == user_id,
            BuildActivity.project_id == project_id,
        )
        .group_by(BuildActivity.activity_date)
        .order_by(BuildActivity.activity_date)
    )
    result = await session.execute(stmt)
    rows = result.all()

    if not rows:
        return None

    daily_activity = [{"date": row.activity_date, "tokens": int(row.tokens)} for row in rows]
    total_tokens = sum(d["tokens"] for d in daily_activity)

    first_date = daily_activity[0]["date"]
    last_date = daily_activity[-1]["date"]
    # duration_weeks: number of calendar weeks from first to last activity, minimum 1
    delta_days = (last_date - first_date).days
    duration_weeks = max(1, (delta_days // 7) + 1)

    # Aggregate tokens by ISO week to find peak week
    weekly_tokens: dict[tuple[int, int], int] = defaultdict(int)
    for d in daily_activity:
        iso = d["date"].isocalendar()
        weekly_tokens[(iso[0], iso[1])] += d["tokens"]

    peak_week_tokens = max(weekly_tokens.values()) if weekly_tokens else 0

    return {
        "project_id": project_id,
        "total_tokens": total_tokens,
        "duration_weeks": duration_weeks,
        "peak_week_tokens": peak_week_tokens,
        "daily_activity": daily_activity,
    }


_UNSET = object()


async def update_burn(
    session: AsyncSession,
    burn_id: str,
    user_id: str,
    tokens_burned: int | None = None,
    source: str | None = None,
    project_id: object = _UNSET,
) -> dict | None:
    """Update a specific BuildActivity record. Returns updated dict or None if not found.

    Only the owning user can update their own burn records.
    Uses a sentinel for project_id so None explicitly clears the field.
    """
    stmt = select(BuildActivity).where(
        BuildActivity.id == burn_id,
        BuildActivity.user_id == user_id,
    )
    result = await session.execute(stmt)
    record = result.scalar_one_or_none()
    if record is None:
        return None

    if tokens_burned is not None:
        record.tokens_burned = tokens_burned
    if source is not None:
        record.source = source
    if project_id is not _UNSET:
        record.project_id = project_id

    await session.commit()
    await session.refresh(record)
    return {
        "id": record.id,
        "user_id": record.user_id,
        "project_id": record.project_id,
        "activity_date": record.activity_date,
        "tokens_burned": record.tokens_burned,
        "source": record.source,
    }


async def delete_burn(
    session: AsyncSession,
    burn_id: str,
    user_id: str,
) -> bool:
    """Delete a specific BuildActivity record. Returns True if deleted, False if not found."""
    stmt = select(BuildActivity).where(
        BuildActivity.id == burn_id,
        BuildActivity.user_id == user_id,
    )
    result = await session.execute(stmt)
    record = result.scalar_one_or_none()
    if record is None:
        return False

    await session.delete(record)
    await session.commit()
    return True
