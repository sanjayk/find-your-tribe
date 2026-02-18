"""Pytest configuration and fixtures for Find Your Tribe backend tests."""

from collections.abc import AsyncGenerator
from typing import Any
from urllib.parse import urlparse, urlunparse

import pytest
from httpx import ASGITransport, AsyncClient
from sqlalchemy import event
from sqlalchemy.ext.asyncio import AsyncConnection, AsyncEngine, AsyncSession, create_async_engine
from sqlalchemy.pool import NullPool

from app.config import settings
from app.db.base import Base
from app.main import app
from app.models.enums import AvailabilityStatus, SkillCategory, UserRole
from app.models.skill import Skill
from app.models.user import User, user_skills


def _make_test_database_url(url: str) -> str:
    """Derive a test database URL by appending '_test' to the database name.

    Parses the given database URL and modifies the path component to add
    a '_test' suffix to the database name, ensuring tests never touch the
    development database.

    Args:
        url: The original database URL.

    Returns:
        A new URL string pointing to the test database.
    """
    parsed = urlparse(url)
    # parsed.path is like "/tribe" — append "_test"
    test_path = parsed.path + "_test"
    return urlunparse(parsed._replace(path=test_path))


@pytest.fixture(autouse=True)
async def _reset_app_engine(request):
    """Discard the app's singleton engine pool between tests.

    Tests that import ``from app.db.engine import engine`` use a module-level
    singleton.  Its pooled connections are bound to whatever event loop was
    active when they were created.  pytest-asyncio gives each test function its
    own loop, so stale connections cause "attached to a different loop" errors.

    Skipped for tests using the conftest's ``async_engine``/``async_session``
    fixtures, which create their own NullPool engine and don't need this.
    """
    uses_conftest_engine = (
        "async_engine" in request.fixturenames
        or "async_session" in request.fixturenames
    )
    if uses_conftest_engine:
        yield
        return

    from app.db.engine import engine

    await engine.dispose(close=False)
    yield
    await engine.dispose(close=False)


@pytest.fixture(scope="session")
def test_database_url() -> str:
    """
    Test database URL.

    Derives a separate test database by appending '_test' to the dev database
    name. For example, 'tribe' becomes 'tribe_test'. This ensures tests never
    destroy development data.

    Returns:
        Database URL string for testing (e.g. postgresql+asyncpg://tribe:tribe@localhost:5433/tribe_test).
    """
    return _make_test_database_url(settings.database_url)


@pytest.fixture
async def async_engine(test_database_url: str) -> AsyncGenerator[AsyncEngine, None]:
    """
    Create async engine for testing.

    Uses NullPool to avoid connection pooling issues in tests.
    Each test gets a fresh engine instance. Tables are created idempotently
    with checkfirst=True at startup; no teardown drop is performed.

    Args:
        test_database_url: Database URL from test_database_url fixture.

    Yields:
        AsyncEngine: SQLAlchemy async engine for testing.
    """
    engine = create_async_engine(
        test_database_url,
        poolclass=NullPool,  # Disable pooling for tests
        echo=False,  # Don't log SQL in tests (can be enabled for debugging)
    )

    # Create all tables idempotently (skips tables that already exist)
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all, checkfirst=True)

    yield engine

    await engine.dispose()


@pytest.fixture
async def async_session(async_engine: AsyncEngine) -> AsyncGenerator[AsyncSession, None]:
    """
    Create async session with transaction rollback for testing.

    Each test gets a fresh session within a transaction that is rolled back
    after the test completes. This ensures test isolation without needing to
    truncate tables between tests.

    Uses the nested transaction pattern:
    - Outer transaction is rolled back after test
    - Inner savepoint allows session.commit() to work during tests

    Args:
        async_engine: AsyncEngine from async_engine fixture.

    Yields:
        AsyncSession: Database session that will be rolled back after test.
    """
    # Start a connection
    connection: AsyncConnection = await async_engine.connect()

    # Begin a transaction
    transaction = await connection.begin()

    # Create session bound to this connection
    session = AsyncSession(
        bind=connection,
        expire_on_commit=False,
        autoflush=False,
        autocommit=False,
    )

    # Begin a nested transaction (savepoint)
    # This allows session.commit() to work in tests without committing the outer transaction
    await connection.begin_nested()

    # If the application code calls session.commit(), it will commit the savepoint
    # We need to recreate the savepoint for subsequent operations
    @event.listens_for(session.sync_session, "after_transaction_end")
    def restart_savepoint(session, transaction):
        """Recreate savepoint after each commit in tests."""
        if transaction.nested and not transaction._parent.nested:
            # Expired
            session.expire_all()
            session.begin_nested()

    yield session

    # Rollback the transaction (discards all changes made during test)
    await session.close()
    await transaction.rollback()
    await connection.close()


