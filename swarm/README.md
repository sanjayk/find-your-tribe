# Tribe Swarm

A bash-based orchestration framework that coordinates multiple Claude Code agents to build software from product specs. Give it a spec, it produces a task DAG, assigns agents to branches, runs quality gates, and merges the result.

This is the tool building Find Your Tribe. It lives in the repo it builds.

## How it works

Tribe decomposes a product specification into a directed acyclic graph of tasks, then executes them in parallel using Claude Code agents on isolated git branches. Each task is small (15-30 minutes of work), scoped to declared files, and verified by non-LLM gates before merge.

```
spec.md → validate → plan → verify → run → review → coherence → integrate
```

### The pipeline

1. **validate** — Cross-reference all specs for consistency. Catches missing relationships, orphaned requirements, and contradictions between feature specs before any code is written.

2. **plan** — The Architect agent reads the spec and produces a task DAG with dependency ordering, file ownership declarations, and a data model contract. A Product Guardian gate checks that the plan aligns with the product vision before proceeding.

3. **verify** — An independent Plan Verifier reads the spec blind (without seeing the Architect's reasoning) and checks whether the task plan actually delivers what the spec requires. Adversarial by design.

4. **run** — Tasks execute in parallel on isolated branches. Each Developer agent gets a single task, a system prompt with project conventions, and access to the codebase. Agents can report "blocked" status instead of guessing when requirements are ambiguous.

5. **review** — The Reviewer agent checks each completed task's diff against the original product spec (not just the task description). A second Product Guardian gate checks for vision drift.

6. **coherence** — Before integration, the Coherence Checker verifies that independently-developed branches compose correctly: matching interfaces, consistent schemas, no duplicate implementations, no missing connections.

7. **integrate** — Branches merge into main in dependency order. Regression tests run after each merge. A schema contract check verifies the data model matches the Architect's contract. A final Product Guardian gate checks the integrated result.

### Failure handling

When tasks fail, the system doesn't just retry blindly:

- A **Debugger** agent performs root cause analysis on the failure (exact file, line, classification)
- A **Supervisor** agent decides the recovery strategy: retry, escalate model, replan, or escalate to human
- Pattern detection catches systemic failures (same import error in 3 tasks = missing foundational task, fix the root cause once)
- If >30% of tasks fail, the Supervisor recommends halting

### Grounding gates

Quality checks split into two categories:

- **Grounding gates** (non-LLM): diff is non-empty, declared files exist, scope check (files touched vs declared), Python import resolution via AST parsing, blocked status detection. A script can't be bullshitted.
- **Quality gates** (tools): syntax checking (Python AST, JSON, JS/TS), lint, typecheck, test. Commands are parsed from the project's CLAUDE.md so the swarm uses the same gates as the humans.

## Agents

| Agent | Role | When it runs |
|-------|------|--------------|
| **Architect** | Decomposes spec into task DAG + data model contract | `plan` |
| **Validator** | Cross-references all specs for consistency | `validate` |
| **Plan Verifier** | Blind-checks plan against spec (adversarial) | `verify` |
| **Product Guardian** | Checks alignment with product vision and anti-goals | `plan`, `review`, `integrate` |
| **Developer** | Implements a single task on an isolated branch | `run` |
| **Reviewer** | Code review against the product spec, not just task desc | `review` |
| **Coherence Checker** | Verifies independently-built branches compose correctly | `coherence` |
| **Debugger** | Root cause analysis on failed tasks | on failure |
| **Supervisor** | Decides recovery strategy for failures | on failure |
| **Integrator** | Merges branches in dependency order, resolves conflicts | `integrate` |

Agent definitions live in `agents/*.md`. Each defines the agent's mission, constraints, input/output format, and guidelines. They're specific to the problem domain, not generic.

## Usage

### Prerequisites

- [Claude Code CLI](https://docs.anthropic.com/en/docs/claude-code) (`claude` on PATH)
- `jq` (JSON processing)
- `python3` (for AST-based import checking)
- `git`

### Commands

```bash
# Initialize a project for swarm development
./swarm/tribe init

# Cross-validate all specs for consistency
./swarm/tribe validate specs/

# Decompose a spec into a task DAG
./swarm/tribe plan specs/product/f4-tribes.md --specs-dir specs/

# Blind-verify the plan against the spec
./swarm/tribe verify

# Execute tasks with parallel agents
./swarm/tribe run --max-parallel 3

# Show swarm state and progress
./swarm/tribe status

# Code review completed tasks
./swarm/tribe review

# Check cross-task consistency before integration
./swarm/tribe coherence

# Merge completed branches into main
./swarm/tribe integrate

# Retry a failed task (optionally escalate model)
./swarm/tribe retry --task-id 3 --escalate

# Recover from crashed/stale state
./swarm/tribe recover

# Run Product Guardian vision check on a spec
./swarm/tribe guardian specs/product/f4-tribes.md
```

### Options

| Flag | Default | Description |
|------|---------|-------------|
| `--max-parallel N` | 3 | Max concurrent agents |
| `--model MODEL` | sonnet | Default model (sonnet, opus, haiku) |
| `--task-id ID` | — | Target a specific task (retry, review) |
| `--escalate` | — | Upgrade model on retry (sonnet → opus) |
| `--specs-dir DIR` | — | Directory with related specs for cross-referencing |
| `SKIP_GUARDIAN=true` | — | Skip Product Guardian gates |

## Project structure

```
swarm/
  tribe                 # Main CLI (bash)
  agents/               # Agent role definitions (markdown)
    architect.md        # Spec → task DAG decomposition
    developer.md        # Single-task implementation
    reviewer.md         # Code review against product spec
    product-guardian.md  # Product vision alignment
    coherence-checker.md# Cross-branch composition check
    debugger.md         # Root cause analysis
    supervisor.md       # Recovery strategy decisions
    integrator.md       # Branch merging
    plan-verifier.md    # Adversarial plan audit
    validator.md        # Cross-spec consistency
  lib/                  # Shell libraries
    config.sh           # Paths, defaults, colors
    log.sh              # Logging with timestamps
    claude.sh           # Claude CLI wrapper (spawn, background, wait)
    tasks.sh            # Task CRUD, dependency resolution, topological sort
    git.sh              # Branch creation, merging, conflict detection
    grounding.sh        # Non-LLM verification gates
    gates.sh            # Quality gate runner (lint, test, typecheck)
  templates/            # Project scaffolding templates
    claude-md.md        # CLAUDE.md template
    spec.md             # Spec file template
    task.json           # Task schema
  specs/                # Swarm-specific specs (used during planning)
```

## Design decisions

**Why bash?** It's glue. The orchestrator's job is to spawn processes, manage files, and call CLIs. Bash does this natively. The complex reasoning happens inside the Claude agents, not the orchestrator.

**Why file-based state?** Tasks are JSON files in `.tribe/tasks/`. No database, no server, no daemon. You can inspect state with `cat` and `jq`. If something breaks, the state is human-readable. Bash 3.2 compatibility (macOS default) means no associative arrays, hence temp-file-based tracking in the topological sort.

**Why isolated branches?** Each developer agent works on its own git branch, scoped to declared files. This prevents agents from stepping on each other, makes diffs reviewable per-task, and allows parallel execution without locks.

**Why a data model contract?** The Architect produces a machine-verifiable declaration of what tables, FKs, and relationships must exist. After integration, a bash script (not an LLM) checks whether the schema matches the contract. Scripts can't be bullshitted.

**Why a Product Guardian?** Scope creep is the default. Every individual feature request seems reasonable; collectively they turn a differentiated product into generic software. The Guardian runs at three insertion points (pre-plan, post-review, post-integration) and checks every change against the product's vision, anti-goals, and personas. It quotes the spec when flagging issues.

## Known limitations

- **JSON parsing is fragile.** Agent output is parsed from Claude's response. Falls back to sed-based extraction when structured output fails. Works in practice, but not bulletproof.
- **No rollback.** If integration fails partway, manual `git reset` is needed.
- **Budget enforcement requires `bc`.** Silently disabled if `bc` is missing.
- **No tests for the orchestrator itself.** The agents are tested by running them. The bash scripts are not unit-tested.
- **Sleep-polling for parallel tasks.** Uses `kill -0` PID checks in a loop, which is simple but not efficient for long waits.

## License

[MIT](../LICENSE)
