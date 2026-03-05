# Anatomy of a SPEED Task

A task is the unit of work in SPEED. The Architect agent produces tasks during `speed plan`, and Developer agents consume them during `speed run`. Everything between those two commands flows through the task JSON.

## A Real Task

From F10 Rich Feed, task 3 (the largest of four):

```json
{
  "id": "3",
  "title": "Replace EventCard with rich timeline layout",
  "description": "Rewrite src/frontend/src/app/feed/page.tsx to replace the flat EventCard list with a vertical timeline using four visual types...",
  "acceptance_criteria": "- Feed page renders a vertical timeline with a thin thread line...\n- PROJECT_SHIPPED events render as MilestoneCard with gradient header...",
  "depends_on": ["2"],
  "status": "pending",
  "branch": "speed/f10-rich-feed/task-3-replace-eventcard-with-rich-timeline-lay",
  "agent_model": "opus",
  "files_touched": ["src/frontend/src/app/feed/page.tsx"],
  "created_at": "2026-03-02T06:36:09Z",
  "started_at": null,
  "completed_at": null,
  "agent_pid": null,
  "error": null,
  "review_feedback": null
}
```

Compare that to task 1 from the same feature (seed data enrichment):

```json
{
  "id": "1",
  "title": "Enrich seed feed event metadata with actor fields",
  "agent_model": "sonnet",
  "files_touched": [
    "src/backend/app/seed/feed_events.py",
    "src/backend/tests/test_seed_feed_events.py"
  ],
  "depends_on": []
}
```

Task 3 got `opus`. Task 1 got `sonnet`. Task 3 depends on task 2. Task 1 depends on nothing. These fields control how SPEED schedules, executes, and merges the work.

## Field Reference

Every field in the task JSON falls into one of three categories: set by the Architect during planning, set by the orchestrator during execution, or set by the Reviewer after completion.

### Set by the Architect (during `speed plan`)

