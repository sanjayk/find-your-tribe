"""End-to-end auth tests that exercise the real context_getter with real JWTs.

Unlike the mutation tests that override context_getter with dependency_overrides,
these tests send actual Authorization headers through the full HTTP stack to verify
that the context_getter correctly parses JWTs and populates current_user_id.
"""

import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
async def test_signup_then_complete_onboarding_e2e(async_client: AsyncClient):
    """Full flow: signup returns a JWT, onboarding uses it via Authorization header."""
    # Step 1: Sign up — no auth needed
    signup_resp = await async_client.post(
        "/graphql",
        json={
            "query": """
                mutation {
                    auth {
                        signup(
                            email: "e2e@test.com"
                            password: "securepass123"
                            username: "e2euser"
                            displayName: "E2E Tester"
                        ) {
                            accessToken
                            user { id username onboardingCompleted }
                        }
                    }
                }
            """
        },
    )
    signup_data = signup_resp.json()
    assert "errors" not in signup_data, signup_data.get("errors")
    payload = signup_data["data"]["auth"]["signup"]
    access_token = payload["accessToken"]
    assert access_token
    assert payload["user"]["username"] == "e2euser"
    assert payload["user"]["onboardingCompleted"] is False

    # Step 2: Complete onboarding WITH the real JWT in Authorization header
    onboarding_resp = await async_client.post(
        "/graphql",
        headers={"Authorization": f"Bearer {access_token}"},
        json={
            "query": """
                mutation {
                    auth {
                        completeOnboarding(
                            displayName: "E2E Tester"
                            headline: "Testing the full auth flow"
                            primaryRole: "ENGINEER"
                        ) {
                            id
                            username
                            headline
                            onboardingCompleted
                        }
                    }
                }
            """
        },
    )
    onboarding_data = onboarding_resp.json()
    assert "errors" not in onboarding_data, onboarding_data.get("errors")
    user = onboarding_data["data"]["auth"]["completeOnboarding"]
    assert user["username"] == "e2euser"
    assert user["headline"] == "Testing the full auth flow"
    assert user["onboardingCompleted"] is True


@pytest.mark.asyncio
async def test_onboarding_without_token_returns_auth_error(async_client: AsyncClient):
    """Calling an auth-required mutation without a token should fail."""
    resp = await async_client.post(
        "/graphql",
        json={
            "query": """
                mutation {
                    auth {
                        completeOnboarding(displayName: "No Token") {
                            id
                        }
                    }
                }
            """
        },
    )
    data = resp.json()
    assert data.get("data") is None or data["data"]["auth"]["completeOnboarding"] is None
    assert any("auth" in str(e.get("message", "")).lower() for e in data.get("errors", []))


@pytest.mark.asyncio
async def test_onboarding_with_invalid_token_returns_auth_error(async_client: AsyncClient):
    """Calling an auth-required mutation with a garbage token should fail."""
    resp = await async_client.post(
        "/graphql",
        headers={"Authorization": "Bearer not-a-real-jwt"},
        json={
            "query": """
                mutation {
                    auth {
                        completeOnboarding(displayName: "Bad Token") {
                            id
                        }
                    }
                }
            """
        },
    )
    data = resp.json()
    assert data.get("data") is None or data["data"]["auth"]["completeOnboarding"] is None
    assert any("auth" in str(e.get("message", "")).lower() for e in data.get("errors", []))


@pytest.mark.asyncio
async def test_profile_update_with_real_jwt(async_client: AsyncClient):
    """Signup then update profile using real JWT — tests a different mutation namespace."""
    # Signup
    signup_resp = await async_client.post(
        "/graphql",
        json={
            "query": """
                mutation {
                    auth {
                        signup(
                            email: "profile@test.com"
                            password: "securepass123"
                            username: "profileuser"
                            displayName: "Profile Tester"
                        ) {
                            accessToken
                            user { id }
                        }
                    }
                }
            """
        },
    )
    token = signup_resp.json()["data"]["auth"]["signup"]["accessToken"]

    # Update profile with real token
    update_resp = await async_client.post(
        "/graphql",
        headers={"Authorization": f"Bearer {token}"},
        json={
            "query": """
                mutation {
                    profile {
                        updateProfile(headline: "Updated via e2e test") {
                            id
                            headline
                        }
                    }
                }
            """
        },
    )
    data = update_resp.json()
    assert "errors" not in data, data.get("errors")
    assert data["data"]["profile"]["updateProfile"]["headline"] == "Updated via e2e test"
