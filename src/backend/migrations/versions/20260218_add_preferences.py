"""add_preferences_column

Revision ID: e9f0a1b2c3d7
Revises: d88e3a3bd5d6
Create Date: 2026-02-18 12:00:00.000000

"""
from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = 'e9f0a1b2c3d7'
down_revision: str | None = 'd88e3a3bd5d6'
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    """Apply migration."""
    op.add_column('users', sa.Column('preferences', postgresql.JSONB(astext_type=sa.Text()), server_default='{}', nullable=False))


def downgrade() -> None:
    """Revert migration."""
    op.drop_column('users', 'preferences')
