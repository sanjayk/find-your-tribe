"""Tests for project_service — F3 additions: validation helpers, milestones, GitHub metadata, and invite tokens."""

from datetime import UTC, datetime, timedelta
from datetime import date as date_type

import pytest
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

# ---------------------------------------------------------------------------
# _validate_tags
# ---------------------------------------------------------------------------


def test_validate_tags_valid_input():
    """Valid tag list passes without raising."""
    _validate_tags("domains", ["fintech", "b2b", "saas"])


def test_validate_tags_too_many_items():
    """Exceeding max_items raises ValueError."""
    with pytest.raises(ValueError, match="cannot exceed"):
        _validate_tags("domains", [f"tag{i}" for i in range(21)])


def test_validate_tags_item_too_long():
    """A tag exceeding max_chars raises ValueError."""
    with pytest.raises(ValueError, match="cannot exceed"):
        _validate_tags("domains", ["x" * 51])


def test_validate_tags_exactly_at_max_items_passes():
    """Tags list at exactly max_items does not raise."""
    _validate_tags("domains", [f"t{i}" for i in range(20)])


def test_validate_tags_item_exactly_at_max_chars_passes():
    """A tag at exactly max_chars does not raise."""
    _validate_tags("domains", ["x" * 50])


# ---------------------------------------------------------------------------
# _validate_links
# ---------------------------------------------------------------------------


def test_validate_links_valid_keys():
    """All valid keys with HTTPS values pass without raising."""
    _validate_links({
        "repo": "https://github.com/user/repo",
        "live_url": "https://example.com",
    })


def test_validate_links_invalid_key():
    """An unrecognized link key raises ValueError."""
    with pytest.raises(ValueError, match="Invalid link key"):
        _validate_links({"twitter": "https://twitter.com/user"})


def test_validate_links_non_https_value():
    """A link value using http:// (not https://) raises ValueError."""
    with pytest.raises(ValueError, match="must be an HTTPS URL"):
        _validate_links({"repo": "http://github.com/user/repo"})


def test_validate_links_all_valid_keys_accepted():
    """Every known valid link key accepts an HTTPS value."""
    _validate_links({
        "repo": "https://github.com/user/repo",
        "live_url": "https://example.com",
        "product_hunt": "https://producthunt.com/posts/x",
        "app_store": "https://apps.apple.com/app/x",
        "play_store": "https://play.google.com/store/apps/x",
    })


# ---------------------------------------------------------------------------
# _validate_impact_metrics
# ---------------------------------------------------------------------------


def test_validate_impact_metrics_valid_keys():
    """Valid metric keys with numeric and string values raise no exception."""
    _validate_impact_metrics({"users": 500, "stars": "1.2k", "downloads": 1000})


def test_validate_impact_metrics_invalid_key():
    """An invalid metric key raises ValueError."""
    with pytest.raises(ValueError, match="Invalid metric key"):
        _validate_impact_metrics({"likes": 100})


def test_validate_impact_metrics_all_valid_keys_accepted():
    """Every known metric key passes validation."""
    _validate_impact_metrics({
        "users": 100,
        "stars": 200,
        "downloads": 300,
        "revenue": "10k",
        "forks": 50,
    })


# ---------------------------------------------------------------------------
# update() — new F3 fields: domains, ai_tools, build_style, services
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_update_domains(async_session, seed_test_data):
    """Updating the domains field persists correctly."""
    user = seed_test_data["users"]["testuser1"]
    project = await project_service.create(
        async_session, owner_id=user.id, title="Domains Project"
    )
    updated, _ = await project_service.update(
        async_session,
        project_id=project.id,
        user_id=user.id,
        domains=["fintech", "saas"],
    )
    assert updated.domains == ["fintech", "saas"]


@pytest.mark.asyncio
async def test_update_ai_tools(async_session, seed_test_data):
    """Updating the ai_tools field persists correctly."""
    user = seed_test_data["users"]["testuser1"]
    project = await project_service.create(
        async_session, owner_id=user.id, title="AI Tools Project"
    )
    updated, _ = await project_service.update(
        async_session,
        project_id=project.id,
        user_id=user.id,
        ai_tools=["Claude", "Cursor"],
    )
    assert updated.ai_tools == ["Claude", "Cursor"]


@pytest.mark.asyncio
async def test_update_build_style(async_session, seed_test_data):
    """Updating the build_style field persists correctly."""
    user = seed_test_data["users"]["testuser1"]
    project = await project_service.create(
        async_session, owner_id=user.id, title="Build Style Project"
    )
    updated, _ = await project_service.update(
        async_session,
        project_id=project.id,
        user_id=user.id,
        build_style=["vibe-coded", "pair-programmed"],
    )
    assert updated.build_style == ["vibe-coded", "pair-programmed"]


