"""Tests for FeedEventType GraphQL type."""

from datetime import UTC, datetime

import strawberry

from app.graphql.types.feed_event import FeedEventType
from app.models.enums import EventType


def test_feed_event_type_exists():
    """Test that FeedEventType exists and is a Strawberry type."""
    assert FeedEventType is not None
    assert hasattr(FeedEventType, "__strawberry_definition__")


def test_feed_event_type_has_required_fields():
    """Test that FeedEventType has all required fields."""
    fields = {
        field.name for field in FeedEventType.__strawberry_definition__.fields
    }

    # Core fields
    assert "id" in fields
    assert "event_type" in fields
    assert "target_type" in fields
    assert "target_id" in fields
    assert "metadata" in fields
    assert "created_at" in fields

    # Lazy fields
    assert "actor" in fields


def test_feed_event_type_field_types():
    """Test that FeedEventType fields have correct types."""
    field_map = {
        field.name: field for field in FeedEventType.__strawberry_definition__.fields
    }

    # String fields
    assert field_map["id"].type is str
    assert field_map["target_type"].type is str
    assert field_map["target_id"].type is str

    # Enum field (wrapped in Strawberry enum definition)
    event_type_field = field_map["event_type"]
    assert hasattr(event_type_field.type, "wrapped_cls")
    assert event_type_field.type.wrapped_cls is EventType

    # JSON field
    assert field_map["metadata"].type is strawberry.scalars.JSON

    # Datetime field
    assert field_map["created_at"].type is datetime


def test_feed_event_type_actor_field():
    """Test that actor field is a lazy resolver returning UserType."""
    field_map = {
        field.name: field for field in FeedEventType.__strawberry_definition__.fields
    }

    actor_field = field_map["actor"]
    # Check that actor is a field resolver
    assert actor_field.base_resolver is not None


def test_feed_event_type_instantiation():
    """Test that FeedEventType can be instantiated with required fields."""
    now = datetime.now(UTC)

    feed_event = FeedEventType(
        id="01HQZXYZ123456789ABCDEFGH",
        event_type=EventType.PROJECT_CREATED,
        target_type="project",
        target_id="01HQZXYZ123456789ABCDEFGH",
        metadata={"project_title": "New Project"},
        created_at=now,
    )

    assert feed_event.id == "01HQZXYZ123456789ABCDEFGH"
    assert feed_event.event_type == EventType.PROJECT_CREATED
    assert feed_event.target_type == "project"
    assert feed_event.target_id == "01HQZXYZ123456789ABCDEFGH"
    assert feed_event.metadata == {"project_title": "New Project"}
    assert feed_event.created_at == now


def test_feed_event_type_with_empty_metadata():
    """Test that FeedEventType can be instantiated with empty metadata."""
    now = datetime.now(UTC)

    feed_event = FeedEventType(
        id="01HQZXYZ123456789ABCDEFGH",
        event_type=EventType.BUILDER_JOINED,
        target_type="user",
        target_id="01HQZXYZ123456789ABCDEFGH",
        metadata={},
        created_at=now,
    )

    assert feed_event.id == "01HQZXYZ123456789ABCDEFGH"
    assert feed_event.event_type == EventType.BUILDER_JOINED
    assert feed_event.target_type == "user"
    assert feed_event.target_id == "01HQZXYZ123456789ABCDEFGH"
    assert feed_event.metadata == {}
    assert feed_event.created_at == now


def test_feed_event_type_actor_returns_none():
    """Test that actor field returns None (placeholder until dataloaders)."""
    now = datetime.now(UTC)

    feed_event = FeedEventType(
        id="01HQZXYZ123456789ABCDEFGH",
        event_type=EventType.PROJECT_SHIPPED,
        target_type="project",
        target_id="01HQZXYZ123456789ABCDEFGH",
        metadata={"stars": 50},
        created_at=now,
    )

    # The actor field returns None until proper dataloaders are implemented
    assert feed_event.actor() is None


def test_all_event_type_values():
    """Test FeedEventType with all possible event_type values."""
    now = datetime.now(UTC)

    for event_type in EventType:
        feed_event = FeedEventType(
            id="01HQZXYZ123456789ABCDEFGH",
            event_type=event_type,
            target_type="test",
            target_id="01HQZXYZ123456789ABCDEFGH",
            metadata={},
            created_at=now,
        )
        assert feed_event.event_type == event_type


def test_feed_event_type_with_complex_metadata():
    """Test FeedEventType with complex nested metadata."""
    now = datetime.now(UTC)

    complex_metadata = {
        "project_title": "AI Assistant",
        "tech_stack": ["Python", "FastAPI", "React"],
        "metrics": {
            "stars": 100,
            "contributors": 5,
        },
    }

    feed_event = FeedEventType(
        id="01HQZXYZ123456789ABCDEFGH",
        event_type=EventType.COLLABORATION_CONFIRMED,
        target_type="project",
        target_id="01HQZXYZ123456789ABCDEFGH",
        metadata=complex_metadata,
        created_at=now,
    )

    assert feed_event.metadata == complex_metadata
    assert feed_event.metadata["project_title"] == "AI Assistant"
    assert feed_event.metadata["tech_stack"] == ["Python", "FastAPI", "React"]
    assert feed_event.metadata["metrics"]["stars"] == 100


def test_feed_event_type_different_target_types():
    """Test FeedEventType with different target types."""
    now = datetime.now(UTC)

    target_types = ["project", "user", "tribe", "collaboration"]

    for target_type in target_types:
        feed_event = FeedEventType(
            id="01HQZXYZ123456789ABCDEFGH",
            event_type=EventType.PROJECT_CREATED,
            target_type=target_type,
            target_id="01HQZXYZ123456789ABCDEFGH",
            metadata={},
            created_at=now,
        )
        assert feed_event.target_type == target_type
