"""Seed data for feed events."""

from datetime import datetime, timedelta, timezone

from sqlalchemy import insert
from sqlalchemy.ext.asyncio import AsyncSession
from ulid import ULID

from app.models.enums import EventType
from app.models.feed_event import FeedEvent


async def seed_feed_events(
    session: AsyncSession,
    users_dict: dict[str, str],
    projects_dict: dict[str, str],
    tribes_dict: dict[str, str],
) -> dict[str, str]:
    """
    Seed feed events data into the database.

    Creates exactly 15 feed events in reverse chronological order matching the
    prototype specifications with proper event types, actors, targets, and metadata.

    Args:
        session: Async database session
        users_dict: Dictionary mapping username to user ID
        projects_dict: Dictionary mapping project title to project ID
        tribes_dict: Dictionary mapping tribe name to tribe ID

    Returns:
        Dictionary mapping event index to event ID
    """
    # Base timestamp for events (2 hours ago from now)
    base_time = datetime.now(timezone.utc) - timedelta(hours=2)

    # Define events in reverse chronological order (newest first)
    # Each event gets a progressively older timestamp
    events_data = [
        {
            "time_offset_hours": 2,  # 2 hours ago
            "event_type": EventType.PROJECT_SHIPPED,
            "actor": "mayachen",
            "target_type": "project",
            "target": "AI Resume Builder",
            "metadata": {
                "project_title": "AI Resume Builder",
                "tech_stack": ["React", "Python", "OpenAI", "PostgreSQL"],
                "github_stars": 340,
            },
        },
        {
            "time_offset_hours": 6,  # 6 hours ago
            "event_type": EventType.TRIBE_CREATED,
            "actor": "tomnakamura",
            "target_type": "tribe",
            "target": "Hospitality OS",
            "metadata": {
                "tribe_name": "Hospitality OS",
                "mission": "Building the operating system for independent hotels",
            },
        },
        {
            "time_offset_hours": 8,  # 8 hours ago
            "event_type": EventType.PROJECT_CREATED,
            "actor": "alexrivera",
            "target_type": "project",
            "target": "Open Source CRM",
            "metadata": {
                "project_title": "Open Source CRM",
                "tech_stack": ["React", "Node.js", "PostgreSQL"],
            },
        },
        {
            "time_offset_hours": 12,  # 12 hours ago
            "event_type": EventType.MEMBER_JOINED_TRIBE,
            "actor": "jamesokafor",
            "target_type": "tribe",
            "target": "Hospitality OS",
            "metadata": {
                "tribe_name": "Hospitality OS",
                "member_name": "James Okafor",
            },
        },
        {
            "time_offset_hours": 18,  # 18 hours ago
            "event_type": EventType.PROJECT_SHIPPED,
            "actor": "sarahkim",
            "target_type": "project",
            "target": "ML Pipeline Framework",
            "metadata": {
                "project_title": "ML Pipeline Framework",
                "tech_stack": ["Python", "TensorFlow", "Docker"],
                "github_stars": 2100,
            },
        },
        {
            "time_offset_hours": 24,  # 1 day ago
            "event_type": EventType.PROJECT_CREATED,
            "actor": "davidmorales",
            "target_type": "project",
            "target": "Growth Analytics Dashboard",
            "metadata": {
                "project_title": "Growth Analytics Dashboard",
                "tech_stack": ["Next.js", "Python", "Grafana"],
            },
        },
        {
            "time_offset_hours": 30,  # 1.25 days ago
            "event_type": EventType.COLLABORATION_CONFIRMED,
            "actor": "elenavolkov",
            "target_type": "project",
            "target": "Growth Analytics Dashboard",
            "metadata": {
                "project_title": "Growth Analytics Dashboard",
                "collaborator_name": "Elena Volkov",
                "owner_name": "David Morales",
            },
        },
        {
            "time_offset_hours": 36,  # 1.5 days ago
            "event_type": EventType.TRIBE_CREATED,
            "actor": "tomnakamura",
            "target_type": "tribe",
            "target": "Hospitality OS",
            "metadata": {
                "tribe_name": "Hospitality OS",
                "mission": "Building the operating system for independent hotels",
            },
        },
        {
            "time_offset_hours": 42,  # 1.75 days ago
            "event_type": EventType.MEMBER_JOINED_TRIBE,
            "actor": "marcusjohnson",
            "target_type": "tribe",
            "target": "Creator Economy Tools",
            "metadata": {
                "tribe_name": "Creator Economy Tools",
                "member_name": "Marcus Johnson",
            },
        },
        {
            "time_offset_hours": 48,  # 2 days ago
            "event_type": EventType.PROJECT_CREATED,
            "actor": "mayachen",
            "target_type": "project",
            "target": "Tribe Finder",
            "metadata": {
                "project_title": "Tribe Finder",
                "tech_stack": ["Next.js", "Go", "PostgreSQL"],
            },
        },
        {
            "time_offset_hours": 54,  # 2.25 days ago
            "event_type": EventType.COLLABORATION_CONFIRMED,
            "actor": "priyasharma",
            "target_type": "project",
            "target": "Tribe Finder",
            "metadata": {
                "project_title": "Tribe Finder",
                "collaborator_name": "Priya Sharma",
                "owner_name": "Maya Chen",
            },
        },
        {
            "time_offset_hours": 60,  # 2.5 days ago
            "event_type": EventType.TRIBE_CREATED,
            "actor": "sarahkim",
            "target_type": "tribe",
            "target": "AI for Education",
            "metadata": {
                "tribe_name": "AI for Education",
                "mission": "Making personalized learning accessible to every student",
            },
        },
        {
            "time_offset_hours": 66,  # 2.75 days ago
            "event_type": EventType.MEMBER_JOINED_TRIBE,
            "actor": "alexrivera",
            "target_type": "tribe",
            "target": "AI for Education",
            "metadata": {
                "tribe_name": "AI for Education",
                "member_name": "Alex Rivera",
            },
        },
        {
            "time_offset_hours": 72,  # 3 days ago
            "event_type": EventType.PROJECT_SHIPPED,
            "actor": "jamesokafor",
            "target_type": "project",
            "target": "Design System Kit",
            "metadata": {
                "project_title": "Design System Kit",
                "tech_stack": ["Figma", "React", "Storybook"],
                "github_stars": 520,
            },
        },
        {
            "time_offset_hours": 78,  # 3.25 days ago
            "event_type": EventType.BUILDER_JOINED,
            "actor": "aishapatel",
            "target_type": "user",
            "target": "aishapatel",
            "metadata": {
                "user_name": "Aisha Patel",
                "skills": ["User Research", "Prototyping", "Analytics"],
            },
        },
    ]

    # Prepare feed events for bulk insert
    events_for_insert = []
    for event_data in events_data:
        # Calculate timestamp for this event
        event_time = base_time - timedelta(hours=event_data["time_offset_hours"] - 2)

        # Generate ULID with specific timestamp for proper ordering
        event_ulid = ULID.from_timestamp(event_time.timestamp())

        # Determine target_id based on target_type
        if event_data["target_type"] == "project":
            target_id = projects_dict[event_data["target"]]
        elif event_data["target_type"] == "tribe":
            target_id = tribes_dict[event_data["target"]]
        elif event_data["target_type"] == "user":
            target_id = users_dict[event_data["target"]]
        else:
            raise ValueError(f"Unknown target_type: {event_data['target_type']}")

        event_dict = {
            "id": str(event_ulid),
            "event_type": event_data["event_type"],
            "actor_id": users_dict[event_data["actor"]],
            "target_type": event_data["target_type"],
            "target_id": target_id,
            "event_metadata": event_data["metadata"],
            "created_at": event_time,
        }
        events_for_insert.append(event_dict)

    # Bulk insert all feed events
    stmt = insert(FeedEvent).values(events_for_insert).returning(FeedEvent.id)
    result = await session.execute(stmt)
    event_rows = result.fetchall()

    # Build lookup dictionary mapping index to event ID
    event_lookup = {str(i): event_rows[i].id for i in range(len(event_rows))}

    await session.commit()

    return event_lookup
