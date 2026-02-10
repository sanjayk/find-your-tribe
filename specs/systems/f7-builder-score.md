# F7: Builder Score -- Systems Design

**Feature**: Builder Score
**Context**: See [overview.md](./overview.md) for architecture overview, service boundaries, and deployment.
**Source**: Extracted from [SYSTEMS_DESIGN.md](../SYSTEMS_DESIGN.md)

---

## Table of Contents

1. [Overview](#overview)
2. [Database Storage](#database-storage)
3. [Computation Triggers](#computation-triggers)
4. [Caching Strategy](#caching-strategy)
5. [Recalculation Scheduling](#recalculation-scheduling)
6. [Indexing](#indexing)

---

## Overview

The Builder Score is a computed reputation metric based on shipped projects, collaborator vouches,
and impact. It is stored as a cached integer on the `users` table and recalculated asynchronously
when relevant events occur.

---

## Database Storage

The builder score is stored directly on the `users` table:

| Column | Type | Constraints | Notes |
|--------|------|-------------|-------|
| builder_score | INTEGER | DEFAULT 0 | Computed metric, cached |

This is a **denormalized, cached value** -- the authoritative score is computed from the underlying
data (projects, collaborators, impact metrics) and written back to this column.

---

## Computation Triggers

The builder score is recalculated when any of the following events occur:

| Trigger Event | Source | Priority | Notes |
|---------------|--------|----------|-------|
| Collaborator confirmed | `project_collaborators.status` changes to `confirmed` | Medium | Both the project owner and the collaborator may have scores affected |
| Project status change | `projects.status` changes (e.g., to `shipped`) | Medium | Shipping a project is a major score event |
| Profile create/update | User profile is created or key fields change | Low | Initial score calculation on signup |

### Debouncing

Score recalculation is debounced per user to prevent excessive recomputation:
- Maximum 1 recalculation per user per 5 minutes
- If multiple triggers fire within the debounce window, only one recalculation runs after the window closes

---

## Caching Strategy

| What | Where | TTL | Invalidation |
|------|-------|-----|--------------|
| Builder score value | `users.builder_score` column (PostgreSQL) | Indefinite | Recomputed on trigger events |
| User profiles (including score, by ID) | In-memory (per-request DataLoader) | Request lifetime | Automatic |
| User profiles (including score, by username) | Backend in-memory LRU | 5 min | On profile update (including score change) |

The cached score on `users.builder_score` ensures that:
- Score is available without any joins or computation at read time
- Sorting/filtering users by score uses a simple indexed column scan
- The score is always available even if the computation service is temporarily unavailable

---

## Recalculation Scheduling

### Real-Time (Event-Driven)

Score recalculation is triggered as a background task from the service layer:

```python
@router.post("/projects")
async def create_project(data: ProjectInput, background_tasks: BackgroundTasks):
    project = await project_service.create(data)
    background_tasks.add_task(generate_project_embedding, project.id)
    background_tasks.add_task(create_feed_event, "project_created", project)
    return project
```

When a collaborator is confirmed:
```
confirmCollaboration(project_id)
       |
       v
UPDATE project_collaborators SET status='confirmed', confirmed_at=NOW()
       |
       v
Background task: recalculate_builder_score(owner_user_id)
Background task: recalculate_builder_score(collaborator_user_id)
```

### Background Job Details

| Job | Trigger | Priority | Notes |
|-----|---------|----------|-------|
| Recalculate builder score | Collaborator confirmed, project status change | Medium | Debounced per user (max 1 calc/5min) |

V1 uses `FastAPI.BackgroundTasks` for simplicity.

**Future migration path**: When background tasks need reliability guarantees (retry, dead-letter,
monitoring), migrate to Celery + Redis:
```
FastAPI --> Redis (broker) --> Celery Workers --> PostgreSQL
```

---

## Indexing

```sql
-- Builder score sorting (for leaderboard, discovery ranking)
CREATE INDEX idx_users_builder_score ON users (builder_score DESC);
```

This descending index allows efficient queries like:
- "Top builders" leaderboard (ORDER BY builder_score DESC LIMIT N)
- Discovery page sorted by reputation
- Filtering builders above a score threshold
