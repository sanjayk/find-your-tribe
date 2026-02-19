"""Project resolution service — maps git remote URL hints to FYT project IDs."""

import re
import time

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.project import Project

# TTL for cached resolutions (seconds)
_CACHE_TTL = 600

# In-memory LRU cache: (user_id, project_hint) -> (project_id | None, timestamp)
_resolution_cache: dict[tuple[str, str], tuple[str | None, float]] = {}

# Patterns for extracting owner/repo from git remote URLs
_HTTPS_RE = re.compile(r"^https?://github\.com/([^/]+/[^/]+?)(?:\.git)?/?$")
_SSH_RE = re.compile(r"^git@github\.com:([^/]+/[^/]+?)(?:\.git)?$")
_BARE_RE = re.compile(r"^([A-Za-z0-9._-]+/[A-Za-z0-9._-]+)$")


def _normalize_hint(hint: str) -> str:
    """Extract normalized 'owner/repo' from a git remote URL hint.

    Supported formats:
    - HTTPS: https://github.com/owner/repo(.git)?
    - SSH:   git@github.com:owner/repo(.git)?
    - Bare:  owner/repo
    - Anything else is returned as-is.
    """
    hint = hint.strip()

    match = _HTTPS_RE.match(hint)
    if match:
        return match.group(1)

    match = _SSH_RE.match(hint)
    if match:
        return match.group(1)

    match = _BARE_RE.match(hint)
    if match:
        return match.group(1)

    return hint


async def resolve_project(
    session: AsyncSession,
    user_id: str,
    project_hint: str,
) -> str | None:
    """Map a git remote URL hint to a FYT project ID.

    Algorithm:
    1. Check in-memory cache (600s TTL).
    2. Parse and normalize the hint to 'owner/repo'.
    3. Exact match on github_repo_full_name for the user.
    4. Partial match on just the repo name portion.
    5. Return project_id as str or None.
    """
    cache_key = (user_id, project_hint)
    cached = _resolution_cache.get(cache_key)
    if cached is not None:
        value, ts = cached
        if time.monotonic() - ts < _CACHE_TTL:
            return value
        del _resolution_cache[cache_key]

    normalized = _normalize_hint(project_hint)

    # Exact match
    stmt = (
        select(Project.id)
        .where(Project.owner_id == user_id, Project.github_repo_full_name == normalized)
        .limit(1)
    )
    result = await session.execute(stmt)
    project_id = result.scalar_one_or_none()

    if project_id is None:
        # Partial match on repo name (the part after '/')
        repo_name = normalized.rsplit("/", 1)[-1] if "/" in normalized else normalized
        partial_pattern = f"%/{repo_name}"
        stmt = (
            select(Project.id)
            .where(
                Project.owner_id == user_id,
                Project.github_repo_full_name.ilike(partial_pattern),
            )
            .limit(1)
        )
        result = await session.execute(stmt)
        project_id = result.scalar_one_or_none()

    _resolution_cache[cache_key] = (project_id, time.monotonic())
    return project_id


def invalidate_project_cache(user_id: str) -> None:
    """Remove all cached resolutions for a user.

    Call this when a user's projects are created or updated.
    """
    keys_to_remove = [key for key in _resolution_cache if key[0] == user_id]
    for key in keys_to_remove:
        del _resolution_cache[key]
