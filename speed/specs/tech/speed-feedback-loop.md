# RFC: SPEED Feedback Loops

> See [product spec](../product/speed-feedback-loop.md) for product context.
> Depends on: Existing SPEED pipeline (`speed/speed`, `gates.sh`, `grounding.sh`, `developer.md`)

## `speed gates` CLI Command

### Command signature

```bash
./speed/speed gates --task <id> [--fast | --full] [--worktree <path>]
```

| Flag | Default | Description |
|------|---------|-------------|
| `--task <id>` | required | Task ID — used to resolve subsystem from `files_touched` and locate the task's worktree |
| `--fast` | (default) | Lint + typecheck only. Skips tests. |
| `--full` | | Lint + typecheck + tests. |
| `--worktree <path>` | auto-resolved | Override worktree path. If omitted, resolved from `${WORKTREES_DIR}/task-${task_id}`. Falls back to `${PROJECT_ROOT}`. |

### `cmd_gates()` implementation

Added to `speed/speed` alongside other `cmd_*()` functions. Reuses existing gate infrastructure — no new gate logic.

```
cmd_gates()
├── _require_feature "$GLOBAL_FEATURE"  # standard pattern — resolves TASKS_DIR, LOGS_DIR, WORKTREES_DIR
├── Parse flags: --task, --fast/--full, --worktree
├── Resolve worktree path:
│   └── --worktree flag > ${WORKTREES_DIR}/task-${id} > ${PROJECT_ROOT}
├── _detect_subsystem(task_id)          # existing function in gates.sh
├── If --fast:
│   ├── gate_syntax_check(task_id, worktree_path)
│   ├── gates_get_config("lint", subsystem)     → gate_run_command() for each
│   └── gates_get_config("typecheck", subsystem) → gate_run_command() for each
├── If --full:
│   └── gates_run(task_id, worktree_path)       # existing function — runs grounding + all quality gates
├── Print results (reuses existing gate output format)
└── Exit code: 0 = all pass, 1 = any fail
```

