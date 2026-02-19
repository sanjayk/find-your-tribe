# F8: Burn Plugins — Tech Spec

> See [overview.md](./overview.md) for full architecture context.
> Depends on: [F2 Builder Profiles](./f2-builder-profiles.md) for BuildActivity model.
> Product spec: [f8-burn-plugins.md](../product/f8-burn-plugins.md)
> Systems spec: [f8-burn-plugins.md](../systems/f8-burn-plugins.md)

---

## Project Structure

```
src/plugins/claude-code-hook/
├── package.json               # name: "fyt-burn", bin: { "fyt-burn": "./bin/fyt-burn.js" }
├── tsconfig.json
├── README.md                  # Installation and usage guide
├── bin/
│   └── fyt-burn.js            # CLI entrypoint (#!/usr/bin/env node)
├── src/
│   ├── cli.ts                 # Command parser (login, install, report, log, status)
│   ├── commands/
│   │   ├── login.ts           # Prompt for API token, store in config
│   │   ├── install.ts         # Add hook to Claude Code settings
│   │   ├── report.ts          # Parse transcript, POST burn (called by hook)
│   │   ├── log.ts             # Manual burn entry
│   │   └── status.ts          # Show connection health, recent burns
│   ├── transcript-parser.ts   # Parse Claude Code JSONL, extract token usage
│   ├── project-resolver.ts    # Git remote → project hint
│   ├── api-client.ts          # HTTP client for FYT burn ingest API
│   └── config.ts              # Read/write ~/.fyt/config.json
└── test/
    ├── transcript-parser.test.ts
    ├── project-resolver.test.ts
    └── fixtures/
        ├── transcript-v2.1.jsonl    # Real transcript samples (redacted)
        └── transcript-v1.0.jsonl
```

---

## CLI Commands

### `fyt-burn login`

```typescript
// commands/login.ts
// Prompts for API token, validates against API, stores in config

async function login() {
  const token = await prompt("Paste your API token from findyourtribe.dev/settings/integrations:");

  // Validate token against the API
  const response = await fetch(`${apiUrl}/api/burn/verify-token`, {
    headers: { "Authorization": `Bearer ${token}` }
  });

  if (!response.ok) {
    console.error("Invalid token. Check your token at findyourtribe.dev/settings/integrations");
    process.exit(1);
  }

  const { username } = await response.json();
  writeConfig({ api_token: token, api_url: apiUrl });
  console.log(`Authenticated as ${username}. Token stored in ~/.fyt/config.json`);
}
```

### `fyt-burn install`

```typescript
// commands/install.ts
// Detects Claude Code settings, adds SessionEnd hook

async function install() {
  // Claude Code settings locations (in order of preference)
  const settingsPaths = [
    path.join(process.cwd(), ".claude", "settings.local.json"),  // Project (gitignored)
    path.join(os.homedir(), ".claude", "settings.json"),          // User global
  ];

  // Prefer user global so it works across all projects
  const targetPath = settingsPaths[1];
  const existing = readJsonSafe(targetPath) || {};

  // Add SessionEnd hook
  const hook = {
    matcher: "*",
    hooks: [{
      type: "command",
      command: "fyt-burn report",
      timeout: 15
    }]
  };

  existing.hooks = existing.hooks || {};
  existing.hooks.SessionEnd = existing.hooks.SessionEnd || [];

  // Check if already installed
  const alreadyInstalled = existing.hooks.SessionEnd.some(
    (h: any) => h.hooks?.some((hh: any) => hh.command?.includes("fyt-burn"))
  );

  if (alreadyInstalled) {
    console.log("fyt-burn hook is already installed.");
    return;
  }

  existing.hooks.SessionEnd.push(hook);
  writeJson(targetPath, existing);
  console.log(`Hook installed in ${targetPath}`);
  console.log("Your Claude Code sessions will now report to Find Your Tribe.");
}
```

### `fyt-burn report`

This is the command called by the Claude Code hook. It reads hook input from stdin.

