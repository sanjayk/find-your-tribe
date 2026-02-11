"""Seed data for users."""

from sqlalchemy import insert
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.enums import AvailabilityStatus, UserRole
from app.models.user import User, user_skills


async def seed_users(session: AsyncSession, skills_dict: dict[str, str]) -> dict[str, str]:
    """
    Seed users data into the database.

    Creates exactly 10 users matching the prototype specifications with profiles,
    builder scores, contact links, and skill relationships.

    Args:
        session: Async database session
        skills_dict: Dictionary mapping skill name to skill ID

    Returns:
        Dictionary mapping username to user ID
    """
    users_data = [
        {
            "username": "mayachen",
            "display_name": "Maya Chen",
            "email": "maya.chen@example.com",
            "headline": "Full-Stack Developer",
            "bio": "Building delightful web experiences. Love clean code and beautiful UIs. Currently exploring GraphQL and serverless architectures.",
            "primary_role": UserRole.ENGINEER,
            "availability_status": AvailabilityStatus.OPEN_TO_TRIBE,
            "builder_score": 72.0,
            "contact_links": {
                "twitter": "mayachen",
                "github_username": "mayachen",
            },
            "skills": ["React", "Python", "PostgreSQL", "FastAPI"],
        },
        {
            "username": "jamesokafor",
            "display_name": "James Okafor",
            "email": "james.okafor@example.com",
            "headline": "Product Designer",
            "bio": "Crafting intuitive interfaces that users love. Passionate about design systems and accessibility. Always curious about how people interact with products.",
            "primary_role": UserRole.DESIGNER,
            "availability_status": AvailabilityStatus.AVAILABLE_FOR_PROJECTS,
            "builder_score": 58.0,
            "contact_links": {
                "twitter": "jamesokafor",
                "github_username": "jamesokafor",
            },
            "skills": ["Figma", "UI/UX", "Prototyping"],
        },
        {
            "username": "priyasharma",
            "display_name": "Priya Sharma",
            "email": "priya.sharma@example.com",
            "headline": "Backend Engineer",
            "bio": "Scaling distributed systems at high throughput. Love Go and microservices. Building robust APIs and infrastructure.",
            "primary_role": UserRole.ENGINEER,
            "availability_status": AvailabilityStatus.OPEN_TO_TRIBE,
            "builder_score": 65.0,
            "contact_links": {
                "twitter": "priyasharma",
                "github_username": "priyasharma",
            },
            "skills": ["Go", "Kubernetes", "gRPC"],
        },
        {
            "username": "davidmorales",
            "display_name": "David Morales",
            "email": "david.morales@example.com",
            "headline": "Growth Marketer",
            "bio": "Data-driven growth strategist. SEO enthusiast and content creator. Helping startups find product-market fit through experimentation.",
            "primary_role": UserRole.MARKETER,
            "availability_status": AvailabilityStatus.AVAILABLE_FOR_PROJECTS,
            "builder_score": 45.0,
            "contact_links": {
                "twitter": "davidmorales",
                "github_username": "davidmorales",
            },
            "skills": ["SEO", "Analytics", "Content Strategy"],
        },
        {
            "username": "sarahkim",
            "display_name": "Sarah Kim",
            "email": "sarah.kim@example.com",
            "headline": "ML Engineer",
            "bio": "Building intelligent systems with Python and TensorFlow. Passionate about data pipelines and model deployment. Making AI practical and useful.",
            "primary_role": UserRole.ENGINEER,
            "availability_status": AvailabilityStatus.OPEN_TO_TRIBE,
            "builder_score": 71.0,
            "contact_links": {
                "twitter": "sarahkim",
                "github_username": "sarahkim",
            },
            "skills": ["Python", "Machine Learning", "Data Engineering"],
        },
        {
            "username": "alexrivera",
            "display_name": "Alex Rivera",
            "email": "alex.rivera@example.com",
            "headline": "Frontend Developer",
            "bio": "React specialist with a love for TypeScript. Building fast, accessible web apps. Currently diving deep into Next.js and server components.",
            "primary_role": UserRole.ENGINEER,
            "availability_status": AvailabilityStatus.JUST_BROWSING,
            "builder_score": 38.0,
            "contact_links": {
                "twitter": "alexrivera",
                "github_username": "alexrivera",
            },
            "skills": ["React", "TypeScript", "Next.js"],
        },
        {
            "username": "elenavolkov",
            "display_name": "Elena Volkov",
            "email": "elena.volkov@example.com",
            "headline": "Product Manager",
            "bio": "Translating user needs into product roadmaps. Data-informed decision maker. Love working with cross-functional teams to ship great products.",
            "primary_role": UserRole.PM,
            "availability_status": AvailabilityStatus.OPEN_TO_TRIBE,
            "builder_score": 52.0,
            "contact_links": {
                "twitter": "elenavolkov",
                "github_username": "elenavolkov",
            },
            "skills": ["Roadmapping", "Analytics", "User Stories"],
        },
        {
            "username": "marcusjohnson",
            "display_name": "Marcus Johnson",
            "email": "marcus.johnson@example.com",
            "headline": "DevOps Engineer",
            "bio": "Infrastructure as code advocate. Kubernetes and Docker expert. Building reliable CI/CD pipelines and automating everything.",
            "primary_role": UserRole.ENGINEER,
            "availability_status": AvailabilityStatus.OPEN_TO_TRIBE,
            "builder_score": 61.0,
            "contact_links": {
                "twitter": "marcusjohnson",
                "github_username": "marcusjohnson",
            },
            "skills": ["Docker", "Kubernetes", "AWS", "CI/CD"],
        },
        {
            "username": "aishapatel",
            "display_name": "Aisha Patel",
            "email": "aisha.patel@example.com",
            "headline": "UX Researcher",
            "bio": "Uncovering user insights through research and testing. Advocate for user-centered design. Bridging the gap between users and product teams.",
            "primary_role": UserRole.DESIGNER,
            "availability_status": AvailabilityStatus.JUST_BROWSING,
            "builder_score": 44.0,
            "contact_links": {
                "twitter": "aishapatel",
                "github_username": "aishapatel",
            },
            "skills": ["User Research", "Prototyping", "Analytics"],
        },
        {
            "username": "tomnakamura",
            "display_name": "Tom Nakamura",
            "email": "tom.nakamura@example.com",
            "headline": "Founder/Engineer",
            "bio": "Serial builder and startup founder. Full-stack engineer with product mindset. Currently working on my third startup in the developer tools space.",
            "primary_role": UserRole.FOUNDER,
            "availability_status": AvailabilityStatus.OPEN_TO_TRIBE,
            "builder_score": 68.0,
            "contact_links": {
                "twitter": "tomnakamura",
                "github_username": "tomnakamura",
            },
            "skills": ["Python", "React", "PostgreSQL", "AWS"],
        },
    ]

    # Prepare users for bulk insert (without skills)
    users_for_insert = []
    for user_data in users_data:
        user_dict = {
            "username": user_data["username"],
            "display_name": user_data["display_name"],
            "email": user_data["email"],
            "headline": user_data["headline"],
            "bio": user_data["bio"],
            "primary_role": user_data["primary_role"],
            "availability_status": user_data["availability_status"],
            "builder_score": user_data["builder_score"],
            "contact_links": user_data["contact_links"],
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
