#!/usr/bin/env bash
# tasks.sh — Task file CRUD and dependency resolution

# Requires config.sh and log.sh to be sourced first
# Requires: jq

_ensure_jq() {
    if ! command -v jq &>/dev/null; then
        log_error "jq is required but not installed. Install with: brew install jq"
        exit 1
    fi
}

# Create a task file from parameters
task_create() {
    local id="$1"
    local title="$2"
    local description="$3"
    local acceptance_criteria="$4"
    local depends_on="$5"  # JSON array string, e.g. '["1","2"]'
    local agent_model="${6:-$MODEL_SUPPORT}"

    _ensure_jq

    local slug
    slug=$(echo "$title" | tr '[:upper:]' '[:lower:]' | sed 's/[^a-z0-9]/-/g' | sed 's/--*/-/g' | sed 's/^-//' | sed 's/-$//' | cut -c1-40)

    local task_file="${TASKS_DIR}/${id}.json"

    jq -n \
        --arg id "$id" \
        --arg title "$title" \
        --arg description "$description" \
        --arg criteria "$acceptance_criteria" \
        --argjson depends_on "${depends_on:-[]}" \
        --arg status "pending" \
        --arg branch "${BRANCH_PREFIX}/task-${id}-${slug}" \
        --arg model "$agent_model" \
        --arg created "$(date -u +%Y-%m-%dT%H:%M:%SZ)" \
        '{
            id: $id,
            title: $title,
            description: $description,
            acceptance_criteria: $criteria,
            depends_on: $depends_on,
            status: $status,
            branch: $branch,
            agent_model: $model,
            created_at: $created,
            started_at: null,
            completed_at: null,
            agent_pid: null,
            error: null,
            review_feedback: null
        }' > "$task_file"

    echo "$task_file"
}

# Read a task file
task_get() {
    local id="$1"
    _ensure_jq
    local task_file="${TASKS_DIR}/${id}.json"
    if [[ -f "$task_file" ]]; then
        cat "$task_file"
    else
        log_error "Task ${id} not found"
        return 1
    fi
}

# Update a field in a task
task_update() {
    local id="$1"
    local field="$2"
    local value="$3"

    _ensure_jq

    local task_file="${TASKS_DIR}/${id}.json"
    if [[ ! -f "$task_file" ]]; then
        log_error "Task ${id} not found"
        return 1
    fi

    local tmp
    tmp=$(mktemp)
    jq --arg val "$value" ".${field} = \$val" "$task_file" > "$tmp" && mv "$tmp" "$task_file"
}

# Update a field with a raw JSON value
task_update_raw() {
    local id="$1"
    local field="$2"
    local value="$3"

    _ensure_jq

    local task_file="${TASKS_DIR}/${id}.json"
    if [[ ! -f "$task_file" ]]; then
        log_error "Task ${id} not found"
        return 1
    fi

    local tmp
    tmp=$(mktemp)
    jq --argjson val "$value" ".${field} = \$val" "$task_file" > "$tmp" && mv "$tmp" "$task_file"
}

# ── Atomic state transitions ─────────────────────────────────────
# Each function applies all field changes in a single jq invocation.
# The task file is either fully in the old state or fully in the new
# state — never in between, even if the process crashes.

# Transition: * → running
task_set_running() {
    local id="$1"
    local pid="$2"
    _ensure_jq
    local task_file="${TASKS_DIR}/${id}.json"
    [[ -f "$task_file" ]] || { log_error "Task ${id} not found"; return 1; }
    local tmp; tmp=$(mktemp)
    jq --arg ts "$(date -u +%Y-%m-%dT%H:%M:%SZ)" --argjson pid "$pid" \
        '.status = "running" | .started_at = $ts | .agent_pid = $pid' \
        "$task_file" > "$tmp" && mv "$tmp" "$task_file"
}

# Transition: running → done
task_set_done() {
    local id="$1"
    _ensure_jq
    local task_file="${TASKS_DIR}/${id}.json"
    [[ -f "$task_file" ]] || { log_error "Task ${id} not found"; return 1; }
    local tmp; tmp=$(mktemp)
    jq --arg ts "$(date -u +%Y-%m-%dT%H:%M:%SZ)" \
        '.status = "done" | .completed_at = $ts | .agent_pid = null' \
        "$task_file" > "$tmp" && mv "$tmp" "$task_file"
}

# Transition: running → failed
task_set_failed() {
    local id="$1"
    local error="$2"
    _ensure_jq
    local task_file="${TASKS_DIR}/${id}.json"
    [[ -f "$task_file" ]] || { log_error "Task ${id} not found"; return 1; }
    local tmp; tmp=$(mktemp)
    jq --arg err "$error" \
        '.status = "failed" | .error = $err | .agent_pid = null' \
        "$task_file" > "$tmp" && mv "$tmp" "$task_file"
}

