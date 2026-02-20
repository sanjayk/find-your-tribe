"""f4_tribes_requested_role_and_enum_values

Revision ID: c3d5e7f9a1b3
Revises: b1e5a3c2d4f6
Create Date: 2026-02-20 12:00:00.000000

"""
from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

# revision identifiers, used by Alembic.
revision: str = "c3d5e7f9a1b3"
down_revision: str | None = "b1e5a3c2d4f6"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    """Add requested_role_id to tribe_members, add missing enum values."""
    # Add missing memberstatus enum values used by leave/remove operations
    op.execute("ALTER TYPE memberstatus ADD VALUE IF NOT EXISTS 'left'")
    op.execute("ALTER TYPE memberstatus ADD VALUE IF NOT EXISTS 'removed'")

    # Add missing eventtype enum values
    op.execute("ALTER TYPE eventtype ADD VALUE IF NOT EXISTS 'project_update'")
    op.execute("ALTER TYPE eventtype ADD VALUE IF NOT EXISTS 'tribe_announcement'")

    # Add requested_role_id column to tribe_members
    op.add_column(
        "tribe_members",
        sa.Column(
            "requested_role_id",
            sa.String(26),
            sa.ForeignKey("tribe_open_roles.id", ondelete="SET NULL"),
            nullable=True,
        ),
    )
    op.create_index(
        "ix_tribe_members_requested_role",
        "tribe_members",
        ["requested_role_id"],
    )


def downgrade() -> None:
    """Remove requested_role_id column and index from tribe_members.

    Note: PostgreSQL does not support removing enum values.
    The added enum values (left, removed, project_update, tribe_announcement)
    will remain in the database.
    """
    op.drop_index("ix_tribe_members_requested_role", table_name="tribe_members")
    op.drop_column("tribe_members", "requested_role_id")