@pytest.mark.asyncio
async def test_update_services(async_session, seed_test_data):
    """Updating the services field persists correctly."""
    user = seed_test_data["users"]["testuser1"]
    project = await project_service.create(
        async_session, owner_id=user.id, title="Services Project"
    )
    updated, _ = await project_service.update(
        async_session,
        project_id=project.id,
        user_id=user.id,
        services=["Stripe", "Supabase"],
    )
    assert updated.services == ["Stripe", "Supabase"]


@pytest.mark.asyncio
async def test_update_domains_too_many_raises(async_session, seed_test_data):
    """Updating domains with more than 20 items raises ValueError."""
    user = seed_test_data["users"]["testuser1"]
    project = await project_service.create(
        async_session, owner_id=user.id, title="Too Many Domains"
    )
    with pytest.raises(ValueError, match="cannot exceed"):
        await project_service.update(
            async_session,
            project_id=project.id,
            user_id=user.id,
            domains=[f"domain_{i}" for i in range(21)],
        )


# ---------------------------------------------------------------------------
# add_milestone()
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_add_milestone_happy_path(async_session, seed_test_data):
    """Owner can add a milestone with valid fields; returned object is correct."""
    user = seed_test_data["users"]["testuser1"]
    project = await project_service.create(
        async_session, owner_id=user.id, title="Milestone Project"
    )
    today = date_type.today()
    milestone = await project_service.add_milestone(
        async_session,
        project_id=project.id,
        user_id=user.id,
        title="First Deploy",
        date_=today,
        milestone_type="deploy",
    )
    assert milestone.id is not None
    assert milestone.title == "First Deploy"
    assert milestone.date == today
    assert milestone.milestone_type == MilestoneType.DEPLOY


@pytest.mark.asyncio
async def test_add_milestone_owner_only_enforcement(async_session, seed_test_data):
    """Non-owner adding a milestone raises PermissionError."""
    owner = seed_test_data["users"]["testuser1"]
    other = seed_test_data["users"]["testuser2"]
    project = await project_service.create(
        async_session, owner_id=owner.id, title="Protected Milestones"
    )
    with pytest.raises(PermissionError, match="Only the project owner"):
        await project_service.add_milestone(
            async_session,
            project_id=project.id,
            user_id=other.id,
            title="Unauthorized",
            date_=date_type.today(),
        )


@pytest.mark.asyncio
async def test_add_milestone_title_too_long(async_session, seed_test_data):
    """Milestone title exceeding 200 characters raises ValueError."""
    user = seed_test_data["users"]["testuser1"]
    project = await project_service.create(
        async_session, owner_id=user.id, title="Long Title Project"
    )
    with pytest.raises(ValueError, match="Milestone title"):
        await project_service.add_milestone(
            async_session,
            project_id=project.id,
            user_id=user.id,
            title="x" * 201,
            date_=date_type.today(),
        )


@pytest.mark.asyncio
async def test_add_milestone_future_date_rejected(async_session, seed_test_data):
    """A milestone date in the future raises ValueError."""
    user = seed_test_data["users"]["testuser1"]
    project = await project_service.create(
        async_session, owner_id=user.id, title="Future Date Project"
    )
    tomorrow = date_type.today() + timedelta(days=1)
    with pytest.raises(ValueError, match="cannot be in the future"):
        await project_service.add_milestone(
            async_session,
            project_id=project.id,
            user_id=user.id,
            title="Future Milestone",
            date_=tomorrow,
        )


@pytest.mark.asyncio
async def test_add_milestone_invalid_type_rejected(async_session, seed_test_data):
    """An invalid milestone type raises ValueError."""
    user = seed_test_data["users"]["testuser1"]
    project = await project_service.create(
        async_session, owner_id=user.id, title="Bad Type Project"
    )
    with pytest.raises(ValueError, match="Invalid milestone type"):
        await project_service.add_milestone(
            async_session,
            project_id=project.id,
            user_id=user.id,
            title="Bad Type",
            date_=date_type.today(),
            milestone_type="invalid_type",
        )


