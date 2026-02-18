"""Tests for TribeType, TribeMemberType, and OpenRoleType GraphQL types."""

from datetime import UTC, datetime

import strawberry

from app.graphql.types.tribe import OpenRoleType, TribeMemberType, TribeType
from app.graphql.types.user import UserType
from app.models.enums import MemberRole, MemberStatus, TribeStatus


def test_tribe_type_exists():
    """Test that TribeType exists and is a Strawberry type."""
    assert TribeType is not None
    assert hasattr(TribeType, "__strawberry_definition__")


def test_tribe_type_has_required_fields():
    """Test that TribeType has all required fields."""
    fields = {
        field.name for field in TribeType.__strawberry_definition__.fields
    }

    # Core fields
    assert "id" in fields
    assert "name" in fields
    assert "mission" in fields
    assert "status" in fields
    assert "max_members" in fields

    # Timestamps
    assert "created_at" in fields
    assert "updated_at" in fields

    # Lazy fields
    assert "owner" in fields
    assert "members" in fields
    assert "open_roles" in fields


def test_tribe_type_field_types():
    """Test that TribeType fields have correct types."""
    field_map = {
        field.name: field for field in TribeType.__strawberry_definition__.fields
    }

    # String fields
    assert field_map["id"].type is str
    assert field_map["name"].type is str

    # Integer fields
    assert field_map["max_members"].type is int

    # Enum fields (wrapped in Strawberry enum definition)
    status_field = field_map["status"]
    assert hasattr(status_field.type, "wrapped_cls")
    assert status_field.type.wrapped_cls is TribeStatus

    # Datetime fields
    assert field_map["created_at"].type is datetime
    assert field_map["updated_at"].type is datetime


def test_tribe_type_optional_fields():
    """Test that optional fields are correctly marked as optional."""
    field_map = {
        field.name: field for field in TribeType.__strawberry_definition__.fields
    }

    # mission field should be optional (Union with None)
    mission_field = field_map["mission"]
    assert hasattr(mission_field.type, "__args__") or mission_field.type.__class__.__name__ == "StrawberryOptional"


def test_tribe_type_owner_field():
    """Test that owner field is a lazy resolver returning UserType."""
    field_map = {
        field.name: field for field in TribeType.__strawberry_definition__.fields
    }

    owner_field = field_map["owner"]
    # Check that owner is a field resolver
    assert owner_field.base_resolver is not None


def test_tribe_type_members_field():
    """Test that members field is a lazy resolver returning list of TribeMemberType."""
    field_map = {
        field.name: field for field in TribeType.__strawberry_definition__.fields
    }

    members_field = field_map["members"]
    # Check that members is a field resolver
    assert members_field.base_resolver is not None


def test_tribe_type_open_roles_field():
    """Test that open_roles field is a lazy resolver returning list of OpenRoleType."""
    field_map = {
        field.name: field for field in TribeType.__strawberry_definition__.fields
    }

    open_roles_field = field_map["open_roles"]
    # Check that open_roles is a field resolver
    assert open_roles_field.base_resolver is not None


def test_tribe_type_instantiation():
    """Test that TribeType can be instantiated with required fields."""
    now = datetime.now(UTC)

    tribe = TribeType(
        id="01HQZXYZ123456789ABCDEFGH",
        name="Hospitality OS",
        mission="Reimagining hotel operations for the AI era.",
        status=TribeStatus.OPEN,
        max_members=8,
        created_at=now,
        updated_at=now,
        _owner=None,
        _members=[],
        _open_roles=[],
    )

    assert tribe.id == "01HQZXYZ123456789ABCDEFGH"
    assert tribe.name == "Hospitality OS"
    assert tribe.mission == "Reimagining hotel operations for the AI era."
    assert tribe.status == TribeStatus.OPEN
    assert tribe.max_members == 8
    assert tribe.created_at == now
    assert tribe.updated_at == now


def test_tribe_type_with_minimal_fields():
    """Test that TribeType can be instantiated with minimal required fields."""
    now = datetime.now(UTC)

    tribe = TribeType(
        id="01HQZXYZ123456789ABCDEFGH",
        name="Minimal Tribe",
        mission=None,
        status=TribeStatus.ACTIVE,
        max_members=5,
        created_at=now,
        updated_at=now,
        _owner=None,
        _members=[],
        _open_roles=[],
    )

    assert tribe.id == "01HQZXYZ123456789ABCDEFGH"
    assert tribe.name == "Minimal Tribe"
    assert tribe.mission is None
    assert tribe.status == TribeStatus.ACTIVE
    assert tribe.max_members == 5


