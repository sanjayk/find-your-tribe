"""Tests for Project and project_collaborators models."""

import pytest
from sqlalchemy import inspect
from sqlalchemy.exc import IntegrityError

from app.db.base import Base
from app.models.enums import CollaboratorStatus, ProjectStatus
from app.models.project import Project, project_collaborators


def test_project_model_exists():
    """Test that Project model exists and is a subclass of Base."""
    assert Project is not None
    assert issubclass(Project, Base)


def test_project_has_required_columns():
    """Test that Project has all required columns."""
    mapper = inspect(Project)
    columns = {col.key for col in mapper.columns}

    # Core fields
    assert "id" in columns
    assert "owner_id" in columns
    assert "title" in columns
    assert "description" in columns
    assert "status" in columns
    assert "role" in columns

    # Media
    assert "thumbnail_url" in columns

    # Metadata
    assert "links" in columns
    assert "tech_stack" in columns
    assert "impact_metrics" in columns

    # GitHub integration
    assert "github_repo_full_name" in columns
    assert "github_stars" in columns

    # Search
    assert "search_vector" in columns
    assert "embedding" in columns

    # Timestamps
    assert "created_at" in columns
    assert "updated_at" in columns


def test_project_id_column():
    """Test that id column has correct properties."""
    mapper = inspect(Project)
    id_col = mapper.columns["id"]

    assert id_col.type.python_type is str
    assert id_col.type.length == 26
    assert id_col.primary_key is True
    assert id_col.default is not None


def test_project_owner_id_column():
    """Test that owner_id column has correct properties including FK."""
    mapper = inspect(Project)
    owner_id_col = mapper.columns["owner_id"]

    assert owner_id_col.type.python_type is str
    assert owner_id_col.type.length == 26
    assert owner_id_col.nullable is False
    assert owner_id_col.index is True

    # Check foreign key
    assert len(owner_id_col.foreign_keys) == 1
    fk = list(owner_id_col.foreign_keys)[0]
    assert str(fk.column) == "users.id"
    assert fk.ondelete == "CASCADE"


def test_project_title_column():
    """Test that title column has correct properties."""
    mapper = inspect(Project)
    title_col = mapper.columns["title"]

    assert title_col.type.python_type is str
    assert title_col.type.length == 200
    assert title_col.nullable is False


def test_project_description_column():
    """Test that description column has correct properties."""
    mapper = inspect(Project)
    description_col = mapper.columns["description"]

    # Text columns don't have a length property
    assert description_col.nullable is True


def test_project_status_column():
    """Test that status column uses ProjectStatus enum."""
    mapper = inspect(Project)
    status_col = mapper.columns["status"]

    assert status_col.nullable is False
    assert hasattr(status_col.type, "enum_class")
    assert status_col.type.enum_class is ProjectStatus
    assert status_col.default.arg == ProjectStatus.IN_PROGRESS
    assert status_col.server_default is not None


def test_project_role_column():
    """Test that role column has correct properties."""
    mapper = inspect(Project)
    role_col = mapper.columns["role"]

    assert role_col.type.python_type is str
    assert role_col.type.length == 100
    assert role_col.nullable is True


def test_project_thumbnail_url_column():
    """Test that thumbnail_url column has correct properties."""
    mapper = inspect(Project)
    thumbnail_url_col = mapper.columns["thumbnail_url"]

    assert thumbnail_url_col.type.python_type is str
    assert thumbnail_url_col.type.length == 500
    assert thumbnail_url_col.nullable is True


def test_project_links_column():
    """Test that links column has correct properties."""
    mapper = inspect(Project)
    links_col = mapper.columns["links"]

    assert links_col.nullable is False
    # The default is a callable that returns an empty dict
    assert callable(links_col.default.arg)
    assert links_col.server_default is not None


def test_project_tech_stack_column():
    """Test that tech_stack column has correct properties."""
    mapper = inspect(Project)
    tech_stack_col = mapper.columns["tech_stack"]

    assert tech_stack_col.nullable is False
    # The default is a callable that returns an empty list
    assert callable(tech_stack_col.default.arg)
    assert tech_stack_col.server_default is not None


