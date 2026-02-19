"""Project resolution service — maps git remote URLs to FYT project IDs."""

import re
import time

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.project import Project

# HTTPS: https://github.com/owner/repo or https://github.com/owner/repo.git
_HTTPS_RE = re.compile(
    r"^https?://github\.com/(?P<slug>[^/]+/[^/]+?)(?:\.git)?/?$"
)

# SSH: git@github.com:owner/repo or git@github.com:owner/repo.git
_SSH_RE = re.compile(
    r"^git@github\.com:(?P<slug>[^/]+/[^/]+?)(?:\.git)?$"
)

# Bare owner/repo (no protocol, no host)
_BARE_RE = re.compile(r"^(?P<slug>[A-Za-z0-9_.\-]+/[A-Za-z0-9_.\-]+)$")

_CACHE_TTL_SECONDS = 600

# (user_id, project_hint) -> (project_id | None, timestamp)
_resolution_cache: dict[tuple[str, str], tuple[str | None, float]] = {}


def _normalize_hint(hint: str) -> str:
    """Extract 'owner/repo' from various git remote URL formats.

    Returns the normalized slug or the original hint if no pattern matches.
    """
    for pattern in (_HTTPS_RE, _SSH_RE, _BARE_RE):
        m = pattern.match(hint.strip())
        if m:
            return m.group("slug")
    return hint.strip()


async def resolve_project(
    session: AsyncSession,
    user_id: str,
    project_hint: str,
) -> str | None:
    """Map a git remote URL hint to a FYT project ID.

    Algorithm:
      1. Parse hint to normalized 'owner/repo' form.
      2. Exact match on github_repo_full_name for this user.
      3. Partial match on repo-name portion via ILIKE.
      4. Return project.id as str, or None if no match.

    Never raises on no-match.
    """
    cache_key = (user_id, project_hint)
    cached = _resolution_cache.get(cache_key)
    if cached is not None:
        value, ts = cached
        if time.monotonic() - ts < _CACHE_TTL_SECONDS:
            return value

    normalized = _normalize_hint(project_hint)

    # Exact match
    stmt = (
        select(Project.id)
        .where(Project.owner_id == user_id)
        .where(Project.github_repo_full_name == normalized)
        .limit(1)
    )
    result = await session.execute(stmt)
    project_id = result.scalar_one_or_none()

    # Partial match on repo name
    if project_id is None:
        repo_name = normalized.rsplit("/", 1)[-1]
        stmt = (
            select(Project.id)
            .where(Project.owner_id == user_id)
            .where(Project.github_repo_full_name.ilike(f"%/{repo_name}"))
            .limit(1)
        )
        result = await session.execute(stmt)
        project_id = result.scalar_one_or_none()

    project_id_str: str | None = str(project_id) if project_id is not None else None
    _resolution_cache[cache_key] = (project_id_str, time.monotonic())
    return project_id_str


def invalidate_project_cache(user_id: str) -> None:
    """Remove all cached resolutions for a user.

    Call when projects are created or updated.
    """
    keys_to_remove = [k for k in _resolution_cache if k[0] == user_id]
    for k in keys_to_remove:
        del _resolution_cache[k]
