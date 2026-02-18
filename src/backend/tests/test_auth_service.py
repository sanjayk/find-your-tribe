"""Tests for auth_service — signup, login, token management, and onboarding."""

import hashlib
from datetime import UTC, datetime, timedelta

import pytest

from app.graphql.helpers import AuthError
from app.models.user import RefreshToken
from app.services import auth_service

# ---------------------------------------------------------------------------
# signup
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_signup_happy_path(async_session):
    """Signup creates user and returns access + refresh tokens."""
    result = await auth_service.signup(
        async_session,
        email="alice@example.com",
        password="securepass123",
        username="alice",
        display_name="Alice A",
    )
    assert result["user"].email == "alice@example.com"
    assert result["user"].username == "alice"
    assert result["user"].display_name == "Alice A"
    assert result["user"].password_hash is not None
    assert result["access_token"]
    assert result["refresh_token"]


@pytest.mark.asyncio
async def test_signup_duplicate_email(async_session):
    """Signup with an already-registered email raises AuthError."""
    await auth_service.signup(
        async_session,
        email="dupe@example.com",
        password="password123",
        username="first_user",
        display_name="First",
    )
    with pytest.raises(AuthError, match="Email already registered"):
        await auth_service.signup(
            async_session,
            email="dupe@example.com",
            password="password123",
            username="second_user",
            display_name="Second",
        )


@pytest.mark.asyncio
async def test_signup_duplicate_username(async_session):
    """Signup with an already-taken username raises AuthError."""
    await auth_service.signup(
        async_session,
        email="user1@example.com",
        password="password123",
        username="samename",
        display_name="User 1",
    )
    with pytest.raises(AuthError, match="Username already taken"):
        await auth_service.signup(
            async_session,
            email="user2@example.com",
            password="password123",
            username="samename",
            display_name="User 2",
        )


@pytest.mark.asyncio
async def test_signup_invalid_email(async_session):
    """Signup with a malformed email raises AuthError."""
    with pytest.raises(AuthError, match="Invalid email format"):
        await auth_service.signup(
            async_session,
            email="not-an-email",
            password="password123",
            username="badmail",
            display_name="Bad Mail",
        )


@pytest.mark.asyncio
async def test_signup_short_password(async_session):
    """Signup with a password shorter than 8 characters raises AuthError."""
    with pytest.raises(AuthError, match="Password must be at least 8 characters"):
        await auth_service.signup(
            async_session,
            email="short@example.com",
            password="abc",
            username="shortpw",
            display_name="Short PW",
        )


# ---------------------------------------------------------------------------
# login
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_login_happy_path(async_session):
    """Login with correct credentials returns user and tokens."""
    await auth_service.signup(
        async_session,
        email="bob@example.com",
        password="correct_password",
        username="bob",
        display_name="Bob B",
    )
    result = await auth_service.login(
        async_session,
        email="bob@example.com",
        password="correct_password",
    )
    assert result["user"].email == "bob@example.com"
    assert result["access_token"]
    assert result["refresh_token"]


@pytest.mark.asyncio
async def test_login_wrong_password(async_session):
    """Login with wrong password raises AuthError."""
    await auth_service.signup(
        async_session,
        email="carol@example.com",
        password="right_password",
        username="carol",
        display_name="Carol C",
    )
    with pytest.raises(AuthError, match="Invalid email or password"):
        await auth_service.login(
            async_session,
            email="carol@example.com",
            password="wrong_password",
        )


@pytest.mark.asyncio
async def test_login_nonexistent_email(async_session):
    """Login with an email that does not exist raises AuthError."""
    with pytest.raises(AuthError, match="Invalid email or password"):
        await auth_service.login(
            async_session,
            email="nobody@example.com",
            password="password123",
        )


# ---------------------------------------------------------------------------
# refresh_token
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_refresh_token_happy_path(async_session):
    """Refresh rotates tokens — old token is revoked, new tokens are issued."""
    signup_result = await auth_service.signup(
        async_session,
        email="dan@example.com",
        password="password123",
        username="dan",
        display_name="Dan D",
    )
    old_refresh = signup_result["refresh_token"]

    new_result = await auth_service.refresh_token(async_session, old_refresh)
    assert new_result["access_token"]
    assert new_result["refresh_token"]
    assert new_result["refresh_token"] != old_refresh