```typescript
// commands/report.ts

async function report() {
  // 1. Read hook payload from stdin
  const input = await readStdin();
  const hookData = JSON.parse(input);
  const { session_id, transcript_path, cwd } = hookData;

  if (!transcript_path) {
    // Not a valid hook invocation — exit silently
    process.exit(0);
  }

  // 2. Parse transcript
  const usage = await parseTranscript(transcript_path);
  if (!usage || usage.total_tokens === 0) {
    // Empty session — nothing to report
    process.exit(0);
  }

  // 3. Resolve project from git
  const projectHint = await resolveProjectHint(cwd);

  // 4. POST to API
  const config = readConfig();
  const result = await ingestBurn(config.api_token, {
    session_id,
    tokens_burned: usage.total_tokens,
    source: "anthropic",
    tool: "claude_code",
    verification: "extension_tracked",
    project_hint: projectHint,
    activity_date: new Date().toISOString().split("T")[0],
    token_precision: "exact",
    metadata: {
      model: usage.model,
      messages: usage.message_count,
      duration_s: usage.duration_s,
      claude_code_version: usage.version,
    },
  });

  if (result.ok) {
    // Silent success — don't clutter Claude Code output
    process.exit(0);
  } else {
    // Log error to stderr (shown in verbose mode only)
    console.error(`fyt-burn: failed to report (${result.status})`);
    process.exit(0);  // Still exit 0 — never block Claude Code
  }
}
```

### `fyt-burn log <tokens>`

```typescript
// commands/log.ts

async function log(tokens: number, options: {
  source?: string,
  project?: string,
  tool?: string,
  date?: string,
}) {
  const config = readConfig();

  const result = await ingestBurn(config.api_token, {
    tokens_burned: tokens,
    source: options.source || "other",
    tool: options.tool || null,
    verification: "self_reported",
    project_hint: options.project || null,
    activity_date: options.date || new Date().toISOString().split("T")[0],
    token_precision: "approximate",
  });

  if (result.ok) {
    const data = await result.json();
    console.log(
      `Logged ${tokens.toLocaleString()} tokens (self-reported)` +
      (options.project ? ` for ${options.project}` : "") +
      ` on ${options.date || "today"}`
    );
  } else {
    console.error(`Failed to log burn: ${result.statusText}`);
    process.exit(1);
  }
}
```

### `fyt-burn status`

```typescript
// commands/status.ts

async function status() {
  const config = readConfig();
  if (!config.api_token) {
    console.log("Not logged in. Run: fyt-burn login");
    return;
  }

  // Check hook installation
  const hookInstalled = checkHookInstalled();

  // Check API connection
  const verifyResult = await verifyToken(config.api_token);

  console.log(`Account:  ${verifyResult.username}`);
  console.log(`API:      ${verifyResult.ok ? "Connected" : "Error"}`);
  console.log(`Hook:     ${hookInstalled ? "Installed" : "Not installed"}`);

  if (verifyResult.ok && verifyResult.recent_burns) {
    console.log(`\nRecent burns:`);
    for (const burn of verifyResult.recent_burns.slice(0, 5)) {
      console.log(`  ${burn.date}  ${burn.tokens.toLocaleString()} tokens  ${burn.project || "(unattributed)"}`);
    }
  }
}
```

---

## Transcript Parser

