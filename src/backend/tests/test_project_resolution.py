"""Tests for project resolution service."""

import time

import pytest
from ulid import ULID

from app.models.project import Project
from app.services.project_resolution import (
    _normalize_hint,
    _resolution_cache,
    invalidate_project_cache,
    resolve_project,
)


class TestNormalizeHint:
    """Tests for _normalize_hint URL parsing."""

    def test_https_url(self):
        assert _normalize_hint("https://github.com/owner/repo") == "owner/repo"

    def test_https_url_with_git_suffix(self):
        assert _normalize_hint("https://github.com/owner/repo.git") == "owner/repo"

    def test_https_url_with_trailing_slash(self):
        assert _normalize_hint("https://github.com/owner/repo/") == "owner/repo"

    def test_ssh_url(self):
        assert _normalize_hint("git@github.com:owner/repo") == "owner/repo"

    def test_ssh_url_with_git_suffix(self):
        assert _normalize_hint("git@github.com:owner/repo.git") == "owner/repo"

    def test_bare_owner_repo(self):
        assert _normalize_hint("owner/repo") == "owner/repo"

    def test_bare_with_dots_and_hyphens(self):
        assert _normalize_hint("my-org/my.repo-name") == "my-org/my.repo-name"

    def test_whitespace_stripped(self):
        assert _normalize_hint("  owner/repo  ") == "owner/repo"

    def test_unknown_format_returned_as_is(self):
        assert _normalize_hint("just-a-name") == "just-a-name"

    def test_non_github_url_returned_as_is(self):
        result = _normalize_hint("https://gitlab.com/owner/repo")
        assert result == "https://gitlab.com/owner/repo"

    def test_http_url(self):
        assert _normalize_hint("http://github.com/owner/repo") == "owner/repo"


class TestResolveProject:
    """Tests for resolve_project DB lookups."""

    @pytest.fixture(autouse=True)
    def _clear_cache(self):
        """Clear the resolution cache before and after each test."""
        _resolution_cache.clear()
        yield
        _resolution_cache.clear()

    @pytest.fixture
    async def user_with_project(self, async_session, seed_test_data):
        """Create a project with github_repo_full_name for testuser1."""
        user = seed_test_data["users"]["testuser1"]
        project = Project(
            id=str(ULID()),
            owner_id=user.id,
            title="Test Project",
            github_repo_full_name="testuser1/my-project",
            links={},
            tech_stack=[],
            impact_metrics={},
        )
        async_session.add(project)
        await async_session.commit()
        return {"user": user, "project": project}

    async def test_exact_match_bare(self, async_session, user_with_project):
        data = user_with_project
        result = await resolve_project(
            async_session, data["user"].id, "testuser1/my-project"
        )
        assert result == data["project"].id

    async def test_exact_match_https(self, async_session, user_with_project):
        data = user_with_project
        result = await resolve_project(
            async_session,
            data["user"].id,
            "https://github.com/testuser1/my-project.git",
        )
        assert result == data["project"].id

    async def test_exact_match_ssh(self, async_session, user_with_project):
        data = user_with_project
        result = await resolve_project(
            async_session,
            data["user"].id,
            "git@github.com:testuser1/my-project.git",
        )
        assert result == data["project"].id

    async def test_partial_match_repo_name(self, async_session, user_with_project):
        """When owner differs, fall back to partial match on repo name."""
        data = user_with_project
        result = await resolve_project(
            async_session, data["user"].id, "different-owner/my-project"
        )
        assert result == data["project"].id

    async def test_no_match_returns_none(self, async_session, seed_test_data):
        user = seed_test_data["users"]["testuser1"]
        result = await resolve_project(
            async_session, user.id, "nonexistent/repo"
        )
        assert result is None

    async def test_wrong_user_returns_none(self, async_session, user_with_project, seed_test_data):
        """Projects belong to testuser1 — testuser2 should not find them."""
        other_user = seed_test_data["users"]["testuser2"]
        result = await resolve_project(
            async_session, other_user.id, "testuser1/my-project"
        )
        assert result is None

    async def test_cache_hit(self, async_session, user_with_project):
        data = user_with_project
        hint = "testuser1/my-project"

        # First call populates cache
        result1 = await resolve_project(async_session, data["user"].id, hint)
        assert result1 == data["project"].id

        # Verify cache is populated
        cache_key = (data["user"].id, hint)
        assert cache_key in _resolution_cache

        # Second call should use cache (we can verify by checking the cache entry exists)
        result2 = await resolve_project(async_session, data["user"].id, hint)
        assert result2 == result1

    async def test_cache_expiry(self, async_session, user_with_project):
        data = user_with_project
        hint = "testuser1/my-project"

        # Populate cache
        await resolve_project(async_session, data["user"].id, hint)
        cache_key = (data["user"].id, hint)
        assert cache_key in _resolution_cache

        # Artificially expire the cache entry
        value, _ = _resolution_cache[cache_key]
        _resolution_cache[cache_key] = (value, time.monotonic() - 601)

        # Next call should re-query (stale entry removed)
        result = await resolve_project(async_session, data["user"].id, hint)
        assert result == data["project"].id

    async def test_cache_none_result(self, async_session, seed_test_data):
        """None results should also be cached."""
        user = seed_test_data["users"]["testuser1"]
        hint = "nonexistent/repo"

        result = await resolve_project(async_session, user.id, hint)
        assert result is None
        assert (user.id, hint) in _resolution_cache


class TestInvalidateProjectCache:
    """Tests for invalidate_project_cache."""

    def test_invalidates_user_entries(self):
        _resolution_cache.clear()
        _resolution_cache[("user1", "hint1")] = ("proj1", time.monotonic())
        _resolution_cache[("user1", "hint2")] = ("proj2", time.monotonic())
        _resolution_cache[("user2", "hint1")] = ("proj3", time.monotonic())

        invalidate_project_cache("user1")

        assert ("user1", "hint1") not in _resolution_cache
        assert ("user1", "hint2") not in _resolution_cache
        assert ("user2", "hint1") in _resolution_cache

    def test_no_error_on_empty_cache(self):
        _resolution_cache.clear()
        invalidate_project_cache("nonexistent")  # Should not raise
