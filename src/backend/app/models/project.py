"""Project model with collaborators."""

from typing import TYPE_CHECKING

from pgvector.sqlalchemy import Vector
from sqlalchemy import (
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
from app.models.enums import CollaboratorStatus, ProjectStatus

if TYPE_CHECKING:
    from app.models.user import User


# Association table for many-to-many relationship between projects and users
project_collaborators = Table(
    "project_collaborators",
    Base.metadata,
    Column(
        "project_id",
        String(26),
        ForeignKey("projects.id", ondelete="CASCADE"),
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
        String(100),
        nullable=True,
    ),
    Column(
        "status",
        SQLEnum(CollaboratorStatus, values_callable=lambda x: [e.value for e in x]),
        nullable=False,
        default=CollaboratorStatus.PENDING,
        server_default="pending",
    ),
    Column(
        "invited_at",
        DateTime(timezone=True),
        nullable=False,
        server_default=func.now(),
    ),
    Column(
        "confirmed_at",
        DateTime(timezone=True),
        nullable=True,
    ),
)


class Project(Base, ULIDMixin, TimestampMixin):
    """Represents a project with owner, collaborators, and metadata."""

    __tablename__ = "projects"

    # Core fields
    owner_id: Mapped[str] = mapped_column(
        String(26),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    title: Mapped[str] = mapped_column(
        String(200),
        nullable=False,
    )
    description: Mapped[str | None] = mapped_column(
        Text,
        nullable=True,
    )
    status: Mapped[ProjectStatus] = mapped_column(
        SQLEnum(ProjectStatus, values_callable=lambda x: [e.value for e in x]),
        nullable=False,
        default=ProjectStatus.IN_PROGRESS,
        server_default="in_progress",
    )
    role: Mapped[str | None] = mapped_column(
        String(100),
        nullable=True,
    )

    # Media
    thumbnail_url: Mapped[str | None] = mapped_column(
        String(500),
        nullable=True,
    )

    # Metadata
    links: Mapped[dict] = mapped_column(
        JSONB,
        nullable=False,
        default=dict,
        server_default="{}",
    )
    tech_stack: Mapped[list] = mapped_column(
        JSONB,
        nullable=False,
        default=list,
        server_default="[]",
    )
    impact_metrics: Mapped[dict] = mapped_column(
        JSONB,
        nullable=False,
        default=dict,
        server_default="{}",
    )

    # GitHub integration
    github_repo_full_name: Mapped[str | None] = mapped_column(
        String(200),
        unique=True,
        nullable=True,
    )
    github_stars: Mapped[int | None] = mapped_column(
        Integer,
        nullable=True,
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
    owner: Mapped["User"] = relationship(
        "User",
        back_populates="owned_projects",
    )
    collaborators: Mapped[list["User"]] = relationship(
        "User",
        secondary=project_collaborators,
        back_populates="collaborated_projects",
    )

    __table_args__ = (
        Index("ix_projects_search_vector", "search_vector", postgresql_using="gin"),
        Index(
            "ix_projects_embedding",
            "embedding",
            postgresql_using="hnsw",
            postgresql_with={"m": 16, "ef_construction": 64},
            postgresql_ops={"embedding": "vector_cosine_ops"},
        ),
        Index("ix_projects_status", "status"),
        Index("ix_projects_github_repo", "github_repo_full_name"),
    )
