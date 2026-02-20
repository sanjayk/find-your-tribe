"""Tests for requested_role_id on tribe join/approve flow."""

import pytest
from sqlalchemy import and_, select

from app.models.tribe import TribeOpenRole, tribe_members
from app.services import tribe_service


@pytest.mark.asyncio
async def test_request_to_join_stores_requested_role_id(async_session, seed_test_data):
    """requestToJoin stores requested_role_id correctly."""
    owner = seed_test_data["users"]["testuser1"]
    joiner = seed_test_data["users"]["testuser2"]

    tribe = await tribe_service.create(
        async_session, owner_id=owner.id, name="Role Tribe"
    )
    role = await tribe_service.add_open_role(
        async_session, tribe_id=tribe.id, user_id=owner.id,
        title="Backend Engineer", skills_needed=["Python"],
    )

    await tribe_service.request_to_join(
        async_session, tribe_id=tribe.id, user_id=joiner.id, role_id=role.id,
    )

    stmt = select(tribe_members.c.requested_role_id).where(
        and_(
            tribe_members.c.tribe_id == tribe.id,
            tribe_members.c.user_id == joiner.id,
        )
    )
    row = (await async_session.execute(stmt)).one()
    assert row.requested_role_id == role.id


@pytest.mark.asyncio
async def test_request_to_join_fails_if_role_not_on_tribe(async_session, seed_test_data):
    """requestToJoin fails if role doesn't exist on tribe."""
    owner = seed_test_data["users"]["testuser1"]
    joiner = seed_test_data["users"]["testuser2"]

    tribe = await tribe_service.create(
        async_session, owner_id=owner.id, name="No Role Tribe"
    )

    with pytest.raises(ValueError, match="Role not found on this tribe"):
        await tribe_service.request_to_join(
            async_session, tribe_id=tribe.id, user_id=joiner.id,
            role_id="01NONEXISTENT0000000000000",
        )


@pytest.mark.asyncio
async def test_request_to_join_fails_if_role_already_filled(async_session, seed_test_data):
    """requestToJoin fails if role is already filled."""
    owner = seed_test_data["users"]["testuser1"]
    member2 = seed_test_data["users"]["testuser2"]
    joiner = seed_test_data["users"]["testuser3"]

    tribe = await tribe_service.create(
        async_session, owner_id=owner.id, name="Filled Role Tribe"
    )
    role = await tribe_service.add_open_role(
        async_session, tribe_id=tribe.id, user_id=owner.id,
        title="Designer", skills_needed=["Figma"],
    )

    # First member takes the role and gets approved (fills it)
    await tribe_service.request_to_join(
        async_session, tribe_id=tribe.id, user_id=member2.id, role_id=role.id,
    )
    await tribe_service.approve_member(
        async_session, tribe_id=tribe.id, member_id=member2.id, owner_id=owner.id,
    )

    # Second member tries the same filled role
    with pytest.raises(ValueError, match="Role is already filled"):
        await tribe_service.request_to_join(
            async_session, tribe_id=tribe.id, user_id=joiner.id, role_id=role.id,
        )


@pytest.mark.asyncio
async def test_approve_member_fills_open_role(async_session, seed_test_data):
    """approveMember sets TribeOpenRole.filled=True and filled_by when requested_role_id is set."""
    owner = seed_test_data["users"]["testuser1"]
    joiner = seed_test_data["users"]["testuser2"]

    tribe = await tribe_service.create(
        async_session, owner_id=owner.id, name="Auto Fill Tribe"
    )
    role = await tribe_service.add_open_role(
        async_session, tribe_id=tribe.id, user_id=owner.id,
        title="Frontend Dev", skills_needed=["React"],
    )

    await tribe_service.request_to_join(
        async_session, tribe_id=tribe.id, user_id=joiner.id, role_id=role.id,
    )
    await tribe_service.approve_member(
        async_session, tribe_id=tribe.id, member_id=joiner.id, owner_id=owner.id,
    )

    # Verify the open role is now filled
    updated_role = await async_session.get(TribeOpenRole, role.id)
    assert updated_role.filled is True
    assert updated_role.filled_by == joiner.id


@pytest.mark.asyncio
async def test_tribe_member_type_has_requested_role_field():
    """TribeMemberType includes requested_role field in GraphQL schema."""
    from app.graphql.types.tribe import TribeMemberType

    fields = {
        field.name for field in TribeMemberType.__strawberry_definition__.fields
    }
    assert "requested_role" in fields
