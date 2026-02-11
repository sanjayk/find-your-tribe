"""Tests for seed_feed_events function."""

import pytest
from sqlalchemy import select

from app.db.base import Base
from app.models.enums import EventType
from app.models.feed_event import FeedEvent
from app.seed.feed_events import seed_feed_events
from app.seed.projects import seed_projects
from app.seed.skills import seed_skills
from app.seed.tribes import seed_tribes
from app.seed.users import seed_users


@pytest.mark.asyncio
@pytest.mark.skip(reason="Requires running database")
async def test_seed_feed_events_creates_correct_count():
    """Test that seed_feed_events creates exactly 15 feed events."""
    from app.db.engine import async_session_factory, engine

    # Create tables
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    try:
        async with async_session_factory() as session:
            # Seed dependencies first
            skills_dict = await seed_skills(session)
            users_dict = await seed_users(session, skills_dict)
            projects_dict = await seed_projects(session, users_dict)
            tribes_dict = await seed_tribes(session, users_dict)

            # Seed feed events
            events_dict = await seed_feed_events(
                session, users_dict, projects_dict, tribes_dict
            )

            # Verify 15 events were created
            stmt = select(FeedEvent)
            result = await session.execute(stmt)
            events = result.scalars().all()

            assert len(events) == 15
            assert len(events_dict) == 15
    finally:
        # Clean up
        async with engine.begin() as conn:
            await conn.run_sync(Base.metadata.drop_all)


@pytest.mark.asyncio
@pytest.mark.skip(reason="Requires running database")
async def test_seed_feed_events_returns_dict():
    """Test that seed_feed_events returns a dictionary mapping indices to IDs."""
    from app.db.engine import async_session_factory, engine

    # Create tables
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    try:
        async with async_session_factory() as session:
            # Seed dependencies first
            skills_dict = await seed_skills(session)
            users_dict = await seed_users(session, skills_dict)
            projects_dict = await seed_projects(session, users_dict)
            tribes_dict = await seed_tribes(session, users_dict)

            # Seed feed events
            events_dict = await seed_feed_events(
                session, users_dict, projects_dict, tribes_dict
            )

            # Verify return value
            assert isinstance(events_dict, dict)
            assert all(isinstance(k, str) for k in events_dict.keys())
            assert all(isinstance(v, str) for v in events_dict.values())
    finally:
        # Clean up
        async with engine.begin() as conn:
            await conn.run_sync(Base.metadata.drop_all)


@pytest.mark.asyncio
@pytest.mark.skip(reason="Requires running database")
async def test_seed_feed_events_has_correct_event_types():
    """Test that feed events have correct event types."""
    from app.db.engine import async_session_factory, engine

    # Create tables
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    try:
        async with async_session_factory() as session:
            # Seed dependencies first
            skills_dict = await seed_skills(session)
            users_dict = await seed_users(session, skills_dict)
            projects_dict = await seed_projects(session, users_dict)
            tribes_dict = await seed_tribes(session, users_dict)

            # Seed feed events
            await seed_feed_events(session, users_dict, projects_dict, tribes_dict)

            # Fetch all events
            stmt = select(FeedEvent).order_by(FeedEvent.created_at.desc())
            result = await session.execute(stmt)
            events = result.scalars().all()

            # Expected event types in order (newest first)
            expected_types = [
                EventType.PROJECT_SHIPPED,  # Maya shipped AI Resume Builder
                EventType.TRIBE_CREATED,  # Tom created Hospitality OS
                EventType.PROJECT_CREATED,  # Alex started building
                EventType.MEMBER_JOINED_TRIBE,  # James joined Hospitality OS
                EventType.PROJECT_SHIPPED,  # Sarah shipped ML Pipeline
                EventType.PROJECT_CREATED,  # David created Growth Analytics
                EventType.COLLABORATION_CONFIRMED,  # Elena+David collaboration
                EventType.TRIBE_CREATED,  # Tom created Hospitality OS (duplicate)
                EventType.MEMBER_JOINED_TRIBE,  # Marcus joined Creator Economy
                EventType.PROJECT_CREATED,  # Maya created Tribe Finder
                EventType.COLLABORATION_CONFIRMED,  # Priya collaboration on Tribe Finder
                EventType.TRIBE_CREATED,  # Sarah created AI for Education
                EventType.MEMBER_JOINED_TRIBE,  # Alex joined as builder
                EventType.PROJECT_SHIPPED,  # James shipped Design System
                EventType.BUILDER_JOINED,  # Aisha joined as builder
            ]

            actual_types = [event.event_type for event in events]
            assert actual_types == expected_types
    finally:
        # Clean up
        async with engine.begin() as conn:
            await conn.run_sync(Base.metadata.drop_all)


