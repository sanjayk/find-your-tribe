"""FeedEvent model for activity feed."""

from datetime import datetime
from typing import TYPE_CHECKING

from sqlalchemy import DateTime, ForeignKey, Index, String
from sqlalchemy import Enum as SQLEnum
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base, ULIDMixin
from app.models.enums import EventType

if TYPE_CHECKING:
    from app.models.user import User


class FeedEvent(Base, ULIDMixin):
    """Represents an activity event in the feed."""

    __tablename__ = "feed_events"

    # Event metadata
    event_type: Mapped[EventType] = mapped_column(
        SQLEnum(EventType, values_callable=lambda x: [e.value for e in x]),
        nullable=False,
    )

    # Actor
    actor_id: Mapped[str] = mapped_column(
        String(26),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
    )

    # Target (polymorphic reference)
    target_type: Mapped[str] = mapped_column(
        String(20),
        nullable=False,
    )
    target_id: Mapped[str] = mapped_column(
        String(26),
        nullable=False,
    )

    # Additional data (named event_metadata to avoid SQLAlchemy reserved name)
    event_metadata: Mapped[dict] = mapped_column(
        JSONB,
        nullable=False,
        default=dict,
        server_default="{}",
    )

    # Timestamp
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        server_default="now()",
    )

    # Relationships
    actor: Mapped["User"] = relationship(
        "User",
    )

    __table_args__ = (
        # Index for time-ordered feed queries (descending for recent first)
        Index("ix_feed_events_created_at_desc", "created_at", postgresql_ops={"created_at": "DESC"}),
        # Composite index for filtering by event type and time
        Index("ix_feed_events_event_type_created_at", "event_type", "created_at"),
        # Index for actor-specific queries
        Index("ix_feed_events_actor_id", "actor_id"),
    )
