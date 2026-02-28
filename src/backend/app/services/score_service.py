"""Score service — Builder Score calculation and recalculation."""

import math
from datetime import UTC, datetime

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.enums import CollaboratorStatus, ProjectStatus
from app.models.project import Project, project_collaborators
from app.models.user import User


def calculate_builder_score(
    shipped_project_count: int,
    confirmed_collaborator_count: int,
    total_stars: int,
    total_users: int,
    profile_completeness: float,
    account_age_days: int,
) -> float:
    """Calculate builder score on 0-100 scale.

    Components (logarithmic scaling):
      - project_score (max 30): shipped projects
      - collab_score (max 25): confirmed collaborator vouches
      - impact_score (max 20): GitHub stars + users
      - profile_score (max 15): profile completeness
      - age_score (max 10): account age (caps at 1 year)
    """
    project_score = min(30, 10 * math.log2(shipped_project_count + 1))
    collab_score = min(25, 8 * math.log2(confirmed_collaborator_count + 1))
    impact_score = min(20, 4 * math.log10(total_stars + total_users + 1))
    profile_score = profile_completeness * 15
    age_score = min(10, (account_age_days / 365) * 10)

    total = project_score + collab_score + impact_score + profile_score + age_score
    return round(min(100, max(0, total)), 1)


COMPLETENESS_FIELDS: dict[str, str] = {
    "avatar": "avatar_url",
    "headline": "headline",
    "bio": "bio",
    "role": "primary_role",
    "timezone": "timezone",
    "contact_links": "contact_links",
}


def _field_filled(label: str, value: object) -> bool:
    """Check whether a completeness field value counts as filled.

    Dispatch by label:
      - role: ENUM(UserRole) nullable — filled when non-null
      - contact_links: JSONB dict — filled when non-empty dict
      - avatar, headline, bio, timezone: string — filled when non-blank
    """
    if label == "role":
        return value is not None
    if label == "contact_links":
        return isinstance(value, dict) and len(value) > 0
    # string fields: avatar, headline, bio, timezone
    return bool(value and str(value).strip())


def calculate_profile_completeness(user: User) -> float:
    """Calculate fraction of profile fields filled out."""
    filled = sum(
        _field_filled(label, getattr(user, attr))
        for label, attr in COMPLETENESS_FIELDS.items()
    )
    return filled / len(COMPLETENESS_FIELDS)


async def recalculate(session: AsyncSession, user_id: str) -> float:
    """Recalculate and persist a user's builder score. Returns the new score."""
    user = await session.get(User, user_id)
    if user is None:
        return 0.0

    shipped_stmt = (
        select(func.count())
        .select_from(Project)
        .where(Project.owner_id == user_id, Project.status == ProjectStatus.SHIPPED)
    )
    shipped_count = (await session.execute(shipped_stmt)).scalar() or 0

    collab_stmt = (
        select(func.count(func.distinct(project_collaborators.c.user_id)))
        .select_from(project_collaborators)
        .join(Project, project_collaborators.c.project_id == Project.id)
        .where(
            Project.owner_id == user_id,
            project_collaborators.c.status == CollaboratorStatus.CONFIRMED,
        )
    )
    collab_count = (await session.execute(collab_stmt)).scalar() or 0

    stars_stmt = select(func.coalesce(func.sum(Project.github_stars), 0)).where(
        Project.owner_id == user_id
    )
    total_stars = (await session.execute(stars_stmt)).scalar() or 0

    completeness = calculate_profile_completeness(user)

    age_days = (
        (datetime.now(UTC) - user.created_at.replace(tzinfo=UTC)).days
        if user.created_at
        else 0
    )

    score = calculate_builder_score(shipped_count, collab_count, total_stars, 0, completeness, age_days)
    user.builder_score = score
    await session.commit()
    return score
