#!/usr/bin/env bash
# grounding.sh — Non-LLM verification gates
#
# These checks use scripts, not LLMs, to verify facts.
# A script can't be bullshitted. That's the point.

# Requires config.sh and log.sh to be sourced first

# ── Grounding Gate: run all non-LLM checks on a completed task ────

grounding_run() {
    local task_id="$1"
    local all_passed=true
    local results=()

    log_step "Running grounding checks for task ${task_id}..."

    # Check 1: Diff is non-empty
    if grounding_check_diff_nonempty "$task_id"; then
        results+=("${GREEN}${SYM_CHECK} Non-empty diff${RESET}")
    else
        results+=("${RED}${SYM_CROSS} Empty diff — agent produced no code changes${RESET}")
        all_passed=false
    fi

    # Check 2: Declared files exist
    if grounding_check_declared_files "$task_id"; then
        results+=("${GREEN}${SYM_CHECK} Declared files exist${RESET}")
    else
        results+=("${RED}${SYM_CROSS} Missing declared files${RESET}")
        all_passed=false
    fi

    # Check 3: Scope check (files touched vs declared)
    local scope_result
    scope_result=$(grounding_check_scope "$task_id")
    local scope_exit=$?
    if [[ $scope_exit -eq 0 ]]; then
        results+=("${GREEN}${SYM_CHECK} Scope check${RESET}")
    elif [[ $scope_exit -eq 2 ]]; then
        results+=("${YELLOW}${SYM_WARN} Scope: undeclared files modified: ${scope_result}${RESET}")
        # Warning, not failure — log it but don't block
    else
        results+=("${RED}${SYM_CROSS} Scope check failed${RESET}")
        all_passed=false
    fi

    # Check 4: Python import verification
    if grounding_check_python_imports "$task_id"; then
        results+=("${GREEN}${SYM_CHECK} Python imports resolve${RESET}")
    else
        results+=("${YELLOW}${SYM_WARN} Unresolved Python imports detected${RESET}")
        # Warning — imports might resolve at runtime with installed packages
    fi

    # Check 5: Check for blocked status in agent output
    if grounding_check_not_blocked "$task_id"; then
        results+=("${GREEN}${SYM_CHECK} Agent completed (not blocked)${RESET}")
    else
        results+=("${RED}${SYM_CROSS} Agent reported blocked status${RESET}")
        all_passed=false
    fi

    # Print results
    echo ""
    echo -e "  ${BOLD}Grounding Checks:${RESET}"
    for r in "${results[@]}"; do
        echo -e "    $r"
    done
    echo ""

    if $all_passed; then
        return 0
    else
        return 1
    fi
}

# ── Check: diff is non-empty ──────────────────────────────────────

grounding_check_diff_nonempty() {
    local task_id="$1"
    local task_json="${TASKS_DIR}/${task_id}.json"
    local branch
    branch=$(jq -r '.branch' "$task_json" 2>/dev/null)

    if [[ -z "$branch" ]] || [[ "$branch" == "null" ]]; then
        return 1
    fi

    local diff
    diff=$(_git diff "main...${branch}" --stat 2>/dev/null)

    [[ -n "$diff" ]]
}

# ── Check: declared files exist ───────────────────────────────────

grounding_check_declared_files() {
    local task_id="$1"
    local task_json="${TASKS_DIR}/${task_id}.json"

    # Get files_touched from task (may not exist in older task format)
    local files_touched
    files_touched=$(jq -r '.files_touched[]?' "$task_json" 2>/dev/null)

    if [[ -z "$files_touched" ]]; then
        # No files declared — can't check, pass by default
        return 0
    fi

    local branch
    branch=$(jq -r '.branch' "$task_json" 2>/dev/null)
    local missing=false

    while IFS= read -r declared_file; do
        [[ -z "$declared_file" ]] && continue
        # Check if file exists on the branch OR was intentionally deleted
        if ! _git show "${branch}:${declared_file}" &>/dev/null; then
            if _git show "main:${declared_file}" &>/dev/null; then
                # File existed on main but was removed on branch — intentional deletion, not missing
                continue
            fi
            # File never existed on main OR branch — spec error, warn but don't fail
            log_warn "Declared file never existed: ${declared_file} (spec may be incorrect)"
        fi
    done <<< "$files_touched"

    ! $missing
}

# ── Check: scope (actual files vs declared files) ─────────────────

grounding_check_scope() {
    local task_id="$1"
    local task_json="${TASKS_DIR}/${task_id}.json"

    local files_touched
    files_touched=$(jq -r '.files_touched[]?' "$task_json" 2>/dev/null)

    if [[ -z "$files_touched" ]]; then
        # No declaration — can't check scope
        return 0
    fi

    local branch
    branch=$(jq -r '.branch' "$task_json" 2>/dev/null)

    # Get actual files changed on branch
    local actual_files
    actual_files=$(_git diff "main...${branch}" --name-only 2>/dev/null)

    if [[ -z "$actual_files" ]]; then
        return 0
    fi

    # Find files that were changed but not declared
    local undeclared=""
    while IFS= read -r actual_file; do
        [[ -z "$actual_file" ]] && continue
        local found=false
        while IFS= read -r declared_file; do
            [[ -z "$declared_file" ]] && continue
            if [[ "$actual_file" == "$declared_file" ]]; then
                found=true
                break
            fi
        done <<< "$files_touched"

        if ! $found; then
            if [[ -n "$undeclared" ]]; then
                undeclared+=", "
            fi
            undeclared+="$actual_file"
        fi
    done <<< "$actual_files"

    if [[ -n "$undeclared" ]]; then
        echo "$undeclared"
        return 2  # warning, not failure
    fi

    return 0
}

