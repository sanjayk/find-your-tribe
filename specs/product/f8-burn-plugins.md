# F8: Burn Plugins — Token Burn Collection

## Context

This spec covers the burn plugin system for **Find Your Tribe**, a proof-of-work social network for builders. For full product vision, positioning, personas, and success metrics, see [overview.md](./overview.md).

**Token burn is the universal, discipline-agnostic proof of work** — to Find Your Tribe what the contribution graph is to GitHub, except it works for every role. This feature builds the infrastructure to collect that proof from where builders actually work.

---

## Problem

Builders burn tokens inside other products — Claude Code, ChatGPT, Cursor, Gemini. The provider has the data. The builder doesn't. Without a collection mechanism, burn data is either self-reported (low trust) or missing entirely.

Currently, burn can only be recorded via the GraphQL API (`record_burn` mutation), which means every session must be manually logged. This is unsustainable — builders won't do it, and the heatmap stays empty.

---

## Solution

A plugin system that puts a sensor where the builder works. Delivered in phases — each expanding the coverage of builders whose burn data is automatically collected.

This spec covers all phases. **Phase 1 is the current implementation scope.** Later phases are documented here for roadmap clarity — they will get their own detailed specs when the time comes.

---

## Feature Summary

`fyt-burn` is a lightweight CLI that builders install to automatically report their Claude Code token usage to Find Your Tribe. It also supports manual burn logging for sessions outside Claude Code. Once installed, burn data flows automatically — the builder's heatmap fills itself.

---

## MoSCoW Priority

| Component | Priority |
|---|---|
| `fyt-burn` CLI (install, login, report, log) | **Should** |
| Burn ingest API endpoint (backend) | **Must** |
| Verification levels on BuildActivity model | **Must** |
| Project resolution from git repo | **Should** |
| Manual burn logging via CLI | **Should** |

---

## User Stories

| ID | Story | Priority |
|---|---|---|
| BP-1 | As a builder using Claude Code, I want my token usage to be automatically reported to FYT so that my burn heatmap reflects my work without manual effort. | Should |
| BP-2 | As a builder, I want to install the burn reporter in under 2 minutes so that setup doesn't become a barrier. | Should |
| BP-3 | As a builder, I want to manually log a burn session via CLI when I've used a tool that isn't auto-tracked so that all my work is captured. | Should |
| BP-4 | As a builder, I want my burn data to show whether it was auto-collected or self-reported so that visitors can gauge trust level. | Must |
| BP-5 | As a visitor viewing a profile, I want to see the verification level of burn data so that I understand how trustworthy the signal is. | Must |

---

## Core Concepts

### Verification Levels

Burn data is not all equal. The system tracks how each record was collected:

| Level | Label | How it happens | Trust |
|-------|-------|----------------|-------|
| `provider_verified` | Provider-verified | OAuth connection to Anthropic/OpenAI; platform pulls usage data from their API | Highest |
| `extension_tracked` | Auto-tracked | Plugin (Claude Code hook, Chrome extension, IDE extension) passively collects and reports | High |
| `export_uploaded` | Uploaded | Builder exports data from a tool (ChatGPT export, usage dashboard CSV) and uploads to FYT | Medium |
| `self_reported` | Self-reported | Builder manually logs a session via CLI or web UI | Low |

Phase 1 introduces `extension_tracked` (Claude Code hook) and `self_reported` (manual CLI logging).

### Source vs Verification

These are two independent dimensions:

- **Source** answers: which AI provider? (Anthropic, OpenAI, Google, etc.)
- **Verification** answers: how do we know? (auto-tracked, self-reported, etc.)
- **Tool** answers: which product? (Claude Code, ChatGPT web, Cursor, etc.)

A builder who uses Claude Code: `source=anthropic, verification=extension_tracked, tool=claude_code`
A builder who manually logs ChatGPT usage: `source=openai, verification=self_reported, tool=chatgpt`

### Token Precision

- **Exact**: Token counts from API responses or transcript parsing (Claude Code hook)
- **Estimated**: Token counts derived from message text length (Chrome extension, future)
- **Approximate**: Builder-entered token counts (manual logging)

---

## User Flow: Installing the Claude Code Hook

