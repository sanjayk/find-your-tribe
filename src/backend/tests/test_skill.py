"""Tests for Skill model."""

import pytest
from sqlalchemy import inspect

from app.db.base import Base
from app.models.enums import SkillCategory
from app.models.skill import Skill


def test_skill_model_exists():
    """Test that Skill model exists and is a subclass of Base."""
    assert Skill is not None
    assert issubclass(Skill, Base)


def test_skill_has_required_columns():
    """Test that Skill has all required columns."""
    mapper = inspect(Skill)
    columns = {col.key for col in mapper.columns}

    assert "id" in columns
    assert "name" in columns
    assert "slug" in columns
    assert "category" in columns


def test_skill_id_column():
    """Test that id column has correct properties."""
    mapper = inspect(Skill)
    id_col = mapper.columns["id"]

    assert id_col.type.python_type is str
    assert id_col.type.length == 26
    assert id_col.primary_key is True
    assert id_col.default is not None


def test_skill_name_column():
    """Test that name column has correct properties."""
    mapper = inspect(Skill)
    name_col = mapper.columns["name"]

    assert name_col.type.python_type is str
    assert name_col.type.length == 100
    assert name_col.nullable is False
    assert name_col.unique is True


def test_skill_slug_column():
    """Test that slug column has correct properties."""
    mapper = inspect(Skill)
    slug_col = mapper.columns["slug"]

    assert slug_col.type.python_type is str
    assert slug_col.type.length == 100
    assert slug_col.nullable is False
    assert slug_col.unique is True

    # Index is defined via __table_args__, not on the column itself
    indexes = {idx.name for idx in Skill.__table__.indexes}
    assert "ix_skills_slug" in indexes


def test_skill_category_column():
    """Test that category column uses SkillCategory enum."""
    mapper = inspect(Skill)
    category_col = mapper.columns["category"]

    assert category_col.nullable is False
    # Check that it's an enum type
    assert hasattr(category_col.type, "enum_class")
    assert category_col.type.enum_class is SkillCategory


def test_skill_has_tablename():
    """Test that Skill has a table name defined."""
    assert hasattr(Skill, "__tablename__")
    assert Skill.__tablename__ == "skills"


def test_skill_inherits_ulid_mixin():
    """Test that Skill inherits from ULIDMixin."""
    from app.db.base import ULIDMixin

    assert issubclass(Skill, ULIDMixin)


def test_skill_inherits_timestamp_mixin():
    """Test that Skill inherits from TimestampMixin."""
    from app.db.base import TimestampMixin

    assert issubclass(Skill, TimestampMixin)

    # Verify timestamp columns are present
    mapper = inspect(Skill)
    columns = {col.key for col in mapper.columns}

    assert "created_at" in columns
    assert "updated_at" in columns


@pytest.mark.asyncio
async def test_skill_database_integration():
    """Test that Skill model works with database operations."""
    from app.db.engine import async_session_factory, engine

    # Create table
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    try:
        # Create a skill
        async with async_session_factory() as session:
            skill = Skill(
                name="Python",
                slug="python",
                category=SkillCategory.ENGINEERING,
            )
            session.add(skill)
            await session.commit()
            await session.refresh(skill)

            # Verify the skill was created
            assert skill.id is not None
            assert len(skill.id) == 26
            assert skill.name == "Python"
            assert skill.slug == "python"
            assert skill.category == SkillCategory.ENGINEERING
            assert skill.created_at is not None
            assert skill.updated_at is not None
    finally:
        # Clean up
        async with engine.begin() as conn:
            await conn.run_sync(Base.metadata.drop_all)


@pytest.mark.asyncio
async def test_skill_unique_constraints():
    """Test that name and slug unique constraints are enforced."""
    from sqlalchemy.exc import IntegrityError

    from app.db.engine import async_session_factory, engine

    # Create table
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    try:
        # Create first skill
        async with async_session_factory() as session:
            skill1 = Skill(
                name="JavaScript",
                slug="javascript",
                category=SkillCategory.ENGINEERING,
            )
            session.add(skill1)
            await session.commit()

        # Attempt to create skill with duplicate name
        with pytest.raises(IntegrityError):
            async with async_session_factory() as session:
                skill2 = Skill(
                    name="JavaScript",
                    slug="js",
                    category=SkillCategory.ENGINEERING,
                )
                session.add(skill2)
                await session.commit()

        # Attempt to create skill with duplicate slug
        with pytest.raises(IntegrityError):
            async with async_session_factory() as session:
                skill3 = Skill(
                    name="JS",
                    slug="javascript",
                    category=SkillCategory.ENGINEERING,
                )
                session.add(skill3)
                await session.commit()
    finally:
        # Clean up
        async with engine.begin() as conn:
            await conn.run_sync(Base.metadata.drop_all)
