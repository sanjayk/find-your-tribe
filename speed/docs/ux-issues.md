# SPEED UX Issues Audit

> Identified 2026-02-21. Each issue must be discussed and approved before implementation.
>
> **Context:** These issues were discovered when running `./speed/speed plan speed/specs/tech/speed-templates.md --specs-dir speed/specs/`. The command ran for ~10 minutes with zero visible output, then exited with code 1 and printed nothing. Debugging revealed multiple layers of silence — the provider buffered all output, stderr was captured into a file, errors from config parsing were swallowed, and the auto-derivation bug produced escaped backslash paths that caused spec file lookups to fail silently.

---

## A. Silent Execution (user sees nothing)

### A1: `provider_run()` blocks with zero feedback
- **Location:** `providers/claude-code.sh:97-105`
- **What happens:** `raw_output=$("$_TIMEOUT_CMD" ... "$PROVIDER_BIN" -p ... 2>"$stderr_file") || rc=$?` — the entire shell blocks inside a command substitution. No output, no progress, no indication the agent is running.
- **Observed:** Ran `speed plan` and the terminal went completely silent for 10+ minutes. Had to check `ps aux` externally to confirm something was running. The Bash tool's 2-minute default timeout killed the process before it finished, making the first several attempts produce no output at all.
- **Why it matters:** A user running SPEED for the first time will think it's hung. There's no way to distinguish "agent is working" from "something crashed silently."
- **Status:** Open

### A2: `provider_run_json()` blocks with zero feedback
- **Location:** `providers/claude-code.sh:191-196`
- **What happens:** Same `raw_output=$(...)` pattern as A1. Used by the Architect (plan), Validator, Guardian, Plan Verifier, Coherence Checker — every structured-output agent.
- **Observed:** The Architect agent during `speed plan` is the longest-running call (5-10 min for complex specs). This is the call that caused the full 10-minute silence.
- **Why it matters:** The Architect is typically the first agent a new user encounters. If their first experience is 10 minutes of silence, they won't wait.
- **Status:** Open

### A3: `provider_spawn_bg()` discards startup errors
- **Location:** `providers/claude-code.sh:300`
- **What happens:** The background subshell is wrapped in `(...) >/dev/null 2>&1 &`. If the Claude binary doesn't exist, if the model name is wrong, if there's a permissions error — the outer subshell's startup errors go to `/dev/null`.
- **Observed:** Not directly triggered during the failed run, but inspected during code audit. The inner command's errors DO go to `$output_file`, but the outer subshell's errors (e.g., `cd` failing, `$_TIMEOUT_CMD` not found) are lost.
- **Why it matters:** Background agents (Developer tasks during `speed run`) would fail silently if there's an environment issue. The orchestrator would wait at the poll loop forever.
- **Status:** Open

