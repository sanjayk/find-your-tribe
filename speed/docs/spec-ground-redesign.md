# spec_ground.py Redesign: Technology-Agnostic Codebase Context

## Problem

The architect agent needs codebase context to plan tasks without spending all its
time exploring. Currently it gets useless flat file listings, causing it to burn
26 turns and 22 tool calls doing orientation work before timing out at 600s.

Previously it received structured schema info (table names, columns, FKs — 660
tokens, 42 lines) that let it plan immediately. But that was produced by
AST-parsing SQLAlchemy models from hardcoded project directories. SPEED is a
generic orchestrator and cannot have technology-specific knowledge.

## What Broke

The contract_verify.py redesign (5650a9e) correctly removed AST parsing. But
spec_ground.py depended on it. The rewrite (304306f) replaced structured schema
context with flat file listings. The architect went from planning to flailing.

## What's Wrong in spec_ground.py Today

Three things violate technology-agnosticism:

**1. Hardcoded project directories (lines 156-165)**

`scan_project_files()` has a hardcoded list: `src/backend/app/models`,
`src/backend/app/db`, `src/frontend/components`, etc. A Rails app, Go service,
or any non-this-project layout breaks.

**2. Technology-specific convention detection (lines 187-235)**

`detect_codebase_conventions()` has a generic name but a narrow implementation.
It scans `.py` files in two hardcoded directories (`src/backend/app/models`,
`src/backend/app/db`) for three things: `mapped_column(` vs `Column(` string
counts (SQLAlchemy column style), `ULIDMixin` presence (ID strategy), and
`TimestampMixin` presence. Returns `{column_style, id_type, has_mixins}` — all
SQLAlchemy-specific. The docstring says "no technology assumptions" but every
line of the function is SQLAlchemy knowledge applied to hardcoded paths.

**3. Technology-specific spec pattern matching (lines 106-142)**

