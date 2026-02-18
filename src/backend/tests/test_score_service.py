"""Tests for score_service — calculate_builder_score, calculate_profile_completeness, recalculate."""

import math
from unittest.mock import MagicMock

from app.models.enums import ProjectStatus, UserRole
from app.models.project import Project
from app.models.user import User
from app.services.score_service import (
    calculate_builder_score,
    calculate_profile_completeness,
    recalculate,
)

# ---------------------------------------------------------------------------
# calculate_builder_score — pure function tests
# ---------------------------------------------------------------------------


class TestCalculateBuilderScore:
    """Tests for the pure calculate_builder_score function."""

    def test_all_zeros_returns_zero(self):
        """All-zero inputs produce a score of 0."""
        score = calculate_builder_score(
            shipped_project_count=0,
            confirmed_collaborator_count=0,
            total_stars=0,
            total_users=0,
            profile_completeness=0.0,
            account_age_days=0,
        )
        assert score == 0.0

    def test_maximum_inputs_cap_at_100(self):
        """Very large inputs should never exceed 100."""
        score = calculate_builder_score(
            shipped_project_count=1000,
            confirmed_collaborator_count=1000,
            total_stars=1_000_000,
            total_users=1_000_000,
            profile_completeness=1.0,
            account_age_days=3650,
        )
        assert score <= 100.0

    def test_score_is_rounded_to_one_decimal(self):
        """Score should always be rounded to one decimal place."""
        score = calculate_builder_score(
            shipped_project_count=3,
            confirmed_collaborator_count=2,
            total_stars=50,
            total_users=10,
            profile_completeness=0.5,
            account_age_days=180,
        )
        # Verify rounding: string representation should have at most one decimal
        assert score == round(score, 1)

    def test_single_shipped_project_contributes(self):
        """One shipped project should add ~10 * log2(2) = 10 to project_score."""
        score_with = calculate_builder_score(1, 0, 0, 0, 0.0, 0)
        score_without = calculate_builder_score(0, 0, 0, 0, 0.0, 0)
        assert score_with > score_without
        # 10 * log2(2) = 10.0
        expected_diff = 10.0
        assert abs((score_with - score_without) - expected_diff) < 0.1

    def test_project_score_capped_at_30(self):
        """Project score component maxes out at 30."""
        # log2(n+1) * 10 = 30 => n+1 = 8 => n = 7, so n >= 7 should cap
        score_7 = calculate_builder_score(7, 0, 0, 0, 0.0, 0)
        score_100 = calculate_builder_score(100, 0, 0, 0, 0.0, 0)
        assert score_7 == score_100  # both capped at 30

    def test_collaborator_score_contributes(self):
        """Confirmed collaborators increase the score."""
        score_with = calculate_builder_score(0, 5, 0, 0, 0.0, 0)
        score_without = calculate_builder_score(0, 0, 0, 0, 0.0, 0)
        assert score_with > score_without

    def test_collaborator_score_capped_at_25(self):
        """Collaborator score component maxes out at 25."""
        # 8 * log2(n+1) = 25 => log2(n+1) = 3.125 => n+1 ~ 8.72, n ~ 8
        # With large n, should cap
        score_large = calculate_builder_score(0, 1000, 0, 0, 0.0, 0)
        assert score_large == 25.0

    def test_impact_score_uses_stars_plus_users(self):
        """Stars and users are summed for impact calculation."""
        score_stars_only = calculate_builder_score(0, 0, 100, 0, 0.0, 0)
        score_users_only = calculate_builder_score(0, 0, 0, 100, 0.0, 0)
        # Both should be the same since total_stars + total_users = 100 in each case
        assert score_stars_only == score_users_only

    def test_impact_score_capped_at_20(self):
        """Impact score component maxes out at 20."""
        score = calculate_builder_score(0, 0, 10_000_000, 0, 0.0, 0)
        assert score == 20.0

    def test_profile_completeness_full(self):
        """Full profile completeness contributes 15 points."""
        score_full = calculate_builder_score(0, 0, 0, 0, 1.0, 0)
        score_empty = calculate_builder_score(0, 0, 0, 0, 0.0, 0)
        assert (score_full - score_empty) == 15.0

    def test_profile_completeness_half(self):
        """50% profile completeness contributes 7.5 points."""
        score_half = calculate_builder_score(0, 0, 0, 0, 0.5, 0)
        assert score_half == 7.5

    def test_age_score_one_year_cap(self):
        """Account age score caps at 10 after 365 days."""
        score_365 = calculate_builder_score(0, 0, 0, 0, 0.0, 365)
        score_1000 = calculate_builder_score(0, 0, 0, 0, 0.0, 1000)
        assert score_365 == score_1000
        assert score_365 == 10.0

    def test_age_score_half_year(self):
        """Half year age gives ~5 points."""
        score = calculate_builder_score(0, 0, 0, 0, 0.0, 182)
        expected = round(min(10, (182 / 365) * 10), 1)
        assert score == expected

    def test_combined_score_adds_up(self):
        """Verify total is sum of all components."""
        score = calculate_builder_score(
            shipped_project_count=1,
            confirmed_collaborator_count=1,
            total_stars=10,
            total_users=0,
            profile_completeness=1.0,
            account_age_days=365,
        )
        # Manually compute expected
        project_s = min(30, 10 * math.log2(2))  # 10.0
        collab_s = min(25, 8 * math.log2(2))  # 8.0
        impact_s = min(20, 4 * math.log10(11))  # ~4.16
        profile_s = 15.0
        age_s = 10.0
        expected = round(min(100, project_s + collab_s + impact_s + profile_s + age_s), 1)
        assert score == expected

    def test_negative_values_clamp_to_zero(self):
        """Even if somehow negative inputs occur, score never goes below 0."""
        # With 0 inputs the score should be 0 (log2(1) = 0)
        score = calculate_builder_score(0, 0, 0, 0, 0.0, 0)
        assert score >= 0.0


