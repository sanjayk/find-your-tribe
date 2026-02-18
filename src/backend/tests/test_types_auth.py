"""Tests for AuthPayload GraphQL type."""

from datetime import UTC, datetime

from app.graphql.types.auth import AuthPayload
from app.graphql.types.user import UserType
from app.models.enums import AvailabilityStatus


class TestAuthPayload:
    """Tests for the AuthPayload Strawberry type."""

    def test_is_strawberry_type(self):
        """AuthPayload is a valid Strawberry type."""
        assert hasattr(AuthPayload, "__strawberry_definition__")

    def test_has_required_fields(self):
        """AuthPayload has access_token, refresh_token, and user fields."""
        fields = {
            field.name for field in AuthPayload.__strawberry_definition__.fields
        }
        assert "access_token" in fields
        assert "refresh_token" in fields
        assert "user" in fields

    def test_instantiation(self):
        """AuthPayload can be constructed with all required fields."""
        now = datetime.now(UTC)
        user = UserType(
            id="01HQZXYZ123456789ABCDEFGH",
            email="test@example.com",
            username="testuser",
            display_name="Test User",
            avatar_url=None,
            headline=None,
            primary_role=None,
            timezone=None,
            availability_status=AvailabilityStatus.JUST_BROWSING,
            builder_score=0.0,
            bio=None,
            contact_links={},
            preferences={},
            github_username=None,
            onboarding_completed=False,
            agent_tools=[],
            agent_workflow_style=None,
            human_agent_ratio=None,
            created_at=now,
            _skills=[],
            _owned_projects=[],
            _tribes=[],
        )

        payload = AuthPayload(
            access_token="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.test",
            refresh_token="refresh_token_value_here",
            user=user,
        )

        assert payload.access_token == "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.test"
        assert payload.refresh_token == "refresh_token_value_here"
        assert payload.user.username == "testuser"
        assert payload.user.id == "01HQZXYZ123456789ABCDEFGH"

    def test_field_types(self):
        """access_token and refresh_token should be str, user should reference UserType."""
        field_map = {
            field.name: field for field in AuthPayload.__strawberry_definition__.fields
        }
        assert field_map["access_token"].type is str
        assert field_map["refresh_token"].type is str
        # user field type should reference UserType
        user_field = field_map["user"]
        assert user_field.type is UserType