`detect_spec_code_patterns()` also has a generic name but only checks four
booleans: does the spec's Python code blocks contain `Column(` or
`mapped_column(`? Does the spec text mention `UUID` without `ULID`? These are
then cross-referenced against `detect_codebase_conventions()` output by
`compare_spec_with_codebase()` to produce mismatch warnings (e.g., "spec uses
Column() but codebase uses mapped_column()"). The entire pipeline is
SQLAlchemy/ULID specific.

## Evidence: The Architect Timeout

From `.speed/features/speed-audit/logs/Architect-1771766618.jsonl`:

- 26 assistant turns, 22 tool calls, 891 chars of actual planning text
- 10 Read calls (speed/speed read 3 times, plus agents, lib files)
- 6 Grep calls (searching for function definitions)
- 3 Bash calls (ls, find to discover directory structure)
- 2 Glob calls, 1 Task call
- All orientation work. Zero planning completed before timeout.

## What the Architect Actually Needs

The architect receives specs containing proposed code (the tech spec for f4-tribes
has 1,929 tokens of model code blocks). What grounding must provide is **what
already exists** so the architect can diff proposed vs actual.

The old structured context answered:
- What tables exist? (11 tables)
- What columns does each have? (full column lists)
- What are the foreign key relationships? (owner_id -> users.id, etc.)
- What class implements each table and where? (User in user.py)

The current flat listing answers:
- What files exist in 8 hardcoded directories? (filenames only)

## Why Context Must Be Spec-Independent

The architect's primary job is to VALIDATE the spec — catch what the spec got
wrong, missed, or assumed incorrectly. If the context only shows files the spec
references, the architect can only confirm the spec's own claims. It cannot
discover:

- Tables the spec forgot to mention (e.g., an existing association table)
- Files that already implement what the spec proposes to create
- Adjacent code that would be affected by the spec's changes
- Missing layers (spec defines models but forgets GraphQL resolvers)

The old structured context worked because it was spec-independent: "here are ALL
11 tables, their columns, and FKs." The architect compared that against the spec
and caught gaps. The replacement must preserve this property.

## The Scoping Problem

SPEED builds two kinds of things:

1. **App features** — f4-tribes, builder-profiles, etc. The architect needs the
   full app layer: all models, all GraphQL types, all components.
2. **SPEED features** — speed-audit, new agents, pipeline changes. The architect
   needs the full SPEED layer: speed/speed, speed/lib/, speed/agents/.

CLAUDE.md describes the app (Next.js, SQLAlchemy, Tailwind). It is irrelevant
when building SPEED features. The old approach had this same problem — it only
extracted SQLAlchemy models, so SPEED-on-SPEED builds got irrelevant context.

## Proposed Solution

Replace technology-specific code with two generic mechanisms: a full project tree
(spec-independent, cheap) and raw source file inclusion from project-declared
directories (spec-independent, gives the architect actual code to validate
against).

### 1. Full project tree (spec-independent)

Walk the entire project root with standard exclusions (.git, node_modules,
__pycache__, dist, .next, venv, .speed). Depth-capped at 4 levels. Present as
indented tree.

~1,530 tokens, 261 lines. Shows EVERYTHING that exists. The architect can spot
"the spec proposes creating tribe.py but it already exists" even if the spec
never mentioned that file. This is the existence layer.

### 2. Source file inclusion from CLAUDE.md-declared directories (spec-independent)

CLAUDE.md's "File Organization" section lists the project's key directories:

```
- Models: `src/backend/app/models/`
- GraphQL types: `src/backend/app/graphql/types/`
- Components: `src/frontend/components/`
```

Include the contents of ALL source files from ALL declared directories. Not just
files the spec references — ALL of them. The architect sees the entire data layer,
entire API layer, entire component layer. It can validate the spec against the
full codebase, not just the spec's own claims.

This is spec-independent (shows everything in declared directories) and
project-declared (SPEED reads CLAUDE.md, doesn't hardcode paths). SPEED doesn't
know what "Models" means — it just reads directories the project listed.

**Size control:** A per-file line cap does NOT work. Measured against actual model
files: 7 of 10 have structural info (columns, relationships) past line 50.
project.py ends at line 199, tribe.py at 183, user.py at 262. Capping at 50
lines would cut the most important files in half.

Options: include full files (all models = ~7,678 tokens), or set a total token
budget and include files in priority order until the budget is exhausted.

**SPEED builds:** SPEED does not have its own CLAUDE.md-style declaration yet.
For SPEED features, fall back to including all files under `speed/` (detected
by checking if the spec path starts with `speed/`). This is the one case where
SPEED knows about itself — acceptable since SPEED's own directory structure is
a SPEED convention, not a project technology assumption.

### 3. CLAUDE.md passthrough (spec-independent)

Include CLAUDE.md for architecture and conventions. Skip for SPEED-only builds
(spec path under speed/) since CLAUDE.md describes the app, not the orchestrator.

## What Gets Removed

| Code | Why |
|------|-----|
| `detect_spec_code_patterns()` | Checks for Column vs mapped_column, UUID vs ULID — SQLAlchemy specific |
| `detect_codebase_conventions()` | Scans for mapped_column, ULIDMixin, TimestampMixin in hardcoded dirs |
| Convention mismatch warnings in `compare_spec_with_codebase()` | Cross-references SQLAlchemy patterns |
| Hardcoded `scan_dirs` list in `scan_project_files()` | Project-specific directory layout |
| `conventions` parameter threading | No longer needed |

## What Stays

| Code | Why |
|------|-----|
| `parse_spec_tables()` | Parses SPEED's own spec markdown format, not technology-specific |
| `parse_spec_file_paths()` | Extracts backtick-wrapped paths from spec text |
| File path existence checking | "Does this spec-referenced path exist on disk?" |
| Spec table info warnings | "Spec declares table X with N columns" — informational |

## Size Summary

Context is now spec-independent — same directories included regardless of spec.

```
Measured directory sizes (full file contents):

Directory                      Files  ~Tokens   Lines
─────────────────────────────────────────────────────
models                            11    8,050   1,232
graphql/types                      8    4,269     595
graphql/mutations                  8    7,038     890
graphql/queries                    2    3,621     415
graphql (all)                     22   15,779   2,013
speed/agents                      12   17,307   1,406
speed/lib                         15   33,765   4,150
speed/ (all)                      78  200,303  20,255

Old structured extraction:          ~660 tokens (42 lines)
```

**Full file inclusion does not work.** Including all model + GraphQL files for
an app feature costs ~24,000 tokens. On top of the existing ~38K architect
message, that's 62K tokens — 31% of context window, and the architect hasn't
started producing output yet.

For SPEED builds it's worse: speed/agents + speed/lib alone is 51K tokens.
All of speed/ is 200K — the entire context window.

The old AST extraction compressed 8,050 tokens of raw model files into 660
tokens — a 12x compression ratio. That compression came from technology-specific
parsing: it knew what a SQLAlchemy column was and could extract just the name
and FK target. Without that knowledge, we carry the full source.

**There is no free lunch.** The options are:

A. **Accept the cost, be selective about directories.** Include models (8K
   tokens) but not GraphQL. The architect gets full schema context for the
   data layer, which is the most critical for validation. GraphQL resolvers
   are less important — they derive from the models.

B. **Smarter truncation.** Instead of first-N-lines (which fails because
   structural info is spread throughout files), strip method bodies and
   keep only class/function signatures and field declarations. This is
   technology-aware (knows what a method body looks like) but less so than
   full AST parsing.

C. **Token budget with priority.** Set a total context budget (~10K tokens).
   Include files in priority order (models first, then GraphQL types, then
   mutations). Stop when budget is exhausted. Files that don't fit get
   listed by name only (the current flat listing as fallback).

D. **Require a project summary file.** The project maintains a structured
   summary (table names, columns, key relationships) in a known location.
   SPEED reads it. This is the only way to get the old 660-token efficiency
   without technology-specific parsing. The cost is maintenance burden and
   staleness risk.

## Test Changes

3 of 16 tests enforce the wrong design:

- `test_detects_mapped_column_convention` — replace with test for spec-driven
  file inclusion
- `test_convention_mismatch_warns` — replace with test for scoped tree scan
- `test_context_lists_existing_files` — update assertions for new context format

The other 13 tests remain valid.

## Open Questions

1. **File content truncation:** Cap at ~50 lines per file, or full files? Full
   files are always accurate. Capped files are smaller but might cut off relevant
   info in long files (user.py is 265 lines). Full inclusion of all model files
   costs ~7,678 tokens vs ~3,500 capped.

2. **CLAUDE.md directory parsing:** CLAUDE.md uses `- Models: \`src/backend/app/models/\``
   format. How robust should parsing be? Strict regex on the "File Organization"
   section, or find all backtick-wrapped directory paths anywhere in the file?

3. **SPEED self-builds:** Currently proposed as a special case (detect spec path
   under speed/, include all speed/ files). Should SPEED have its own declaration
   file (speed/SPEED.md) to make this generic?

4. **Frontend files:** Including all component files could be expensive as the app
   grows. May need a total token budget with priority ordering (models first, then
   GraphQL types, then components, truncate when budget exceeded).

## Files to Modify

- `speed/lib/spec_ground.py` — main redesign
- `speed/tests/test_spec_ground.sh` — update 3 tests
- No changes to `speed/lib/grounding.sh` (output JSON contract unchanged)
- No changes to `speed/agents/architect.md` (already handles codebase context)
