"""Tests for user_service — CRUD operations on User model."""

import pytest

from app.models.enums import AgentWorkflowStyle, AvailabilityStatus, UserRole
from app.models.user import User
from app.services import user_service

# ---------------------------------------------------------------------------
# get_by_id
# ---------------------------------------------------------------------------


class TestGetById:
    """Tests for user_service.get_by_id."""

    async def test_returns_user_when_found(self, async_session, seed_test_data):
        """Returns User object for an existing user ID."""
        user = seed_test_data["users"]["testuser1"]
        result = await user_service.get_by_id(async_session, user.id)
        assert result is not None
        assert result.id == user.id
        assert result.username == "testuser1"

    async def test_returns_none_when_not_found(self, async_session):
        """Returns None for a nonexistent user ID."""
        result = await user_service.get_by_id(async_session, "nonexistent_0000000000")
        assert result is None


# ---------------------------------------------------------------------------
# get_by_id_with_skills
# ---------------------------------------------------------------------------


class TestGetByIdWithSkills:
    """Tests for user_service.get_by_id_with_skills."""

    async def test_returns_user_with_skills_loaded(self, async_session, seed_test_data):
        """Returns user with skills eagerly loaded."""
        user = seed_test_data["users"]["testuser1"]
        result = await user_service.get_by_id_with_skills(async_session, user.id)
        assert result is not None
        assert result.id == user.id
        # testuser1 has Python and React skills
        skill_names = {s.name for s in result.skills}
        assert "Python" in skill_names
        assert "React" in skill_names

    async def test_returns_none_when_not_found(self, async_session):
        """Returns None for a nonexistent user ID."""
        result = await user_service.get_by_id_with_skills(async_session, "nonexistent_0000000000")
        assert result is None

    async def test_user_with_no_skills(self, async_session):
        """A user with no skills returns an empty skills list."""
        user = User(
            username="noskills",
            display_name="No Skills",
            email="noskills@example.com",
            primary_role=UserRole.OTHER,
            availability_status=AvailabilityStatus.JUST_BROWSING,
            builder_score=0.0,
            contact_links={},
        )
        async_session.add(user)
        await async_session.commit()

        result = await user_service.get_by_id_with_skills(async_session, user.id)
        assert result is not None
        assert result.skills == []


# ---------------------------------------------------------------------------
# update_profile
# ---------------------------------------------------------------------------