```typescript
// transcript-parser.ts

interface TranscriptUsage {
  total_tokens: number;
  input_tokens: number;
  output_tokens: number;
  cache_creation_tokens: number;
  cache_read_tokens: number;
  model: string | null;
  message_count: number;
  duration_s: number;
  version: string | null;
}

export async function parseTranscript(filePath: string): Promise<TranscriptUsage | null> {
  const resolvedPath = filePath.replace(/^~/, os.homedir());

  let content: string;
  try {
    content = await fs.readFile(resolvedPath, "utf-8");
  } catch {
    return null;  // File not found or unreadable
  }

  const lines = content.trim().split("\n");

  let inputTokens = 0;
  let outputTokens = 0;
  let cacheCreationTokens = 0;
  let cacheReadTokens = 0;
  let model: string | null = null;
  let version: string | null = null;
  let messageCount = 0;
  let firstTimestamp: string | null = null;
  let lastTimestamp: string | null = null;

  for (const line of lines) {
    let entry: any;
    try {
      entry = JSON.parse(line);
    } catch {
      continue;  // Skip malformed lines
    }

    // Only count main-chain assistant messages
    if (entry.type !== "assistant") continue;
    if (entry.isSidechain === true) continue;

    const usage = entry.message?.usage;
    if (!usage) continue;

    inputTokens += usage.input_tokens ?? 0;
    outputTokens += usage.output_tokens ?? 0;
    cacheCreationTokens += usage.cache_creation_input_tokens ?? 0;
    cacheReadTokens += usage.cache_read_input_tokens ?? 0;

    messageCount++;

    if (!model && entry.message?.model) {
      model = entry.message.model;
    }
    if (!version && entry.version) {
      version = entry.version;
    }

    const ts = entry.timestamp;
    if (ts) {
      if (!firstTimestamp) firstTimestamp = ts;
      lastTimestamp = ts;
    }
  }

  const totalTokens = inputTokens + outputTokens + cacheCreationTokens + cacheReadTokens;

  if (totalTokens === 0) return null;

  let durationS = 0;
  if (firstTimestamp && lastTimestamp) {
    durationS = Math.round(
      (new Date(lastTimestamp).getTime() - new Date(firstTimestamp).getTime()) / 1000
    );
  }

  return {
    total_tokens: totalTokens,
    input_tokens: inputTokens,
    output_tokens: outputTokens,
    cache_creation_tokens: cacheCreationTokens,
    cache_read_tokens: cacheReadTokens,
    model,
    message_count: messageCount,
    duration_s: durationS,
    version,
  };
}
```

---

## Project Resolver

```typescript
// project-resolver.ts
import { execSync } from "child_process";

export function resolveProjectHint(cwd: string): string | null {
  try {
    const remoteUrl = execSync("git remote get-url origin", {
      cwd,
      encoding: "utf-8",
      timeout: 5000,
    }).trim();

    // Parse GitHub URLs:
    // https://github.com/owner/repo.git → owner/repo
    // git@github.com:owner/repo.git → owner/repo
    const httpsMatch = remoteUrl.match(/github\.com\/([^/]+\/[^/.]+)/);
    if (httpsMatch) return httpsMatch[1];

    const sshMatch = remoteUrl.match(/github\.com:([^/]+\/[^/.]+)/);
    if (sshMatch) return sshMatch[1];

    // Non-GitHub remotes: return the full URL as hint
    return remoteUrl;
  } catch {
    // Not a git repo or no remote
    return null;
  }
}
```

---

## Config File

```typescript
// config.ts

interface FytConfig {
  api_token: string;
  api_url: string;  // defaults to "https://api.findyourtribe.dev"
}

const CONFIG_DIR = path.join(os.homedir(), ".fyt");
const CONFIG_PATH = path.join(CONFIG_DIR, "config.json");

export function readConfig(): Partial<FytConfig> {
  try {
    return JSON.parse(fs.readFileSync(CONFIG_PATH, "utf-8"));
  } catch {
    return {};
  }
}

export function writeConfig(updates: Partial<FytConfig>): void {
  fs.mkdirSync(CONFIG_DIR, { recursive: true });
  const existing = readConfig();
  const merged = { ...existing, ...updates };
  fs.writeFileSync(CONFIG_PATH, JSON.stringify(merged, null, 2));
  // Set restrictive permissions (owner read/write only)
  fs.chmodSync(CONFIG_PATH, 0o600);
}
```

---

## Backend: Burn Ingest Endpoint

### Route

