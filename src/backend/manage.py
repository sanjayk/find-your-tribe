"""Database management CLI for Find Your Tribe.

Usage:
    python manage.py init-db      Create all tables (idempotent)
    python manage.py seed          Seed the database with sample data
    python manage.py reset-db      Drop all tables and recreate (with confirmation)
"""

import argparse
import asyncio
import sys

import app.models  # noqa: F401
from app.db.base import Base
from app.db.engine import async_session_factory, engine


async def init_db() -> None:
    """Create all tables using Base.metadata.create_all (idempotent)."""
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all, checkfirst=True)
    print("Tables created successfully.")


async def seed() -> None:
    """Run all seed scripts in the correct order.

    The seed functions form a chain where each returns a lookup dictionary
    that subsequent seeds consume:
        skills_dict  -> seed_users(skills_dict)  -> users_dict
        users_dict   -> seed_projects(users_dict) -> projects_dict
        users_dict   -> seed_tribes(users_dict)   -> tribes_dict
        users_dict, projects_dict, tribes_dict -> seed_feed_events(...)
        users_dict, projects_dict -> seed_build_activities(...)
    """
    from app.seed.build_activities import seed_build_activities
    from app.seed.feed_events import seed_feed_events
    from app.seed.projects import seed_projects
    from app.seed.skills import seed_skills
    from app.seed.tribes import seed_tribes
    from app.seed.users import seed_users

    async with async_session_factory() as session:
        print("Seeding skills...")
        skills_dict = await seed_skills(session)
        print(f"  -> {len(skills_dict)} skills created.")

        print("Seeding users...")
        users_dict = await seed_users(session, skills_dict)
        print(f"  -> {len(users_dict)} users created.")

        print("Seeding projects...")
        projects_dict = await seed_projects(session, users_dict)
        print(f"  -> {len(projects_dict)} projects created.")

        print("Seeding tribes...")
        tribes_dict = await seed_tribes(session, users_dict)
        print(f"  -> {len(tribes_dict)} tribes created.")

        print("Seeding feed events...")
        events_dict = await seed_feed_events(session, users_dict, projects_dict, tribes_dict)
        print(f"  -> {len(events_dict)} feed events created.")

        print("Seeding build activities...")
        activity_count = await seed_build_activities(session, users_dict, projects_dict)
        print(f"  -> {activity_count} build activity rows created.")

    print("Seeding complete.")


async def reset_db() -> None:
    """Drop all tables and recreate them."""
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)
    print("All tables dropped.")

    await init_db()


def main() -> None:
    parser = argparse.ArgumentParser(
        description="Database management CLI for Find Your Tribe.",
    )
    subparsers = parser.add_subparsers(dest="command", required=True)

    subparsers.add_parser("init-db", help="Create all tables (idempotent)")
    subparsers.add_parser("seed", help="Seed the database with sample data")
    subparsers.add_parser("reset-db", help="Drop all tables and recreate them")

    args = parser.parse_args()

    if args.command == "init-db":
        asyncio.run(init_db())
    elif args.command == "seed":
        asyncio.run(seed())
    elif args.command == "reset-db":
        confirm = input("This will DROP ALL TABLES and recreate them. Type 'yes' to confirm: ")
        if confirm.strip().lower() != "yes":
            print("Aborted.")
            sys.exit(1)
        asyncio.run(reset_db())


if __name__ == "__main__":
    main()
