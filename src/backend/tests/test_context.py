"""Tests for GraphQL context."""

from unittest.mock import AsyncMock, MagicMock

import pytest
from sqlalchemy.ext.asyncio import AsyncSession

from app.graphql.context import Context, context_getter


def test_context_dataclass_creation():
    """Test that Context dataclass can be instantiated."""
    mock_session = MagicMock(spec=AsyncSession)
    context = Context(session=mock_session, current_user_id="test-user-id")

    assert context.session is mock_session
    assert context.current_user_id == "test-user-id"


def test_context_dataclass_default_user_id():
    """Test that current_user_id defaults to None."""
    mock_session = MagicMock(spec=AsyncSession)
    context = Context(session=mock_session)

    assert context.session is mock_session
    assert context.current_user_id is None


def test_context_dataclass_none_user_id():
    """Test that current_user_id can be explicitly set to None."""
    mock_session = MagicMock(spec=AsyncSession)
    context = Context(session=mock_session, current_user_id=None)

    assert context.session is mock_session
    assert context.current_user_id is None


@pytest.mark.asyncio
async def test_context_getter_returns_context():
    """Test that context_getter returns a Context instance."""
    mock_request = MagicMock()
    mock_session = MagicMock(spec=AsyncSession)

    context = await context_getter(request=mock_request, session=mock_session)

    assert isinstance(context, Context)
    assert context.session is mock_session


@pytest.mark.asyncio
async def test_context_getter_no_user_by_default():
    """Test that context_getter returns None for current_user_id by default."""
    mock_request = MagicMock()
    mock_session = MagicMock(spec=AsyncSession)

    context = await context_getter(request=mock_request, session=mock_session)

    assert context.current_user_id is None


@pytest.mark.asyncio
async def test_context_getter_with_async_session():
    """Test that context_getter works with a real AsyncSession spec."""
    mock_request = MagicMock()
    # Create a proper async session mock
    mock_session = AsyncMock(spec=AsyncSession)

    context = await context_getter(request=mock_request, session=mock_session)

    assert isinstance(context, Context)
    assert context.session is mock_session
    assert context.current_user_id is None


@pytest.mark.asyncio
async def test_context_getter_accepts_request_state():
    """Test that context_getter accepts request with state (for future auth)."""
    mock_request = MagicMock()
    mock_request.state = MagicMock()
    mock_request.state.user_id = "future-user-id"  # Future use case
    mock_session = MagicMock(spec=AsyncSession)

    # Currently, context_getter doesn't extract from request.state
    # but it should accept it without errors
    context = await context_getter(request=mock_request, session=mock_session)

    assert isinstance(context, Context)
    # Currently returns None, will be updated when auth is implemented
    assert context.current_user_id is None
