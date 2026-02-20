"""Tests for F3 additions to project_service.

Covers the validator helpers, new update() fields, milestones,
invite tokens, get_imported_repo_names, and set_github_metadata.
"""

import pytest
from datetime import UTC, date as date_type, datetime, timedelta

from sqlalchemy import select, update

from app.models.collaborator_invite_token import CollaboratorInviteToken
from app.models.enums import CollaboratorStatus, MilestoneType
from app.models.project import Project
from app.models.project_milestone import ProjectMilestone
from app.services import project_service
from app.services.project_service import (
    _validate_impact_metrics,
    _validate_links,
    _validate_tags,
)
