"""Tests for ProjectType and CollaboratorType GraphQL types."""

from datetime import datetime, timezone

import pytest
import strawberry

from app.graphql.types.project import CollaboratorType, ProjectType
from app.graphql.types.user import UserType
from app.models.enums import CollaboratorStatus, ProjectStatus


def test_project_type_exists():
    """Test that ProjectType exists and is a Strawberry type."""
    assert ProjectType is not None
    assert hasattr(ProjectType, "__strawberry_definition__")


def test_project_type_has_required_fields():
    """Test that ProjectType has all required fields."""
    fields = {
        field.name for field in ProjectType.__strawberry_definition__.fields
    }

    # Core fields
    assert "id" in fields
    assert "title" in fields
    assert "description" in fields
    assert "status" in fields
    assert "role" in fields
    assert "thumbnail_url" in fields

    # JSON fields
    assert "links" in fields
    assert "tech_stack" in fields
    assert "impact_metrics" in fields

    # GitHub fields
    assert "github_repo_full_name" in fields
    assert "github_stars" in fields

    # Timestamps
    assert "created_at" in fields
    assert "updated_at" in fields

    # Lazy fields
    assert "owner" in fields
    assert "collaborators" in fields


def test_project_type_field_types():
    """Test that ProjectType fields have correct types."""
    field_map = {
        field.name: field for field in ProjectType.__strawberry_definition__.fields
    }

    # String fields
    assert field_map["id"].type is str
    assert field_map["title"].type is str

    # Enum fields (wrapped in Strawberry enum definition)
    status_field = field_map["status"]
    assert hasattr(status_field.type, "wrapped_cls")
    assert status_field.type.wrapped_cls is ProjectStatus

    # Datetime fields
    assert field_map["created_at"].type is datetime
    assert field_map["updated_at"].type is datetime


def test_project_type_optional_fields():
    """Test that optional fields are correctly marked as optional."""
    field_map = {
        field.name: field for field in ProjectType.__strawberry_definition__.fields
    }

    # These fields should be optional (Union with None)
    optional_fields = [
        "description",
        "role",
        "thumbnail_url",
        "github_repo_full_name",
        "github_stars",
    ]

    for field_name in optional_fields:
        field = field_map[field_name]
        # Check if the field type is a union with None
        assert hasattr(field.type, "__args__") or field.type.__class__.__name__ == "StrawberryOptional"


def test_project_type_json_fields():
    """Test that JSON fields use strawberry.scalars.JSON."""
    field_map = {
        field.name: field for field in ProjectType.__strawberry_definition__.fields
    }

    json_fields = ["links", "tech_stack", "impact_metrics"]

    for field_name in json_fields:
        field = field_map[field_name]
        # JSON fields should use strawberry.scalars.JSON
        assert field.type is strawberry.scalars.JSON


def test_project_type_owner_field():
    """Test that owner field is a lazy resolver returning UserType."""
    field_map = {
        field.name: field for field in ProjectType.__strawberry_definition__.fields
    }

    owner_field = field_map["owner"]
    # Check that owner is a field resolver
    assert owner_field.base_resolver is not None


def test_project_type_collaborators_field():
    """Test that collaborators field is a lazy resolver returning list of CollaboratorType."""
    field_map = {
        field.name: field for field in ProjectType.__strawberry_definition__.fields
    }

    collaborators_field = field_map["collaborators"]
    # Check that collaborators is a field resolver
    assert collaborators_field.base_resolver is not None


def test_collaborator_type_exists():
    """Test that CollaboratorType exists and is a Strawberry type."""
    assert CollaboratorType is not None
    assert hasattr(CollaboratorType, "__strawberry_definition__")


def test_collaborator_type_has_required_fields():
    """Test that CollaboratorType has all required fields."""
    fields = {
        field.name for field in CollaboratorType.__strawberry_definition__.fields
    }

    assert "user" in fields
    assert "role" in fields
    assert "status" in fields
    assert "invited_at" in fields
    assert "confirmed_at" in fields


def test_collaborator_type_field_types():
    """Test that CollaboratorType fields have correct types."""
    field_map = {
        field.name: field for field in CollaboratorType.__strawberry_definition__.fields
    }

    # Enum field (wrapped in Strawberry enum definition)
    status_field = field_map["status"]
    assert hasattr(status_field.type, "wrapped_cls")
    assert status_field.type.wrapped_cls is CollaboratorStatus

    # Datetime fields
    assert field_map["invited_at"].type is datetime


def test_collaborator_type_optional_fields():
    """Test that optional fields in CollaboratorType are correctly marked."""
    field_map = {
        field.name: field for field in CollaboratorType.__strawberry_definition__.fields
    }

    # These fields should be optional
    optional_fields = ["role", "confirmed_at"]

    for field_name in optional_fields:
        field = field_map[field_name]
        # Check if the field type is a union with None
        assert hasattr(field.type, "__args__") or field.type.__class__.__name__ == "StrawberryOptional"


