# F8: Burn Plugins — Systems Design

**Feature**: Burn Plugins (Phase 1: Claude Code Hook + `fyt-burn` CLI)
**Context**: See [overview.md](./overview.md) for architecture overview, service boundaries, and deployment.
**Source**: See [product spec](../product/f8-burn-plugins.md) for requirements and user stories.

---

## Table of Contents

1. [Overview](#overview)
2. [System Architecture](#system-architecture)
3. [Data Flow](#data-flow)
4. [Database Changes](#database-changes)
5. [Burn Ingest Endpoint](#burn-ingest-endpoint)
6. [Transcript Parsing](#transcript-parsing)
7. [Project Resolution](#project-resolution)
8. [Deduplication](#deduplication)
9. [Authentication](#authentication)
10. [Failure Modes](#failure-modes)
11. [Indexing](#indexing)

---

## Overview

The burn plugin system introduces a new data collection path: external tools (starting with Claude Code) report token usage to the FYT backend via a REST ingest endpoint. This is architecturally distinct from the existing GraphQL `record_burn` mutation, which is designed for authenticated web clients.

The ingest endpoint is a REST POST (not GraphQL) because:
- Plugins are lightweight scripts, not Apollo clients
- The payload is simple and fixed-shape
- Authentication uses API tokens, not JWT sessions
- It needs to be curl-friendly for debugging

---

## System Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│  BUILDER'S MACHINE                                                  │
│                                                                     │
│  ┌──────────────┐     SessionEnd      ┌──────────────────────────┐  │
│  │ Claude Code   │ ──── hook fires ──▶ │ fyt-burn report          │  │
│  │               │                     │                          │  │
│  │ (writes       │                     │ 1. Read stdin (hook JSON)│  │
│  │  transcript   │                     │ 2. Parse transcript JSONL│  │
│  │  to disk)     │                     │ 3. Sum tokens            │  │
│  │               │                     │ 4. Resolve project (git) │  │
│  └──────────────┘                     │ 5. POST to FYT API       │  │
│                                        └─────────────┬────────────┘  │
│                                                      │               │
│  ┌──────────────────────────────────┐                │               │
│  │ fyt-burn log (manual)            │                │               │
│  │                                  │────────────────┤               │
│  │ Builder enters tokens + source   │                │               │
│  └──────────────────────────────────┘                │               │
│                                                      │               │
│  ┌──────────────────────────────────┐                │               │
│  │ ~/.fyt/config.json               │                │               │
│  │ { "api_token": "fyt_...",        │ ◀── read ──────┤               │
│  │   "api_url": "https://..." }     │                │               │
│  └──────────────────────────────────┘                │               │
│                                                      │               │
└──────────────────────────────────────────────────────┼───────────────┘
                                                       │
                                                       │ HTTPS POST
                                                       │ /api/burn/ingest
                                                       ▼
                                            ┌──────────────────────┐
                                            │  FastAPI Backend      │
                                            │                      │
                                            │  /api/burn/ingest    │
                                            │  • Validate API token│
                                            │  • Validate payload  │
                                            │  • Resolve project   │
                                            │  • Deduplicate       │
                                            │  • Upsert to DB     │
                                            │                      │
                                            └──────────┬───────────┘
                                                       │
                                                       ▼
                                            ┌──────────────────────┐
                                            │  PostgreSQL           │
                                            │                      │
                                            │  build_activities    │
                                            │  + verification      │
                                            │  + tool              │
                                            │  + session_id        │
                                            └──────────────────────┘
```

---

## Data Flow

### Auto-Report (Claude Code Hook)

```
1. Builder ends Claude Code session (Ctrl+C, /exit, or task completion)
2. Claude Code fires SessionEnd event
3. Hook command executes: fyt-burn report
4. fyt-burn reads hook JSON from stdin:
   {
     "session_id": "abc-123",
     "transcript_path": "~/.claude/projects/.../session.jsonl",
     "cwd": "/Users/builder/code/my-project",
     "hook_event_name": "SessionEnd"
   }
5. fyt-burn parses transcript JSONL:
   - Filters for type: "assistant" lines
   - Sums message.usage.input_tokens + output_tokens +
     cache_creation_input_tokens + cache_read_input_tokens
   - Extracts model name from message.model
   - Counts messages and derives session duration from timestamps
6. fyt-burn resolves project:
   - Runs `git remote get-url origin` in cwd
   - Extracts repo name (e.g., "sanjay/find-your-tribe")
   - Sends as project_hint for backend resolution
7. fyt-burn POSTs to /api/burn/ingest:
   {
     "session_id": "abc-123",
     "tokens_burned": 47832,
     "source": "anthropic",
     "tool": "claude_code",
     "verification": "extension_tracked",
     "project_hint": "sanjay/find-your-tribe",
     "activity_date": "2026-02-19",
     "token_precision": "exact",
     "metadata": {
       "model": "claude-opus-4-6",
       "messages": 34,
       "duration_s": 1847,
       "claude_code_version": "2.1.44"
     }
   }
8. Backend validates, resolves project_hint → project_id, upserts BuildActivity.
9. Response: 200 OK with burn summary.
```

### Manual Report

```
1. Builder runs: fyt-burn log 15000 --source openai --project tribe-finder
2. fyt-burn POSTs to /api/burn/ingest:
   {
     "tokens_burned": 15000,
     "source": "openai",
     "tool": "chatgpt",
     "verification": "self_reported",
     "project_hint": "tribe-finder",
     "activity_date": "2026-02-19",
     "token_precision": "approximate"
   }
3. Backend validates and upserts.
4. CLI prints confirmation.
```

---

## Database Changes

### New Fields on `build_activities`

| Column | Type | Constraints | Default | Notes |
|--------|------|-------------|---------|-------|
| `verification` | ENUM (`provider_verified`, `extension_tracked`, `export_uploaded`, `self_reported`) | NOT NULL | `self_reported` | How the data was collected |
| `tool` | VARCHAR(50) | NULL | NULL | Which product generated the burn (e.g., `claude_code`, `chatgpt`, `cursor`) |
| `session_id` | VARCHAR(100) | NULL | NULL | External session ID for deduplication |
| `token_precision` | ENUM (`exact`, `estimated`, `approximate`) | NOT NULL | `approximate` | How precise the token count is |

### New Enum: `BurnVerification`

```python
class BurnVerification(StrEnum):
    PROVIDER_VERIFIED = "provider_verified"
    EXTENSION_TRACKED = "extension_tracked"
    EXPORT_UPLOADED = "export_uploaded"
    SELF_REPORTED = "self_reported"
```

### New Enum: `TokenPrecision`

```python
class TokenPrecision(StrEnum):
    EXACT = "exact"
    ESTIMATED = "estimated"
    APPROXIMATE = "approximate"
```

### New Table: `api_tokens`

For plugin authentication (separate from JWT sessions):

| Column | Type | Constraints | Notes |
|--------|------|-------------|-------|
| `id` | ULID | PK | |
| `user_id` | FK → users | NOT NULL | Owner |
| `token_hash` | VARCHAR(64) | NOT NULL, UNIQUE | SHA-256 hash of the token |
| `name` | VARCHAR(100) | NOT NULL | Human label (e.g., "Claude Code hook") |
| `last_used_at` | TIMESTAMP | NULL | Updated on each use |
| `expires_at` | TIMESTAMP | NULL | Optional expiry |
| `revoked_at` | TIMESTAMP | NULL | Soft delete |
| `created_at` | TIMESTAMP | NOT NULL | |

### Migration

```sql
-- Add verification fields to build_activities
ALTER TABLE build_activities
  ADD COLUMN verification VARCHAR(20) NOT NULL DEFAULT 'self_reported',
  ADD COLUMN tool VARCHAR(50),
  ADD COLUMN session_id VARCHAR(100),
  ADD COLUMN token_precision VARCHAR(15) NOT NULL DEFAULT 'approximate';

-- Create api_tokens table
CREATE TABLE api_tokens (
  id VARCHAR(26) PRIMARY KEY,
  user_id VARCHAR(26) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash VARCHAR(64) NOT NULL UNIQUE,
  name VARCHAR(100) NOT NULL,
  last_used_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,
  revoked_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for token lookup
CREATE INDEX ix_api_tokens_hash ON api_tokens (token_hash) WHERE revoked_at IS NULL;
CREATE INDEX ix_api_tokens_user ON api_tokens (user_id);

-- Index for session deduplication
CREATE INDEX ix_build_activities_session
  ON build_activities (session_id)
  WHERE session_id IS NOT NULL;
```

---

## Burn Ingest Endpoint

### `POST /api/burn/ingest`

This is a REST endpoint, not GraphQL. Authenticated via API token in the `Authorization` header.

**Request:**

```
POST /api/burn/ingest
Authorization: Bearer fyt_abc123...
Content-Type: application/json

{
  "tokens_burned": 47832,           // required, positive integer
  "source": "anthropic",            // required, enum
  "verification": "extension_tracked", // required, enum
  "tool": "claude_code",            // optional, string
  "activity_date": "2026-02-19",    // optional, defaults to today
  "session_id": "abc-123",          // optional, for deduplication
  "project_hint": "sanjay/find-your-tribe", // optional, repo name or project slug
  "token_precision": "exact",       // optional, defaults to "approximate"
  "metadata": {                     // optional, JSONB
    "model": "claude-opus-4-6",
    "messages": 34,
    "duration_s": 1847,
    "claude_code_version": "2.1.44"
  }
}
```

**Response (200):**

```json
{
  "status": "ok",
  "burn_id": "01HXYZ...",
  "project_id": "01HABC...",
  "project_matched": true,
  "day_total": 63200
}
```

**Error responses:**

| Status | Code | When |
|--------|------|------|
| 401 | `UNAUTHORIZED` | Invalid or revoked API token |
| 400 | `VALIDATION_ERROR` | Invalid payload (negative tokens, bad enum, etc.) |
| 409 | `DUPLICATE_SESSION` | session_id already recorded (idempotent — returns existing) |
| 429 | `RATE_LIMITED` | Too many requests |

**Rate limiting:** 60 requests/minute per API token (generous — a builder would need 60 Claude Code sessions in 1 minute to hit this).

---

## Transcript Parsing

### JSONL Structure (Known Schema)

Each line in the transcript JSONL is a JSON object with a `type` field. Token usage lives in `type: "assistant"` lines:

```json
{
  "type": "assistant",
  "version": "2.1.44",
  "sessionId": "abc-123",
  "cwd": "/path/to/project",
  "message": {
    "model": "claude-opus-4-6",
    "role": "assistant",
    "content": [...],
    "usage": {
      "input_tokens": 1,
      "cache_creation_input_tokens": 11435,
      "cache_read_input_tokens": 33366,
      "output_tokens": 418
    }
  },
  "timestamp": "2026-02-17T15:48:08.901Z"
}
```

### Parsing Algorithm

```
1. Read transcript JSONL line by line
2. For each line:
   a. Parse JSON
   b. Skip if type != "assistant"
   c. Skip if isSidechain == true (subagent traffic)
   d. Extract message.usage:
      - input_tokens (default 0)
      - output_tokens (default 0)
      - cache_creation_input_tokens (default 0)
      - cache_read_input_tokens (default 0)
   e. Add to running totals
   f. Track model name (first non-null message.model)
   g. Track message count
3. Derive duration from first to last timestamp
4. Return: {
     total_tokens: input + output + cache_creation + cache_read,
     model, message_count, duration_s, version
   }
```

### Version Handling

The `version` field in each line identifies the Claude Code version. Known schema changes:

| Version Range | Schema Notes |
|--------------|-------------|
| < 1.0.9 | `costUSD` field present (ignore it, compute from tokens) |
| >= 1.0.9 | `costUSD` removed |
| >= 2.x | `cache_creation` object with `ephemeral_1h_input_tokens`, `ephemeral_5m_input_tokens` |
| >= 2.x | `server_tool_use` object with `web_search_requests`, `web_fetch_requests` |

The parser uses defensive extraction — access fields with defaults, don't fail on unexpected structure. Log a warning if a line has no `usage` object but don't abort.

### OTEL Fallback

If `CLAUDE_CODE_ENABLE_TELEMETRY=1` is set and an OTEL endpoint is configured, the builder can optionally use OTEL-based token collection instead of transcript parsing. This is a future enhancement — Phase 1 uses transcript parsing only, with OTEL as a documented alternative.

---

## Project Resolution

When the hook reports `project_hint: "sanjay/find-your-tribe"` (derived from `git remote get-url origin`), the backend resolves it to a FYT project:

```
1. Parse project_hint:
   - If it looks like a full GitHub URL, extract owner/repo
   - If it looks like "owner/repo", use as-is
   - If it's a bare name, treat as slug

2. Query user's projects:
   SELECT id FROM projects
   WHERE owner_id = :user_id
   AND github_repo_full_name = :hint

3. If no match, try partial match:
   SELECT id FROM projects
   WHERE owner_id = :user_id
   AND github_repo_full_name ILIKE '%' || :repo_name

4. If still no match: project_id = NULL (unattributed burn)
```

Unattributed burn is valid — it still shows on the heatmap. Builders can retroactively attribute burn by creating a project that matches the repo.

---

## Deduplication

The `session_id` field prevents the same Claude Code session from being recorded twice (e.g., if the hook fires twice due to a retry).

```
1. If session_id is provided:
   a. Check: SELECT id FROM build_activities WHERE session_id = :session_id
   b. If exists: return 409 DUPLICATE_SESSION with existing record (idempotent)
   c. If not: insert normally

2. If session_id is NULL (manual logging):
   a. Fall through to existing upsert logic
      (unique constraint on user_id, project_id, activity_date, source)
```

---

## Authentication

### API Token Lifecycle

```
1. Builder visits findyourtribe.dev/settings/integrations
2. Clicks "Create API Token"
3. Enters a name (e.g., "Claude Code hook")
4. Backend generates token: fyt_{random_32_bytes_hex}
5. Backend stores SHA-256(token) in api_tokens table
6. Token displayed once to builder (never stored in plaintext)
7. Builder pastes into fyt-burn login

On each request:
1. Extract token from Authorization: Bearer fyt_...
2. Compute SHA-256(token)
3. Lookup in api_tokens WHERE token_hash = :hash AND revoked_at IS NULL
4. If found and not expired: authenticated as token.user_id
5. Update last_used_at
```

### Token Format

```
fyt_{64_hex_chars}

Example: fyt_a1b2c3d4e5f6...
```

The `fyt_` prefix allows builders (and grep) to identify FYT tokens in config files.

---

## Failure Modes

| Failure | Impact | Handling |
|---------|--------|----------|
| Transcript file missing or empty | No burn recorded for session | Log warning, exit 0 (don't block Claude Code) |
| Transcript parsing error (unexpected schema) | No burn recorded | Log warning with version info, exit 0 |
| FYT API unreachable | No burn recorded | Log warning, optionally queue for retry |
| FYT API returns 4xx | Depends on error | Log error message, exit 0 |
| API token expired/revoked | No burn recorded | Print clear error: "Your FYT token has expired. Run fyt-burn login to re-authenticate." |
| No git remote in cwd | Burn recorded as unattributed | Log info, proceed without project_hint |
| Hook timeout (15s default) | Partial execution | Keep timeout generous enough for API call; transcript parsing is fast |

**Critical principle:** The hook must never block or crash Claude Code. Every error path exits cleanly with code 0.

---

## Indexing

```sql
-- API token lookup (fast auth)
CREATE INDEX ix_api_tokens_hash ON api_tokens (token_hash) WHERE revoked_at IS NULL;

-- Session dedup lookup
CREATE INDEX ix_build_activities_session ON build_activities (session_id) WHERE session_id IS NOT NULL;

-- Verification-level filtering (for heatmap display)
CREATE INDEX ix_build_activities_verification ON build_activities (user_id, verification);
```

---

## Caching Strategy

| What | Where | TTL | Invalidation |
|------|-------|-----|--------------|
| API token → user_id lookup | Backend in-memory LRU | 5 min | On token revocation |
| Project resolution (repo → project_id) | Backend in-memory LRU | 10 min | On project create/update |

API token caching is important because every burn ingest request requires token validation. An LRU cache avoids a DB round-trip on every hook fire.
