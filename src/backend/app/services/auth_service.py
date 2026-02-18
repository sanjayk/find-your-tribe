"""Auth service — signup, login, token management, and onboarding."""

import hashlib
import re
import secrets
from datetime import UTC, datetime, timedelta

import bcrypt
import jwt
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from ulid import ULID

from app.config import settings
from app.graphql.helpers import AuthError
from app.models.enums import AvailabilityStatus, UserRole
from app.models.user import RefreshToken, User, user_skills

ACCESS_TOKEN_EXPIRE_MINUTES = 15
REFRESH_TOKEN_EXPIRE_DAYS = 7

EMAIL_RE = re.compile(r"^[^@\s]+@[^@\s]+\.[^@\s]+$")


def _create_access_token(user_id: str) -> str:
    """Create a signed JWT access token."""
    payload = {
        "sub": user_id,
        "type": "access",
        "exp": datetime.now(UTC) + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES),
        "iat": datetime.now(UTC),
        "jti": str(ULID()),
    }
    return jwt.encode(payload, settings.secret_key, algorithm=settings.jwt_algorithm)


def _create_refresh_token_pair() -> tuple[str, str]:
    """Generate a refresh token and its SHA-256 hash. Returns (raw_token, hash)."""
    raw = str(ULID()) + secrets.token_urlsafe(32)
    hashed = hashlib.sha256(raw.encode()).hexdigest()
    return raw, hashed


def _hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode(), bcrypt.gensalt(rounds=12)).decode()


def _verify_password(password: str, password_hash: str) -> bool:
    return bcrypt.checkpw(password.encode(), password_hash.encode())


async def _issue_tokens(session: AsyncSession, user: User) -> dict:
    """Create access + refresh tokens and persist the refresh token hash."""
    access_token = _create_access_token(user.id)
    raw_refresh, refresh_hash = _create_refresh_token_pair()

    rt = RefreshToken(
        id=str(ULID()),
        user_id=user.id,
        token_hash=refresh_hash,
        expires_at=datetime.now(UTC) + timedelta(days=REFRESH_TOKEN_EXPIRE_DAYS),
    )
    session.add(rt)

    return {
        "user": user,
        "access_token": access_token,
        "refresh_token": raw_refresh,
    }


async def signup(
    session: AsyncSession,
    email: str,
    password: str,
    username: str,
    display_name: str,
) -> dict:
    """Register a new user and return auth tokens."""
    if not EMAIL_RE.match(email):
        raise AuthError("Invalid email format", code="VALIDATION_ERROR")
    if len(password) < 8:
        raise AuthError("Password must be at least 8 characters", code="VALIDATION_ERROR")

    existing_email = await session.execute(select(User).where(User.email == email))
    if existing_email.scalar_one_or_none():
        raise AuthError("Email already registered", code="CONFLICT")

    existing_username = await session.execute(select(User).where(User.username == username))
    if existing_username.scalar_one_or_none():
        raise AuthError("Username already taken", code="CONFLICT")

    user = User(
        id=str(ULID()),
        email=email,
        password_hash=_hash_password(password),
        username=username,
        display_name=display_name,
    )
    session.add(user)

    result = await _issue_tokens(session, user)
    await session.commit()
    await session.refresh(user)
    return result


async def login(session: AsyncSession, email: str, password: str) -> dict:
    """Authenticate a user by email and password."""
    stmt = select(User).where(User.email == email)
    result = await session.execute(stmt)
    user = result.scalar_one_or_none()

    if not user or not user.password_hash:
        raise AuthError("Invalid email or password", code="INVALID_CREDENTIALS")
    if not _verify_password(password, user.password_hash):
        raise AuthError("Invalid email or password", code="INVALID_CREDENTIALS")

    tokens = await _issue_tokens(session, user)
    await session.commit()
    return tokens


async def refresh_token(session: AsyncSession, token: str) -> dict:
    """Exchange a valid refresh token for a new token pair."""
    token_hash = hashlib.sha256(token.encode()).hexdigest()

    stmt = select(RefreshToken).where(RefreshToken.token_hash == token_hash)
    result = await session.execute(stmt)
    rt = result.scalar_one_or_none()

    if not rt:
        raise AuthError("Invalid refresh token", code="INVALID_TOKEN")
    if rt.revoked_at is not None:
        raise AuthError("Refresh token has been revoked", code="TOKEN_REVOKED")
    if rt.expires_at < datetime.now(UTC):
        raise AuthError("Refresh token has expired", code="TOKEN_EXPIRED")

    rt.revoked_at = datetime.now(UTC)

    user_stmt = select(User).where(User.id == rt.user_id)
    user = (await session.execute(user_stmt)).scalar_one_or_none()
    if not user:
        raise AuthError("User not found", code="NOT_FOUND")

    tokens = await _issue_tokens(session, user)
    await session.commit()
    return tokens


async def logout(session: AsyncSession, token: str) -> None:
    """Revoke a refresh token."""
    token_hash = hashlib.sha256(token.encode()).hexdigest()
    stmt = select(RefreshToken).where(RefreshToken.token_hash == token_hash)
    result = await session.execute(stmt)
    rt = result.scalar_one_or_none()

    if rt and rt.revoked_at is None:
        rt.revoked_at = datetime.now(UTC)
        await session.commit()


async def complete_onboarding(
    session: AsyncSession,
    user_id: str,
    display_name: str,
    headline: str | None = None,
    primary_role: str | None = None,
    timezone_str: str | None = None,
    availability_status: str | None = None,
    skill_ids: list[str] | None = None,
) -> User:
    """Complete user onboarding by updating profile fields and skills."""
    stmt = select(User).where(User.id == user_id)
    user = (await session.execute(stmt)).scalar_one_or_none()
    if not user:
        raise AuthError("User not found", code="NOT_FOUND")

    user.display_name = display_name
    if headline is not None:
        user.headline = headline
    if primary_role is not None:
        try:
            user.primary_role = UserRole(primary_role.lower())
        except ValueError:
            raise AuthError(
                f"Invalid primary role: {primary_role}",
                code="VALIDATION_ERROR",
            ) from None
    if timezone_str is not None:
        user.timezone = timezone_str
    if availability_status is not None:
        try:
            user.availability_status = AvailabilityStatus(availability_status.lower())
        except ValueError:
            raise AuthError(
                f"Invalid availability status: {availability_status}",
                code="VALIDATION_ERROR",
            ) from None

    if skill_ids:
        await session.execute(user_skills.delete().where(user_skills.c.user_id == user_id))
        for skill_id in skill_ids:
            await session.execute(
                user_skills.insert().values(user_id=user_id, skill_id=skill_id)
            )

    user.onboarding_completed = True
    await session.commit()
    await session.refresh(user)
    return user
