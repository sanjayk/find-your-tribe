"""Tests for User, RefreshToken, and user_skills models."""

import pytest
from sqlalchemy import inspect

from app.db.base import Base
from app.models.enums import AvailabilityStatus, UserRole
from app.models.project import Project  # noqa: F401 - needed for relationship resolution
from app.models.user import RefreshToken, User, user_skills


def test_user_model_exists():
    """Test that User model exists and is a subclass of Base."""
    assert User is not None
    assert issubclass(User, Base)


def test_user_has_required_columns():
    """Test that User has all required columns."""
    mapper = inspect(User)
    columns = {col.key for col in mapper.columns}

    # Core identity columns
    assert "id" in columns
    assert "email" in columns
    assert "password_hash" in columns
    assert "username" in columns
    assert "display_name" in columns

    # Profile columns
    assert "avatar_url" in columns
    assert "headline" in columns
    assert "primary_role" in columns
    assert "timezone" in columns
    assert "availability_status" in columns
    assert "builder_score" in columns
    assert "bio" in columns
    assert "contact_links" in columns

    # GitHub integration
    assert "github_username" in columns
    assert "github_access_token_encrypted" in columns

    # Onboarding
    assert "onboarding_completed" in columns

    # Search
    assert "search_vector" in columns
    assert "embedding" in columns

    # Timestamps
    assert "created_at" in columns
    assert "updated_at" in columns


def test_user_id_column():
    """Test that id column has correct properties."""
    mapper = inspect(User)
    id_col = mapper.columns["id"]

    assert id_col.type.python_type is str
    assert id_col.type.length == 26
    assert id_col.primary_key is True
    assert id_col.default is not None


def test_user_email_column():
    """Test that email column has correct properties."""
    mapper = inspect(User)
    email_col = mapper.columns["email"]

    assert email_col.type.python_type is str
    assert email_col.type.length == 255
    assert email_col.nullable is False
    assert email_col.unique is True
    assert email_col.index is True


def test_user_password_hash_column():
    """Test that password_hash column has correct properties."""
    mapper = inspect(User)
    password_hash_col = mapper.columns["password_hash"]

    assert password_hash_col.type.python_type is str
    assert password_hash_col.type.length == 255
    assert password_hash_col.nullable is True


def test_user_username_column():
    """Test that username column has correct properties."""
    mapper = inspect(User)
    username_col = mapper.columns["username"]

    assert username_col.type.python_type is str
    assert username_col.type.length == 50
    assert username_col.nullable is False
    assert username_col.unique is True
    assert username_col.index is True


def test_user_display_name_column():
    """Test that display_name column has correct properties."""
    mapper = inspect(User)
    display_name_col = mapper.columns["display_name"]

    assert display_name_col.type.python_type is str
    assert display_name_col.type.length == 100
    assert display_name_col.nullable is False


def test_user_avatar_url_column():
    """Test that avatar_url column has correct properties."""
    mapper = inspect(User)
    avatar_url_col = mapper.columns["avatar_url"]

    assert avatar_url_col.type.python_type is str
    assert avatar_url_col.type.length == 500
    assert avatar_url_col.nullable is True


def test_user_headline_column():
    """Test that headline column has correct properties."""
    mapper = inspect(User)
    headline_col = mapper.columns["headline"]

    assert headline_col.type.python_type is str
    assert headline_col.type.length == 200
    assert headline_col.nullable is True


def test_user_primary_role_column():
    """Test that primary_role column uses UserRole enum."""
    mapper = inspect(User)
    primary_role_col = mapper.columns["primary_role"]

    assert primary_role_col.nullable is True
    assert hasattr(primary_role_col.type, "enum_class")
    assert primary_role_col.type.enum_class is UserRole


def test_user_timezone_column():
    """Test that timezone column has correct properties."""
    mapper = inspect(User)
    timezone_col = mapper.columns["timezone"]

    assert timezone_col.type.python_type is str
    assert timezone_col.type.length == 50
    assert timezone_col.nullable is True


def test_user_availability_status_column():
    """Test that availability_status column uses AvailabilityStatus enum."""
    mapper = inspect(User)
    availability_status_col = mapper.columns["availability_status"]

    assert availability_status_col.nullable is False
    assert hasattr(availability_status_col.type, "enum_class")
    assert availability_status_col.type.enum_class is AvailabilityStatus
    assert availability_status_col.default.arg == AvailabilityStatus.JUST_BROWSING
    assert availability_status_col.server_default is not None


def test_user_builder_score_column():
    """Test that builder_score column has correct properties."""
    mapper = inspect(User)
    builder_score_col = mapper.columns["builder_score"]

    assert builder_score_col.type.python_type is float
    assert builder_score_col.nullable is False
    assert builder_score_col.default.arg == 0.0
    assert builder_score_col.server_default is not None


def test_user_bio_column():
    """Test that bio column has correct properties."""
    mapper = inspect(User)
    bio_col = mapper.columns["bio"]

    # Text columns don't have a length property
    assert bio_col.nullable is True


