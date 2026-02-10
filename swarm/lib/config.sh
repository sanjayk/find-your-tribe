#!/usr/bin/env bash
# config.sh — Shared constants, paths, colors, defaults

set -euo pipefail

# ── Paths ────────────────────────────────────────────────────────
TRIBE_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
SWARM_DIR="${TRIBE_ROOT}/swarm"
LIB_DIR="${SWARM_DIR}/lib"
AGENTS_DIR="${SWARM_DIR}/agents"
TEMPLATES_DIR="${SWARM_DIR}/templates"

TRIBE_DIR="${TRIBE_ROOT}/.tribe"
TASKS_DIR="${TRIBE_DIR}/tasks"
LOGS_DIR="${TRIBE_DIR}/logs"
STATE_FILE="${TRIBE_DIR}/state.json"
BUDGET_FILE="${TRIBE_DIR}/budget.json"
CLAUDE_MD="${TRIBE_ROOT}/CLAUDE.md"

# ── Defaults ─────────────────────────────────────────────────────
DEFAULT_MAX_PARALLEL=3
DEFAULT_MAX_BUDGET=10
DEFAULT_MODEL="sonnet"
DEFAULT_TASK_BUDGET=2
BRANCH_PREFIX="tribe"

# ── Colors ───────────────────────────────────────────────────────
if [[ -t 1 ]]; then
    RED='\033[0;31m'
    GREEN='\033[0;32m'
    YELLOW='\033[0;33m'
    BLUE='\033[0;34m'
    MAGENTA='\033[0;35m'
    CYAN='\033[0;36m'
    WHITE='\033[1;37m'
    DIM='\033[0;90m'
    BOLD='\033[1m'
    RESET='\033[0m'
else
    RED='' GREEN='' YELLOW='' BLUE='' MAGENTA='' CYAN='' WHITE='' DIM='' BOLD='' RESET=''
fi

# ── Symbols ──────────────────────────────────────────────────────
SYM_CHECK="✓"
SYM_CROSS="✗"
SYM_ARROW="→"
SYM_DOT="●"
SYM_PENDING="○"
SYM_RUNNING="◉"
SYM_WARN="⚠"
