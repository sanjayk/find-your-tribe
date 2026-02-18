"""Tests for BurnDayType, BurnReceiptType, and BurnSummaryType GraphQL types."""

import datetime

import strawberry

from app.graphql.types.burn import BurnDayType, BurnReceiptType, BurnSummaryType

# ---------------------------------------------------------------------------
# BurnDayType
# ---------------------------------------------------------------------------


class TestBurnDayType:
    """Tests for the BurnDayType Strawberry type."""

    def test_is_strawberry_type(self):
        """BurnDayType is a valid Strawberry type."""
        assert hasattr(BurnDayType, "__strawberry_definition__")

    def test_has_required_fields(self):
        """BurnDayType has date and tokens fields."""
        fields = {
            field.name for field in BurnDayType.__strawberry_definition__.fields
        }
        assert "date" in fields
        assert "tokens" in fields

    def test_instantiation(self):
        """BurnDayType can be constructed with date and tokens."""
        day = BurnDayType(date=datetime.date(2026, 2, 18), tokens=12500)
        assert day.date == datetime.date(2026, 2, 18)
        assert day.tokens == 12500

    def test_zero_tokens(self):
        """BurnDayType accepts zero tokens."""
        day = BurnDayType(date=datetime.date(2026, 1, 1), tokens=0)
        assert day.tokens == 0

    def test_field_types(self):
        """date is datetime.date, tokens is int."""
        field_map = {
            field.name: field for field in BurnDayType.__strawberry_definition__.fields
        }
        assert field_map["date"].type is datetime.date
        assert field_map["tokens"].type is int


# ---------------------------------------------------------------------------
# BurnReceiptType
# ---------------------------------------------------------------------------


class TestBurnReceiptType:
    """Tests for the BurnReceiptType Strawberry type."""

    def test_is_strawberry_type(self):
        """BurnReceiptType is a valid Strawberry type."""
        assert hasattr(BurnReceiptType, "__strawberry_definition__")

    def test_has_required_fields(self):
        """BurnReceiptType has all expected fields."""
        fields = {
            field.name for field in BurnReceiptType.__strawberry_definition__.fields
        }
        assert "project_id" in fields
        assert "total_tokens" in fields
        assert "duration_weeks" in fields
        assert "peak_week_tokens" in fields
        assert "daily_activity" in fields

    def test_instantiation(self):
        """BurnReceiptType can be constructed with all required fields."""
        day = BurnDayType(date=datetime.date(2026, 2, 10), tokens=5000)
        receipt = BurnReceiptType(
            project_id=strawberry.ID("proj_001"),
            total_tokens=5000,
            duration_weeks=1,
            peak_week_tokens=5000,
            daily_activity=[day],
        )
        assert receipt.project_id == "proj_001"
        assert receipt.total_tokens == 5000
        assert receipt.duration_weeks == 1
        assert receipt.peak_week_tokens == 5000
        assert len(receipt.daily_activity) == 1
        assert receipt.daily_activity[0].tokens == 5000

    def test_empty_daily_activity(self):
        """BurnReceiptType accepts an empty daily_activity list."""
        receipt = BurnReceiptType(
            project_id=strawberry.ID("proj_002"),
            total_tokens=0,
            duration_weeks=0,
            peak_week_tokens=0,
            daily_activity=[],
        )
        assert receipt.daily_activity == []

    def test_multiple_days_activity(self):
        """BurnReceiptType correctly stores multiple daily activity entries."""
        days = [
            BurnDayType(date=datetime.date(2026, 2, 10), tokens=3000),
            BurnDayType(date=datetime.date(2026, 2, 11), tokens=2000),
            BurnDayType(date=datetime.date(2026, 2, 12), tokens=4000),
        ]
        receipt = BurnReceiptType(
            project_id=strawberry.ID("proj_003"),
            total_tokens=9000,
            duration_weeks=1,
            peak_week_tokens=9000,
            daily_activity=days,
        )
        assert len(receipt.daily_activity) == 3
        assert receipt.total_tokens == 9000


# ---------------------------------------------------------------------------
# BurnSummaryType
# ---------------------------------------------------------------------------


class TestBurnSummaryType:
    """Tests for the BurnSummaryType Strawberry type."""

    def test_is_strawberry_type(self):
        """BurnSummaryType is a valid Strawberry type."""
        assert hasattr(BurnSummaryType, "__strawberry_definition__")

    def test_has_required_fields(self):
        """BurnSummaryType has all expected fields."""
        fields = {
            field.name for field in BurnSummaryType.__strawberry_definition__.fields
        }
        assert "days_active" in fields
        assert "total_tokens" in fields
        assert "active_weeks" in fields
        assert "total_weeks" in fields
        assert "weekly_streak" in fields
        assert "daily_activity" in fields

    def test_instantiation(self):
        """BurnSummaryType can be constructed with all required fields."""
        day = BurnDayType(date=datetime.date(2026, 2, 10), tokens=8000)
        summary = BurnSummaryType(
            days_active=5,
            total_tokens=40000,
            active_weeks=2,
            total_weeks=52,
            weekly_streak=2,
            daily_activity=[day],
        )
        assert summary.days_active == 5
        assert summary.total_tokens == 40000
        assert summary.active_weeks == 2
        assert summary.total_weeks == 52
        assert summary.weekly_streak == 2
        assert len(summary.daily_activity) == 1

    def test_zero_summary(self):
        """BurnSummaryType works with all-zero values."""
        summary = BurnSummaryType(
            days_active=0,
            total_tokens=0,
            active_weeks=0,
            total_weeks=0,
            weekly_streak=0,
            daily_activity=[],
        )
        assert summary.days_active == 0
        assert summary.total_tokens == 0
        assert summary.weekly_streak == 0
        assert summary.daily_activity == []

    def test_field_types(self):
        """Integer fields are int, daily_activity is list[BurnDayType]."""
        field_map = {
            field.name: field for field in BurnSummaryType.__strawberry_definition__.fields
        }
        assert field_map["days_active"].type is int
        assert field_map["total_tokens"].type is int
        assert field_map["active_weeks"].type is int
        assert field_map["total_weeks"].type is int
        assert field_map["weekly_streak"].type is int
