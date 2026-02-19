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

# Spawn a Claude agent with a system prompt and user message
# Returns the agent's output on stdout
claude_run() {
    local system_prompt_file="$1"
    local user_message="$2"
    local model="${3:-$DEFAULT_MODEL}"
    local max_budget="${4:-$DEFAULT_TASK_BUDGET}"
    local allowed_tools="${5:-Bash Edit Read Write Glob Grep}"

    local system_prompt
    system_prompt="$(cat "$system_prompt_file")"

    # Prepend CLAUDE.md content if it exists
    local context=""
    if [[ -f "$CLAUDE_MD" ]]; then
        context="$(cat "$CLAUDE_MD")"$'\n\n---\n\n'
    fi

    local agent_timeout="${DEFAULT_AGENT_TIMEOUT:-600}"
    if [[ -n "$_TIMEOUT_CMD" ]]; then
        "$_TIMEOUT_CMD" "$agent_timeout" \
            "$CLAUDE_BIN" -p \
            --model "$model" \
            --allowedTools "$allowed_tools" \
            --max-turns 50 \
            "${context}${system_prompt}"$'\n\n---\n\n'"${user_message}" \
            2>/dev/null
    else
        "$CLAUDE_BIN" -p \
            --model "$model" \
            --allowedTools "$allowed_tools" \
            --max-turns 50 \
            "${context}${system_prompt}"$'\n\n---\n\n'"${user_message}" \
            2>/dev/null
    fi
}

# Spawn a Claude agent that outputs structured JSON
claude_run_json() {
    local system_prompt_file="$1"
    local user_message="$2"
    local json_schema_file="$3"
    local model="${4:-$DEFAULT_MODEL}"
    local max_budget="${5:-$DEFAULT_TASK_BUDGET}"

    local system_prompt
    system_prompt="$(cat "$system_prompt_file")"

    local context=""
    if [[ -f "$CLAUDE_MD" ]]; then
        context="$(cat "$CLAUDE_MD")"$'\n\n---\n\n'
    fi

    local schema
    schema="$(cat "$json_schema_file")"

    # Use --max-turns 3: the JSON-producing agent has full context in the
    # prompt and should respond in 1 turn. Higher values cause the model to
    # spend turns on tool calls (reading/editing files) which can hang
    # indefinitely in a backgrounded process.
    local raw_output
    raw_output=$("$CLAUDE_BIN" -p \
        --model "$model" \
        --output-format json \
        --max-turns 3 \
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
    local model="${4:-$DEFAULT_MODEL}"
    local max_budget="${5:-$DEFAULT_TASK_BUDGET}"
    local allowed_tools="${6:-Bash Edit Read Write Glob Grep}"

    local system_prompt
    system_prompt="$(cat "$system_prompt_file")"

    local context=""
    if [[ -f "$CLAUDE_MD" ]]; then
        context="$(cat "$CLAUDE_MD")"$'\n\n---\n\n'
    fi

    # Write a marker file when process completes
    local done_marker="${output_file}.done"
    local timeout_marker="${output_file}.timeout"
    rm -f "$done_marker" "$timeout_marker"

    local agent_timeout="${DEFAULT_AGENT_TIMEOUT:-600}"
    if [[ -n "$_TIMEOUT_CMD" ]]; then
        ( "$_TIMEOUT_CMD" "$agent_timeout" \
            "$CLAUDE_BIN" -p \
            --model "$model" \
            --allowedTools "$allowed_tools" \
            --max-turns 50 \
            "${context}${system_prompt}"$'\n\n---\n\n'"${user_message}" \
            > "$output_file" 2>&1
          local rc=$?
          if [[ $rc -eq 124 ]]; then
              touch "$timeout_marker"
              echo '{"status":"blocked","blocked_reason":"timeout","uncertain_about":"Agent timed out after '"$agent_timeout"'s"}' >> "$output_file"
          fi
          touch "$done_marker"
        ) &
    else
        ( "$CLAUDE_BIN" -p \
            --model "$model" \
            --allowedTools "$allowed_tools" \
            --max-turns 50 \
            "${context}${system_prompt}"$'\n\n---\n\n'"${user_message}" \
            > "$output_file" 2>&1
          touch "$done_marker"
        ) &
    fi

    echo $!
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
