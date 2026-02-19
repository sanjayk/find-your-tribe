"""ApiToken model — plugin authentication tokens for API access."""

from datetime import datetime
from typing import TYPE_CHECKING

from sqlalchemy import DateTime, ForeignKey, Index, String, text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base, TimestampMixin, ULIDMixin

if TYPE_CHECKING:
    from app.models.user import User


class ApiToken(Base, ULIDMixin, TimestampMixin):
    """Stores hashed API tokens for plugin authentication.

    The raw token format is fyt_{64 hex chars}. Only the SHA-256 hash
    of the raw token is stored — never the plaintext.
    """

    __tablename__ = "api_tokens"

    user_id: Mapped[str] = mapped_column(
        String(26),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
    )
    token_hash: Mapped[str] = mapped_column(
        String(64),
        unique=True,
        nullable=False,
    )
    name: Mapped[str] = mapped_column(
        String(100),
        nullable=False,
    )
    last_used_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
    )
    expires_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
    )
    revoked_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
    )

    user: Mapped["User"] = relationship(back_populates="api_tokens")

    __table_args__ = (
        Index(
            "ix_api_tokens_hash",
            "token_hash",
            postgresql_where=text("revoked_at IS NULL"),
        ),
        Index("ix_api_tokens_user", "user_id"),
    )
