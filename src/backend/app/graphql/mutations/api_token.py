"""API token mutations — create, revoke, and list API tokens."""

import hashlib
import secrets
from datetime import UTC, datetime

import strawberry
from sqlalchemy import select
from strawberry.types import Info

from app.graphql.context import Context
from app.graphql.helpers import require_auth
from app.models.api_token import ApiToken


@strawberry.type
class ApiTokenInfo:
    """API token metadata — never exposes the token hash."""

    id: strawberry.ID
    name: str
    last_used_at: datetime | None
    created_at: datetime
    expires_at: datetime | None


@strawberry.type
class CreateApiTokenResult:
    """Result of creating an API token — plaintext token shown exactly once."""

    id: strawberry.ID
    name: str
    token: str  # fyt_ + 64 hex chars, only returned at creation time


@strawberry.type
class ApiTokenMutations:
    """API token management mutations."""

    @strawberry.mutation
    async def create_api_token(
        self,
        info: Info[Context, None],
        name: str,
    ) -> CreateApiTokenResult:
        """Create a new API token for the authenticated user.

        Returns the plaintext token once — it cannot be retrieved again.
        """
        user_id = require_auth(info)
        session = info.context.session

        raw_token = f"fyt_{secrets.token_hex(32)}"
        token_hash = hashlib.sha256(raw_token.encode()).hexdigest()

        api_token = ApiToken(
            user_id=user_id,
            token_hash=token_hash,
            name=name,
        )
        session.add(api_token)
        await session.commit()

        return CreateApiTokenResult(
            id=strawberry.ID(api_token.id),
            name=api_token.name,
            token=raw_token,
        )

    @strawberry.mutation
    async def revoke_api_token(
        self,
        info: Info[Context, None],
        token_id: strawberry.ID,
    ) -> bool:
        """Revoke an API token. Returns False if not found or not owned by the caller."""
        user_id = require_auth(info)
        session = info.context.session

        stmt = select(ApiToken).where(ApiToken.id == str(token_id))
        result = await session.execute(stmt)
        api_token = result.scalar_one_or_none()

        if api_token is None or api_token.user_id != user_id:
            return False

        api_token.revoked_at = datetime.now(UTC)

        from app.api.auth_token import clear_token_cache

        clear_token_cache(api_token.token_hash)
        await session.commit()
        return True


async def resolve_my_api_tokens(
    info: Info[Context, None],
) -> list[ApiTokenInfo]:
    """Return non-revoked API tokens for the authenticated user, newest first."""
    user_id = require_auth(info)
    session = info.context.session

    stmt = (
        select(ApiToken)
        .where(ApiToken.user_id == user_id, ApiToken.revoked_at.is_(None))
        .order_by(ApiToken.created_at.desc())
    )
    result = await session.execute(stmt)
    tokens = result.scalars().all()

    return [
        ApiTokenInfo(
            id=strawberry.ID(t.id),
            name=t.name,
            last_used_at=t.last_used_at,
            created_at=t.created_at,
            expires_at=t.expires_at,
        )
        for t in tokens
    ]
