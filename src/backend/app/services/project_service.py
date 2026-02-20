"""Project service — CRUD and collaborator management."""

import secrets
from datetime import UTC, datetime, timedelta
from datetime import date as date_type

from sqlalchemy import and_, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import aliased, selectinload
from ulid import ULID

from app.models.collaborator_invite_token import CollaboratorInviteToken
from app.models.enums import CollaboratorStatus, ProjectStatus
from app.models.enums import MilestoneType as MilestoneTypeEnum
from app.models.project import Project, project_collaborators
from app.models.project_milestone import ProjectMilestone
from app.models.user import User

_VALID_LINK_KEYS = frozenset({"repo", "live_url", "product_hunt", "app_store", "play_store"})
_VALID_METRIC_KEYS = frozenset({"users", "stars", "downloads", "revenue", "forks"})


def _validate_tags(
    field_name: str,
    tags: list[str],
    max_items: int = 20,
    max_chars: int = 50,
) -> None:
    """Raise ValueError if tags list exceeds limits."""
    if len(tags) > max_items:
        raise ValueError(f"{field_name} cannot exceed {max_items} items")
    for tag in tags:
        if len(tag) > max_chars:
            raise ValueError(f"{field_name} items cannot exceed {max_chars} characters")


def _validate_links(links: dict) -> None:
    """Raise ValueError if links dict has invalid keys or non-HTTPS values."""
    for key, value in links.items():
        if key not in _VALID_LINK_KEYS:
            raise ValueError(
                f"Invalid link key: {key!r}. Must be one of {sorted(_VALID_LINK_KEYS)}"
            )
        if not isinstance(value, str) or not value.startswith("https://"):
            raise ValueError(f"Link value for {key!r} must be an HTTPS URL")


def _validate_impact_metrics(metrics: dict) -> None:
    """Raise ValueError if metrics dict has invalid keys or non-string/number values."""
    for key, value in metrics.items():
        if key not in _VALID_METRIC_KEYS:
            raise ValueError(
                f"Invalid metric key: {key!r}. Must be one of {sorted(_VALID_METRIC_KEYS)}"
            )
        if not isinstance(value, (str, int, float)):
            raise ValueError(f"Metric value for {key!r} must be a string or number")


def _validate_milestone_type(mt: str) -> None:
    """Raise ValueError if milestone type is not a valid MilestoneType value."""
    valid = {e.value for e in MilestoneTypeEnum}
    if mt not in valid:
        raise ValueError(f"Invalid milestone type: {mt!r}. Must be one of {sorted(valid)}")


async def create(
    session: AsyncSession,
    owner_id: str,
    title: str,
    description: str | None = None,
    status: str | None = None,
    role: str | None = None,
    links: dict | None = None,
    tech_stack: list[str] | None = None,
    impact_metrics: dict | None = None,
) -> Project:
    """Create a new project owned by the given user."""
    if not title or len(title) > 200:
        raise ValueError("Title must be between 1 and 200 characters")
    if tech_stack is not None and len(tech_stack) > 20:
        raise ValueError("Tech stack cannot exceed 20 items")
    if links is not None:
        _validate_links(links)
    if impact_metrics is not None:
        _validate_impact_metrics(impact_metrics)

    resolved_status = ProjectStatus(status) if status else ProjectStatus.IN_PROGRESS

    project = Project(
        id=str(ULID()),
        owner_id=owner_id,
        title=title,
        description=description,
        status=resolved_status,
        role=role,
        links=links or {},
        tech_stack=tech_stack or [],
        impact_metrics=impact_metrics or {},
    )
    session.add(project)
    await session.commit()
    await session.refresh(project)
    return project


