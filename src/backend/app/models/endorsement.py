"""Endorsement model for peer endorsements."""

from typing import TYPE_CHECKING

from sqlalchemy import DateTime, ForeignKey, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base, ULIDMixin

if TYPE_CHECKING:
    from app.models.project import Project
    from app.models.user import User


class Endorsement(Base, ULIDMixin):
    """Represents a peer endorsement from one user to another."""

    __tablename__ = "endorsements"

    from_user_id: Mapped[str] = mapped_column(
        String(26),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    to_user_id: Mapped[str] = mapped_column(
        String(26),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    text: Mapped[str] = mapped_column(
        Text,
        nullable=False,
    )
    project_id: Mapped[str | None] = mapped_column(
        String(26),
        ForeignKey("projects.id", ondelete="SET NULL"),
        nullable=True,
    )
    created_at: Mapped[str] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        server_default=func.now(),
    )

    # Relationships
    from_user: Mapped["User"] = relationship(
        "User",
        foreign_keys=[from_user_id],
    )
    to_user: Mapped["User"] = relationship(
        "User",
        foreign_keys=[to_user_id],
        back_populates="endorsements_received",
    )
    project: Mapped["Project | None"] = relationship(
        "Project",
        foreign_keys=[project_id],
    )
