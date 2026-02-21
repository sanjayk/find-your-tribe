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

# ── CLI envelope error detection ─────────────────────────────
# The Claude CLI with --output-format json wraps output in an envelope.
# On error: {"type":"result","subtype":"error_max_turns",...} — no .result field.
# On success: {"type":"result","result":"...actual output...",...}
# This function detects error envelopes and returns a human-readable message.
#
# Returns 0 + prints error message if an error was detected.
# Returns 1 if no error (output is normal).

_detect_cli_error() {
    local raw="$1"
    [[ -z "$raw" ]] && return 1

    # Must be valid JSON to be a CLI envelope
    echo "$raw" | jq -e '.type' &>/dev/null || return 1

    # Check subtype-specific errors first (most informative)
    local subtype
    subtype=$(echo "$raw" | jq -r '.subtype // empty' 2>/dev/null)

    if [[ -n "$subtype" ]]; then
        case "$subtype" in
            error_max_turns)
                local num_turns max_cost
                num_turns=$(echo "$raw" | jq -r '.num_turns // "?"' 2>/dev/null)
                max_cost=$(echo "$raw" | jq -r '.total_cost_usd // "?"' 2>/dev/null)
                echo "Agent hit max turns limit (${num_turns} turns used, cost: \$${max_cost}). Increase turn limit or simplify input."
                return 0
                ;;
            error_tool_use)
                echo "Agent failed due to tool use error. Check agent permissions and tool availability."
                return 0
                ;;
            error_*)
                echo "Agent failed with error: ${subtype}"
                return 0
                ;;
        esac
    fi

    # Check is_error flag as a catch-all (may have no subtype)
    local is_error
    is_error=$(echo "$raw" | jq -r '.is_error // false' 2>/dev/null)
    if [[ "$is_error" == "true" ]]; then
        local errors
        errors=$(echo "$raw" | jq -r '.errors // [] | join("; ")' 2>/dev/null)
        echo "Agent reported error: ${errors:-unknown}"
        return 0
    fi

    return 1
}

# Spawn a Claude agent with a system prompt and user message
# Returns the agent's output on stdout
# Returns non-zero on failure (with error logged to stderr)
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

    # Capture stderr separately so CLI errors are not lost
    local stderr_file
    stderr_file=$(mktemp)

    local raw_output
    local rc=0
    raw_output=$("$_TIMEOUT_CMD" --kill-after="$kill_grace" "$agent_timeout" \
        "$CLAUDE_BIN" -p \
        --model "$model" \
        --allowedTools "$allowed_tools" \
        --max-turns "$DEFAULT_MAX_TURNS" \
        "${context}${system_prompt}"$'\n\n---\n\n'"${user_message}" \
        2>"$stderr_file") || rc=$?

    local stderr_content
    stderr_content=$(cat "$stderr_file" 2>/dev/null)
    rm -f "$stderr_file"

    # Check for timeout (exit 124 = SIGTERM, 137 = SIGKILL)
    if [[ $rc -eq 124 || $rc -eq 137 ]]; then
        log_error "Agent timed out after ${agent_timeout}s (exit code ${rc})"
        if [[ -n "$stderr_content" ]]; then
            log_error "stderr: ${stderr_content}"
        fi
        return 1
    fi

    # Check for other CLI failures
    if [[ $rc -ne 0 ]]; then
        log_error "Claude CLI exited with code ${rc}"
        if [[ -n "$stderr_content" ]]; then
            log_error "stderr: ${stderr_content}"
        fi
        if [[ -z "$raw_output" ]]; then
            return 1
        fi
        # Non-zero exit but we got output — log warning and continue
        log_warn "CLI returned non-zero exit but produced output, proceeding"
    fi

    # Check for empty output
    if [[ -z "$raw_output" ]]; then
        log_error "Agent returned empty output"
        if [[ -n "$stderr_content" ]]; then
            log_error "stderr: ${stderr_content}"
        fi
        return 1
    fi

    echo "$raw_output"
}

