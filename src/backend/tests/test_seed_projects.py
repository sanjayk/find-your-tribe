"""Tests for projects seed data."""

import pytest
from sqlalchemy import select

from app.db.base import Base
from app.models.enums import CollaboratorStatus, ProjectStatus
from app.models.project import Project, project_collaborators
from app.seed.projects import seed_projects
from app.seed.skills import seed_skills
from app.seed.users import seed_users


@pytest.mark.asyncio
async def test_seed_projects_creates_exactly_6_projects():
    """Test that seed_projects creates exactly 6 projects."""
    from app.db.engine import async_session_factory, engine

    # Create table
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    try:
        async with async_session_factory() as session:
            # Seed prerequisites
            skills_dict = await seed_skills(session)
            users_dict = await seed_users(session, skills_dict)

            # Seed projects
            project_lookup = await seed_projects(session, users_dict)

            # Verify exactly 14 projects were created
            assert len(project_lookup) == 14

            # Verify projects exist in database
            result = await session.execute(select(Project))
            projects = result.scalars().all()
            assert len(projects) == 14
    finally:
        # Clean up
        async with engine.begin() as conn:
            await conn.run_sync(Base.metadata.drop_all)


@pytest.mark.asyncio
async def test_seed_projects_correct_titles():
    """Test that all projects have correct titles."""
    from app.db.engine import async_session_factory, engine

    # Create table
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    try:
        async with async_session_factory() as session:
            skills_dict = await seed_skills(session)
            users_dict = await seed_users(session, skills_dict)
            project_lookup = await seed_projects(session, users_dict)

            # Expected project titles
            expected_titles = {
                "AI Resume Builder",
                "Tribe Finder",
                "GraphQL Playground Pro",
                "ML Pipeline Framework",
                "DataLens",
                "NeuralSearch",
                "DevSync",
                "ShipLog",
                "go-queue",
                "MicroMon",
                "InfraBlocks",
                "Design System Kit",
                "Open Source CRM",
                "Growth Analytics Dashboard",
            }

            # Verify all expected titles are in lookup
            assert set(project_lookup.keys()) == expected_titles
    finally:
        # Clean up
        async with engine.begin() as conn:
            await conn.run_sync(Base.metadata.drop_all)


@pytest.mark.asyncio
async def test_seed_projects_correct_statuses():
    """Test that projects have correct statuses."""
    from app.db.engine import async_session_factory, engine

    # Create table
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    try:
        async with async_session_factory() as session:
            skills_dict = await seed_skills(session)
            users_dict = await seed_users(session, skills_dict)
            project_lookup = await seed_projects(session, users_dict)

            # Expected statuses
            expected_statuses = {
                "AI Resume Builder": ProjectStatus.SHIPPED,
                "Tribe Finder": ProjectStatus.IN_PROGRESS,
                "Open Source CRM": ProjectStatus.IN_PROGRESS,
                "Design System Kit": ProjectStatus.SHIPPED,
                "ML Pipeline Framework": ProjectStatus.SHIPPED,
                "Growth Analytics Dashboard": ProjectStatus.IN_PROGRESS,
            }

            for title, expected_status in expected_statuses.items():
                project_id = project_lookup[title]
                result = await session.execute(
                    select(Project).where(Project.id == project_id)
                )
                project = result.scalar_one()
                assert project.status == expected_status, (
                    f"Project {title} has status {project.status}, expected {expected_status}"
                )
    finally:
        # Clean up
        async with engine.begin() as conn:
            await conn.run_sync(Base.metadata.drop_all)


@pytest.mark.asyncio
async def test_seed_projects_correct_github_stars():
    """Test that projects have correct GitHub stars."""
    from app.db.engine import async_session_factory, engine

    # Create table
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    try:
        async with async_session_factory() as session:
            skills_dict = await seed_skills(session)
            users_dict = await seed_users(session, skills_dict)
            project_lookup = await seed_projects(session, users_dict)

            # Expected GitHub stars
            expected_stars = {
                "AI Resume Builder": 340,
                "Open Source CRM": 89,
                "Design System Kit": 520,
                "ML Pipeline Framework": 2100,
            }

            for title, expected_count in expected_stars.items():
                project_id = project_lookup[title]
                result = await session.execute(
                    select(Project).where(Project.id == project_id)
                )
                project = result.scalar_one()
                assert project.github_stars == expected_count, (
                    f"Project {title} has {project.github_stars} stars, expected {expected_count}"
                )
    finally:
        # Clean up
        async with engine.begin() as conn:
            await conn.run_sync(Base.metadata.drop_all)