```python
# src/backend/app/api/burn_ingest.py
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field

router = APIRouter(prefix="/api/burn", tags=["burn"])


class BurnIngestRequest(BaseModel):
    tokens_burned: int = Field(gt=0)
    source: str  # anthropic, openai, google, other
    verification: str  # extension_tracked, self_reported, etc.
    tool: str | None = None
    activity_date: str | None = None  # YYYY-MM-DD, defaults to today
    session_id: str | None = None
    project_hint: str | None = None
    token_precision: str = "approximate"
    metadata: dict | None = None


class BurnIngestResponse(BaseModel):
    status: str = "ok"
    burn_id: str
    project_id: str | None
    project_matched: bool
    day_total: int


@router.post("/ingest", response_model=BurnIngestResponse)
async def ingest_burn(
    request: BurnIngestRequest,
    user_id: str = Depends(get_api_token_user),
    session: AsyncSession = Depends(get_session),
):
    """Ingest burn data from plugins (Claude Code hook, CLI manual entry)."""

    # 1. Deduplicate by session_id
    if request.session_id:
        existing = await find_burn_by_session_id(session, request.session_id)
        if existing:
            return BurnIngestResponse(
                burn_id=existing.id,
                project_id=existing.project_id,
                project_matched=existing.project_id is not None,
                day_total=await get_day_total(session, user_id, request.activity_date),
            )

    # 2. Resolve project from hint
    project_id = None
    if request.project_hint:
        project_id = await resolve_project(session, user_id, request.project_hint)

    # 3. Parse activity date
    activity_date = parse_date(request.activity_date)  # defaults to today

    # 4. Upsert burn record
    burn = await upsert_burn(
        session=session,
        user_id=user_id,
        tokens_burned=request.tokens_burned,
        source=request.source,
        verification=request.verification,
        tool=request.tool,
        project_id=project_id,
        activity_date=activity_date,
        session_id=request.session_id,
        token_precision=request.token_precision,
        metadata=request.metadata,
    )

    day_total = await get_day_total(session, user_id, activity_date)

    return BurnIngestResponse(
        burn_id=burn.id,
        project_id=project_id,
        project_matched=project_id is not None,
        day_total=day_total,
    )
```

### API Token Authentication

```python
# src/backend/app/api/auth_token.py
import hashlib
from fastapi import Depends, HTTPException, Security
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

security = HTTPBearer()

# Simple LRU cache for token lookups
_token_cache: dict[str, tuple[str, float]] = {}  # hash -> (user_id, cached_at)
CACHE_TTL = 300  # 5 minutes


async def get_api_token_user(
    credentials: HTTPAuthorizationCredentials = Security(security),
    session: AsyncSession = Depends(get_session),
) -> str:
    """Validate API token and return user_id."""
    token = credentials.credentials

    if not token.startswith("fyt_"):
        raise HTTPException(status_code=401, detail="Invalid token format")

    token_hash = hashlib.sha256(token.encode()).hexdigest()

    # Check cache
    if token_hash in _token_cache:
        user_id, cached_at = _token_cache[token_hash]
        if time.time() - cached_at < CACHE_TTL:
            return user_id

    # DB lookup
    result = await session.execute(
        select(ApiToken)
        .where(
            ApiToken.token_hash == token_hash,
            ApiToken.revoked_at.is_(None),
        )
    )
    api_token = result.scalar_one_or_none()

    if not api_token:
        raise HTTPException(status_code=401, detail="Invalid or revoked token")

    if api_token.expires_at and api_token.expires_at < datetime.now(UTC):
        raise HTTPException(status_code=401, detail="Token expired")

    # Update last_used_at (fire-and-forget)
    api_token.last_used_at = datetime.now(UTC)
    await session.commit()

    # Cache the result
    _token_cache[token_hash] = (api_token.user_id, time.time())

    return api_token.user_id
```

### Token Verification Endpoint

```python
@router.get("/verify-token")
async def verify_token(
    user_id: str = Depends(get_api_token_user),
    session: AsyncSession = Depends(get_session),
):
    """Verify API token and return user info + recent burns."""
    user = await session.get(User, user_id)
    if not user:
        raise HTTPException(status_code=404)

    # Get recent burns for status display
    recent = await get_recent_burns(session, user_id, limit=5)

    return {
        "username": user.username,
        "display_name": user.display_name,
        "recent_burns": [
            {
                "date": b.activity_date.isoformat(),
                "tokens": b.tokens_burned,
                "project": b.project.title if b.project else None,
                "verification": b.verification,
            }
            for b in recent
        ],
    }
```

---

## Updated Enums