def test_tribe_type_owner_returns_none_when_not_loaded():
    """Test that owner field returns None when no owner is loaded."""
    now = datetime.now(UTC)

    tribe = TribeType(
        id="01HQZXYZ123456789ABCDEFGH",
        name="Test Tribe",
        mission=None,
        status=TribeStatus.OPEN,
        max_members=5,
        created_at=now,
        updated_at=now,
        _owner=None,
        _members=[],
        _open_roles=[],
    )

    # The owner field returns the stored _owner value (None when not loaded)
    assert tribe.owner() is None


def test_tribe_type_members_returns_empty_list():
    """Test that members field returns empty list by default."""
    now = datetime.now(UTC)

    tribe = TribeType(
        id="01HQZXYZ123456789ABCDEFGH",
        name="Test Tribe",
        mission=None,
        status=TribeStatus.OPEN,
        max_members=5,
        created_at=now,
        updated_at=now,
        _owner=None,
        _members=[],
        _open_roles=[],
    )

    # The members field should return an empty list
    members = tribe.members()
    assert members == []


def test_tribe_type_open_roles_returns_empty_list():
    """Test that open_roles field returns empty list by default."""
    now = datetime.now(UTC)

    tribe = TribeType(
        id="01HQZXYZ123456789ABCDEFGH",
        name="Test Tribe",
        mission=None,
        status=TribeStatus.OPEN,
        max_members=5,
        created_at=now,
        updated_at=now,
        _owner=None,
        _members=[],
        _open_roles=[],
    )

    # The open_roles field should return an empty list
    open_roles = tribe.open_roles()
    assert open_roles == []


def test_tribe_member_type_exists():
    """Test that TribeMemberType exists and is a Strawberry type."""
    assert TribeMemberType is not None
    assert hasattr(TribeMemberType, "__strawberry_definition__")


def test_tribe_member_type_has_required_fields():
    """Test that TribeMemberType has all required fields."""
    fields = {
        field.name for field in TribeMemberType.__strawberry_definition__.fields
    }

    assert "user" in fields
    assert "role" in fields
    assert "status" in fields
    assert "joined_at" in fields


def test_tribe_member_type_field_types():
    """Test that TribeMemberType fields have correct types."""
    field_map = {
        field.name: field for field in TribeMemberType.__strawberry_definition__.fields
    }

    # Enum fields (wrapped in Strawberry enum definition)
    role_field = field_map["role"]
    assert hasattr(role_field.type, "wrapped_cls")
    assert role_field.type.wrapped_cls is MemberRole

    status_field = field_map["status"]
    assert hasattr(status_field.type, "wrapped_cls")
    assert status_field.type.wrapped_cls is MemberStatus


def test_tribe_member_type_optional_fields():
    """Test that optional fields in TribeMemberType are correctly marked."""
    field_map = {
        field.name: field for field in TribeMemberType.__strawberry_definition__.fields
    }

    # joined_at field should be optional
    joined_at_field = field_map["joined_at"]
    assert hasattr(joined_at_field.type, "__args__") or joined_at_field.type.__class__.__name__ == "StrawberryOptional"


def test_tribe_member_type_instantiation():
    """Test that TribeMemberType can be instantiated with required fields."""
    now = datetime.now(UTC)

    # Create a UserType instance for the member
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

    member = TribeMemberType(
        user=user,
        role=MemberRole.MEMBER,
        status=MemberStatus.ACTIVE,
        joined_at=now,
    )

    assert member.user == user
    assert member.role == MemberRole.MEMBER
    assert member.status == MemberStatus.ACTIVE
    assert member.joined_at == now


def test_tribe_member_type_with_owner_role():
    """Test TribeMemberType with owner role."""
    now = datetime.now(UTC)

    user = UserType(
        id="01HQZXYZ123456789ABCDEFGH",
        email="owner@example.com",
        username="owner",
        display_name="Tribe Owner",
        avatar_url=None,
        headline=None,
        primary_role=None,
        timezone=None,
        availability_status="open_to_tribe",
        builder_score=50.0,
        bio=None,
        contact_links={},
        preferences={},
        github_username=None,
        onboarding_completed=True,
        agent_tools=[],
        agent_workflow_style=None,
        human_agent_ratio=None,
        created_at=now,
        _skills=[],
        _owned_projects=[],
        _tribes=[],
    )

    member = TribeMemberType(
        user=user,
        role=MemberRole.OWNER,
        status=MemberStatus.ACTIVE,
        joined_at=now,
    )

    assert member.user == user
    assert member.role == MemberRole.OWNER
    assert member.status == MemberStatus.ACTIVE
    assert member.joined_at == now


