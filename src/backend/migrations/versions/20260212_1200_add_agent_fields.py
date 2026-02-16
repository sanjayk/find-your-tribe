"""Add agent collaboration fields to users.

Revision ID: a1b2c3d4e5f6
Revises: 03c481e45fae
Create Date: 2026-02-12 12:00:00.000000
"""

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision = "a1b2c3d4e5f6"
down_revision = "03c481e45fae"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Create the enum type with lowercase values
    agentworkflowstyle = postgresql.ENUM(
        "pair", "swarm", "review", "autonomous", "minimal",
        name="agentworkflowstyle",
        create_type=True,
    )
    agentworkflowstyle.create(op.get_bind(), checkfirst=True)

    op.add_column("users", sa.Column("agent_tools", postgresql.JSONB(), server_default="[]", nullable=False))
    op.add_column("users", sa.Column("agent_workflow_style", agentworkflowstyle, nullable=True))
    op.add_column("users", sa.Column("human_agent_ratio", sa.Float(), nullable=True))


def downgrade() -> None:
    op.drop_column("users", "human_agent_ratio")
    op.drop_column("users", "agent_workflow_style")
    op.drop_column("users", "agent_tools")

    postgresql.ENUM(name="agentworkflowstyle").drop(op.get_bind(), checkfirst=True)
