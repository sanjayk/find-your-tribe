"""Tribe model with members and open roles."""

from typing import TYPE_CHECKING

from sqlalchemy import (
    Boolean,
    Column,
    DateTime,
    ForeignKey,
    Index,
    Integer,
    String,
    Table,
    Text,
    func,
)
from sqlalchemy import (
    Enum as SQLEnum,
)
from sqlalchemy.dialects.postgresql import JSONB, TSVECTOR
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base, TimestampMixin, ULIDMixin
from app.models.enums import MemberRole, MemberStatus, TribeStatus

if TYPE_CHECKING:
    from app.models.project import Project
    from app.models.user import User


# Association table for many-to-many relationship between tribes and users
tribe_members = Table(
    "tribe_members",
    Base.metadata,
    Column(
        "tribe_id",
        String(26),
        ForeignKey("tribes.id", ondelete="CASCADE"),
        primary_key=True,
    ),
    Column(
        "user_id",
        String(26),
        ForeignKey("users.id", ondelete="CASCADE"),
        primary_key=True,
    ),
    Column(
        "role",
        SQLEnum(MemberRole, values_callable=lambda x: [e.value for e in x]),
        nullable=False,
        default=MemberRole.MEMBER,
        server_default="member",
    ),
    Column(
        "status",
        SQLEnum(MemberStatus, values_callable=lambda x: [e.value for e in x]),
        nullable=False,
        default=MemberStatus.PENDING,
        server_default="pending",
    ),
    Column(
        "joined_at",
        DateTime(timezone=True),
        nullable=True,
    ),
    Column(
        "requested_at",
        DateTime(timezone=True),
        nullable=False,
        server_default=func.now(),
    ),
)


class Tribe(Base, ULIDMixin, TimestampMixin):
    """Represents a tribe with owner, members, and open roles."""

    __tablename__ = "tribes"

    # Core fields
    owner_id: Mapped[str] = mapped_column(
        String(26),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    name: Mapped[str] = mapped_column(
        String(100),
        nullable=False,
    )
    mission: Mapped[str | None] = mapped_column(
        Text,
        nullable=True,
    )
    status: Mapped[TribeStatus] = mapped_column(
        SQLEnum(TribeStatus, values_callable=lambda x: [e.value for e in x]),
        nullable=False,
        default=TribeStatus.OPEN,
        server_default="open",
    )
    max_members: Mapped[int] = mapped_column(
        Integer,
        nullable=False,
        default=8,
        server_default="8",
    )

    # Search
    search_vector: Mapped[str | None] = mapped_column(
        TSVECTOR,
        nullable=True,
    )

    # Relationships
    owner: Mapped["User"] = relationship(
        "User",
        foreign_keys=[owner_id],
    )
    members: Mapped[list["User"]] = relationship(
        "User",
        secondary=tribe_members,
    )
    open_roles: Mapped[list["TribeOpenRole"]] = relationship(
        "TribeOpenRole",
        back_populates="tribe",
        cascade="all, delete-orphan",
    )
    projects: Mapped[list["Project"]] = relationship(
        "Project",
        back_populates="tribe",
    )

    __table_args__ = (
        Index("ix_tribes_search_vector", "search_vector", postgresql_using="gin"),
        Index("ix_tribes_status", "status"),
    )


class TribeOpenRole(Base, ULIDMixin):
    """Represents an open role within a tribe."""

    __tablename__ = "tribe_open_roles"

    tribe_id: Mapped[str] = mapped_column(
        String(26),
        ForeignKey("tribes.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    title: Mapped[str] = mapped_column(
        String(100),
        nullable=False,
    )
    skills_needed: Mapped[list] = mapped_column(
        JSONB,
        nullable=False,
        default=list,
        server_default="[]",
    )
    filled: Mapped[bool] = mapped_column(
        Boolean,
        nullable=False,
        default=False,
        server_default="false",
    )
    filled_by: Mapped[str | None] = mapped_column(
        String(26),
        ForeignKey("users.id"),
        nullable=True,
    )

    # Relationships
    tribe: Mapped["Tribe"] = relationship(
        "Tribe",
        back_populates="open_roles",
    )
    filled_by_user: Mapped["User | None"] = relationship(
        "User",
        foreign_keys=[filled_by],
    )