def test_user_contact_links_column():
    """Test that contact_links column has correct properties."""
    mapper = inspect(User)
    contact_links_col = mapper.columns["contact_links"]

    assert contact_links_col.nullable is False
    # The default is a callable that returns an empty dict
    assert callable(contact_links_col.default.arg)
    assert contact_links_col.server_default is not None


def test_user_github_username_column():
    """Test that github_username column has correct properties."""
    mapper = inspect(User)
    github_username_col = mapper.columns["github_username"]

    assert github_username_col.type.python_type is str
    assert github_username_col.type.length == 100
    assert github_username_col.nullable is True
    assert github_username_col.unique is True


def test_user_github_access_token_encrypted_column():
    """Test that github_access_token_encrypted column has correct properties."""
    mapper = inspect(User)
    github_token_col = mapper.columns["github_access_token_encrypted"]

    assert github_token_col.type.python_type is str
    assert github_token_col.type.length == 500
    assert github_token_col.nullable is True


def test_user_onboarding_completed_column():
    """Test that onboarding_completed column has correct properties."""
    mapper = inspect(User)
    onboarding_col = mapper.columns["onboarding_completed"]

    assert onboarding_col.type.python_type is bool
    assert onboarding_col.nullable is False
    assert onboarding_col.default.arg is False
    assert onboarding_col.server_default is not None


def test_user_search_vector_column():
    """Test that search_vector column exists and is nullable."""
    mapper = inspect(User)
    search_vector_col = mapper.columns["search_vector"]

    assert search_vector_col.nullable is True


def test_user_embedding_column():
    """Test that embedding column exists and is nullable."""
    mapper = inspect(User)
    embedding_col = mapper.columns["embedding"]

    assert embedding_col.nullable is True


def test_user_has_tablename():
    """Test that User has a table name defined."""
    assert hasattr(User, "__tablename__")
    assert User.__tablename__ == "users"


def test_user_inherits_ulid_mixin():
    """Test that User inherits from ULIDMixin."""
    from app.db.base import ULIDMixin

    assert issubclass(User, ULIDMixin)


def test_user_inherits_timestamp_mixin():
    """Test that User inherits from TimestampMixin."""
    from app.db.base import TimestampMixin

    assert issubclass(User, TimestampMixin)

    # Verify timestamp columns are present
    mapper = inspect(User)
    columns = {col.key for col in mapper.columns}

    assert "created_at" in columns
    assert "updated_at" in columns


def test_user_has_indexes():
    """Test that User has required indexes."""
    indexes = {idx.name for idx in User.__table__.indexes}

    # Check for GIN index on search_vector
    assert "ix_users_search_vector" in indexes

    # Check for HNSW index on embedding
    assert "ix_users_embedding" in indexes

    # Check for composite index on primary_role and availability_status
    assert "ix_users_primary_role_availability" in indexes


def test_user_has_relationships():
    """Test that User has defined relationships."""
    mapper = inspect(User)
    relationships = {rel.key for rel in mapper.relationships}

    assert "skills" in relationships
    assert "refresh_tokens" in relationships


def test_refresh_token_model_exists():
    """Test that RefreshToken model exists and is a subclass of Base."""
    assert RefreshToken is not None
    assert issubclass(RefreshToken, Base)


def test_refresh_token_has_required_columns():
    """Test that RefreshToken has all required columns."""
    mapper = inspect(RefreshToken)
    columns = {col.key for col in mapper.columns}

    assert "id" in columns
    assert "user_id" in columns
    assert "token_hash" in columns
    assert "expires_at" in columns
    assert "revoked_at" in columns
    assert "created_at" in columns


def test_refresh_token_id_column():
    """Test that id column has correct properties."""
    mapper = inspect(RefreshToken)
    id_col = mapper.columns["id"]

    assert id_col.type.python_type is str
    assert id_col.type.length == 26
    assert id_col.primary_key is True
    assert id_col.default is not None


def test_refresh_token_user_id_column():
    """Test that user_id column has correct properties including FK."""
    mapper = inspect(RefreshToken)
    user_id_col = mapper.columns["user_id"]

    assert user_id_col.type.python_type is str
    assert user_id_col.type.length == 26
    assert user_id_col.nullable is False
    assert user_id_col.index is True

    # Check foreign key
    assert len(user_id_col.foreign_keys) == 1
    fk = list(user_id_col.foreign_keys)[0]
    assert str(fk.column) == "users.id"
    assert fk.ondelete == "CASCADE"


def test_refresh_token_token_hash_column():
    """Test that token_hash column has correct properties."""
    mapper = inspect(RefreshToken)
    token_hash_col = mapper.columns["token_hash"]

    assert token_hash_col.type.python_type is str
    assert token_hash_col.type.length == 64
    assert token_hash_col.nullable is False
    assert token_hash_col.unique is True


