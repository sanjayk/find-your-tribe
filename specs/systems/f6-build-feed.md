# F6: Build Feed -- Systems Design

**Feature**: Build Feed
**Context**: See [overview.md](./overview.md) for architecture overview, service boundaries, and deployment.
**Source**: Extracted from [SYSTEMS_DESIGN.md](../SYSTEMS_DESIGN.md)

---

## Table of Contents

1. [Database Table: feed_events](#database-table-feed_events)
2. [Event Types and Generation Strategy](#event-types-and-generation-strategy)
3. [Feed Event Generation Flow](#feed-event-generation-flow)
4. [Cursor-Based Pagination](#cursor-based-pagination)
5. [Feed Query Optimization](#feed-query-optimization)
6. [Indexing Strategy](#indexing-strategy)
7. [Caching Strategy](#caching-strategy)
8. [GraphQL Schema](#graphql-schema)
9. [Apollo Client Cache Merge](#apollo-client-cache-merge)

---

## Database Table: feed_events

| Column | Type | Constraints | Notes |
|--------|------|-------------|-------|
| id | UUID | PK, DEFAULT gen_random_uuid() | |
| event_type | VARCHAR(30) | NOT NULL | See enum below |
| actor_id | UUID | FK -> users(id) ON DELETE CASCADE, NOT NULL | Who triggered the event |
| target_type | VARCHAR(20) | NOT NULL | 'project', 'tribe', 'user' |
| target_id | UUID | NOT NULL | Polymorphic FK |
| metadata | JSONB | DEFAULT '{}' | Event-specific data |
| created_at | TIMESTAMPTZ | DEFAULT NOW() | |

**Event types**: `project_shipped`, `project_created`, `tribe_formed`, `tribe_open`, `member_joined_tribe`, `builder_joined`, `project_milestone`

---

## Event Types and Generation Strategy

### Event Type Definitions

| Event Type | Trigger | target_type | target_id | actor_id |
|------------|---------|-------------|-----------|----------|
| `project_shipped` | Project status changed to 'shipped' | project | project.id | project.owner_id |
| `project_created` | New project created | project | project.id | project.owner_id |
| `tribe_formed` | New tribe created | tribe | tribe.id | tribe.owner_id |
| `tribe_open` | Tribe status changed to 'open' | tribe | tribe.id | tribe.owner_id |
| `member_joined_tribe` | Member approved (status -> 'active') | tribe | tribe.id | member.user_id |
| `builder_joined` | New user registered | user | user.id | user.id |
| `project_milestone` | Manual milestone event | project | project.id | project.owner_id |

### Metadata Examples

**`project_shipped`**:
```json
{
  "project_title": "AI Resume Builder",
  "tech_stack": ["Next.js", "Python", "Claude API"],
  "collaborator_count": 3
}
```

**`tribe_open`**:
```json
{
  "tribe_name": "Fintech Builders",
  "open_roles": ["React Native Developer", "Growth Marketer"],
  "member_count": 3
}
```

**`builder_joined`**:
```json
{
  "display_name": "Jane Doe",
  "primary_role": "designer",
  "headline": "Product designer shipping AI tools"
}
```

---

## Feed Event Generation Flow

```
[Any state-changing action]
         |
         v
   Service Layer
         |
         | (within the same transaction as the primary action)
         v
   INSERT INTO feed_events (
     event_type,
     actor_id,
     target_type,
     target_id,
     metadata
   )
```

Feed events are created **synchronously** within the same database transaction as the triggering action.
This guarantees consistency -- if the action succeeds, the feed event exists. Feed events are
**immutable** (never updated, only created) which simplifies caching and pagination.

### Where Feed Events Are Created

| Action | Service Method | Feed Event |
|--------|---------------|------------|
| User signup | `auth_service.register()` | `builder_joined` |
| Create project | `project_service.create()` | `project_created` |
| Ship project | `project_service.update_status(status='shipped')` | `project_shipped` |
| Create tribe | `tribe_service.create()` | `tribe_formed` |
| Open tribe | `tribe_service.update_status(status='open')` | `tribe_open` |
| Approve member | `tribe_service.approve_member()` | `member_joined_tribe` |

All feed event inserts happen inside the same database transaction as the primary action:

```python
# Example from project service
async def create_project(self, user_id: str, data: dict) -> Project:
    async with self.db.begin():  # Single transaction
        project = Project(**data, owner_id=user_id)
        self.db.add(project)

        # Collaborator invitations
        for collab_id in data.get("collaborator_ids", []):
            self.db.add(ProjectCollaborator(
                project_id=project.id,
                user_id=collab_id,
                status="pending"
            ))

        # Feed event -- same transaction
        self.db.add(FeedEvent(
            event_type="project_created",
            actor_id=user_id,
            target_type="project",
            target_id=project.id,
            metadata={
                "project_title": project.title,
                "tech_stack": project.tech_stack,
            }
        ))

    return project
```

---

## Cursor-Based Pagination

```graphql
type FeedConnection {
  edges: [FeedEdge!]!
  pageInfo: PageInfo!
}

type FeedEdge {
  node: FeedEvent!
  cursor: String!  # Base64-encoded created_at timestamp
}

type PageInfo {
  hasNextPage: Boolean!
  endCursor: String
}

# Usage
query {
  feed(first: 20, after: "MjAyNi0wMi0xMFQxMjowMDowMFo=") {
    edges {
      cursor
      node { ... }
    }
    pageInfo {
      hasNextPage
      endCursor
    }
  }
}
```

### Cursor Encoding

The cursor encodes a `(created_at, id)` tuple to handle ties in timestamp ordering.

### Query Implementation

```sql
WHERE (created_at, id) < (cursor_time, cursor_id)
ORDER BY created_at DESC, id DESC
LIMIT N+1
```

Fetching N+1 rows to determine `hasNextPage`:
- If N+1 rows are returned, `hasNextPage = true` and the last row is excluded from results
- If fewer than N+1 rows are returned, `hasNextPage = false`

---

## Feed Query Optimization

### Index-Driven Queries

The primary feed query is optimized by the descending index on `created_at`:

```sql
CREATE INDEX idx_feed_created ON feed_events (created_at DESC);
```

### Filtered Feeds

For filtered feeds (e.g., "show only project events" or "show events from people I follow"):

```sql
CREATE INDEX idx_feed_type ON feed_events (event_type);
CREATE INDEX idx_feed_actor ON feed_events (actor_id);
```

### Scalability Concerns

```
Load Phase 2 (10K-100K users):
  Feed queries slow down -> add composite index on (event_type, created_at)

Load Phase 3 (100K-1M users):
  Table partitioning: Partition feed_events by month (time-series data grows fastest)
  Archival: Move feed events older than 1 year to cold storage
```

---

## Indexing Strategy

```sql
-- Feed (cursor-based pagination on created_at)
CREATE INDEX idx_feed_created ON feed_events (created_at DESC);
CREATE INDEX idx_feed_type ON feed_events (event_type);
CREATE INDEX idx_feed_actor ON feed_events (actor_id);
```

---

## Caching Strategy

| What | Where | TTL | Invalidation |
|------|-------|-----|--------------|
| Feed page (first page) | Backend in-memory LRU | 1 min | On new feed event |
| GraphQL responses (SSR) | Next.js fetch cache | 60 sec | `revalidate: 60` |

Cache strategy for feed:
- **Feed**: `cache-and-network` (show stale data immediately, then refresh from server)

---

## GraphQL Schema

```
src/backend/schema/
  types/
    feed.py            # FeedEventType, FeedConnection
  queries/
    feed_queries.py    # feed(cursor, limit, filters)
  subscriptions/       # Future: WebSocket-based
    feed_subscriptions.py
```

---

## Apollo Client Cache Merge

The Apollo Client is configured with a custom merge function for cursor-based feed pagination:

```typescript
cache: new InMemoryCache({
  typePolicies: {
    Query: {
      fields: {
        // Cursor-based pagination merge for feed
        feed: {
          keyArgs: ["filters"],
          merge(existing, incoming, { args }) {
            if (!args?.after) return incoming;
            return {
              ...incoming,
              edges: [...(existing?.edges || []), ...incoming.edges],
            };
          },
        },
      },
    },
  },
}),
```

This ensures that when the user scrolls and loads more feed items, new edges are appended to the existing list rather than replacing it.
