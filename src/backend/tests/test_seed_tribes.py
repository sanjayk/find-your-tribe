"""Tests for tribes seed data."""

import pytest
from sqlalchemy import select

from app.db.base import Base
from app.models.enums import MemberRole, MemberStatus, TribeStatus
from app.models.tribe import Tribe, TribeOpenRole, tribe_members
from app.seed.skills import seed_skills
from app.seed.tribes import seed_tribes
from app.seed.users import seed_users


@pytest.mark.asyncio
@pytest.mark.skip(reason="Requires running database")
async def test_seed_tribes_creates_exactly_3_tribes():
    """Test that seed_tribes creates exactly 3 tribes."""
    from app.db.engine import async_session_factory, engine

    # Create table
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    try:
        async with async_session_factory() as session:
            # Seed dependencies
            skills_dict = await seed_skills(session)
            users_dict = await seed_users(session, skills_dict)

            # Seed tribes
            tribes_dict = await seed_tribes(session, users_dict)

            # Verify exactly 3 tribes were created
            assert len(tribes_dict) == 3

            # Verify tribes exist in database
            result = await session.execute(select(Tribe))
            tribes = result.scalars().all()
            assert len(tribes) == 3
    finally:
        # Clean up
        async with engine.begin() as conn:
            await conn.run_sync(Base.metadata.drop_all)


@pytest.mark.asyncio
@pytest.mark.skip(reason="Requires running database")
async def test_seed_tribes_correct_names_and_statuses():
    """Test that tribes have correct names and statuses."""
    from app.db.engine import async_session_factory, engine

    # Create table
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    try:
        async with async_session_factory() as session:
            skills_dict = await seed_skills(session)
            users_dict = await seed_users(session, skills_dict)
            tribes_dict = await seed_tribes(session, users_dict)

            # Expected tribes
            expected_tribes = {
                "Hospitality OS": TribeStatus.OPEN,
                "AI for Education": TribeStatus.OPEN,
                "Creator Economy Tools": TribeStatus.ACTIVE,
            }

            for tribe_name, expected_status in expected_tribes.items():
                assert tribe_name in tribes_dict, f"Tribe {tribe_name} not found"

                tribe_id = tribes_dict[tribe_name]
                result = await session.execute(
                    select(Tribe).where(Tribe.id == tribe_id)
                )
                tribe = result.scalar_one()
                assert tribe.status == expected_status, (
                    f"Tribe {tribe_name} has status {tribe.status}, expected {expected_status}"
                )
    finally:
        # Clean up
        async with engine.begin() as conn:
            await conn.run_sync(Base.metadata.drop_all)


@pytest.mark.asyncio
@pytest.mark.skip(reason="Requires running database")
async def test_seed_tribes_correct_missions():
    """Test that tribes have correct missions."""
    from app.db.engine import async_session_factory, engine

    # Create table
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    try:
        async with async_session_factory() as session:
            skills_dict = await seed_skills(session)
            users_dict = await seed_users(session, skills_dict)
            tribes_dict = await seed_tribes(session, users_dict)

            # Expected missions
            expected_missions = {
                "Hospitality OS": "Building the operating system for independent hotels",
                "AI for Education": "Making personalized learning accessible to every student",
                "Creator Economy Tools": "Empowering independent creators with better business tools",
            }

            for tribe_name, expected_mission in expected_missions.items():
                tribe_id = tribes_dict[tribe_name]
                result = await session.execute(
                    select(Tribe).where(Tribe.id == tribe_id)
                )
                tribe = result.scalar_one()
                assert tribe.mission == expected_mission, (
                    f"Tribe {tribe_name} has wrong mission"
                )
    finally:
        # Clean up
        async with engine.begin() as conn:
            await conn.run_sync(Base.metadata.drop_all)


