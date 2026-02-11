"""Skill model for the Find Your Tribe application."""

from sqlalchemy import Enum as SQLEnum
from sqlalchemy import Index, String
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base, TimestampMixin, ULIDMixin
from app.models.enums import SkillCategory


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
        index=True,
    )
    category: Mapped[SkillCategory] = mapped_column(
        SQLEnum(SkillCategory),
        nullable=False,
    )

    __table_args__ = (Index("ix_skills_slug", "slug"),)
