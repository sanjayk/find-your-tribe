"""Tests for tribe search functionality."""

import pytest
from sqlalchemy import text

from app.services import tribe_service


async def _set_tribe_search_vector(session, tribe_id: str) -> None:
    """Manually populate a tribe's search_vector from its name and mission.

    The test database does not have Alembic-managed triggers, so we set
    the tsvector explicitly after creating/updating tribe data.
    """
    await session.execute(
        text(
            "UPDATE tribes SET search_vector = "
            "setweight(to_tsvector('english', COALESCE(name, '')), 'A') || "
            "setweight(to_tsvector('english', COALESCE(mission, '')), 'B') "
            "WHERE id = :tid"
        ).bindparams(tid=tribe_id)
    )
    await session.flush()


async def _set_user_search_vector(session, user_id: str) -> None:
    """Manually populate a user's search_vector from display_name and username."""
    await session.execute(
        text(
            "UPDATE users SET search_vector = "
            "to_tsvector('english', COALESCE(display_name, '') || ' ' || COALESCE(username, '')) "
            "WHERE id = :uid"
        ).bindparams(uid=user_id)
    )
    await session.flush()


@pytest.mark.asyncio
async def test_search_by_tribe_name(async_session, seed_test_data):
    """Search by tribe name returns matching tribe via full-text search."""
    owner = seed_test_data["users"]["testuser1"]

    tribe = await tribe_service.create(
        async_session, owner_id=owner.id, name="Quantum Builders"
    )
    await _set_tribe_search_vector(async_session, tribe.id)

    results, total = await tribe_service.search(async_session, "Quantum")

    assert total >= 1
    tribe_ids = [t.id for t in results]
    assert tribe.id in tribe_ids


@pytest.mark.asyncio
async def test_search_by_open_role_skill(async_session, seed_test_data):
    """Search by open role skill returns tribe with that skill in open roles."""
    owner = seed_test_data["users"]["testuser1"]

    tribe = await tribe_service.create(
        async_session, owner_id=owner.id, name="Skill Tribe"
    )
    await _set_tribe_search_vector(async_session, tribe.id)
    await tribe_service.add_open_role(
        async_session,
        tribe_id=tribe.id,
        user_id=owner.id,
        title="Backend Dev",
        skills_needed=["Python", "FastAPI"],
    )

    results, total = await tribe_service.search(async_session, "FastAPI")

    assert total >= 1
    tribe_ids = [t.id for t in results]
    assert tribe.id in tribe_ids


@pytest.mark.asyncio
async def test_search_by_member_name(async_session, seed_test_data):
    """Search by member display_name returns tribe containing that member."""
    owner = seed_test_data["users"]["testuser1"]

    # Set up user search vector so full-text search works
    await _set_user_search_vector(async_session, owner.id)

    tribe = await tribe_service.create(
        async_session, owner_id=owner.id, name="Member Tribe"
    )
    await _set_tribe_search_vector(async_session, tribe.id)

    # Search by the owner's display_name fragment
    results, total = await tribe_service.search(async_session, "testuser1")

    assert total >= 1
    tribe_ids = [t.id for t in results]
    assert tribe.id in tribe_ids


@pytest.mark.asyncio
async def test_search_returns_empty_for_no_match(async_session, seed_test_data):
    """Search returns empty list for non-matching query."""
    owner = seed_test_data["users"]["testuser1"]

    await tribe_service.create(
        async_session, owner_id=owner.id, name="Some Tribe"
    )

    results, total = await tribe_service.search(
        async_session, "zzz_nonexistent_xyz_12345"
    )

    assert results == []
    assert total == 0


@pytest.mark.asyncio
async def test_search_empty_query_returns_empty(async_session, seed_test_data):
    """Empty search query returns empty list without error."""
    results, total = await tribe_service.search(async_session, "")

    assert results == []
    assert total == 0


@pytest.mark.asyncio
async def test_search_whitespace_query_returns_empty(async_session, seed_test_data):
    """Whitespace-only search query returns empty list."""
    results, total = await tribe_service.search(async_session, "   ")

    assert results == []
    assert total == 0