@pytest.mark.asyncio
async def test_seed_projects_correct_tech_stacks():
    """Test that projects have correct tech stacks."""
    from app.db.engine import async_session_factory, engine

    # Create table
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    try:
        async with async_session_factory() as session:
            skills_dict = await seed_skills(session)
            users_dict = await seed_users(session, skills_dict)
            project_lookup = await seed_projects(session, users_dict)

            # Expected tech stacks
            expected_tech_stacks = {
                "AI Resume Builder": ["React", "Python", "OpenAI", "PostgreSQL"],
                "Tribe Finder": ["Next.js", "FastAPI", "PostgreSQL", "GraphQL"],
                "GraphQL Playground Pro": ["TypeScript", "React", "GraphQL", "Electron"],
                "ML Pipeline Framework": ["Python", "TensorFlow", "Docker", "Kubernetes"],
                "DataLens": ["Python", "React", "D3.js", "FastAPI"],
                "NeuralSearch": ["Python", "pgvector", "OpenAI", "FastAPI"],
                "DevSync": ["TypeScript", "Go", "WebSocket", "PostgreSQL"],
                "ShipLog": ["Next.js", "Python", "PostgreSQL", "GitHub API"],
                "go-queue": ["Go", "Redis", "gRPC", "Docker"],
                "MicroMon": ["Go", "Kubernetes", "ClickHouse", "React"],
                "InfraBlocks": ["Terraform", "AWS", "Docker", "GitHub Actions"],
                "Design System Kit": ["Figma", "React", "Storybook", "TypeScript"],
                "Open Source CRM": ["React", "Node.js", "PostgreSQL"],
                "Growth Analytics Dashboard": ["Next.js", "Python", "Grafana", "PostgreSQL"],
            }

            for title, expected_stack in expected_tech_stacks.items():
                project_id = project_lookup[title]
                result = await session.execute(
                    select(Project).where(Project.id == project_id)
                )
                project = result.scalar_one()
                assert project.tech_stack == expected_stack, (
                    f"Project {title} has tech stack {project.tech_stack}, expected {expected_stack}"
                )
    finally:
        # Clean up
        async with engine.begin() as conn:
            await conn.run_sync(Base.metadata.drop_all)


@pytest.mark.asyncio
async def test_seed_projects_impact_metrics():
    """Test that shipped projects have impact_metrics populated."""
    from app.db.engine import async_session_factory, engine

    # Create table
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    try:
        async with async_session_factory() as session:
            skills_dict = await seed_skills(session)
            users_dict = await seed_users(session, skills_dict)
            project_lookup = await seed_projects(session, users_dict)

            # Check shipped projects have impact metrics
            shipped_projects = [
                "AI Resume Builder",
                "Design System Kit",
                "ML Pipeline Framework",
            ]

            for title in shipped_projects:
                project_id = project_lookup[title]
                result = await session.execute(
                    select(Project).where(Project.id == project_id)
                )
                project = result.scalar_one()
                assert project.impact_metrics is not None
                assert isinstance(project.impact_metrics, dict)
                assert len(project.impact_metrics) > 0, (
                    f"Project {title} should have impact metrics"
                )

            # Verify specific impact metrics
            ai_resume_id = project_lookup["AI Resume Builder"]
            result = await session.execute(
                select(Project).where(Project.id == ai_resume_id)
            )
            ai_resume = result.scalar_one()
            assert ai_resume.impact_metrics["users"] == 1200
            assert ai_resume.impact_metrics["stars"] == 340
    finally:
        # Clean up
        async with engine.begin() as conn:
            await conn.run_sync(Base.metadata.drop_all)


@pytest.mark.asyncio
async def test_seed_projects_correct_owners():
    """Test that projects have correct owners."""
    from app.db.engine import async_session_factory, engine

    # Create table
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    try:
        async with async_session_factory() as session:
            skills_dict = await seed_skills(session)
            users_dict = await seed_users(session, skills_dict)
            project_lookup = await seed_projects(session, users_dict)

            # Expected owners
            expected_owners = {
                "AI Resume Builder": "mayachen",
                "Tribe Finder": "mayachen",
                "Open Source CRM": "davidmorales",
                "Design System Kit": "jamesokafor",
                "ML Pipeline Framework": "sarahkim",
                "Growth Analytics Dashboard": "davidmorales",
            }

            for title, expected_owner in expected_owners.items():
                project_id = project_lookup[title]
                result = await session.execute(
                    select(Project).where(Project.id == project_id)
                )
                project = result.scalar_one()
                expected_owner_id = users_dict[expected_owner]
                assert project.owner_id == expected_owner_id, (
                    f"Project {title} has owner_id {project.owner_id}, expected {expected_owner_id}"
                )
    finally:
        # Clean up
        async with engine.begin() as conn:
            await conn.run_sync(Base.metadata.drop_all)