def test_project_impact_metrics_column():
    """Test that impact_metrics column has correct properties."""
    mapper = inspect(Project)
    impact_metrics_col = mapper.columns["impact_metrics"]

    assert impact_metrics_col.nullable is False
    # The default is a callable that returns an empty dict
    assert callable(impact_metrics_col.default.arg)
    assert impact_metrics_col.server_default is not None


def test_project_github_repo_full_name_column():
    """Test that github_repo_full_name column has correct properties."""
    mapper = inspect(Project)
    github_repo_col = mapper.columns["github_repo_full_name"]

    assert github_repo_col.type.python_type is str
    assert github_repo_col.type.length == 200
    assert github_repo_col.nullable is True
    assert github_repo_col.unique is True


def test_project_github_stars_column():
    """Test that github_stars column has correct properties."""
    mapper = inspect(Project)
    github_stars_col = mapper.columns["github_stars"]

    assert github_stars_col.type.python_type is int
    assert github_stars_col.nullable is True


def test_project_search_vector_column():
    """Test that search_vector column exists and is nullable."""
    mapper = inspect(Project)
    search_vector_col = mapper.columns["search_vector"]

    assert search_vector_col.nullable is True


def test_project_embedding_column():
    """Test that embedding column exists and is nullable."""
    mapper = inspect(Project)
    embedding_col = mapper.columns["embedding"]

    assert embedding_col.nullable is True


def test_project_has_tablename():
    """Test that Project has a table name defined."""
    assert hasattr(Project, "__tablename__")
    assert Project.__tablename__ == "projects"


def test_project_inherits_ulid_mixin():
    """Test that Project inherits from ULIDMixin."""
    from app.db.base import ULIDMixin

    assert issubclass(Project, ULIDMixin)


def test_project_inherits_timestamp_mixin():
    """Test that Project inherits from TimestampMixin."""
    from app.db.base import TimestampMixin

    assert issubclass(Project, TimestampMixin)

    # Verify timestamp columns are present
    mapper = inspect(Project)
    columns = {col.key for col in mapper.columns}

    assert "created_at" in columns
    assert "updated_at" in columns


def test_project_has_indexes():
    """Test that Project has required indexes."""
    indexes = {idx.name for idx in Project.__table__.indexes}

    # Check for GIN index on search_vector
    assert "ix_projects_search_vector" in indexes

    # Check for HNSW index on embedding
    assert "ix_projects_embedding" in indexes

    # Check for index on status
    assert "ix_projects_status" in indexes

    # Check for index on github_repo_full_name
    assert "ix_projects_github_repo" in indexes


def test_project_has_relationships():
    """Test that Project has defined relationships."""
    mapper = inspect(Project)
    relationships = {rel.key for rel in mapper.relationships}

    assert "owner" in relationships
    assert "collaborators" in relationships


def test_project_collaborators_table_exists():
    """Test that project_collaborators association table exists."""
    assert project_collaborators is not None
    assert project_collaborators.name == "project_collaborators"


def test_project_collaborators_has_columns():
    """Test that project_collaborators has required columns."""
    columns = {col.name for col in project_collaborators.columns}

    assert "project_id" in columns
    assert "user_id" in columns
    assert "role" in columns
    assert "status" in columns
    assert "invited_at" in columns
    assert "confirmed_at" in columns


def test_project_collaborators_composite_pk():
    """Test that project_collaborators has composite primary key."""
    pk_columns = [col.name for col in project_collaborators.primary_key.columns]

    assert len(pk_columns) == 2
    assert "project_id" in pk_columns
    assert "user_id" in pk_columns


def test_project_collaborators_foreign_keys():
    """Test that project_collaborators has foreign keys to projects and users."""
    project_id_col = project_collaborators.c.project_id
    user_id_col = project_collaborators.c.user_id

    # Check project_id foreign key
    assert len(project_id_col.foreign_keys) == 1
    project_fk = list(project_id_col.foreign_keys)[0]
    assert str(project_fk.column) == "projects.id"
    assert project_fk.ondelete == "CASCADE"

    # Check user_id foreign key
    assert len(user_id_col.foreign_keys) == 1
    user_fk = list(user_id_col.foreign_keys)[0]
    assert str(user_fk.column) == "users.id"
    assert user_fk.ondelete == "CASCADE"


def test_project_collaborators_role_column():
    """Test that role column has correct properties."""
    role_col = project_collaborators.c.role

    assert role_col.type.python_type is str
    assert role_col.type.length == 100
    assert role_col.nullable is True


