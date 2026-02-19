"""FastAPI application factory for Find Your Tribe API."""

from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import text
from strawberry.fastapi import GraphQLRouter

from app.api.burn_ingest import router as burn_router
from app.db.engine import engine
from app.graphql.context import context_getter
from app.graphql.schema import schema


@asynccontextmanager
async def lifespan(app: FastAPI):
    """
    Application lifespan context manager.

    Handles startup and shutdown events for the FastAPI application.
    On startup, verifies database connection is working.
    """
    # Startup: Verify database connection
    try:
        async with engine.connect() as conn:
            await conn.execute(text("SELECT 1"))
            print("✓ Database connection verified")
    except Exception as e:
        print(f"✗ Database connection failed: {e}")
        raise

    yield

    # Shutdown: Clean up resources
    await engine.dispose()
    print("✓ Database engine disposed")


# Create FastAPI application
app = FastAPI(
    title="Find Your Tribe API",
    lifespan=lifespan,
)

# Configure CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:3001", "http://localhost:3002"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Create GraphQL router
graphql_router = GraphQLRouter(
    schema=schema,
    context_getter=context_getter,
)

# Mount GraphQL router
app.include_router(graphql_router, prefix="/graphql")

# Mount burn ingest router
app.include_router(burn_router, prefix="/api/burn")
