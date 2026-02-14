"""Skill model for the Find Your Tribe application."""

from typing import TYPE_CHECKING

from sqlalchemy import Enum as SQLEnum
from sqlalchemy import Index, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base, TimestampMixin, ULIDMixin
from app.models.enums import SkillCategory

if TYPE_CHECKING:
    from app.models.user import User


class Skill(Base, ULIDMixin, TimestampMixin):
    """Represents a skill that builders can have."""

    __tablename__ = "skills"

    name: Mapped[str] = mapped_column(
        String(100),
        unique=True,
        nullable=False,
    )
    slug: Mapped[str] = mapped_column(
        String(100),
        unique=True,
        nullable=False,
    )
    category: Mapped[SkillCategory] = mapped_column(
        SQLEnum(SkillCategory, values_callable=lambda x: [e.value for e in x]),
        nullable=False,
    )

    # Relationships
    users: Mapped[list["User"]] = relationship(
        "User",
        secondary="user_skills",
        back_populates="skills",
    )

    __table_args__ = (Index("ix_skills_slug", "slug"),)
