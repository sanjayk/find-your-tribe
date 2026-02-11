"""Database engine and session factory for async SQLAlchemy."""

from collections.abc import AsyncGenerator

from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

from app.config import settings

# Connection pool size constants
POOL_SIZE = 5
MAX_OVERFLOW = 10

# Create async engine with pool configuration
engine = create_async_engine(
    settings.database_url,
    pool_pre_ping=True,  # Verify connections before using them
    pool_size=POOL_SIZE,  # Number of connections to maintain in the pool
    max_overflow=MAX_OVERFLOW,  # Max number of connections that can be created beyond pool_size
    echo=settings.debug,  # Log SQL statements in debug mode
)

# Create session factory with expire_on_commit=False
# This allows accessing model attributes after commit without refetching
async_session_factory = async_sessionmaker(
    engine,
    class_=AsyncSession,
    expire_on_commit=False,  # Don't expire objects after commit
    autoflush=False,  # Manual control over flushing
    autocommit=False,  # Manual control over commits
)


async def get_session() -> AsyncGenerator[AsyncSession, None]:
    """
    Async generator that yields a database session.

    Ensures proper cleanup of the session after use.
    Use as a FastAPI dependency for automatic session management.

    Yields:
        AsyncSession: Database session for executing queries.
    """
    async with async_session_factory() as session:
        try:
            yield session
        finally:
            await session.close()
