"""Tests for Tribe, tribe_members, and TribeOpenRole models."""

import pytest
from sqlalchemy import inspect

from app.db.base import Base
from app.models.enums import MemberRole, MemberStatus, TribeStatus
from app.models.tribe import Tribe, TribeOpenRole, tribe_members


def test_tribe_model_exists():
    """Test that Tribe model exists and is a subclass of Base."""
    assert Tribe is not None
    assert issubclass(Tribe, Base)


def test_tribe_has_required_columns():
    """Test that Tribe has all required columns."""
    mapper = inspect(Tribe)
    columns = {col.key for col in mapper.columns}

    # Core fields
    assert "id" in columns
    assert "owner_id" in columns
    assert "name" in columns
    assert "mission" in columns
    assert "status" in columns
    assert "max_members" in columns

    # Search
    assert "search_vector" in columns

    # Timestamps
    assert "created_at" in columns
    assert "updated_at" in columns


def test_tribe_id_column():
    """Test that id column has correct properties."""
    mapper = inspect(Tribe)
    id_col = mapper.columns["id"]

    assert id_col.type.python_type is str
    assert id_col.type.length == 26
    assert id_col.primary_key is True
    assert id_col.default is not None


def test_tribe_owner_id_column():
    """Test that owner_id column has correct properties including FK."""
    mapper = inspect(Tribe)
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


def test_tribe_name_column():
    """Test that name column has correct properties."""
    mapper = inspect(Tribe)
    name_col = mapper.columns["name"]

    assert name_col.type.python_type is str
    assert name_col.type.length == 100
    assert name_col.nullable is False


def test_tribe_mission_column():
    """Test that mission column has correct properties."""
    mapper = inspect(Tribe)
    mission_col = mapper.columns["mission"]

    # Text columns don't have a length property
    assert mission_col.nullable is True


def test_tribe_status_column():
    """Test that status column uses TribeStatus enum."""
    mapper = inspect(Tribe)
    status_col = mapper.columns["status"]

    assert status_col.nullable is False
    assert hasattr(status_col.type, "enum_class")
    assert status_col.type.enum_class is TribeStatus
    assert status_col.default.arg == TribeStatus.OPEN
    assert status_col.server_default is not None


def test_tribe_max_members_column():
    """Test that max_members column has correct properties."""
    mapper = inspect(Tribe)
    max_members_col = mapper.columns["max_members"]

    assert max_members_col.type.python_type is int
    assert max_members_col.nullable is False
    assert max_members_col.default.arg == 8
    assert max_members_col.server_default is not None


def test_tribe_search_vector_column():
    """Test that search_vector column exists and is nullable."""
    mapper = inspect(Tribe)
    search_vector_col = mapper.columns["search_vector"]

    assert search_vector_col.nullable is True


def test_tribe_has_tablename():
    """Test that Tribe has a table name defined."""
    assert hasattr(Tribe, "__tablename__")
    assert Tribe.__tablename__ == "tribes"


def test_tribe_inherits_ulid_mixin():
    """Test that Tribe inherits from ULIDMixin."""
    from app.db.base import ULIDMixin

    assert issubclass(Tribe, ULIDMixin)


def test_tribe_inherits_timestamp_mixin():
    """Test that Tribe inherits from TimestampMixin."""
    from app.db.base import TimestampMixin

    assert issubclass(Tribe, TimestampMixin)

    # Verify timestamp columns are present
    mapper = inspect(Tribe)
    columns = {col.key for col in mapper.columns}

    assert "created_at" in columns
    assert "updated_at" in columns


def test_tribe_has_indexes():
    """Test that Tribe has required indexes."""
    indexes = {idx.name for idx in Tribe.__table__.indexes}

    # Check for GIN index on search_vector
    assert "ix_tribes_search_vector" in indexes

    # Check for index on status
    assert "ix_tribes_status" in indexes


def test_tribe_has_relationships():
    """Test that Tribe has defined relationships."""
    mapper = inspect(Tribe)
    relationships = {rel.key for rel in mapper.relationships}

    assert "owner" in relationships
    assert "members" in relationships
    assert "open_roles" in relationships


def test_tribe_members_table_exists():
    """Test that tribe_members association table exists."""
    assert tribe_members is not None
    assert tribe_members.name == "tribe_members"


def test_tribe_members_has_columns():
    """Test that tribe_members has required columns."""
    columns = {col.name for col in tribe_members.columns}

    assert "tribe_id" in columns
    assert "user_id" in columns
    assert "role" in columns
    assert "status" in columns
    assert "joined_at" in columns
    assert "requested_at" in columns


