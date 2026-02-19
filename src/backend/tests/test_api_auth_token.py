"""Tests for app.api.auth_token — FastAPI dependency for API token authentication."""

import hashlib
import time
from datetime import UTC, datetime, timedelta

import pytest
from fastapi import HTTPException
from fastapi.security import HTTPAuthorizationCredentials

from app.api.auth_token import TOKEN_PREFIX, _token_cache, clear_token_cache, get_api_token_user
from app.models.api_token import ApiToken
from app.models.enums import AvailabilityStatus, UserRole
from app.models.user import User

# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------


def _make_creds(token: str) -> HTTPAuthorizationCredentials:
    return HTTPAuthorizationCredentials(scheme="Bearer", credentials=token)


async def _create_user(session) -> User:
    user = User(
        username="pluginuser",
        display_name="Plugin User",
        email="plugin@example.com",
        primary_role=UserRole.ENGINEER,
        availability_status=AvailabilityStatus.JUST_BROWSING,
        builder_score=0.0,
        contact_links={},
    )
    session.add(user)
    await session.flush()
    return user


async def _create_api_token(
    session,
    user: User,
    raw_token: str,
    *,
    expires_at: datetime | None = None,
    revoked_at: datetime | None = None,
) -> ApiToken:
    token_hash = hashlib.sha256(raw_token.encode()).hexdigest()
    api_token = ApiToken(
        user_id=user.id,
        token_hash=token_hash,
        name="test token",
        expires_at=expires_at,
        revoked_at=revoked_at,
    )
    session.add(api_token)
    await session.commit()
    return api_token


# ---------------------------------------------------------------------------
# Prefix validation
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_invalid_prefix_raises_401(async_session):
    """Tokens that do not start with 'fyt_' are rejected immediately."""
    creds = _make_creds("totally_wrong_prefix_abc123")
    with pytest.raises(HTTPException) as exc_info:
        await get_api_token_user(credentials=creds, session=async_session)
    assert exc_info.value.status_code == 401


@pytest.mark.asyncio
async def test_empty_token_raises_401(async_session):
    """An empty token string is rejected."""
    creds = _make_creds("")
    with pytest.raises(HTTPException) as exc_info:
        await get_api_token_user(credentials=creds, session=async_session)
    assert exc_info.value.status_code == 401


# ---------------------------------------------------------------------------
# DB lookup — invalid / revoked / expired
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_token_not_in_db_raises_401(async_session):
    """A well-formed token that does not exist in the DB raises 401."""
    raw = f"{TOKEN_PREFIX}{'a' * 64}"
    creds = _make_creds(raw)
    with pytest.raises(HTTPException) as exc_info:
        await get_api_token_user(credentials=creds, session=async_session)
    assert exc_info.value.status_code == 401


@pytest.mark.asyncio
async def test_revoked_token_raises_401(async_session):
    """A token with revoked_at set is rejected even if not expired."""
    user = await _create_user(async_session)
    raw = f"{TOKEN_PREFIX}{'b' * 64}"
    await _create_api_token(
        async_session,
        user,
        raw,
        revoked_at=datetime.now(UTC) - timedelta(hours=1),
    )
    creds = _make_creds(raw)
    with pytest.raises(HTTPException) as exc_info:
        await get_api_token_user(credentials=creds, session=async_session)
    assert exc_info.value.status_code == 401


@pytest.mark.asyncio
async def test_expired_token_raises_401(async_session):
    """A token whose expires_at is in the past raises 401."""
    user = await _create_user(async_session)
    raw = f"{TOKEN_PREFIX}{'c' * 64}"
    await _create_api_token(
        async_session,
        user,
        raw,
        expires_at=datetime.now(UTC) - timedelta(days=1),
    )
    creds = _make_creds(raw)
    with pytest.raises(HTTPException) as exc_info:
        await get_api_token_user(credentials=creds, session=async_session)
    assert exc_info.value.status_code == 401


# ---------------------------------------------------------------------------
# Happy path
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_valid_token_returns_user_id(async_session):
    """A valid, non-expired, non-revoked token returns user_id as str."""
    user = await _create_user(async_session)
    raw = f"{TOKEN_PREFIX}{'d' * 64}"
    await _create_api_token(async_session, user, raw)

    creds = _make_creds(raw)
    result = await get_api_token_user(credentials=creds, session=async_session)
    assert result == str(user.id)


