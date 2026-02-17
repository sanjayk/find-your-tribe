"""Seed data for build activities — 52 weeks of daily token burn per user."""

import random
from datetime import date, timedelta

from sqlalchemy import insert
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.build_activity import BuildActivity
from app.models.enums import BuildActivitySource

# Today's anchor date — all activity is generated relative to this
_TODAY = date(2026, 2, 17)
_DAYS_BACK = 365  # 52 weeks


def _date_range() -> list[date]:
    """Return list of all dates from 365 days ago through today."""
    start = _TODAY - timedelta(days=_DAYS_BACK)
    return [start + timedelta(days=i) for i in range(_DAYS_BACK + 1)]


# Per-user activity config: (target_active_days, dominant_source, secondary_sources, avg_tokens, spike_multiplier)
_USER_CONFIG: dict[str, dict] = {
    "mayachen": {
        "target_active_days": 252,
        "dominant_source": BuildActivitySource.ANTHROPIC,
        "secondary_sources": [BuildActivitySource.OPENAI, BuildActivitySource.OTHER],
        "dominant_ratio": 0.65,
        "avg_tokens": 4500,
        "spike_multiplier": 3.5,
        "projects": ["Tribe Finder", "AI Resume Builder", "GraphQL Playground Pro"],
        "project_weights": [0.45, 0.35, 0.20],
    },
    "sarahkim": {
        "target_active_days": 205,
        "dominant_source": BuildActivitySource.ANTHROPIC,
        "secondary_sources": [BuildActivitySource.OPENAI],
        "dominant_ratio": 0.80,
        "avg_tokens": 3800,
        "spike_multiplier": 2.8,
        "projects": ["ML Pipeline Framework", "DataLens", "NeuralSearch"],
        "project_weights": [0.50, 0.30, 0.20],
    },
    "tomnakamura": {
        "target_active_days": 185,
        "dominant_source": BuildActivitySource.ANTHROPIC,
        "secondary_sources": [BuildActivitySource.OPENAI, BuildActivitySource.MANUAL],
        "dominant_ratio": 0.55,
        "avg_tokens": 3200,
        "spike_multiplier": 3.0,
        "projects": ["DevSync", "ShipLog"],
        "project_weights": [0.60, 0.40],
    },
    "priyasharma": {
        "target_active_days": 165,
        "dominant_source": BuildActivitySource.MANUAL,
        "secondary_sources": [BuildActivitySource.ANTHROPIC],
        "dominant_ratio": 0.70,
        "avg_tokens": 2600,
        "spike_multiplier": 2.5,
        "projects": ["go-queue", "MicroMon", "Tribe Finder"],
        "project_weights": [0.55, 0.35, 0.10],
    },
    "marcusjohnson": {
        "target_active_days": 125,
        "dominant_source": BuildActivitySource.ANTHROPIC,
        "secondary_sources": [BuildActivitySource.OTHER],
        "dominant_ratio": 0.75,
        "avg_tokens": 2200,
        "spike_multiplier": 2.2,
        "projects": ["InfraBlocks", "ShipLog"],
        "project_weights": [0.80, 0.20],
    },
    "jamesokafor": {
        "target_active_days": 95,
        "dominant_source": BuildActivitySource.OPENAI,
        "secondary_sources": [BuildActivitySource.MANUAL],
        "dominant_ratio": 0.65,
        "avg_tokens": 1800,
        "spike_multiplier": 2.0,
        "projects": ["Design System Kit"],
        "project_weights": [1.0],
    },
    "davidmorales": {
        "target_active_days": 85,
        "dominant_source": BuildActivitySource.OPENAI,
        "secondary_sources": [BuildActivitySource.MANUAL],
        "dominant_ratio": 0.60,
        "avg_tokens": 1600,
        "spike_multiplier": 2.0,
        "projects": ["Open Source CRM", "Growth Analytics Dashboard"],
        "project_weights": [0.55, 0.45],
    },
    "elenavolkov": {
        "target_active_days": 155,
        "dominant_source": BuildActivitySource.ANTHROPIC,
        "secondary_sources": [BuildActivitySource.OPENAI, BuildActivitySource.MANUAL],
        "dominant_ratio": 0.60,
        "avg_tokens": 2400,
        "spike_multiplier": 2.5,
        "projects": ["DataLens", "Growth Analytics Dashboard"],
        "project_weights": [0.55, 0.45],
    },
    "alexrivera": {
        "target_active_days": 62,
        "dominant_source": BuildActivitySource.OPENAI,
        "secondary_sources": [BuildActivitySource.MANUAL],
        "dominant_ratio": 0.70,
        "avg_tokens": 1400,
        "spike_multiplier": 1.8,
        "projects": ["Open Source CRM"],
        "project_weights": [1.0],
    },
    "aishapatel": {
        "target_active_days": 32,
        "dominant_source": BuildActivitySource.ANTHROPIC,
        "secondary_sources": [BuildActivitySource.MANUAL],
        "dominant_ratio": 0.70,
        "avg_tokens": 900,
        "spike_multiplier": 1.5,
        "projects": [],
        "project_weights": [],
    },
}

# Spike windows: (start_offset_days_ago, end_offset_days_ago) — high activity periods
# Each user has 2-3 spike windows representing project milestones
_USER_SPIKES: dict[str, list[tuple[int, int]]] = {
    "mayachen": [(340, 310), (200, 170), (60, 30)],
    "sarahkim": [(320, 290), (180, 155), (90, 70)],
    "tomnakamura": [(300, 270), (160, 135), (50, 30)],
    "priyasharma": [(280, 255), (140, 115), (40, 20)],
    "marcusjohnson": [(260, 235), (120, 100)],
    "jamesokafor": [(240, 220), (100, 85)],
    "davidmorales": [(220, 200), (80, 65)],
    "elenavolkov": [(200, 175), (130, 110), (45, 25)],
    "alexrivera": [(180, 165), (55, 45)],
    "aishapatel": [(30, 20)],
}