def test_refresh_token_expires_at_column():
    """Test that expires_at column has correct properties."""
    mapper = inspect(RefreshToken)
    expires_at_col = mapper.columns["expires_at"]

    assert expires_at_col.nullable is False


def test_refresh_token_revoked_at_column():
    """Test that revoked_at column has correct properties."""
    mapper = inspect(RefreshToken)
    revoked_at_col = mapper.columns["revoked_at"]

    assert revoked_at_col.nullable is True


def test_refresh_token_created_at_column():
    """Test that created_at column has correct properties."""
    mapper = inspect(RefreshToken)
    created_at_col = mapper.columns["created_at"]

    assert created_at_col.nullable is False
    assert created_at_col.server_default is not None


def test_refresh_token_has_tablename():
    """Test that RefreshToken has a table name defined."""
    assert hasattr(RefreshToken, "__tablename__")
    assert RefreshToken.__tablename__ == "refresh_tokens"


def test_refresh_token_inherits_ulid_mixin():
    """Test that RefreshToken inherits from ULIDMixin."""
    from app.db.base import ULIDMixin

    assert issubclass(RefreshToken, ULIDMixin)


def test_refresh_token_has_relationship():
    """Test that RefreshToken has user relationship."""
    mapper = inspect(RefreshToken)
    relationships = {rel.key for rel in mapper.relationships}

    assert "user" in relationships


def test_user_skills_table_exists():
    """Test that user_skills association table exists."""
    assert user_skills is not None
    assert user_skills.name == "user_skills"


def test_user_skills_has_columns():
    """Test that user_skills has required columns."""
    columns = {col.name for col in user_skills.columns}

    assert "user_id" in columns
    assert "skill_id" in columns
    assert "added_at" in columns


def test_user_skills_composite_pk():
    """Test that user_skills has composite primary key."""
    pk_columns = [col.name for col in user_skills.primary_key.columns]

    assert len(pk_columns) == 2
    assert "user_id" in pk_columns
    assert "skill_id" in pk_columns


def test_user_skills_foreign_keys():
    """Test that user_skills has foreign keys to users and skills."""
    user_id_col = user_skills.c.user_id
    skill_id_col = user_skills.c.skill_id

    # Check user_id foreign key
    assert len(user_id_col.foreign_keys) == 1
    user_fk = list(user_id_col.foreign_keys)[0]
    assert str(user_fk.column) == "users.id"
    assert user_fk.ondelete == "CASCADE"

    # Check skill_id foreign key
    assert len(skill_id_col.foreign_keys) == 1
    skill_fk = list(skill_id_col.foreign_keys)[0]
    assert str(skill_fk.column) == "skills.id"
    assert skill_fk.ondelete == "CASCADE"


def test_user_skills_added_at_column():
    """Test that added_at column has correct properties."""
    added_at_col = user_skills.c.added_at

    assert added_at_col.nullable is False
    assert added_at_col.server_default is not None


@pytest.mark.asyncio
@pytest.mark.skip(reason="Requires running database")
async def test_user_database_integration():
    """Test that User model works with database operations."""
    from app.db.engine import async_session_factory, engine

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
                primary_role=UserRole.ENGINEER,
                availability_status=AvailabilityStatus.OPEN_TO_TRIBE,
            )
            session.add(user)
            await session.commit()
            await session.refresh(user)

            # Verify the user was created
            assert user.id is not None
            assert len(user.id) == 26
            assert user.email == "test@example.com"
            assert user.username == "testuser"
            assert user.display_name == "Test User"
            assert user.primary_role == UserRole.ENGINEER
            assert user.availability_status == AvailabilityStatus.OPEN_TO_TRIBE
            assert user.builder_score == 0.0
            assert user.onboarding_completed is False
            assert user.contact_links == {}
            assert user.created_at is not None
            assert user.updated_at is not None
    finally:
        # Clean up
        async with engine.begin() as conn:
            await conn.run_sync(Base.metadata.drop_all)


@pytest.mark.asyncio
@pytest.mark.skip(reason="Requires running database")
async def test_refresh_token_cascade_delete():
    """Test that refresh tokens are deleted when user is deleted."""
    from datetime import datetime, timedelta

    from app.db.engine import async_session_factory, engine

    # Create table
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    try:
        user_id = None
        # Create a user with a refresh token
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

            refresh_token = RefreshToken(
                user_id=user.id,
                token_hash="a" * 64,
                expires_at=datetime.utcnow() + timedelta(days=30),
            )
            session.add(refresh_token)
            await session.commit()

        # Delete the user
        async with async_session_factory() as session:
            user = await session.get(User, user_id)
            await session.delete(user)
            await session.commit()

        # Verify refresh token was also deleted
        async with async_session_factory() as session:
            from sqlalchemy import select

            result = await session.execute(
                select(RefreshToken).where(RefreshToken.user_id == user_id)
            )
            tokens = result.scalars().all()
            assert len(tokens) == 0
    finally:
        # Clean up
        async with engine.begin() as conn:
            await conn.run_sync(Base.metadata.drop_all)
