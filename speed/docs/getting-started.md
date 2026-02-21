# Getting Started with SPEED

This guide walks through the full SPEED pipeline from initialization to integration. Each stage shows example output so you know what to expect.

## 1. What is SPEED?

SPEED is a bash-based orchestration framework that coordinates AI coding agents to build software from product specs. You write specs describing what to build; SPEED decomposes them into a task graph, assigns each task to an agent on an isolated git branch, runs quality gates, and merges the result.

```
spec.md → validate → plan → verify → run → review → coherence → integrate
```

You provide the specs, SPEED handles the coordination.

## 2. Prerequisites

Before using SPEED, verify you have these installed:

```bash
# A supported AI coding agent CLI
claude --version          # Claude Code
# — or —
codex --version           # OpenAI Codex CLI

# Required tools
jq --version              # JSON processing
python3 --version         # Python 3.x (for TOML parsing, AST checks)
git --version             # Git

# macOS only: GNU timeout
brew install coreutils    # provides gtimeout
```

SPEED works with any AI coding agent that implements the provider interface. Claude Code is the default.

## 3. Initialize

From your project root, run `speed init` to scaffold the configuration files:

```bash
./speed/speed init
```

Example output:

```
→ Initializing SPEED project...
  ✓ Created speed.toml
  ✓ Created CLAUDE.md (template)
  ✓ Created specs/product/overview.md (template)
  ✓ Created specs/tech/ (directory)
  ✓ Created specs/design/ (directory)
→ Done. Edit the generated files, then write your specs.
```

This creates three files and two directories. You'll customize all of them.

## 4. Configure

### `speed.toml`

The project-level configuration. Most defaults are fine to start:

```toml
[agent]
provider = "claude-code"

[subsystems]
"frontend" = ["src/frontend/**"]
"backend" = ["src/backend/**"]

[specs]
vision_file = "specs/product/overview.md"
```

See the [example project](../example/speed.toml) for a minimal working config.

### `CLAUDE.md`

Every agent reads this file for project conventions, architecture, and quality gates. The critical section is **Quality Gates** — SPEED parses this to know what checks to run:

```markdown
## Quality Gates

### Backend
- lint: `cd src/backend && ruff check .`
- test: `cd src/backend && python -m pytest`

### Frontend
- lint: `cd src/frontend && npx eslint .`
- typecheck: `cd src/frontend && npx tsc --noEmit`
```

The format matters: `## Quality Gates` header, `### Subsystem` subheaders, `- gate_name: \`command\`` entries. See the [example CLAUDE.md](../example/CLAUDE.md).

## 5. Write Specs

SPEED uses a three-spec convention:

| Spec | Path | What it defines |
|------|------|-----------------|
| Product | `specs/product/<name>.md` | Features, acceptance criteria, out of scope |
| Tech | `specs/tech/<name>.md` | Tables, API, validation rules |
| Design | `specs/design/<name>.md` | Pages, components, states |

Plus a **vision file** (`specs/product/overview.md`) defining the product's mission, personas, and anti-goals.

All three spec files must share the same base name. When you plan from the tech spec, SPEED auto-discovers the matching product and design specs:

```
specs/tech/bookshelf.md
  → specs/product/bookshelf.md    (auto-discovered)
  → specs/design/bookshelf.md     (auto-discovered)
```

For detailed guidance on writing specs, see [Writing Specs](writing-specs.md). For a complete working example, see the [example project](../example/).

## 6. Plan

The Architect agent reads your specs and produces a task DAG:

```bash
./speed/speed plan specs/tech/bookshelf.md --specs-dir specs/
```

Example output:

