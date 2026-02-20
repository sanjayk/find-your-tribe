#!/usr/bin/env bash
# features.sh — Feature namespace management
#
# The swarm supports running multiple features in parallel. Each feature
# gets isolated state: tasks, logs, contract, spec_path, worktrees.
#
# Directory layout:
#   .tribe/
#     active_feature        ← name of the last-planned feature
#     features/
#       f3-projects/
#         tasks/            ← task DAG files
#         logs/             ← agent output, gate logs, debugger, etc.
#         contract.json     ← schema contract from architect
#         spec_path         ← path to the source spec file
#         state.json        ← runtime state (idle/running)
#         failure_history.jsonl
#       f4-tribes/
#         ...
#     worktrees/
#       f3-projects/        ← git worktrees for f3 tasks
#       f4-tribes/          ← git worktrees for f4 tasks
#
# Branch naming: tribe/{feature}/task-{id}-{slug}
#
# Requires config.sh and log.sh to be sourced first

# ── Derive feature name from a spec file path ────────────────────
# specs/tech/f3-projects.md → f3-projects
# specs/product/f4-tribes.md → f4-tribes
# /absolute/path/to/my-feature.md → my-feature

feature_name_from_spec() {
    local spec_file="$1"
    basename "$spec_file" .md
}

# ── Activate a feature: override global paths ────────────────────
# After this call, TASKS_DIR, LOGS_DIR, CONTRACT_FILE, BRANCH_PREFIX,
# WORKTREES_DIR, and STATE_FILE all point at the feature's namespace.
# Existing code uses these globals unchanged.

feature_activate() {
    local name="$1"

    FEATURE_NAME="$name"
    FEATURE_DIR="${FEATURES_DIR}/${name}"
    TASKS_DIR="${FEATURE_DIR}/tasks"
    LOGS_DIR="${FEATURE_DIR}/logs"
    CONTRACT_FILE="${FEATURE_DIR}/contract.json"
    STATE_FILE="${FEATURE_DIR}/state.json"
    WORKTREES_DIR="${TRIBE_DIR}/worktrees/${name}"
    BRANCH_PREFIX="tribe/${name}"

    mkdir -p "$TASKS_DIR" "$LOGS_DIR"

    # Initialize state file if it doesn't exist
    if [[ ! -f "$STATE_FILE" ]]; then
        echo '{"status":"idle","agents":[],"started_at":null}' | jq '.' > "$STATE_FILE"
    fi
}

# ── Set the active feature (persisted across commands) ───────────

feature_set_active() {
    local name="$1"
    echo "$name" > "${TRIBE_DIR}/active_feature"
}

# ── Get the active feature name (or empty string) ────────────────

feature_get_active() {
    if [[ -f "${TRIBE_DIR}/active_feature" ]]; then
        cat "${TRIBE_DIR}/active_feature"
    fi
}

# ── Resolve which feature to use ─────────────────────────────────
# Priority: explicit flag → active feature → single feature auto-detect
# Returns: feature name on stdout
# Exit code: 0 = resolved, 1 = ambiguous/none

feature_resolve() {
    local explicit="${1:-}"

    # 1. Explicit flag
    if [[ -n "$explicit" ]]; then
        if [[ -d "${FEATURES_DIR}/${explicit}" ]]; then
            echo "$explicit"
            return 0
        else
            log_error "Feature '${explicit}' not found in ${FEATURES_DIR}/"
            return 1
        fi
    fi

    # 2. Active feature
    local active
    active=$(feature_get_active)
    if [[ -n "$active" ]] && [[ -d "${FEATURES_DIR}/${active}" ]]; then
        echo "$active"
        return 0
    fi

    # 3. Auto-detect: exactly one feature → use it
    if [[ -d "$FEATURES_DIR" ]]; then
        local features count
        features=$(ls -1 "$FEATURES_DIR" 2>/dev/null || true)
        count=$(echo "$features" | grep -c . 2>/dev/null || echo "0")
        if [[ "$count" -eq 1 ]] && [[ -n "$features" ]]; then
            echo "$features"
            return 0
        fi
    fi

    return 1
}

# ── List all feature names ───────────────────────────────────────

feature_list() {
    if [[ -d "$FEATURES_DIR" ]]; then
        ls -1 "$FEATURES_DIR" 2>/dev/null || true
    fi
}

# ── Require a feature to be active ───────────────────────────────
# Resolves and activates. On failure, prints error with available features.
# Args: [explicit_feature_name]

_require_feature() {
    local explicit="${1:-}"
    local feature_name

    if feature_name=$(feature_resolve "$explicit"); then
        feature_activate "$feature_name"
        return 0
    fi

    log_error "No feature context. Use --feature <name> or run 'tribe plan' first."
    echo ""
    local features
    features=$(feature_list)
    if [[ -n "$features" ]]; then
        local active
        active=$(feature_get_active)
        echo "Available features:"
        while IFS= read -r f; do
            local marker=""
            if [[ "$f" == "$active" ]]; then
                marker=" ${GREEN}(active)${RESET}"
            fi
            echo -e "  - ${CYAN}${f}${RESET}${marker}"
        done <<< "$features"
    else
        echo "No features found. Run: ./swarm/tribe plan <spec-file>"
    fi
    exit 1
}