def _is_spike_day(days_ago: int, spikes: list[tuple[int, int]]) -> bool:
    """Return True if this day falls within a spike window."""
    for start, end in spikes:
        if end <= days_ago <= start:
            return True
    return False


def _weekday_factor(d: date) -> float:
    """Return activity probability multiplier based on day of week.

    Weekdays: ~1.2x, Saturday: ~0.7x, Sunday: ~0.5x
    """
    dow = d.weekday()  # 0=Monday, 6=Sunday
    if dow == 6:
        return 0.5
    if dow == 5:
        return 0.7
    return 1.2


def _generate_user_rows(
    username: str,
    user_id: str,
    project_ids: dict[str, str],
    rng: random.Random,
) -> list[dict]:
    """Generate BuildActivity rows for a single user over 365 days."""
    config = _USER_CONFIG[username]
    spikes = _USER_SPIKES.get(username, [])
    all_dates = _date_range()
    target_active = config["target_active_days"]

    # Build per-date activity probability
    # Base probability adjusted so we hit roughly target_active_days
    base_prob = target_active / (len(all_dates) * 0.9)  # 0.9 = average weekday factor
    base_prob = min(base_prob, 0.95)

    rows: list[dict] = []

    for d in all_dates:
        days_ago = (_TODAY - d).days
        weekday_f = _weekday_factor(d)
        is_spike = _is_spike_day(days_ago, spikes)
        spike_boost = 1.8 if is_spike else 1.0

        # Active probability for this day
        active_prob = base_prob * weekday_f * spike_boost
        active_prob = min(active_prob, 0.97)

        if rng.random() > active_prob:
            continue  # no activity today

        # Choose source: dominant or secondary
        sources_for_day: list[BuildActivitySource] = []

        # Primary source always active on active days
        sources_for_day.append(config["dominant_source"])

        # Secondary source: ~25% chance on normal days, ~45% on spike days
        secondary_chance = 0.45 if is_spike else 0.25
        if config["secondary_sources"] and rng.random() < secondary_chance:
            sources_for_day.append(rng.choice(config["secondary_sources"]))

        # Determine token amounts for this day
        spike_mult = config["spike_multiplier"] if is_spike else 1.0
        day_base_tokens = int(config["avg_tokens"] * spike_mult * rng.uniform(0.6, 1.5))
        day_base_tokens = max(500, min(80000, day_base_tokens))

        # Distribute tokens across sources (dominant gets more)
        if len(sources_for_day) == 1:
            token_split = [day_base_tokens]
        else:
            dominant_share = rng.uniform(0.60, 0.80)
            dominant_tokens = int(day_base_tokens * dominant_share)
            secondary_tokens = day_base_tokens - dominant_tokens
            dominant_tokens = max(300, dominant_tokens)
            secondary_tokens = max(200, secondary_tokens)
            token_split = [dominant_tokens, secondary_tokens]

        # Assign tokens to sources
        source_tokens = list(zip(sources_for_day, token_split, strict=False))

        # Pick project for this day (or None for unattributed)
        user_projects = config["projects"]
        project_weights = config["project_weights"]

        for source, tokens in source_tokens:
            # ~15% chance of unattributed session (project_id = None)
            if not user_projects or rng.random() < 0.15:
                project_id = None
            else:
                chosen_title = rng.choices(user_projects, weights=project_weights, k=1)[0]
                project_id = project_ids.get(chosen_title)

            rows.append({
                "user_id": user_id,
                "project_id": project_id,
                "activity_date": d,
                "tokens_burned": tokens,
                "source": source,
            })

    return rows


async def seed_build_activities(
    session: AsyncSession,
    user_ids: dict[str, str],
    project_ids: dict[str, str],
) -> int:
    """
    Seed realistic build activity data for all 10 users.

    Generates 52 weeks of daily token burn records with:
    - Weekday bias (higher activity Mon-Fri)
    - Spike periods around project milestones
    - Natural gaps (rest days, weekends)
    - Multiple AI sources per user (one dominant)
    - Project attribution for most sessions (~85%)

    Args:
        session: Async database session
        user_ids: Mapping of username → ULID string
        project_ids: Mapping of project title → ULID string

    Returns:
        Total number of activity rows inserted
    """
    # Use a fixed seed for reproducibility across runs
    rng = random.Random(42)

    all_rows: list[dict] = []
    for username, user_id in user_ids.items():
        if username not in _USER_CONFIG:
            continue
        user_rows = _generate_user_rows(username, user_id, project_ids, rng)
        all_rows.extend(user_rows)

    if not all_rows:
        return 0

    # Deduplicate: the unique constraint is (user_id, project_id, activity_date, source)
    # project_id=None rows can collide on same (user_id, None, date, source)
    seen: set[tuple] = set()
    deduped_rows: list[dict] = []
    for row in all_rows:
        key = (row["user_id"], row["project_id"], row["activity_date"], row["source"])
        if key not in seen:
            seen.add(key)
            deduped_rows.append(row)

    # Bulk insert for performance
    stmt = insert(BuildActivity).values(deduped_rows)
    await session.execute(stmt)
    await session.commit()

    return len(deduped_rows)
