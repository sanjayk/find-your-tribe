"""Tests for users seed data."""

import pytest
from sqlalchemy import select

from app.db.base import Base
from app.models.enums import AvailabilityStatus, UserRole
from app.models.user import User
from app.seed.skills import seed_skills
from app.seed.users import seed_users


@pytest.mark.asyncio
async def test_seed_users_creates_exactly_10_users():
    """Test that seed_users creates exactly 10 users."""
    from app.db.engine import async_session_factory, engine

    # Create table
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    try:
        async with async_session_factory() as session:
            # First seed skills
            skills_dict = await seed_skills(session)

            # Then seed users
            user_lookup = await seed_users(session, skills_dict)

            # Verify exactly 10 users were created
            assert len(user_lookup) == 10

            # Verify users exist in database
            result = await session.execute(select(User))
            users = result.scalars().all()
            assert len(users) == 10
    finally:
        # Clean up
        async with engine.begin() as conn:
            await conn.run_sync(Base.metadata.drop_all)


@pytest.mark.asyncio
async def test_seed_users_correct_builder_scores():
    """Test that all users have correct builder scores."""
    from app.db.engine import async_session_factory, engine

    # Create table
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    try:
        async with async_session_factory() as session:
            skills_dict = await seed_skills(session)
            user_lookup = await seed_users(session, skills_dict)

            # Expected builder scores
            expected_scores = {
                "mayachen": 72.0,
                "jamesokafor": 58.0,
                "priyasharma": 65.0,
                "davidmorales": 45.0,
                "sarahkim": 71.0,
                "alexrivera": 38.0,
                "elenavolkov": 52.0,
                "marcusjohnson": 61.0,
                "aishapatel": 44.0,
                "tomnakamura": 68.0,
            }

            # Verify each user has correct builder score
            for username, expected_score in expected_scores.items():
                user_id = user_lookup[username]
                result = await session.execute(
                    select(User).where(User.id == user_id)
                )
                user = result.scalar_one()
                assert user.builder_score == expected_score, (
                    f"User {username} has score {user.builder_score}, expected {expected_score}"
                )
    finally:
        # Clean up
        async with engine.begin() as conn:
            await conn.run_sync(Base.metadata.drop_all)


@pytest.mark.asyncio
async def test_seed_users_all_fields_populated():
    """Test that all required user fields are populated."""
    from app.db.engine import async_session_factory, engine

    # Create table
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    try:
        async with async_session_factory() as session:
            skills_dict = await seed_skills(session)
            await seed_users(session, skills_dict)

            result = await session.execute(select(User))
            users = result.scalars().all()

            for user in users:
                # Check required fields present on all users
                assert user.username
                assert user.display_name
                assert user.email
                assert user.primary_role
                assert user.availability_status
                assert user.builder_score >= 0
                assert user.contact_links is not None
                assert isinstance(user.contact_links, dict)

            # Full and medium profile users should have headline, bio, and twitter
            full_medium_usernames = {
                "mayachen", "sarahkim", "tomnakamura", "priyasharma",
                "marcusjohnson", "elenavolkov", "jamesokafor", "davidmorales",
            }
            for user in users:
                if user.username in full_medium_usernames:
                    assert user.headline, f"User {user.username} missing headline"
                    assert user.bio, f"User {user.username} missing bio"
                    assert "twitter" in user.contact_links, (
                        f"User {user.username} missing twitter in contact_links"
                    )
    finally:
        # Clean up
        async with engine.begin() as conn:
            await conn.run_sync(Base.metadata.drop_all)


@pytest.mark.asyncio
async def test_seed_users_availability_statuses():
    """Test that users have correct availability statuses."""
    from app.db.engine import async_session_factory, engine

    # Create table
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    try:
        async with async_session_factory() as session:
            skills_dict = await seed_skills(session)
            user_lookup = await seed_users(session, skills_dict)

            # Expected availability statuses
            expected_statuses = {
                "mayachen": AvailabilityStatus.OPEN_TO_TRIBE,
                "jamesokafor": AvailabilityStatus.AVAILABLE_FOR_PROJECTS,
                "priyasharma": AvailabilityStatus.OPEN_TO_TRIBE,
                "davidmorales": AvailabilityStatus.AVAILABLE_FOR_PROJECTS,
                "sarahkim": AvailabilityStatus.OPEN_TO_TRIBE,
                "alexrivera": AvailabilityStatus.JUST_BROWSING,
                "elenavolkov": AvailabilityStatus.OPEN_TO_TRIBE,
                "marcusjohnson": AvailabilityStatus.OPEN_TO_TRIBE,
                "aishapatel": AvailabilityStatus.JUST_BROWSING,
                "tomnakamura": AvailabilityStatus.OPEN_TO_TRIBE,
            }

            for username, expected_status in expected_statuses.items():
                user_id = user_lookup[username]
                result = await session.execute(
                    select(User).where(User.id == user_id)
                )
                user = result.scalar_one()
                assert user.availability_status == expected_status, (
                    f"User {username} has status {user.availability_status}, expected {expected_status}"
                )
    finally:
        # Clean up
        async with engine.begin() as conn:
            await conn.run_sync(Base.metadata.drop_all)


