"""Tests for database base classes and mixins."""

from datetime import datetime

import pytest
from sqlalchemy import inspect, select

from app.db.base import Base, TimestampMixin, ULIDMixin


def test_base_exists():
    """Test that Base class exists and is a DeclarativeBase."""
    assert Base is not None
    assert hasattr(Base, "registry")
    assert hasattr(Base, "metadata")


def test_timestamp_mixin_has_created_at():
    """Test that TimestampMixin has created_at column."""
    assert hasattr(TimestampMixin, "created_at")


def test_timestamp_mixin_has_updated_at():
    """Test that TimestampMixin has updated_at column."""
    assert hasattr(TimestampMixin, "updated_at")


def test_ulid_mixin_has_id():
    """Test that ULIDMixin has id column."""
    assert hasattr(ULIDMixin, "id")


def test_model_with_timestamp_mixin():
    """Test creating a model with TimestampMixin."""
    from sqlalchemy.orm import Mapped, mapped_column

    class TestModel(Base, TimestampMixin):
        __tablename__ = "test_timestamps"

        id: Mapped[int] = mapped_column(primary_key=True)

    # Inspect the model to verify columns
    mapper = inspect(TestModel)
    columns = {col.key for col in mapper.columns}

    assert "created_at" in columns
    assert "updated_at" in columns

    # Check column properties
    created_at_col = mapper.columns["created_at"]
    assert created_at_col.type.python_type == datetime
    assert created_at_col.nullable is False
    assert created_at_col.server_default is not None

    updated_at_col = mapper.columns["updated_at"]
    assert updated_at_col.type.python_type == datetime
    assert updated_at_col.nullable is False
    assert updated_at_col.server_default is not None
    assert updated_at_col.onupdate is not None


def test_model_with_ulid_mixin():
    """Test creating a model with ULIDMixin."""

    class TestModel(Base, ULIDMixin):
        __tablename__ = "test_ulids"

    # Inspect the model to verify columns
    mapper = inspect(TestModel)
    columns = {col.key for col in mapper.columns}

    assert "id" in columns

    # Check column properties
    id_col = mapper.columns["id"]
    assert id_col.type.python_type is str
    assert id_col.primary_key is True
    assert id_col.default is not None


def test_model_with_both_mixins():
    """Test creating a model with both TimestampMixin and ULIDMixin."""

    class TestModel(Base, ULIDMixin, TimestampMixin):
        __tablename__ = "test_both"

    # Inspect the model to verify all columns
    mapper = inspect(TestModel)
    columns = {col.key for col in mapper.columns}

    assert "id" in columns
    assert "created_at" in columns
    assert "updated_at" in columns


def test_ulid_default_generates_valid_ulid():
    """Test that the ULID default callable generates valid ULIDs."""

    class TestModel(Base, ULIDMixin):
        __tablename__ = "test_ulid_generation"

    # Get the default callable
    mapper = inspect(TestModel)
    id_col = mapper.columns["id"]
    default_callable = id_col.default.arg

    # Generate two ULIDs
    ulid1 = default_callable(None)
    ulid2 = default_callable(None)

    # Verify they are strings of length 26
    assert isinstance(ulid1, str)
    assert len(ulid1) == 26
    assert isinstance(ulid2, str)
    assert len(ulid2) == 26

    # Verify they are unique (extremely unlikely to collide)
    assert ulid1 != ulid2

    # Verify they only contain valid ULID characters (base32)
    valid_chars = "0123456789ABCDEFGHJKMNPQRSTVWXYZ"
    assert all(c in valid_chars for c in ulid1)
    assert all(c in valid_chars for c in ulid2)


@pytest.mark.asyncio
@pytest.mark.skip(reason="Requires running database")
async def test_timestamp_mixin_database_integration():
    """Test that TimestampMixin works correctly with database operations."""
    from app.db.engine import async_session_factory, engine

    class TestModel(Base, ULIDMixin, TimestampMixin):
        __tablename__ = "test_timestamp_integration"

    # Create table
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    try:
        # Create an instance
        async with async_session_factory() as session:
            instance = TestModel()
            session.add(instance)
            await session.commit()
            await session.refresh(instance)

            # Verify timestamps were set
            assert instance.created_at is not None
            assert instance.updated_at is not None
            assert isinstance(instance.created_at, datetime)
            assert isinstance(instance.updated_at, datetime)

            created_at_original = instance.created_at

        # Update the instance
        async with async_session_factory() as session:
            result = await session.execute(
                select(TestModel).where(TestModel.id == instance.id)
            )
            instance = result.scalar_one()

            # Modify something to trigger update (would need actual columns)
            await session.commit()

            # Verify created_at unchanged, updated_at changed
            assert instance.created_at == created_at_original
            # Note: updated_at comparison would need actual column modification
    finally:
        # Clean up
        async with engine.begin() as conn:
            await conn.run_sync(Base.metadata.drop_all)


@pytest.mark.asyncio
@pytest.mark.skip(reason="Requires running database")
async def test_ulid_mixin_database_integration():
    """Test that ULIDMixin works correctly with database operations."""
    from app.db.engine import async_session_factory, engine

    class TestModel(Base, ULIDMixin):
        __tablename__ = "test_ulid_integration"

    # Create table
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    try:
        # Create two instances
        async with async_session_factory() as session:
            instance1 = TestModel()
            instance2 = TestModel()
            session.add(instance1)
            session.add(instance2)
            await session.commit()

            # Verify IDs were generated and are unique
            assert instance1.id is not None
            assert instance2.id is not None
            assert isinstance(instance1.id, str)
            assert len(instance1.id) == 26
            assert instance1.id != instance2.id
    finally:
        # Clean up
        async with engine.begin() as conn:
            await conn.run_sync(Base.metadata.drop_all)