# Transition: running → blocked
task_set_blocked() {
    local id="$1"
    local error="$2"
    _ensure_jq
    local task_file="${TASKS_DIR}/${id}.json"
    [[ -f "$task_file" ]] || { log_error "Task ${id} not found"; return 1; }
    local tmp; tmp=$(mktemp)
    jq --arg err "$error" \
        '.status = "blocked" | .error = $err | .agent_pid = null' \
        "$task_file" > "$tmp" && mv "$tmp" "$task_file"
}

# Transition: done → pending (review requested changes)
task_request_changes() {
    local id="$1"
    local feedback="$2"
    _ensure_jq
    local task_file="${TASKS_DIR}/${id}.json"
    [[ -f "$task_file" ]] || { log_error "Task ${id} not found"; return 1; }
    local tmp; tmp=$(mktemp)
    jq --arg fb "$feedback" \
        '.status = "pending" | .review_feedback = $fb' \
        "$task_file" > "$tmp" && mv "$tmp" "$task_file"
}

# Transition: running → failed (timeout with escalation tracking)
# Increments timeout_count so the orchestrator can apply deterministic
# escalation: first timeout → escalate model, second → human.
task_set_timeout() {
    local id="$1"
    local reason="$2"
    _ensure_jq
    local task_file="${TASKS_DIR}/${id}.json"
    [[ -f "$task_file" ]] || { log_error "Task ${id} not found"; return 1; }
    local tmp; tmp=$(mktemp)
    jq --arg err "$reason" \
        '.status = "failed" | .error = $err | .agent_pid = null | .timeout_count = ((.timeout_count // 0) + 1)' \
        "$task_file" > "$tmp" && mv "$tmp" "$task_file"
}

# Transition: failed/blocked → pending (full reset for retry or recover)
# Preserves review_feedback, agent_model, timeout_count, retry_count.
task_reset_pending() {
    local id="$1"
    _ensure_jq
    local task_file="${TASKS_DIR}/${id}.json"
    [[ -f "$task_file" ]] || { log_error "Task ${id} not found"; return 1; }
    local tmp; tmp=$(mktemp)
    jq '.status = "pending" | .error = null | .agent_pid = null | .started_at = null | .completed_at = null | .retry_count = ((.retry_count // 0) + 1)' \
        "$task_file" > "$tmp" && mv "$tmp" "$task_file"
}

