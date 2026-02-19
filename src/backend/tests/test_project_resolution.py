"""Tests for project_resolution service — URL parsing, DB matching, caching."""

import time

import pytest

from app.models.project import Project
from app.services.project_resolution import (
    _normalize_hint,
    _resolution_cache,
    invalidate_project_cache,
    resolve_project,
)

# ---------------------------------------------------------------------------
# _normalize_hint — URL parsing
# ---------------------------------------------------------------------------


class TestNormalizeHint:
    """Tests for extracting 'owner/repo' from various git URL formats."""

    def test_https_url(self):
        assert _normalize_hint("https://github.com/owner/repo") == "owner/repo"

    def test_https_url_with_git_suffix(self):
        assert _normalize_hint("https://github.com/owner/repo.git") == "owner/repo"

    def test_https_url_with_trailing_slash(self):
        assert _normalize_hint("https://github.com/owner/repo/") == "owner/repo"

    def test_http_url(self):
        assert _normalize_hint("http://github.com/owner/repo") == "owner/repo"

    def test_ssh_url(self):
        assert _normalize_hint("git@github.com:owner/repo") == "owner/repo"

    def test_ssh_url_with_git_suffix(self):
        assert _normalize_hint("git@github.com:owner/repo.git") == "owner/repo"

    def test_bare_owner_repo(self):
        assert _normalize_hint("owner/repo") == "owner/repo"

    def test_bare_with_dots_and_hyphens(self):
        assert _normalize_hint("my-org/my-repo.js") == "my-org/my-repo.js"

    def test_whitespace_stripped(self):
        assert _normalize_hint("  owner/repo  ") == "owner/repo"

    def test_unknown_format_returned_as_is(self):
        assert _normalize_hint("some-random-string") == "some-random-string"

    def test_non_github_url_returned_as_is(self):
        hint = "https://gitlab.com/owner/repo"
        assert _normalize_hint(hint) == hint


# ---------------------------------------------------------------------------
# resolve_project — DB matching
# ---------------------------------------------------------------------------


@pytest.fixture(autouse=True)
def _clear_cache():
    """Ensure cache is empty before each test."""
    _resolution_cache.clear()
    yield
    _resolution_cache.clear()


@pytest.fixture
async def user_with_project(async_session, seed_test_data):
    """Create a project with github_repo_full_name for testing resolution."""
    user = seed_test_data["users"]["testuser1"]
    project = Project(
        owner_id=user.id,
        title="My CLI Tool",
        github_repo_full_name="acme/cli-tool",
    )
    async_session.add(project)
    await async_session.commit()
    await async_session.refresh(project)
    return {"user": user, "project": project}


@pytest.mark.asyncio
async def test_exact_match_https(async_session, user_with_project):
    """HTTPS URL resolves to exact match on github_repo_full_name."""
    user = user_with_project["user"]
    project = user_with_project["project"]
    result = await resolve_project(
        async_session, user.id, "https://github.com/acme/cli-tool"
    )
    assert result == project.id


@pytest.mark.asyncio
async def test_exact_match_ssh(async_session, user_with_project):
    """SSH URL resolves to exact match on github_repo_full_name."""
    user = user_with_project["user"]
    project = user_with_project["project"]
    result = await resolve_project(
        async_session, user.id, "git@github.com:acme/cli-tool.git"
    )
    assert result == project.id


@pytest.mark.asyncio
async def test_exact_match_bare(async_session, user_with_project):
    """Bare 'owner/repo' resolves to exact match."""
    user = user_with_project["user"]
    project = user_with_project["project"]
    result = await resolve_project(async_session, user.id, "acme/cli-tool")
    assert result == project.id


@pytest.mark.asyncio
async def test_partial_match_on_repo_name(async_session, user_with_project):
    """When exact match fails, falls back to ILIKE on repo name."""
    user = user_with_project["user"]
    project = user_with_project["project"]
    # Different owner, same repo name — exact match won't hit, partial will
    result = await resolve_project(
        async_session, user.id, "https://github.com/other-org/cli-tool"
    )
    assert result == project.id