def test_tribe_members_composite_pk():
    """Test that tribe_members has composite primary key."""
    pk_columns = [col.name for col in tribe_members.primary_key.columns]

    assert len(pk_columns) == 2
    assert "tribe_id" in pk_columns
    assert "user_id" in pk_columns


def test_tribe_members_foreign_keys():
    """Test that tribe_members has foreign keys to tribes and users."""
    tribe_id_col = tribe_members.c.tribe_id
    user_id_col = tribe_members.c.user_id

    # Check tribe_id foreign key
    assert len(tribe_id_col.foreign_keys) == 1
    tribe_fk = list(tribe_id_col.foreign_keys)[0]
    assert str(tribe_fk.column) == "tribes.id"
    assert tribe_fk.ondelete == "CASCADE"

    # Check user_id foreign key
    assert len(user_id_col.foreign_keys) == 1
    user_fk = list(user_id_col.foreign_keys)[0]
    assert str(user_fk.column) == "users.id"
    assert user_fk.ondelete == "CASCADE"


def test_tribe_members_role_column():
    """Test that role column uses MemberRole enum."""
    role_col = tribe_members.c.role

    assert role_col.nullable is False
    assert hasattr(role_col.type, "enum_class")
    assert role_col.type.enum_class is MemberRole
    assert role_col.default.arg == MemberRole.MEMBER
    assert role_col.server_default is not None


def test_tribe_members_status_column():
    """Test that status column uses MemberStatus enum."""
    status_col = tribe_members.c.status

    assert status_col.nullable is False
    assert hasattr(status_col.type, "enum_class")
    assert status_col.type.enum_class is MemberStatus
    assert status_col.default.arg == MemberStatus.PENDING
    assert status_col.server_default is not None


def test_tribe_members_joined_at_column():
    """Test that joined_at column has correct properties."""
    joined_at_col = tribe_members.c.joined_at

    assert joined_at_col.nullable is True


def test_tribe_members_requested_at_column():
    """Test that requested_at column has correct properties."""
    requested_at_col = tribe_members.c.requested_at

    assert requested_at_col.nullable is False
    assert requested_at_col.server_default is not None


def test_tribe_open_role_model_exists():
    """Test that TribeOpenRole model exists and is a subclass of Base."""
    assert TribeOpenRole is not None
    assert issubclass(TribeOpenRole, Base)


def test_tribe_open_role_has_required_columns():
    """Test that TribeOpenRole has all required columns."""
    mapper = inspect(TribeOpenRole)
    columns = {col.key for col in mapper.columns}

    assert "id" in columns
    assert "tribe_id" in columns
    assert "title" in columns
    assert "skills_needed" in columns
    assert "filled" in columns
    assert "filled_by" in columns


def test_tribe_open_role_id_column():
    """Test that id column has correct properties."""
    mapper = inspect(TribeOpenRole)
    id_col = mapper.columns["id"]

    assert id_col.type.python_type is str
    assert id_col.type.length == 26
    assert id_col.primary_key is True
    assert id_col.default is not None


def test_tribe_open_role_tribe_id_column():
    """Test that tribe_id column has correct properties including FK."""
    mapper = inspect(TribeOpenRole)
    tribe_id_col = mapper.columns["tribe_id"]

    assert tribe_id_col.type.python_type is str
    assert tribe_id_col.type.length == 26
    assert tribe_id_col.nullable is False
    assert tribe_id_col.index is True

    # Check foreign key
    assert len(tribe_id_col.foreign_keys) == 1
    fk = list(tribe_id_col.foreign_keys)[0]
    assert str(fk.column) == "tribes.id"
    assert fk.ondelete == "CASCADE"


def test_tribe_open_role_title_column():
    """Test that title column has correct properties."""
    mapper = inspect(TribeOpenRole)
    title_col = mapper.columns["title"]

    assert title_col.type.python_type is str
    assert title_col.type.length == 100
    assert title_col.nullable is False


def test_tribe_open_role_skills_needed_column():
    """Test that skills_needed column has correct properties."""
    mapper = inspect(TribeOpenRole)
    skills_needed_col = mapper.columns["skills_needed"]

    assert skills_needed_col.nullable is False
    # The default is a callable that returns an empty list
    assert callable(skills_needed_col.default.arg)
    assert skills_needed_col.server_default is not None


def test_tribe_open_role_filled_column():
    """Test that filled column has correct properties."""
    mapper = inspect(TribeOpenRole)
    filled_col = mapper.columns["filled"]

    assert filled_col.type.python_type is bool
    assert filled_col.nullable is False
    assert filled_col.default.arg is False
    assert filled_col.server_default is not None