@pytest.mark.asyncio
@pytest.mark.skip(reason="Requires running database")
async def test_seed_feed_events_has_valid_actor_ids():
    """Test that all feed events have valid actor_id references."""
    from app.db.engine import async_session_factory, engine

    # Create tables
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    try:
        async with async_session_factory() as session:
            # Seed dependencies first
            skills_dict = await seed_skills(session)
            users_dict = await seed_users(session, skills_dict)
            projects_dict = await seed_projects(session, users_dict)
            tribes_dict = await seed_tribes(session, users_dict)

            # Seed feed events
            await seed_feed_events(session, users_dict, projects_dict, tribes_dict)

            # Fetch all events
            stmt = select(FeedEvent)
            result = await session.execute(stmt)
            events = result.scalars().all()

            # Verify all actor_ids are valid user IDs
            user_ids = set(users_dict.values())
            for event in events:
                assert event.actor_id in user_ids
    finally:
        # Clean up
        async with engine.begin() as conn:
            await conn.run_sync(Base.metadata.drop_all)


@pytest.mark.asyncio
@pytest.mark.skip(reason="Requires running database")
async def test_seed_feed_events_has_valid_target_ids():
    """Test that all feed events have valid target_id references."""
    from app.db.engine import async_session_factory, engine

    # Create tables
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    try:
        async with async_session_factory() as session:
            # Seed dependencies first
            skills_dict = await seed_skills(session)
            users_dict = await seed_users(session, skills_dict)
            projects_dict = await seed_projects(session, users_dict)
            tribes_dict = await seed_tribes(session, users_dict)

            # Seed feed events
            await seed_feed_events(session, users_dict, projects_dict, tribes_dict)

            # Fetch all events
            stmt = select(FeedEvent)
            result = await session.execute(stmt)
            events = result.scalars().all()

            # Verify all target_ids are valid
            all_valid_ids = (
                set(users_dict.values())
                | set(projects_dict.values())
                | set(tribes_dict.values())
            )
            for event in events:
                assert event.target_id in all_valid_ids
    finally:
        # Clean up
        async with engine.begin() as conn:
            await conn.run_sync(Base.metadata.drop_all)


@pytest.mark.asyncio
@pytest.mark.skip(reason="Requires running database")
async def test_seed_feed_events_has_metadata():
    """Test that all feed events have proper metadata."""
    from app.db.engine import async_session_factory, engine

    # Create tables
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    try:
        async with async_session_factory() as session:
            # Seed dependencies first
            skills_dict = await seed_skills(session)
            users_dict = await seed_users(session, skills_dict)
            projects_dict = await seed_projects(session, users_dict)
            tribes_dict = await seed_tribes(session, users_dict)

            # Seed feed events
            await seed_feed_events(session, users_dict, projects_dict, tribes_dict)

            # Fetch all events
            stmt = select(FeedEvent)
            result = await session.execute(stmt)
            events = result.scalars().all()

            # Verify all events have metadata
            for event in events:
                assert event.event_metadata is not None
                assert isinstance(event.event_metadata, dict)
                assert len(event.event_metadata) > 0
    finally:
        # Clean up
        async with engine.begin() as conn:
            await conn.run_sync(Base.metadata.drop_all)


@pytest.mark.asyncio
@pytest.mark.skip(reason="Requires running database")
async def test_seed_feed_events_project_shipped_metadata():
    """Test that PROJECT_SHIPPED events have correct metadata structure."""
    from app.db.engine import async_session_factory, engine

    # Create tables
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    try:
        async with async_session_factory() as session:
            # Seed dependencies first
            skills_dict = await seed_skills(session)
            users_dict = await seed_users(session, skills_dict)
            projects_dict = await seed_projects(session, users_dict)
            tribes_dict = await seed_tribes(session, users_dict)

            # Seed feed events
            await seed_feed_events(session, users_dict, projects_dict, tribes_dict)

            # Fetch PROJECT_SHIPPED events
            stmt = select(FeedEvent).where(
                FeedEvent.event_type == EventType.PROJECT_SHIPPED
            )
            result = await session.execute(stmt)
            events = result.scalars().all()

            # Verify metadata structure
            for event in events:
                assert "project_title" in event.event_metadata
                assert "tech_stack" in event.event_metadata
                assert isinstance(event.event_metadata["tech_stack"], list)
    finally:
        # Clean up
        async with engine.begin() as conn:
            await conn.run_sync(Base.metadata.drop_all)