# ---------------------------------------------------------------------------
# delete_milestone()
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_delete_milestone_happy_path(async_session, seed_test_data):
    """Owner can delete their own milestone; it is removed from the database."""
    user = seed_test_data["users"]["testuser1"]
    project = await project_service.create(
        async_session, owner_id=user.id, title="Delete Milestone Project"
    )
    milestone = await project_service.add_milestone(
        async_session,
        project_id=project.id,
        user_id=user.id,
        title="To Delete",
        date_=date_type.today(),
    )
    await project_service.delete_milestone(
        async_session, milestone_id=milestone.id, user_id=user.id
    )
    deleted = await async_session.get(ProjectMilestone, milestone.id)
    assert deleted is None


@pytest.mark.asyncio
async def test_delete_milestone_not_owner_rejected(async_session, seed_test_data):
    """Non-owner deleting a milestone raises PermissionError."""
    owner = seed_test_data["users"]["testuser1"]
    other = seed_test_data["users"]["testuser2"]
    project = await project_service.create(
        async_session, owner_id=owner.id, title="Protected Milestone Project"
    )
    milestone = await project_service.add_milestone(
        async_session,
        project_id=project.id,
        user_id=owner.id,
        title="Owned Milestone",
        date_=date_type.today(),
    )
    with pytest.raises(PermissionError, match="Only the project owner"):
        await project_service.delete_milestone(
            async_session, milestone_id=milestone.id, user_id=other.id
        )


@pytest.mark.asyncio
async def test_delete_milestone_not_found(async_session, seed_test_data):
    """Deleting a nonexistent milestone raises ValueError."""
    user = seed_test_data["users"]["testuser1"]
    with pytest.raises(ValueError, match="Milestone not found"):
        await project_service.delete_milestone(
            async_session,
            milestone_id="nonexistent_milestone_id",
            user_id=user.id,
        )


# ---------------------------------------------------------------------------
# create_invite_token()
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_create_invite_token_returns_43_char_token(async_session, seed_test_data):
    """create_invite_token returns a 43-character URL-safe base64 token.

    secrets.token_urlsafe(32) produces exactly 43 chars: 32 bytes of randomness
    encoded as base64url without padding.
    """
    owner = seed_test_data["users"]["testuser1"]
    project = await project_service.create(
        async_session, owner_id=owner.id, title="Token Length Project"
    )
    token = await project_service.create_invite_token(
        async_session, project_id=project.id, inviter_id=owner.id
    )
    assert len(token) == 43


@pytest.mark.asyncio
async def test_create_invite_token_db_record_has_30_day_expiry(
    async_session, seed_test_data
):
    """create_invite_token stores a DB record with a 30-day expiry and correct metadata."""
    owner = seed_test_data["users"]["testuser1"]
    project = await project_service.create(
        async_session, owner_id=owner.id, title="Expiry Record Project"
    )
    token = await project_service.create_invite_token(
        async_session, project_id=project.id, inviter_id=owner.id, role="engineer"
    )
    result = await async_session.execute(
        select(CollaboratorInviteToken).where(CollaboratorInviteToken.token == token)
    )
    invite = result.scalar_one_or_none()
    assert invite is not None
    assert invite.project_id == project.id
    assert invite.invited_by == owner.id
    assert invite.role == "engineer"
    assert invite.redeemed_by is None
    now = datetime.now(UTC)
    assert invite.expires_at > now + timedelta(days=29)
    assert invite.expires_at < now + timedelta(days=31)


# ---------------------------------------------------------------------------
# redeem_invite_token()
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_redeem_invite_token_creates_pending_collab(async_session, seed_test_data):
    """Redeeming a valid token creates a PENDING collaboration record."""
    owner = seed_test_data["users"]["testuser1"]
    redeemer = seed_test_data["users"]["testuser2"]
    project = await project_service.create(
        async_session, owner_id=owner.id, title="Redeem Collab Project"
    )
    token = await project_service.create_invite_token(
        async_session, project_id=project.id, inviter_id=owner.id, role="frontend"
    )
    result = await project_service.redeem_invite_token(
        async_session, token=token, user_id=redeemer.id
    )
    assert result["project_id"] == project.id
    assert result["user_id"] == redeemer.id
    assert result["role"] == "frontend"
    assert result["status"] == CollaboratorStatus.PENDING


@pytest.mark.asyncio
async def test_redeem_invite_token_expired_rejected(async_session, seed_test_data):
    """Redeeming an expired token raises ValueError."""
    owner = seed_test_data["users"]["testuser1"]
    redeemer = seed_test_data["users"]["testuser2"]
    project = await project_service.create(
        async_session, owner_id=owner.id, title="Expired Redeem Project"
    )
    token = await project_service.create_invite_token(
        async_session, project_id=project.id, inviter_id=owner.id
    )
    await async_session.execute(
        update(CollaboratorInviteToken)
        .where(CollaboratorInviteToken.token == token)
        .values(expires_at=datetime.now(UTC) - timedelta(days=1))
    )
    await async_session.commit()
    with pytest.raises(ValueError, match="expired"):
        await project_service.redeem_invite_token(
            async_session, token=token, user_id=redeemer.id
        )