@pytest.mark.asyncio
async def test_seed_users_primary_roles():
    """Test that users have correct primary roles."""
    from app.db.engine import async_session_factory, engine

    # Create table
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    try:
        async with async_session_factory() as session:
            skills_dict = await seed_skills(session)
            user_lookup = await seed_users(session, skills_dict)

            # Expected primary roles
            expected_roles = {
                "mayachen": UserRole.ENGINEER,
                "jamesokafor": UserRole.DESIGNER,
                "priyasharma": UserRole.ENGINEER,
                "davidmorales": UserRole.MARKETER,
                "sarahkim": UserRole.ENGINEER,
                "alexrivera": UserRole.ENGINEER,
                "elenavolkov": UserRole.PM,
                "marcusjohnson": UserRole.ENGINEER,
                "aishapatel": UserRole.DESIGNER,
                "tomnakamura": UserRole.FOUNDER,
            }

            for username, expected_role in expected_roles.items():
                user_id = user_lookup[username]
                result = await session.execute(
                    select(User).where(User.id == user_id)
                )
                user = result.scalar_one()
                assert user.primary_role == expected_role, (
                    f"User {username} has role {user.primary_role}, expected {expected_role}"
                )
    finally:
        # Clean up
        async with engine.begin() as conn:
            await conn.run_sync(Base.metadata.drop_all)


@pytest.mark.asyncio
async def test_seed_users_skills_relationships():
    """Test that users have correct skill relationships."""
    from app.db.engine import async_session_factory, engine

    # Create table
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    try:
        async with async_session_factory() as session:
            skills_dict = await seed_skills(session)
            user_lookup = await seed_users(session, skills_dict)

            # Check specific user's skills
            # Maya Chen should have React, Python, PostgreSQL, FastAPI
            maya_id = user_lookup["mayachen"]
            result = await session.execute(
                select(User).where(User.id == maya_id)
            )
            maya = result.scalar_one()

            # Load skills relationship
            await session.refresh(maya, ["skills"])
            maya_skill_names = {skill.name for skill in maya.skills}

            expected_maya_skills = {"React", "Python", "PostgreSQL", "FastAPI", "System Design", "Machine Learning", "DevOps", "Product Strategy"}
            assert maya_skill_names == expected_maya_skills

            # James Okafor should have Figma, UI/UX, Prototyping
            james_id = user_lookup["jamesokafor"]
            result = await session.execute(
                select(User).where(User.id == james_id)
            )
            james = result.scalar_one()

            await session.refresh(james, ["skills"])
            james_skill_names = {skill.name for skill in james.skills}

            expected_james_skills = {"Figma", "UI/UX", "Prototyping", "React"}
            assert james_skill_names == expected_james_skills
    finally:
        # Clean up
        async with engine.begin() as conn:
            await conn.run_sync(Base.metadata.drop_all)


@pytest.mark.asyncio
async def test_seed_users_returns_lookup_dict():
    """Test that seed_users returns a lookup dictionary."""
    from app.db.engine import async_session_factory, engine

    # Create table
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    try:
        async with async_session_factory() as session:
            skills_dict = await seed_skills(session)
            user_lookup = await seed_users(session, skills_dict)

            # Verify it's a dictionary
            assert isinstance(user_lookup, dict)

            # Verify all entries map username to ID
            for username, user_id in user_lookup.items():
                assert isinstance(username, str)
                assert isinstance(user_id, str)
                assert len(user_id) == 26  # ULID length

                # Verify user exists in database
                result = await session.execute(
                    select(User).where(User.username == username)
                )
                user = result.scalar_one()
                assert user.id == user_id
    finally:
        # Clean up
        async with engine.begin() as conn:
            await conn.run_sync(Base.metadata.drop_all)


@pytest.mark.asyncio
async def test_seed_users_specific_users_exist():
    """Test that all 10 specific users exist with correct names."""
    from app.db.engine import async_session_factory, engine

    # Create table
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    try:
        async with async_session_factory() as session:
            skills_dict = await seed_skills(session)
            user_lookup = await seed_users(session, skills_dict)

            # Expected users with their display names
            expected_users = {
                "mayachen": "Maya Chen",
                "jamesokafor": "James Okafor",
                "priyasharma": "Priya Sharma",
                "davidmorales": "David Morales",
                "sarahkim": "Sarah Kim",
                "alexrivera": "Alex Rivera",
                "elenavolkov": "Elena Volkov",
                "marcusjohnson": "Marcus Johnson",
                "aishapatel": "Aisha Patel",
                "tomnakamura": "Tom Nakamura",
            }

            for username, expected_display_name in expected_users.items():
                assert username in user_lookup, f"User {username} not found in lookup"

                user_id = user_lookup[username]
                result = await session.execute(
                    select(User).where(User.id == user_id)
                )
                user = result.scalar_one()
                assert user.display_name == expected_display_name
    finally:
        # Clean up
        async with engine.begin() as conn:
            await conn.run_sync(Base.metadata.drop_all)


@pytest.mark.asyncio
async def test_seed_users_all_have_skills():
    """Test that all users have at least one skill."""
    from app.db.engine import async_session_factory, engine

    # Create table
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    try:
        async with async_session_factory() as session:
            skills_dict = await seed_skills(session)
            await seed_users(session, skills_dict)

            result = await session.execute(select(User))
            users = result.scalars().all()

            for user in users:
                # Load skills relationship
                await session.refresh(user, ["skills"])
                assert len(user.skills) > 0, f"User {user.username} has no skills"
    finally:
        # Clean up
        async with engine.begin() as conn:
            await conn.run_sync(Base.metadata.drop_all)
