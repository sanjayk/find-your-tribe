"""add_burn_plugin_schema

Revision ID: a0b1c2d3e4f5
Revises: e9f0a1b2c3d7
Create Date: 2026-02-19 14:00:00.000000

"""
from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

# revision identifiers, used by Alembic.
revision: str = "a0b1c2d3e4f5"
down_revision: str | None = "e9f0a1b2c3d7"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None

BURN_VERIFICATION_TYPE = "burnverification"
TOKEN_PRECISION_TYPE = "tokenprecision"


def upgrade() -> None:
    """Apply F8 burn plugin schema: columns on build_activities and api_tokens table."""
    # --- Enum types ---
    burn_verification = sa.Enum(
        "provider_verified",
        "extension_tracked",
        "export_uploaded",
        "self_reported",
        name=BURN_VERIFICATION_TYPE,
    )
    burn_verification.create(op.get_bind(), checkfirst=True)

    token_precision = sa.Enum(
        "exact",
        "estimated",
        "approximate",
        name=TOKEN_PRECISION_TYPE,
    )
    token_precision.create(op.get_bind(), checkfirst=True)

    # --- build_activities: 4 new columns ---
    op.add_column(
        "build_activities",
        sa.Column(
            "verification",
            sa.Enum(
                "provider_verified",
                "extension_tracked",
                "export_uploaded",
                "self_reported",
                name=BURN_VERIFICATION_TYPE,
                create_type=False,
            ),
            server_default="self_reported",
            nullable=False,
        ),
    )
    op.add_column(
        "build_activities",
        sa.Column("tool", sa.String(50), nullable=True),
    )
    op.add_column(
        "build_activities",
        sa.Column("session_id", sa.String(100), nullable=True),
    )
    op.add_column(
        "build_activities",
        sa.Column(
            "token_precision",
            sa.Enum(
                "exact",
                "estimated",
                "approximate",
                name=TOKEN_PRECISION_TYPE,
                create_type=False,
            ),
            server_default="approximate",
            nullable=False,
        ),
    )

    # --- api_tokens table ---
    op.create_table(
        "api_tokens",
        sa.Column("id", sa.String(26), nullable=False),
        sa.Column("user_id", sa.String(26), nullable=False),
        sa.Column("token_hash", sa.String(64), nullable=False),
        sa.Column("name", sa.String(100), nullable=False),
        sa.Column(
            "last_used_at", sa.DateTime(timezone=True), nullable=True
        ),
        sa.Column("expires_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("revoked_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.ForeignKeyConstraint(
            ["user_id"],
            ["users.id"],
            ondelete="CASCADE",
        ),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("token_hash"),
    )

    # --- Indexes ---
    # api_tokens: partial index on token_hash for active (non-revoked) tokens
    op.execute(
        "CREATE INDEX ix_api_tokens_hash "
        "ON api_tokens (token_hash) "
        "WHERE revoked_at IS NULL"
    )
    # api_tokens: index on user_id for lookups by user
    op.create_index("ix_api_tokens_user", "api_tokens", ["user_id"])

    # build_activities: partial index on session_id for non-null sessions
    op.execute(
        "CREATE INDEX ix_build_activities_session "
        "ON build_activities (session_id) "
        "WHERE session_id IS NOT NULL"
    )
    # build_activities: composite index for verification queries per user
    op.create_index(
        "ix_build_activities_verification",
        "build_activities",
        ["user_id", "verification"],
    )


def downgrade() -> None:
    """Reverse F8 burn plugin schema changes."""
    # Drop build_activities indexes
    op.drop_index("ix_build_activities_verification", table_name="build_activities")
    op.drop_index("ix_build_activities_session", table_name="build_activities")

    # Drop build_activities columns
    op.drop_column("build_activities", "token_precision")
    op.drop_column("build_activities", "session_id")
    op.drop_column("build_activities", "tool")
    op.drop_column("build_activities", "verification")

    # Drop enum types
    sa.Enum(name=TOKEN_PRECISION_TYPE).drop(op.get_bind(), checkfirst=True)
    sa.Enum(name=BURN_VERIFICATION_TYPE).drop(op.get_bind(), checkfirst=True)

    # Drop api_tokens table (indexes are dropped automatically with the table)
    op.drop_table("api_tokens")
