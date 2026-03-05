"""Regression test: all seed users must have onboarding_completed=True."""

import pytest
from sqlalchemy import select

from app.db.base import Base
from app.models.user import User
from app.seed.skills import seed_skills
from app.seed.users import seed_users


@pytest.mark.asyncio
async def test_seed_users_onboarding_completed_true():
    """Every seed user must have onboarding_completed=True."""
    from app.db.engine import async_session_factory, engine

    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    try:
        async with async_session_factory() as session:
            skills_dict = await seed_skills(session)
            await seed_users(session, skills_dict)

            result = await session.execute(select(User))
            users = result.scalars().all()

            assert len(users) == 10, f"Expected 10 seed users, got {len(users)}"

            for user in users:
                assert user.onboarding_completed is True, (
                    f"User {user.username} has onboarding_completed={user.onboarding_completed}, expected True"
                )
    finally:
        async with engine.begin() as conn:
            await conn.run_sync(Base.metadata.drop_all)
