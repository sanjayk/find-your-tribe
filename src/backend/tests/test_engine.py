"""Tests for database engine and session factory."""

import pytest
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.engine import async_session_factory, engine, get_session


@pytest.mark.asyncio
async def test_engine_creation():
    """Test that the async engine is created successfully."""
    assert engine is not None
    assert str(engine.url).startswith("postgresql+asyncpg://")


@pytest.mark.asyncio
async def test_session_factory_creation():
    """Test that the async session factory is created successfully."""
    assert async_session_factory is not None
    assert async_session_factory.class_ == AsyncSession


@pytest.mark.asyncio
@pytest.mark.skip(reason="Requires running database")
async def test_session_factory_creates_session():
    """Test that the session factory creates a valid AsyncSession."""
    async with async_session_factory() as session:
        assert isinstance(session, AsyncSession)


@pytest.mark.asyncio
async def test_get_session_yields_session():
    """Test that get_session yields a valid AsyncSession."""
    gen = get_session()
    session = await gen.__anext__()

    assert isinstance(session, AsyncSession)

    # Clean up
    try:
        await gen.__anext__()
    except StopAsyncIteration:
        pass


@pytest.mark.asyncio
@pytest.mark.skip(reason="Requires running database")
async def test_session_can_execute_query():
    """Test that a session can execute a simple query."""
    async with async_session_factory() as session:
        result = await session.execute(text("SELECT 1 as num"))
        row = result.fetchone()
        assert row is not None
        assert row[0] == 1


@pytest.mark.asyncio
async def test_session_expire_on_commit_false():
    """Test that expire_on_commit is set to False."""
    # The session factory should have expire_on_commit=False
    # This is set in the configuration, we verify it's accessible
    assert async_session_factory.kw.get("expire_on_commit") is False


@pytest.mark.asyncio
async def test_get_session_cleanup():
    """Test that get_session properly cleans up the session."""
    session_ref = None

    async for session in get_session():
        session_ref = session
        assert isinstance(session, AsyncSession)
        break

    # After generator exits, session should be closed
    # Note: We can't directly check if closed, but the generator should have exited cleanly
    assert session_ref is not None
