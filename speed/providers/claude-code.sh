#!/usr/bin/env bash
# claude-code.sh — Claude Code CLI provider for SPEED
#
# Implements the provider interface:
#   provider_run, provider_run_json, provider_spawn_bg,
#   provider_is_running, provider_wait
#
# Uses --output-format stream-json --verbose for real-time progress
# on foreground calls (provider_run, provider_run_json). The CLI
# emits newline-delimited JSON events which we parse for progress
# display and result extraction.
#
# Requires provider.sh (for _TIMEOUT_CMD, require_timeout_cmd, parse_agent_json),
# config.sh (for CLAUDE_MD, DEFAULT_AGENT_TIMEOUT, etc.), log.sh, progress.sh,
# and cleanup.sh to be sourced first.

# ── Provider setup ───────────────────────────────────────────────

# Allow nested invocation when running inside a Claude Code session.
# The -p (print/pipe) mode is non-interactive and safe to nest.
unset CLAUDECODE 2>/dev/null || true

# Resolve Claude CLI binary
PROVIDER_BIN="${CLAUDE_BIN:-$(which claude 2>/dev/null || echo "claude")}"

# ── Stream-JSON result extraction ────────────────────────────────
# The stream-json output contains a final {"type":"result",...} event.
# On success: {"type":"result","subtype":"success","result":"..."}
# On error:   {"type":"result","subtype":"error_max_turns",...}

# Extract the result event from a stream-json events file.
# Prints the result line on stdout. Returns 1 if not found.
_find_result_event() {
    local events_file="$1"
    # The result event is always the last JSON line with type=result
    grep '"type":"result"' "$events_file" 2>/dev/null | tail -1
}

# Detect errors from a result event line.
# Returns 0 and prints error message if error detected; returns 1 if success.
_detect_result_error() {
    local result_line="$1"
    [[ -z "$result_line" ]] && return 1

    local subtype
    subtype=$(echo "$result_line" | jq -r '.subtype // empty' 2>/dev/null)

    if [[ -n "$subtype" ]]; then
        case "$subtype" in
            success)
                return 1
                ;;
            error_max_turns)
                local num_turns total_cost
                num_turns=$(echo "$result_line" | jq -r '.num_turns // "?"' 2>/dev/null)
                total_cost=$(echo "$result_line" | jq -r '.total_cost_usd // "?"' 2>/dev/null)
                echo "hit max turns (${num_turns} turns, \$${total_cost})"
                return 0
                ;;
            error_tool_use)
                echo "tool use error — check agent permissions"
                return 0
                ;;
            error_*)
                echo "agent error: ${subtype}"
                return 0
                ;;
        esac
    fi

    local is_error
    is_error=$(echo "$result_line" | jq -r '.is_error // false' 2>/dev/null)
    if [[ "$is_error" == "true" ]]; then
        local errors
        errors=$(echo "$result_line" | jq -r '.errors // [] | join("; ")' 2>/dev/null)
        echo "${errors:-unknown error}"
        return 0
    fi

    return 1
}

# Extract metadata from a result event (duration, turns, cost).
# Sets variables via nameref pattern (bash 4.3+) or echoes space-separated.
_result_metadata() {
    local result_line="$1"
    local duration_ms num_turns cost_usd
    duration_ms=$(echo "$result_line" | jq -r '.duration_ms // 0' 2>/dev/null)
    num_turns=$(echo "$result_line" | jq -r '.num_turns // empty' 2>/dev/null)
    cost_usd=$(echo "$result_line" | jq -r '.total_cost_usd // empty' 2>/dev/null)
    # Convert ms to seconds
    local duration_s=$(( ${duration_ms:-0} / 1000 ))
    echo "${duration_s} ${num_turns:-} ${cost_usd:-}"
}

# ── Core streaming execution engine ─────────────────────────────
# Shared logic for provider_run and provider_run_json.
# Runs the CLI in the background, polls for stream events,
# shows progress, extracts result.
#
# Args:
#   label          — display name for progress (e.g., "Architect")
#   events_file    — path to write stream-json events
#   stderr_file    — path to capture stderr
#   prompt_file    — path to temp file containing the prompt/message
#   timeout        — agent timeout in seconds
#   kill_grace     — seconds after SIGTERM before SIGKILL
#   cli_args...    — remaining args passed to the CLI
#
# The prompt is read from prompt_file (not stdin) because bash
# redirects stdin to /dev/null for backgrounded processes.
#
# Returns:
#   0 = success, result on stdout
#   1 = crash, timeout, empty output
#   2 = agent error (max turns, tool error, etc.)