Key design decisions:
- `--fast` is the default because agents call it frequently (after each file group). Fast must be cheap.
- `--full` delegates to `gates_run()` directly — no parallel code path. One source of truth for what "all gates pass" means.
- `--fast` does NOT run grounding gates (those check branch diffs, which aren't meaningful mid-task before the final commit).
- Follows the standard `_require_feature "$GLOBAL_FEATURE"` pattern. The task message template includes `-f <feature>` so the Developer Agent passes the feature context when calling `speed gates`.

### Machine-readable output

Gate results are printed to stderr (human-readable, same format as post-hoc gates). The exit code is the machine-readable signal:

- Exit 0 → all gates passed
- Exit 1 → one or more gates failed

The agent reads the exit code to decide whether to proceed or fix. Detailed output goes to log files via `gate_run_command()` (existing behavior).

### Subsystem detection

Reuses `_detect_subsystem()` from `gates.sh`:
1. Reads `files_touched` from `${TASKS_DIR}/${task_id}.json`
2. Matches against `TOML_SUBSYSTEMS` (if configured) or hardcoded prefixes (`src/frontend/*`, `src/backend/*`, `src/plugins/*`)
3. Returns `"frontend"`, `"backend"`, `"plugin"`, or `"both"`

This determines which gate commands from CLAUDE.md's `## Quality Gates` section are executed.

### Worktree support

`cmd_gates()` resolves the worktree path and passes it to `gate_run_command()` as the `gate_cwd` argument. The existing `gate_run_command()` already supports this:
- It `cd`s into `gate_cwd` before running commands
- It activates venv/node_modules relative to the target directory
- Syntax check reads files from the worktree path

No changes needed in `gate_run_command()`.

## Developer Agent Prompt Enhancement

### New section in `developer.md`

Replace the current vague "Write tests" instruction (step 3 bullet under "Implement incrementally") with an explicit "Quality Checks" section:

```markdown
## Quality Checks

Run quality gates iteratively as you work. Do not wait until the end.

### After writing each group of files:
```
./speed/speed gates -f {feature_name} --task {task_id} --fast
```
This runs lint + typecheck for your subsystem. Fix any errors before continuing.

### Before declaring done:
```
./speed/speed gates -f {feature_name} --task {task_id} --full
```
This runs lint + typecheck + tests. All gates must pass before you output your completion JSON.

### If gates fail:
1. Read the error output
2. Fix the issue in your code
3. Re-run the gate
4. Do not declare done until gates pass

Do NOT skip these checks. Your output log is audited for gate invocations.
```

The `{task_id}` placeholder is filled by `cmd_run()` when building the task message (see below).

### Task message template update in `cmd_run()`

The `agent_message` variable in `cmd_run()` (around line 1402 in `speed/speed`) is updated to include the task ID for gate commands:

Current:
```
### Git Branch
You are working on branch: `${branch}`
You are already on this branch in an isolated worktree. Do NOT run git checkout.
Commit your work to this branch.${extra_context}

### Working Directory
${worktree_path}
```

Updated:
```
### Git Branch
You are working on branch: `${branch}`
You are already on this branch in an isolated worktree. Do NOT run git checkout.
Commit your work to this branch.${extra_context}

### Quality Checks
Run gates iteratively as you work:
- After each group of files: `./speed/speed gates -f ${feature_name} --task ${task_id} --fast`
- Before declaring done: `./speed/speed gates -f ${feature_name} --task ${task_id} --full`
All gates must pass before you output your completion JSON.

### Working Directory
${worktree_path}
```

This puts copy-pasteable commands directly in the task message. The agent doesn't need to construct them.

## Grounding Gate: Test File Coverage

### `grounding_check_test_coverage()`

Added to `speed/lib/grounding.sh`. Runs as part of `grounding_run()`.

**Logic:**

1. Get the branch diff: `git diff main...<branch> --name-only`
2. Filter to new files only (files that don't exist on main): `git diff main...<branch> --diff-filter=A --name-only`
3. Filter to source files that should have tests (see inclusion/exclusion below)
4. For each source file, check if a corresponding test file exists in the diff
5. If any source file is missing its test counterpart → hard failure

**Source-to-test file mapping:**

| Source file | Expected test file |
|------------|-------------------|
| `src/frontend/components/features/widget.tsx` | `src/frontend/components/features/widget.test.tsx` |
| `src/frontend/hooks/use-auth.ts` | `src/frontend/hooks/use-auth.test.ts` |
| `src/backend/app/models/user.py` | `src/backend/app/models/user_test.py` or `tests/test_user.py` |
| `src/backend/app/graphql/mutations/tribe.py` | Co-located `*_test.py` or `tests/test_*.py` |

Rule: same directory, same base name with `.test.{ext}` suffix (frontend) or `_test.py` / `test_*.py` (backend). Backend also checks `tests/test_<basename>.py` for the `tests/` directory convention.

**Exclusion patterns (files that don't require tests):**

Source files matching these patterns are skipped:

```
# Config and setup
**/vitest.config.*
**/next.config.*
**/tailwind.config.*
**/.eslintrc.*
**/tsconfig.*
**/setup.ts
**/setup.js

# Type definitions
**/*.d.ts
**/types.ts
**/types/*.ts

# Barrel exports / re-exports
**/index.ts
**/index.tsx

# CSS and assets
**/*.css
**/*.svg
**/*.png
**/*.jpg

# Migrations
**/alembic/**
**/migrations/**

# GraphQL schema (types, not mutations/queries)
**/graphql/types/**

# Test utilities (not themselves tested)
**/test/**
**/tests/**
**/__tests__/**
**/*.test.*
**/*_test.*

# Seed data
**/seed/**

# Layout components (thin wrappers, tested via integration)
**/layout.tsx
**/loading.tsx
**/error.tsx
**/not-found.tsx

# Next.js route segments
**/page.tsx
**/route.ts
```

These patterns are derived from the project conventions in CLAUDE.md:
- `src/frontend/components/ui/` — shadcn primitives, not custom-tested
- `src/frontend/src/test/setup.ts` — test infrastructure
- `src/backend/app/seed/` — seed data
- Alembic migrations — tested by the migration tool itself

**Implementation sketch:**

```bash
grounding_check_test_coverage() {
    local task_id="$1"
    local task_json="${TASKS_DIR}/${task_id}.json"
    local branch
    branch=$(jq -r '.branch // empty' "$task_json")

    # Get newly added files (not modified — only new files need new tests)
    local new_files
    new_files=$(_git diff "$(git_main_branch)...${branch}" --diff-filter=A --name-only 2>/dev/null)

    [[ -z "$new_files" ]] && return 0

    local missing=()

    while IFS= read -r f; do
        [[ -z "$f" ]] && continue

        # Skip excluded patterns
        _test_coverage_excluded "$f" && continue

        # Skip test files themselves
        [[ "$f" == *.test.* ]] && continue
        [[ "$f" == *_test.py ]] && continue
        [[ "$f" == */test_*.py ]] && continue

        # Check for corresponding test file in the diff
        if ! _test_file_exists_in_diff "$f" "$new_files"; then
            missing+=("$f")
        fi
    done <<< "$new_files"

    if [[ ${#missing[@]} -gt 0 ]]; then
        log_error "New source files missing test coverage:"
        for f in "${missing[@]}"; do
            log_error "  ${f}"
        done
        return 1
    fi

    return 0
}
```

**Helper: `_test_coverage_excluded()`**

Checks a file path against the exclusion patterns above. Returns 0 (true) if excluded, 1 if the file should have a test.

**Helper: `_test_file_exists_in_diff()`**

Given a source file and the full diff file list, checks if a matching test file exists:
1. Extract base name and extension
2. Generate expected test file names (co-located `.test.{ext}`, `_test.py`, `tests/test_*.py`)
3. Check if any expected name appears in the diff file list

### Integration into `grounding_run()`

Added as a new check in `grounding_run()` after the existing 5 checks:

```bash
# Check 6: Test file coverage (new source files must have tests)
if grounding_check_test_coverage "$task_id"; then
    results+=("${COLOR_SUCCESS}${SYM_CHECK} Test file coverage${RESET}")
else
    results+=("${COLOR_ERROR}${SYM_CROSS} New source files missing test coverage${RESET}")
    all_passed=false
fi
```

This is a **hard failure** — same severity as "empty diff" or "missing declared files."

## Grounding Gate: Gate Invocation Evidence

### `grounding_check_gate_evidence()`

Added to `speed/lib/grounding.sh`. Runs as part of `grounding_run()`.

**Logic:**

1. Read the agent output log: `${LOGS_DIR}/${task_id}.log`
2. Search for evidence that the agent ran `speed gates`
3. Evidence markers: the gate output format printed by `gates_run()` / `gate_run_command()`:
   - `"Quality Gates:"` (the header printed by `gates_run()`)
   - `"Running quality gates for task"` (the log line from `gates_run()`)
   - `"speed gates"` (the command itself in the agent's bash history)
4. If none of these markers appear in the log → check fails

**Severity: warning (initially).**

This gate starts as a warning, not a hard failure. Rationale:
- Need to verify agents actually comply with the new prompt instructions before making it blocking
- Existing tasks in-flight when this ships won't have the new prompt
- After confirming >80% compliance across a batch of runs, promote to hard failure

**Implementation sketch:**

```bash
grounding_check_gate_evidence() {
    local task_id="$1"
    local output_file="${LOGS_DIR}/${task_id}.log"

    if [[ ! -f "$output_file" ]]; then
        return 1  # No output = can't verify
    fi

    # Look for evidence of gate invocation in agent output
    if grep -q "Quality Gates:" "$output_file" 2>/dev/null || \
       grep -q "Running quality gates for task" "$output_file" 2>/dev/null || \
       grep -q "speed gates" "$output_file" 2>/dev/null; then
        return 0  # Evidence found
    fi

    return 1  # No evidence
}
```

### Integration into `grounding_run()`

Added as Check 7, after test file coverage:

```bash
# Check 7: Gate invocation evidence (agent should have run gates mid-task)
if grounding_check_gate_evidence "$task_id"; then
    results+=("${COLOR_SUCCESS}${SYM_CHECK} Gate invocation evidence${RESET}")
else
    results+=("${COLOR_WARN}${SYM_WARN} No evidence of mid-task gate invocation${RESET}")
    # Warning only — does not set all_passed=false
    # TODO: Promote to hard failure after rollout stabilizes
fi
```

Note: this intentionally does NOT set `all_passed=false`. It's a warning like the scope check (exit code 2 pattern). The warning is visible in output and logged, but doesn't block the task.

## Plan Verification Feedback Loop

### Problem: `cmd_verify()` is broken in three ways

1. **Parser bug**: `cmd_verify()` (line 817) calls `_require_json()` directly on raw agent output. `_require_json()` does a bare `jq empty` check. But the Plan Verifier agent often wraps its JSON in markdown — `---` separators, `**Summary**` text, code fences. The parser fails and reports "invalid JSON" even though the verification succeeded. Meanwhile, `parse_agent_json()` in `provider.sh` already handles code-fence extraction and brace scanning — it just isn't called.

2. **Raw dump as feedback**: `cmd_verify()` does `echo "$verify_output"` (line 809) — dumps the entire agent output verbatim. The verification report has structured fields (`critical_failures`, `recommendations`, `spec_requirements` with statuses) but none are formatted for human consumption.

3. **Dead end on failure**: When `status == "fail"`, the user gets a generic "fix the spec or re-run speed plan" message (lines 831-834). The verifier knows *exactly* what's wrong — which task, which field, what the spec says vs. what the plan says — but this information is not presented actionably. There's no path from the finding to the fix.

### Fix 1: Robust JSON extraction

Replace `_require_json` with `parse_agent_json` in `cmd_verify()`:

```bash
# Current (line 817):
if ! _require_json "Plan Verifier" "$verify_output"; then

# Updated:
verify_json=$(parse_agent_json "$verify_output") || {
    log_error "Plan Verifier returned unparseable output"
    log_error "Review raw output: ${LOGS_DIR}/plan-verification.log"
    exit 1
}
```

This handles JSON wrapped in markdown, code fences, or surrounding prose — the same extraction that already works for the Supervisor, Guardian, and Coherence Checker agents.

### Fix 2: Human-readable verification report

New function `_print_verify_report()` formats the structured JSON into the same visual style as `gates_run()`:

```
cmd_verify()
├── ...existing setup...
├── parse_agent_json(verify_output)
├── _print_verify_report(verify_json)      # NEW
│   ├── Core question: ✓ answerable / ✗ not answerable
│   ├── Spec requirements: "24 of 25 covered"
│   │   └── For each non-covered requirement:
│   │       ├── ✗ requirement text (status: missing/drifted/partial)
│   │       └── "  Spec says: X | Plan says: Y | Task: N"
│   ├── Semantic drift: (if any)
│   │   └── ⚠ "spec_term" → "plan_term": risk
│   ├── Critical failures: (if any)
│   │   └── ✗ description
│   │       └── "  Spec: spec_reference | Gap: plan_gap"
│   ├── Recommendations: (if any)
│   │   └── → recommendation text
│   └── Summary line: "N critical, M warnings, K recommendations"
└── ...fix loop or exit...
```

Output uses the existing color/symbol constants from `colors.sh`: `COLOR_SUCCESS`/`SYM_CHECK` for covered requirements, `COLOR_ERROR`/`SYM_CROSS` for critical failures, `COLOR_WARN`/`SYM_WARN` for drift/partial, `COLOR_DIM` for contextual details.

### Fix 3: Automatic verify → fix → re-verify loop

When verification finds fixable issues, `cmd_verify()` enters an automatic correction loop instead of dumping the report and exiting.

```
cmd_verify()
├── Run Plan Verifier → parse JSON → print report
├── If status == "pass": done
├── If status == "fail":
│   ├── Classify each issue: auto-fixable or needs-human
│   ├── If all issues need human judgment: print actionable guidance, exit
│   ├── If some issues are auto-fixable:
│   │   ├── Spawn Fix Agent with:
│   │   │   ├── Verification report (the JSON)
│   │   │   ├── Task files (from TASKS_DIR)
│   │   │   └── Scoped instruction: "Fix ONLY the listed issues"
│   │   ├── Fix Agent edits task JSON files
│   │   ├── Re-run Plan Verifier
│   │   ├── If pass → print "PASSED (N issues auto-fixed)" + fix summary
│   │   ├── If same issues persist → human escalation (fix didn't work)
│   │   ├── If new issues → one more iteration
│   │   └── Cap at MAX_VERIFY_FIX_ITERATIONS (3)
│   └── Print summary of all auto-applied fixes
```

### Fix Agent

The Fix Agent is not a new agent definition — it's an inline `claude_run()` call within `cmd_verify()`, similar to how `cmd_plan()` runs the Architect inline. No separate `.md` file.

**Model:** `MODEL_SUPPORT` (sonnet) — these are mechanical edits, not reasoning tasks.

**Tools:** `AGENT_TOOLS_WRITE` (`Read Write Glob`) — needs to read task files, write edits, find files. No Bash or Edit access.

**Prompt template:**

```
## Verification Failures

${verify_json}

## Task Files

Directory: ${TASKS_DIR}/
Files: ${task_file_list}

## Instructions

Apply ONLY the fixes described in the critical_failures and recommendations above.
For each fix:
1. Read the task JSON file
2. Find the specific field that needs changing
3. Rewrite it using the Write tool
4. Do NOT change anything else in the task file

If a fix is ambiguous — multiple valid approaches, or the issue describes a design
decision rather than a factual error — do NOT fix it. Instead, output it in your
"needs_human" list.

## Output

{
  "fixes_applied": [
    {
      "task_id": "1",
      "file": ".speed/features/speed-audit/tasks/1.json",
      "field": "description",
      "before": "> 10 tasks",
      "after": "> 8 tasks",
      "reason": "L4 sizing threshold: spec says > 8, plan said > 10"
    }
  ],
  "needs_human": [
    {
      "task_id": "2",
      "issue": "Architect RFC review output format — spec says { approved, issues } but plan maps to existing validation severity. Both are valid.",
      "options": ["Use spec's { approved, issues } format", "Keep existing validation severity mapping"]
    }
  ]
}
```

### Human escalation format

When the Fix Agent reports `needs_human` items, or when auto-fix fails, `cmd_verify()` prints actionable guidance:

```
Cannot auto-fix — requires your judgment:

  Task 2 (.speed/features/speed-audit/tasks/2.json):
    Issue: Architect RFC review output format drifted from spec
    Spec says: "{ approved: true/false, issues: [...] } format"
    Plan says: "validation array with severity: critical"
    Options:
      1. Use spec's format (edit Task 2 description)
      2. Keep plan's approach (functionally equivalent)

After fixing, run: speed verify
```

This gives the operator everything they need: which file, what's wrong, what the choices are, and what to do next.

### Iteration cap and convergence

- `MAX_VERIFY_FIX_ITERATIONS=3` — hard cap to prevent infinite loops
- Convergence detection: if re-verification finds the *same* critical failures after a fix attempt, the Fix Agent failed. Stop and escalate rather than retrying the same fix.
- New issues (not in the previous report) get one more fix iteration. This handles cascading fixes where fixing issue A reveals issue B.

### Constants

```bash
MAX_VERIFY_FIX_ITERATIONS=3    # max fix → re-verify cycles
```

Added to `config.sh` alongside existing orchestration tuning constants.

## Command registration

Add `gates` to the command dispatch in `speed/speed`:

```bash
# In the main case statement:
gates)    shift; cmd_gates "$@" ;;
```

Add to help text:

```
gates       Run quality gates for a task (used by Developer Agent mid-task)
```

## Files Changed

| File | Change |
|------|--------|
| `speed/speed` | Add `cmd_gates()`. Rewrite `cmd_verify()`: use `parse_agent_json()`, add `_print_verify_report()`, add auto-fix loop with Fix Agent, add human escalation output. Update command dispatch and help text for `gates`. Update `agent_message` template in `cmd_run()` to include gate commands. |
| `speed/agents/developer.md` | Replace vague "write tests" instruction with explicit "Quality Checks" section containing copy-pasteable `speed gates` commands |
| `speed/lib/grounding.sh` | Add `grounding_check_test_coverage()`, `_test_coverage_excluded()`, `_test_file_exists_in_diff()`, `grounding_check_gate_evidence()`. Update `grounding_run()` to include checks 6 and 7. |
| `speed/lib/config.sh` | Add `MAX_VERIFY_FIX_ITERATIONS=3` constant |

No new files created. All changes are modifications to existing files.

## Dependencies

- `speed/lib/gates.sh` — `gates_run()`, `_detect_subsystem()`, `gates_get_config()`, `gate_run_command()`, `gate_syntax_check()` (all existing, no modifications)
- `speed/lib/grounding.sh` — `grounding_run()` (modified to add checks 6-7)
- `speed/lib/provider.sh` — `parse_agent_json()` (existing, used by new `cmd_verify()`), `claude_run()` (existing, used for Fix Agent)
- `speed/agents/developer.md` — prompt text (modified)
- `speed/agents/plan-verifier.md` — existing agent (no modifications; output consumed by new formatting logic)
- `speed/lib/config.sh` — `TASKS_DIR`, `WORKTREES_DIR`, `LOGS_DIR`, `PROJECT_ROOT` (existing), `MAX_VERIFY_FIX_ITERATIONS` (new)
- `CLAUDE.md` — gate commands read by `gates_get_config()`, file organization conventions inform exclusion patterns (read only)