@pytest.mark.asyncio
async def test_search_pagination_limit(async_session, seed_test_data):
    """Pagination limit restricts the number of returned results."""
    owner = seed_test_data["users"]["testuser1"]

    # Create 3 tribes with "Alpha" in the name
    for i in range(3):
        tribe = await tribe_service.create(
            async_session, owner_id=owner.id, name=f"Alpha Team {i}"
        )
        await _set_tribe_search_vector(async_session, tribe.id)

    results, total = await tribe_service.search(
        async_session, "Alpha", limit=2
    )

    assert len(results) == 2
    assert total == 3


@pytest.mark.asyncio
async def test_search_pagination_offset(async_session, seed_test_data):
    """Pagination offset skips the correct number of results."""
    owner = seed_test_data["users"]["testuser1"]

    for i in range(3):
        tribe = await tribe_service.create(
            async_session, owner_id=owner.id, name=f"Beta Team {i}"
        )
        await _set_tribe_search_vector(async_session, tribe.id)

    results, total = await tribe_service.search(
        async_session, "Beta", limit=2, offset=2
    )

    assert len(results) == 1
    assert total == 3


@pytest.mark.asyncio
async def test_search_results_include_eager_loaded_relationships(
    async_session, seed_test_data
):
    """Results include eager-loaded owner, members, and open_roles."""
    owner = seed_test_data["users"]["testuser1"]

    tribe = await tribe_service.create(
        async_session, owner_id=owner.id, name="Eager Tribe"
    )
    await _set_tribe_search_vector(async_session, tribe.id)
    await tribe_service.add_open_role(
        async_session,
        tribe_id=tribe.id,
        user_id=owner.id,
        title="Designer",
        skills_needed=["Figma"],
    )

    results, total = await tribe_service.search(async_session, "Eager")

    assert total >= 1
    found = next(t for t in results if t.id == tribe.id)

    # Verify owner is loaded (not a lazy proxy)
    assert found.owner is not None
    assert found.owner.id == owner.id

    # Verify members are loaded
    assert isinstance(found.members, list)
    assert len(found.members) >= 1

    # Verify open_roles are loaded
    assert isinstance(found.open_roles, list)
    assert len(found.open_roles) >= 1
    assert found.open_roles[0].title == "Designer"


@pytest.mark.asyncio
async def test_search_by_open_role_title(async_session, seed_test_data):
    """Search by open role title returns the tribe."""
    owner = seed_test_data["users"]["testuser1"]

    tribe = await tribe_service.create(
        async_session, owner_id=owner.id, name="Role Title Tribe"
    )
    await _set_tribe_search_vector(async_session, tribe.id)
    await tribe_service.add_open_role(
        async_session,
        tribe_id=tribe.id,
        user_id=owner.id,
        title="Machine Learning Engineer",
    )

    results, total = await tribe_service.search(
        async_session, "Machine Learning"
    )

    assert total >= 1
    tribe_ids = [t.id for t in results]
    assert tribe.id in tribe_ids


@pytest.mark.asyncio
async def test_search_deduplicates_results(async_session, seed_test_data):
    """Search matching multiple paths on the same tribe returns it only once."""
    owner = seed_test_data["users"]["testuser1"]

    # Create a tribe where "Python" appears in both name and role skill
    tribe = await tribe_service.create(
        async_session, owner_id=owner.id, name="Python Guild",
        mission="A tribe for Python enthusiasts",
    )
    await _set_tribe_search_vector(async_session, tribe.id)
    await tribe_service.add_open_role(
        async_session,
        tribe_id=tribe.id,
        user_id=owner.id,
        title="Python Developer",
        skills_needed=["Python"],
    )

    results, total = await tribe_service.search(async_session, "Python")

    # Should appear exactly once despite matching on name, mission, role title, and skill
    matching = [t for t in results if t.id == tribe.id]
    assert len(matching) == 1
