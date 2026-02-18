"""Tribe service — CRUD, membership, and open role management."""

from datetime import UTC, datetime

from sqlalchemy import and_, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload
from ulid import ULID

from app.models.enums import MemberRole, MemberStatus, TribeStatus
from app.models.tribe import Tribe, TribeOpenRole, tribe_members


async def create(
    session: AsyncSession,
    owner_id: str,
    name: str,
    mission: str | None = None,
    max_members: int = 8,
) -> Tribe:
    """Create a new tribe and add the owner as an active member."""
    if not name or len(name) > 100:
        raise ValueError("Name must be between 1 and 100 characters")
    if max_members < 2 or max_members > 20:
        raise ValueError("Max members must be between 2 and 20")

    tribe = Tribe(
        id=str(ULID()),
        owner_id=owner_id,
        name=name,
        mission=mission,
        max_members=max_members,
        status=TribeStatus.OPEN,
    )
    session.add(tribe)
    await session.flush()

    # Owner is automatically an active member with OWNER role
    now = datetime.now(UTC)
    await session.execute(
        tribe_members.insert().values(
            tribe_id=tribe.id,
            user_id=owner_id,
            role=MemberRole.OWNER,
            status=MemberStatus.ACTIVE,
            joined_at=now,
            requested_at=now,
        )
    )

    await session.commit()
    await session.refresh(tribe)
    return tribe


async def update(
    session: AsyncSession,
    tribe_id: str,
    user_id: str,
    name: str | None = None,
    mission: str | None = None,
    status: str | None = None,
    max_members: int | None = None,
) -> Tribe:
    """Update a tribe. Only the owner may update."""
    tribe = await session.get(Tribe, tribe_id)
    if not tribe:
        raise ValueError("Tribe not found")
    if tribe.owner_id != user_id:
        raise PermissionError("Only the tribe owner can update this tribe")

    if name is not None:
        if not name or len(name) > 100:
            raise ValueError("Name must be between 1 and 100 characters")
        tribe.name = name
    if mission is not None:
        tribe.mission = mission
    if status is not None:
        tribe.status = TribeStatus(status)
    if max_members is not None:
        if max_members < 2 or max_members > 20:
            raise ValueError("Max members must be between 2 and 20")
        tribe.max_members = max_members

    await session.commit()
    await session.refresh(tribe)
    return tribe


async def get_with_details(session: AsyncSession, tribe_id: str) -> Tribe | None:
    """Fetch a tribe with owner, members, and open roles."""
    stmt = (
        select(Tribe)
        .where(Tribe.id == tribe_id)
        .options(
            selectinload(Tribe.owner),
            selectinload(Tribe.members),
            selectinload(Tribe.open_roles),
        )
    )
    result = await session.execute(stmt)
    return result.scalar_one_or_none()


async def add_open_role(
    session: AsyncSession,
    tribe_id: str,
    user_id: str,
    title: str,
    skills_needed: list[str] | None = None,
) -> TribeOpenRole:
    """Add an open role to a tribe. Only the owner may add roles."""
    tribe = await session.get(Tribe, tribe_id)
    if not tribe:
        raise ValueError("Tribe not found")
    if tribe.owner_id != user_id:
        raise PermissionError("Only the tribe owner can add open roles")

    role = TribeOpenRole(
        id=str(ULID()),
        tribe_id=tribe_id,
        title=title,
        skills_needed=skills_needed or [],
    )
    session.add(role)
    await session.commit()
    await session.refresh(role)
    return role


async def remove_open_role(
    session: AsyncSession,
    role_id: str,
    user_id: str,
) -> None:
    """Remove an open role. Only the tribe owner may remove."""
    role = await session.get(TribeOpenRole, role_id)
    if not role:
        raise ValueError("Open role not found")

    tribe = await session.get(Tribe, role.tribe_id)
    if not tribe or tribe.owner_id != user_id:
        raise PermissionError("Only the tribe owner can remove open roles")

    await session.delete(role)
    await session.commit()


