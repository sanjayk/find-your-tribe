"""FastAPI dependency for API token authentication."""

import hashlib
import time
from datetime import UTC, datetime

from fastapi import Depends, HTTPException, Security
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.engine import get_session
from app.models import ApiToken

# In-memory cache: token_hash -> (user_id, cached_at)
_token_cache: dict[str, tuple[str, float]] = {}

TOKEN_CACHE_TTL = 300  # seconds
TOKEN_PREFIX = "fyt_"

_bearer = HTTPBearer()


async def get_api_token_user(
    credentials: HTTPAuthorizationCredentials = Security(_bearer),  # noqa: B008
    session: AsyncSession = Depends(get_session),  # noqa: B008
) -> str:
    """FastAPI dependency that validates a bearer API token and returns user_id.

    Raises HTTP 401 for tokens that are missing the expected prefix, not found,
    revoked, or expired. Uses an in-memory cache with a 300-second TTL to
    reduce database lookups on repeated requests.
    """
    token = credentials.credentials

    if not token.startswith(TOKEN_PREFIX):
        raise HTTPException(status_code=401, detail="Invalid API token")

    token_hash = hashlib.sha256(token.encode()).hexdigest()

    cached = _token_cache.get(token_hash)
    if cached is not None:
        user_id, cached_at = cached
        if time.time() - cached_at < TOKEN_CACHE_TTL:
            return user_id
        del _token_cache[token_hash]

    stmt = select(ApiToken).where(
        ApiToken.token_hash == token_hash,
        ApiToken.revoked_at.is_(None),
    )
    result = await session.execute(stmt)
    api_token = result.scalar_one_or_none()

    if api_token is None:
        raise HTTPException(status_code=401, detail="Invalid or revoked API token")

    if api_token.expires_at is not None and api_token.expires_at < datetime.now(UTC):
        raise HTTPException(status_code=401, detail="API token has expired")

    api_token.last_used_at = datetime.now(UTC)
    await session.commit()

    user_id = str(api_token.user_id)
    _token_cache[token_hash] = (user_id, time.time())

    return user_id


def clear_token_cache(token_hash: str) -> None:
    """Remove a token hash from the in-memory cache.

    Call this after revoking a token so subsequent requests are not
    served from the stale cache entry.
    """
    _token_cache.pop(token_hash, None)
