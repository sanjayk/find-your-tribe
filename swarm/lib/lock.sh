#!/usr/bin/env bash
# lock.sh — Swarm-level exclusive lock for mutation operations
#
# Uses mkdir as a portable atomic lock (POSIX-guaranteed atomic).
# Stores PID, command name, and timestamp for diagnostics.
# Automatically detects and breaks stale locks from crashed processes.
#
# Requires config.sh and log.sh to be sourced first.

SWARM_LOCK="${TRIBE_DIR}/swarm.lock"

# Acquire exclusive lock for a mutation command.
# Args: command_name [max_wait_seconds]
#   max_wait=0 (default) means fail immediately if locked.
# Returns 0 on success, 1 if another command holds the lock.
swarm_acquire_lock() {
    local command="$1"
    local max_wait="${2:-0}"
    local waited=0

    mkdir -p "$TRIBE_DIR"

    while ! mkdir "$SWARM_LOCK" 2>/dev/null; do
        # Check for stale lock (holder process is dead)
        if [[ -f "$SWARM_LOCK/pid" ]]; then
            local lock_pid lock_cmd lock_time
            lock_pid=$(cat "$SWARM_LOCK/pid" 2>/dev/null || echo "")
            lock_cmd=$(cat "$SWARM_LOCK/command" 2>/dev/null || echo "unknown")
            lock_time=$(cat "$SWARM_LOCK/acquired_at" 2>/dev/null || echo "unknown")

            if [[ -n "$lock_pid" ]] && ! kill -0 "$lock_pid" 2>/dev/null; then
                log_warn "Breaking stale lock from '${lock_cmd}' (PID ${lock_pid}, acquired ${lock_time})"
                rm -rf "$SWARM_LOCK"
                continue
            fi

            # Lock is held by a live process
            if [[ $max_wait -eq 0 ]]; then
                log_error "Cannot run '${command}': '${lock_cmd}' is already running (PID ${lock_pid}, since ${lock_time})"
                log_error "If the process is stuck, run: tribe recover"
                return 1
            fi
        else
            # Lock dir exists but no PID file — broken state, clean up
            rm -rf "$SWARM_LOCK"
            continue
        fi

        if [[ $waited -ge $max_wait ]]; then
            log_error "Timed out waiting for lock after ${max_wait}s"
            return 1
        fi
        sleep 1
        ((waited++))
    done

    # Write lock metadata
    echo $$ > "$SWARM_LOCK/pid"
    echo "$command" > "$SWARM_LOCK/command"
    echo "$(date -u +%Y-%m-%dT%H:%M:%SZ)" > "$SWARM_LOCK/acquired_at"

    # Ensure lock is released on exit, interrupt, or termination
    trap '_swarm_cleanup_on_exit' EXIT
    trap '_swarm_cleanup_on_signal' INT TERM

    return 0
}

# Release the lock. Safe to call multiple times.
swarm_release_lock() {
    if [[ -d "$SWARM_LOCK" ]]; then
        # Only release if we own it
        local lock_pid
        lock_pid=$(cat "$SWARM_LOCK/pid" 2>/dev/null || echo "")
        if [[ "$lock_pid" == "$$" ]]; then
            rm -rf "$SWARM_LOCK"
        fi
    fi
}

# Force-break the lock regardless of owner. Used by cmd_recover.
swarm_force_break_lock() {
    if [[ -d "$SWARM_LOCK" ]]; then
        local lock_pid lock_cmd
        lock_pid=$(cat "$SWARM_LOCK/pid" 2>/dev/null || echo "unknown")
        lock_cmd=$(cat "$SWARM_LOCK/command" 2>/dev/null || echo "unknown")
        log_step "Force-breaking lock held by '${lock_cmd}' (PID ${lock_pid})"
        rm -rf "$SWARM_LOCK"
    fi
}

# Internal: cleanup handler for normal exit
_swarm_cleanup_on_exit() {
    swarm_release_lock
}

# Internal: cleanup handler for signals (INT, TERM)
# Sets state to idle before releasing lock.
_swarm_cleanup_on_signal() {
    echo "" # newline after ^C
    log_warn "Interrupted — cleaning up..."

    # Update swarm state to idle
    if [[ -f "$STATE_FILE" ]]; then
        jq '.status = "idle" | .agents = []' "$STATE_FILE" > "${STATE_FILE}.tmp" && \
            mv "${STATE_FILE}.tmp" "$STATE_FILE" 2>/dev/null || true
    fi

    swarm_release_lock

    # Re-raise the signal so the shell exits with correct status
    trap - INT TERM
    kill -s INT $$ 2>/dev/null || exit 130
}
