"""ProjectMilestone model for tracking project timeline events."""

from __future__ import annotations

import datetime
from typing import TYPE_CHECKING

from sqlalchemy import Date, ForeignKey, Index, String
from sqlalchemy import Enum as SQLEnum
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base, TimestampMixin, ULIDMixin
from app.models.enums import MilestoneType

if TYPE_CHECKING:
    from app.models.project import Project


class ProjectMilestone(Base, ULIDMixin, TimestampMixin):
    """A milestone event in a project's timeline."""

    __tablename__ = "project_milestones"

    project_id: Mapped[str] = mapped_column(
        String(26),
        ForeignKey("projects.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    title: Mapped[str] = mapped_column(
        String(200),
        nullable=False,
    )
    date: Mapped[datetime.date] = mapped_column(
        Date,
        nullable=False,
    )
    milestone_type: Mapped[MilestoneType] = mapped_column(
        SQLEnum(MilestoneType, values_callable=lambda x: [e.value for e in x]),
        nullable=False,
        default=MilestoneType.MILESTONE,
        server_default="milestone",
    )

    # Relationships
    project: Mapped[Project] = relationship(
        "Project",
        back_populates="milestones",
    )

    __table_args__ = (
        Index("ix_project_milestones_project_date", "project_id", "date"),
    )
