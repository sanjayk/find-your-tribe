"""Tests for tribe_service — CRUD, membership, and join/leave flows."""

import pytest
from sqlalchemy import and_, select

from app.models.enums import MemberRole, MemberStatus, TribeStatus
from app.models.tribe import tribe_members
from app.services import tribe_service

# ---------------------------------------------------------------------------
# create
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_create_happy_path(async_session, seed_test_data):
    """Creating a tribe adds the owner as an ACTIVE member with OWNER role."""
    owner = seed_test_data["users"]["testuser1"]
    tribe = await tribe_service.create(
        async_session,
        owner_id=owner.id,
        name="Alpha Tribe",
        mission="Ship fast",
        max_members=5,
    )
    assert tribe.name == "Alpha Tribe"
    assert tribe.mission == "Ship fast"
    assert tribe.owner_id == owner.id
    assert tribe.status == TribeStatus.OPEN
    assert tribe.max_members == 5

    # Verify owner was added as active member
    stmt = select(tribe_members.c.role, tribe_members.c.status).where(
        and_(
            tribe_members.c.tribe_id == tribe.id,
            tribe_members.c.user_id == owner.id,
        )
    )
    row = (await async_session.execute(stmt)).one()
    assert row.role == MemberRole.OWNER
    assert row.status == MemberStatus.ACTIVE


@pytest.mark.asyncio
async def test_create_name_validation_empty(async_session, seed_test_data):
    """Empty tribe name raises ValueError."""
    owner = seed_test_data["users"]["testuser1"]
    with pytest.raises(ValueError, match="Name must be between 1 and 100 characters"):
        await tribe_service.create(
            async_session, owner_id=owner.id, name=""
        )


@pytest.mark.asyncio
async def test_create_name_validation_too_long(async_session, seed_test_data):
    """Tribe name longer than 100 characters raises ValueError."""
    owner = seed_test_data["users"]["testuser1"]
    with pytest.raises(ValueError, match="Name must be between 1 and 100 characters"):
        await tribe_service.create(
            async_session, owner_id=owner.id, name="x" * 101
        )


@pytest.mark.asyncio
async def test_create_max_members_too_low(async_session, seed_test_data):
    """Max members below 2 raises ValueError."""
    owner = seed_test_data["users"]["testuser1"]
    with pytest.raises(ValueError, match="Max members must be between 2 and 20"):
        await tribe_service.create(
            async_session, owner_id=owner.id, name="Tiny", max_members=1
        )


@pytest.mark.asyncio
async def test_create_max_members_too_high(async_session, seed_test_data):
    """Max members above 20 raises ValueError."""
    owner = seed_test_data["users"]["testuser1"]
    with pytest.raises(ValueError, match="Max members must be between 2 and 20"):
        await tribe_service.create(
            async_session, owner_id=owner.id, name="Huge", max_members=21
        )


# ---------------------------------------------------------------------------
# update
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_update_happy_path(async_session, seed_test_data):
    """Owner can update tribe fields."""
    owner = seed_test_data["users"]["testuser1"]
    tribe = await tribe_service.create(
        async_session, owner_id=owner.id, name="Original Tribe"
    )
    updated = await tribe_service.update(
        async_session,
        tribe_id=tribe.id,
        user_id=owner.id,
        name="Renamed Tribe",
        mission="New mission",
    )
    assert updated.name == "Renamed Tribe"
    assert updated.mission == "New mission"


@pytest.mark.asyncio
async def test_update_owner_only(async_session, seed_test_data):
    """Non-owner updating a tribe raises PermissionError."""
    owner = seed_test_data["users"]["testuser1"]
    other = seed_test_data["users"]["testuser2"]
    tribe = await tribe_service.create(
        async_session, owner_id=owner.id, name="Protected Tribe"
    )
    with pytest.raises(PermissionError, match="Only the tribe owner"):
        await tribe_service.update(
            async_session,
            tribe_id=tribe.id,
            user_id=other.id,
            name="Hijacked",
        )


