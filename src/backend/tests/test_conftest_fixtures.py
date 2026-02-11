"""Tests to verify that conftest.py fixtures work correctly."""

import pytest
from httpx import AsyncClient
from sqlalchemy import select, text
from sqlalchemy.ext.asyncio import AsyncEngine, AsyncSession

from app.models.user import User


async def test_async_engine_fixture(async_engine: AsyncEngine):
    """Test that async_engine fixture provides a valid engine."""
    assert async_engine is not None
    assert str(async_engine.url).startswith("postgresql+asyncpg://")


async def test_async_session_fixture(async_session: AsyncSession):
    """Test that async_session fixture provides a valid session."""
    assert async_session is not None
    assert isinstance(async_session, AsyncSession)


async def test_async_session_can_execute_query(async_session: AsyncSession):
    """Test that async_session can execute a simple query."""
    result = await async_session.execute(text("SELECT 1 as num"))
    row = result.fetchone()
    assert row is not None
    assert row[0] == 1


async def test_async_session_rollback_isolation(async_session: AsyncSession):
    """Test that changes in async_session are rolled back after test."""
    # Create a user
    user = User(
        username="rollback_test",
        display_name="Rollback Test",
        email="rollback@test.com",
        headline="Test User",
        bio="This user should be rolled back",
    )
    async_session.add(user)
    await async_session.commit()

    # Verify user exists in this session
    result = await async_session.execute(
        select(User).where(User.username == "rollback_test")
    )
    found_user = result.scalar_one_or_none()
    assert found_user is not None
    assert found_user.username == "rollback_test"

    # After this test completes, the transaction will rollback
    # and this user should not exist in subsequent tests


async def test_async_session_rollback_verified(async_session: AsyncSession):
    """Test that previous test's user was rolled back."""
    result = await async_session.execute(
        select(User).where(User.username == "rollback_test")
    )
    found_user = result.scalar_one_or_none()
    # User from previous test should not exist
    assert found_user is None


async def test_async_client_fixture(async_client: AsyncClient):
    """Test that async_client fixture provides a valid HTTP client."""
    assert async_client is not None
    assert isinstance(async_client, AsyncClient)


@pytest.mark.integration
async def test_async_client_can_make_request(async_client: AsyncClient):
    """Test that async_client can make HTTP requests to the app."""
    # Make a request to the GraphQL endpoint
    response = await async_client.post(
        "/graphql",
        json={"query": "{ health }"},
    )
    # Should get a response (not 404 or 405)
    assert response.status_code in [200, 400]


async def test_seed_test_data_fixture(seed_test_data: dict):
    """Test that seed_test_data fixture creates test data."""
    assert "skills" in seed_test_data
    assert "users" in seed_test_data

    skills = seed_test_data["skills"]
    users = seed_test_data["users"]

    # Verify skills were created
    assert len(skills) == 3
    assert "Python" in skills
    assert "React" in skills
    assert "PostgreSQL" in skills

    # Verify users were created
    assert len(users) == 3
    assert "testuser1" in users
    assert "testuser2" in users
    assert "testuser3" in users

    # Verify user data
    user1 = users["testuser1"]
    assert user1.username == "testuser1"
    assert user1.display_name == "Test User 1"
    assert user1.builder_score == 50.0


async def test_seed_test_data_with_session(
    async_session: AsyncSession,
    seed_test_data: dict,
):
    """Test that seed_test_data can be queried via async_session."""
    # Query users from database
    result = await async_session.execute(select(User))
    users = result.scalars().all()

    # Should have 3 users from seed_test_data
    assert len(users) == 3

    # Verify usernames
    usernames = {user.username for user in users}
    assert usernames == {"testuser1", "testuser2", "testuser3"}