async def request_to_join(
    session: AsyncSession,
    tribe_id: str,
    user_id: str,
) -> dict:
    """Request to join a tribe. Creates a pending membership."""
    tribe = await session.get(Tribe, tribe_id)
    if not tribe:
        raise ValueError("Tribe not found")
    if tribe.status != TribeStatus.OPEN:
        raise ValueError("Tribe is not accepting new members")

    # Check if already a member
    existing = await session.execute(
        select(tribe_members.c.user_id).where(
            and_(
                tribe_members.c.tribe_id == tribe_id,
                tribe_members.c.user_id == user_id,
            )
        )
    )
    if existing.scalar_one_or_none() is not None:
        raise ValueError("Already a member or have a pending request")

    # Check member count
    active_count = await session.execute(
        select(tribe_members.c.user_id).where(
            and_(
                tribe_members.c.tribe_id == tribe_id,
                tribe_members.c.status == MemberStatus.ACTIVE,
            )
        )
    )
    if len(active_count.all()) >= tribe.max_members:
        raise ValueError("Tribe is full")

    now = datetime.now(UTC)
    await session.execute(
        tribe_members.insert().values(
            tribe_id=tribe_id,
            user_id=user_id,
            role=MemberRole.MEMBER,
            status=MemberStatus.PENDING,
            requested_at=now,
        )
    )
    await session.commit()
    return {"tribe_id": tribe_id, "user_id": user_id, "status": MemberStatus.PENDING}


async def approve_member(
    session: AsyncSession,
    tribe_id: str,
    member_id: str,
    owner_id: str,
) -> dict:
    """Approve a pending member. Only the tribe owner may approve."""
    tribe = await session.get(Tribe, tribe_id)
    if not tribe:
        raise ValueError("Tribe not found")
    if tribe.owner_id != owner_id:
        raise PermissionError("Only the tribe owner can approve members")

    result = await session.execute(
        select(tribe_members.c.status).where(
            and_(
                tribe_members.c.tribe_id == tribe_id,
                tribe_members.c.user_id == member_id,
                tribe_members.c.status == MemberStatus.PENDING,
            )
        )
    )
    if result.scalar_one_or_none() is None:
        raise ValueError("No pending membership found")

    now = datetime.now(UTC)
    await session.execute(
        tribe_members.update()
        .where(
            and_(
                tribe_members.c.tribe_id == tribe_id,
                tribe_members.c.user_id == member_id,
            )
        )
        .values(status=MemberStatus.ACTIVE, joined_at=now)
    )
    await session.commit()
    return {"tribe_id": tribe_id, "user_id": member_id, "status": MemberStatus.ACTIVE}


async def reject_member(
    session: AsyncSession,
    tribe_id: str,
    member_id: str,
    owner_id: str,
) -> None:
    """Reject a pending member. Only the tribe owner may reject."""
    tribe = await session.get(Tribe, tribe_id)
    if not tribe:
        raise ValueError("Tribe not found")
    if tribe.owner_id != owner_id:
        raise PermissionError("Only the tribe owner can reject members")

    result = await session.execute(
        select(tribe_members.c.status).where(
            and_(
                tribe_members.c.tribe_id == tribe_id,
                tribe_members.c.user_id == member_id,
                tribe_members.c.status == MemberStatus.PENDING,
            )
        )
    )
    if result.scalar_one_or_none() is None:
        raise ValueError("No pending membership found")

    await session.execute(
        tribe_members.update()
        .where(
            and_(
                tribe_members.c.tribe_id == tribe_id,
                tribe_members.c.user_id == member_id,
            )
        )
        .values(status=MemberStatus.REJECTED)
    )
    await session.commit()


async def remove_member(
    session: AsyncSession,
    tribe_id: str,
    member_id: str,
    owner_id: str,
) -> None:
    """Remove a member from a tribe. Only the tribe owner may remove."""
    tribe = await session.get(Tribe, tribe_id)
    if not tribe:
        raise ValueError("Tribe not found")
    if tribe.owner_id != owner_id:
        raise PermissionError("Only the tribe owner can remove members")
    if member_id == owner_id:
        raise ValueError("Cannot remove yourself as owner")

    await session.execute(
        tribe_members.update()
        .where(
            and_(
                tribe_members.c.tribe_id == tribe_id,
                tribe_members.c.user_id == member_id,
            )
        )
        .values(status=MemberStatus.REMOVED)
    )
    await session.commit()


async def leave(
    session: AsyncSession,
    tribe_id: str,
    user_id: str,
) -> None:
    """Leave a tribe. The owner cannot leave their own tribe."""
    tribe = await session.get(Tribe, tribe_id)
    if not tribe:
        raise ValueError("Tribe not found")
    if tribe.owner_id == user_id:
        raise ValueError("The owner cannot leave the tribe")

    result = await session.execute(
        select(tribe_members.c.status).where(
            and_(
                tribe_members.c.tribe_id == tribe_id,
                tribe_members.c.user_id == user_id,
                tribe_members.c.status == MemberStatus.ACTIVE,
            )
        )
    )
    if result.scalar_one_or_none() is None:
        raise ValueError("Not an active member of this tribe")

    await session.execute(
        tribe_members.update()
        .where(
            and_(
                tribe_members.c.tribe_id == tribe_id,
                tribe_members.c.user_id == user_id,
            )
        )
        .values(status=MemberStatus.LEFT)
    )
    await session.commit()
