"""Tests for user_service.search — collaborator typeahead (Task 5)."""

import pytest

from app.models.user import User
from app.services import user_service


class TestSearch:
    """Tests for user_service.search."""

    async def test_search_by_display_name_substring(self, async_session, seed_test_data):
        """Returns users whose display_name contains the query substring."""
        results = await user_service.search(async_session, "Test User 1")
        usernames = [u.username for u in results]
        assert "testuser1" in usernames
        assert "testuser2" not in usernames
        assert "testuser3" not in usernames

    async def test_search_by_username_substring(self, async_session, seed_test_data):
        """Returns users whose username contains the query substring."""
        results = await user_service.search(async_session, "testuser2")
        assert len(results) == 1
        assert results[0].username == "testuser2"

    async def test_search_case_insensitive(self, async_session, seed_test_data):
        """Search matches regardless of case for both display_name and username."""
        upper_results = await user_service.search(async_session, "TESTUSER3")
        lower_results = await user_service.search(async_session, "testuser3")
        assert len(upper_results) == 1
        assert len(lower_results) == 1
        assert upper_results[0].username == lower_results[0].username == "testuser3"

    async def test_search_exclude_user_id_removes_user(self, async_session, seed_test_data):
        """exclude_user_id filters out that specific user from results."""
        user1 = seed_test_data["users"]["testuser1"]
        results = await user_service.search(
            async_session, "test", exclude_user_id=user1.id
        )
        usernames = [u.username for u in results]
        assert "testuser1" not in usernames
        assert "testuser2" in usernames
        assert "testuser3" in usernames

    async def test_search_empty_query_returns_empty_list(self, async_session, seed_test_data):
        """Empty string returns empty list without querying the database."""
        results = await user_service.search(async_session, "")
        assert results == []

    async def test_search_whitespace_only_returns_empty_list(
        self, async_session, seed_test_data
    ):
        """Whitespace-only query returns empty list."""
        results = await user_service.search(async_session, "   ")
        assert results == []

    async def test_search_limit_caps_results(self, async_session, seed_test_data):
        """limit parameter restricts the number of results returned."""
        results = await user_service.search(async_session, "test", limit=2)
        assert len(results) == 2

    async def test_search_limit_above_max_uses_ceiling(self, async_session, seed_test_data):
        """A limit above MAX_SEARCH_LIMIT (20) is silently capped."""
        results = await user_service.search(async_session, "test", limit=100)
        # Only 3 seed users exist, so all 3 are returned
        assert len(results) == 3

    async def test_search_no_match_returns_empty_list(self, async_session, seed_test_data):
        """Query with no matching users returns an empty list."""
        results = await user_service.search(async_session, "zzz_nomatch_xyz")
        assert results == []

    async def test_search_returns_user_instances(self, async_session, seed_test_data):
        """Each element in the results list is a User model instance."""
        results = await user_service.search(async_session, "testuser1")
        assert len(results) == 1
        assert isinstance(results[0], User)

    async def test_search_without_exclude_returns_all_matches(
        self, async_session, seed_test_data
    ):
        """Without exclude_user_id, all matching users are returned."""
        results = await user_service.search(async_session, "test")
        assert len(results) == 3

    async def test_search_partial_match_returns_all_seed_users(
        self, async_session, seed_test_data
    ):
        """A broad partial query matching all seed users returns all three."""
        results = await user_service.search(async_session, "user")
        assert len(results) == 3

    async def test_search_results_ordered_alphabetically(
        self, async_session, seed_test_data
    ):
        """Results are ordered by display_name ascending."""
        results = await user_service.search(async_session, "test")
        names = [u.display_name for u in results]
        assert names == sorted(names)
