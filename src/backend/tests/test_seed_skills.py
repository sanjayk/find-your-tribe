"""Tests for skills seed data."""

import pytest
from sqlalchemy import select

from app.db.base import Base
from app.models.enums import SkillCategory
from app.models.skill import Skill
from app.seed.skills import _slugify, seed_skills


def test_slugify_basic():
    """Test basic slugification."""
    assert _slugify("Python") == "python"
    assert _slugify("JavaScript") == "javascript"


def test_slugify_with_spaces():
    """Test slugification with spaces."""
    assert _slugify("User Research") == "user-research"
    assert _slugify("Product Strategy") == "product-strategy"


def test_slugify_with_special_chars():
    """Test slugification with special characters."""
    assert _slugify("Next.js") == "nextjs"
    assert _slugify("UI/UX") == "ui-ux"
    assert _slugify("Python (Data)") == "python-data"


@pytest.mark.asyncio
async def test_seed_skills_creates_all_skills():
    """Test that seed_skills creates 80+ skills."""
    from app.db.engine import async_session_factory, engine

    # Create table
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    try:
        async with async_session_factory() as session:
            skill_lookup = await seed_skills(session)

            # Verify at least 80 skills were created
            assert len(skill_lookup) >= 80

            # Verify skills exist in database
            result = await session.execute(select(Skill))
            skills = result.scalars().all()
            assert len(skills) >= 80
    finally:
        # Clean up
        async with engine.begin() as conn:
            await conn.run_sync(Base.metadata.drop_all)


@pytest.mark.asyncio
async def test_seed_skills_covers_all_categories():
    """Test that all 8 skill categories are covered."""
    from app.db.engine import async_session_factory, engine

    # Create table
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    try:
        async with async_session_factory() as session:
            await seed_skills(session)

            # Check each category has skills
            for category in SkillCategory:
                result = await session.execute(
                    select(Skill).where(Skill.category == category)
                )
                skills = result.scalars().all()
                assert len(skills) > 0, f"Category {category} has no skills"
    finally:
        # Clean up
        async with engine.begin() as conn:
            await conn.run_sync(Base.metadata.drop_all)


@pytest.mark.asyncio
async def test_seed_skills_slug_format():
    """Test that all skill slugs are in kebab-case."""
    from app.db.engine import async_session_factory, engine

    # Create table
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    try:
        async with async_session_factory() as session:
            await seed_skills(session)

            result = await session.execute(select(Skill))
            skills = result.scalars().all()

            for skill in skills:
                # Slugs should be lowercase
                assert skill.slug == skill.slug.lower()
                # Slugs should not have spaces
                assert " " not in skill.slug
    finally:
        # Clean up
        async with engine.begin() as conn:
            await conn.run_sync(Base.metadata.drop_all)


@pytest.mark.asyncio
async def test_seed_skills_returns_lookup_dict():
    """Test that seed_skills returns a lookup dictionary."""
    from app.db.engine import async_session_factory, engine

    # Create table
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    try:
        async with async_session_factory() as session:
            skill_lookup = await seed_skills(session)

            # Verify it's a dictionary
            assert isinstance(skill_lookup, dict)

            # Verify all entries map name to ID
            for name, skill_id in skill_lookup.items():
                assert isinstance(name, str)
                assert isinstance(skill_id, str)
                assert len(skill_id) == 26  # ULID length

                # Verify skill exists in database
                result = await session.execute(
                    select(Skill).where(Skill.name == name)
                )
                skill = result.scalar_one()
                assert skill.id == skill_id
    finally:
        # Clean up
        async with engine.begin() as conn:
            await conn.run_sync(Base.metadata.drop_all)


@pytest.mark.asyncio
async def test_seed_skills_specific_skills_exist():
    """Test that specific skills from the spec exist."""
    from app.db.engine import async_session_factory, engine

    # Create table
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    try:
        async with async_session_factory() as session:
            skill_lookup = await seed_skills(session)

            # Verify key skills from each category
            engineering_skills = ["Python", "JavaScript", "TypeScript", "React", "Next.js", "PostgreSQL", "GraphQL"]
            design_skills = ["Figma", "UI/UX", "Prototyping", "Design Systems"]
            product_skills = ["Product Strategy", "Roadmapping", "Analytics", "A/B Testing"]
            marketing_skills = ["Content Strategy", "SEO", "Social Media", "Copywriting"]
            growth_skills = ["Growth Hacking", "Paid Acquisition", "Community Building"]
            data_skills = ["Machine Learning", "Data Engineering", "SQL", "Data Visualization"]
            operations_skills = ["Project Management", "Agile", "DevOps", "Technical Writing"]
            other_skills = ["Public Speaking", "Fundraising", "Legal", "Recruiting"]

            all_required_skills = (
                engineering_skills + design_skills + product_skills + marketing_skills +
                growth_skills + data_skills + operations_skills + other_skills
            )

            for skill_name in all_required_skills:
                assert skill_name in skill_lookup, f"Required skill '{skill_name}' not found"
    finally:
        # Clean up
        async with engine.begin() as conn:
            await conn.run_sync(Base.metadata.drop_all)


@pytest.mark.asyncio
async def test_seed_skills_category_counts():
    """Test that each category has a reasonable number of skills."""
    from app.db.engine import async_session_factory, engine

    # Create table
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    try:
        async with async_session_factory() as session:
            await seed_skills(session)

            category_counts = {}
            for category in SkillCategory:
                result = await session.execute(
                    select(Skill).where(Skill.category == category)
                )
                skills = result.scalars().all()
                category_counts[category] = len(skills)

            # Engineering should be the largest category (30)
            assert category_counts[SkillCategory.ENGINEERING] >= 20

            # All categories should have at least a few skills
            for category, count in category_counts.items():
                assert count >= 5, f"Category {category} only has {count} skills"
    finally:
        # Clean up
        async with engine.begin() as conn:
            await conn.run_sync(Base.metadata.drop_all)