# ── Check: Python imports resolve ─────────────────────────────────

grounding_check_python_imports() {
    local task_id="$1"
    local task_json="${TASKS_DIR}/${task_id}.json"
    local branch
    branch=$(jq -r '.branch' "$task_json" 2>/dev/null)

    # Get Python files changed on this branch
    local py_files
    py_files=$(_git diff "main...${branch}" --name-only 2>/dev/null | grep '\.py$' || true)

    if [[ -z "$py_files" ]]; then
        return 0  # No Python files, nothing to check
    fi

    local failed=false
    while IFS= read -r py_file; do
        [[ -z "$py_file" ]] && continue
        local full_path="${TRIBE_ROOT}/${py_file}"
        [[ -f "$full_path" ]] || continue

        # Extract import statements and check if referenced files exist
        # Only check relative/project imports, not stdlib/third-party
        local imports
        imports=$(python3 -c "
import ast, sys
try:
    tree = ast.parse(open('${full_path}').read())
    for node in ast.walk(tree):
        if isinstance(node, ast.ImportFrom) and node.module:
            if node.module.startswith('app.') or node.module.startswith('src.'):
                print(node.module)
except:
    pass
" 2>/dev/null || true)

        while IFS= read -r imp; do
            [[ -z "$imp" ]] && continue
            # Convert module path to file path
            local imp_path
            imp_path=$(echo "$imp" | tr '.' '/')
            # Check both as file and as package
            local found=false
            for base_dir in "src/backend" "src/frontend" "."; do
                if [[ -f "${TRIBE_ROOT}/${base_dir}/${imp_path}.py" ]] || \
                   [[ -f "${TRIBE_ROOT}/${base_dir}/${imp_path}/__init__.py" ]] || \
                   [[ -f "${TRIBE_ROOT}/${imp_path}.py" ]] || \
                   [[ -f "${TRIBE_ROOT}/${imp_path}/__init__.py" ]]; then
                    found=true
                    break
                fi
            done
            if ! $found; then
                log_warn "Unresolved import in ${py_file}: ${imp}"
                failed=true
            fi
        done <<< "$imports"
    done <<< "$py_files"

    ! $failed
}

# ── Check: agent did not report blocked status ────────────────────

grounding_check_not_blocked() {
    local task_id="$1"
    local output_file="${LOGS_DIR}/${task_id}.log"

    if [[ ! -f "$output_file" ]]; then
        return 1  # No output = problem
    fi

    # Check if the agent output contains a blocked status
    if grep -q '"status"[[:space:]]*:[[:space:]]*"blocked"' "$output_file" 2>/dev/null; then
        return 1  # Agent is blocked
    fi

    return 0
}

# ── Contract Check: verify schema matches contract.json ───────────

contract_check() {
    local contract_file="${TRIBE_DIR}/contract.json"

    if [[ ! -f "$contract_file" ]]; then
        log_warn "No contract.json found — skipping contract verification"
        return 0
    fi

    log_step "Verifying schema contract..."

    local all_passed=true
    local results=()

    # Check 1: All declared tables exist in migrations
    local tables
    tables=$(jq -r '.entities[].table' "$contract_file" 2>/dev/null)

    if [[ -n "$tables" ]]; then
        while IFS= read -r table_name; do
            [[ -z "$table_name" ]] && continue
            # Search for table creation in migration files
            local found=false
            for mig_file in "${TRIBE_ROOT}"/src/backend/migrations/versions/*.py; do
                [[ -f "$mig_file" ]] || continue
                if grep -q "op.create_table('${table_name}'" "$mig_file" 2>/dev/null || \
                   grep -q "__tablename__ = \"${table_name}\"" "$mig_file" 2>/dev/null; then
                    found=true
                    break
                fi
            done
            # Also check model files
            if ! $found; then
                for model_file in "${TRIBE_ROOT}"/src/backend/app/models/*.py; do
                    [[ -f "$model_file" ]] || continue
                    if grep -q "__tablename__ = \"${table_name}\"" "$model_file" 2>/dev/null; then
                        found=true
                        break
                    fi
                done
            fi
            if $found; then
                results+=("${GREEN}${SYM_CHECK} Table '${table_name}' exists${RESET}")
            else
                results+=("${RED}${SYM_CROSS} Table '${table_name}' NOT FOUND in models or migrations${RESET}")
                all_passed=false
            fi
        done <<< "$tables"
    fi

    # Check 2: All declared relationships/FKs exist
    local rel_count
    rel_count=$(jq '.relationships | length' "$contract_file" 2>/dev/null || echo 0)

    local i=0
    while [[ $i -lt $rel_count ]]; do
        local from_table to_table rel_type via
        from_table=$(jq -r ".relationships[$i].from" "$contract_file")
        to_table=$(jq -r ".relationships[$i].to" "$contract_file")
        rel_type=$(jq -r ".relationships[$i].type" "$contract_file")
        via=$(jq -r ".relationships[$i].via" "$contract_file")

        local found=false

        if [[ "$rel_type" == "many_to_many" ]]; then
            # Check for join table
            for model_file in "${TRIBE_ROOT}"/src/backend/app/models/*.py; do
                [[ -f "$model_file" ]] || continue
                if grep -q "\"${via}\"" "$model_file" 2>/dev/null; then
                    found=true
                    break
                fi
            done
            if $found; then
                results+=("${GREEN}${SYM_CHECK} Join table '${via}' (${from_table} ↔ ${to_table})${RESET}")
            else
                results+=("${RED}${SYM_CROSS} Join table '${via}' NOT FOUND (${from_table} ↔ ${to_table})${RESET}")
                all_passed=false
            fi
        else
            # Check for FK column
            for model_file in "${TRIBE_ROOT}"/src/backend/app/models/*.py; do
                [[ -f "$model_file" ]] || continue
                if grep -q "${via}" "$model_file" 2>/dev/null; then
                    found=true
                    break
                fi
            done
            if $found; then
                results+=("${GREEN}${SYM_CHECK} FK '${via}' (${from_table} → ${to_table})${RESET}")
            else
                results+=("${RED}${SYM_CROSS} FK '${via}' NOT FOUND (${from_table} → ${to_table})${RESET}")
                all_passed=false
            fi
        fi

        ((i++))
    done

    # Print results
    echo ""
    echo -e "  ${BOLD}Contract Verification:${RESET}"
    for r in "${results[@]}"; do
        echo -e "    $r"
    done
    echo ""

    if $all_passed; then
        log_success "Schema contract satisfied"
        return 0
    else
        log_error "Schema contract VIOLATED — implementation doesn't match plan"
        return 1
    fi
}

# ── Regression Gate: run full test suite ──────────────────────────

regression_run() {
    log_step "Running regression tests (full suite)..."

    local all_passed=true
    local results=()

    # Regression runs ALL gate commands (no subsystem filter — "both")
    local gate_type gate_label
    for gate_type in test lint typecheck; do
        case "$gate_type" in
            test)      gate_label="Tests" ;;
            lint)      gate_label="Lint" ;;
            typecheck) gate_label="Typecheck" ;;
        esac

        local cmds
        cmds=$(gates_get_config "$gate_type" "both")
        if [[ -n "$cmds" ]]; then
            while IFS= read -r cmd; do
                [[ -z "$cmd" ]] && continue
                if gate_run_command "Regression ${gate_label}" "$cmd"; then
                    results+=("${GREEN}${SYM_CHECK} ${gate_label}: ${DIM}${cmd}${RESET}")
                else
                    results+=("${RED}${SYM_CROSS} ${gate_label} FAILED: ${DIM}${cmd}${RESET}")
                    all_passed=false
                fi
            done <<< "$cmds"
        else
            results+=("${DIM}○ ${gate_label} (not configured)${RESET}")
        fi
    done

    echo ""
    echo -e "  ${BOLD}Regression Check:${RESET}"
    for r in "${results[@]}"; do
        echo -e "    $r"
    done
    echo ""

    if $all_passed; then
        return 0
    else
        return 1
    fi
}

# ── File conflict detection ───────────────────────────────────────
# Check if a task's declared files conflict with any running task

grounding_check_file_conflicts() {
    local task_id="$1"
    local task_json="${TASKS_DIR}/${task_id}.json"

    local my_files
    my_files=$(jq -r '.files_touched[]?' "$task_json" 2>/dev/null)

    if [[ -z "$my_files" ]]; then
        return 0  # No declarations, can't check
    fi

    # Check against all running tasks
    local running_tasks
    running_tasks=$(task_list_by_status "running")

    if [[ -z "$running_tasks" ]]; then
        return 0
    fi

    local conflicts=""
    while IFS= read -r other_id; do
        [[ -z "$other_id" ]] && continue
        [[ "$other_id" == "$task_id" ]] && continue

        local other_json="${TASKS_DIR}/${other_id}.json"
        local other_files
        other_files=$(jq -r '.files_touched[]?' "$other_json" 2>/dev/null)

        while IFS= read -r my_file; do
            [[ -z "$my_file" ]] && continue
            while IFS= read -r other_file; do
                [[ -z "$other_file" ]] && continue
                if [[ "$my_file" == "$other_file" ]]; then
                    conflicts+="Task ${task_id} and Task ${other_id} both touch: ${my_file}\n"
                fi
            done <<< "$other_files"
        done <<< "$my_files"
    done <<< "$running_tasks"

    if [[ -n "$conflicts" ]]; then
        echo -e "$conflicts"
        return 1
    fi

    return 0
}