class TestUpdateProfile:
    """Tests for user_service.update_profile."""

    async def test_updates_display_name(self, async_session, seed_test_data):
        """Updates only the display_name field."""
        user = seed_test_data["users"]["testuser1"]
        updated = await user_service.update_profile(
            async_session, user.id, display_name="New Name"
        )
        assert updated.display_name == "New Name"
        assert updated.username == "testuser1"  # unchanged

    async def test_updates_headline(self, async_session, seed_test_data):
        """Updates the headline field."""
        user = seed_test_data["users"]["testuser1"]
        updated = await user_service.update_profile(
            async_session, user.id, headline="New Headline"
        )
        assert updated.headline == "New Headline"

    async def test_updates_bio(self, async_session, seed_test_data):
        """Updates the bio field."""
        user = seed_test_data["users"]["testuser1"]
        updated = await user_service.update_profile(
            async_session, user.id, bio="Updated bio text"
        )
        assert updated.bio == "Updated bio text"

    async def test_updates_primary_role(self, async_session, seed_test_data):
        """Updates the primary_role using enum string value."""
        user = seed_test_data["users"]["testuser1"]
        updated = await user_service.update_profile(
            async_session, user.id, primary_role="designer"
        )
        assert updated.primary_role == UserRole.DESIGNER

    async def test_updates_timezone(self, async_session, seed_test_data):
        """Updates the timezone field."""
        user = seed_test_data["users"]["testuser1"]
        updated = await user_service.update_profile(
            async_session, user.id, timezone="America/Chicago"
        )
        assert updated.timezone == "America/Chicago"

    async def test_updates_availability_status(self, async_session, seed_test_data):
        """Updates the availability_status using enum string value."""
        user = seed_test_data["users"]["testuser1"]
        updated = await user_service.update_profile(
            async_session, user.id, availability_status="just_browsing"
        )
        assert updated.availability_status == AvailabilityStatus.JUST_BROWSING

    async def test_updates_contact_links(self, async_session, seed_test_data):
        """Updates contact_links JSON field."""
        user = seed_test_data["users"]["testuser1"]
        new_links = {"github_username": "newgithub", "twitter": "@test"}
        updated = await user_service.update_profile(
            async_session, user.id, contact_links=new_links
        )
        assert updated.contact_links == new_links

    async def test_updates_agent_tools(self, async_session, seed_test_data):
        """Updates agent_tools list."""
        user = seed_test_data["users"]["testuser1"]
        tools = ["Claude Code", "Cursor"]
        updated = await user_service.update_profile(
            async_session, user.id, agent_tools=tools
        )
        assert updated.agent_tools == tools

    async def test_updates_agent_workflow_style(self, async_session, seed_test_data):
        """Updates agent_workflow_style enum."""
        user = seed_test_data["users"]["testuser1"]
        updated = await user_service.update_profile(
            async_session, user.id, agent_workflow_style="pair"
        )
        assert updated.agent_workflow_style == AgentWorkflowStyle.PAIR

    async def test_updates_human_agent_ratio(self, async_session, seed_test_data):
        """Updates human_agent_ratio float."""
        user = seed_test_data["users"]["testuser1"]
        updated = await user_service.update_profile(
            async_session, user.id, human_agent_ratio=0.75
        )
        assert updated.human_agent_ratio == 0.75

    async def test_updates_multiple_fields(self, async_session, seed_test_data):
        """Updates multiple fields at once."""
        user = seed_test_data["users"]["testuser1"]
        updated = await user_service.update_profile(
            async_session,
            user.id,
            display_name="Multi Update",
            headline="Multi Headline",
            bio="Multi Bio",
        )
        assert updated.display_name == "Multi Update"
        assert updated.headline == "Multi Headline"
        assert updated.bio == "Multi Bio"

    async def test_none_values_are_not_applied(self, async_session, seed_test_data):
        """Fields passed as None are not updated."""
        user = seed_test_data["users"]["testuser1"]
        original_headline = user.headline
        updated = await user_service.update_profile(
            async_session, user.id, display_name="Changed", headline=None
        )
        assert updated.display_name == "Changed"
        assert updated.headline == original_headline

    async def test_raises_for_nonexistent_user(self, async_session):
        """Raises ValueError when user ID doesn't exist."""
        with pytest.raises(ValueError, match="not found"):
            await user_service.update_profile(
                async_session, "nonexistent_0000000000", display_name="X"
            )

    async def test_invalid_role_raises_value_error(self, async_session, seed_test_data):
        """Invalid primary_role string raises ValueError."""
        user = seed_test_data["users"]["testuser1"]
        with pytest.raises(ValueError):
            await user_service.update_profile(
                async_session, user.id, primary_role="invalid_role"
            )


# ---------------------------------------------------------------------------
# add_skill / remove_skill
# ---------------------------------------------------------------------------


class TestAddSkill:
    """Tests for user_service.add_skill."""

    async def test_add_skill_to_user(self, async_session, seed_test_data):
        """Adds a new skill to a user."""
        user = seed_test_data["users"]["testuser2"]  # has only React
        pg_skill = seed_test_data["skills"]["PostgreSQL"]

        await user_service.add_skill(async_session, user.id, pg_skill.id)

        # Verify via get_by_id_with_skills
        refreshed = await user_service.get_by_id_with_skills(async_session, user.id)
        skill_names = {s.name for s in refreshed.skills}
        assert "PostgreSQL" in skill_names

    async def test_add_skill_idempotent(self, async_session, seed_test_data):
        """Adding an already-present skill is a no-op (doesn't raise)."""
        user = seed_test_data["users"]["testuser1"]  # has Python
        python_skill = seed_test_data["skills"]["Python"]

        # Should not raise
        await user_service.add_skill(async_session, user.id, python_skill.id)

        refreshed = await user_service.get_by_id_with_skills(async_session, user.id)
        python_count = sum(1 for s in refreshed.skills if s.name == "Python")
        assert python_count == 1

    async def test_add_nonexistent_skill_raises(self, async_session, seed_test_data):
        """Adding a non-existent skill raises ValueError."""
        user = seed_test_data["users"]["testuser1"]
        with pytest.raises(ValueError, match="not found"):
            await user_service.add_skill(async_session, user.id, "nonexistent_skill_id")