# ---------------------------------------------------------------------------
# request_to_join
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_request_to_join_happy_path(async_session, seed_test_data):
    """A user can request to join an open tribe."""
    owner = seed_test_data["users"]["testuser1"]
    joiner = seed_test_data["users"]["testuser2"]
    tribe = await tribe_service.create(
        async_session, owner_id=owner.id, name="Open Tribe"
    )
    result = await tribe_service.request_to_join(
        async_session, tribe_id=tribe.id, user_id=joiner.id
    )
    assert result["status"] == MemberStatus.PENDING
    assert result["user_id"] == joiner.id


@pytest.mark.asyncio
async def test_request_to_join_tribe_not_open(async_session, seed_test_data):
    """Joining a non-open tribe raises ValueError."""
    owner = seed_test_data["users"]["testuser1"]
    joiner = seed_test_data["users"]["testuser2"]
    tribe = await tribe_service.create(
        async_session, owner_id=owner.id, name="Closed Tribe"
    )
    await tribe_service.update(
        async_session, tribe_id=tribe.id, user_id=owner.id, status="active"
    )
    with pytest.raises(ValueError, match="Tribe is not accepting new members"):
        await tribe_service.request_to_join(
            async_session, tribe_id=tribe.id, user_id=joiner.id
        )


@pytest.mark.asyncio
async def test_request_to_join_already_member(async_session, seed_test_data):
    """Requesting to join when already a member raises ValueError."""
    owner = seed_test_data["users"]["testuser1"]
    joiner = seed_test_data["users"]["testuser2"]
    tribe = await tribe_service.create(
        async_session, owner_id=owner.id, name="Duped Tribe"
    )
    await tribe_service.request_to_join(
        async_session, tribe_id=tribe.id, user_id=joiner.id
    )
    with pytest.raises(ValueError, match="Already a member"):
        await tribe_service.request_to_join(
            async_session, tribe_id=tribe.id, user_id=joiner.id
        )


@pytest.mark.asyncio
async def test_request_to_join_tribe_full(async_session, seed_test_data):
    """Requesting to join a full tribe raises ValueError."""
    owner = seed_test_data["users"]["testuser1"]
    member2 = seed_test_data["users"]["testuser2"]
    joiner = seed_test_data["users"]["testuser3"]

    # Create tribe with max_members=2 (owner takes 1 slot)
    tribe = await tribe_service.create(
        async_session, owner_id=owner.id, name="Full Tribe", max_members=2
    )
    # Add second member to fill it
    await tribe_service.request_to_join(
        async_session, tribe_id=tribe.id, user_id=member2.id
    )
    await tribe_service.approve_member(
        async_session, tribe_id=tribe.id, member_id=member2.id, owner_id=owner.id
    )

    with pytest.raises(ValueError, match="Tribe is full"):
        await tribe_service.request_to_join(
            async_session, tribe_id=tribe.id, user_id=joiner.id
        )


# ---------------------------------------------------------------------------
# approve_member
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_approve_member_happy_path(async_session, seed_test_data):
    """Owner can approve a pending member."""
    owner = seed_test_data["users"]["testuser1"]
    joiner = seed_test_data["users"]["testuser2"]
    tribe = await tribe_service.create(
        async_session, owner_id=owner.id, name="Approve Tribe"
    )
    await tribe_service.request_to_join(
        async_session, tribe_id=tribe.id, user_id=joiner.id
    )
    result = await tribe_service.approve_member(
        async_session, tribe_id=tribe.id, member_id=joiner.id, owner_id=owner.id
    )
    assert result["status"] == MemberStatus.ACTIVE


@pytest.mark.asyncio
async def test_approve_member_owner_only(async_session, seed_test_data):
    """Non-owner approving a member raises PermissionError."""
    owner = seed_test_data["users"]["testuser1"]
    joiner = seed_test_data["users"]["testuser2"]
    non_owner = seed_test_data["users"]["testuser3"]
    tribe = await tribe_service.create(
        async_session, owner_id=owner.id, name="Perm Tribe"
    )
    await tribe_service.request_to_join(
        async_session, tribe_id=tribe.id, user_id=joiner.id
    )
    with pytest.raises(PermissionError, match="Only the tribe owner"):
        await tribe_service.approve_member(
            async_session,
            tribe_id=tribe.id,
            member_id=joiner.id,
            owner_id=non_owner.id,
        )


