"""Seed data for skills."""

from sqlalchemy import insert
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.enums import SkillCategory
from app.models.skill import Skill


def _slugify(name: str) -> str:
    """Convert skill name to kebab-case slug."""
    return name.lower().replace(" ", "-").replace("/", "-").replace("(", "").replace(")", "").replace(".", "")


async def seed_skills(session: AsyncSession) -> dict[str, str]:
    """
    Seed skills data into the database.

    Creates 80+ skills across 8 categories with name, slug, and category.
    Returns a dictionary mapping skill names to their IDs for lookup.

    Args:
        session: Async database session

    Returns:
        Dictionary mapping skill name to skill ID
    """
    skills_data = [
        # ENGINEERING (30 skills)
        {"name": "Python", "category": SkillCategory.ENGINEERING},
        {"name": "JavaScript", "category": SkillCategory.ENGINEERING},
        {"name": "TypeScript", "category": SkillCategory.ENGINEERING},
        {"name": "React", "category": SkillCategory.ENGINEERING},
        {"name": "Next.js", "category": SkillCategory.ENGINEERING},
        {"name": "Node.js", "category": SkillCategory.ENGINEERING},
        {"name": "Go", "category": SkillCategory.ENGINEERING},
        {"name": "Rust", "category": SkillCategory.ENGINEERING},
        {"name": "PostgreSQL", "category": SkillCategory.ENGINEERING},
        {"name": "FastAPI", "category": SkillCategory.ENGINEERING},
        {"name": "GraphQL", "category": SkillCategory.ENGINEERING},
        {"name": "Docker", "category": SkillCategory.ENGINEERING},
        {"name": "Kubernetes", "category": SkillCategory.ENGINEERING},
        {"name": "AWS", "category": SkillCategory.ENGINEERING},
        {"name": "gRPC", "category": SkillCategory.ENGINEERING},
        {"name": "Redis", "category": SkillCategory.ENGINEERING},
        {"name": "Vue.js", "category": SkillCategory.ENGINEERING},
        {"name": "Angular", "category": SkillCategory.ENGINEERING},
        {"name": "Django", "category": SkillCategory.ENGINEERING},
        {"name": "Flask", "category": SkillCategory.ENGINEERING},
        {"name": "Ruby on Rails", "category": SkillCategory.ENGINEERING},
        {"name": "Java", "category": SkillCategory.ENGINEERING},
        {"name": "C++", "category": SkillCategory.ENGINEERING},
        {"name": "MongoDB", "category": SkillCategory.ENGINEERING},
        {"name": "MySQL", "category": SkillCategory.ENGINEERING},
        {"name": "Git", "category": SkillCategory.ENGINEERING},
        {"name": "CI/CD", "category": SkillCategory.ENGINEERING},
        {"name": "Terraform", "category": SkillCategory.ENGINEERING},
        {"name": "Microservices", "category": SkillCategory.ENGINEERING},
        {"name": "System Design", "category": SkillCategory.ENGINEERING},

        # DESIGN (15 skills)
        {"name": "Figma", "category": SkillCategory.DESIGN},
        {"name": "UI/UX", "category": SkillCategory.DESIGN},
        {"name": "Prototyping", "category": SkillCategory.DESIGN},
        {"name": "Design Systems", "category": SkillCategory.DESIGN},
        {"name": "User Research", "category": SkillCategory.DESIGN},
        {"name": "Interaction Design", "category": SkillCategory.DESIGN},
        {"name": "Visual Design", "category": SkillCategory.DESIGN},
        {"name": "Motion Design", "category": SkillCategory.DESIGN},
        {"name": "Adobe Creative Suite", "category": SkillCategory.DESIGN},
        {"name": "Sketch", "category": SkillCategory.DESIGN},
        {"name": "Wireframing", "category": SkillCategory.DESIGN},
        {"name": "Typography", "category": SkillCategory.DESIGN},
        {"name": "Branding", "category": SkillCategory.DESIGN},
        {"name": "Illustration", "category": SkillCategory.DESIGN},
        {"name": "3D Design", "category": SkillCategory.DESIGN},

        # PRODUCT (12 skills)
        {"name": "Product Strategy", "category": SkillCategory.PRODUCT},
        {"name": "Roadmapping", "category": SkillCategory.PRODUCT},
        {"name": "User Stories", "category": SkillCategory.PRODUCT},
        {"name": "Analytics", "category": SkillCategory.PRODUCT},
        {"name": "A/B Testing", "category": SkillCategory.PRODUCT},
        {"name": "Product-Market Fit", "category": SkillCategory.PRODUCT},
        {"name": "Feature Prioritization", "category": SkillCategory.PRODUCT},
        {"name": "User Feedback", "category": SkillCategory.PRODUCT},
        {"name": "Product Metrics", "category": SkillCategory.PRODUCT},
        {"name": "Competitive Analysis", "category": SkillCategory.PRODUCT},
        {"name": "Product Launch", "category": SkillCategory.PRODUCT},
        {"name": "Stakeholder Management", "category": SkillCategory.PRODUCT},

        # MARKETING (10 skills)
        {"name": "Content Strategy", "category": SkillCategory.MARKETING},
        {"name": "SEO", "category": SkillCategory.MARKETING},
        {"name": "Social Media", "category": SkillCategory.MARKETING},
        {"name": "Brand Design", "category": SkillCategory.MARKETING},
        {"name": "Copywriting", "category": SkillCategory.MARKETING},
        {"name": "Email Marketing", "category": SkillCategory.MARKETING},
        {"name": "Content Marketing", "category": SkillCategory.MARKETING},
        {"name": "Marketing Analytics", "category": SkillCategory.MARKETING},
        {"name": "Influencer Marketing", "category": SkillCategory.MARKETING},
        {"name": "Brand Strategy", "category": SkillCategory.MARKETING},

        # GROWTH (8 skills)
        {"name": "Growth Hacking", "category": SkillCategory.GROWTH},
        {"name": "Paid Acquisition", "category": SkillCategory.GROWTH},
        {"name": "Partnerships", "category": SkillCategory.GROWTH},
        {"name": "Community Building", "category": SkillCategory.GROWTH},
        {"name": "Funnel Optimization", "category": SkillCategory.GROWTH},
        {"name": "Viral Marketing", "category": SkillCategory.GROWTH},
        {"name": "Retention", "category": SkillCategory.GROWTH},
        {"name": "Referral Programs", "category": SkillCategory.GROWTH},

        # DATA (10 skills)
        {"name": "Machine Learning", "category": SkillCategory.DATA},
        {"name": "Data Engineering", "category": SkillCategory.DATA},
        {"name": "SQL", "category": SkillCategory.DATA},
        {"name": "Python (Data)", "category": SkillCategory.DATA},
        {"name": "Data Visualization", "category": SkillCategory.DATA},
        {"name": "Data Analysis", "category": SkillCategory.DATA},
        {"name": "Deep Learning", "category": SkillCategory.DATA},
        {"name": "Natural Language Processing", "category": SkillCategory.DATA},
        {"name": "Big Data", "category": SkillCategory.DATA},
        {"name": "Statistical Analysis", "category": SkillCategory.DATA},

        # OPERATIONS (8 skills)
        {"name": "Project Management", "category": SkillCategory.OPERATIONS},
        {"name": "Agile", "category": SkillCategory.OPERATIONS},
        {"name": "DevOps", "category": SkillCategory.OPERATIONS},
        {"name": "Technical Writing", "category": SkillCategory.OPERATIONS},
        {"name": "Process Optimization", "category": SkillCategory.OPERATIONS},
        {"name": "Quality Assurance", "category": SkillCategory.OPERATIONS},
        {"name": "Documentation", "category": SkillCategory.OPERATIONS},
        {"name": "Scrum", "category": SkillCategory.OPERATIONS},

        # OTHER (10 skills)
        {"name": "Public Speaking", "category": SkillCategory.OTHER},
        {"name": "Fundraising", "category": SkillCategory.OTHER},
        {"name": "Legal", "category": SkillCategory.OTHER},
        {"name": "Recruiting", "category": SkillCategory.OTHER},
        {"name": "Business Development", "category": SkillCategory.OTHER},
        {"name": "Sales", "category": SkillCategory.OTHER},
        {"name": "Customer Success", "category": SkillCategory.OTHER},
        {"name": "Finance", "category": SkillCategory.OTHER},
        {"name": "Operations Management", "category": SkillCategory.OTHER},
        {"name": "Strategy", "category": SkillCategory.OTHER},
    ]

    # Add slugs to all skills
    for skill in skills_data:
        skill["slug"] = _slugify(skill["name"])

    # Bulk insert all skills
    stmt = insert(Skill).values(skills_data).returning(Skill.id, Skill.name)
    result = await session.execute(stmt)
    await session.commit()

    # Build lookup dictionary mapping name to ID
    skill_lookup = {row.name: row.id for row in result.fetchall()}

    return skill_lookup