@pytest.mark.asyncio
async def test_seed_projects_collaborators():
    """Test that projects have correct collaborators."""
    from app.db.engine import async_session_factory, engine

    # Create table
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    try:
        async with async_session_factory() as session:
            skills_dict = await seed_skills(session)
            users_dict = await seed_users(session, skills_dict)
            project_lookup = await seed_projects(session, users_dict)

            # Tribe Finder should have Priya and James as collaborators
            tribe_finder_id = project_lookup["Tribe Finder"]
            priya_id = users_dict["priyasharma"]
            james_id = users_dict["jamesokafor"]

            result = await session.execute(
                select(project_collaborators).where(
                    project_collaborators.c.project_id == tribe_finder_id
                )
            )
            collab_rows = result.fetchall()
            assert len(collab_rows) == 2
            collab_user_ids = {row.user_id for row in collab_rows}
            assert priya_id in collab_user_ids
            assert james_id in collab_user_ids
            # Verify roles
            collab_by_user = {row.user_id: row for row in collab_rows}
            assert collab_by_user[priya_id].role == "backend"
            assert collab_by_user[james_id].role == "design"

            # Growth Analytics Dashboard should have Elena as collaborator
            dashboard_id = project_lookup["Growth Analytics Dashboard"]
            elena_id = users_dict["elenavolkov"]

            result = await session.execute(
                select(project_collaborators).where(
                    project_collaborators.c.project_id == dashboard_id
                )
            )
            collab_rows = result.fetchall()
            assert len(collab_rows) == 1
            assert collab_rows[0].user_id == elena_id
            assert collab_rows[0].role == "data visualization"
    finally:
        # Clean up
        async with engine.begin() as conn:
            await conn.run_sync(Base.metadata.drop_all)


@pytest.mark.asyncio
async def test_seed_projects_collaborator_status():
    """Test that all collaborators have CONFIRMED status."""
    from app.db.engine import async_session_factory, engine

    # Create table
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    try:
        async with async_session_factory() as session:
            skills_dict = await seed_skills(session)
            users_dict = await seed_users(session, skills_dict)
            await seed_projects(session, users_dict)

            # Check all collaborators have CONFIRMED status
            result = await session.execute(select(project_collaborators))
            collab_rows = result.fetchall()

            for row in collab_rows:
                assert row.status == CollaboratorStatus.CONFIRMED
                assert row.invited_at is not None
                assert row.confirmed_at is not None
    finally:
        # Clean up
        async with engine.begin() as conn:
            await conn.run_sync(Base.metadata.drop_all)


@pytest.mark.asyncio
async def test_seed_projects_returns_lookup_dict():
    """Test that seed_projects returns a lookup dictionary."""
    from app.db.engine import async_session_factory, engine

    # Create table
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    try:
        async with async_session_factory() as session:
            skills_dict = await seed_skills(session)
            users_dict = await seed_users(session, skills_dict)
            project_lookup = await seed_projects(session, users_dict)

            # Verify it's a dictionary
            assert isinstance(project_lookup, dict)

            # Verify all entries map title to ID
            for title, project_id in project_lookup.items():
                assert isinstance(title, str)
                assert isinstance(project_id, str)
                assert len(project_id) == 26  # ULID length

                # Verify project exists in database
                result = await session.execute(
                    select(Project).where(Project.title == title)
                )
                project = result.scalar_one()
                assert project.id == project_id
    finally:
        # Clean up
        async with engine.begin() as conn:
            await conn.run_sync(Base.metadata.drop_all)


@pytest.mark.asyncio
async def test_seed_projects_all_have_descriptions():
    """Test that all projects have descriptions."""
    from app.db.engine import async_session_factory, engine

    # Create table
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    try:
        async with async_session_factory() as session:
            skills_dict = await seed_skills(session)
            users_dict = await seed_users(session, skills_dict)
            await seed_projects(session, users_dict)

            result = await session.execute(select(Project))
            projects = result.scalars().all()

            for project in projects:
                assert project.description is not None
                assert len(project.description) > 0, (
                    f"Project {project.title} has no description"
                )
    finally:
        # Clean up
        async with engine.begin() as conn:
            await conn.run_sync(Base.metadata.drop_all)


@pytest.mark.asyncio
async def test_seed_projects_all_have_tech_stacks():
    """Test that all projects have tech stacks."""
    from app.db.engine import async_session_factory, engine

    # Create table
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    try:
        async with async_session_factory() as session:
            skills_dict = await seed_skills(session)
            users_dict = await seed_users(session, skills_dict)
            await seed_projects(session, users_dict)

            result = await session.execute(select(Project))
            projects = result.scalars().all()

            for project in projects:
                assert project.tech_stack is not None
                assert isinstance(project.tech_stack, list)
                assert len(project.tech_stack) > 0, (
                    f"Project {project.title} has no tech stack"
                )
    finally:
        # Clean up
        async with engine.begin() as conn:
            await conn.run_sync(Base.metadata.drop_all)
