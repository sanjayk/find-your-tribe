"""CollaboratorInviteToken model for project collaboration invitations."""

from __future__ import annotations

from datetime import datetime
from typing import TYPE_CHECKING

from sqlalchemy import DateTime, ForeignKey, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base, TimestampMixin, ULIDMixin

if TYPE_CHECKING:
    from app.models.project import Project
    from app.models.user import User


class CollaboratorInviteToken(Base, ULIDMixin, TimestampMixin):
    """A token for inviting collaborators to a project."""

    __tablename__ = "collaborator_invite_tokens"

    project_id: Mapped[str] = mapped_column(
        String(26),
        ForeignKey("projects.id", ondelete="CASCADE"),
        nullable=False,
    )
    invited_by: Mapped[str] = mapped_column(
        String(26),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
    )
    token: Mapped[str] = mapped_column(
        String(64),
        unique=True,
        nullable=False,
        index=True,
    )
    role: Mapped[str | None] = mapped_column(
        String(100),
        nullable=True,
    )
    expires_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
    )
    redeemed_by: Mapped[str | None] = mapped_column(
        String(26),
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
    )
    redeemed_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
    )

    # Relationships
    project: Mapped[Project] = relationship("Project")
    inviter: Mapped[User] = relationship(
        "User",
        foreign_keys=[invited_by],
    )
