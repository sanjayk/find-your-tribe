#!/usr/bin/env bash
# provider.sh — Provider abstraction layer for SPEED agents
#
# Resolves the active provider, sources its implementation, and creates
# backward-compatible aliases so all call sites keep using claude_*.
#
# Requires config.sh and log.sh to be sourced first.

# ── Resolve timeout command ──────────────────────────────────────
_TIMEOUT_CMD=""
if command -v timeout &>/dev/null; then
    _TIMEOUT_CMD="timeout"
elif command -v gtimeout &>/dev/null; then
    _TIMEOUT_CMD="gtimeout"
fi

# Hard gate: refuse to run agents without a timeout command.
require_timeout_cmd() {
    if [[ -z "$_TIMEOUT_CMD" ]]; then
        log_error_block \
            "Cannot find 'timeout' or 'gtimeout' command" \
            "SPEED requires GNU timeout to enforce agent time limits" \
            "macOS: brew install coreutils  |  Linux: apt install coreutils"
        return 1
    fi
}

# Fail fast at source time — don't wait until the first agent call
require_timeout_cmd || exit "$EXIT_CONFIG_ERROR"

# ── JSON extraction from agent output ────────────────────────────
# Agent output is free-form text that may contain JSON. This function
# applies a consistent extraction pipeline so every call site doesn't
# reinvent its own fragile parser.
#
# Pipeline (stops at first success):
#   1. Direct jq parse — output is already valid JSON
#   2. Code-fence extraction — ```json ... ``` or ``` ... ```
#   3. Brace/bracket scanning — find outermost { } or [ ]
#      Falls back to last { } if the outermost span is invalid
#      (handles JSON appended to end of long output, e.g. blocked status)
#
# Usage:
#   parsed=$(parse_agent_json "$agent_output")
#   cat file.log | parse_agent_json
#
# Returns 0 + prints JSON on success, returns 1 on failure.

parse_agent_json() {
    local raw="${1:-$(cat)}"

    [[ -z "$raw" ]] && return 1

    # 1. Direct parse
    if echo "$raw" | jq -e '.' &>/dev/null; then
        echo "$raw" | jq -c '.'
        return 0
    fi

    # 2. Code-fence extraction (```json ... ``` or ``` ... ```)
    local fenced
    fenced=$(echo "$raw" | sed -n '/^```/,/^```/{/^```/d;p;}')
    if [[ -n "$fenced" ]] && echo "$fenced" | jq -e '.' &>/dev/null; then
        echo "$fenced" | jq -c '.'
        return 0
    fi

    # 3. Brace/bracket scanning via Python (handles nested structures reliably)
    local py_result
    py_result=$(python3 -c '
import sys, json

text = sys.stdin.read()

def try_parse(s):
    try:
        return json.loads(s)
    except (json.JSONDecodeError, ValueError):
        return None

for sc, ec in [("{", "}"), ("[", "]")]:
    # Strategy A: outermost span (first sc to last ec)
    start = text.find(sc)
    end = text.rfind(ec)
    if start >= 0 and end > start:
        parsed = try_parse(text[start:end+1])
        if parsed is not None:
            print(json.dumps(parsed))
            sys.exit(0)

    # Strategy B: last valid block (for JSON appended to long output)
    pos = len(text)
    while True:
        end = text.rfind(ec, 0, pos)
        if end < 0:
            break
        depth = 0
        for i in range(end, -1, -1):
            if text[i] == ec:
                depth += 1
            elif text[i] == sc:
                depth -= 1
                if depth == 0:
                    parsed = try_parse(text[i:end+1])
                    if parsed is not None:
                        print(json.dumps(parsed))
                        sys.exit(0)
                    break
        pos = end  # try earlier occurrence

sys.exit(1)
' <<< "$raw" 2>&1)
    local py_rc=$?

    if [[ $py_rc -eq 0 ]] && [[ -n "$py_result" ]]; then
        echo "$py_result"
        return 0
    fi

    return 1
}

# Validate that a string is valid JSON. Logs an error with the agent
# name and a preview of the raw output if not.
# Usage: _require_json "Guardian" "$output" || return 1
_require_json() {
    local label="$1" json="$2"
    if [[ -z "$json" ]]; then
        log_error "${label} returned empty output"
        return 1
    fi
    if ! echo "$json" | jq empty 2>/dev/null; then
        log_error "${label} returned invalid JSON"
        log_verbose "  First 300 chars: ${json:0:300}"
        return 1
    fi
    return 0
}

# ── Resolve and load provider ────────────────────────────────────
# Priority: SPEED_PROVIDER env var > speed.toml [agent].provider > "claude-code"

_PROVIDER_NAME="${SPEED_PROVIDER:-${TOML_AGENT_PROVIDER:-claude-code}}"
_PROVIDERS_DIR="${SCRIPT_DIR}/providers"
_PROVIDER_FILE="${_PROVIDERS_DIR}/${_PROVIDER_NAME}.sh"

if [[ ! -f "$_PROVIDER_FILE" ]]; then
    local _available=""
    for f in "${_PROVIDERS_DIR}"/*.sh; do
        [[ -f "$f" ]] || continue
        _available+="  - $(basename "$f" .sh)"$'\n'
    done
    log_error_block \
        "Unknown provider '${_PROVIDER_NAME}'" \
        "Set via: SPEED_PROVIDER env var, speed.toml [agent].provider, or default 'claude-code'" \
        "Available providers:" \
        "${_available% }"
    exit "$EXIT_CONFIG_ERROR"
fi

source "$_PROVIDER_FILE"

# ── Backward-compatible aliases ──────────────────────────────────
# All 9 call sites in speed/speed use claude_* names. These aliases
# route to the loaded provider's implementation with zero call-site churn.

claude_run()        { provider_run "$@"; }
claude_run_json()   { provider_run_json "$@"; }
claude_spawn_bg()   { provider_spawn_bg "$@"; }
claude_is_running() { provider_is_running "$@"; }
claude_wait()       { provider_wait "$@"; }