| Field | Type | Purpose |
|-------|------|---------|
| `id` | string | Sequential identifier within the feature. Tasks run in waves determined by dependency order, not ID order. |
| `title` | string | Short imperative description. Appears in logs, status output, and branch names. |
| `description` | string | Full work order for the Developer agent. Includes file paths, function signatures, exact behavior, and edge cases. The Architect writes these as if briefing a contractor who has never seen the codebase. |
| `acceptance_criteria` | string | Checkable conditions the Developer must satisfy. Each criterion has a `verify_by` tag: `test`, `lint`, `manual`, or `file_exists`. The quality gates use these tags to determine which automated checks to run. |
| `depends_on` | string[] | IDs of tasks that must complete before this one starts. SPEED uses this to build execution waves and to trigger deferred merges (see [Merge Timing](#merge-timing)). |
| `agent_model` | string | Which model tier the Developer agent should use: `sonnet`, `opus`, or `haiku`. |
| `files_touched` | string[] | Predicted list of files this task will create or modify. |
| `branch` | string | Git branch name, auto-generated from the feature name and task title. Truncated to fit git's limits. |

### Set by the Orchestrator (during `speed run`)

| Field | Type | Purpose |
|-------|------|---------|
| `status` | string | Lifecycle state: `pending` → `running` → `done` (or `failed`). |
| `started_at` | ISO timestamp | When the Developer agent was spawned. |
| `completed_at` | ISO timestamp | When the agent finished (success or failure). |
| `agent_pid` | number | OS process ID of the running Developer agent. Used for timeout detection and cleanup. |
| `error` | string or null | Error message if the task failed. |
| `decisions` | string[] | Choices the Developer agent made during implementation that weren't prescribed by the task description. Captured from the agent's structured output. |
| `concerns` | string[] | Issues the Developer flagged for downstream tasks or human review. |

### Set by the Reviewer (during `speed review`)

| Field | Type | Purpose |
|-------|------|---------|
| `review_feedback` | string or null | Structured feedback from the Reviewer agent. |
| `review_verdict` | string | `approve` or `request_changes`. A `request_changes` verdict resets the task to `pending` for re-execution. |

## How `agent_model` Works

The Architect assigns a model tier based on its assessment of task complexity. The instruction is explicit: default to `sonnet`, use `opus` only for architecturally complex tasks.

In the F10 Rich Feed plan:

| Task | Model | Rationale |
|------|-------|-----------|
| 1. Enrich seed metadata | sonnet | Mechanical: add fields to existing dicts |
| 2. Feed utility functions | sonnet | Isolated functions with clear specs |
| 3. Replace EventCard with timeline | opus | Rewrites an entire page with 6 inline components, 4 visual types, accessibility requirements, hover states |
| 4. Write integration tests | opus | Must understand the full component tree to write meaningful tests |

The seed onboarding defect had one task and got `sonnet`. Adding a field to a dict and writing a regression test doesn't need Opus-level reasoning.

### Escalation

If a Developer agent times out on `sonnet`, the orchestrator automatically retries with `opus`. The task JSON tracks this via `retry_count` and `timeout_count`. Escalation is a safety net, not a planning tool. If the Architect's model assignment is consistently wrong (sonnet tasks timing out), the Architect's prompt or the task granularity needs adjustment.

### Cost Implications

Model selection directly affects execution cost and speed. Sonnet is faster and cheaper. Opus handles more complex reasoning. The Architect's job is to push as many tasks as possible to sonnet while flagging the genuinely hard ones for opus. A plan where every task gets opus suggests the tasks aren't decomposed finely enough.

## How `files_touched` Works

The Architect predicts which files each task will create or modify. The prediction is based on the spec's File Impact section, the Architect's knowledge of the codebase (injected into its context), and the task's description.

### Parallel Safety

No two parallel tasks may declare overlapping files. If tasks 2 and 3 both need to modify `page.tsx`, the Architect must add a dependency edge between them. The orchestrator enforces this at runtime: before spawning a Developer agent, it checks the `files_touched` arrays of all currently running tasks for conflicts.

```
Task 2: files_touched: ["feed-utils.ts", "feed-utils.test.ts"]
Task 3: files_touched: ["page.tsx"]           depends_on: ["2"]
```

Task 3 depends on task 2, so they never run simultaneously. If the Architect had made them parallel with overlapping files, the orchestrator would refuse to start the second task until the first completes.

### Scope Awareness

The Developer agent receives `files_touched` as part of its context. The orchestrator loads the actual file contents from the worktree and injects them into the agent's prompt, so the Developer starts with full knowledge of every file it's expected to modify.

`files_touched` is a declaration of intent, not a hard constraint. A Developer agent can read any file in the repository for context. But writing outside the declared scope risks merge conflicts with other tasks and will be flagged during coherence checking.

### When Predictions Are Wrong

The Architect can be wrong. A task might need to touch a file that wasn't predicted (importing a shared utility, updating a test fixture). The Developer agent handles this at implementation time. The coherence checker catches cross-task conflicts after the fact. In practice, the Architect's predictions are accurate for well-written specs with explicit File Impact sections. Vague specs produce vague file predictions.

## Merge Timing

When a task completes, its branch doesn't necessarily merge to `main` immediately. SPEED uses **deferred dependency merges**: a branch merges to `main` only when another task that depends on it is about to start.

```
Task 1 (done, no dependents) ──── stays on branch until integrate
Task 2 (done, task 3 depends on it) ──── merged when task 3 starts
Task 3 (done, task 4 depends on it) ──── merged when task 4 starts
Task 4 (done, no dependents) ──── stays on branch until integrate
```

Leaf tasks (nothing depends on them) wait for `speed integrate` to merge. For single-task features or backend-only tasks with no downstream consumers, the branch sits unmerged through `review` and `coherence`, then merges during `integrate`.

The `coherence` step accounts for this by diffing each task branch against `main` using `git diff main...branch` (three-dot syntax), which shows changes on the branch relative to the merge base regardless of merge status.

## Lifecycle

A task moves through these states:

```
pending ──→ running ──→ done ──→ (merged via integrate)
              │
              ├──→ failed ──→ (retry with --task-id)
              │
              └──→ timeout ──→ (auto-escalate model, retry)
```

After `speed review`, a `done` task with `review_verdict: "request_changes"` resets to `pending` and re-runs with the reviewer's feedback injected into the Developer's context.

## The Planning Flow

The Architect doesn't work in isolation. Three stages run sequentially during `speed plan`:

**Guardian gate** checks product vision alignment before any decomposition. Can flag or block.

**Structural audit** validates that the spec has all required sections, acceptance criteria, and cross-references.

**Architect decomposition** reads the spec (plus cross-referenced specs via `--specs-dir`), the codebase conventions from CLAUDE.md, and the actual source files to produce the task DAG and a data model contract.

The contract is a separate artifact listing every entity the tasks collectively produce: constants, functions, components, test files, API fields. The coherence checker uses the contract to verify that independently-developed branches compose into a working whole.

## Worked Example: One Task vs. Seven

The seed onboarding defect produced one task because the fix is one line in one file, plus a regression test in a second file. No dependency graph needed, no parallel safety concerns, no cross-task interfaces.

F9 Profile Completeness produced seven tasks because the feature spans backend resolvers, GraphQL types, three React components, and two page integrations. The Architect structured them into three waves of parallelism with explicit dependency edges, file ownership boundaries, and a 9-entity contract.

The task count isn't a quality metric. A plan with fewer tasks isn't better or worse than one with more. The Architect's job is to find the decomposition that maximizes parallel execution while keeping each task small enough for a single Developer agent to complete within the model's context window and timeout limits.