# Get all task IDs
task_list_ids() {
    _ensure_jq
    for f in "${TASKS_DIR}"/*.json; do
        [[ -f "$f" ]] || continue
        jq -r '.id' "$f"
    done | sort -n
}

# Get tasks by status
task_list_by_status() {
    local status="$1"
    _ensure_jq
    for f in "${TASKS_DIR}"/*.json; do
        [[ -f "$f" ]] || continue
        local s
        s=$(jq -r '.status' "$f")
        if [[ "$s" == "$status" ]]; then
            jq -r '.id' "$f"
        fi
    done | sort -n
}

# Check if all dependencies of a task are done
task_deps_met() {
    local id="$1"
    _ensure_jq

    local task_file="${TASKS_DIR}/${id}.json"
    local deps
    deps=$(jq -r '.depends_on[]' "$task_file" 2>/dev/null)

    if [[ -z "$deps" ]]; then
        return 0 # no dependencies
    fi

    while IFS= read -r dep_id; do
        local dep_status
        dep_status=$(jq -r '.status' "${TASKS_DIR}/${dep_id}.json" 2>/dev/null)
        if [[ "$dep_status" != "done" ]]; then
            return 1
        fi
    done <<< "$deps"

    return 0
}

# Get tasks that are ready to run (pending + all deps met)
task_list_ready() {
    _ensure_jq
    local pending
    pending=$(task_list_by_status "pending")

    if [[ -z "$pending" ]]; then
        return
    fi

    while IFS= read -r id; do
        if task_deps_met "$id"; then
            echo "$id"
        fi
    done <<< "$pending"
}

# Get count of tasks by status
task_count_by_status() {
    local status="$1"
    local count=0
    for f in "${TASKS_DIR}"/*.json; do
        [[ -f "$f" ]] || continue
        local s
        s=$(jq -r '.status' "$f" 2>/dev/null)
        if [[ "$s" == "$status" ]]; then
            ((count++))
        fi
    done
    echo "$count"
}

# Get total task count
task_count_total() {
    local count=0
    for f in "${TASKS_DIR}"/*.json; do
        [[ -f "$f" ]] && ((count++))
    done
    echo "$count"
}

# Print task summary table
task_print_summary() {
    _ensure_jq

    local total done pending running failed
    total=$(task_count_total)
    done=$(task_count_by_status "done")
    pending=$(task_count_by_status "pending")
    running=$(task_count_by_status "running")
    failed=$(task_count_by_status "failed")

    echo -e "${BOLD}Tasks:${RESET} ${total} total | ${GREEN}${done} done${RESET} | ${YELLOW}${running} running${RESET} | ${DIM}${pending} pending${RESET} | ${RED}${failed} failed${RESET}"
}

# Print task graph
task_print_graph() {
    _ensure_jq

    for f in "${TASKS_DIR}"/*.json; do
        [[ -f "$f" ]] || continue

        local id title status deps
        id=$(jq -r '.id' "$f")
        title=$(jq -r '.title' "$f")
        status=$(jq -r '.status' "$f")
        deps=$(jq -r '.depends_on | join(", ")' "$f")

        local status_icon status_color
        local timeout_count retry_count
        timeout_count=$(jq -r '.timeout_count // 0' "$f")
        retry_count=$(jq -r '.retry_count // 0' "$f")

        case "$status" in
            pending) status_icon="$SYM_PENDING"; status_color="$DIM" ;;
            running) status_icon="$SYM_RUNNING"; status_color="$YELLOW" ;;
            done)    status_icon="$SYM_CHECK";   status_color="$GREEN" ;;
            failed)  status_icon="$SYM_CROSS";   status_color="$RED" ;;
            *)       status_icon="?";            status_color="$DIM" ;;
        esac

        local dep_str=""
        if [[ -n "$deps" ]]; then
            dep_str=" ${DIM}(depends on: ${deps})${RESET}"
        fi

        local history_str=""
        if [[ "$timeout_count" -gt 0 ]]; then
            history_str+=" ${YELLOW}[timed out x${timeout_count}]${RESET}"
        fi
        if [[ "$retry_count" -gt 0 ]]; then
            history_str+=" ${MAGENTA}[retry x${retry_count}]${RESET}"
        fi

        printf "  %b%s%b  %-4s %s%s%s\n" "$status_color" "$status_icon" "$RESET" "$id" "$title" "$dep_str" "$history_str"
    done | sort -t' ' -k4 -n
}

# Topological sort of tasks (returns IDs in execution order)
# Uses file-based tracking for bash 3.2 compatibility (no associative arrays)
task_topo_sort() {
    _ensure_jq

    local tmpdir
    tmpdir=$(mktemp -d)
    mkdir -p "$tmpdir/degree" "$tmpdir/adj"

    local all_ids=()

    # Build graph — store in_degree and adjacency in temp files
    for f in "${TASKS_DIR}"/*.json; do
        [[ -f "$f" ]] || continue
        local id
        id=$(jq -r '.id' "$f")
        all_ids+=("$id")
        echo "0" > "$tmpdir/degree/$id"
    done

    for f in "${TASKS_DIR}"/*.json; do
        [[ -f "$f" ]] || continue
        local id
        id=$(jq -r '.id' "$f")
        local deps
        deps=$(jq -r '.depends_on[]' "$f" 2>/dev/null || true)
        while IFS= read -r dep; do
            [[ -z "$dep" ]] && continue
            local cur_deg
            cur_deg=$(cat "$tmpdir/degree/$id" 2>/dev/null || echo 0)
            echo "$(( cur_deg + 1 ))" > "$tmpdir/degree/$id"
            # Append to adjacency list
            echo "$id" >> "$tmpdir/adj/$dep"
        done <<< "$deps"
    done

    # Kahn's algorithm
    local queue=()
    for id in "${all_ids[@]}"; do
        local deg
        deg=$(cat "$tmpdir/degree/$id" 2>/dev/null || echo 0)
        if [[ "$deg" -eq 0 ]]; then
            queue+=("$id")
        fi
    done

    local sorted=()
    while [[ ${#queue[@]} -gt 0 ]]; do
        local current="${queue[0]}"
        queue=("${queue[@]:1}")
        sorted+=("$current")

        if [[ -f "$tmpdir/adj/$current" ]]; then
            while IFS= read -r neighbor; do
                [[ -z "$neighbor" ]] && continue
                local deg
                deg=$(cat "$tmpdir/degree/$neighbor" 2>/dev/null || echo 0)
                deg=$(( deg - 1 ))
                echo "$deg" > "$tmpdir/degree/$neighbor"
                if [[ "$deg" -eq 0 ]]; then
                    queue+=("$neighbor")
                fi
            done < "$tmpdir/adj/$current"
        fi
    done

    rm -rf "$tmpdir"

    # Cycle detection: if not all tasks were sorted, there's a cycle
    if [[ ${#sorted[@]} -ne ${#all_ids[@]} ]]; then
        log_error "Circular dependency detected! Sorted ${#sorted[@]} of ${#all_ids[@]} tasks."
        # Find the tasks that weren't sorted (they form the cycle)
        local unsorted=()
        for id in "${all_ids[@]}"; do
            local found=false
            if [[ ${#sorted[@]} -gt 0 ]]; then
                for sid in "${sorted[@]}"; do
                    if [[ "$id" == "$sid" ]]; then
                        found=true
                        break
                    fi
                done
            fi
            if ! $found; then
                unsorted+=("$id")
            fi
        done
        log_error "Tasks in cycle: ${unsorted[*]}"
        return 1
    fi

    printf '%s\n' "${sorted[@]}"
}