@pytest.mark.asyncio
@pytest.mark.skip(reason="Requires running database")
async def test_seed_tribes_correct_owners():
    """Test that tribes have correct owners."""
    from app.db.engine import async_session_factory, engine

    # Create table
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    try:
        async with async_session_factory() as session:
            skills_dict = await seed_skills(session)
            users_dict = await seed_users(session, skills_dict)
            tribes_dict = await seed_tribes(session, users_dict)

            # Expected owners
            expected_owners = {
                "Hospitality OS": "tomnakamura",
                "AI for Education": "sarahkim",
                "Creator Economy Tools": "elenavolkov",
            }

            for tribe_name, expected_owner_username in expected_owners.items():
                tribe_id = tribes_dict[tribe_name]
                result = await session.execute(
                    select(Tribe).where(Tribe.id == tribe_id)
                )
                tribe = result.scalar_one()
                expected_owner_id = users_dict[expected_owner_username]
                assert tribe.owner_id == expected_owner_id, (
                    f"Tribe {tribe_name} has wrong owner"
                )
    finally:
        # Clean up
        async with engine.begin() as conn:
            await conn.run_sync(Base.metadata.drop_all)


@pytest.mark.asyncio
@pytest.mark.skip(reason="Requires running database")
async def test_seed_tribes_member_relationships():
    """Test that tribes have correct member relationships."""
    from app.db.engine import async_session_factory, engine

    # Create table
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    try:
        async with async_session_factory() as session:
            skills_dict = await seed_skills(session)
            users_dict = await seed_users(session, skills_dict)
            tribes_dict = await seed_tribes(session, users_dict)

            # Hospitality OS: Tom (owner), Maya, James (members)
            hospitality_id = tribes_dict["Hospitality OS"]
            result = await session.execute(
                select(Tribe).where(Tribe.id == hospitality_id)
            )
            hospitality = result.scalar_one()
            await session.refresh(hospitality, ["members"])

            # Should have 3 total members (owner + 2 members)
            member_ids = {member.id for member in hospitality.members}
            expected_member_ids = {
                users_dict["tomnakamura"],
                users_dict["mayachen"],
                users_dict["jamesokafor"],
            }
            assert member_ids == expected_member_ids

            # AI for Education: Sarah (owner), Alex (member)
            ai_edu_id = tribes_dict["AI for Education"]
            result = await session.execute(
                select(Tribe).where(Tribe.id == ai_edu_id)
            )
            ai_edu = result.scalar_one()
            await session.refresh(ai_edu, ["members"])

            member_ids = {member.id for member in ai_edu.members}
            expected_member_ids = {
                users_dict["sarahkim"],
                users_dict["alexrivera"],
            }
            assert member_ids == expected_member_ids

            # Creator Economy Tools: Elena (owner), Marcus (member)
            creator_id = tribes_dict["Creator Economy Tools"]
            result = await session.execute(
                select(Tribe).where(Tribe.id == creator_id)
            )
            creator = result.scalar_one()
            await session.refresh(creator, ["members"])

            member_ids = {member.id for member in creator.members}
            expected_member_ids = {
                users_dict["elenavolkov"],
                users_dict["marcusjohnson"],
            }
            assert member_ids == expected_member_ids
    finally:
        # Clean up
        async with engine.begin() as conn:
            await conn.run_sync(Base.metadata.drop_all)


@pytest.mark.asyncio
@pytest.mark.skip(reason="Requires running database")
async def test_seed_tribes_member_roles_and_status():
    """Test that tribe members have correct roles and ACTIVE status."""
    from app.db.engine import async_session_factory, engine

    # Create table
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    try:
        async with async_session_factory() as session:
            skills_dict = await seed_skills(session)
            users_dict = await seed_users(session, skills_dict)
            tribes_dict = await seed_tribes(session, users_dict)

            # Check Hospitality OS members
            hospitality_id = tribes_dict["Hospitality OS"]

            # Tom should be owner
            result = await session.execute(
                select(tribe_members.c.role, tribe_members.c.status).where(
                    tribe_members.c.tribe_id == hospitality_id,
                    tribe_members.c.user_id == users_dict["tomnakamura"],
                )
            )
            row = result.one()
            assert row.role == MemberRole.OWNER
            assert row.status == MemberStatus.ACTIVE

            # Maya should be member with ACTIVE status
            result = await session.execute(
                select(tribe_members.c.role, tribe_members.c.status).where(
                    tribe_members.c.tribe_id == hospitality_id,
                    tribe_members.c.user_id == users_dict["mayachen"],
                )
            )
            row = result.one()
            assert row.role == MemberRole.MEMBER
            assert row.status == MemberStatus.ACTIVE

            # James should be member with ACTIVE status
            result = await session.execute(
                select(tribe_members.c.role, tribe_members.c.status).where(
                    tribe_members.c.tribe_id == hospitality_id,
                    tribe_members.c.user_id == users_dict["jamesokafor"],
                )
            )
            row = result.one()
            assert row.role == MemberRole.MEMBER
            assert row.status == MemberStatus.ACTIVE
    finally:
        # Clean up
        async with engine.begin() as conn:
            await conn.run_sync(Base.metadata.drop_all)