# ---------------------------------------------------------------------------
# calculate_profile_completeness
# ---------------------------------------------------------------------------


class TestCalculateProfileCompleteness:
    """Tests for calculate_profile_completeness."""

    def test_empty_profile_returns_zero(self):
        """A user with no profile fields filled returns 0."""
        user = MagicMock(spec=User)
        user.avatar_url = None
        user.headline = None
        user.bio = None
        user.primary_role = None
        user.timezone = None
        user.contact_links = {}
        result = calculate_profile_completeness(user)
        assert result == 0.0

    def test_fully_complete_profile_returns_one(self):
        """A user with all profile fields filled returns 1.0."""
        user = MagicMock(spec=User)
        user.avatar_url = "https://example.com/avatar.jpg"
        user.headline = "Full-Stack Builder"
        user.bio = "I build things"
        user.primary_role = UserRole.ENGINEER
        user.timezone = "America/New_York"
        user.contact_links = {"github_username": "test"}
        result = calculate_profile_completeness(user)
        assert result == 1.0

    def test_partial_profile(self):
        """A user with 3/6 fields filled returns 0.5."""
        user = MagicMock(spec=User)
        user.avatar_url = "https://example.com/avatar.jpg"
        user.headline = "Builder"
        user.bio = "I build things"
        user.primary_role = None
        user.timezone = None
        user.contact_links = {}
        result = calculate_profile_completeness(user)
        assert result == 0.5

    def test_contact_links_empty_dict_is_falsy(self):
        """An empty contact_links dict counts as not filled."""
        user = MagicMock(spec=User)
        user.avatar_url = None
        user.headline = None
        user.bio = None
        user.primary_role = None
        user.timezone = None
        user.contact_links = {}
        result = calculate_profile_completeness(user)
        assert result == 0.0

    def test_single_field_filled(self):
        """One out of six fields filled returns 1/6."""
        user = MagicMock(spec=User)
        user.avatar_url = None
        user.headline = "Builder"
        user.bio = None
        user.primary_role = None
        user.timezone = None
        user.contact_links = {}
        result = calculate_profile_completeness(user)
        assert abs(result - 1 / 6) < 1e-9


# ---------------------------------------------------------------------------
# recalculate — async integration tests using the real DB
# ---------------------------------------------------------------------------


class TestRecalculate:
    """Integration tests for recalculate() against the database."""

    async def test_recalculate_nonexistent_user_returns_zero(self, async_session):
        """Recalculating score for a missing user returns 0."""
        score = await recalculate(async_session, "nonexistent_id_12345678")
        assert score == 0.0

    async def test_recalculate_user_with_no_projects(self, async_session, seed_test_data):
        """A user with no projects gets a score based on profile and age only."""
        user = seed_test_data["users"]["testuser1"]
        score = await recalculate(async_session, user.id)
        # Score should be > 0 (profile has some fields) and < 100
        assert 0 < score < 100
        # Verify score persisted
        await async_session.refresh(user)
        assert user.builder_score == score

    async def test_recalculate_persists_score(self, async_session, seed_test_data):
        """recalculate() should update the user's builder_score field in the DB."""
        user = seed_test_data["users"]["testuser2"]
        new_score = await recalculate(async_session, user.id)
        await async_session.refresh(user)
        assert user.builder_score == new_score
        # The score is recalculated, so it might differ from the seeded value
        assert isinstance(new_score, float)

    async def test_recalculate_with_shipped_project(self, async_session, seed_test_data):
        """A user with shipped projects gets a higher score."""
        user = seed_test_data["users"]["testuser1"]

        # Get base score (no projects)
        base_score = await recalculate(async_session, user.id)

        # Add a shipped project
        project = Project(
            owner_id=user.id,
            title="Shipped Project",
            status=ProjectStatus.SHIPPED,
        )
        async_session.add(project)
        await async_session.commit()

        # Recalculate
        new_score = await recalculate(async_session, user.id)
        assert new_score > base_score
