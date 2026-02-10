# F4: Tribes -- Systems Design

**Feature**: Tribes
**Context**: See [overview.md](./overview.md) for architecture overview, service boundaries, and deployment.
**Source**: Extracted from [SYSTEMS_DESIGN.md](../SYSTEMS_DESIGN.md)

---

## Table of Contents

1. [Database Tables](#database-tables)
2. [Tribe State Machine](#tribe-state-machine)
3. [Data Flow: Tribe Formation and Member Approval](#data-flow-tribe-formation-and-member-approval)
4. [Indexing Strategy](#indexing-strategy)
5. [GraphQL Schema](#graphql-schema)
6. [Authorization Rules](#authorization-rules)
7. [N+1 Prevention (DataLoaders)](#n1-prevention-dataloaders)

---

## Database Tables

### `tribes`

| Column | Type | Constraints | Notes |
|--------|------|-------------|-------|
| id | UUID | PK, DEFAULT gen_random_uuid() | |
| name | VARCHAR(100) | NOT NULL | |
| mission | TEXT | NULLABLE | |
| owner_id | UUID | FK -> users(id) ON DELETE CASCADE, NOT NULL | |
| status | VARCHAR(20) | NOT NULL, DEFAULT 'active' | 'active', 'open', 'alumni' |
| max_members | INTEGER | DEFAULT 8, CHECK (max_members BETWEEN 2 AND 8) | |
| created_at | TIMESTAMPTZ | DEFAULT NOW() | |
| updated_at | TIMESTAMPTZ | DEFAULT NOW() | |

### `tribe_members`

| Column | Type | Constraints | Notes |
|--------|------|-------------|-------|
| id | UUID | PK, DEFAULT gen_random_uuid() | |
| tribe_id | UUID | FK -> tribes(id) ON DELETE CASCADE, NOT NULL | |
| user_id | UUID | FK -> users(id) ON DELETE CASCADE, NOT NULL | |
| role | VARCHAR(50) | NULLABLE | "designer", "backend engineer" |
| status | VARCHAR(20) | NOT NULL, DEFAULT 'pending' | 'pending', 'active', 'left', 'removed' |
| joined_at | TIMESTAMPTZ | NULLABLE | Set when status becomes 'active' |

**Unique constraint**: (tribe_id, user_id) -- a user can only be a member once per tribe.

### `tribe_open_roles`

| Column | Type | Constraints | Notes |
|--------|------|-------------|-------|
| id | UUID | PK, DEFAULT gen_random_uuid() | |
| tribe_id | UUID | FK -> tribes(id) ON DELETE CASCADE, NOT NULL | |
| role_name | VARCHAR(100) | NOT NULL | "React Native Developer" |
| description | TEXT | NULLABLE | |
| skills_needed | TEXT[] | DEFAULT '{}' | |
| created_at | TIMESTAMPTZ | DEFAULT NOW() | |

---

## Tribe State Machine

Tribes transition through three states:

```
    +-------+          +--------+          +---------+
    | open  | -------> | active | -------> | alumni  |
    +-------+          +--------+          +---------+
         ^                  |
         |                  |
         +------------------+
          (can reopen)
```

**State definitions**:

| Status | Description | Transitions |
|--------|-------------|-------------|
| `open` | Tribe is actively recruiting members. Open roles are visible in discovery. Applicants can request to join. | -> `active` (when owner closes recruitment) |
| `active` | Tribe is full or recruitment is closed. Members are collaborating. No new join requests accepted. | -> `open` (owner reopens recruitment), -> `alumni` (owner archives tribe or project completes) |
| `alumni` | Tribe has completed its mission or been archived. Members retain the association on their profiles as history. Read-only. | Terminal state (no transitions out) |

**Constraints enforced during transitions**:
- `open` -> `active`: At least 2 members must be in `active` status
- `active` -> `open`: Tribe must not be at `max_members`
- Any -> `alumni`: Only the tribe owner can archive
- When tribe status is `open`, `requestJoinTribe` mutation is allowed
- When tribe status is `active` or `alumni`, `requestJoinTribe` mutation is rejected

**Member status within a tribe**:

| Member Status | Description |
|---------------|-------------|
| `pending` | User has requested to join; awaiting owner approval |
| `active` | User is an active member of the tribe |
| `left` | User voluntarily left the tribe |
| `removed` | User was removed by the tribe owner |

---

## Data Flow: Tribe Formation and Member Approval

```
Owner                          FastAPI                  PostgreSQL            Applicant
   |                              |                        |                      |
   | 1. createTribe mutation      |                        |                      |
   |    {name, mission, roles}    |                        |                      |
   |---------------------------->|                        |                      |
   |                              | 2. BEGIN TRANSACTION   |                      |
   |                              |---INSERT tribe-------->|                      |
   |                              |---INSERT tribe_member->|                      |
   |                              |    (owner, 'active')   |                      |
   |                              |---INSERT open_roles--->|                      |
   |                              |---INSERT feed_event--->|                      |
   |                              |    (tribe_formed)      |                      |
   |                              |    COMMIT              |                      |
   |<--tribe created--------------|                        |                      |
   |                              |                        |                      |
   |                              |  ... applicant browses open tribes ...        |
   |                              |                        |                      |
   |                              |<----requestJoinTribe(tribe_id, role)----------|
   |                              |                        |                      |
   |                              | 3. Verify tribe is 'open'                    |
   |                              |    and not at max_members                     |
   |                              |---INSERT tribe_member->|                      |
   |                              |    (status: 'pending') |                      |
   |                              |                        |                      |
   |                              |<--request submitted----|                      |
   |                              |                        |                      |
   |  ... owner reviews ...       |                        |                      |
   |                              |                        |                      |
   | 4. approveMember mutation    |                        |                      |
   |    {tribe_id, user_id}       |                        |                      |
   |---------------------------->|                        |                      |
   |                              | 5. Verify owner        |                      |
   |                              |---UPDATE tribe_member->|                      |
   |                              |    status='active'     |                      |
   |                              |    joined_at=NOW()     |                      |
   |                              |---INSERT feed_event--->|                      |
   |                              |    (member_joined)     |                      |
   |                              |                        |                      |
   |<--member approved------------|                        |                      |
```

---

## Indexing Strategy

```sql
-- Tribe queries
CREATE INDEX idx_tribes_owner ON tribes (owner_id);
CREATE INDEX idx_tribes_status ON tribes (status);
CREATE INDEX idx_tribe_members_tribe ON tribe_members (tribe_id);
CREATE INDEX idx_tribe_members_user ON tribe_members (user_id);
```

---

## GraphQL Schema

```
src/backend/schema/
  types/
    tribe.py           # TribeType, TribeInput, TribeConnection
  queries/
    tribe_queries.py   # tribe(id), tribes(filters), openTribes
  mutations/
    tribe_mutations.py # createTribe, updateTribe, requestJoinTribe, approveMember, removeMember, leaveTribe
```

---

## Authorization Rules

| Resource | Action | Who Can Do It |
|----------|--------|---------------|
| **Tribe** | View | Anyone (public) |
| **Tribe** | Create | Any authenticated user |
| **Tribe** | Edit | Owner only |
| **Tribe** | Delete | Owner only |
| **Tribe** | Request to join | Any authenticated user (not already a member), tribe must be 'open' |
| **Tribe** | Approve member | Owner only |
| **Tribe** | Remove member | Owner only |
| **Tribe** | Leave tribe | Active member (not owner) |

Implementation: Authorization checks live in the **service layer**, not in resolvers.

---

## N+1 Prevention (DataLoaders)

```python
class DataLoaders:
    def __init__(self):
        self.tribe_members_by_tribe = DataLoader(load_fn=load_members_by_tribe)
```

This ensures that when rendering a list of tribes with their members, we issue batched SQL queries
instead of one query per tribe.

### Feed Events Generated by Tribe Actions

| Event Type | Trigger | Metadata Example |
|------------|---------|-----------------|
| `tribe_formed` | Tribe created | `{"tribe_name": "Fintech Builders", "open_roles": ["React Native Developer", "Growth Marketer"], "member_count": 1}` |
| `tribe_open` | Tribe status changed to 'open' | `{"tribe_name": "Fintech Builders", "open_roles": ["React Native Developer", "Growth Marketer"], "member_count": 3}` |
| `member_joined_tribe` | Member approved and status set to 'active' | `{"tribe_name": "Fintech Builders", "member_name": "Jane Doe", "role": "React Native Developer"}` |