async def update(
    session: AsyncSession,
    project_id: str,
    user_id: str,
    title: str | None = None,
    description: str | None = None,
    status: str | None = None,
    role: str | None = None,
    links: dict | None = None,
    tech_stack: list[str] | None = None,
    impact_metrics: dict | None = None,
    domains: list[str] | None = None,
    ai_tools: list[str] | None = None,
    build_style: list[str] | None = None,
    services: list[str] | None = None,
) -> tuple[Project, bool]:
    """Update a project. Only the owner may update.

    Returns (project, status_changed_to_shipped).
    """
    project = await session.get(Project, project_id)
    if not project:
        raise ValueError("Project not found")
    if project.owner_id != user_id:
        raise PermissionError("Only the project owner can update this project")

    if title is not None:
        if not title or len(title) > 200:
            raise ValueError("Title must be between 1 and 200 characters")
        project.title = title
    if description is not None:
        project.description = description

    old_status = project.status
    if status is not None:
        project.status = ProjectStatus(status)

    if role is not None:
        project.role = role
    if links is not None:
        project.links = links
    if tech_stack is not None:
        if len(tech_stack) > 20:
            raise ValueError("Tech stack cannot exceed 20 items")
        project.tech_stack = tech_stack
    if impact_metrics is not None:
        _validate_impact_metrics(impact_metrics)
        project.impact_metrics = impact_metrics
    if domains is not None:
        _validate_tags("domains", domains)
        project.domains = domains
    if ai_tools is not None:
        _validate_tags("ai_tools", ai_tools)
        project.ai_tools = ai_tools
    if build_style is not None:
        _validate_tags("build_style", build_style)
        project.build_style = build_style
    if services is not None:
        _validate_tags("services", services)
        project.services = services

    status_changed_to_shipped = (
        status is not None
        and project.status == ProjectStatus.SHIPPED
        and old_status != ProjectStatus.SHIPPED
    )

    await session.commit()
    await session.refresh(project)
    return project, status_changed_to_shipped


async def delete(session: AsyncSession, project_id: str, user_id: str) -> None:
    """Delete a project. Only the owner may delete."""
    project = await session.get(Project, project_id)
    if not project:
        raise ValueError("Project not found")
    if project.owner_id != user_id:
        raise PermissionError("Only the project owner can delete this project")

    await session.delete(project)
    await session.commit()


async def get_with_details(session: AsyncSession, project_id: str) -> Project | None:
    """Fetch a project by ID with owner and collaborators eagerly loaded."""
    stmt = (
        select(Project)
        .where(Project.id == project_id)
        .options(
            selectinload(Project.owner),
            selectinload(Project.collaborators),
            selectinload(Project.milestones),
        )
    )
    result = await session.execute(stmt)
    return result.scalar_one_or_none()


async def invite_collaborator(
    session: AsyncSession,
    project_id: str,
    user_id: str,
    inviter_id: str,
    role: str | None = None,
) -> dict:
    """Invite a user to collaborate on a project. Only the owner may invite."""
    project = await session.get(Project, project_id)
    if not project:
        raise ValueError("Project not found")
    if project.owner_id != inviter_id:
        raise PermissionError("Only the project owner can invite collaborators")

    target_user = await session.get(User, user_id)
    if not target_user:
        raise ValueError("Target user not found")

    existing = await session.execute(
        select(project_collaborators.c.user_id).where(
            and_(
                project_collaborators.c.project_id == project_id,
                project_collaborators.c.user_id == user_id,
            )
        )
    )
    if existing.scalar_one_or_none() is not None:
        raise ValueError("User is already a collaborator on this project")

    now = datetime.now(UTC)
    await session.execute(
        project_collaborators.insert().values(
            project_id=project_id,
            user_id=user_id,
            role=role,
            status=CollaboratorStatus.PENDING,
            invited_at=now,
        )
    )
    await session.commit()
    return {
        "project_id": project_id,
        "user_id": user_id,
        "role": role,
        "status": CollaboratorStatus.PENDING,
        "invited_at": now,
    }


async def confirm_collaboration(
    session: AsyncSession,
    project_id: str,
    user_id: str,
) -> dict:
    """Confirm a pending collaboration invitation. Only the invitee may confirm."""
    result = await session.execute(
        select(
            project_collaborators.c.role,
            project_collaborators.c.status,
            project_collaborators.c.invited_at,
        ).where(
            and_(
                project_collaborators.c.project_id == project_id,
                project_collaborators.c.user_id == user_id,
                project_collaborators.c.status == CollaboratorStatus.PENDING,
            )
        )
    )
    row = result.one_or_none()
    if row is None:
        raise ValueError("No pending collaboration found")

    now = datetime.now(UTC)
    await session.execute(
        project_collaborators.update()
        .where(
            and_(
                project_collaborators.c.project_id == project_id,
                project_collaborators.c.user_id == user_id,
            )
        )
        .values(status=CollaboratorStatus.CONFIRMED, confirmed_at=now)
    )
    await session.commit()
    return {
        "project_id": project_id,
        "user_id": user_id,
        "role": row.role,
        "status": CollaboratorStatus.CONFIRMED,
        "invited_at": row.invited_at,
        "confirmed_at": now,
    }