_provider_stream_exec() {
    local label="$1"
    local events_file="$2"
    local stderr_file="$3"
    local prompt_file="$4"
    local agent_timeout="$5"
    local kill_grace="$6"
    shift 6
    # Remaining args: CLI arguments

    # Register temp files for cleanup on interrupt
    cleanup_register_file "$stderr_file"
    cleanup_register_file "$prompt_file"

    # Create events file before backgrounding to avoid race in polling
    touch "$events_file"

    # Start CLI in background, reading prompt from temp file.
    # Backgrounded processes get stdin from /dev/null, so we
    # redirect explicitly from the prompt file.
    "$_TIMEOUT_CMD" --kill-after="$kill_grace" "$agent_timeout" \
        "$PROVIDER_BIN" "$@" \
        < "$prompt_file" \
        > "$events_file" 2>"$stderr_file" &
    local pid=$!
    cleanup_register_pid "$pid"

    # Start progress display
    progress_start "$label"

    # ── Poll for new events ─────────────────────────────────────
    local lines_read=0

    while kill -0 "$pid" 2>/dev/null; do
        _poll_events "$events_file" "$lines_read"
        lines_read=$(_count_lines "$events_file")
        sleep 0.3
    done

    # Process exits — read any remaining buffered events
    local rc=0
    wait "$pid" 2>/dev/null || rc=$?
    _poll_events "$events_file" "$lines_read"

    # Unregister from cleanup (process is done)
    cleanup_unregister_pid "$pid"

    # ── Extract result ──────────────────────────────────────────
    local start_time
    start_time=$_PROGRESS_START
    local now
    now=$(date +%s)
    local wall_duration=$(( now - start_time ))

    local stderr_content
    stderr_content=$(cat "$stderr_file" 2>/dev/null)
    # Clean up temp files (events file is kept as a log)
    rm -f "$stderr_file" "$prompt_file"
    cleanup_unregister_file "$stderr_file"
    cleanup_unregister_file "$prompt_file"

    # Find the result event
    local result_line
    result_line=$(_find_result_event "$events_file")

    if [[ -n "$result_line" ]]; then
        # Check for agent error
        local error_msg
        if error_msg=$(_detect_result_error "$result_line"); then
            progress_error "$error_msg" "$wall_duration"
            log_debug "Events log: ${events_file}"
            echo "$result_line"
            return 2
        fi

        # Success — extract result text and metadata
        local result_text
        result_text=$(echo "$result_line" | jq -r '.result // empty' 2>/dev/null)

        local metadata
        metadata=$(_result_metadata "$result_line")
        local dur turns cost
        read -r dur turns cost <<< "$metadata"

        progress_complete "${dur:-$wall_duration}" "$turns" "$cost"

        if [[ -z "$result_text" ]]; then
            log_error "Result event has empty .result field"
            log_debug "Events log: ${events_file}"
            return 1
        fi

        echo "$result_text"
        return 0
    fi

    # No result event — process died before completing
    if [[ $rc -eq 124 || $rc -eq 137 ]]; then
        progress_error "timed out after ${agent_timeout}s" "$wall_duration"
    elif [[ $rc -ne 0 ]]; then
        progress_error "crashed (exit ${rc})" "$wall_duration"
        if [[ -n "$stderr_content" ]]; then
            log_error "stderr: ${stderr_content}"
        fi
    else
        progress_error "no output" "$wall_duration"
        if [[ -n "$stderr_content" ]]; then
            log_error "stderr: ${stderr_content}"
        fi
    fi
    log_debug "Events log: ${events_file}"
    return 1
}

# Poll for new lines in the events file and dispatch to progress.
_poll_events() {
    local events_file="$1"
    local lines_read="$2"

    local current_lines
    current_lines=$(_count_lines "$events_file")

    if [[ $current_lines -gt $lines_read ]]; then
        local skip=$((lines_read + 1))
        local new_count=$((current_lines - lines_read))
        # Read new lines via process substitution (not a pipeline)
        # so progress_event runs in the current shell and can
        # update global state like _PROGRESS_LINE_ACTIVE.
        while IFS= read -r line; do
            progress_event "$line"
        done < <(tail -n +"$skip" "$events_file" 2>/dev/null | head -n "$new_count")
    fi
}

# Count complete lines in a file (only counts lines ending in \n).
# Returns 0 if the file doesn't exist yet.
_count_lines() {
    local file="$1"
    if [[ -f "$file" ]]; then
        wc -l < "$file" 2>/dev/null | tr -d ' '
    else
        echo 0
    fi
}

# ── Provider interface implementation ────────────────────────────