@pytest.mark.asyncio
async def test_valid_token_no_expiry_returns_user_id(async_session):
    """A token with no expiry (expires_at=None) is treated as never-expiring."""
    user = await _create_user(async_session)
    raw = f"{TOKEN_PREFIX}{'e' * 64}"
    await _create_api_token(async_session, user, raw, expires_at=None)

    creds = _make_creds(raw)
    result = await get_api_token_user(credentials=creds, session=async_session)
    assert result == str(user.id)


@pytest.mark.asyncio
async def test_valid_token_future_expiry_returns_user_id(async_session):
    """A token with a future expires_at is accepted."""
    user = await _create_user(async_session)
    raw = f"{TOKEN_PREFIX}{'f' * 64}"
    await _create_api_token(
        async_session,
        user,
        raw,
        expires_at=datetime.now(UTC) + timedelta(days=30),
    )

    creds = _make_creds(raw)
    result = await get_api_token_user(credentials=creds, session=async_session)
    assert result == str(user.id)


# ---------------------------------------------------------------------------
# Cache behaviour
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_cache_is_populated_after_valid_auth(async_session):
    """After a successful auth, the token hash is stored in the in-memory cache."""
    _token_cache.clear()

    user = await _create_user(async_session)
    raw = f"{TOKEN_PREFIX}{'0' * 64}"
    await _create_api_token(async_session, user, raw)

    token_hash = hashlib.sha256(raw.encode()).hexdigest()
    assert token_hash not in _token_cache

    creds = _make_creds(raw)
    await get_api_token_user(credentials=creds, session=async_session)

    assert token_hash in _token_cache
    cached_user_id, cached_at = _token_cache[token_hash]
    assert cached_user_id == str(user.id)
    assert time.time() - cached_at < 5


@pytest.mark.asyncio
async def test_cached_token_does_not_hit_db(async_session, monkeypatch):
    """When a valid cache entry exists, the DB is not queried."""
    _token_cache.clear()

    user = await _create_user(async_session)
    raw = f"{TOKEN_PREFIX}{'1' * 64}"
    token_hash = hashlib.sha256(raw.encode()).hexdigest()

    # Pre-populate the cache manually
    _token_cache[token_hash] = (str(user.id), time.time())

    # Patch session.execute to fail if called
    async def _no_db(*_args, **_kwargs):
        raise AssertionError("DB should not be queried for a cached token")

    monkeypatch.setattr(async_session, "execute", _no_db)

    creds = _make_creds(raw)
    result = await get_api_token_user(credentials=creds, session=async_session)
    assert result == str(user.id)


@pytest.mark.asyncio
async def test_expired_cache_entry_triggers_db_lookup(async_session):
    """A cache entry older than TTL is evicted and the DB is queried."""
    _token_cache.clear()

    user = await _create_user(async_session)
    raw = f"{TOKEN_PREFIX}{'2' * 64}"
    await _create_api_token(async_session, user, raw)
    token_hash = hashlib.sha256(raw.encode()).hexdigest()

    # Plant a stale cache entry (cached 400 seconds ago)
    _token_cache[token_hash] = (str(user.id), time.time() - 400)

    creds = _make_creds(raw)
    result = await get_api_token_user(credentials=creds, session=async_session)
    assert result == str(user.id)

    # Cache should now hold a fresh entry
    _, fresh_at = _token_cache[token_hash]
    assert time.time() - fresh_at < 5


# ---------------------------------------------------------------------------
# clear_token_cache
# ---------------------------------------------------------------------------


def test_clear_token_cache_removes_entry():
    """clear_token_cache removes the specified hash from the cache."""
    _token_cache["some_hash"] = ("user_id_123", time.time())
    assert "some_hash" in _token_cache

    clear_token_cache("some_hash")
    assert "some_hash" not in _token_cache


def test_clear_token_cache_missing_key_is_safe():
    """clear_token_cache with a hash not in the cache does not raise."""
    clear_token_cache("nonexistent_hash_xyz")  # Must not raise
