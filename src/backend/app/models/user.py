"""User model with authentication and profile data."""

from datetime import datetime
from typing import TYPE_CHECKING

from pgvector.sqlalchemy import Vector
from sqlalchemy import (
    Boolean,
    Column,
    DateTime,
    Float,
    ForeignKey,
    Index,
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
from app.models.enums import AgentWorkflowStyle, AvailabilityStatus, UserRole

if TYPE_CHECKING:
    from app.models.project import Project
    from app.models.skill import Skill
    from app.models.tribe import Tribe


# Association table for many-to-many relationship between users and skills
user_skills = Table(
    "user_skills",
    Base.metadata,
    Column(
        "user_id",
        String(26),
        ForeignKey("users.id", ondelete="CASCADE"),
        primary_key=True,
    ),
    Column(
        "skill_id",
        String(26),
        ForeignKey("skills.id", ondelete="CASCADE"),
        primary_key=True,
    ),
    Column(
        "added_at",
        DateTime(timezone=True),
        nullable=False,
        server_default=func.now(),
    ),
)


class User(Base, ULIDMixin, TimestampMixin):
    """Represents a user account with authentication and profile data."""

    __tablename__ = "users"

    # Authentication
    email: Mapped[str] = mapped_column(
        String(255),
        unique=True,
        nullable=False,
        index=True,
    )
    password_hash: Mapped[str | None] = mapped_column(
        String(255),
        nullable=True,
    )

    # Profile
    username: Mapped[str] = mapped_column(
        String(50),
        unique=True,
        nullable=False,
        index=True,
    )
    display_name: Mapped[str] = mapped_column(
        String(100),
        nullable=False,
    )
    avatar_url: Mapped[str | None] = mapped_column(
        String(500),
        nullable=True,
    )
    headline: Mapped[str | None] = mapped_column(
        String(200),
        nullable=True,
    )
    primary_role: Mapped[UserRole | None] = mapped_column(
        SQLEnum(UserRole, values_callable=lambda x: [e.value for e in x]),
        nullable=True,
    )
    timezone: Mapped[str | None] = mapped_column(
        String(50),
        nullable=True,
    )
    availability_status: Mapped[AvailabilityStatus] = mapped_column(
        SQLEnum(AvailabilityStatus, values_callable=lambda x: [e.value for e in x]),
        nullable=False,
        default=AvailabilityStatus.JUST_BROWSING,
        server_default="just_browsing",
    )
    builder_score: Mapped[float] = mapped_column(
        Float,
        nullable=False,
        default=0.0,
        server_default="0.0",
    )
    bio: Mapped[str | None] = mapped_column(
        Text,
        nullable=True,
    )
    contact_links: Mapped[dict] = mapped_column(
        JSONB,
        nullable=False,
        default=dict,
        server_default="{}",
    )

    # Agent collaboration
    agent_tools: Mapped[list] = mapped_column(
        JSONB,
        nullable=False,
        default=list,
        server_default="[]",
    )
    agent_workflow_style: Mapped[AgentWorkflowStyle | None] = mapped_column(
        SQLEnum(AgentWorkflowStyle, values_callable=lambda x: [e.value for e in x]),
        nullable=True,
    )
    human_agent_ratio: Mapped[float | None] = mapped_column(
        Float,
        nullable=True,
    )

    # GitHub integration
    github_username: Mapped[str | None] = mapped_column(
        String(100),
        unique=True,
        nullable=True,
    )
    github_access_token_encrypted: Mapped[str | None] = mapped_column(
        String(500),
        nullable=True,
    )

    # Onboarding
    onboarding_completed: Mapped[bool] = mapped_column(
        Boolean,
        nullable=False,
        default=False,
        server_default="false",
    )

    # Search
    search_vector: Mapped[str | None] = mapped_column(
        TSVECTOR,
        nullable=True,
    )

    # Embeddings for semantic search
    embedding: Mapped[Vector | None] = mapped_column(
        Vector(1536),
        nullable=True,
    )

    # Relationships
    skills: Mapped[list["Skill"]] = relationship(
        "Skill",
        secondary=user_skills,
        back_populates="users",
    )
    refresh_tokens: Mapped[list["RefreshToken"]] = relationship(
        "RefreshToken",
        back_populates="user",
        cascade="all, delete-orphan",
    )
    owned_projects: Mapped[list["Project"]] = relationship(
        "Project",
        back_populates="owner",
        cascade="all, delete-orphan",
    )
    collaborated_projects: Mapped[list["Project"]] = relationship(
        "Project",
        secondary="project_collaborators",
        back_populates="collaborators",
    )
    tribes: Mapped[list["Tribe"]] = relationship(
        "Tribe",
        secondary="tribe_members",
        viewonly=True,
    )

    __table_args__ = (
        Index("ix_users_search_vector", "search_vector", postgresql_using="gin"),
        Index(
            "ix_users_embedding",
            "embedding",
            postgresql_using="hnsw",
            postgresql_with={"m": 16, "ef_construction": 64},
            postgresql_ops={"embedding": "vector_cosine_ops"},
        ),
        Index("ix_users_primary_role_availability", "primary_role", "availability_status"),
    )


class RefreshToken(Base, ULIDMixin):
    """Represents a refresh token for authentication."""

    __tablename__ = "refresh_tokens"

    user_id: Mapped[str] = mapped_column(
        String(26),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    token_hash: Mapped[str] = mapped_column(
        String(64),
        unique=True,
        nullable=False,
    )
    expires_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
    )
    revoked_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        server_default="now()",
    )

    # Relationship
    user: Mapped["User"] = relationship(
        "User",
        back_populates="refresh_tokens",
    )
