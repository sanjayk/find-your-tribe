"""User service — profile CRUD operations."""

from sqlalchemy import delete, select
from sqlalchemy.dialects.postgresql import insert
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.enums import AgentWorkflowStyle, AvailabilityStatus, UserRole
from app.models.skill import Skill
from app.models.user import User, user_skills


async def get_by_id(session: AsyncSession, user_id: str) -> User | None:
    """Fetch user by ID."""
    stmt = select(User).where(User.id == user_id)
    result = await session.execute(stmt)
    return result.scalar_one_or_none()


async def get_by_id_with_skills(session: AsyncSession, user_id: str) -> User | None:
    """Fetch user by ID with skills eagerly loaded."""
    stmt = (
        select(User)
        .where(User.id == user_id)
        .options(selectinload(User.skills))
    )
    result = await session.execute(stmt)
    return result.scalar_one_or_none()


async def update_profile(
    session: AsyncSession,
    user_id: str,
    display_name: str | None = None,
    headline: str | None = None,
    bio: str | None = None,
    primary_role: str | None = None,
    timezone: str | None = None,
    availability_status: str | None = None,
    contact_links: dict | None = None,
    agent_tools: list[str] | None = None,
    agent_workflow_style: str | None = None,
    human_agent_ratio: float | None = None,
) -> User:
    """Update profile fields. Only non-None values are applied."""
    user = await get_by_id(session, user_id)
    if user is None:
        raise ValueError(f"User {user_id} not found")

    if display_name is not None:
        user.display_name = display_name
    if headline is not None:
        user.headline = headline
    if bio is not None:
        user.bio = bio
    if primary_role is not None:
        user.primary_role = UserRole(primary_role)
    if timezone is not None:
        user.timezone = timezone
    if availability_status is not None:
        user.availability_status = AvailabilityStatus(availability_status)
    if contact_links is not None:
        user.contact_links = contact_links
    if agent_tools is not None:
        user.agent_tools = agent_tools
    if agent_workflow_style is not None:
        user.agent_workflow_style = AgentWorkflowStyle(agent_workflow_style)
    if human_agent_ratio is not None:
        user.human_agent_ratio = human_agent_ratio

    await session.commit()
    await session.refresh(user)
    return user


async def add_skill(session: AsyncSession, user_id: str, skill_id: str) -> None:
    """Add a skill to user's profile. No-op if already present."""
    skill = await session.get(Skill, skill_id)
    if skill is None:
        raise ValueError(f"Skill {skill_id} not found")

    stmt = (
        insert(user_skills)
        .values(user_id=user_id, skill_id=skill_id)
        .on_conflict_do_nothing()
    )
    await session.execute(stmt)
    await session.commit()


async def remove_skill(session: AsyncSession, user_id: str, skill_id: str) -> None:
    """Remove a skill from user's profile."""
    stmt = (
        delete(user_skills)
        .where(user_skills.c.user_id == user_id)
        .where(user_skills.c.skill_id == skill_id)
    )
    await session.execute(stmt)
    await session.commit()