class TestRemoveSkill:
    """Tests for user_service.remove_skill."""

    async def test_remove_skill_from_user(self, async_session, seed_test_data):
        """Removes an existing skill from a user."""
        user = seed_test_data["users"]["testuser1"]  # has Python and React
        python_skill = seed_test_data["skills"]["Python"]

        await user_service.remove_skill(async_session, user.id, python_skill.id)

        refreshed = await user_service.get_by_id_with_skills(async_session, user.id)
        skill_names = {s.name for s in refreshed.skills}
        assert "Python" not in skill_names
        assert "React" in skill_names  # other skill untouched

    async def test_remove_nonexistent_skill_is_noop(self, async_session, seed_test_data):
        """Removing a skill that isn't associated is a no-op (doesn't raise)."""
        user = seed_test_data["users"]["testuser2"]  # has only React
        python_skill = seed_test_data["skills"]["Python"]

        # Should not raise
        await user_service.remove_skill(async_session, user.id, python_skill.id)


# ---------------------------------------------------------------------------
# search
# ---------------------------------------------------------------------------


class TestSearch:
    """Tests for user_service.search."""

    async def test_matches_display_name_substring(self, async_session, seed_test_data):
        """Returns users whose display_name contains the query (case-insensitive)."""
        results = await user_service.search(async_session, "Test User 1")
        usernames = [u.username for u in results]
        assert "testuser1" in usernames
        assert "testuser2" not in usernames
        assert "testuser3" not in usernames

    async def test_matches_username_substring(self, async_session, seed_test_data):
        """Returns users whose username contains the query."""
        results = await user_service.search(async_session, "testuser2")
        assert len(results) == 1
        assert results[0].username == "testuser2"

    async def test_case_insensitive_match(self, async_session, seed_test_data):
        """Search is case-insensitive for both display_name and username."""
        results = await user_service.search(async_session, "TESTUSER1")
        usernames = [u.username for u in results]
        assert "testuser1" in usernames

    async def test_partial_match_returns_multiple(self, async_session, seed_test_data):
        """A broad query matching all seed users returns all of them."""
        results = await user_service.search(async_session, "test")
        assert len(results) == 3

    async def test_empty_query_returns_empty_list(self, async_session, seed_test_data):
        """Empty string returns empty list without hitting the database."""
        results = await user_service.search(async_session, "")
        assert results == []

    async def test_whitespace_query_returns_empty_list(self, async_session, seed_test_data):
        """Whitespace-only query returns empty list."""
        results = await user_service.search(async_session, "   ")
        assert results == []

    async def test_no_match_returns_empty_list(self, async_session, seed_test_data):
        """Query with no matching users returns empty list."""
        results = await user_service.search(async_session, "zzz_no_match_xyz")
        assert results == []

    async def test_excludes_specified_user(self, async_session, seed_test_data):
        """exclude_user_id removes that user from results."""
        user1 = seed_test_data["users"]["testuser1"]
        results = await user_service.search(
            async_session, "test", exclude_user_id=user1.id
        )
        usernames = [u.username for u in results]
        assert "testuser1" not in usernames
        assert "testuser2" in usernames
        assert "testuser3" in usernames

    async def test_no_exclude_returns_all_matches(self, async_session, seed_test_data):
        """Without exclude_user_id, all matching users are returned."""
        results = await user_service.search(async_session, "test")
        assert len(results) == 3

    async def test_limit_caps_results(self, async_session, seed_test_data):
        """limit parameter restricts number of results returned."""
        results = await user_service.search(async_session, "test", limit=2)
        assert len(results) == 2

    async def test_limit_ceiling_at_20(self, async_session, seed_test_data):
        """Limit above 20 is capped to MAX_SEARCH_LIMIT (20)."""
        # With only 3 seed users this just verifies the cap doesn't break anything
        results = await user_service.search(async_session, "test", limit=100)
        assert len(results) == 3  # only 3 users exist

    async def test_results_ordered_alphabetically_by_display_name(
        self, async_session, seed_test_data
    ):
        """Results are ordered by display_name ascending."""
        results = await user_service.search(async_session, "test")
        names = [u.display_name for u in results]
        assert names == sorted(names)

    async def test_returns_user_model_instances(self, async_session, seed_test_data):
        """Returns list of User model instances."""
        results = await user_service.search(async_session, "testuser1")
        assert len(results) == 1
        assert isinstance(results[0], User)