@pytest.mark.asyncio
async def test_redeem_invite_token_already_redeemed_rejected(
    async_session, seed_test_data
):
    """Redeeming an already-redeemed token raises ValueError."""
    owner = seed_test_data["users"]["testuser1"]
    redeemer = seed_test_data["users"]["testuser2"]
    third = seed_test_data["users"]["testuser3"]
    project = await project_service.create(
        async_session, owner_id=owner.id, title="Double Redeem Project"
    )
    token = await project_service.create_invite_token(
        async_session, project_id=project.id, inviter_id=owner.id
    )
    await project_service.redeem_invite_token(
        async_session, token=token, user_id=redeemer.id
    )
    with pytest.raises(ValueError, match="already been redeemed"):
        await project_service.redeem_invite_token(
            async_session, token=token, user_id=third.id
        )


@pytest.mark.asyncio
async def test_redeem_invite_token_self_invite_rejected(async_session, seed_test_data):
    """Project owner cannot redeem their own invite token."""
    owner = seed_test_data["users"]["testuser1"]
    project = await project_service.create(
        async_session, owner_id=owner.id, title="Self Redeem Project"
    )
    token = await project_service.create_invite_token(
        async_session, project_id=project.id, inviter_id=owner.id
    )
    with pytest.raises(ValueError, match="owner cannot redeem"):
        await project_service.redeem_invite_token(
            async_session, token=token, user_id=owner.id
        )


@pytest.mark.asyncio
async def test_redeem_invite_token_duplicate_collaborator_rejected(
    async_session, seed_test_data
):
    """Redeeming a token when already a collaborator raises ValueError."""
    owner = seed_test_data["users"]["testuser1"]
    redeemer = seed_test_data["users"]["testuser2"]
    project = await project_service.create(
        async_session, owner_id=owner.id, title="Duplicate Collab Project"
    )
    await project_service.invite_collaborator(
        async_session,
        project_id=project.id,
        user_id=redeemer.id,
        inviter_id=owner.id,
    )
    token = await project_service.create_invite_token(
        async_session, project_id=project.id, inviter_id=owner.id
    )
    with pytest.raises(ValueError, match="already a collaborator"):
        await project_service.redeem_invite_token(
            async_session, token=token, user_id=redeemer.id
        )


# ---------------------------------------------------------------------------
# get_invite_token_info()
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_get_invite_token_info_returns_info_for_valid_token(
    async_session, seed_test_data
):
    """get_invite_token_info returns project and inviter details for a valid token."""
    owner = seed_test_data["users"]["testuser1"]
    project = await project_service.create(
        async_session, owner_id=owner.id, title="Info Token Project"
    )
    token = await project_service.create_invite_token(
        async_session, project_id=project.id, inviter_id=owner.id, role="backend"
    )
    info = await project_service.get_invite_token_info(async_session, token=token)
    assert info is not None
    assert info["project_title"] == "Info Token Project"
    assert info["project_id"] == project.id
    assert info["inviter_name"] == owner.display_name
    assert info["role"] == "backend"
    assert info["expired"] is False


@pytest.mark.asyncio
async def test_get_invite_token_info_none_for_missing_token(async_session):
    """get_invite_token_info returns None for a nonexistent token."""
    result = await project_service.get_invite_token_info(
        async_session, token="no-such-token"
    )
    assert result is None


@pytest.mark.asyncio
async def test_get_invite_token_info_expired_true_for_expired_token(
    async_session, seed_test_data
):
    """get_invite_token_info returns expired=True for an expired token."""
    owner = seed_test_data["users"]["testuser1"]
    project = await project_service.create(
        async_session, owner_id=owner.id, title="Expired Info Project"
    )
    token = await project_service.create_invite_token(
        async_session, project_id=project.id, inviter_id=owner.id
    )
    await async_session.execute(
        update(CollaboratorInviteToken)
        .where(CollaboratorInviteToken.token == token)
        .values(expires_at=datetime.now(UTC) - timedelta(days=1))
    )
    await async_session.commit()
    info = await project_service.get_invite_token_info(async_session, token=token)
    assert info is not None
    assert info["expired"] is True