### A4: Status line uses `\r` carriage return
- **Location:** `speed:1385`
- **What happens:** `echo -ne "\r..."` overwrites the current terminal line to show a live status bar during `speed run`. In a non-TTY environment (CI, piped output, `script` capture), `\r` is literal — it produces garbage. In a TTY, it overwrites any error messages that were printed on the same line.
- **Observed:** Not triggered during `speed plan` (only used in `speed run`'s main loop), but identified during audit. If an agent error is logged and then the status line fires, the error is visually overwritten.
- **Why it matters:** The one place SPEED does show progress actually makes debugging harder by hiding errors.
- **Status:** Open

### A5: Support agents run with no progress indicator
- **Location:** `speed` (Debugger/Supervisor invocations)
- **What happens:** Debugger and Supervisor agents are spawned via `provider_spawn_bg()`. The orchestrator polls for their completion with `kill -0` but prints nothing while waiting. The user sees the main loop status line (A4) but no indication that a support agent is investigating a failure.
- **Observed:** Not triggered during `speed plan` (these agents only run during `speed run` when tasks fail). Identified during audit.
- **Why it matters:** When tasks fail and SPEED kicks off a Debugger, the user has no idea debugging is happening. They see a failed task and might Ctrl+C before the Debugger finishes.
- **Status:** Open

---

## B. Swallowed Errors (failures that disappear)

### B1: TOML config parsing fails silently
- **Location:** `lib/config.sh:31`
- **What happens:** `eval "$(python3 "${LIB_DIR}/toml.py" "$SPEED_TOML" 2>/dev/null)" || true` — if python3 isn't installed, if toml.py has a bug, if the TOML file has syntax errors — all suppressed. The `|| true` means the script continues with default values, never telling the user their config was ignored.
- **Observed:** During the failed run, couldn't determine if `speed.toml` was parsed correctly because errors were suppressed. Had to manually run `python3 speed/lib/toml.py speed.toml` to verify.
- **Why it matters:** A user with a typo in `speed.toml` (wrong model name, bad timeout value) will get default behavior with no warning. They'll think their config is active when it's not.
- **Status:** Open

### B2: 60+ jq parse errors suppressed throughout speed script
- **Location:** `speed` (throughout — 60+ instances)
- **What happens:** Pattern: `value=$(echo "$json" | jq -r '.field' 2>/dev/null)`. If the JSON is malformed, truncated, or the field doesn't exist, `jq` errors go to `/dev/null` and the variable gets empty string or "null".
- **Observed:** During the failed `speed plan` run, the Architect's output was being parsed by multiple `jq` calls. When the output was empty (because the agent timed out), every parse silently produced empty values. No error indicated that the Architect returned nothing.
- **Why it matters:** JSON parsing failures are the most common error path (agent returns unexpected output). Silencing these makes every downstream decision based on garbage data.
- **Status:** Open

### B3: Git operations suppress errors
- **Location:** `lib/git.sh` (throughout)
- **What happens:** Functions like `git_branch_exists`, `git_main_branch`, `git_safe_merge` use `2>/dev/null` on most git calls. If a branch operation fails for an unexpected reason (corrupt index, lock file, permission error), the error is invisible.
- **Observed:** Not directly triggered during the failed run. Identified during audit. Many of these are legitimate (e.g., `rev-parse --verify` is expected to fail for non-existent branches), but the pattern is applied uniformly — even where unexpected failures should surface.
- **Why it matters:** Git state issues are common (stale lock files, detached HEAD, dirty worktrees). Suppressing these errors means SPEED might create branches from the wrong base or fail to merge without explaining why.
- **Status:** Open

### B4: Provider error is unstructured
- **Location:** `lib/provider.sh:127-134`
- **What happens:** If the provider name is invalid, the error is `echo "Error: Unknown provider '${_PROVIDER_NAME}'" >&2` followed by listing available providers. It then calls `exit 1`. No `log_error_block`, no structured error, no suggestion for how to fix.
- **Observed:** Not triggered during the failed run (provider was valid). Identified during audit.
- **Why it matters:** Minor compared to others, but inconsistent with the structured error pattern (`log_error_block`) used elsewhere.
- **Status:** Open

---

## C. Truncated/Lost Output

### C1: Gate failure output truncated, no log path shown
- **Location:** `lib/gates.sh:205-208`
- **What happens:** When a quality gate fails, `gate_run_command()` shows `tail -20 "$log_file"` — only the last 20 lines. The full output is in `$log_file` but the path is never printed. The user sees a truncated error with no way to find the rest.
- **Observed:** Not triggered during the failed `speed plan` run (gates run after `speed run`). But in previous SPEED runs on this project, gate failures showed partial output. Had to manually search `.speed/logs/` to find the full gate log.
- **Why it matters:** Lint/typecheck errors often have the root cause at the top (first error cascades). Showing only the last 20 lines means showing the symptoms, not the cause.
- **Status:** Open

### C2: Debugger sees only tail of agent output
- **Location:** `lib/config.sh:72`
- **What happens:** `AGENT_OUTPUT_TAIL=200` — when a task fails and the Debugger agent is invoked, it receives only the last 200 lines of the Developer agent's output. If the agent produced 1000 lines and the actual error/blocker was at line 50, the Debugger never sees it.
- **Observed:** Not directly triggered. Identified during audit.
- **Why it matters:** The Debugger's effectiveness depends on seeing the failure. Truncating from the top means the Debugger might be diagnosing based on the agent's last actions rather than the actual root cause.
- **Status:** Open

---

## D. Display Breakage

### D1: `\r` status line (duplicate of A4, display-specific angle)
- **Location:** `speed:1385`
- **What happens:** Same as A4 but from the display perspective. In non-TTY: `\r` appears as a literal control character, making the output unreadable. In TTY: `\r` without clearing the full line can leave artifacts from longer previous lines.
- **Observed:** Not triggered during `speed plan`. Would affect `speed run` output when piped to a file or run in CI.
- **Why it matters:** SPEED should produce clean, parseable output regardless of environment. Users running SPEED in CI or capturing output to a file get corrupted output.
- **Status:** Open

### D2: Color TTY detection only checks stdout
- **Location:** `lib/colors.sh:15`
- **What happens:** `[[ -t 1 ]]` checks if stdout is a TTY. If it is, ANSI color codes are enabled globally — including for `log_error`, `log_warn`, and other functions that write to stderr (`>&2`). But stderr might not be a TTY (e.g., `speed plan 2>error.log`).
- **Observed:** Not directly triggered in a way that caused visible issues. Identified during audit.
- **Why it matters:** If a user redirects stderr to a file (`2>error.log`), that file will contain raw ANSI escape codes, making it hard to read.
- **Status:** Open

---

## E. Timeout/Startup

### E1: Missing timeout command not detected until first agent call
- **Location:** `lib/provider.sh:10-15`
- **What happens:** `_TIMEOUT_CMD` is resolved when `provider.sh` is sourced (at startup). If neither `timeout` nor `gtimeout` exists, the variable stays empty. But the error only surfaces when `require_timeout_cmd()` is called inside `provider_run()` or `provider_run_json()` — potentially minutes into a run, after config parsing, spec loading, and grounding checks have already completed.
- **Observed:** Not triggered (timeout exists on the dev machine). Identified during audit.
- **Why it matters:** Fail fast. If a required binary is missing, tell the user immediately at `speed plan`, not 3 minutes in after the Architect prompt is already built.
- **Status:** Open

---

## F. Recovery/Diagnostics

### F1: Merge conflicts reported without detail
- **Location:** `lib/git.sh:248-265` (`git_safe_merge`)
- **What happens:** When `git merge` fails, the function logs `"Merge conflict: ${branch} into ${target}"` and runs `git merge --abort`. It doesn't show which files conflict, what the conflict looks like, or suggest how to resolve it.
- **Observed:** Not triggered during the failed run. Identified during audit.
- **Why it matters:** During `speed integrate`, merge conflicts are expected (multiple task branches modifying shared files). The user needs to know which files and ideally which hunks, not just "there was a conflict."
- **Status:** Open

### F2: Debugger gets truncated agent output
- **Location:** `speed` (debugger invocation)
- **What happens:** Same root cause as C2. The Debugger agent receives `tail -$AGENT_OUTPUT_TAIL` of the failed task's output. Combined with C2's 200-line limit, early output is lost.
- **Observed:** Not directly triggered. Identified during audit.
- **Why it matters:** The Debugger is SPEED's self-healing mechanism. If it can't see the full failure context, its diagnoses and fix suggestions will be wrong, leading to retry loops.
- **Status:** Open

### F3: Agent logs lost on crash
- **Location:** `speed` (agent log writing)
- **What happens:** For `provider_run()` and `provider_run_json()`, agent output is captured into a variable and only written to `$LOGS_DIR/{task_id}.log` after the call completes. If the process is killed (Ctrl+C, OOM, machine crash), the variable's contents are lost. No partial log exists.
- **Observed:** During the failed `speed plan` run, when the Bash tool's 2-minute timeout killed the process, the agent's partial output was lost entirely. There was no log to inspect.
- **Why it matters:** Crash recovery requires understanding what happened. Without logs, the user (and the Debugger agent) are blind.
- **Status:** Open
