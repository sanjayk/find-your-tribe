"""f3_project_enhancements

Revision ID: b1e5a3c2d4f6
Revises: a0b1c2d3e4f5
Create Date: 2026-02-20 00:00:00.000000

"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = "b1e5a3c2d4f6"
down_revision: str | None = "a0b1c2d3e4f5"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    """Apply F3 project enhancements: JSONB columns, new tables, and search trigger."""
    # 1. Add JSONB columns to projects table
    op.add_column(
        "projects",
        sa.Column(
            "domains",
            postgresql.JSONB(astext_type=sa.Text()),
            server_default="[]",
            nullable=False,
        ),
    )
    op.add_column(
        "projects",
        sa.Column(
            "ai_tools",
            postgresql.JSONB(astext_type=sa.Text()),
            server_default="[]",
            nullable=False,
        ),
    )
    op.add_column(
        "projects",
        sa.Column(
            "build_style",
            postgresql.JSONB(astext_type=sa.Text()),
            server_default="[]",
            nullable=False,
        ),
    )
    op.add_column(
        "projects",
        sa.Column(
            "services",
            postgresql.JSONB(astext_type=sa.Text()),
            server_default="[]",
            nullable=False,
        ),
    )

    # 2. Create MilestoneType enum
    milestone_type_enum = sa.Enum(
        "start", "milestone", "deploy", "launch", name="milestonetype"
    )
    milestone_type_enum.create(op.get_bind(), checkfirst=True)

    # 3. Create project_milestones table
    op.create_table(
        "project_milestones",
        sa.Column("id", sa.String(26), nullable=False),
        sa.Column("project_id", sa.String(26), nullable=False),
        sa.Column("title", sa.String(200), nullable=False),
        sa.Column("date", sa.Date(), nullable=False),
        sa.Column(
            "milestone_type",
            sa.Enum(
                "start",
                "milestone",
                "deploy",
                "launch",
                name="milestonetype",
                create_type=False,
            ),
            server_default="milestone",
            nullable=False,
        ),
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
        sa.ForeignKeyConstraint(["project_id"], ["projects.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(
        "ix_project_milestones_project_date",
        "project_milestones",
        ["project_id", "date"],
    )
    op.create_index(
        "ix_project_milestones_project_id",
        "project_milestones",
        ["project_id"],
    )

    # 4. Create collaborator_invite_tokens table
    op.create_table(
        "collaborator_invite_tokens",
        sa.Column("id", sa.String(26), nullable=False),
        sa.Column("project_id", sa.String(26), nullable=False),
        sa.Column("invited_by", sa.String(26), nullable=False),
        sa.Column("token", sa.String(64), nullable=False),
        sa.Column("role", sa.String(100), nullable=True),
        sa.Column("expires_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("redeemed_by", sa.String(26), nullable=True),
        sa.Column("redeemed_at", sa.DateTime(timezone=True), nullable=True),
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
        sa.ForeignKeyConstraint(["project_id"], ["projects.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["invited_by"], ["users.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(
            ["redeemed_by"], ["users.id"], ondelete="SET NULL"
        ),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("token"),
    )
    op.create_index(
        "ix_collaborator_invite_tokens_token",
        "collaborator_invite_tokens",
        ["token"],
    )

    # 5. Create/replace full-text search trigger function
    op.execute(
        """
        CREATE OR REPLACE FUNCTION projects_search_vector_update() RETURNS trigger AS $$
        BEGIN
          NEW.search_vector :=
            setweight(to_tsvector('english', COALESCE(NEW.title, '')), 'A') ||
            setweight(to_tsvector('english', COALESCE(NEW.description, '')), 'B') ||
            setweight(to_tsvector('english',
              COALESCE(array_to_string(ARRAY(SELECT jsonb_array_elements_text(NEW.tech_stack)), ' '), '') || ' ' ||
              COALESCE(array_to_string(ARRAY(SELECT jsonb_array_elements_text(NEW.domains)), ' '), '') || ' ' ||
              COALESCE(array_to_string(ARRAY(SELECT jsonb_array_elements_text(NEW.ai_tools)), ' '), '') || ' ' ||
              COALESCE(array_to_string(ARRAY(SELECT jsonb_array_elements_text(NEW.services)), ' '), '')
            ), 'C');
          RETURN NEW;
        END;
        $$ LANGUAGE plpgsql;
        """
    )
    op.execute("DROP TRIGGER IF EXISTS projects_search_vector_trigger ON projects")
    op.execute(
        """
        CREATE TRIGGER projects_search_vector_trigger
          BEFORE INSERT OR UPDATE OF title, description, tech_stack, domains, ai_tools, services
          ON projects
          FOR EACH ROW EXECUTE FUNCTION projects_search_vector_update()
        """
    )


def downgrade() -> None:
    """Reverse F3 project enhancements."""
    # Drop trigger and function
    op.execute("DROP TRIGGER IF EXISTS projects_search_vector_trigger ON projects")
    op.execute("DROP FUNCTION IF EXISTS projects_search_vector_update()")

    # Drop collaborator_invite_tokens indexes and table
    op.drop_index(
        "ix_collaborator_invite_tokens_token",
        table_name="collaborator_invite_tokens",
    )
    op.drop_table("collaborator_invite_tokens")

    # Drop project_milestones indexes and table
    op.drop_index(
        "ix_project_milestones_project_id", table_name="project_milestones"
    )
    op.drop_index(
        "ix_project_milestones_project_date", table_name="project_milestones"
    )
    op.drop_table("project_milestones")

    # Drop MilestoneType enum
    sa.Enum(name="milestonetype").drop(op.get_bind(), checkfirst=True)

    # Drop JSONB columns from projects
    op.drop_column("projects", "services")
    op.drop_column("projects", "build_style")
    op.drop_column("projects", "ai_tools")
    op.drop_column("projects", "domains")