# ---------------------------------------------------------------------------
# get_pending_invitations()
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_get_pending_invitations_returns_correct_data(
    async_session, seed_test_data
):
    """get_pending_invitations returns the correct invitation fields."""
    owner = seed_test_data["users"]["testuser1"]
    invitee = seed_test_data["users"]["testuser2"]
    project = await project_service.create(
        async_session, owner_id=owner.id, title="Pending Invitations Project"
    )
    await project_service.invite_collaborator(
        async_session,
        project_id=project.id,
        user_id=invitee.id,
        inviter_id=owner.id,
        role="designer",
    )
    invitations = await project_service.get_pending_invitations(
        async_session, user_id=invitee.id
    )
    assert len(invitations) == 1
    inv = invitations[0]
    assert inv["project_id"] == project.id
    assert inv["project_title"] == "Pending Invitations Project"
    assert inv["role"] == "designer"
    assert inv["inviter"].id == owner.id
    assert inv["invited_at"] is not None


@pytest.mark.asyncio
async def test_get_pending_invitations_empty_when_none(async_session, seed_test_data):
    """get_pending_invitations returns empty list when user has no pending invitations."""
    user = seed_test_data["users"]["testuser3"]
    result = await project_service.get_pending_invitations(
        async_session, user_id=user.id
    )
    assert result == []


# ---------------------------------------------------------------------------
# get_imported_repo_names()
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_get_imported_repo_names_returns_set_of_names(
    async_session, seed_test_data
):
    """get_imported_repo_names returns the set of github_repo_full_name values."""
    user = seed_test_data["users"]["testuser1"]
    p1 = await project_service.create(
        async_session, owner_id=user.id, title="Repo Project A"
    )
    p2 = await project_service.create(
        async_session, owner_id=user.id, title="Repo Project B"
    )
    await project_service.set_github_metadata(
        async_session, project_id=p1.id, repo_full_name="user/repo-a", stars=10
    )
    await project_service.set_github_metadata(
        async_session, project_id=p2.id, repo_full_name="user/repo-b", stars=20
    )
    names = await project_service.get_imported_repo_names(
        async_session, user_id=user.id
    )
    assert names == {"user/repo-a", "user/repo-b"}


@pytest.mark.asyncio
async def test_get_imported_repo_names_empty_when_no_github_projects(
    async_session, seed_test_data
):
    """get_imported_repo_names returns empty set when user has no GitHub-linked projects."""
    user = seed_test_data["users"]["testuser2"]
    await project_service.create(
        async_session, owner_id=user.id, title="No GitHub Project"
    )
    names = await project_service.get_imported_repo_names(
        async_session, user_id=user.id
    )
    assert names == set()


@pytest.mark.asyncio
async def test_get_imported_repo_names_excludes_other_users_repos(
    async_session, seed_test_data
):
    """get_imported_repo_names returns only repos owned by the given user."""
    user1 = seed_test_data["users"]["testuser1"]
    user2 = seed_test_data["users"]["testuser2"]
    p1 = await project_service.create(
        async_session, owner_id=user1.id, title="User1 Repo Project"
    )
    p2 = await project_service.create(
        async_session, owner_id=user2.id, title="User2 Repo Project"
    )
    await project_service.set_github_metadata(
        async_session, project_id=p1.id, repo_full_name="user1/my-repo", stars=5
    )
    await project_service.set_github_metadata(
        async_session, project_id=p2.id, repo_full_name="user2/my-repo", stars=5
    )
    names = await project_service.get_imported_repo_names(
        async_session, user_id=user1.id
    )
    assert "user1/my-repo" in names
    assert "user2/my-repo" not in names


# ---------------------------------------------------------------------------
# set_github_metadata()
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_set_github_metadata_updates_github_fields(
    async_session, seed_test_data
):
    """set_github_metadata updates github_repo_full_name and github_stars on the project."""
    user = seed_test_data["users"]["testuser1"]
    project = await project_service.create(
        async_session, owner_id=user.id, title="GitHub Metadata Project"
    )
    assert project.github_repo_full_name is None
    assert project.github_stars is None

    await project_service.set_github_metadata(
        async_session,
        project_id=project.id,
        repo_full_name="user/github-meta-repo",
        stars=42,
    )
    refreshed = await async_session.get(Project, project.id)
    assert refreshed.github_repo_full_name == "user/github-meta-repo"
    assert refreshed.github_stars == 42


@pytest.mark.asyncio
async def test_set_github_metadata_not_found_raises(async_session):
    """set_github_metadata raises ValueError for a nonexistent project."""
    with pytest.raises(ValueError, match="Project not found"):
        await project_service.set_github_metadata(
            async_session,
            project_id="nonexistent_00000000000",
            repo_full_name="x/y",
            stars=0,
        )
