"""Enumerations for the Find Your Tribe application."""

from enum import Enum


class UserRole(str, Enum):
    """Roles that users can have on the platform."""

    ENGINEER = "engineer"
    DESIGNER = "designer"
    PM = "pm"
    MARKETER = "marketer"
    GROWTH = "growth"
    FOUNDER = "founder"
    OTHER = "other"


class AvailabilityStatus(str, Enum):
    """User availability status for collaboration."""

    OPEN_TO_TRIBE = "open_to_tribe"
    AVAILABLE_FOR_PROJECTS = "available_for_projects"
    JUST_BROWSING = "just_browsing"


class ProjectStatus(str, Enum):
    """Status of a project."""

    SHIPPED = "shipped"
    IN_PROGRESS = "in_progress"
    ARCHIVED = "archived"


class CollaboratorStatus(str, Enum):
    """Status of a collaboration invitation."""

    PENDING = "pending"
    CONFIRMED = "confirmed"
    DECLINED = "declined"


class TribeStatus(str, Enum):
    """Status of a tribe."""

    OPEN = "open"
    ACTIVE = "active"
    ALUMNI = "alumni"


class MemberRole(str, Enum):
    """Role of a member within a tribe."""

    OWNER = "owner"
    MEMBER = "member"


class MemberStatus(str, Enum):
    """Status of a tribe membership."""

    PENDING = "pending"
    ACTIVE = "active"
    REJECTED = "rejected"
    LEFT = "left"
    REMOVED = "removed"


class EventType(str, Enum):
    """Types of feed events that can occur."""

    PROJECT_CREATED = "project_created"
    PROJECT_SHIPPED = "project_shipped"
    COLLABORATION_CONFIRMED = "collaboration_confirmed"
    TRIBE_CREATED = "tribe_created"
    MEMBER_JOINED_TRIBE = "member_joined_tribe"
    BUILDER_JOINED = "builder_joined"


class AgentWorkflowStyle(str, Enum):
    """How a builder collaborates with AI agents."""

    PAIR = "pair"
    SWARM = "swarm"
    REVIEW = "review"
    AUTONOMOUS = "autonomous"
    MINIMAL = "minimal"


class SkillCategory(str, Enum):
    """Categories for skills."""

    ENGINEERING = "engineering"
    DESIGN = "design"
    PRODUCT = "product"
    MARKETING = "marketing"
    GROWTH = "growth"
    DATA = "data"
    OPERATIONS = "operations"
    OTHER = "other"