@pytest.mark.asyncio
@pytest.mark.skip(reason="Requires running database")
async def test_seed_feed_events_tribe_created_metadata():
    """Test that TRIBE_CREATED events have correct metadata structure."""
    from app.db.engine import async_session_factory, engine

    # Create tables
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    try:
        async with async_session_factory() as session:
            # Seed dependencies first
            skills_dict = await seed_skills(session)
            users_dict = await seed_users(session, skills_dict)
            projects_dict = await seed_projects(session, users_dict)
            tribes_dict = await seed_tribes(session, users_dict)

            # Seed feed events
            await seed_feed_events(session, users_dict, projects_dict, tribes_dict)

            # Fetch TRIBE_CREATED events
            stmt = select(FeedEvent).where(
                FeedEvent.event_type == EventType.TRIBE_CREATED
            )
            result = await session.execute(stmt)
            events = result.scalars().all()

            # Verify metadata structure
            for event in events:
                assert "tribe_name" in event.event_metadata
                assert "mission" in event.event_metadata
    finally:
        # Clean up
        async with engine.begin() as conn:
            await conn.run_sync(Base.metadata.drop_all)


@pytest.mark.asyncio
@pytest.mark.skip(reason="Requires running database")
async def test_seed_feed_events_chronological_order():
    """Test that feed events are in reverse chronological order."""
    from app.db.engine import async_session_factory, engine

    # Create tables
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    try:
        async with async_session_factory() as session:
            # Seed dependencies first
            skills_dict = await seed_skills(session)
            users_dict = await seed_users(session, skills_dict)
            projects_dict = await seed_projects(session, users_dict)
            tribes_dict = await seed_tribes(session, users_dict)

            # Seed feed events
            await seed_feed_events(session, users_dict, projects_dict, tribes_dict)

            # Fetch events ordered by created_at descending
            stmt = select(FeedEvent).order_by(FeedEvent.created_at.desc())
            result = await session.execute(stmt)
            events = result.scalars().all()

            # Verify timestamps are in descending order
            for i in range(len(events) - 1):
                assert events[i].created_at >= events[i + 1].created_at
    finally:
        # Clean up
        async with engine.begin() as conn:
            await conn.run_sync(Base.metadata.drop_all)


@pytest.mark.asyncio
@pytest.mark.skip(reason="Requires running database")
async def test_seed_feed_events_ulid_ordering():
    """Test that feed event ULIDs are time-ordered (older events have earlier ULIDs)."""
    from app.db.engine import async_session_factory, engine

    # Create tables
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    try:
        async with async_session_factory() as session:
            # Seed dependencies first
            skills_dict = await seed_skills(session)
            users_dict = await seed_users(session, skills_dict)
            projects_dict = await seed_projects(session, users_dict)
            tribes_dict = await seed_tribes(session, users_dict)

            # Seed feed events
            await seed_feed_events(session, users_dict, projects_dict, tribes_dict)

            # Fetch events ordered by created_at descending
            stmt = select(FeedEvent).order_by(FeedEvent.created_at.desc())
            result = await session.execute(stmt)
            events = result.scalars().all()

            # Verify ULIDs are in descending order (lexicographically)
            for i in range(len(events) - 1):
                # Newer events should have later (greater) ULIDs
                assert events[i].id >= events[i + 1].id
    finally:
        # Clean up
        async with engine.begin() as conn:
            await conn.run_sync(Base.metadata.drop_all)


@pytest.mark.asyncio
@pytest.mark.skip(reason="Requires running database")
async def test_seed_feed_events_specific_actors():
    """Test that specific events have correct actors."""
    from app.db.engine import async_session_factory, engine

    # Create tables
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    try:
        async with async_session_factory() as session:
            # Seed dependencies first
            skills_dict = await seed_skills(session)
            users_dict = await seed_users(session, skills_dict)
            projects_dict = await seed_projects(session, users_dict)
            tribes_dict = await seed_tribes(session, users_dict)

            # Seed feed events
            await seed_feed_events(session, users_dict, projects_dict, tribes_dict)

            # Fetch events in order
            stmt = select(FeedEvent).order_by(FeedEvent.created_at.desc())
            result = await session.execute(stmt)
            events = result.scalars().all()

            # Test first event: Maya shipped AI Resume Builder
            assert events[0].actor_id == users_dict["mayachen"]
            assert events[0].event_type == EventType.PROJECT_SHIPPED
            assert events[0].event_metadata["project_title"] == "AI Resume Builder"

            # Test second event: Tom created Hospitality OS
            assert events[1].actor_id == users_dict["tomnakamura"]
            assert events[1].event_type == EventType.TRIBE_CREATED
            assert events[1].event_metadata["tribe_name"] == "Hospitality OS"

            # Test last event: Aisha joined as builder
            assert events[14].actor_id == users_dict["aishapatel"]
            assert events[14].event_type == EventType.BUILDER_JOINED
    finally:
        # Clean up
        async with engine.begin() as conn:
            await conn.run_sync(Base.metadata.drop_all)
