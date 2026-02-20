"""add_requested_role_id_to_tribe_members

Revision ID: b1e5a3c2d4f6
Revises: a0b1c2d3e4f5
Create Date: 2026-02-20 10:00:00.000000

"""
from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

# revision identifiers, used by Alembic.
revision: str = "b1e5a3c2d4f6"
down_revision: str | None = "a0b1c2d3e4f5"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    """Add requested_role_id column to tribe_members with FK and index."""
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
    """Remove requested_role_id column and index from tribe_members."""
    op.drop_index("ix_tribe_members_requested_role", table_name="tribe_members")
    op.drop_column("tribe_members", "requested_role_id")
