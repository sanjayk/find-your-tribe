"""Seed data for projects."""

from datetime import datetime, timezone

from sqlalchemy import insert
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.enums import CollaboratorStatus, ProjectStatus
from app.models.project import Project, project_collaborators


async def seed_projects(session: AsyncSession, users_dict: dict[str, str]) -> dict[str, str]:
    """
    Seed projects data into the database.

    Creates 14 projects with varying richness:
    - Some users have 2-3 projects (full profiles)
    - Some users have 1 project (medium profiles)
    - 2 sparse users have 0 projects
    """
    projects_data = [
        # ── mayachen (3 projects) ──
        {
            "title": "AI Resume Builder",
            "owner": "mayachen",
            "status": ProjectStatus.SHIPPED,
            "description": "An AI-powered resume builder that helps job seekers create ATS-friendly resumes with real-time feedback and optimization suggestions. Used by 1,200+ job seekers.",
            "tech_stack": ["React", "Python", "OpenAI", "PostgreSQL"],
            "github_repo_full_name": "mayachen/ai-resume-builder",
            "github_stars": 340,
            "impact_metrics": {"users": 1200, "stars": 340},
            "links": {"demo": "https://resumeai.mayachen.dev", "github": "https://github.com/mayachen/ai-resume-builder"},
        },
        {
            "title": "Tribe Finder",
            "owner": "mayachen",
            "collaborators": ["priyasharma"],
            "status": ProjectStatus.IN_PROGRESS,
            "description": "A social network where clout comes from shipping. Connect your GitHub, form a tribe, and let your work speak.",
            "tech_stack": ["Next.js", "FastAPI", "PostgreSQL", "GraphQL"],
            "github_repo_full_name": "mayachen/tribe-finder",
            "github_stars": 52,
            "links": {"github": "https://github.com/mayachen/tribe-finder"},
        },
        {
            "title": "GraphQL Playground Pro",
            "owner": "mayachen",
            "status": ProjectStatus.SHIPPED,
            "description": "A better GraphQL explorer with schema diffing, saved queries, and team collaboration. Born out of frustration with existing tools.",
            "tech_stack": ["TypeScript", "React", "GraphQL", "Electron"],
            "github_repo_full_name": "mayachen/gql-playground-pro",
            "github_stars": 890,
            "impact_metrics": {"stars": 890, "weekly_downloads": 3200},
            "links": {"github": "https://github.com/mayachen/gql-playground-pro"},
        },
        # ── sarahkim (3 projects) ──
        {
            "title": "ML Pipeline Framework",
            "owner": "sarahkim",
            "status": ProjectStatus.SHIPPED,
            "description": "Production-ready ML pipeline framework for data scientists. Handles training, deployment, and monitoring with a single config file. Used by 45 companies including 3 Fortune 500.",
            "tech_stack": ["Python", "TensorFlow", "Docker", "Kubernetes"],
            "github_repo_full_name": "sarahkim-ml/mlpipe",
            "github_stars": 2100,
            "impact_metrics": {"stars": 2100, "companies_using": 45},
            "links": {"docs": "https://mlpipe.dev", "github": "https://github.com/sarahkim-ml/mlpipe"},
        },
        {
            "title": "DataLens",
            "owner": "sarahkim",
            "collaborators": ["elenavolkov"],
            "status": ProjectStatus.SHIPPED,
            "description": "Visual data exploration tool that makes EDA delightful. Drag-and-drop interface generates publication-ready charts and statistical summaries.",
            "tech_stack": ["Python", "React", "D3.js", "FastAPI"],
            "github_repo_full_name": "sarahkim-ml/datalens",
            "github_stars": 670,
            "impact_metrics": {"stars": 670, "monthly_users": 800},
            "links": {"demo": "https://datalens.sarahkim.io"},
        },
        {
            "title": "NeuralSearch",
            "owner": "sarahkim",
            "status": ProjectStatus.IN_PROGRESS,
            "description": "Semantic search engine for internal documentation. Uses embeddings to find answers across Notion, Confluence, and Google Docs.",
            "tech_stack": ["Python", "pgvector", "OpenAI", "FastAPI"],
            "links": {},
        },
        # ── tomnakamura (2 projects) ──
        {
            "title": "DevSync",
            "owner": "tomnakamura",
            "status": ProjectStatus.SHIPPED,
            "description": "Real-time code collaboration tool for remote teams. Think Google Docs for your IDE. Acquired by Atlassian in 2024.",
            "tech_stack": ["TypeScript", "Go", "WebSocket", "PostgreSQL"],
            "github_stars": 4200,
            "impact_metrics": {"stars": 4200, "teams": 2000, "acquired": True},
            "links": {},
        },
        {
            "title": "ShipLog",
            "owner": "tomnakamura",
            "collaborators": ["marcusjohnson"],
            "status": ProjectStatus.IN_PROGRESS,
            "description": "Changelog-as-a-service for developer tools. Auto-generates beautiful release notes from your Git history and PRs.",
            "tech_stack": ["Next.js", "Python", "PostgreSQL", "GitHub API"],
            "github_repo_full_name": "tomnakamura/shiplog",
            "github_stars": 180,
            "links": {"demo": "https://shiplog.dev"},
        },
        # ── priyasharma (2 projects) ──
        {
            "title": "go-queue",
            "owner": "priyasharma",
            "status": ProjectStatus.SHIPPED,
            "description": "High-performance distributed task queue for Go. Redis-backed with at-least-once delivery, rate limiting, and dead letter queues. Battle-tested at scale.",
            "tech_stack": ["Go", "Redis", "gRPC", "Docker"],
            "github_repo_full_name": "priyasharma/go-queue",
            "github_stars": 1450,
            "impact_metrics": {"stars": 1450, "go_imports": 320},
            "links": {"docs": "https://go-queue.dev", "github": "https://github.com/priyasharma/go-queue"},
        },
        {
            "title": "MicroMon",
            "owner": "priyasharma",
            "status": ProjectStatus.IN_PROGRESS,
            "description": "Lightweight observability for microservices. Distributed tracing, metrics, and log correlation without the Datadog bill.",
            "tech_stack": ["Go", "Kubernetes", "ClickHouse", "React"],
            "github_repo_full_name": "priyasharma/micromon",
            "github_stars": 95,
            "links": {"github": "https://github.com/priyasharma/micromon"},
        },
        # ── marcusjohnson (1 project) ──
        {
            "title": "InfraBlocks",
            "owner": "marcusjohnson",
            "status": ProjectStatus.SHIPPED,
            "description": "Opinionated Terraform modules for startup infrastructure. One command to set up a production-ready AWS environment with CI/CD, monitoring, and security best practices.",
            "tech_stack": ["Terraform", "AWS", "Docker", "GitHub Actions"],
            "github_repo_full_name": "marcusj/infrablocks",
            "github_stars": 760,
            "impact_metrics": {"stars": 760, "startups_using": 30},
            "links": {"docs": "https://infrablocks.dev"},
        },
        # ── jamesokafor (1 project) ──
        {
            "title": "Design System Kit",
            "owner": "jamesokafor",
            "status": ProjectStatus.SHIPPED,
            "description": "A comprehensive design system with Figma components and React implementation. Battle-tested in production across 4 products.",
            "tech_stack": ["Figma", "React", "Storybook", "TypeScript"],
            "github_repo_full_name": "jamesokafor/design-system-kit",
            "github_stars": 520,
            "impact_metrics": {"stars": 520, "downloads": 15000},
            "links": {"demo": "https://design-system-kit.vercel.app"},
        },
        # ── davidmorales (2 projects) ──
        {
            "title": "Open Source CRM",
            "owner": "davidmorales",
            "status": ProjectStatus.IN_PROGRESS,
            "description": "A modern, open-source CRM built for small teams. Simple, fast, and self-hostable. No more paying Salesforce prices for 10 contacts.",
            "tech_stack": ["React", "Node.js", "PostgreSQL"],
            "github_repo_full_name": "davidmorales/open-crm",
            "github_stars": 89,
            "links": {"github": "https://github.com/davidmorales/open-crm"},
        },
        {
            "title": "Growth Analytics Dashboard",
            "owner": "davidmorales",
            "collaborators": ["elenavolkov"],
            "status": ProjectStatus.IN_PROGRESS,
            "description": "Real-time analytics dashboard for tracking product growth metrics. Beautiful visualizations and actionable insights without the enterprise price tag.",
            "tech_stack": ["Next.js", "Python", "Grafana", "PostgreSQL"],
            "links": {},
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
            "github_repo_full_name": project_data.get("github_repo_full_name"),
            "github_stars": project_data.get("github_stars"),
            "impact_metrics": project_data.get("impact_metrics", {}),
            "links": project_data.get("links", {}),
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
