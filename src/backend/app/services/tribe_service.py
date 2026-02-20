"""Tribe service — CRUD, membership, open role management, and search."""

from datetime import UTC, datetime

from sqlalchemy import and_, distinct, func, or_, select, text
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload
from ulid import ULID

from app.models.enums import MemberRole, MemberStatus, TribeStatus
from app.models.tribe import Tribe, TribeOpenRole, tribe_members
from app.models.user import User


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
    role_id: str,
) -> dict:
    """Request to join a tribe for a specific open role. Creates a pending membership."""
    tribe = await session.get(Tribe, tribe_id)
    if not tribe:
        raise ValueError("Tribe not found")
    if tribe.status != TribeStatus.OPEN:
        raise ValueError("Tribe is not accepting new members")

    # Validate the requested role exists, belongs to this tribe, and is not filled
    role = await session.get(TribeOpenRole, role_id)
    if not role or role.tribe_id != tribe_id:
        raise ValueError("Role not found on this tribe")
    if role.filled:
        raise ValueError("Role is already filled")

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
            requested_role_id=role_id,
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

    # Auto-fill the open role if the member requested one
    member_row = await session.execute(
        select(tribe_members.c.requested_role_id).where(
            and_(
                tribe_members.c.tribe_id == tribe_id,
                tribe_members.c.user_id == member_id,
            )
        )
    )
    requested_role_id = member_row.scalar_one_or_none()
    if requested_role_id:
        role = await session.get(TribeOpenRole, requested_role_id)
        if role:
            role.filled = True
            role.filled_by = member_id
            await session.flush()

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


async def search(
    session: AsyncSession,
    query: str,
    limit: int = 20,
    offset: int = 0,
) -> tuple[list[Tribe], int]:
    """Search tribes by name, mission, open role titles/skills, member names, or timezones.

    Uses full-text search on tribe and user search_vectors, plus ILIKE matching
    on open role titles, skills_needed JSONB, and user timezones.

    Returns:
        Tuple of (matching tribes with eager-loaded relationships, total count).
    """
    q = query.strip()
    if not q:
        return [], 0

    pattern = f"%{q}%"
    ts_query = func.plainto_tsquery("english", q)

    # Aliases for joined tables
    member_assoc = tribe_members.alias("search_members")
    member_user = User.__table__.alias("search_users")
    role_table = TribeOpenRole.__table__.alias("search_roles")

    # Build WHERE conditions across all searchable fields
    where_clause = or_(
        # Full-text search on tribe name/mission
        Tribe.search_vector.op("@@")(ts_query),
        # Full-text search on member names
        member_user.c.search_vector.op("@@")(ts_query),
        # ILIKE on open role titles
        role_table.c.title.ilike(pattern),
        # ILIKE on skills_needed JSONB array elements
        text(
            "EXISTS (SELECT 1 FROM jsonb_array_elements_text("
            "search_roles.skills_needed) s WHERE s ILIKE :pattern)"
        ).bindparams(pattern=pattern),
        # ILIKE on member timezone
        member_user.c.timezone.ilike(pattern),
    )

    # Count query
    count_stmt = select(func.count(distinct(Tribe.id))).select_from(
        Tribe.__table__
        .outerjoin(role_table, role_table.c.tribe_id == Tribe.id)
        .outerjoin(
            member_assoc,
            and_(
                member_assoc.c.tribe_id == Tribe.id,
                member_assoc.c.status == MemberStatus.ACTIVE,
            ),
        )
        .outerjoin(member_user, member_user.c.id == member_assoc.c.user_id)
    ).where(where_clause)

    count_result = await session.execute(count_stmt)
    total = count_result.scalar_one()

    if total == 0:
        return [], 0

    # Fetch distinct tribe IDs, ordered by text search rank
    ids_stmt = (
        select(Tribe.id)
        .outerjoin(role_table, role_table.c.tribe_id == Tribe.id)
        .outerjoin(
            member_assoc,
            and_(
                member_assoc.c.tribe_id == Tribe.id,
                member_assoc.c.status == MemberStatus.ACTIVE,
            ),
        )
        .outerjoin(member_user, member_user.c.id == member_assoc.c.user_id)
        .where(where_clause)
        .group_by(Tribe.id)
        .order_by(
            func.max(func.ts_rank(Tribe.search_vector, ts_query)).desc().nulls_last()
        )
        .limit(limit)
        .offset(offset)
    )

    ids_result = await session.execute(ids_stmt)
    tribe_ids = [row[0] for row in ids_result.fetchall()]

    if not tribe_ids:
        return [], total

    # Load full tribe objects with eager-loaded relationships
    tribes_stmt = (
        select(Tribe)
        .where(Tribe.id.in_(tribe_ids))
        .options(
            selectinload(Tribe.owner),
            selectinload(Tribe.members),
            selectinload(Tribe.open_roles),
        )
    )
    tribes_result = await session.execute(tribes_stmt)
    tribes = list(tribes_result.scalars().all())

    # Preserve the ranked order from the IDs query
    order_map = {tid: idx for idx, tid in enumerate(tribe_ids)}
    tribes.sort(key=lambda t: order_map.get(t.id, 0))

    return tribes, total