# Spawn a Claude agent with a system prompt and user message.
# Shows real-time progress via stream-json parsing.
# Returns the agent's output on stdout.
#
# Args: system_prompt_file user_message [model] [allowed_tools] [label]
provider_run() {
    local system_prompt_file="$1"
    local user_message="$2"
    local model="${3:-$MODEL_SUPPORT}"
    local allowed_tools="${4:-$AGENT_TOOLS_FULL}"
    local label="${5:-Agent}"

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

    # Events log — kept for debugging (not cleaned up)
    local timestamp
    timestamp=$(date +%s)
    mkdir -p "$LOGS_DIR"
    local events_file="${LOGS_DIR}/${label}-${timestamp}.jsonl"

    # Stderr temp file — cleaned up after use
    local stderr_file
    stderr_file=$(mktemp)

    # Write prompt to temp file (backgrounded processes lose stdin)
    local prompt_file
    prompt_file=$(mktemp)
    local full_prompt="${context}${system_prompt}"$'\n\n---\n\n'"${user_message}"
    echo "$full_prompt" > "$prompt_file"

    _provider_stream_exec \
        "$label" \
        "$events_file" \
        "$stderr_file" \
        "$prompt_file" \
        "$agent_timeout" \
        "$kill_grace" \
        -p \
        --output-format stream-json --verbose \
        --model "$model" \
        --max-turns "$DEFAULT_MAX_TURNS" \
        --allowedTools "$allowed_tools"
}

# Spawn a Claude agent that outputs structured JSON.
# Shows real-time progress via stream-json parsing.
#
# Args: system_prompt_file user_message json_schema_file [model] [max_turns] [tools] [label]
#   Exit 1 = CLI crash, timeout, or empty output
#   Exit 2 = CLI error envelope (max turns, tool error, etc.)
provider_run_json() {
    local system_prompt_file="$1"
    local user_message="$2"
    local json_schema_file="$3"
    local model="${4:-$MODEL_SUPPORT}"
    local max_turns="${5:-$DEFAULT_JSON_MAX_TURNS}"
    local arg_count=$#
    local label="${7:-Agent}"

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

    # Events log
    local timestamp
    timestamp=$(date +%s)
    mkdir -p "$LOGS_DIR"
    local events_file="${LOGS_DIR}/${label}-${timestamp}.jsonl"

    # Stderr temp file
    local stderr_file
    stderr_file=$(mktemp)

    # Build CLI arguments
    local cli_args=(
        -p
        --output-format stream-json --verbose
        --model "$model"
        --system-prompt "$system_prompt"
        --json-schema "$schema"
        --max-turns "$max_turns"
    )

    # --tools: only passed if 6th arg was explicitly provided and non-empty.
    # Empty string means "default tools, no restriction" (skip the flag).
    if [[ $arg_count -ge 6 && -n "${6}" ]]; then
        cli_args+=(--tools "${6}")
    fi

    # Write user message to temp file (backgrounded processes lose stdin)
    local prompt_file
    prompt_file=$(mktemp)
    echo "$user_message" > "$prompt_file"

    local result_text
    result_text=$(_provider_stream_exec \
        "$label" \
        "$events_file" \
        "$stderr_file" \
        "$prompt_file" \
        "$agent_timeout" \
        "$kill_grace" \
        "${cli_args[@]}")
    local rc=$?

    if [[ $rc -ne 0 ]]; then
        # On error envelope (rc=2), echo the result for callers that inspect it
        [[ $rc -eq 2 && -n "$result_text" ]] && echo "$result_text"
        return $rc
    fi

    # With --json-schema + stream-json, the structured JSON is produced via
    # the StructuredOutput tool call, NOT in the result event's .result field.
    # The .result field contains the agent's conversational text (markdown).
    # Extract the structured output from the StructuredOutput tool_use event.
    local structured_output
    structured_output=$(jq -r '
        select(.type == "assistant") |
        .message.content[]? |
        select(.type == "tool_use" and .name == "StructuredOutput") |
        .input
    ' "$events_file" 2>/dev/null | jq -s 'last' 2>/dev/null)

    if [[ -n "$structured_output" && "$structured_output" != "null" ]]; then
        echo "$structured_output"
        return 0
    fi

    # Fallback: try .result from result event (older CLI versions or
    # cases where StructuredOutput tool isn't used)
    if [[ -n "$result_text" ]]; then
        echo "$result_text"
        return 0
    fi

    log_error "JSON agent returned no structured output"
    log_debug "Events log: ${events_file}"
    return 1
}

# ── Background execution (unchanged for A1 scope) ───────────────
# provider_spawn_bg stays as-is — it already runs in background
# and writes to an output file. Converting it to stream-json is
# a separate change (A5: support agent progress).

# Spawn a Claude agent in the background.
# Returns the PID on stdout.
provider_spawn_bg() {
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

    local done_marker="${output_file}.done"
    local timeout_marker="${output_file}.timeout"
    local error_marker="${output_file}.error"
    rm -f "$done_marker" "$timeout_marker" "$error_marker"

    local agent_timeout="${DEFAULT_AGENT_TIMEOUT:-600}"
    local kill_grace="${AGENT_KILL_GRACE:-10}"

    ( cd "$agent_cwd" && "$_TIMEOUT_CMD" --kill-after="$kill_grace" "$agent_timeout" \
        "$PROVIDER_BIN" -p \
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

# Check if an agent process is still running.
provider_is_running() {
    local pid="$1"
    kill -0 "$pid" 2>/dev/null
}

# Wait for an agent to finish and return exit code.
provider_wait() {
    local pid="$1"
    wait "$pid" 2>/dev/null
    return $?
}