def test_project_type_instantiation():
    """Test that ProjectType can be instantiated with required fields."""
    now = datetime.now(timezone.utc)

    project = ProjectType(
        id="01HQZXYZ123456789ABCDEFGH",
        title="Test Project",
        description="A test project",
        status=ProjectStatus.IN_PROGRESS,
        role="Full Stack Developer",
        thumbnail_url="https://example.com/thumb.jpg",
        links={"repo": "https://github.com/test/repo"},
        tech_stack=["Python", "React"],
        impact_metrics={"users": 100},
        github_repo_full_name="test/repo",
        github_stars=50,
        created_at=now,
        updated_at=now,
    )

    assert project.id == "01HQZXYZ123456789ABCDEFGH"
    assert project.title == "Test Project"
    assert project.description == "A test project"
    assert project.status == ProjectStatus.IN_PROGRESS
    assert project.role == "Full Stack Developer"
    assert project.thumbnail_url == "https://example.com/thumb.jpg"
    assert project.links == {"repo": "https://github.com/test/repo"}
    assert project.tech_stack == ["Python", "React"]
    assert project.impact_metrics == {"users": 100}
    assert project.github_repo_full_name == "test/repo"
    assert project.github_stars == 50
    assert project.created_at == now
    assert project.updated_at == now


def test_project_type_with_minimal_fields():
    """Test that ProjectType can be instantiated with minimal required fields."""
    now = datetime.now(timezone.utc)

    project = ProjectType(
        id="01HQZXYZ123456789ABCDEFGH",
        title="Minimal Project",
        description=None,
        status=ProjectStatus.SHIPPED,
        role=None,
        thumbnail_url=None,
        links={},
        tech_stack=[],
        impact_metrics={},
        github_repo_full_name=None,
        github_stars=None,
        created_at=now,
        updated_at=now,
    )

    assert project.id == "01HQZXYZ123456789ABCDEFGH"
    assert project.title == "Minimal Project"
    assert project.description is None
    assert project.status == ProjectStatus.SHIPPED
    assert project.role is None
    assert project.thumbnail_url is None
    assert project.links == {}
    assert project.tech_stack == []
    assert project.impact_metrics == {}
    assert project.github_repo_full_name is None
    assert project.github_stars is None


def test_collaborator_type_instantiation():
    """Test that CollaboratorType can be instantiated with required fields."""
    now = datetime.now(timezone.utc)

    # Create a UserType instance for the collaborator
    user = UserType(
        id="01HQZXYZ123456789ABCDEFGH",
        email="test@example.com",
        username="testuser",
        display_name="Test User",
        avatar_url=None,
        headline=None,
        primary_role=None,
        timezone=None,
        availability_status="just_browsing",
        builder_score=0.0,
        bio=None,
        contact_links={},
        github_username=None,
        onboarding_completed=False,
        agent_tools=[],
        agent_workflow_style=None,
        human_agent_ratio=None,
        created_at=now,
    )

    collaborator = CollaboratorType(
        user=user,
        role="Frontend Developer",
        status=CollaboratorStatus.CONFIRMED,
        invited_at=now,
        confirmed_at=now,
    )

    assert collaborator.user == user
    assert collaborator.role == "Frontend Developer"
    assert collaborator.status == CollaboratorStatus.CONFIRMED
    assert collaborator.invited_at == now
    assert collaborator.confirmed_at == now


def test_collaborator_type_with_pending_status():
    """Test CollaboratorType with pending status (no confirmed_at)."""
    now = datetime.now(timezone.utc)

    user = UserType(
        id="01HQZXYZ123456789ABCDEFGH",
        email="test@example.com",
        username="testuser",
        display_name="Test User",
        avatar_url=None,
        headline=None,
        primary_role=None,
        timezone=None,
        availability_status="just_browsing",
        builder_score=0.0,
        bio=None,
        contact_links={},
        github_username=None,
        onboarding_completed=False,
        agent_tools=[],
        agent_workflow_style=None,
        human_agent_ratio=None,
        created_at=now,
    )

    collaborator = CollaboratorType(
        user=user,
        role=None,
        status=CollaboratorStatus.PENDING,
        invited_at=now,
        confirmed_at=None,
    )

    assert collaborator.user == user
    assert collaborator.role is None
    assert collaborator.status == CollaboratorStatus.PENDING
    assert collaborator.invited_at == now
    assert collaborator.confirmed_at is None


def test_project_type_collaborators_returns_empty_list():
    """Test that collaborators field returns empty list by default."""
    now = datetime.now(timezone.utc)

    project = ProjectType(
        id="01HQZXYZ123456789ABCDEFGH",
        title="Test Project",
        description=None,
        status=ProjectStatus.IN_PROGRESS,
        role=None,
        thumbnail_url=None,
        links={},
        tech_stack=[],
        impact_metrics={},
        github_repo_full_name=None,
        github_stars=None,
        created_at=now,
        updated_at=now,
    )

    # The collaborators field should return an empty list
    collaborators = project.collaborators()
    assert collaborators == []


def test_project_type_owner_raises_not_implemented():
    """Test that owner field raises NotImplementedError (placeholder)."""
    now = datetime.now(timezone.utc)

    project = ProjectType(
        id="01HQZXYZ123456789ABCDEFGH",
        title="Test Project",
        description=None,
        status=ProjectStatus.IN_PROGRESS,
        role=None,
        thumbnail_url=None,
        links={},
        tech_stack=[],
        impact_metrics={},
        github_repo_full_name=None,
        github_stars=None,
        created_at=now,
        updated_at=now,
    )

    # The owner field should raise NotImplementedError as it's a placeholder
    with pytest.raises(NotImplementedError, match="Owner loading not yet implemented"):
        project.owner()