async def decline_collaboration(
    session: AsyncSession,
    project_id: str,
    user_id: str,
) -> None:
    """Decline a pending collaboration invitation. Only the invitee may decline."""
    result = await session.execute(
        select(project_collaborators.c.user_id).where(
            and_(
                project_collaborators.c.project_id == project_id,
                project_collaborators.c.user_id == user_id,
                project_collaborators.c.status == CollaboratorStatus.PENDING,
            )
        )
    )
    if result.scalar_one_or_none() is None:
        raise ValueError("No pending collaboration found")

    await session.execute(
        project_collaborators.update()
        .where(
            and_(
                project_collaborators.c.project_id == project_id,
                project_collaborators.c.user_id == user_id,
            )
        )
        .values(status=CollaboratorStatus.DECLINED)
    )
    await session.commit()


async def remove_collaborator(
    session: AsyncSession,
    project_id: str,
    collaborator_id: str,
    owner_id: str,
) -> None:
    """Remove a collaborator from a project. Only the owner may remove."""
    project = await session.get(Project, project_id)
    if not project:
        raise ValueError("Project not found")
    if project.owner_id != owner_id:
        raise PermissionError("Only the project owner can remove collaborators")

    result = await session.execute(
        project_collaborators.delete().where(
            and_(
                project_collaborators.c.project_id == project_id,
                project_collaborators.c.user_id == collaborator_id,
            )
        )
    )
    if result.rowcount == 0:
        raise ValueError("Collaborator not found on this project")
    await session.commit()


async def add_milestone(
    session: AsyncSession,
    project_id: str,
    user_id: str,
    title: str,
    date_: date_type,
    milestone_type: str = "milestone",
) -> ProjectMilestone:
    """Add a milestone to a project. Only the owner may add milestones."""
    project = await session.get(Project, project_id)
    if not project:
        raise ValueError("Project not found")
    if project.owner_id != user_id:
        raise PermissionError("Only the project owner can add milestones")

    if not title or len(title) > 200:
        raise ValueError("Milestone title must be between 1 and 200 characters")
    if date_ > date_type.today():
        raise ValueError("Milestone date cannot be in the future")
    _validate_milestone_type(milestone_type)

    milestone = ProjectMilestone(
        id=str(ULID()),
        project_id=project_id,
        title=title,
        date=date_,
        milestone_type=MilestoneTypeEnum(milestone_type),
    )
    session.add(milestone)
    await session.commit()
    await session.refresh(milestone)
    return milestone


async def delete_milestone(
    session: AsyncSession,
    milestone_id: str,
    user_id: str,
) -> None:
    """Delete a project milestone. Only the project owner may delete."""
    stmt = (
        select(ProjectMilestone)
        .where(ProjectMilestone.id == milestone_id)
        .options(selectinload(ProjectMilestone.project))
    )
    result = await session.execute(stmt)
    milestone = result.scalar_one_or_none()
    if not milestone:
        raise ValueError("Milestone not found")
    if milestone.project.owner_id != user_id:
        raise PermissionError("Only the project owner can delete milestones")

    await session.delete(milestone)
    await session.commit()


async def get_imported_repo_names(session: AsyncSession, user_id: str) -> set[str]:
    """Return the set of github_repo_full_name values for all projects owned by user_id."""
    stmt = select(Project.github_repo_full_name).where(
        and_(
            Project.owner_id == user_id,
            Project.github_repo_full_name.isnot(None),
        )
    )
    result = await session.execute(stmt)
    return {row[0] for row in result.fetchall()}


async def set_github_metadata(
    session: AsyncSession,
    project_id: str,
    repo_full_name: str,
    stars: int,
) -> None:
    """Update a project's GitHub repo name and star count."""
    project = await session.get(Project, project_id)
    if not project:
        raise ValueError("Project not found")
    project.github_repo_full_name = repo_full_name
    project.github_stars = stars
    await session.commit()


