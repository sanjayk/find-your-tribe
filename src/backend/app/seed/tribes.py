"""Seed data for tribes."""

from datetime import UTC, datetime

from sqlalchemy import insert
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.enums import MemberRole, MemberStatus, TribeStatus
from app.models.tribe import Tribe, TribeOpenRole, tribe_members


async def seed_tribes(session: AsyncSession, users_dict: dict[str, str]) -> dict[str, str]:
    """
    Seed tribes data into the database.

    Creates exactly 3 tribes matching the prototype specifications with owners,
    members, missions, statuses, and open roles.

    Args:
        session: Async database session
        users_dict: Dictionary mapping username to user ID

    Returns:
        Dictionary mapping tribe name to tribe ID
    """
    tribes_data = [
        {
            "name": "Hospitality OS",
            "owner": "tomnakamura",
            "members": ["mayachen", "jamesokafor"],
            "status": TribeStatus.OPEN,
            "mission": "Building the operating system for independent hotels",
            "open_roles": [
                {
                    "title": "Backend Engineer",
                    "skills_needed": ["Go", "PostgreSQL"],
                },
                {
                    "title": "Growth Marketer",
                    "skills_needed": ["SEO", "Partnerships"],
                },
            ],
        },
        {
            "name": "AI for Education",
            "owner": "sarahkim",
            "members": ["alexrivera"],
            "status": TribeStatus.OPEN,
            "mission": "Making personalized learning accessible to every student",
            "open_roles": [
                {
                    "title": "Product Designer",
                    "skills_needed": ["Figma", "User Research"],
                },
            ],
        },
        {
            "name": "Creator Economy Tools",
            "owner": "elenavolkov",
            "members": ["marcusjohnson"],
            "status": TribeStatus.ACTIVE,
            "mission": "Empowering independent creators with better business tools",
            "open_roles": [],
        },
    ]

    # Prepare tribes for bulk insert
    tribes_for_insert = []
    for tribe_data in tribes_data:
        tribe_dict = {
            "owner_id": users_dict[tribe_data["owner"]],
            "name": tribe_data["name"],
            "mission": tribe_data["mission"],
            "status": tribe_data["status"],
        }
        tribes_for_insert.append(tribe_dict)

    # Bulk insert all tribes
    stmt = insert(Tribe).values(tribes_for_insert).returning(Tribe.id, Tribe.name)
    result = await session.execute(stmt)
    tribe_rows = result.fetchall()

    # Build lookup dictionary mapping name to ID
    tribe_lookup = {row.name: row.id for row in tribe_rows}

    # Create TribeMember relationships
    member_relationships = []
    current_time = datetime.now(UTC)

    for tribe_data in tribes_data:
        tribe_id = tribe_lookup[tribe_data["name"]]
        owner_username = tribe_data["owner"]

        # Add owner as OWNER role with ACTIVE status
        member_relationships.append({
            "tribe_id": tribe_id,
            "user_id": users_dict[owner_username],
            "role": MemberRole.OWNER,
            "status": MemberStatus.ACTIVE,
            "joined_at": current_time,
            "requested_at": current_time,
        })

        # Add members as MEMBER role with ACTIVE status
        for member_username in tribe_data["members"]:
            member_relationships.append({
                "tribe_id": tribe_id,
                "user_id": users_dict[member_username],
                "role": MemberRole.MEMBER,
                "status": MemberStatus.ACTIVE,
                "joined_at": current_time,
                "requested_at": current_time,
            })

    # Bulk insert all member relationships
    if member_relationships:
        stmt = insert(tribe_members).values(member_relationships)
        await session.execute(stmt)

    # Create TribeOpenRole records
    open_roles_for_insert = []
    for tribe_data in tribes_data:
        tribe_id = tribe_lookup[tribe_data["name"]]
        for role_data in tribe_data["open_roles"]:
            open_roles_for_insert.append({
                "tribe_id": tribe_id,
                "title": role_data["title"],
                "skills_needed": role_data["skills_needed"],
            })

    # Bulk insert all open roles
    if open_roles_for_insert:
        stmt = insert(TribeOpenRole).values(open_roles_for_insert)
        await session.execute(stmt)

    await session.commit()

    return tribe_lookup