```
1. Builder runs: npm install -g fyt-burn
2. Builder runs: fyt-burn login
   → Prompted for FYT API token
   → "Paste your API token from findyourtribe.dev/settings/integrations:"
   → Token stored in ~/.fyt/config.json
3. Builder runs: fyt-burn install
   → Detects Claude Code settings location
   → Adds SessionEnd hook to settings
   → Prints: "Done. Your Claude Code sessions will now report to Find Your Tribe."
4. Builder uses Claude Code normally.
5. On session end, hook fires → parses transcript → POSTs burn to FYT API.
6. Builder visits their FYT profile → heatmap shows the session.
```

## User Flow: Manual Burn Logging

```
1. Builder finishes a ChatGPT session.
2. Builder runs: fyt-burn log 15000 --source openai --project tribe-finder
3. CLI confirms: "Logged 15,000 tokens (self-reported) for tribe-finder on 2026-02-19"
4. Burn appears on heatmap with self-reported indicator.
```

---

## Key Product Decisions

### Two collection modes in one CLI

**Decision:** `fyt-burn` handles both auto-collection (hook) and manual logging (CLI command). One tool, one install, one auth.

**Rationale:** Builders shouldn't need separate tools for different workflows. They may use Claude Code for some work and ChatGPT for other work. One CLI covers both, with appropriate verification tagging.

### Verification levels are visible, not hidden

**Decision:** The profile heatmap and burn receipts show verification level — not as a scarlet letter, but as contextual information.

**Rationale:** Trust transparency is a core platform principle. Hiding verification level would undermine the proof-of-work positioning. Showing it gives visitors honest signal without punishing self-reporters.

### Manual logging is not capped or penalized

**Decision:** Self-reported burn counts the same in the heatmap. It is not weighted less, capped, or hidden.

**Rationale:** Punishing manual logging punishes non-engineers and builders who use tools without integrations. The verification label provides the trust signal — visitors can draw their own conclusions. The heatmap should be inclusive.

### Session-level reporting, not per-message

**Decision:** The Claude Code hook reports once per session (on SessionEnd), not per message.

**Rationale:** Per-session is the natural unit. It reduces API calls, matches how builders think about their work ("I had a session"), and avoids noise from the many small API calls within a session.

### Transcript parsing with OTEL fallback

**Decision:** The hook parses Claude Code's transcript JSONL to extract token usage. If OpenTelemetry is enabled, use OTEL data instead (more stable API contract).

**Rationale:** Transcript parsing works immediately with zero config. OTEL is more stable but requires env var setup. Offering both lets builders choose their tradeoff. Transcript parsing leverages existing open-source schemas (@constellos/claude-code-kit).

---

## Relevant Personas

- **Maya Chen (Indie Hacker):** Installs `fyt-burn` in 2 minutes. Her Claude Code sessions auto-report. Her heatmap fills up showing 252 active days. She also manually logs ChatGPT sessions for content work.
- **James Okafor (Agency Escapee):** Uses Cursor (IDE), not Claude Code directly. Phase 1 doesn't auto-track him. He uses `fyt-burn log` to manually log sessions until the Chrome extension (Phase 2) covers his workflow.
- **Priya Sharma (Senior Engineer):** Power user — uses Claude Code with her own API key. Her burn data is highest trust: `extension_tracked` from the hook, with exact token counts from the transcript.
- **David Morales (Non-Technical Founder):** Uses ChatGPT and Claude.ai for operational planning. Manually logs sessions via `fyt-burn log`. His burn is `self_reported` but still visible and valued on his profile.

---

## Relevant Risks

### Transcript Schema Instability

Claude Code's transcript JSONL is undocumented. The format has changed between versions (`costUSD` removed in v1.0.9, cache fields added later).

