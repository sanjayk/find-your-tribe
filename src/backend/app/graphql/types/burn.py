"""Strawberry GraphQL types for burn (token activity) data."""

import datetime

import strawberry


@strawberry.type
class BurnDayType:
    """A single day's token burn total."""

    date: datetime.date
    tokens: int


@strawberry.type
class BurnReceiptType:
    """Per-project burn receipt showing activity and totals."""

    project_id: strawberry.ID
    total_tokens: int
    duration_weeks: int
    peak_week_tokens: int
    daily_activity: list[BurnDayType]


@strawberry.type
class BurnSummaryType:
    """Aggregated burn summary for a user across all projects."""

    days_active: int
    total_tokens: int
    active_weeks: int
    total_weeks: int
    weekly_streak: int
    daily_activity: list[BurnDayType]