_INVITE_TOKEN_EXPIRY_DAYS = 30


async def create_invite_token(
    session: AsyncSession,
    project_id: str,
    inviter_id: str,
    role: str | None = None,
) -> str:
    """Generate an invite token for a project and store it with a 30-day expiry."""
    token = secrets.token_urlsafe(32)
    expires_at = datetime.now(UTC) + timedelta(days=_INVITE_TOKEN_EXPIRY_DAYS)
    invite = CollaboratorInviteToken(
        id=str(ULID()),
        project_id=project_id,
        invited_by=inviter_id,
        token=token,
        role=role,
        expires_at=expires_at,
    )
    session.add(invite)
    await session.commit()
    return token


async def redeem_invite_token(
    session: AsyncSession,
    token: str,
    user_id: str,
) -> dict:
    """Redeem an invite token, creating a pending collaboration record."""
    result = await session.execute(
        select(CollaboratorInviteToken).where(CollaboratorInviteToken.token == token)
    )
    invite = result.scalar_one_or_none()
    if invite is None:
        raise ValueError("Invite token not found")
    if invite.expires_at < datetime.now(UTC):
        raise ValueError("Invite token has expired")
    if invite.redeemed_by is not None:
        raise ValueError("Invite token has already been redeemed")

    project = await session.get(Project, invite.project_id)
    if project and project.owner_id == user_id:
        raise ValueError("Project owner cannot redeem their own invite token")

    existing = await session.execute(
        select(project_collaborators.c.user_id).where(
            and_(
                project_collaborators.c.project_id == invite.project_id,
                project_collaborators.c.user_id == user_id,
            )
        )
    )
    if existing.scalar_one_or_none() is not None:
        raise ValueError("User is already a collaborator on this project")

    now = datetime.now(UTC)
    invite.redeemed_by = user_id
    invite.redeemed_at = now

    await session.execute(
        project_collaborators.insert().values(
            project_id=invite.project_id,
            user_id=user_id,
            role=invite.role,
            status=CollaboratorStatus.PENDING,
            invited_at=now,
        )
    )
    await session.commit()
    return {
        "project_id": invite.project_id,
        "user_id": user_id,
        "role": invite.role,
        "status": CollaboratorStatus.PENDING,
        "invited_at": now,
    }


async def get_invite_token_info(
    session: AsyncSession,
    token: str,
) -> dict | None:
    """Return public info about an invite token without requiring auth.

    Returns None if the token does not exist.
    """
    result = await session.execute(
        select(CollaboratorInviteToken)
        .where(CollaboratorInviteToken.token == token)
        .options(
            selectinload(CollaboratorInviteToken.project),
            selectinload(CollaboratorInviteToken.inviter),
        )
    )
    invite = result.scalar_one_or_none()
    if invite is None:
        return None
    return {
        "project_title": invite.project.title,
        "project_id": invite.project_id,
        "inviter_name": invite.inviter.display_name,
        "inviter_avatar_url": invite.inviter.avatar_url,
        "role": invite.role,
        "expired": invite.expires_at < datetime.now(UTC),
    }


async def get_pending_invitations(
    session: AsyncSession,
    user_id: str,
) -> list[dict]:
    """Return pending collaboration invitations for a user.

    Joins projects for title and users (project owner) for inviter info.
    """
    owner_alias = aliased(User)
    stmt = (
        select(
            project_collaborators.c.project_id,
            project_collaborators.c.role,
            project_collaborators.c.invited_at,
            Project.title.label("project_title"),
            owner_alias,
        )
        .select_from(project_collaborators)
        .join(Project, Project.id == project_collaborators.c.project_id)
        .join(owner_alias, owner_alias.id == Project.owner_id)
        .where(
            and_(
                project_collaborators.c.user_id == user_id,
                project_collaborators.c.status == CollaboratorStatus.PENDING,
            )
        )
    )
    result = await session.execute(stmt)
    return [
        {
            "project_id": project_id,
            "project_title": project_title,
            "role": role,
            "inviter": inviter,
            "invited_at": invited_at,
        }
        for project_id, role, invited_at, project_title, inviter in result
    ]