@pytest.mark.asyncio
async def test_no_match_returns_none(async_session, user_with_project):
    """Returns None when no project matches the hint."""
    user = user_with_project["user"]
    result = await resolve_project(
        async_session, user.id, "https://github.com/acme/nonexistent"
    )
    assert result is None


@pytest.mark.asyncio
async def test_no_match_wrong_user(async_session, user_with_project, seed_test_data):
    """Returns None when project exists but belongs to a different user."""
    other_user = seed_test_data["users"]["testuser2"]
    result = await resolve_project(
        async_session, other_user.id, "acme/cli-tool"
    )
    assert result is None


@pytest.mark.asyncio
async def test_returns_string_type(async_session, user_with_project):
    """resolve_project returns str, not some other type."""
    user = user_with_project["user"]
    result = await resolve_project(async_session, user.id, "acme/cli-tool")
    assert isinstance(result, str)


# ---------------------------------------------------------------------------
# Caching
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_cache_hit(async_session, user_with_project):
    """Second call with same args uses cache (no DB query)."""
    user = user_with_project["user"]
    project = user_with_project["project"]

    # Prime the cache
    result1 = await resolve_project(async_session, user.id, "acme/cli-tool")
    assert result1 == project.id
    assert (user.id, "acme/cli-tool") in _resolution_cache

    # Second call should return same result from cache
    result2 = await resolve_project(async_session, user.id, "acme/cli-tool")
    assert result2 == project.id


@pytest.mark.asyncio
async def test_cache_ttl_expiry(async_session, user_with_project):
    """Cache entry expires after TTL."""
    user = user_with_project["user"]

    await resolve_project(async_session, user.id, "acme/cli-tool")
    cache_key = (user.id, "acme/cli-tool")
    assert cache_key in _resolution_cache

    # Manually backdate the timestamp beyond TTL
    value, _ = _resolution_cache[cache_key]
    _resolution_cache[cache_key] = (value, time.monotonic() - 601)

    # Next call should re-query (cache expired)
    result = await resolve_project(async_session, user.id, "acme/cli-tool")
    assert result is not None
    # Verify the timestamp was refreshed
    _, ts = _resolution_cache[cache_key]
    assert time.monotonic() - ts < 5  # freshly cached


@pytest.mark.asyncio
async def test_cache_stores_none(async_session, user_with_project):
    """Cache stores None results to avoid repeated DB misses."""
    user = user_with_project["user"]
    result = await resolve_project(
        async_session, user.id, "nonexistent/repo"
    )
    assert result is None
    assert (user.id, "nonexistent/repo") in _resolution_cache
    cached_value, _ = _resolution_cache[(user.id, "nonexistent/repo")]
    assert cached_value is None


# ---------------------------------------------------------------------------
# invalidate_project_cache
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_invalidate_clears_user_entries(async_session, user_with_project):
    """invalidate_project_cache removes all cache entries for a user."""
    user = user_with_project["user"]

    # Prime cache with two different hints
    await resolve_project(async_session, user.id, "acme/cli-tool")
    await resolve_project(async_session, user.id, "nonexistent/repo")
    assert len([k for k in _resolution_cache if k[0] == user.id]) == 2

    invalidate_project_cache(user.id)
    assert len([k for k in _resolution_cache if k[0] == user.id]) == 0


def test_invalidate_only_affects_target_user():
    """invalidate_project_cache does not touch other users' entries."""
    _resolution_cache[("user-a", "hint1")] = ("proj-1", time.monotonic())
    _resolution_cache[("user-b", "hint2")] = ("proj-2", time.monotonic())

    invalidate_project_cache("user-a")

    assert ("user-a", "hint1") not in _resolution_cache
    assert ("user-b", "hint2") in _resolution_cache


def test_invalidate_no_error_on_empty_cache():
    """invalidate_project_cache does not raise when cache is empty."""
    _resolution_cache.clear()
    invalidate_project_cache("nonexistent-user")  # should not raise
