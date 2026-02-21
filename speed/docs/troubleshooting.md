# Troubleshooting SPEED

Organized by what you see, not what went wrong internally. Find the symptom, follow the fix.

## Exit Codes

| Code | Name | Meaning | First thing to check |
|------|------|---------|---------------------|
| 0 | `EXIT_OK` | Success | — |
| 1 | `EXIT_TASK_FAILURE` | One or more tasks failed | `speed status` for failed task IDs, then check task logs |
| 2 | `EXIT_GATE_FAILURE` | Quality gates failed | Gate output in task log — usually lint or test errors |
| 3 | `EXIT_CONFIG_ERROR` | Bad config, missing binary, missing file | Check `speed.toml`, `CLAUDE.md`, and agent CLI installation |
| 4 | `EXIT_MERGE_CONFLICT` | Integration merge conflict | `git status` on the integration branch |
| 5 | `EXIT_HALTED` | >30% of tasks failed, supervisor halted | Systemic issue — check if a foundational task failed |
| 130 | `EXIT_USER_ABORT` | Ctrl+C | Intentional — use `speed recover` to clean up |

## Common Problems

### "Agent timed out"

**What you see:** Task stuck at "running" then marked failed with timeout error.

**Causes:**
- Agent is looping or stuck on a complex task
- Network issues with the AI provider
- Task scope is too large for the timeout window

**Fixes:**
1. Check the timeout setting: `speed.toml` → `agent.timeout` (default: 600 seconds)
2. Increase timeout for complex tasks: `SPEED_TIMEOUT=900 ./speed/speed run`
3. If the task is genuinely too large, consider splitting the spec into smaller features
4. Retry with model escalation: `./speed/speed retry --task-id <ID> --escalate`

### "Quality gates failed"

**What you see:** Exit code 2. Task completed but failed grounding or quality gates.

**Causes:**
- Lint errors in generated code
- Type errors (TypeScript `tsc --noEmit` failures)
- Test failures
- Generated files don't match declared file list

**Fixes:**
1. Check which gate failed — the task log shows the exact gate output
2. For lint errors: often fixable with `--escalate` retry (better model = cleaner code)
3. For type errors: check if the task depends on types from another task that hasn't merged yet
4. For scope check failures: the agent touched files outside its declared scope — retry or adjust the plan
5. For test failures: check if tests depend on code from other tasks

### "Agent reported blocked"

**What you see:** Task status is "blocked" with a reason message.

**What it means:** The developer agent determined it couldn't complete the task without additional information or a dependency that isn't met.

**Fixes:**
1. Read the blocked reason in `speed status` or the task JSON
2. If it's a dependency issue: check if the blocking task has completed
3. If it's an ambiguity: update the spec with more detail and retry
4. Retry with context: `./speed/speed retry --task-id <ID> --context "clarification here"`

### "Grounding checks failed"

**What you see:** Task failed at the grounding gate stage, not at quality gates.

**Grounding checks are non-LLM verification:**
- **Empty diff:** Agent ran but produced no code changes
- **Missing files:** Declared output files don't exist
- **Scope violation:** Agent modified files outside its declared scope
- **Import errors:** Python AST check found broken imports

**Fixes:**
1. Empty diff: the agent may have misunderstood the task — retry with `--context`
2. Missing files: check if the file path in the task plan matches project conventions
3. Scope violation: usually means the task needs to declare additional files — adjust the plan
4. Import errors: check if the import target exists (may depend on another task)

### "Architect produced 0 tasks"

**What you see:** `speed plan` completes but generates no tasks.

**Causes:**
- Spec is too vague — no concrete features or acceptance criteria
- Spec file is empty or has formatting issues
- Spec path is wrong (file not found, but no error shown)

**Fixes:**
1. Verify the spec file exists and has content: `cat specs/tech/your-feature.md`
2. Check that the spec has concrete features, not just overview text
3. Ensure the spec has a data model or API section — the Architect needs something to decompose
4. See [Writing Specs](writing-specs.md) for what makes a good spec

### "Guardian REJECTED"

**What you see:** The Product Guardian gate rejected the plan or the code.

**What it means:** The Guardian compared the work against the product vision (`overview.md`) and found a conflict — scope creep, anti-goal violation, or persona mismatch.

**Fixes:**
1. Read the Guardian's rejection reason — it quotes the specific vision statement being violated
2. If the feature is intentional: update the vision file to include it, then re-run
3. If the feature is accidental scope creep: remove it from the spec
4. To skip Guardian checks temporarily: `SKIP_GUARDIAN=true ./speed/speed run`

