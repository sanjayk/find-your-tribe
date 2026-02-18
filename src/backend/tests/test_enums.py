"""Tests for enumeration types."""

from enum import Enum

from app.models.enums import (
    AvailabilityStatus,
    CollaboratorStatus,
    EventType,
    MemberRole,
    MemberStatus,
    ProjectStatus,
    SkillCategory,
    TribeStatus,
    UserRole,
)


class TestUserRole:
    """Tests for UserRole enum."""

    def test_inherits_from_str_and_enum(self):
        """UserRole should inherit from str and Enum."""
        assert issubclass(UserRole, str)
        assert issubclass(UserRole, Enum)

    def test_has_all_required_values(self):
        """UserRole should have all specified values."""
        assert UserRole.ENGINEER == "engineer"
        assert UserRole.DESIGNER == "designer"
        assert UserRole.PM == "pm"
        assert UserRole.MARKETER == "marketer"
        assert UserRole.GROWTH == "growth"
        assert UserRole.FOUNDER == "founder"
        assert UserRole.OTHER == "other"

    def test_value_count(self):
        """UserRole should have exactly 7 values."""
        assert len(UserRole) == 7


class TestAvailabilityStatus:
    """Tests for AvailabilityStatus enum."""

    def test_inherits_from_str_and_enum(self):
        """AvailabilityStatus should inherit from str and Enum."""
        assert issubclass(AvailabilityStatus, str)
        assert issubclass(AvailabilityStatus, Enum)

    def test_has_all_required_values(self):
        """AvailabilityStatus should have all specified values."""
        assert AvailabilityStatus.OPEN_TO_TRIBE == "open_to_tribe"
        assert AvailabilityStatus.AVAILABLE_FOR_PROJECTS == "available_for_projects"
        assert AvailabilityStatus.JUST_BROWSING == "just_browsing"

    def test_value_count(self):
        """AvailabilityStatus should have exactly 3 values."""
        assert len(AvailabilityStatus) == 3


class TestProjectStatus:
    """Tests for ProjectStatus enum."""

    def test_inherits_from_str_and_enum(self):
        """ProjectStatus should inherit from str and Enum."""
        assert issubclass(ProjectStatus, str)
        assert issubclass(ProjectStatus, Enum)

    def test_has_all_required_values(self):
        """ProjectStatus should have all specified values."""
        assert ProjectStatus.SHIPPED == "shipped"
        assert ProjectStatus.IN_PROGRESS == "in_progress"
        assert ProjectStatus.ARCHIVED == "archived"

    def test_value_count(self):
        """ProjectStatus should have exactly 3 values."""
        assert len(ProjectStatus) == 3


class TestCollaboratorStatus:
    """Tests for CollaboratorStatus enum."""

    def test_inherits_from_str_and_enum(self):
        """CollaboratorStatus should inherit from str and Enum."""
        assert issubclass(CollaboratorStatus, str)
        assert issubclass(CollaboratorStatus, Enum)

    def test_has_all_required_values(self):
        """CollaboratorStatus should have all specified values."""
        assert CollaboratorStatus.PENDING == "pending"
        assert CollaboratorStatus.CONFIRMED == "confirmed"
        assert CollaboratorStatus.DECLINED == "declined"

    def test_value_count(self):
        """CollaboratorStatus should have exactly 3 values."""
        assert len(CollaboratorStatus) == 3


class TestTribeStatus:
    """Tests for TribeStatus enum."""

    def test_inherits_from_str_and_enum(self):
        """TribeStatus should inherit from str and Enum."""
        assert issubclass(TribeStatus, str)
        assert issubclass(TribeStatus, Enum)

    def test_has_all_required_values(self):
        """TribeStatus should have all specified values."""
        assert TribeStatus.OPEN == "open"
        assert TribeStatus.ACTIVE == "active"
        assert TribeStatus.ALUMNI == "alumni"

    def test_value_count(self):
        """TribeStatus should have exactly 3 values."""
        assert len(TribeStatus) == 3


