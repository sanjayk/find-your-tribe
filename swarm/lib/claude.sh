#!/usr/bin/env bash
# claude.sh — Claude CLI wrapper for spawning agents

# Requires config.sh and log.sh to be sourced first

# Allow nested invocation when running inside a Claude Code session.
# The -p (print/pipe) mode is non-interactive and safe to nest.
unset CLAUDECODE 2>/dev/null || true

# Resolve timeout command (GNU coreutils: timeout on Linux, gtimeout on macOS)
_TIMEOUT_CMD=""
if command -v timeout &>/dev/null; then
    _TIMEOUT_CMD="timeout"
elif command -v gtimeout &>/dev/null; then
    _TIMEOUT_CMD="gtimeout"
fi

# Hard gate: refuse to run agents without a timeout command.
# Without this, a stuck agent runs forever with no feedback.
require_timeout_cmd() {
    if [[ -z "$_TIMEOUT_CMD" ]]; then
        log_error "No timeout command found. Install GNU coreutils:"
        log_error "  macOS:  brew install coreutils"
        log_error "  Linux:  timeout is included in coreutils (should already be installed)"
        log_error "Cannot enforce agent time limits without this. Refusing to run."
        return 1
    fi
}

# Spawn a Claude agent with a system prompt and user message
# Returns the agent's output on stdout
claude_run() {
    local system_prompt_file="$1"
    local user_message="$2"
    local model="${3:-$MODEL_SUPPORT}"
    local allowed_tools="${4:-$AGENT_TOOLS_FULL}"

    local system_prompt
    system_prompt="$(cat "$system_prompt_file")"

    # Prepend CLAUDE.md content if it exists
    local context=""
    if [[ -f "$CLAUDE_MD" ]]; then
        context="$(cat "$CLAUDE_MD")"$'\n\n---\n\n'
    fi

    require_timeout_cmd || return 1

    local agent_timeout="${DEFAULT_AGENT_TIMEOUT:-600}"
    local kill_grace="${AGENT_KILL_GRACE:-10}"
    "$_TIMEOUT_CMD" --kill-after="$kill_grace" "$agent_timeout" \
        "$CLAUDE_BIN" -p \
        --model "$model" \
        --allowedTools "$allowed_tools" \
        --max-turns "$DEFAULT_MAX_TURNS" \
        "${context}${system_prompt}"$'\n\n---\n\n'"${user_message}" \
        2>/dev/null
}

# Spawn a Claude agent that outputs structured JSON
claude_run_json() {
    local system_prompt_file="$1"
    local user_message="$2"
    local json_schema_file="$3"
    local model="${4:-$MODEL_SUPPORT}"

    local system_prompt
    system_prompt="$(cat "$system_prompt_file")"

    local context=""
    if [[ -f "$CLAUDE_MD" ]]; then
        context="$(cat "$CLAUDE_MD")"$'\n\n---\n\n'
    fi

    local schema
    schema="$(cat "$json_schema_file")"

    require_timeout_cmd || return 1

    # Use --max-turns 3: the JSON-producing agent has full context in the
    # prompt and should respond in 1 turn. Higher values cause the model to
    # spend turns on tool calls (reading/editing files) which can hang
    # indefinitely in a backgrounded process.
    local agent_timeout="${DEFAULT_AGENT_TIMEOUT:-600}"
    local kill_grace="${AGENT_KILL_GRACE:-10}"
    local raw_output
    raw_output=$("$_TIMEOUT_CMD" --kill-after="$kill_grace" "$agent_timeout" \
        "$CLAUDE_BIN" -p \
        --model "$model" \
        --output-format json \
        --max-turns "$DEFAULT_JSON_MAX_TURNS" \
        "${context}${system_prompt}"$'\n\n---\n\nIMPORTANT: You MUST respond with valid JSON matching this schema:\n```json\n'"${schema}"$'\n```\n\n---\n\n'"${user_message}" \
        2>/dev/null)

    # Claude CLI --output-format json wraps output in an envelope: {"result": "...", ...}
    # Extract the actual result text, then return it
    local result_text
    if echo "$raw_output" | jq -e '.result' &>/dev/null; then
        result_text=$(echo "$raw_output" | jq -r '.result')
    else
        result_text="$raw_output"
    fi

    echo "$result_text"
}

# Spawn a Claude agent in the background
# Returns the PID
claude_spawn_bg() {
    local system_prompt_file="$1"
    local user_message="$2"
    local output_file="$3"
    local model="${4:-$MODEL_SUPPORT}"
    local allowed_tools="${5:-$AGENT_TOOLS_FULL}"
    local agent_cwd="${6:-$TRIBE_ROOT}"

    local system_prompt
    system_prompt="$(cat "$system_prompt_file")"

    local context=""
    if [[ -f "$CLAUDE_MD" ]]; then
        context="$(cat "$CLAUDE_MD")"$'\n\n---\n\n'
    fi

    require_timeout_cmd || return 1

    # Write a marker file when process completes
    local done_marker="${output_file}.done"
    local timeout_marker="${output_file}.timeout"
    rm -f "$done_marker" "$timeout_marker"

    local agent_timeout="${DEFAULT_AGENT_TIMEOUT:-600}"
    local kill_grace="${AGENT_KILL_GRACE:-10}"
    ( cd "$agent_cwd" && "$_TIMEOUT_CMD" --kill-after="$kill_grace" "$agent_timeout" \
        "$CLAUDE_BIN" -p \
        --model "$model" \
        --allowedTools "$allowed_tools" \
        --max-turns "$DEFAULT_MAX_TURNS" \
        "${context}${system_prompt}"$'\n\n---\n\n'"${user_message}" \
        > "$output_file" 2>&1
      local rc=$?
      if [[ $rc -eq 124 || $rc -eq 137 ]]; then
          # 124 = SIGTERM from timeout, 137 = SIGKILL (128+9)
          touch "$timeout_marker"
          echo '{"status":"timeout","reason":"Agent timed out after '"$agent_timeout"'s"}' >> "$output_file"
      fi
      touch "$done_marker"
    ) &

    echo $!
}

# ── JSON extraction from agent output ─────────────────────────
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
    python3 -c '
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
    # Walk backwards from each ec to find its matching sc
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
' <<< "$raw" 2>/dev/null
}

# Check if a Claude agent process is still running
claude_is_running() {
    local pid="$1"
    kill -0 "$pid" 2>/dev/null
}

# Wait for a Claude agent to finish and return exit code
claude_wait() {
    local pid="$1"
    wait "$pid" 2>/dev/null
    return $?
}