def test_project_collaborators_status_column():
    """Test that status column uses CollaboratorStatus enum."""
    status_col = project_collaborators.c.status

    assert status_col.nullable is False
    assert hasattr(status_col.type, "enum_class")
    assert status_col.type.enum_class is CollaboratorStatus
    assert status_col.default.arg == CollaboratorStatus.PENDING
    assert status_col.server_default is not None


def test_project_collaborators_invited_at_column():
    """Test that invited_at column has correct properties."""
    invited_at_col = project_collaborators.c.invited_at

    assert invited_at_col.nullable is False
    assert invited_at_col.server_default is not None


def test_project_collaborators_confirmed_at_column():
    """Test that confirmed_at column has correct properties."""
    confirmed_at_col = project_collaborators.c.confirmed_at

    assert confirmed_at_col.nullable is True


@pytest.mark.asyncio
async def test_project_database_integration():
    """Test that Project model works with database operations."""
    from app.db.engine import async_session_factory, engine
    from app.models.user import User

    # Create table
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    try:
        # Create a user
        async with async_session_factory() as session:
            user = User(
                email="test@example.com",
                username="testuser",
                display_name="Test User",
            )
            session.add(user)
            await session.commit()
            await session.refresh(user)

            # Create a project
            project = Project(
                owner_id=user.id,
                title="Test Project",
                description="A test project",
                status=ProjectStatus.IN_PROGRESS,
                role="Lead Engineer",
            )
            session.add(project)
            await session.commit()
            await session.refresh(project)

            # Verify the project was created
            assert project.id is not None
            assert len(project.id) == 26
            assert project.owner_id == user.id
            assert project.title == "Test Project"
            assert project.description == "A test project"
            assert project.status == ProjectStatus.IN_PROGRESS
            assert project.role == "Lead Engineer"
            assert project.links == {}
            assert project.tech_stack == []
            assert project.impact_metrics == {}
            assert project.github_repo_full_name is None
            assert project.github_stars is None
            assert project.created_at is not None
            assert project.updated_at is not None
    finally:
        # Clean up
        async with engine.begin() as conn:
            await conn.run_sync(Base.metadata.drop_all)


@pytest.mark.asyncio
async def test_project_cascade_delete():
    """Test that projects are deleted when owner is deleted."""
    from app.db.engine import async_session_factory, engine
    from app.models.user import User

    # Create table
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    try:
        user_id = None
        # Create a user with a project
        async with async_session_factory() as session:
            user = User(
                email="test@example.com",
                username="testuser",
                display_name="Test User",
            )
            session.add(user)
            await session.commit()
            await session.refresh(user)
            user_id = user.id

            project = Project(
                owner_id=user.id,
                title="Test Project",
            )
            session.add(project)
            await session.commit()

        # Delete the user
        async with async_session_factory() as session:
            user = await session.get(User, user_id)
            await session.delete(user)
            await session.commit()

        # Verify project was also deleted
        async with async_session_factory() as session:
            from sqlalchemy import select

            result = await session.execute(
                select(Project).where(Project.owner_id == user_id)
            )
            projects = result.scalars().all()
            assert len(projects) == 0
    finally:
        # Clean up
        async with engine.begin() as conn:
            await conn.run_sync(Base.metadata.drop_all)


@pytest.mark.asyncio
async def test_project_github_repo_unique_constraint():
    """Test that github_repo_full_name must be unique."""
    from app.db.engine import async_session_factory, engine
    from app.models.user import User

    # Create table
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    try:
        # Create a user
        async with async_session_factory() as session:
            user = User(
                email="test@example.com",
                username="testuser",
                display_name="Test User",
            )
            session.add(user)
            await session.commit()
            await session.refresh(user)

            # Create first project with github repo
            project1 = Project(
                owner_id=user.id,
                title="Test Project 1",
                github_repo_full_name="owner/repo",
            )
            session.add(project1)
            await session.commit()

            # Try to create second project with same github repo
            project2 = Project(
                owner_id=user.id,
                title="Test Project 2",
                github_repo_full_name="owner/repo",
            )
            session.add(project2)

            # This should raise an integrity error
            with pytest.raises(IntegrityError):
                await session.commit()
    finally:
        # Clean up
        async with engine.begin() as conn:
            await conn.run_sync(Base.metadata.drop_all)