def test_tribe_member_type_with_pending_status():
    """Test TribeMemberType with pending status (no joined_at)."""
    now = datetime.now(UTC)

    user = UserType(
        id="01HQZXYZ123456789ABCDEFGH",
        email="pending@example.com",
        username="pendinguser",
        display_name="Pending User",
        avatar_url=None,
        headline=None,
        primary_role=None,
        timezone=None,
        availability_status="open_to_tribe",
        builder_score=25.0,
        bio=None,
        contact_links={},
        preferences={},
        github_username=None,
        onboarding_completed=True,
        agent_tools=[],
        agent_workflow_style=None,
        human_agent_ratio=None,
        created_at=now,
        _skills=[],
        _owned_projects=[],
        _tribes=[],
    )

    member = TribeMemberType(
        user=user,
        role=MemberRole.MEMBER,
        status=MemberStatus.PENDING,
        joined_at=None,
    )

    assert member.user == user
    assert member.role == MemberRole.MEMBER
    assert member.status == MemberStatus.PENDING
    assert member.joined_at is None


def test_open_role_type_exists():
    """Test that OpenRoleType exists and is a Strawberry type."""
    assert OpenRoleType is not None
    assert hasattr(OpenRoleType, "__strawberry_definition__")


def test_open_role_type_has_required_fields():
    """Test that OpenRoleType has all required fields."""
    fields = {
        field.name for field in OpenRoleType.__strawberry_definition__.fields
    }

    assert "id" in fields
    assert "title" in fields
    assert "skills_needed" in fields
    assert "filled" in fields


def test_open_role_type_field_types():
    """Test that OpenRoleType fields have correct types."""
    field_map = {
        field.name: field for field in OpenRoleType.__strawberry_definition__.fields
    }

    # String fields
    assert field_map["id"].type is str
    assert field_map["title"].type is str

    # Boolean fields
    assert field_map["filled"].type is bool

    # JSON field
    assert field_map["skills_needed"].type is strawberry.scalars.JSON


def test_open_role_type_instantiation():
    """Test that OpenRoleType can be instantiated with required fields."""
    role = OpenRoleType(
        id="01HQZXYZ123456789ABCDEFGH",
        title="Backend Engineer",
        skills_needed=["Python", "PostgreSQL", "FastAPI"],
        filled=False,
    )

    assert role.id == "01HQZXYZ123456789ABCDEFGH"
    assert role.title == "Backend Engineer"
    assert role.skills_needed == ["Python", "PostgreSQL", "FastAPI"]
    assert role.filled is False


def test_open_role_type_with_empty_skills():
    """Test OpenRoleType with empty skills list."""
    role = OpenRoleType(
        id="01HQZXYZ123456789ABCDEFGH",
        title="Growth Marketer",
        skills_needed=[],
        filled=False,
    )

    assert role.id == "01HQZXYZ123456789ABCDEFGH"
    assert role.title == "Growth Marketer"
    assert role.skills_needed == []
    assert role.filled is False


def test_open_role_type_filled():
    """Test OpenRoleType that is filled."""
    role = OpenRoleType(
        id="01HQZXYZ123456789ABCDEFGH",
        title="Frontend Developer",
        skills_needed=["React", "TypeScript", "Tailwind CSS"],
        filled=True,
    )

    assert role.id == "01HQZXYZ123456789ABCDEFGH"
    assert role.title == "Frontend Developer"
    assert role.skills_needed == ["React", "TypeScript", "Tailwind CSS"]
    assert role.filled is True


def test_all_tribe_status_values():
    """Test TribeType with all possible status values."""
    now = datetime.now(UTC)

    for status in TribeStatus:
        tribe = TribeType(
            id="01HQZXYZ123456789ABCDEFGH",
            name="Test Tribe",
            mission=None,
            status=status,
            max_members=5,
            created_at=now,
            updated_at=now,
            _owner=None,
            _members=[],
            _open_roles=[],
        )
        assert tribe.status == status


def test_all_member_role_values():
    """Test TribeMemberType with all possible role values."""
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
        availability_status="just_browsing",
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

    for role in MemberRole:
        member = TribeMemberType(
            user=user,
            role=role,
            status=MemberStatus.ACTIVE,
            joined_at=now,
        )
        assert member.role == role


def test_all_member_status_values():
    """Test TribeMemberType with all possible status values."""
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
        availability_status="just_browsing",
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

    for status in MemberStatus:
        member = TribeMemberType(
            user=user,
            role=MemberRole.MEMBER,
            status=status,
            joined_at=now if status == MemberStatus.ACTIVE else None,
        )
        assert member.status == status