class TestMemberRole:
    """Tests for MemberRole enum."""

    def test_inherits_from_str_and_enum(self):
        """MemberRole should inherit from str and Enum."""
        assert issubclass(MemberRole, str)
        assert issubclass(MemberRole, Enum)

    def test_has_all_required_values(self):
        """MemberRole should have all specified values."""
        assert MemberRole.OWNER == "owner"
        assert MemberRole.MEMBER == "member"

    def test_value_count(self):
        """MemberRole should have exactly 2 values."""
        assert len(MemberRole) == 2


class TestMemberStatus:
    """Tests for MemberStatus enum."""

    def test_inherits_from_str_and_enum(self):
        """MemberStatus should inherit from str and Enum."""
        assert issubclass(MemberStatus, str)
        assert issubclass(MemberStatus, Enum)

    def test_has_all_required_values(self):
        """MemberStatus should have all specified values."""
        assert MemberStatus.PENDING == "pending"
        assert MemberStatus.ACTIVE == "active"
        assert MemberStatus.REJECTED == "rejected"
        assert MemberStatus.LEFT == "left"
        assert MemberStatus.REMOVED == "removed"

    def test_value_count(self):
        """MemberStatus should have exactly 5 values."""
        assert len(MemberStatus) == 5


class TestEventType:
    """Tests for EventType enum."""

    def test_inherits_from_str_and_enum(self):
        """EventType should inherit from str and Enum."""
        assert issubclass(EventType, str)
        assert issubclass(EventType, Enum)

    def test_has_all_required_values(self):
        """EventType should have all specified values."""
        assert EventType.PROJECT_CREATED == "project_created"
        assert EventType.PROJECT_SHIPPED == "project_shipped"
        assert EventType.COLLABORATION_CONFIRMED == "collaboration_confirmed"
        assert EventType.TRIBE_CREATED == "tribe_created"
        assert EventType.MEMBER_JOINED_TRIBE == "member_joined_tribe"
        assert EventType.BUILDER_JOINED == "builder_joined"
        assert EventType.PROJECT_UPDATE == "project_update"
        assert EventType.TRIBE_ANNOUNCEMENT == "tribe_announcement"

    def test_value_count(self):
        """EventType should have exactly 8 values."""
        assert len(EventType) == 8


class TestSkillCategory:
    """Tests for SkillCategory enum."""

    def test_inherits_from_str_and_enum(self):
        """SkillCategory should inherit from str and Enum."""
        assert issubclass(SkillCategory, str)
        assert issubclass(SkillCategory, Enum)

    def test_has_all_required_values(self):
        """SkillCategory should have all specified values."""
        assert SkillCategory.ENGINEERING == "engineering"
        assert SkillCategory.DESIGN == "design"
        assert SkillCategory.PRODUCT == "product"
        assert SkillCategory.MARKETING == "marketing"
        assert SkillCategory.GROWTH == "growth"
        assert SkillCategory.DATA == "data"
        assert SkillCategory.OPERATIONS == "operations"
        assert SkillCategory.OTHER == "other"

    def test_value_count(self):
        """SkillCategory should have exactly 8 values."""
        assert len(SkillCategory) == 8


class TestEnumStringBehavior:
    """Tests for string behavior of enums."""

    def test_enums_can_be_compared_as_strings(self):
        """Enums should behave as strings in comparisons."""
        assert UserRole.ENGINEER == "engineer"
        assert ProjectStatus.SHIPPED == "shipped"
        assert TribeStatus.ACTIVE == "active"

    def test_enums_can_be_used_in_string_operations(self):
        """Enums should support string operations."""
        assert f"Role: {UserRole.ENGINEER.value}" == "Role: engineer"
        assert UserRole.ENGINEER.value.upper() == "ENGINEER"
        assert UserRole.ENGINEER.value.startswith("eng")

    def test_enum_membership_lookup(self):
        """Enums should support lookup by value."""
        assert UserRole("engineer") == UserRole.ENGINEER
        assert ProjectStatus("shipped") == ProjectStatus.SHIPPED
        assert EventType("project_created") == EventType.PROJECT_CREATED
