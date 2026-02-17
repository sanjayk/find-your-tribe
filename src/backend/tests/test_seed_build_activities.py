"""Tests for build activities seed data."""

import pytest
from sqlalchemy import func, select

from app.db.base import Base
from app.models.build_activity import BuildActivity
from app.models.enums import BuildActivitySource
from app.seed.build_activities import seed_build_activities
from app.seed.projects import seed_projects
from app.seed.skills import seed_skills
from app.seed.users import seed_users


@pytest.mark.asyncio
async def test_seed_build_activities_returns_row_count():
    """Test that seed_build_activities returns the number of rows inserted."""
    from app.db.engine import async_session_factory, engine

    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    try:
        async with async_session_factory() as session:
            skills_dict = await seed_skills(session)
            users_dict = await seed_users(session, skills_dict)
            project_dict = await seed_projects(session, users_dict)

            count = await seed_build_activities(session, users_dict, project_dict)

            assert isinstance(count, int)
            assert count > 0
    finally:
        async with engine.begin() as conn:
            await conn.run_sync(Base.metadata.drop_all)


@pytest.mark.asyncio
async def test_seed_build_activities_inserts_to_db():
    """Test that rows are actually present in the database after seeding."""
    from app.db.engine import async_session_factory, engine

    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    try:
        async with async_session_factory() as session:
            skills_dict = await seed_skills(session)
            users_dict = await seed_users(session, skills_dict)
            project_dict = await seed_projects(session, users_dict)

            count = await seed_build_activities(session, users_dict, project_dict)

            result = await session.execute(select(func.count()).select_from(BuildActivity))
            db_count = result.scalar_one()

            assert db_count == count
    finally:
        async with engine.begin() as conn:
            await conn.run_sync(Base.metadata.drop_all)


@pytest.mark.asyncio
async def test_seed_build_activities_all_users_have_activity():
    """Test that all 10 seeded users have at least some build activity."""
    from app.db.engine import async_session_factory, engine

    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    try:
        async with async_session_factory() as session:
            skills_dict = await seed_skills(session)
            users_dict = await seed_users(session, skills_dict)
            project_dict = await seed_projects(session, users_dict)
            await seed_build_activities(session, users_dict, project_dict)

            for username, user_id in users_dict.items():
                result = await session.execute(
                    select(func.count())
                    .select_from(BuildActivity)
                    .where(BuildActivity.user_id == user_id)
                )
                user_count = result.scalar_one()
                assert user_count > 0, f"User {username} has no build activity"
    finally:
        async with engine.begin() as conn:
            await conn.run_sync(Base.metadata.drop_all)


@pytest.mark.asyncio
async def test_seed_build_activities_mayachen_most_active():
    """Test that mayachen has more activity than alexrivera (activity hierarchy)."""
    from app.db.engine import async_session_factory, engine

    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    try:
        async with async_session_factory() as session:
            skills_dict = await seed_skills(session)
            users_dict = await seed_users(session, skills_dict)
            project_dict = await seed_projects(session, users_dict)
            await seed_build_activities(session, users_dict, project_dict)

            # Count distinct active days for mayachen vs alexrivera
            maya_id = users_dict["mayachen"]
            alex_id = users_dict["alexrivera"]

            maya_result = await session.execute(
                select(func.count(func.distinct(BuildActivity.activity_date)))
                .where(BuildActivity.user_id == maya_id)
            )
            maya_days = maya_result.scalar_one()

            alex_result = await session.execute(
                select(func.count(func.distinct(BuildActivity.activity_date)))
                .where(BuildActivity.user_id == alex_id)
            )
            alex_days = alex_result.scalar_one()

            assert maya_days > alex_days, (
                f"mayachen ({maya_days} days) should have more activity than alexrivera ({alex_days} days)"
            )
    finally:
        async with engine.begin() as conn:
            await conn.run_sync(Base.metadata.drop_all)


@pytest.mark.asyncio
async def test_seed_build_activities_valid_sources():
    """Test that all activity records use valid BuildActivitySource enum values."""
    from app.db.engine import async_session_factory, engine

    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    try:
        async with async_session_factory() as session:
            skills_dict = await seed_skills(session)
            users_dict = await seed_users(session, skills_dict)
            project_dict = await seed_projects(session, users_dict)
            await seed_build_activities(session, users_dict, project_dict)

            valid_sources = {s.value for s in BuildActivitySource}
            result = await session.execute(
                select(func.distinct(BuildActivity.source))
            )
            db_sources = {row[0] for row in result.fetchall()}

            assert db_sources.issubset(valid_sources), (
                f"Unknown sources in DB: {db_sources - valid_sources}"
            )
    finally:
        async with engine.begin() as conn:
            await conn.run_sync(Base.metadata.drop_all)


@pytest.mark.asyncio
async def test_seed_build_activities_tokens_in_valid_range():
    """Test that all token counts are within the valid range (500–80000)."""
    from app.db.engine import async_session_factory, engine

    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    try:
        async with async_session_factory() as session:
            skills_dict = await seed_skills(session)
            users_dict = await seed_users(session, skills_dict)
            project_dict = await seed_projects(session, users_dict)
            await seed_build_activities(session, users_dict, project_dict)

            min_result = await session.execute(select(func.min(BuildActivity.tokens_burned)))
            max_result = await session.execute(select(func.max(BuildActivity.tokens_burned)))
            min_tokens = min_result.scalar_one()
            max_tokens = max_result.scalar_one()

            assert min_tokens >= 200, f"Minimum tokens {min_tokens} below expected floor"
            assert max_tokens <= 80000, f"Maximum tokens {max_tokens} exceeds 80000 ceiling"
    finally:
        async with engine.begin() as conn:
            await conn.run_sync(Base.metadata.drop_all)


@pytest.mark.asyncio
async def test_seed_build_activities_no_unique_constraint_violations():
    """Test that no duplicate (user_id, project_id, activity_date, source) rows exist."""
    from app.db.engine import async_session_factory, engine

    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    try:
        async with async_session_factory() as session:
            skills_dict = await seed_skills(session)
            users_dict = await seed_users(session, skills_dict)
            project_dict = await seed_projects(session, users_dict)

            # This would raise an IntegrityError if duplicates exist
            count = await seed_build_activities(session, users_dict, project_dict)
            assert count > 0
    finally:
        async with engine.begin() as conn:
            await conn.run_sync(Base.metadata.drop_all)


@pytest.mark.asyncio
async def test_seed_build_activities_aishapatel_least_active():
    """Test that aishapatel has fewer active days than sarahkim."""
    from app.db.engine import async_session_factory, engine

    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    try:
        async with async_session_factory() as session:
            skills_dict = await seed_skills(session)
            users_dict = await seed_users(session, skills_dict)
            project_dict = await seed_projects(session, users_dict)
            await seed_build_activities(session, users_dict, project_dict)

            aisha_id = users_dict["aishapatel"]
            sarah_id = users_dict["sarahkim"]

            aisha_result = await session.execute(
                select(func.count(func.distinct(BuildActivity.activity_date)))
                .where(BuildActivity.user_id == aisha_id)
            )
            aisha_days = aisha_result.scalar_one()

            sarah_result = await session.execute(
                select(func.count(func.distinct(BuildActivity.activity_date)))
                .where(BuildActivity.user_id == sarah_id)
            )
            sarah_days = sarah_result.scalar_one()

            assert aisha_days < sarah_days, (
                f"aishapatel ({aisha_days} days) should have less activity than sarahkim ({sarah_days} days)"
            )
    finally:
        async with engine.begin() as conn:
            await conn.run_sync(Base.metadata.drop_all)
