#!/usr/bin/env bash
# config.sh — Shared constants, paths, defaults, exit codes

set -euo pipefail

# ── Paths ────────────────────────────────────────────────────────
PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
SPEED_DIR="${PROJECT_ROOT}/speed"
LIB_DIR="${SPEED_DIR}/lib"
AGENTS_DIR="${SPEED_DIR}/agents"
TEMPLATES_DIR="${SPEED_DIR}/templates"

STATE_DIR="${PROJECT_ROOT}/.speed"
FEATURES_DIR="${STATE_DIR}/features"
CLAUDE_MD="${PROJECT_ROOT}/CLAUDE.md"

# ── Feature-scoped paths (defaults — overridden by feature_activate) ──
# Commands that require a feature call feature_activate() which updates
# these globals to point at the feature's namespace directory.
TASKS_DIR="${STATE_DIR}/tasks"
LOGS_DIR="${STATE_DIR}/logs"
WORKTREES_DIR="${STATE_DIR}/worktrees"
STATE_FILE="${STATE_DIR}/state.json"
CONTRACT_FILE="${STATE_DIR}/contract.json"
FEATURE_NAME=""
FEATURE_DIR=""

# ── Read speed.toml (if present) ──────────────────────────────────
# Note: colors.sh isn't sourced yet, so use plain echo for warnings.
SPEED_TOML="${PROJECT_ROOT}/speed.toml"
if [[ -f "$SPEED_TOML" ]]; then
    if ! command -v python3 &>/dev/null; then
        echo "Warning: python3 not found — speed.toml ignored, using defaults" >&2
    else
        _toml_err_file=$(mktemp "${TMPDIR:-/tmp}/_speed_toml_XXXXXX")
        _toml_rc=0
        _toml_out=$(python3 "${LIB_DIR}/toml.py" "$SPEED_TOML" 2>"$_toml_err_file") || _toml_rc=$?
        _toml_err=$(cat "$_toml_err_file" 2>/dev/null)
        rm -f "$_toml_err_file"

        if [[ $_toml_rc -ne 0 ]]; then
            echo "Warning: speed.toml parse failed (exit ${_toml_rc}) — using defaults" >&2
            [[ -n "$_toml_err" ]] && echo "  ${_toml_err}" >&2
        elif [[ -n "$_toml_err" ]]; then
            echo "Warning: ${_toml_err}" >&2
            eval "$_toml_out"
        else
            eval "$_toml_out"
        fi
        unset _toml_out _toml_err _toml_err_file _toml_rc
    fi
fi

# ── PATH ──────────────────────────────────────────────────────────
export PATH="${PATH}:${HOME}/.local/bin"

# ── Defaults (env > toml > built-in) ─────────────────────────────
DEFAULT_MAX_PARALLEL=3
DEFAULT_AGENT_TIMEOUT="${SPEED_TIMEOUT:-${TOML_AGENT_TIMEOUT:-600}}"
AGENT_KILL_GRACE=10          # seconds after SIGTERM before SIGKILL
BRANCH_PREFIX="speed"

# ── Model Tiers ──────────────────────────────────────────────────
# Planning tier: high-stakes reasoning where quality cascades.
#   Used by: architect, plan verifier, coherence checker
MODEL_PLANNING="${SPEED_PLANNING_MODEL:-${TOML_AGENT_PLANNING_MODEL:-opus}}"

# Support tier: structured tasks applying frameworks to known inputs.
#   Used by: debugger, supervisor, guardian, reviewer, validator, integrator
MODEL_SUPPORT="${SPEED_SUPPORT_MODEL:-${TOML_AGENT_SUPPORT_MODEL:-sonnet}}"

# Developer tier: set per-task by the architect, defaults to MODEL_SUPPORT.
#   Escalated automatically by timeout (sonnet → opus).

# ── Agent Turns ──────────────────────────────────────────────────
DEFAULT_MAX_TURNS="${SPEED_MAX_TURNS:-${TOML_AGENT_MAX_TURNS:-50}}"
DEFAULT_JSON_MAX_TURNS=3       # max turns for simple JSON-producing agents
ARCHITECT_MAX_TURNS=30         # architect needs many turns for large specs

# ── Agent Tool Sets ──────────────────────────────────────────────
AGENT_TOOLS_FULL="Bash Edit Read Write Glob Grep"
AGENT_TOOLS_READONLY="Read Glob Grep"

# ── Orchestration Tuning ─────────────────────────────────────────
POLL_INTERVAL=5                # seconds between main loop iterations
COMPLETION_FLUSH_WAIT=1        # seconds to wait for file writes after completion
STALE_STATE_PAUSE=3            # seconds to pause on stale state warning
HALT_FAILURE_PCT=30            # halt SPEED if this % of tasks fail
PATTERN_FAILURE_THRESHOLD=3    # invoke supervisor after this many failures

# ── Context Limits ───────────────────────────────────────────────
AGENT_OUTPUT_TAIL=1000         # lines of agent output to send to debugger
DIFF_HEAD_LINES=500            # lines of diff to send to debugger/reviewer

# ── Vision File ──────────────────────────────────────────────────
VISION_FILE="${TOML_SPECS_VISION_FILE:-specs/product/overview.md}"

# ── Log Retention ───────────────────────────────────────────────
LOG_RETAIN_PER_CATEGORY=3      # keep last N logs per category (gate, supervisor, etc.)

# ── Verbosity ──────────────────────────────────────────────────
# Resolved later by flag parsing (--quiet/--verbose/--debug).
# Set default here; flags override in speed/speed main().
VERBOSITY="${SPEED_VERBOSITY:-${TOML_UI_VERBOSITY:-1}}"

# ── Exit Codes ─────────────────────────────────────────────────
EXIT_OK=0
EXIT_TASK_FAILURE=1       # one or more tasks failed
EXIT_GATE_FAILURE=2       # quality gates failed
EXIT_CONFIG_ERROR=3       # bad config, missing binary, missing file
EXIT_MERGE_CONFLICT=4     # integration merge conflict
EXIT_HALTED=5             # >30% tasks failed, supervisor halted
EXIT_USER_ABORT=130       # Ctrl+C (convention: 128 + SIGINT)

# ── Colors & Symbols (delegated to colors.sh) ─────────────────
source "${LIB_DIR}/colors.sh"