# Spawn a Claude agent that outputs structured JSON
# Args: system_prompt_file user_message json_schema_file [model] [max_turns] [tools]
#
# Semantic separation:
#   --system-prompt  = CLAUDE.md + agent role prompt (behavioral authority)
#   --json-schema    = machine-enforced output schema (CLI validates output)
#   --tools          = tool access ("" to disable all, omit for defaults)
#   positional arg   = user message (the actual task input)
#
# Returns the extracted result text on stdout.
# Returns non-zero on failure (with error logged to stderr).
#   Exit 1 = CLI crash, timeout, or empty output
#   Exit 2 = CLI error envelope (max turns, tool error, etc.)
claude_run_json() {
    local system_prompt_file="$1"
    local user_message="$2"
    local json_schema_file="$3"
    local model="${4:-$MODEL_SUPPORT}"
    local max_turns="${5:-$DEFAULT_JSON_MAX_TURNS}"
    local arg_count=$#

    local system_prompt
    system_prompt="$(cat "$system_prompt_file")"

    # Prepend CLAUDE.md to system prompt for project conventions
    if [[ -f "$CLAUDE_MD" ]]; then
        system_prompt="$(cat "$CLAUDE_MD")"$'\n\n---\n\n'"${system_prompt}"
    fi

    local schema
    schema="$(cat "$json_schema_file")"

    require_timeout_cmd || return 1

    local agent_timeout="${DEFAULT_AGENT_TIMEOUT:-600}"
    local kill_grace="${AGENT_KILL_GRACE:-10}"

    # Build CLI arguments with proper semantic separation
    local cli_args=(
        -p
        --model "$model"
        --system-prompt "$system_prompt"
        --output-format json
        --json-schema "$schema"
        --max-turns "$max_turns"
    )

    # --tools: only passed if 6th arg was explicitly provided
    #   "" = disable all tools (pure reasoning, 1 turn)
    #   "Bash Edit Read" = specific tools
    #   omitted = CLI default tool set
    if [[ $arg_count -ge 6 ]]; then
        cli_args+=(--tools "${6}")
    fi

    # Capture stderr separately so CLI errors are not lost
    local stderr_file
    stderr_file=$(mktemp)

    local raw_output
    local rc=0
    raw_output=$("$_TIMEOUT_CMD" --kill-after="$kill_grace" "$agent_timeout" \
        "$CLAUDE_BIN" "${cli_args[@]}" \
        "$user_message" \
        2>"$stderr_file") || rc=$?

    local stderr_content
    stderr_content=$(cat "$stderr_file" 2>/dev/null)
    rm -f "$stderr_file"

    # Check for timeout (exit 124 = SIGTERM, 137 = SIGKILL)
    if [[ $rc -eq 124 || $rc -eq 137 ]]; then
        log_error "JSON agent timed out after ${agent_timeout}s (exit code ${rc})"
        if [[ -n "$stderr_content" ]]; then
            log_error "stderr: ${stderr_content}"
        fi
        return 1
    fi

    # Check for CLI failure
    if [[ $rc -ne 0 ]]; then
        log_error "Claude CLI (JSON mode) exited with code ${rc}"
        if [[ -n "$stderr_content" ]]; then
            log_error "stderr: ${stderr_content}"
        fi
        if [[ -z "$raw_output" ]]; then
            return 1
        fi
        log_warn "CLI returned non-zero exit but produced output, proceeding"
    fi

    # Check for empty output
    if [[ -z "$raw_output" ]]; then
        log_error "JSON agent returned empty output"
        if [[ -n "$stderr_content" ]]; then
            log_error "stderr: ${stderr_content}"
        fi
        return 1
    fi

    # ── Detect CLI error envelopes ─────────────────────────────
    # The CLI returns {"type":"result","subtype":"error_max_turns",...} on failure.
    # These are valid JSON but NOT agent output — they're error reports.
    local cli_error
    if cli_error=$(_detect_cli_error "$raw_output"); then
        log_error "Claude CLI error: ${cli_error}"
        # Still save the raw output for debugging (caller should handle this)
        echo "$raw_output"
        return 2  # Distinct from 1 (CLI crash) — 2 means "got error envelope"
    fi

    # ── Extract result from success envelope ───────────────────
    # Claude CLI --output-format json wraps output in: {"type":"result","result":"..."}
    local result_text
    if echo "$raw_output" | jq -e '.result' &>/dev/null; then
        result_text=$(echo "$raw_output" | jq -r '.result')
    else
        result_text="$raw_output"
    fi

    # Check for empty result after extraction
    if [[ -z "$result_text" ]]; then
        log_error "JSON agent returned envelope with empty result"
        return 1
    fi

    echo "$result_text"
}

# Spawn a Claude agent in the background
# Returns the PID on stdout.
# The subshell writes marker files on completion:
#   ${output_file}.done     — always written on completion
#   ${output_file}.timeout  — written if agent timed out
#   ${output_file}.error    — written if CLI exited non-zero (not timeout)
claude_spawn_bg() {
    local system_prompt_file="$1"
    local user_message="$2"
    local output_file="$3"
    local model="${4:-$MODEL_SUPPORT}"
    local allowed_tools="${5:-$AGENT_TOOLS_FULL}"
    local agent_cwd="${6:-$PROJECT_ROOT}"

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
    local error_marker="${output_file}.error"
    rm -f "$done_marker" "$timeout_marker" "$error_marker"

    local agent_timeout="${DEFAULT_AGENT_TIMEOUT:-600}"
    local kill_grace="${AGENT_KILL_GRACE:-10}"

    # IMPORTANT: The subshell must not inherit the caller's stdout pipe.
    # When called via pid=$(claude_spawn_bg ...), bash creates a pipe and
    # the ( ... ) & subshell inherits the write end. Even though we redirect
    # stdout to $output_file inside the subshell, the pipe fd stays open
    # and $() blocks until the subshell exits (could be 10+ minutes).
    # Fix: redirect the subshell's stdout/stderr to /dev/null at the ( ) level,
    # and use explicit file redirects for all output inside.
    ( cd "$agent_cwd" && "$_TIMEOUT_CMD" --kill-after="$kill_grace" "$agent_timeout" \
        "$CLAUDE_BIN" -p \
        --model "$model" \
        --allowedTools "$allowed_tools" \
        --max-turns "$DEFAULT_MAX_TURNS" \
        "${context}${system_prompt}"$'\n\n---\n\n'"${user_message}" \
        > "$output_file" 2>&1
      local rc=$?
      if [[ $rc -eq 124 || $rc -eq 137 ]]; then
          touch "$timeout_marker"
          echo '{"status":"timeout","reason":"Agent timed out after '"$agent_timeout"'s"}' >> "$output_file"
      elif [[ $rc -ne 0 ]]; then
          echo "$rc" > "$error_marker"
          echo '{"status":"error","reason":"Claude CLI exited with code '"$rc"'"}' >> "$output_file"
      fi
      touch "$done_marker"
    ) >/dev/null 2>&1 &

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
    # Let Python stderr through so errors are visible
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
' <<< "$raw" 2>&1)
    local py_rc=$?

    if [[ $py_rc -eq 0 ]] && [[ -n "$py_result" ]]; then
        echo "$py_result"
        return 0
    fi

    return 1
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
