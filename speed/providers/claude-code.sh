#!/usr/bin/env bash
# claude-code.sh — Claude Code CLI provider for SPEED
#
# Implements the provider interface:
#   provider_run, provider_run_json, provider_spawn_bg,
#   provider_is_running, provider_wait
#
# Requires provider.sh (for _TIMEOUT_CMD, require_timeout_cmd, parse_agent_json)
# and config.sh (for CLAUDE_MD, DEFAULT_AGENT_TIMEOUT, etc.) to be sourced first.

# ── Provider setup ───────────────────────────────────────────────

# Allow nested invocation when running inside a Claude Code session.
# The -p (print/pipe) mode is non-interactive and safe to nest.
unset CLAUDECODE 2>/dev/null || true

# Resolve Claude CLI binary
PROVIDER_BIN="${CLAUDE_BIN:-$(which claude 2>/dev/null || echo "claude")}"

# ── CLI envelope error detection ─────────────────────────────────
# The Claude CLI with --output-format json wraps output in an envelope.
# On error: {"type":"result","subtype":"error_max_turns",...} — no .result field.
# On success: {"type":"result","result":"...actual output...",...}

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

# ── Provider interface implementation ────────────────────────────

# Spawn a Claude agent with a system prompt and user message.
# Returns the agent's output on stdout.
provider_run() {
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
        "$PROVIDER_BIN" -p \
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

# Spawn a Claude agent that outputs structured JSON.
# Args: system_prompt_file user_message json_schema_file [model] [max_turns] [tools]
#   Exit 1 = CLI crash, timeout, or empty output
#   Exit 2 = CLI error envelope (max turns, tool error, etc.)
provider_run_json() {
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

    # Build CLI arguments
    local cli_args=(
        -p
        --model "$model"
        --system-prompt "$system_prompt"
        --output-format json
        --json-schema "$schema"
        --max-turns "$max_turns"
    )

    # --tools: only passed if 6th arg was explicitly provided
    if [[ $arg_count -ge 6 ]]; then
        cli_args+=(--tools "${6}")
    fi

    # Capture stderr separately
    local stderr_file
    stderr_file=$(mktemp)

    local raw_output
    local rc=0
    raw_output=$("$_TIMEOUT_CMD" --kill-after="$kill_grace" "$agent_timeout" \
        "$PROVIDER_BIN" "${cli_args[@]}" \
        "$user_message" \
        2>"$stderr_file") || rc=$?

    local stderr_content
    stderr_content=$(cat "$stderr_file" 2>/dev/null)
    rm -f "$stderr_file"

    # Check for timeout
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

    # Detect CLI error envelopes
    local cli_error
    if cli_error=$(_detect_cli_error "$raw_output"); then
        log_error "Claude CLI error: ${cli_error}"
        echo "$raw_output"
        return 2
    fi

    # Extract result from success envelope
    local result_text
    if echo "$raw_output" | jq -e '.result' &>/dev/null; then
        result_text=$(echo "$raw_output" | jq -r '.result')
    else
        result_text="$raw_output"
    fi

    if [[ -z "$result_text" ]]; then
        log_error "JSON agent returned envelope with empty result"
        return 1
    fi

    echo "$result_text"
}

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