```python
# src/backend/app/models/enums.py (additions)

class BurnVerification(StrEnum):
    PROVIDER_VERIFIED = "provider_verified"
    EXTENSION_TRACKED = "extension_tracked"
    EXPORT_UPLOADED = "export_uploaded"
    SELF_REPORTED = "self_reported"


class TokenPrecision(StrEnum):
    EXACT = "exact"
    ESTIMATED = "estimated"
    APPROXIMATE = "approximate"
```

---

## Updated BuildActivity Model

```python
# src/backend/app/models/build_activity.py (additions)

class BuildActivity(Base, ULIDMixin, TimestampMixin):
    # ... existing fields ...

    verification: Mapped[str] = mapped_column(
        SQLEnum(BurnVerification, values_callable=lambda x: [e.value for e in x]),
        nullable=False,
        server_default="self_reported",
    )
    tool: Mapped[str | None] = mapped_column(String(50), nullable=True)
    session_id: Mapped[str | None] = mapped_column(String(100), nullable=True)
    token_precision: Mapped[str] = mapped_column(
        SQLEnum(TokenPrecision, values_callable=lambda x: [e.value for e in x]),
        nullable=False,
        server_default="approximate",
    )
```

---

## API Token Model

```python
# src/backend/app/models/api_token.py

class ApiToken(Base, ULIDMixin, TimestampMixin):
    """API tokens for plugin authentication (separate from JWT sessions)."""

    __tablename__ = "api_tokens"

    user_id: Mapped[str] = mapped_column(
        String(26), ForeignKey("users.id", ondelete="CASCADE"), nullable=False
    )
    token_hash: Mapped[str] = mapped_column(String(64), nullable=False, unique=True)
    name: Mapped[str] = mapped_column(String(100), nullable=False)
    last_used_at: Mapped[datetime | None] = mapped_column(nullable=True)
    expires_at: Mapped[datetime | None] = mapped_column(nullable=True)
    revoked_at: Mapped[datetime | None] = mapped_column(nullable=True)

    user: Mapped["User"] = relationship()

    __table_args__ = (
        Index("ix_api_tokens_hash", "token_hash", postgresql_where=text("revoked_at IS NULL")),
        Index("ix_api_tokens_user", "user_id"),
    )
```

---

## GraphQL: API Token Management

Builders manage API tokens from the web UI via GraphQL mutations:

```python
# src/backend/app/graphql/mutations/api_token.py

@strawberry.type
class ApiTokenMutations:
    @strawberry.mutation
    async def create_api_token(
        self, info: Info, name: str
    ) -> CreateApiTokenResult:
        """Create a new API token. Returns the token value (shown once)."""
        user_id = get_authenticated_user(info)
        raw_token = f"fyt_{secrets.token_hex(32)}"
        token_hash = hashlib.sha256(raw_token.encode()).hexdigest()

        api_token = ApiToken(
            user_id=user_id,
            token_hash=token_hash,
            name=name,
        )
        session = info.context.session
        session.add(api_token)
        await session.commit()

        return CreateApiTokenResult(
            id=api_token.id,
            name=name,
            token=raw_token,  # Shown once, never stored
        )

    @strawberry.mutation
    async def revoke_api_token(self, info: Info, token_id: str) -> bool:
        """Revoke an API token."""
        user_id = get_authenticated_user(info)
        session = info.context.session
        token = await session.get(ApiToken, token_id)

        if not token or token.user_id != user_id:
            return False

        token.revoked_at = datetime.now(UTC)
        await session.commit()

        # Invalidate cache
        _token_cache.pop(token.token_hash, None)

        return True
```

---

## Dependencies (New)

### `fyt-burn` CLI (Node.js)

```json
{
  "name": "fyt-burn",
  "version": "0.1.0",
  "bin": { "fyt-burn": "./bin/fyt-burn.js" },
  "type": "module",
  "engines": { "node": ">=18" },
  "scripts": {
    "build": "tsc",
    "test": "vitest run"
  },
  "devDependencies": {
    "typescript": "^5.7",
    "vitest": "^4.0",
    "@types/node": "^22"
  }
}
```

