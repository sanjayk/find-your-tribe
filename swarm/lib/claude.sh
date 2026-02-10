#!/usr/bin/env bash
# claude.sh — Claude CLI wrapper for spawning agents

# Requires config.sh and log.sh to be sourced first

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

    claude -p \
        --model "$model" \
        --allowedTools "$allowed_tools" \
        --max-turns 50 \
        "${context}${system_prompt}"$'\n\n---\n\n'"${user_message}" \
        2>/dev/null
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

    claude -p \
        --model "$model" \
        --output-format json \
        --max-turns 30 \
        "${context}${system_prompt}"$'\n\n---\n\nIMPORTANT: You MUST respond with valid JSON matching this schema:\n```json\n'"${schema}"$'\n```\n\n---\n\n'"${user_message}" \
        2>/dev/null
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

    claude -p \
        --model "$model" \
        --allowedTools "$allowed_tools" \
        --max-turns 50 \
        "${context}${system_prompt}"$'\n\n---\n\n'"${user_message}" \
        > "$output_file" 2>&1 &

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