### "Contract check FAILED"

**What you see:** Integration stage fails with a schema contract mismatch.

**What it means:** The Architect declared a data model contract (tables, columns, FKs), and the integrated code doesn't match it.

**Fixes:**
1. Check which table or column is missing/mismatched
2. Common cause: a developer agent used a different column name than the contract specifies
3. Fix the code to match the contract, or update the contract if the deviation was intentional
4. Re-run integration: `./speed/speed integrate`

### "Circular dependency detected"

**What you see:** `speed plan` or `speed run` reports a circular dependency in the task graph.

**Causes:**
- The Architect created tasks that depend on each other (A→B→A)
- Usually caused by bidirectional relationships in the spec that the Architect over-decomposes

**Fixes:**
1. Examine the task graph: `./speed/speed status`
2. Merge the circular tasks into one (edit the task JSON files in `.speed/tasks/`)
3. Or re-run `speed plan` — the Architect may produce a different decomposition
4. If the spec genuinely has circular dependencies, restructure it

### "Merge conflict during integration"

**What you see:** Exit code 4. Integration stopped at a merge conflict.

**Causes:**
- Two tasks modified the same file in incompatible ways
- Usually happens when task file scopes overlap

**Fixes:**
1. Check which files conflict: `git status`
2. Resolve the conflict manually, then continue: `./speed/speed integrate`
3. To prevent: ensure task file declarations don't overlap significantly
4. The Coherence Checker should catch most of these before integration — run `./speed/speed coherence` first

## Log File Locations

| Log | Location | Contains |
|-----|----------|----------|
| Task plan | `.speed/plan.json` | Full task DAG from the Architect |
| Task state | `.speed/tasks/<id>.json` | Individual task status, output, errors |
| Agent logs | `.speed/logs/task-<id>.log` | Full agent conversation for a task |
| Grounding results | `.speed/logs/grounding-<id>.log` | Non-LLM gate check output |
| Gate results | `.speed/logs/gates-<id>.log` | Quality gate (lint, test) output |
| Integration log | `.speed/logs/integrate.log` | Merge operations and contract checks |
| Guardian log | `.speed/logs/guardian.log` | Product Guardian assessments |

## Recovery Workflows

### After a crash or Ctrl+C

```bash
# Clean up stale state (orphaned branches, PID files)
./speed/speed recover

# Check what state things are in
./speed/speed status

# Resume from where it stopped
./speed/speed run
```

### Starting over completely

```bash
# Remove all SPEED state (keeps specs and code)
rm -rf .speed/

# Re-plan from scratch
./speed/speed plan specs/tech/your-feature.md --specs-dir specs/
```

### Retrying a specific task

```bash
# Retry with the same model
./speed/speed retry --task-id 3

# Retry with a better model
./speed/speed retry --task-id 3 --escalate

# Retry with human guidance
./speed/speed retry --task-id 3 --context "use the existing User model, don't create a new one"
```

### Escalating the model

If a task keeps failing with the default model, escalate:

```bash
./speed/speed retry --task-id <ID> --escalate
```

This upgrades the developer agent to the planning model (typically `opus`), which is slower but handles complex tasks better.

## FAQ

### Can I edit task files directly?

Yes. Task state lives in `.speed/tasks/<id>.json` as plain JSON. You can edit status, dependencies, file lists, or descriptions. SPEED reads these files fresh on each command.

### Can I run multiple features in parallel?

Not currently. SPEED manages one feature (task DAG) at a time. Run features sequentially, or use separate working directories.

### What if an agent is over-engineering?

This usually means the spec is under-specified. Agents fill ambiguity with reasonable-sounding complexity. Fix the spec:
1. Add an "Out of scope" section
2. Add explicit "Won't have" items to the vision
3. Make acceptance criteria more specific
4. Re-plan with the updated spec

### Why did the agent create files I didn't expect?

Check the task's declared file list vs. what it actually created. If the agent created extra files, it may have interpreted the spec broadly. Add scope constraints to the spec or task description.

### How do I see what's happening inside an agent?

```bash
# Verbose mode shows gate output and agent commands
./speed/speed run --verbose

# Debug mode shows internal state, timing, PID tracking
./speed/speed run --debug

# Read the full agent conversation log
cat .speed/logs/task-<id>.log
```
