"""Tests for FeedEvent model."""

from sqlalchemy import inspect

from app.db.base import Base
from app.models.enums import EventType
from app.models.feed_event import FeedEvent


def test_feed_event_model_exists():
    """Test that FeedEvent model exists and is a subclass of Base."""
    assert FeedEvent is not None
    assert issubclass(FeedEvent, Base)


def test_feed_event_has_required_columns():
    """Test that FeedEvent has all required columns."""
    mapper = inspect(FeedEvent)
    columns = {col.key for col in mapper.columns}

    # Core columns
    assert "id" in columns
    assert "event_type" in columns
    assert "actor_id" in columns
    assert "target_type" in columns
    assert "target_id" in columns
    assert "event_metadata" in columns
    assert "created_at" in columns


def test_feed_event_id_column():
    """Test that id column is String(26) and primary key."""
    mapper = inspect(FeedEvent)
    id_col = mapper.columns["id"]

    assert id_col.primary_key
    assert str(id_col.type) == "VARCHAR(26)"


def test_feed_event_event_type_column():
    """Test that event_type is EventType enum and not nullable."""
    mapper = inspect(FeedEvent)
    event_type_col = mapper.columns["event_type"]

    assert not event_type_col.nullable
    # Check that it's an Enum type
    assert event_type_col.type.__class__.__name__ == "Enum"


def test_feed_event_actor_id_column():
    """Test that actor_id is String(26), not nullable, and has FK."""
    mapper = inspect(FeedEvent)
    actor_id_col = mapper.columns["actor_id"]

    assert not actor_id_col.nullable
    assert str(actor_id_col.type) == "VARCHAR(26)"

    # Check foreign key
    fks = list(actor_id_col.foreign_keys)
    assert len(fks) == 1
    fk = fks[0]
    assert fk.column.table.name == "users"
    assert fk.column.name == "id"
    assert fk.ondelete == "CASCADE"


def test_feed_event_target_type_column():
    """Test that target_type is String(20) and not nullable."""
    mapper = inspect(FeedEvent)
    target_type_col = mapper.columns["target_type"]

    assert not target_type_col.nullable
    assert str(target_type_col.type) == "VARCHAR(20)"


def test_feed_event_target_id_column():
    """Test that target_id is String(26) and not nullable."""
    mapper = inspect(FeedEvent)
    target_id_col = mapper.columns["target_id"]

    assert not target_id_col.nullable
    assert str(target_id_col.type) == "VARCHAR(26)"


def test_feed_event_event_metadata_column():
    """Test that event_metadata is JSONB with default {}."""
    mapper = inspect(FeedEvent)
    metadata_col = mapper.columns["event_metadata"]

    assert not metadata_col.nullable
    assert "JSONB" in str(metadata_col.type)
    # Check for server_default
    assert metadata_col.server_default is not None


def test_feed_event_created_at_column():
    """Test that created_at is DateTime with timezone and has server_default."""
    mapper = inspect(FeedEvent)
    created_at_col = mapper.columns["created_at"]

    assert not created_at_col.nullable
    assert created_at_col.type.timezone
    assert created_at_col.server_default is not None


def test_feed_event_has_indexes():
    """Test that FeedEvent has the required indexes."""
    mapper = inspect(FeedEvent)
    table = mapper.local_table

    # Get all index names
    index_names = {idx.name for idx in table.indexes}

    # Check for expected indexes
    assert "ix_feed_events_created_at_desc" in index_names
    assert "ix_feed_events_event_type_created_at" in index_names
    assert "ix_feed_events_actor_id" in index_names


def test_feed_event_created_at_desc_index():
    """Test that created_at index is configured correctly."""
    mapper = inspect(FeedEvent)
    table = mapper.local_table

    # Find the created_at descending index
    created_at_index = None
    for idx in table.indexes:
        if idx.name == "ix_feed_events_created_at_desc":
            created_at_index = idx
            break

    assert created_at_index is not None
    # Check that created_at is in the index
    assert len(created_at_index.columns) == 1
    assert "created_at" in [col.name for col in created_at_index.columns]


def test_feed_event_composite_index():
    """Test that event_type + created_at composite index exists."""
    mapper = inspect(FeedEvent)
    table = mapper.local_table

    # Find the composite index
    composite_index = None
    for idx in table.indexes:
        if idx.name == "ix_feed_events_event_type_created_at":
            composite_index = idx
            break

    assert composite_index is not None
    # Check that both columns are in the index
    assert len(composite_index.columns) == 2
    col_names = [col.name for col in composite_index.columns]
    assert "event_type" in col_names
    assert "created_at" in col_names


def test_feed_event_actor_id_index():
    """Test that actor_id index exists."""
    mapper = inspect(FeedEvent)
    table = mapper.local_table

    # Find the actor_id index
    actor_index = None
    for idx in table.indexes:
        if idx.name == "ix_feed_events_actor_id":
            actor_index = idx
            break

    assert actor_index is not None
    assert len(actor_index.columns) == 1
    assert "actor_id" in [col.name for col in actor_index.columns]


def test_feed_event_has_actor_relationship():
    """Test that FeedEvent has a relationship to User."""
    mapper = inspect(FeedEvent)
    relationships = {rel.key for rel in mapper.relationships}

    assert "actor" in relationships

    # Check the relationship target
    actor_rel = mapper.relationships["actor"]
    assert actor_rel.mapper.class_.__name__ == "User"


def test_feed_event_table_name():
    """Test that FeedEvent maps to 'feed_events' table."""
    assert FeedEvent.__tablename__ == "feed_events"


def test_event_type_enum_values():
    """Test that EventType enum has expected values."""
    expected_types = {
        "PROJECT_CREATED",
        "PROJECT_SHIPPED",
        "COLLABORATION_CONFIRMED",
        "TRIBE_CREATED",
        "MEMBER_JOINED_TRIBE",
        "BUILDER_JOINED",
        "PROJECT_UPDATE",
        "TRIBE_ANNOUNCEMENT",
    }

    actual_types = {member.name for member in EventType}
    assert actual_types == expected_types