```
→ Planning from specs/tech/bookshelf.md
  ✓ Loaded product spec: specs/product/bookshelf.md
  ✓ Loaded design spec: specs/design/bookshelf.md
  ✓ Loaded vision: specs/product/overview.md
  → Architect decomposing spec into tasks...
  ✓ Architect produced 6 tasks

  Task Graph:
  ┌─────────────────────────────────────────┐
  │ 1. Backend: Author + Book models       │──┐
  │    files: models/author.py, book.py     │  │
  ├─────────────────────────────────────────┤  │
  │ 2. Backend: ReadingList models          │──┤
  │    files: models/reading_list.py        │  │
  └─────────────────────────────────────────┘  │
       │                                       │
       ▼                                       ▼
  ┌─────────────────────────────────────────┐
  │ 3. Backend: Book queries + mutations    │
  │    files: graphql/book.py               │
  ├─────────────────────────────────────────┤
  │ 4. Backend: ReadingList queries + muts  │
  │    files: graphql/reading_list.py       │
  └─────────────────────────────────────────┘
       │
       ▼
  ┌─────────────────────────────────────────┐
  │ 5. Frontend: BookCard + grid page       │
  │    files: components/book-card.tsx, ...  │
  ├─────────────────────────────────────────┤
  │ 6. Frontend: ReadingList page           │
  │    files: components/reading-list.tsx    │
  └─────────────────────────────────────────┘

  → Product Guardian checking plan alignment...
  ✓ Guardian APPROVED — plan aligns with product vision

  → Plan saved to .speed/plan.json
```

Tasks 1 and 2 have no dependencies and will run in parallel. Tasks 3-4 depend on 1-2. Tasks 5-6 depend on 3-4.

## 7. Verify

An independent Plan Verifier reads the spec blind (without seeing the Architect's reasoning) and checks whether the plan delivers what the spec requires:

```bash
./speed/speed verify
```

Example output:

```
→ Verifying plan against spec...
  → Plan Verifier auditing 6 tasks against spec...
  ✓ All acceptance criteria covered
  ✓ No orphaned tasks (every task traces to a spec requirement)
  ✓ Dependency ordering is sound
  ✓ Verification passed
```

If verification fails, it reports which acceptance criteria are missing from the task plan.

## 8. Run

Execute the task plan. SPEED assigns each task to a developer agent on an isolated git branch:

```bash
./speed/speed run --max-parallel 3
```

Example output:

```
→ Executing 6 tasks (max 3 parallel)

  [1/6] Backend: Author + Book models ............ ✓ (2m 14s)
  [2/6] Backend: ReadingList models ............... ✓ (1m 48s)
  ── dependency gate: tasks 1,2 complete ──
  [3/6] Backend: Book queries + mutations ......... ✓ (3m 02s)
  [4/6] Backend: ReadingList queries + mutations .. ✓ (2m 37s)
  ── dependency gate: tasks 3,4 complete ──
  [5/6] Frontend: BookCard + grid page ............ ✓ (3m 45s)
  [6/6] Frontend: ReadingList page ................ ✓ (2m 58s)

  ✓ All 6 tasks completed
  → Total time: 9m 22s (wall clock)
```

Each task runs on its own `speed/task-<id>-<slug>` branch. Failed tasks get analyzed by the Debugger and Supervisor agents before deciding whether to retry or escalate.

## 9. Review, Coherence, and Integrate

After all tasks complete, three stages finalize the work:

```bash
# Code review each task against the product spec
./speed/speed review

# Verify independently-built branches compose correctly
./speed/speed coherence

# Merge branches into main in dependency order
./speed/speed integrate
```

**Review** checks each task's diff against the original product spec (not just the task description). A Product Guardian gate checks for vision drift.

**Coherence** verifies that independently-developed branches work together: matching interfaces, consistent schemas, no duplicate implementations.

**Integrate** merges branches in dependency order, runs regression tests after each merge, and verifies the data model matches the Architect's contract.

## 10. Using the Example Project

The [example project](../example/) contains a complete bookshelf app with pre-written specs. Use it to see the full pipeline without writing your own specs:

```bash
# Create a new project
mkdir my-bookshelf && cd my-bookshelf
git init

# Copy the example files
cp -r /path/to/speed/example/* .

# Copy the SPEED orchestrator
cp -r /path/to/speed .

# Run the pipeline
./speed/speed validate specs/
./speed/speed plan specs/tech/bookshelf.md --specs-dir specs/
./speed/speed run
./speed/speed review
./speed/speed coherence
./speed/speed integrate
```

See the [example README](../example/README.md) for full details.

## Next Steps

- **[Writing Specs](writing-specs.md)** — How to write specs that SPEED executes well
- **[Troubleshooting](troubleshooting.md)** — When things go wrong: symptoms, causes, fixes
- **[Example Project](../example/)** — Complete bookshelf app with pre-written specs
- **[SPEED README](../README.md)** — Full reference: agents, options, configuration, design decisions
