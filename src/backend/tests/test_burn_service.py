"""Unit tests for burn_service — get_summary and get_receipt logic."""

import datetime
from unittest.mock import AsyncMock, MagicMock

import pytest

from app.services import burn_service


def _make_row(date_str: str, tokens: int):
    """Create a mock SQLAlchemy result row."""
    row = MagicMock()
    row.activity_date = datetime.date.fromisoformat(date_str)
    row.tokens = tokens
    return row


def _mock_session(rows):
    """Return a mock AsyncSession whose execute() returns given rows."""
    mock_result = MagicMock()
    mock_result.all.return_value = rows
    session = AsyncMock()
    session.execute = AsyncMock(return_value=mock_result)
    return session


# ---------------------------------------------------------------------------
# get_summary
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_get_summary_empty():
    """Empty result set returns all-zero summary."""
    session = _mock_session([])
    result = await burn_service.get_summary(session, "user1")

    assert result["days_active"] == 0
    assert result["total_tokens"] == 0
    assert result["active_weeks"] == 0
    assert result["weekly_streak"] == 0
    assert result["daily_activity"] == []


@pytest.mark.asyncio
async def test_get_summary_single_day():
    """Single active day returns correct totals."""
    session = _mock_session([_make_row("2026-02-10", 5000)])
    result = await burn_service.get_summary(session, "user1")

    assert result["days_active"] == 1
    assert result["total_tokens"] == 5000
    assert result["active_weeks"] == 1
    assert result["weekly_streak"] == 1
    assert len(result["daily_activity"]) == 1
    assert result["daily_activity"][0]["tokens"] == 5000


@pytest.mark.asyncio
async def test_get_summary_multi_day_consecutive_weeks():
    """Two consecutive weeks produce streak=2 and active_weeks=2."""
    rows = [
        _make_row("2026-01-12", 1000),  # ISO week 3
        _make_row("2026-01-19", 2000),  # ISO week 4
    ]
    session = _mock_session(rows)
    result = await burn_service.get_summary(session, "user1")

    assert result["days_active"] == 2
    assert result["total_tokens"] == 3000
    assert result["active_weeks"] == 2
    assert result["weekly_streak"] == 2


@pytest.mark.asyncio
async def test_get_summary_non_consecutive_weeks():
    """Gap in weeks resets streak."""
    rows = [
        _make_row("2026-01-05", 1000),  # ISO week 2
        _make_row("2026-01-26", 2000),  # ISO week 5 (gap: weeks 3,4 missing)
    ]
    session = _mock_session(rows)
    result = await burn_service.get_summary(session, "user1")

    assert result["active_weeks"] == 2
    # Streak from the most recent end: only week 5 is alone at the tail
    assert result["weekly_streak"] == 1


@pytest.mark.asyncio
async def test_get_summary_multiple_days_same_week():
    """Multiple days in the same week count as one active week."""
    rows = [
        _make_row("2026-02-09", 1000),  # Mon ISO week 7
        _make_row("2026-02-11", 2000),  # Wed ISO week 7
        _make_row("2026-02-13", 3000),  # Fri ISO week 7
    ]
    session = _mock_session(rows)
    result = await burn_service.get_summary(session, "user1")

    assert result["days_active"] == 3
    assert result["total_tokens"] == 6000
    assert result["active_weeks"] == 1
    assert result["weekly_streak"] == 1


# ---------------------------------------------------------------------------
# get_receipt
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_get_receipt_none_when_no_activity():
    """Returns None when there is no activity for a project."""
    session = _mock_session([])
    result = await burn_service.get_receipt(session, "user1", "proj1")

    assert result is None


@pytest.mark.asyncio
async def test_get_receipt_single_day():
    """Single-day project: duration_weeks=1, peak_week=total."""
    session = _mock_session([_make_row("2026-02-10", 8000)])
    result = await burn_service.get_receipt(session, "user1", "proj1")

    assert result is not None
    assert result["project_id"] == "proj1"
    assert result["total_tokens"] == 8000
    assert result["duration_weeks"] == 1
    assert result["peak_week_tokens"] == 8000
    assert len(result["daily_activity"]) == 1


@pytest.mark.asyncio
async def test_get_receipt_multi_week():
    """Multi-week project: duration_weeks spans first to last day."""
    rows = [
        _make_row("2026-01-05", 3000),  # week 2
        _make_row("2026-01-12", 4000),  # week 3
        _make_row("2026-01-19", 2000),  # week 4
    ]
    session = _mock_session(rows)
    result = await burn_service.get_receipt(session, "user1", "proj1")

    assert result is not None
    assert result["total_tokens"] == 9000
    # from Jan 5 to Jan 19 = 14 days = (14 // 7) + 1 = 3 weeks
    assert result["duration_weeks"] == 3
    assert result["peak_week_tokens"] == 4000


@pytest.mark.asyncio
async def test_get_receipt_peak_week_correct():
    """Peak week is the single week with the highest total."""
    rows = [
        _make_row("2026-02-02", 1000),  # week 6
        _make_row("2026-02-03", 1000),  # week 6
        _make_row("2026-02-09", 9000),  # week 7
    ]
    session = _mock_session(rows)
    result = await burn_service.get_receipt(session, "user1", "proj1")

    assert result is not None
    assert result["peak_week_tokens"] == 9000


# ---------------------------------------------------------------------------
# Burn GraphQL types
# ---------------------------------------------------------------------------


def test_burn_types_importable():
    """BurnDayType, BurnReceiptType, BurnSummaryType can be imported."""
    from app.graphql.types.burn import BurnDayType, BurnReceiptType, BurnSummaryType

    day = BurnDayType(date=datetime.date(2026, 2, 10), tokens=5000)
    assert day.tokens == 5000

    receipt = BurnReceiptType(
        project_id="p1",
        total_tokens=5000,
        duration_weeks=1,
        peak_week_tokens=5000,
        daily_activity=[day],
    )
    assert receipt.total_tokens == 5000

    summary = BurnSummaryType(
        days_active=1,
        total_tokens=5000,
        active_weeks=1,
        total_weeks=52,
        weekly_streak=1,
        daily_activity=[day],
    )
    assert summary.weekly_streak == 1
