# F7: Builder Score — Tech Spec

> See [overview.md](./overview.md) for full architecture context.
> Depends on: [F3 Projects](./f3-projects.md) for project data.

## Algorithm

Builder Score is a computed reputation metric on a 0-100 scale. It's derived from objective, hard-to-fake signals.

### Input Signals

| Signal | Weight | Max Points | Description |
|--------|--------|-----------|-------------|
| Shipped projects | 30% | 30 | Projects with status "shipped" |
| Collaborator vouches | 25% | 25 | Mutual verified collaborations |
| Project impact | 20% | 20 | Stars, users, downloads across projects |
| Profile completeness | 15% | 15 | Filled fields: avatar, headline, bio, skills, links |
| Account age | 10% | 10 | Time on platform (trust signal) |

### Scoring Functions

```python
# backend/services/score_service.py
import math

def calculate_builder_score(
    shipped_project_count: int,
    confirmed_collaborator_count: int,
    total_stars: int,
    total_users: int,
    profile_completeness: float,  # 0.0 - 1.0
    account_age_days: int,
) -> float:
    """Calculate builder score on 0-100 scale."""

    # 1. Shipped projects (diminishing returns via log)
    # 1 project = 10, 3 = 20, 10 = 30
    project_score = min(30, 10 * math.log2(shipped_project_count + 1))

    # 2. Collaborator vouches (diminishing returns)
    # 1 collab = 8, 3 = 16, 8 = 25
    collab_score = min(25, 8 * math.log2(confirmed_collaborator_count + 1))

    # 3. Project impact (combined from all projects)
    # Log scale to prevent whales from dominating
    impact_raw = math.log10(total_stars + total_users + 1)
    impact_score = min(20, impact_raw * 4)

    # 4. Profile completeness (linear)
    profile_score = profile_completeness * 15

    # 5. Account age (caps at 1 year)
    age_score = min(10, (account_age_days / 365) * 10)

    total = project_score + collab_score + impact_score + profile_score + age_score
    return round(min(100, max(0, total)), 1)


def calculate_profile_completeness(user: User) -> float:
    """Calculate what fraction of the profile is filled out."""
    fields = {
        "avatar_url": bool(user.avatar_url),
        "headline": bool(user.headline),
        "bio": bool(user.bio),
        "primary_role": bool(user.primary_role),
        "timezone": bool(user.timezone),
        "skills": len(user.skills) >= 3,
        "contact_links": bool(user.contact_links),
        "projects": len(user.projects) >= 1,
    }
    return sum(fields.values()) / len(fields)
```

### Anti-Gaming Measures

1. **Logarithmic scaling** — Diminishing returns prevent score inflation from bulk-creating empty projects.
2. **Mutual verification** — Collaborator score requires the other person to confirm. Can't self-certify.
3. **Quality over quantity** — Impact metrics (stars, users) reward real usage, not just existence.
4. **Profile completeness caps at 15%** — Can't reach a high score just by filling out your profile.
5. **No activity rewards** — No points for logging in, posting, or browsing. Only for building.

### Score Distribution Target

- New user with completed profile, 0 projects: ~15
- Active builder with 2 shipped projects, 1 collaborator: ~40
- Experienced builder with 5 projects, 3 collaborators, moderate impact: ~65
- Top builder with 10+ projects, many collaborators, significant impact: ~85+
- Score of 100 should be extremely rare (top 0.1% of builders)

## Recalculation Triggers

| Trigger | Action |
|---------|--------|
| Project created or status changed | Recalculate owner's score |
| Collaborator confirmed | Recalculate both users' scores |
| Profile updated | Recalculate user's score |
| Impact metrics updated | Recalculate owner's score |

```python
# backend/services/score_service.py
async def recalculate_builder_score(user_id: str):
    """Recalculate and update a user's builder score."""
    user = await get_user_with_details(user_id)

    # Gather signals
    shipped_count = len([p for p in user.projects if p.status == "shipped"])
    collab_count = len([c for c in user.collaborators if c.status == "confirmed"])
    total_stars = sum(p.github_stars or 0 for p in user.projects)
    total_users = sum((p.impact_metrics or {}).get("users", 0) for p in user.projects)
    completeness = calculate_profile_completeness(user)
    age_days = (datetime.utcnow() - user.created_at).days

    score = calculate_builder_score(
        shipped_count, collab_count, total_stars, total_users, completeness, age_days
    )

    await update_user_score(user_id, score)
```

## Debouncing

Score recalculation is debounced: max 1 recalculation per user per 5 minutes. If multiple triggers fire within the window, only the last one runs.

```python
# Simple in-memory debounce (sufficient for V1 single-instance)
_score_recalc_times: dict[str, datetime] = {}
DEBOUNCE_SECONDS = 300

async def maybe_recalculate_score(user_id: str):
    last = _score_recalc_times.get(user_id)
    if last and (datetime.utcnow() - last).total_seconds() < DEBOUNCE_SECONDS:
        return  # Skip, too recent
    _score_recalc_times[user_id] = datetime.utcnow()
    await recalculate_builder_score(user_id)
```

## GraphQL

Builder Score is a field on `UserType` (defined in F2). It's read directly from the `users.builder_score` column — no computation at query time.

```python
@strawberry.type
class UserType:
    builder_score: float  # 0-100, pre-computed
```

## Transparency

The score formula should be publicly documented in the app's "About" or "How it works" page. Transparency discourages gaming and builds trust.

Frontend page: `/about/builder-score` — explains each signal, its weight, and the diminishing returns curve.
