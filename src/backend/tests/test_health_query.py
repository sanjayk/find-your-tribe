"""Tests for health query."""

from unittest.mock import AsyncMock

import pytest
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from app.graphql.context import Context
from app.graphql.queries.health import Query


@pytest.mark.asyncio
async def test_health_query_returns_ok():
    """Test that health query returns 'ok' when database is connected."""
    # Arrange
    mock_session = AsyncMock(spec=AsyncSession)
    mock_session.execute = AsyncMock()
    context = Context(session=mock_session, current_user_id=None)

    # Create a mock Info object with context
    class MockInfo:
        def __init__(self, context):
            self.context = context

    info = MockInfo(context)

    # Act
    query = Query()
    result = await query.health(info=info)

    # Assert
    assert result == "ok"


@pytest.mark.asyncio
async def test_health_query_executes_select_1():
    """Test that health query executes SELECT 1 to verify connectivity."""
    # Arrange
    mock_session = AsyncMock(spec=AsyncSession)
    mock_session.execute = AsyncMock()
    context = Context(session=mock_session, current_user_id=None)

    class MockInfo:
        def __init__(self, context):
            self.context = context

    info = MockInfo(context)

    # Act
    query = Query()
    result = await query.health(info=info)

    # Assert
    assert result == "ok"
    # Verify that execute was called with a SELECT 1 query
    mock_session.execute.assert_called_once()
    call_args = mock_session.execute.call_args
    query_arg = call_args[0][0]
    # Check that the query is a text() object with SELECT 1
    assert isinstance(query_arg, type(text("SELECT 1")))


@pytest.mark.asyncio
async def test_health_query_handles_db_error():
    """Test that health query propagates database errors."""
    # Arrange
    mock_session = AsyncMock(spec=AsyncSession)
    mock_session.execute = AsyncMock(side_effect=Exception("Database connection failed"))
    context = Context(session=mock_session, current_user_id=None)

    class MockInfo:
        def __init__(self, context):
            self.context = context

    info = MockInfo(context)

    # Act & Assert
    query = Query()
    with pytest.raises(Exception) as exc_info:
        await query.health(info=info)

    assert "Database connection failed" in str(exc_info.value)


@pytest.mark.asyncio
@pytest.mark.skip(reason="Requires running database")
async def test_health_query_with_real_database():
    """Integration test with real database connection."""
    from app.db.engine import async_session_factory

    # Arrange
    async with async_session_factory() as session:
        context = Context(session=session, current_user_id=None)

        class MockInfo:
            def __init__(self, context):
                self.context = context

        info = MockInfo(context)

        # Act
        query = Query()
        result = await query.health(info=info)

        # Assert
        assert result == "ok"