**Zero runtime dependencies.** Uses only Node.js built-ins:
- `fs`, `path`, `os` for file operations
- `child_process` for git commands
- `readline` for interactive prompts
- `https`/`http` for API calls (or built-in `fetch` in Node 18+)

### Backend

No new Python dependencies. Uses existing FastAPI, SQLAlchemy, Pydantic.

---

## Testing

### CLI Tests

```typescript
// test/transcript-parser.test.ts
describe("parseTranscript", () => {
  it("sums tokens across all assistant messages", async () => {
    const usage = await parseTranscript("./test/fixtures/transcript-v2.1.jsonl");
    expect(usage?.total_tokens).toBeGreaterThan(0);
    expect(usage?.input_tokens).toBeGreaterThan(0);
    expect(usage?.output_tokens).toBeGreaterThan(0);
  });

  it("skips sidechain messages", async () => { /* ... */ });
  it("handles missing usage field gracefully", async () => { /* ... */ });
  it("returns null for empty transcript", async () => { /* ... */ });
  it("extracts model name from first assistant message", async () => { /* ... */ });
  it("calculates duration from first to last timestamp", async () => { /* ... */ });
});

// test/project-resolver.test.ts
describe("resolveProjectHint", () => {
  it("extracts owner/repo from HTTPS remote", () => { /* ... */ });
  it("extracts owner/repo from SSH remote", () => { /* ... */ });
  it("returns null when not a git repo", () => { /* ... */ });
  it("returns null when no remote configured", () => { /* ... */ });
});
```

### Backend Tests

```python
# tests/test_burn_ingest.py

class TestBurnIngest:
    async def test_ingest_creates_burn_record(self, client, api_token):
        response = await client.post("/api/burn/ingest", json={
            "tokens_burned": 15000,
            "source": "anthropic",
            "verification": "extension_tracked",
            "tool": "claude_code",
        }, headers={"Authorization": f"Bearer {api_token}"})
        assert response.status_code == 200
        assert response.json()["status"] == "ok"

    async def test_deduplicates_by_session_id(self, client, api_token):
        payload = {
            "tokens_burned": 15000,
            "source": "anthropic",
            "verification": "extension_tracked",
            "session_id": "test-session-123",
        }
        r1 = await client.post("/api/burn/ingest", json=payload,
                                headers={"Authorization": f"Bearer {api_token}"})
        r2 = await client.post("/api/burn/ingest", json=payload,
                                headers={"Authorization": f"Bearer {api_token}"})
        assert r1.json()["burn_id"] == r2.json()["burn_id"]

    async def test_resolves_project_from_hint(self, client, api_token, project_with_repo):
        response = await client.post("/api/burn/ingest", json={
            "tokens_burned": 15000,
            "source": "anthropic",
            "verification": "extension_tracked",
            "project_hint": "sanjay/find-your-tribe",
        }, headers={"Authorization": f"Bearer {api_token}"})
        assert response.json()["project_matched"] is True

    async def test_rejects_invalid_token(self, client):
        response = await client.post("/api/burn/ingest", json={
            "tokens_burned": 15000,
            "source": "anthropic",
            "verification": "self_reported",
        }, headers={"Authorization": "Bearer fyt_invalid"})
        assert response.status_code == 401

    async def test_unattributed_burn_when_no_project_match(self, client, api_token):
        response = await client.post("/api/burn/ingest", json={
            "tokens_burned": 15000,
            "source": "anthropic",
            "verification": "extension_tracked",
            "project_hint": "nonexistent/repo",
        }, headers={"Authorization": f"Bearer {api_token}"})
        assert response.json()["project_matched"] is False
        assert response.json()["project_id"] is None
```

---

## Quality Gates

### Plugin

```bash
cd src/plugins/claude-code-hook
npm run build          # TypeScript compilation
npm test               # Vitest
npx tsc --noEmit       # Type check
```

### Backend (new endpoint)

```bash
cd src/backend
ruff check app/api/burn_ingest.py app/models/api_token.py
python -m pytest tests/test_burn_ingest.py tests/test_api_token.py
```