def test_tribe_open_role_filled_by_column():
    """Test that filled_by column has correct properties including FK."""
    mapper = inspect(TribeOpenRole)
    filled_by_col = mapper.columns["filled_by"]

    assert filled_by_col.type.python_type is str
    assert filled_by_col.type.length == 26
    assert filled_by_col.nullable is True

    # Check foreign key
    assert len(filled_by_col.foreign_keys) == 1
    fk = list(filled_by_col.foreign_keys)[0]
    assert str(fk.column) == "users.id"
    # Note: No ondelete specified for filled_by (default behavior)


def test_tribe_open_role_has_tablename():
    """Test that TribeOpenRole has a table name defined."""
    assert hasattr(TribeOpenRole, "__tablename__")
    assert TribeOpenRole.__tablename__ == "tribe_open_roles"


def test_tribe_open_role_inherits_ulid_mixin():
    """Test that TribeOpenRole inherits from ULIDMixin."""
    from app.db.base import ULIDMixin

    assert issubclass(TribeOpenRole, ULIDMixin)


def test_tribe_open_role_has_relationships():
    """Test that TribeOpenRole has defined relationships."""
    mapper = inspect(TribeOpenRole)
    relationships = {rel.key for rel in mapper.relationships}

    assert "tribe" in relationships
    assert "filled_by_user" in relationships


@pytest.mark.asyncio
@pytest.mark.skip(reason="Requires running database")
async def test_tribe_database_integration():
    """Test that Tribe model works with database operations."""
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

            # Create a tribe
            tribe = Tribe(
                owner_id=user.id,
                name="Test Tribe",
                mission="Build awesome things together",
                status=TribeStatus.OPEN,
            )
            session.add(tribe)
            await session.commit()
            await session.refresh(tribe)

            # Verify the tribe was created
            assert tribe.id is not None
            assert len(tribe.id) == 26
            assert tribe.owner_id == user.id
            assert tribe.name == "Test Tribe"
            assert tribe.mission == "Build awesome things together"
            assert tribe.status == TribeStatus.OPEN
            assert tribe.max_members == 8
            assert tribe.created_at is not None
            assert tribe.updated_at is not None
    finally:
        # Clean up
        async with engine.begin() as conn:
            await conn.run_sync(Base.metadata.drop_all)


@pytest.mark.asyncio
@pytest.mark.skip(reason="Requires running database")
async def test_tribe_cascade_delete():
    """Test that tribes are deleted when owner is deleted."""
    from app.db.engine import async_session_factory, engine
    from app.models.user import User

    # Create table
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    try:
        user_id = None
        # Create a user with a tribe
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

            tribe = Tribe(
                owner_id=user.id,
                name="Test Tribe",
            )
            session.add(tribe)
            await session.commit()

        # Delete the user
        async with async_session_factory() as session:
            user = await session.get(User, user_id)
            await session.delete(user)
            await session.commit()

        # Verify tribe was also deleted
        async with async_session_factory() as session:
            from sqlalchemy import select

            result = await session.execute(
                select(Tribe).where(Tribe.owner_id == user_id)
            )
            tribes = result.scalars().all()
            assert len(tribes) == 0
    finally:
        # Clean up
        async with engine.begin() as conn:
            await conn.run_sync(Base.metadata.drop_all)


@pytest.mark.asyncio
@pytest.mark.skip(reason="Requires running database")
async def test_tribe_open_role_cascade_delete():
    """Test that open roles are deleted when tribe is deleted."""
    from app.db.engine import async_session_factory, engine
    from app.models.user import User

    # Create table
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    try:
        tribe_id = None
        # Create a user with a tribe and open role
        async with async_session_factory() as session:
            user = User(
                email="test@example.com",
                username="testuser",
                display_name="Test User",
            )
            session.add(user)
            await session.commit()
            await session.refresh(user)

            tribe = Tribe(
                owner_id=user.id,
                name="Test Tribe",
            )
            session.add(tribe)
            await session.commit()
            await session.refresh(tribe)
            tribe_id = tribe.id

            open_role = TribeOpenRole(
                tribe_id=tribe.id,
                title="Frontend Engineer",
                skills_needed=["React", "TypeScript"],
            )
            session.add(open_role)
            await session.commit()

        # Delete the tribe
        async with async_session_factory() as session:
            tribe = await session.get(Tribe, tribe_id)
            await session.delete(tribe)
            await session.commit()

        # Verify open role was also deleted
        async with async_session_factory() as session:
            from sqlalchemy import select

            result = await session.execute(
                select(TribeOpenRole).where(TribeOpenRole.tribe_id == tribe_id)
            )
            open_roles = result.scalars().all()
            assert len(open_roles) == 0
    finally:
        # Clean up
        async with engine.begin() as conn:
            await conn.run_sync(Base.metadata.drop_all)