@pytest.mark.asyncio
async def test_refresh_token_invalid(async_session):
    """Refreshing with a completely invalid token raises AuthError."""
    with pytest.raises(AuthError, match="Invalid refresh token"):
        await auth_service.refresh_token(async_session, "totally-bogus-token")


@pytest.mark.asyncio
async def test_refresh_token_expired(async_session):
    """Refreshing with an expired token raises AuthError."""
    signup_result = await auth_service.signup(
        async_session,
        email="expired@example.com",
        password="password123",
        username="expired_user",
        display_name="Expired",
    )
    raw_refresh = signup_result["refresh_token"]

    # Manually expire the token in the database
    token_hash = hashlib.sha256(raw_refresh.encode()).hexdigest()
    from sqlalchemy import select

    stmt = select(RefreshToken).where(RefreshToken.token_hash == token_hash)
    rt = (await async_session.execute(stmt)).scalar_one()
    rt.expires_at = datetime.now(UTC) - timedelta(days=1)
    await async_session.commit()

    with pytest.raises(AuthError, match="Refresh token has expired"):
        await auth_service.refresh_token(async_session, raw_refresh)


@pytest.mark.asyncio
async def test_refresh_token_revoked(async_session):
    """Refreshing with an already-revoked token raises AuthError."""
    signup_result = await auth_service.signup(
        async_session,
        email="revoked@example.com",
        password="password123",
        username="revoked_user",
        display_name="Revoked",
    )
    raw_refresh = signup_result["refresh_token"]

    # Revoke by using it once (the old token gets revoked during rotation)
    await auth_service.refresh_token(async_session, raw_refresh)

    with pytest.raises(AuthError, match="Refresh token has been revoked"):
        await auth_service.refresh_token(async_session, raw_refresh)


# ---------------------------------------------------------------------------
# logout
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_logout_revokes_token(async_session):
    """Logout revokes the refresh token so it cannot be used again."""
    signup_result = await auth_service.signup(
        async_session,
        email="eve@example.com",
        password="password123",
        username="eve",
        display_name="Eve E",
    )
    raw_refresh = signup_result["refresh_token"]

    await auth_service.logout(async_session, raw_refresh)

    with pytest.raises(AuthError, match="Refresh token has been revoked"):
        await auth_service.refresh_token(async_session, raw_refresh)


@pytest.mark.asyncio
async def test_logout_double_logout_is_safe(async_session):
    """Calling logout twice with the same token does not raise."""
    signup_result = await auth_service.signup(
        async_session,
        email="frank@example.com",
        password="password123",
        username="frank",
        display_name="Frank F",
    )
    raw_refresh = signup_result["refresh_token"]

    await auth_service.logout(async_session, raw_refresh)
    # Second logout should be a no-op, not raise
    await auth_service.logout(async_session, raw_refresh)


# ---------------------------------------------------------------------------
# complete_onboarding
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_complete_onboarding_sets_fields(async_session):
    """Onboarding sets display_name, headline, role, and onboarding flag."""
    signup_result = await auth_service.signup(
        async_session,
        email="grace@example.com",
        password="password123",
        username="grace",
        display_name="Grace G",
    )
    user_id = signup_result["user"].id

    updated = await auth_service.complete_onboarding(
        async_session,
        user_id=user_id,
        display_name="Grace Updated",
        headline="Full-Stack Engineer",
        primary_role="engineer",
        timezone_str="America/New_York",
        availability_status="open_to_tribe",
    )
    assert updated.display_name == "Grace Updated"
    assert updated.headline == "Full-Stack Engineer"
    assert updated.primary_role.value == "engineer"
    assert updated.timezone == "America/New_York"
    assert updated.availability_status.value == "open_to_tribe"
    assert updated.onboarding_completed is True


@pytest.mark.asyncio
async def test_complete_onboarding_user_not_found(async_session):
    """Onboarding for a nonexistent user raises AuthError."""
    with pytest.raises(AuthError, match="User not found"):
        await auth_service.complete_onboarding(
            async_session,
            user_id="nonexistent_id_00000000000",
            display_name="Ghost",
        )