**Mitigations:**
- Each transcript line includes a `version` field — version-aware parsing.
- Reference existing open-source schemas (@constellos/claude-code-kit Zod schemas, ccusage parser).
- OTEL fallback path avoids transcript parsing entirely.
- Fail gracefully — if parsing fails, log a warning and skip the session (don't crash Claude Code).

### Adoption Friction

Developers may resist installing yet another CLI tool.

**Mitigations:**
- Three-command install: `npm install -g`, `fyt-burn login`, `fyt-burn install`.
- Under 2 minutes total.
- Zero ongoing maintenance — hook fires silently.
- `fyt-burn status` lets builders verify it's working.

### Gaming via Manual Logging

Builders could log inflated token counts.

**Mitigations:**
- Verification level is visible. Self-reported burn is transparently labeled.
- Platform doesn't police manual entries — the trust signal does the work.
- Future: cross-reference patterns (e.g., a builder who manually logs 500K tokens/day with no projects shipped will be naturally discounted by visitors).

---

## Success Metrics

| Metric | Definition | Target |
|---|---|---|
| **Plugin adoption** | % of builders with at least one auto-tracked burn session | 20% of active builders within 3 months |
| **Burn coverage** | % of active builders with any burn data (auto or manual) | 50% of active builders within 3 months |
| **Setup completion rate** | % of builders who start `fyt-burn install` and complete it | 80% |
| **Daily auto-reports** | Average daily burn reports from hooks | Growing week-over-week |

---

## Dependencies

```
Authentication (F1)
  |
  v
Builder Profiles (F2) + Build Activity model (F2)
  |
  v
Burn Plugins (this feature)
  |
  v
Profile Heatmap updates (F2) — show verification levels
Builder Score integration (F7) — future: burn as score signal
```

---

## Phases

### Phase 1: Claude Code Hook + `fyt-burn` CLI (Current Scope)

**Audience:** Engineers using Claude Code
**Verification level:** `extension_tracked` (auto) + `self_reported` (manual CLI)
**Coverage:** ~10-15% of builders (Claude Code users)

What ships:
- `fyt-burn` CLI: `login`, `install`, `report`, `log`, `status`
- Claude Code SessionEnd hook (parses transcript JSONL, reports tokens)
- Burn ingest REST endpoint on backend
- `verification`, `tool`, `session_id`, `token_precision` fields on BuildActivity
- API token authentication for plugins
- Project resolution from git remote URL
- Manual burn logging via CLI for any tool/source

**Why start here:** Lowest implementation effort with highest data quality. Claude Code transcripts give exact token counts. The hook system already exists. We ship a working pipeline end-to-end and prove the model before investing in harder integrations.

---

### Phase 2: Chrome Extension (Future)

**Audience:** Everyone using web-based AI tools — engineers and non-engineers
**Verification level:** `extension_tracked`
**Coverage:** ~60-70% of builders (ChatGPT, Claude.ai, Gemini, Perplexity users)

What it does:
- Browser extension with content scripts for ChatGPT, Claude.ai, Gemini, Perplexity
- Passively observes assistant responses via DOM MutationObserver
- Estimates tokens from message text length (~4 chars/token for English)
- Reports to FYT burn ingest API (same endpoint as Phase 1)
- Popup UI showing today's burn, weekly summary, project attribution
- Auto-detects project context from Claude.ai Projects and ChatGPT folders

Key challenges:
- **DOM fragility** — ChatGPT and Claude.ai change their markup regularly. Content scripts need to be resilient and updated when sites change.
- **Token estimation accuracy** — `text.length / 4` is rough. Different models tokenize differently. Acceptable for heatmap intensity (relative signal), not for exact counts.
- **Project attribution** — Fuzzy. Claude.ai has Projects (maps cleanly). ChatGPT has conversation titles (maps loosely). Fallback: builder assigns manually in popup.
- **Privacy** — Extension reads DOM to count tokens but NEVER sends prompt content. Only metadata: token estimate, source, timestamp, project hint. This is a hard line.

**Why Phase 2:** Single highest-leverage integration. One extension covers the majority of non-engineers and a lot of engineers. ChatGPT + Claude.ai alone represent the bulk of AI usage.

---

### Phase 3: IDE Extensions (Future)

**Audience:** Engineers using AI-powered IDEs
**Verification level:** `extension_tracked`
**Coverage:** ~30-40% of engineer builders (Cursor, Windsurf, Copilot users)

What it does:
- VS Code extension that works across Cursor, Windsurf, and VS Code (all share VS Code's extension API)
- Observes AI chat panels, inline completions, and edit suggestions
- Tracks tokens from AI interactions within the IDE
- Attributes to project via workspace folder (maps to git repo → FYT project)
- Reports to FYT burn ingest API

Key challenges:
- **Varying AI integration points** — Cursor's AI chat is different from Copilot's completions. Extension needs tool-specific observation logic.
- **Token estimation** — IDE completions are short. Volume matters less than frequency. May need a different signal model (sessions/day rather than raw tokens).
- **Overlap with Phase 1** — A builder using Claude Code inside VS Code terminal would have both the hook and the IDE extension running. Need deduplication.

Possible expansion: JetBrains plugin (separate plugin API, separate build).

---

### Phase 4: Export Upload (Future)

**Audience:** Builders who want to import historical data or use tools without plugin support
**Verification level:** `export_uploaded`
**Coverage:** Universal fallback

What it does:
- Web UI in FYT settings where builders upload data exports from AI tools
- Supported formats:
  - ChatGPT data export (JSON) — parse conversations, count messages, estimate tokens per day
  - Claude.ai conversation export (JSON) — same pattern
  - Anthropic/OpenAI API usage dashboard (CSV) — extract daily token totals
  - Google Takeout Gemini data — parse conversation history
- FYT parses the upload, attributes to dates, creates BuildActivity records
- Builder reviews imported data before confirming

Key challenges:
- **Format stability** — Export formats change. Each parser is maintenance.
- **Historical backfill** — Builders may upload months of history. Heatmap suddenly goes from empty to full. Is this honest? Probably yes — the data is real, it's just late.
- **Cherry-picking** — Builder controls what they upload. Could omit low-activity periods. Verification level `export_uploaded` makes this transparent.

---

### Phase 5: Provider OAuth (Future)

**Audience:** Builders with direct API accounts
**Verification level:** `provider_verified` (highest trust)
**Coverage:** ~5-10% of builders (API power users)

What it does:
- OAuth integration with Anthropic, OpenAI usage APIs
- Builder connects their API account → FYT pulls daily usage aggregates automatically
- Exact token counts, provider-attested
- Daily background sync

Key challenges:
- **Provider cooperation** — Requires OAuth scopes for usage data that may not exist yet. Anthropic is most likely to build this (FYT showcases Claude adoption). OpenAI has usage endpoints for API customers.
- **Small audience** — Most builders use products (ChatGPT, Claude.ai), not APIs directly. High trust but low reach.
- **Double counting** — A builder with an Anthropic API key who also uses Claude Code (which calls the same API) would have burn counted twice. Need dedup by date + source.

**Why last:** Highest trust but lowest coverage. Dependent on external providers building OAuth scopes.

---

### Phase Summary

| Phase | What | Audience | Coverage | Trust | Effort |
|-------|------|----------|----------|-------|--------|
| **1** | Claude Code hook + CLI | Engineers (Claude Code) | ~10-15% | High (exact tokens) | Low |
| **2** | Chrome extension | Everyone (web AI tools) | ~60-70% | High (estimated tokens) | Medium |
| **3** | IDE extensions | Engineers (Cursor, Copilot) | ~30-40% | High (estimated tokens) | Medium |
| **4** | Export upload | Everyone (historical) | Universal fallback | Medium | Low-Medium |
| **5** | Provider OAuth | API power users | ~5-10% | Highest (provider-attested) | Medium (+ external dependency) |

Cumulative coverage after Phase 2 reaches ~70%+ of active builders. Phases 3-5 fill gaps and increase trust levels.

---

## Scope (Phase 1 — Current)

### In Scope

- `fyt-burn` CLI: `login`, `install`, `report`, `log`, `status`
- Claude Code SessionEnd hook
- Transcript JSONL parser (version-aware)
- OTEL fallback for token extraction
- Burn ingest REST endpoint (backend)
- `verification` and `tool` fields on BuildActivity model
- `session_id` for deduplication
- Project resolution from git remote URL
- Manual burn logging via CLI
- API token authentication

### Out of Scope

- Chrome browser extension (Phase 2)
- VS Code / IDE extensions (Phase 3)
- Export upload (Phase 4)
- OAuth-based provider verification (Phase 5)
- Burn data in Builder Score algorithm
- Verification-level visual treatment on heatmap (design spec needed)
- Rate limiting or fraud detection on burn ingest
