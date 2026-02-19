"""add_burn_plugin_fields

Revision ID: f1a2b3c4d5e6
Revises: e9f0a1b2c3d7
Create Date: 2026-02-19 12:00:00.000000

"""
from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

# revision identifiers, used by Alembic.
revision: str = "f1a2b3c4d5e6"
down_revision: str | None = "e9f0a1b2c3d7"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None

# Enum type names used by PostgreSQL
BURN_VERIFICATION_TYPE = "burnverification"
TOKEN_PRECISION_TYPE = "tokenprecision"


def upgrade() -> None:
    """Add burn plugin columns and indexes to build_activities."""
    # Create enum types
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

    # Add columns
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

    # Add indexes
    op.execute(
        "CREATE INDEX ix_build_activities_session "
        "ON build_activities (session_id) "
        "WHERE session_id IS NOT NULL"
    )
    op.create_index(
        "ix_build_activities_verification",
        "build_activities",
        ["user_id", "verification"],
    )


def downgrade() -> None:
    """Remove burn plugin columns and indexes from build_activities."""
    op.drop_index("ix_build_activities_verification", table_name="build_activities")
    op.drop_index("ix_build_activities_session", table_name="build_activities")

    op.drop_column("build_activities", "token_precision")
    op.drop_column("build_activities", "session_id")
    op.drop_column("build_activities", "tool")
    op.drop_column("build_activities", "verification")

    # Drop enum types
    sa.Enum(name=TOKEN_PRECISION_TYPE).drop(op.get_bind(), checkfirst=True)
    sa.Enum(name=BURN_VERIFICATION_TYPE).drop(op.get_bind(), checkfirst=True)
