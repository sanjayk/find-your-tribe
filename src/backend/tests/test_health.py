"""Integration test for health query endpoint."""

import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
async def test_health_query(async_client: AsyncClient):
    """
    Test health query via GraphQL endpoint.

    Verifies that:
    - GraphQL endpoint accepts POST requests
    - Health query returns 'ok' status
    - Database connectivity is verified (health query executes SELECT 1)
    """
    # Arrange
    query = """
        query {
            health
        }
    """

    # Act
    response = await async_client.post(
        "/graphql",
        json={"query": query},
    )

    # Assert
    assert response.status_code == 200

    data = response.json()
    assert "data" in data
    assert "health" in data["data"]
    assert data["data"]["health"] == "ok"