@pytest.fixture
async def async_client(async_session: AsyncSession) -> AsyncGenerator[AsyncClient, None]:
    """
    Create async HTTP client for testing FastAPI application.

    The client is configured to use the test session from async_session fixture,
    ensuring that all database operations during HTTP requests use the same
    transactional session that will be rolled back after the test.

    Args:
        async_session: AsyncSession from async_session fixture.

    Yields:
        AsyncClient: HTTPX async client for making requests to FastAPI app.
    """
    # Override the get_session dependency to use our test session
    async def override_get_session() -> AsyncGenerator[AsyncSession, None]:
        yield async_session

    from app.db.engine import get_session
    app.dependency_overrides[get_session] = override_get_session

    # Create async client
    async with AsyncClient(
        transport=ASGITransport(app=app),
        base_url="http://testserver",
    ) as client:
        yield client

    # Clean up dependency overrides
    app.dependency_overrides.clear()


@pytest.fixture
async def seed_test_data(async_session: AsyncSession) -> dict[str, Any]:
    """
    Populate minimal test data in the database.

    Creates a basic set of test data including:
    - 3 skills
    - 3 users with different roles and availability
    - Skill associations for users

    This provides a minimal dataset for integration tests without needing
    to seed the full development dataset.

    Args:
        async_session: AsyncSession from async_session fixture.

    Returns:
        Dictionary containing IDs and references to created test data:
        - skills: dict mapping skill name to Skill object
        - users: dict mapping username to User object
    """
    # Create skills
    skills_data = [
        {"name": "Python", "slug": "python", "category": SkillCategory.ENGINEERING},
        {"name": "React", "slug": "react", "category": SkillCategory.ENGINEERING},
        {"name": "PostgreSQL", "slug": "postgresql", "category": SkillCategory.DATA},
    ]

    skills = {}
    for skill_data in skills_data:
        skill = Skill(**skill_data)
        async_session.add(skill)
        skills[skill_data["name"]] = skill

    await async_session.flush()  # Flush to generate IDs

    # Create users
    users_data = [
        {
            "username": "testuser1",
            "display_name": "Test User 1",
            "email": "testuser1@example.com",
            "headline": "Full-Stack Developer",
            "bio": "Test user for integration tests",
            "primary_role": UserRole.ENGINEER,
            "availability_status": AvailabilityStatus.OPEN_TO_TRIBE,
            "builder_score": 50.0,
            "contact_links": {"github_username": "testuser1"},
            "skills": ["Python", "React"],
        },
        {
            "username": "testuser2",
            "display_name": "Test User 2",
            "email": "testuser2@example.com",
            "headline": "Product Designer",
            "bio": "Test designer for integration tests",
            "primary_role": UserRole.DESIGNER,
            "availability_status": AvailabilityStatus.AVAILABLE_FOR_PROJECTS,
            "builder_score": 40.0,
            "contact_links": {"github_username": "testuser2"},
            "skills": ["React"],
        },
        {
            "username": "testuser3",
            "display_name": "Test User 3",
            "email": "testuser3@example.com",
            "headline": "Backend Engineer",
            "bio": "Test backend engineer for integration tests",
            "primary_role": UserRole.ENGINEER,
            "availability_status": AvailabilityStatus.JUST_BROWSING,
            "builder_score": 60.0,
            "contact_links": {"github_username": "testuser3"},
            "skills": ["Python", "PostgreSQL"],
        },
    ]

    users = {}
    for user_data in users_data:
        # Extract skills before creating user
        skill_names = user_data.pop("skills")

        user = User(**user_data)
        async_session.add(user)
        await async_session.flush()  # Flush to generate ID

        # Add skill associations
        for skill_name in skill_names:
            if skill_name in skills:
                stmt = user_skills.insert().values(
                    user_id=user.id,
                    skill_id=skills[skill_name].id,
                )
                await async_session.execute(stmt)

        users[user_data["username"]] = user

    await async_session.commit()

    return {
        "skills": skills,
        "users": users,
    }
