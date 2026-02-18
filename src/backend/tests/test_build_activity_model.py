"""Tests for BuildActivity model — creation, fields, constraints, and relationships."""

import datetime

from sqlalchemy import select

from app.models.build_activity import BuildActivity
from app.models.enums import (
    AvailabilityStatus,
    BuildActivitySource,
    ProjectStatus,
    UserRole,
)
from app.models.project import Project
from app.models.user import User


class TestBuildActivityModel:
    """Tests for the BuildActivity SQLAlchemy model."""

    async def test_create_build_activity(self, async_session):
        """BuildActivity can be created and persisted with required fields."""
        user = User(
            username="ba_user",
            display_name="BA User",
            email="ba_user@example.com",
            primary_role=UserRole.ENGINEER,
            availability_status=AvailabilityStatus.JUST_BROWSING,
            builder_score=0.0,
            contact_links={},
        )
        async_session.add(user)
        await async_session.flush()

        activity = BuildActivity(
            user_id=user.id,
            activity_date=datetime.date(2026, 2, 18),
            tokens_burned=15000,
            source=BuildActivitySource.ANTHROPIC,
        )
        async_session.add(activity)
        await async_session.commit()

        # Re-fetch from DB
        stmt = select(BuildActivity).where(BuildActivity.id == activity.id)
        result = await async_session.execute(stmt)
        fetched = result.scalar_one()

        assert fetched.user_id == user.id
        assert fetched.activity_date == datetime.date(2026, 2, 18)
        assert fetched.tokens_burned == 15000
        assert fetched.source == BuildActivitySource.ANTHROPIC
        assert fetched.project_id is None

    async def test_create_with_project(self, async_session):
        """BuildActivity can be associated with a project."""
        user = User(
            username="ba_proj_user",
            display_name="BA Proj User",
            email="ba_proj@example.com",
            primary_role=UserRole.ENGINEER,
            availability_status=AvailabilityStatus.JUST_BROWSING,
            builder_score=0.0,
            contact_links={},
        )
        async_session.add(user)
        await async_session.flush()

        project = Project(
            owner_id=user.id,
            title="Test Project",
            status=ProjectStatus.IN_PROGRESS,
        )
        async_session.add(project)
        await async_session.flush()

        activity = BuildActivity(
            user_id=user.id,
            project_id=project.id,
            activity_date=datetime.date(2026, 2, 18),
            tokens_burned=8000,
            source=BuildActivitySource.OPENAI,
        )
        async_session.add(activity)
        await async_session.commit()

        stmt = select(BuildActivity).where(BuildActivity.id == activity.id)
        result = await async_session.execute(stmt)
        fetched = result.scalar_one()

        assert fetched.project_id == project.id
        assert fetched.source == BuildActivitySource.OPENAI

    async def test_metadata_field(self, async_session):
        """BuildActivity stores metadata as JSONB."""
        user = User(
            username="ba_meta_user",
            display_name="BA Meta User",
            email="ba_meta@example.com",
            primary_role=UserRole.ENGINEER,
            availability_status=AvailabilityStatus.JUST_BROWSING,
            builder_score=0.0,
            contact_links={},
        )
        async_session.add(user)
        await async_session.flush()

        metadata = {"model": "claude-3-opus", "session_id": "sess_123"}
        activity = BuildActivity(
            user_id=user.id,
            activity_date=datetime.date(2026, 2, 15),
            tokens_burned=5000,
            source=BuildActivitySource.ANTHROPIC,
            metadata_=metadata,
        )
        async_session.add(activity)
        await async_session.commit()

        stmt = select(BuildActivity).where(BuildActivity.id == activity.id)
        result = await async_session.execute(stmt)
        fetched = result.scalar_one()

        assert fetched.metadata_ == metadata
        assert fetched.metadata_["model"] == "claude-3-opus"

    async def test_all_source_values(self, async_session):
        """BuildActivity works with all BuildActivitySource enum values."""
        user = User(
            username="ba_sources_user",
            display_name="BA Sources User",
            email="ba_sources@example.com",
            primary_role=UserRole.ENGINEER,
            availability_status=AvailabilityStatus.JUST_BROWSING,
            builder_score=0.0,
            contact_links={},
        )
        async_session.add(user)
        await async_session.flush()

        for i, source in enumerate(BuildActivitySource):
            activity = BuildActivity(
                user_id=user.id,
                activity_date=datetime.date(2026, 1, i + 1),
                tokens_burned=1000 * (i + 1),
                source=source,
            )
            async_session.add(activity)

        await async_session.commit()

        stmt = select(BuildActivity).where(BuildActivity.user_id == user.id)
        result = await async_session.execute(stmt)
        activities = result.scalars().all()

        sources_found = {a.source for a in activities}
        assert sources_found == set(BuildActivitySource)

    async def test_ulid_primary_key_generated(self, async_session):
        """BuildActivity generates a ULID primary key automatically."""
        user = User(
            username="ba_ulid_user",
            display_name="BA ULID User",
            email="ba_ulid@example.com",
            primary_role=UserRole.ENGINEER,
            availability_status=AvailabilityStatus.JUST_BROWSING,
            builder_score=0.0,
            contact_links={},
        )
        async_session.add(user)
        await async_session.flush()

        activity = BuildActivity(
            user_id=user.id,
            activity_date=datetime.date(2026, 2, 18),
            tokens_burned=1000,
            source=BuildActivitySource.MANUAL,
        )
        async_session.add(activity)
        await async_session.flush()

        assert activity.id is not None
        assert len(activity.id) == 26  # ULID length

    async def test_timestamps_auto_set(self, async_session):
        """BuildActivity has created_at and updated_at auto-set by TimestampMixin."""
        user = User(
            username="ba_ts_user",
            display_name="BA TS User",
            email="ba_ts@example.com",
            primary_role=UserRole.ENGINEER,
            availability_status=AvailabilityStatus.JUST_BROWSING,
            builder_score=0.0,
            contact_links={},
        )
        async_session.add(user)
        await async_session.flush()

        activity = BuildActivity(
            user_id=user.id,
            activity_date=datetime.date(2026, 2, 18),
            tokens_burned=2500,
            source=BuildActivitySource.GOOGLE,
        )
        async_session.add(activity)
        await async_session.commit()

        stmt = select(BuildActivity).where(BuildActivity.id == activity.id)
        result = await async_session.execute(stmt)
        fetched = result.scalar_one()

        assert fetched.created_at is not None
        assert fetched.updated_at is not None

    async def test_user_relationship(self, async_session):
        """BuildActivity.user relationship resolves to the correct user."""
        user = User(
            username="ba_rel_user",
            display_name="BA Rel User",
            email="ba_rel@example.com",
            primary_role=UserRole.ENGINEER,
            availability_status=AvailabilityStatus.JUST_BROWSING,
            builder_score=0.0,
            contact_links={},
        )
        async_session.add(user)
        await async_session.flush()

        activity = BuildActivity(
            user_id=user.id,
            activity_date=datetime.date(2026, 2, 18),
            tokens_burned=3000,
            source=BuildActivitySource.OTHER,
        )
        async_session.add(activity)
        await async_session.commit()

        # Verify via the user's build_activities relationship
        await async_session.refresh(user, ["build_activities"])
        assert len(user.build_activities) == 1
        assert user.build_activities[0].id == activity.id
        assert user.build_activities[0].tokens_burned == 3000

    async def test_tablename(self):
        """BuildActivity uses 'build_activities' table name."""
        assert BuildActivity.__tablename__ == "build_activities"

    async def test_table_constraints_defined(self):
        """BuildActivity has unique constraint and indexes in table args."""
        table_args = BuildActivity.__table_args__
        # Should have UniqueConstraint and Indexes
        constraint_names = [
            getattr(arg, "name", None) for arg in table_args
        ]
        assert "uq_build_activity_per_day" in constraint_names
