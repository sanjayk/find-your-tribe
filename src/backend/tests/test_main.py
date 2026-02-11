"""Tests for FastAPI app factory and configuration."""

import pytest
from fastapi.testclient import TestClient

from app.main import app


def test_app_title():
    """Test that FastAPI app has correct title."""
    assert app.title == "Find Your Tribe API"


def test_graphql_endpoint_exists():
    """Test that GraphQL endpoint is mounted at /graphql."""
    routes = [route.path for route in app.routes]
    # GraphQLRouter creates a route at /graphql
    assert any("/graphql" in route for route in routes)


def test_cors_middleware_configured():
    """Test that CORS middleware is properly configured."""
    # Check that CORSMiddleware is in the middleware stack
    middleware_classes = [m.cls.__name__ for m in app.user_middleware]
    assert "CORSMiddleware" in middleware_classes


@pytest.mark.asyncio
async def test_app_lifespan():
    """Test that app lifespan context manager works."""
    # This test verifies that the lifespan function can be called
    # without errors. The actual database connection is tested separately.
    # We're just checking the structure is valid.
    assert app.router.lifespan_context is not None


def test_app_can_be_imported():
    """Test that the app can be imported and has required attributes."""
    # This verifies the app factory works correctly
    assert app is not None
    assert hasattr(app, "title")
    assert hasattr(app, "router")
    assert hasattr(app, "routes")


@pytest.mark.skipif(
    True, reason="Requires running PostgreSQL database - tested manually with uvicorn"
)
def test_graphql_router_accepts_post():
    """Test that GraphQL endpoint accepts POST requests."""
    with TestClient(app) as client:
        # Simple introspection query to verify GraphQL is working
        response = client.post(
            "/graphql",
            json={"query": "{ __typename }"},
        )
        # Should not return 404 or 405 (method not allowed)
        assert response.status_code in [200, 400]


@pytest.mark.skipif(
    True, reason="Requires running PostgreSQL database - tested manually with uvicorn"
)
def test_graphql_playground_accessible():
    """Test that GraphQL playground is accessible via GET."""
    with TestClient(app) as client:
        response = client.get("/graphql")
        # Strawberry GraphQL router should return the GraphiQL interface
        assert response.status_code == 200