# ---------------------------------------------------------------------------
# reject_member
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_reject_member_happy_path(async_session, seed_test_data):
    """Owner can reject a pending member."""
    owner = seed_test_data["users"]["testuser1"]
    joiner = seed_test_data["users"]["testuser2"]
    tribe = await tribe_service.create(
        async_session, owner_id=owner.id, name="Reject Tribe"
    )
    await tribe_service.request_to_join(
        async_session, tribe_id=tribe.id, user_id=joiner.id
    )
    # Should not raise
    await tribe_service.reject_member(
        async_session, tribe_id=tribe.id, member_id=joiner.id, owner_id=owner.id
    )

    # Verify the member status was changed to REJECTED
    stmt = select(tribe_members.c.status).where(
        and_(
            tribe_members.c.tribe_id == tribe.id,
            tribe_members.c.user_id == joiner.id,
        )
    )
    row = (await async_session.execute(stmt)).one()
    assert row.status == MemberStatus.REJECTED


# ---------------------------------------------------------------------------
# remove_member
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_remove_member_happy_path(async_session, seed_test_data):
    """Owner can remove an active member."""
    owner = seed_test_data["users"]["testuser1"]
    member = seed_test_data["users"]["testuser2"]
    tribe = await tribe_service.create(
        async_session, owner_id=owner.id, name="Remove Tribe"
    )
    await tribe_service.request_to_join(
        async_session, tribe_id=tribe.id, user_id=member.id
    )
    await tribe_service.approve_member(
        async_session, tribe_id=tribe.id, member_id=member.id, owner_id=owner.id
    )
    # Should not raise
    await tribe_service.remove_member(
        async_session, tribe_id=tribe.id, member_id=member.id, owner_id=owner.id
    )

    # Verify member status is REMOVED
    stmt = select(tribe_members.c.status).where(
        and_(
            tribe_members.c.tribe_id == tribe.id,
            tribe_members.c.user_id == member.id,
        )
    )
    row = (await async_session.execute(stmt)).one()
    assert row.status == MemberStatus.REMOVED


@pytest.mark.asyncio
async def test_remove_member_cannot_remove_owner(async_session, seed_test_data):
    """Owner cannot remove themselves."""
    owner = seed_test_data["users"]["testuser1"]
    tribe = await tribe_service.create(
        async_session, owner_id=owner.id, name="Self Remove Tribe"
    )
    with pytest.raises(ValueError, match="Cannot remove yourself as owner"):
        await tribe_service.remove_member(
            async_session,
            tribe_id=tribe.id,
            member_id=owner.id,
            owner_id=owner.id,
        )


# ---------------------------------------------------------------------------
# leave
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_leave_happy_path(async_session, seed_test_data):
    """An active member can leave a tribe."""
    owner = seed_test_data["users"]["testuser1"]
    member = seed_test_data["users"]["testuser2"]
    tribe = await tribe_service.create(
        async_session, owner_id=owner.id, name="Leave Tribe"
    )
    await tribe_service.request_to_join(
        async_session, tribe_id=tribe.id, user_id=member.id
    )
    await tribe_service.approve_member(
        async_session, tribe_id=tribe.id, member_id=member.id, owner_id=owner.id
    )
    # Should not raise
    await tribe_service.leave(
        async_session, tribe_id=tribe.id, user_id=member.id
    )

    # Verify member status is LEFT
    stmt = select(tribe_members.c.status).where(
        and_(
            tribe_members.c.tribe_id == tribe.id,
            tribe_members.c.user_id == member.id,
        )
    )
    row = (await async_session.execute(stmt)).one()
    assert row.status == MemberStatus.LEFT


@pytest.mark.asyncio
async def test_leave_owner_cannot_leave(async_session, seed_test_data):
    """Owner cannot leave their own tribe."""
    owner = seed_test_data["users"]["testuser1"]
    tribe = await tribe_service.create(
        async_session, owner_id=owner.id, name="Owner Leave Tribe"
    )
    with pytest.raises(ValueError, match="The owner cannot leave the tribe"):
        await tribe_service.leave(
            async_session, tribe_id=tribe.id, user_id=owner.id
        )
