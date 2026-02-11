"""Seed data for projects."""

from datetime import datetime, timezone

from sqlalchemy import insert
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.enums import CollaboratorStatus, ProjectStatus
from app.models.project import Project, project_collaborators


async def seed_projects(session: AsyncSession, users_dict: dict[str, str]) -> dict[str, str]:
    """
    Seed projects data into the database.

    Creates exactly 6 projects matching the prototype specifications with owners,
    collaborators, tech stacks, and impact metrics.

    Args:
        session: Async database session
        users_dict: Dictionary mapping username to user ID

    Returns:
        Dictionary mapping project title to project ID
    """
    projects_data = [
        {
            "title": "AI Resume Builder",
            "owner": "mayachen",
            "status": ProjectStatus.SHIPPED,
            "description": "An AI-powered resume builder that helps job seekers create ATS-friendly resumes with real-time feedback and optimization suggestions.",
            "tech_stack": ["React", "Python", "OpenAI", "PostgreSQL"],
            "github_stars": 340,
            "impact_metrics": {
                "users": 1200,
                "stars": 340,
            },
        },
        {
            "title": "Tribe Finder",
            "owner": "mayachen",
            "collaborators": ["priyasharma"],
            "status": ProjectStatus.IN_PROGRESS,
            "description": "A social network where clout comes from shipping. Connect your GitHub, form a tribe, and let your work speak.",
            "tech_stack": ["Next.js", "Go", "PostgreSQL"],
        },
        {
            "title": "Open Source CRM",
            "owner": "davidmorales",
            "status": ProjectStatus.IN_PROGRESS,
            "description": "A modern, open-source CRM built for small teams. Simple, fast, and self-hostable.",
            "tech_stack": ["React", "Node.js", "PostgreSQL"],
            "github_stars": 89,
        },
        {
            "title": "Design System Kit",
            "owner": "jamesokafor",
            "status": ProjectStatus.SHIPPED,
            "description": "A comprehensive design system with Figma components and React implementation. Battle-tested in production.",
            "tech_stack": ["Figma", "React", "Storybook"],
            "github_stars": 520,
            "impact_metrics": {
                "stars": 520,
                "downloads": 15000,
            },
        },
        {
            "title": "ML Pipeline Framework",
            "owner": "sarahkim",
            "status": ProjectStatus.SHIPPED,
            "description": "Production-ready ML pipeline framework for data scientists. Handles training, deployment, and monitoring.",
            "tech_stack": ["Python", "TensorFlow", "Docker"],
            "github_stars": 2100,
            "impact_metrics": {
                "stars": 2100,
                "companies_using": 45,
            },
        },
        {
            "title": "Growth Analytics Dashboard",
            "owner": "davidmorales",
            "collaborators": ["elenavolkov"],
            "status": ProjectStatus.IN_PROGRESS,
            "description": "Real-time analytics dashboard for tracking product growth metrics. Beautiful visualizations and actionable insights.",
            "tech_stack": ["Next.js", "Python", "Grafana"],
        },
    ]

    # Prepare projects for bulk insert
    projects_for_insert = []
    for project_data in projects_data:
        project_dict = {
            "owner_id": users_dict[project_data["owner"]],
            "title": project_data["title"],
            "description": project_data.get("description"),
            "status": project_data["status"],
            "tech_stack": project_data["tech_stack"],
            "github_stars": project_data.get("github_stars"),
            "impact_metrics": project_data.get("impact_metrics", {}),
        }
        projects_for_insert.append(project_dict)

    # Bulk insert all projects
    stmt = insert(Project).values(projects_for_insert).returning(Project.id, Project.title)
    result = await session.execute(stmt)
    project_rows = result.fetchall()

    # Build lookup dictionary mapping title to ID
    project_lookup = {row.title: row.id for row in project_rows}

    # Create ProjectCollaborator relationships
    collaborator_relationships = []
    current_time = datetime.now(timezone.utc)

    for project_data in projects_data:
        if "collaborators" in project_data:
            project_id = project_lookup[project_data["title"]]
            for collaborator_username in project_data["collaborators"]:
                collaborator_relationships.append({
                    "project_id": project_id,
                    "user_id": users_dict[collaborator_username],
                    "status": CollaboratorStatus.CONFIRMED,
                    "invited_at": current_time,
                    "confirmed_at": current_time,
                })

    # Bulk insert all collaborator relationships
    if collaborator_relationships:
        stmt = insert(project_collaborators).values(collaborator_relationships)
        await session.execute(stmt)

    await session.commit()

    return project_lookup
