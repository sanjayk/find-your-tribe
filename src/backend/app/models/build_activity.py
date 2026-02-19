"""BuildActivity model — daily token burn records per user per project."""

from datetime import date
from typing import TYPE_CHECKING

from sqlalchemy import Date, ForeignKey, Index, Integer, String, UniqueConstraint, text
from sqlalchemy import Enum as SQLEnum
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base, TimestampMixin, ULIDMixin
from app.models.enums import BuildActivitySource, BurnVerification, TokenPrecision

if TYPE_CHECKING:
    from app.models.project import Project
    from app.models.user import User


class BuildActivity(Base, ULIDMixin, TimestampMixin):
    """Records daily token burn for a user, optionally attributed to a project."""

    __tablename__ = "build_activities"

    user_id: Mapped[str] = mapped_column(
        String(26), ForeignKey("users.id", ondelete="CASCADE"), nullable=False
    )
    project_id: Mapped[str | None] = mapped_column(
        String(26), ForeignKey("projects.id", ondelete="SET NULL"), nullable=True
    )
    activity_date: Mapped[date] = mapped_column(Date, nullable=False)
    tokens_burned: Mapped[int] = mapped_column(Integer, nullable=False)
    source: Mapped[str] = mapped_column(
        SQLEnum(BuildActivitySource, values_callable=lambda x: [e.value for e in x]),
        nullable=False,
    )
    verification: Mapped[str] = mapped_column(
        SQLEnum(BurnVerification, values_callable=lambda x: [e.value for e in x]),
        nullable=False,
        server_default="self_reported",
    )
    tool: Mapped[str | None] = mapped_column(String(50), nullable=True)
    session_id: Mapped[str | None] = mapped_column(String(100), nullable=True)
    token_precision: Mapped[str] = mapped_column(
        SQLEnum(TokenPrecision, values_callable=lambda x: [e.value for e in x]),
        nullable=False,
        server_default="approximate",
    )
    metadata_: Mapped[dict | None] = mapped_column("metadata", JSONB, default=dict)

    user: Mapped["User"] = relationship(back_populates="build_activities")
    project: Mapped["Project | None"] = relationship()

    __table_args__ = (
        UniqueConstraint(
            "user_id",
            "project_id",
            "activity_date",
            "source",
            name="uq_build_activity_per_day",
        ),
        Index("ix_build_activities_user_date", "user_id", "activity_date"),
        Index(
            "ix_build_activities_project",
            "project_id",
            postgresql_where=text("project_id IS NOT NULL"),
        ),
        Index(
            "ix_build_activities_session",
            "session_id",
            postgresql_where=text("session_id IS NOT NULL"),
        ),
        Index(
            "ix_build_activities_verification",
            "user_id",
            "verification",
        ),
    )
