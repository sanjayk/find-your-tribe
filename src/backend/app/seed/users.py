"""Seed data for users."""

from sqlalchemy import insert
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.enums import AgentWorkflowStyle, AvailabilityStatus, UserRole
from app.models.user import User, user_skills


async def seed_users(session: AsyncSession, skills_dict: dict[str, str]) -> dict[str, str]:
    """
    Seed users data into the database.

    Creates 10 users with varying levels of profile completeness:
    - Full profiles (6): all fields populated, rich contact links
    - Medium profiles (2): most fields, fewer links
    - Sparse profiles (2): minimal data, just browsing
    """
    users_data = [
        # ── FULL PROFILES ──
        {
            "username": "mayachen",
            "display_name": "Maya Chen",
            "email": "maya.chen@example.com",
            "avatar_url": "https://api.dicebear.com/9.x/notionists/svg?seed=mayachen",
            "headline": "Full-Stack Developer & Open Source Contributor",
            "bio": "Building delightful web experiences with React and Python. Shipped 3 production apps in the last year. Love clean code, beautiful UIs, and GraphQL APIs. Previously at Stripe, now building independently.",
            "primary_role": UserRole.ENGINEER,
            "availability_status": AvailabilityStatus.OPEN_TO_TRIBE,
            "builder_score": 72.0,
            "github_username": "mayachen",
            "timezone": "America/Los_Angeles",
            "contact_links": {
                "twitter": "mayachendev",
                "website": "https://mayachen.dev",
                "linkedin": "mayachen",
            },
            "skills": ["React", "Python", "PostgreSQL", "FastAPI", "TypeScript", "GraphQL"],
            "agent_tools": ["Claude", "Cursor", "GitHub Copilot"],
            "agent_workflow_style": AgentWorkflowStyle.PAIR,
            "human_agent_ratio": 0.45,
        },
        {
            "username": "sarahkim",
            "display_name": "Sarah Kim",
            "email": "sarah.kim@example.com",
            "avatar_url": "https://api.dicebear.com/9.x/notionists/svg?seed=sarahkim",
            "headline": "ML Engineer — Making AI Practical",
            "bio": "Building intelligent systems that actually ship to production. Ex-Google Brain, now focused on applied ML for startups. Maintaining two popular open source frameworks for model deployment and data pipelines.",
            "primary_role": UserRole.ENGINEER,
            "availability_status": AvailabilityStatus.OPEN_TO_TRIBE,
            "builder_score": 71.0,
            "github_username": "sarahkim-ml",
            "timezone": "America/New_York",
            "contact_links": {
                "twitter": "sarahkimai",
                "website": "https://sarahkim.io",
                "linkedin": "sarahkim",
            },
            "skills": ["Python", "Machine Learning", "Data Engineering", "Docker", "PostgreSQL"],
            "agent_tools": ["Claude", "Cursor"],
            "agent_workflow_style": AgentWorkflowStyle.SWARM,
            "human_agent_ratio": 0.40,
        },
        {
            "username": "tomnakamura",
            "display_name": "Tom Nakamura",
            "email": "tom.nakamura@example.com",
            "avatar_url": "https://api.dicebear.com/9.x/notionists/svg?seed=tomnakamura",
            "headline": "Serial Founder & Full-Stack Engineer",
            "bio": "Third-time founder building developer tools. Sold my last startup (DevSync) to Atlassian. I code, design, and ship — typically all before lunch. Passionate about making developer workflows effortless.",
            "primary_role": UserRole.FOUNDER,
            "availability_status": AvailabilityStatus.OPEN_TO_TRIBE,
            "builder_score": 68.0,
            "github_username": "tomnakamura",
            "timezone": "Asia/Tokyo",
            "contact_links": {
                "twitter": "tomnakamura",
                "website": "https://nakamura.dev",
                "linkedin": "tomnakamura",
            },
            "skills": ["Python", "React", "PostgreSQL", "AWS", "TypeScript", "Go"],
            "agent_tools": ["Claude", "v0", "Cursor"],
            "agent_workflow_style": AgentWorkflowStyle.REVIEW,
            "human_agent_ratio": 0.55,
        },
        {
            "username": "priyasharma",
            "display_name": "Priya Sharma",
            "email": "priya.sharma@example.com",
            "avatar_url": "https://api.dicebear.com/9.x/notionists/svg?seed=priyasharma",
            "headline": "Backend Engineer — Distributed Systems",
            "bio": "Scaling systems to millions of requests. Love Go, microservices, and infrastructure that just works. Previously built the real-time messaging infra at Discord. Open source maintainer of go-queue.",
            "primary_role": UserRole.ENGINEER,
            "availability_status": AvailabilityStatus.OPEN_TO_TRIBE,
            "builder_score": 65.0,
            "github_username": "priyasharma",
            "timezone": "Asia/Kolkata",
            "contact_links": {
                "twitter": "priyasharmadev",
                "website": "https://priya.codes",
            },
            "skills": ["Go", "Kubernetes", "gRPC", "Docker", "AWS", "PostgreSQL"],
            "agent_tools": ["GitHub Copilot"],
            "agent_workflow_style": AgentWorkflowStyle.MINIMAL,
            "human_agent_ratio": 0.85,
        },
        {
            "username": "marcusjohnson",
            "display_name": "Marcus Johnson",
            "email": "marcus.johnson@example.com",
            "avatar_url": "https://api.dicebear.com/9.x/notionists/svg?seed=marcusjohnson",
            "headline": "DevOps & Platform Engineer",
            "bio": "Infrastructure as code evangelist. Built platform teams at two YC startups. I automate the boring stuff so engineers can focus on shipping. Kubernetes, Terraform, and a lot of YAML.",
            "primary_role": UserRole.ENGINEER,
            "availability_status": AvailabilityStatus.OPEN_TO_TRIBE,
            "builder_score": 61.0,
            "github_username": "marcusj",
            "timezone": "America/Chicago",
            "contact_links": {
                "twitter": "marcusjops",
                "linkedin": "marcusjohnson",
            },
            "skills": ["Docker", "Kubernetes", "AWS", "CI/CD", "Terraform", "Python"],
            "agent_tools": ["Claude", "GitHub Copilot", "Cursor"],
            "agent_workflow_style": AgentWorkflowStyle.AUTONOMOUS,
            "human_agent_ratio": 0.30,
        },
        {
            "username": "elenavolkov",
            "display_name": "Elena Volkov",
            "email": "elena.volkov@example.com",
            "avatar_url": "https://api.dicebear.com/9.x/notionists/svg?seed=elenavolkov",
            "headline": "Product Manager — 0→1 Specialist",
            "bio": "Translating messy user problems into clear product roadmaps. Shipped 4 products from zero to launch in the last 3 years. Data-informed but design-led. Love working with small, intense teams.",
            "primary_role": UserRole.PM,
            "availability_status": AvailabilityStatus.OPEN_TO_TRIBE,
            "builder_score": 52.0,
            "github_username": "elenavolkov",
            "timezone": "Europe/Berlin",
            "contact_links": {
                "twitter": "elena_v",
                "website": "https://elenavolkov.com",
                "linkedin": "elenavolkov",
            },
            "skills": ["Roadmapping", "Analytics", "User Stories", "Figma"],
            "agent_tools": ["Claude", "Notion AI"],
            "agent_workflow_style": AgentWorkflowStyle.PAIR,
            "human_agent_ratio": 0.65,
        },
        # ── MEDIUM PROFILES ──
        {
            "username": "jamesokafor",
            "display_name": "James Okafor",
            "email": "james.okafor@example.com",
            "avatar_url": "https://api.dicebear.com/9.x/notionists/svg?seed=jamesokafor",
            "headline": "Product Designer",
            "bio": "Crafting intuitive interfaces that users love. Passionate about design systems and accessibility.",
            "primary_role": UserRole.DESIGNER,
            "availability_status": AvailabilityStatus.AVAILABLE_FOR_PROJECTS,
            "builder_score": 58.0,
            "github_username": "jamesokafor",
            "timezone": "Europe/London",
            "contact_links": {
                "twitter": "jamesokafor",
            },
            "skills": ["Figma", "UI/UX", "Prototyping", "React"],
            "agent_tools": ["v0", "Midjourney"],
            "agent_workflow_style": AgentWorkflowStyle.REVIEW,
            "human_agent_ratio": 0.70,
        },
        {
            "username": "davidmorales",
            "display_name": "David Morales",
            "email": "david.morales@example.com",
            "avatar_url": "https://api.dicebear.com/9.x/notionists/svg?seed=davidmorales",
            "headline": "Growth Marketer & Builder",
            "bio": "Data-driven growth strategist. SEO nerd and content creator. Helping startups find product-market fit through rapid experimentation.",
            "primary_role": UserRole.MARKETER,
            "availability_status": AvailabilityStatus.AVAILABLE_FOR_PROJECTS,
            "builder_score": 45.0,
            "timezone": "America/Denver",
            "contact_links": {
                "twitter": "davidmorales",
                "linkedin": "davidmorales",
            },
            "skills": ["SEO", "Analytics", "Content Strategy"],
            "agent_tools": ["ChatGPT"],
            "agent_workflow_style": AgentWorkflowStyle.MINIMAL,
            "human_agent_ratio": 0.80,
        },
        # ── SPARSE PROFILES ──
        {
            "username": "alexrivera",
            "display_name": "Alex Rivera",
            "email": "alex.rivera@example.com",
            "headline": "Frontend Developer",
            "primary_role": UserRole.ENGINEER,
            "availability_status": AvailabilityStatus.JUST_BROWSING,
            "builder_score": 38.0,
            "contact_links": {},
            "skills": ["React", "TypeScript"],
            "agent_tools": [],
            "agent_workflow_style": None,
            "human_agent_ratio": None,
        },
        {
            "username": "aishapatel",
            "display_name": "Aisha Patel",
            "email": "aisha.patel@example.com",
            "primary_role": UserRole.DESIGNER,
            "availability_status": AvailabilityStatus.JUST_BROWSING,
            "builder_score": 44.0,
            "contact_links": {},
            "skills": ["User Research", "Prototyping"],
            "agent_tools": [],
            "agent_workflow_style": None,
            "human_agent_ratio": None,
        },
    ]

    # Prepare users for bulk insert (without skills)
    users_for_insert = []
    for user_data in users_data:
        user_dict = {
            "username": user_data["username"],
            "display_name": user_data["display_name"],
            "email": user_data["email"],
            "headline": user_data.get("headline"),
            "bio": user_data.get("bio"),
            "primary_role": user_data.get("primary_role"),
            "availability_status": user_data["availability_status"],
            "builder_score": user_data["builder_score"],
            "contact_links": user_data["contact_links"],
            "avatar_url": user_data.get("avatar_url"),
            "github_username": user_data.get("github_username"),
            "timezone": user_data.get("timezone"),
            "agent_tools": user_data.get("agent_tools", []),
            "agent_workflow_style": user_data.get("agent_workflow_style"),
            "human_agent_ratio": user_data.get("human_agent_ratio"),
        }
        users_for_insert.append(user_dict)

    # Bulk insert all users
    stmt = insert(User).values(users_for_insert).returning(User.id, User.username)
    result = await session.execute(stmt)
    user_rows = result.fetchall()

    # Build lookup dictionary mapping username to ID
    user_lookup = {row.username: row.id for row in user_rows}

    # Create UserSkill relationships
    user_skill_relationships = []
    for user_data in users_data:
        user_id = user_lookup[user_data["username"]]
        for skill_name in user_data["skills"]:
            if skill_name in skills_dict:
                user_skill_relationships.append({
                    "user_id": user_id,
                    "skill_id": skills_dict[skill_name],
                })

    # Bulk insert all user-skill relationships
    if user_skill_relationships:
        stmt = insert(user_skills).values(user_skill_relationships)
        await session.execute(stmt)

    await session.commit()

    return user_lookup