@pytest.mark.asyncio
@pytest.mark.skip(reason="Requires running database")
async def test_seed_tribes_open_roles():
    """Test that tribes have correct open roles."""
    from app.db.engine import async_session_factory, engine

    # Create table
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    try:
        async with async_session_factory() as session:
            skills_dict = await seed_skills(session)
            users_dict = await seed_users(session, skills_dict)
            tribes_dict = await seed_tribes(session, users_dict)

            # Hospitality OS should have 2 open roles
            hospitality_id = tribes_dict["Hospitality OS"]
            result = await session.execute(
                select(TribeOpenRole).where(
                    TribeOpenRole.tribe_id == hospitality_id
                )
            )
            hospitality_roles = result.scalars().all()
            assert len(hospitality_roles) == 2

            # Check Backend Engineer role
            backend_role = next(
                (r for r in hospitality_roles if r.title == "Backend Engineer"),
                None
            )
            assert backend_role is not None
            assert backend_role.skills_needed == ["Go", "PostgreSQL"]
            assert backend_role.filled is False

            # Check Growth Marketer role
            marketer_role = next(
                (r for r in hospitality_roles if r.title == "Growth Marketer"),
                None
            )
            assert marketer_role is not None
            assert marketer_role.skills_needed == ["SEO", "Partnerships"]
            assert marketer_role.filled is False

            # AI for Education should have 1 open role
            ai_edu_id = tribes_dict["AI for Education"]
            result = await session.execute(
                select(TribeOpenRole).where(
                    TribeOpenRole.tribe_id == ai_edu_id
                )
            )
            ai_edu_roles = result.scalars().all()
            assert len(ai_edu_roles) == 1

            # Check Product Designer role
            designer_role = ai_edu_roles[0]
            assert designer_role.title == "Product Designer"
            assert designer_role.skills_needed == ["Figma", "User Research"]
            assert designer_role.filled is False

            # Creator Economy Tools should have no open roles
            creator_id = tribes_dict["Creator Economy Tools"]
            result = await session.execute(
                select(TribeOpenRole).where(
                    TribeOpenRole.tribe_id == creator_id
                )
            )
            creator_roles = result.scalars().all()
            assert len(creator_roles) == 0
    finally:
        # Clean up
        async with engine.begin() as conn:
            await conn.run_sync(Base.metadata.drop_all)


@pytest.mark.asyncio
@pytest.mark.skip(reason="Requires running database")
async def test_seed_tribes_returns_lookup_dict():
    """Test that seed_tribes returns a lookup dictionary."""
    from app.db.engine import async_session_factory, engine

    # Create table
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    try:
        async with async_session_factory() as session:
            skills_dict = await seed_skills(session)
            users_dict = await seed_users(session, skills_dict)
            tribes_dict = await seed_tribes(session, users_dict)

            # Verify it's a dictionary
            assert isinstance(tribes_dict, dict)

            # Verify all entries map tribe name to ID
            for tribe_name, tribe_id in tribes_dict.items():
                assert isinstance(tribe_name, str)
                assert isinstance(tribe_id, str)
                assert len(tribe_id) == 26  # ULID length

                # Verify tribe exists in database
                result = await session.execute(
                    select(Tribe).where(Tribe.name == tribe_name)
                )
                tribe = result.scalar_one()
                assert tribe.id == tribe_id
    finally:
        # Clean up
        async with engine.begin() as conn:
            await conn.run_sync(Base.metadata.drop_all)
