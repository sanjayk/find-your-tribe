#!/usr/bin/env bash
# grounding.sh — Non-LLM verification gates
#
# These checks use scripts, not LLMs, to verify facts.
# A script can't be bullshitted. That's the point.

# Requires config.sh and log.sh to be sourced first

# ── Grounding Gate: run all non-LLM checks on a completed task ────

grounding_run() {
    local task_id="$1"
    local worktree_path="${2:-$PROJECT_ROOT}"
    local all_passed=true
    local results=()

    log_step "Running grounding checks for task ${task_id}..."

    # Check 1: Diff is non-empty
    if grounding_check_diff_nonempty "$task_id"; then
        results+=("${COLOR_SUCCESS}${SYM_CHECK} Non-empty diff${RESET}")
    else
        results+=("${COLOR_ERROR}${SYM_CROSS} Empty diff — agent produced no code changes${RESET}")
        all_passed=false
    fi

    # Check 2: Declared files exist
    if grounding_check_declared_files "$task_id"; then
        results+=("${COLOR_SUCCESS}${SYM_CHECK} Declared files exist${RESET}")
    else
        results+=("${COLOR_ERROR}${SYM_CROSS} Missing declared files${RESET}")
        all_passed=false
    fi

    # Check 3: Scope check (files touched vs declared)
    local scope_result
    scope_result=$(grounding_check_scope "$task_id")
    local scope_exit=$?
    if [[ $scope_exit -eq 0 ]]; then
        results+=("${COLOR_SUCCESS}${SYM_CHECK} Scope check${RESET}")
    elif [[ $scope_exit -eq 2 ]]; then
        results+=("${COLOR_WARN}${SYM_WARN} Scope: undeclared files modified: ${scope_result}${RESET}")
        # Warning, not failure — log it but don't block
    else
        results+=("${COLOR_ERROR}${SYM_CROSS} Scope check failed${RESET}")
        all_passed=false
    fi

    # Check 4: Python import verification
    if grounding_check_python_imports "$task_id" "$worktree_path"; then
        results+=("${COLOR_SUCCESS}${SYM_CHECK} Python imports resolve${RESET}")
    else
        results+=("${COLOR_WARN}${SYM_WARN} Unresolved Python imports detected${RESET}")
        # Warning — imports might resolve at runtime with installed packages
    fi

    # Check 5: Check for blocked status in agent output
    if grounding_check_not_blocked "$task_id"; then
        results+=("${COLOR_SUCCESS}${SYM_CHECK} Agent completed (not blocked)${RESET}")
    else
        results+=("${COLOR_ERROR}${SYM_CROSS} Agent reported blocked status${RESET}")
        all_passed=false
    fi

    # Check 6: Test file coverage
    if grounding_check_test_coverage "$task_id"; then
        results+=("${COLOR_SUCCESS}${SYM_CHECK} Test file coverage${RESET}")
    else
        results+=("${COLOR_ERROR}${SYM_CROSS} Missing test files for new source files${RESET}")
        all_passed=false
    fi

    # Check 7: Gate invocation evidence
    # TODO: Promote to hard failure after rollout stabilizes
    if grounding_check_gate_evidence "$task_id"; then
        results+=("${COLOR_SUCCESS}${SYM_CHECK} Gate evidence (agent ran quality gates)${RESET}")
    else
        results+=("${COLOR_WARN}${SYM_WARN} No gate invocation evidence in agent output${RESET}")
        # Warning only — does not set all_passed=false
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
    branch=$(jq -r '.branch // empty' "$task_json")

    if [[ -z "$branch" ]] || [[ "$branch" == "null" ]]; then
        return 1
    fi

    local diff
    diff=$(_git diff "$(git_main_branch)...${branch}" --stat 2>/dev/null)

    [[ -n "$diff" ]]
}

# ── Check: declared files exist ───────────────────────────────────

grounding_check_declared_files() {
    local task_id="$1"
    local task_json="${TASKS_DIR}/${task_id}.json"

    # Get files_touched from task (may not exist in older task format)
    local files_touched
    files_touched=$(jq -r '.files_touched[]?' "$task_json")

    if [[ -z "$files_touched" ]]; then
        # No files declared — can't check, pass by default
        return 0
    fi

    local branch
    branch=$(jq -r '.branch // empty' "$task_json")
    local missing=false

    while IFS= read -r declared_file; do
        [[ -z "$declared_file" ]] && continue
        # Check if file exists on the branch OR was intentionally deleted
        if ! _git show "${branch}:${declared_file}" &>/dev/null; then
            if _git show "main:${declared_file}" &>/dev/null; then
                # File existed on main but was removed on branch — intentional deletion, not missing
                continue
            fi
            # File never existed on main OR branch — it's genuinely missing
            log_warn "Declared file missing: ${declared_file} (not on branch '${branch}' or main)"
            missing=true
        fi
    done <<< "$files_touched"

    ! $missing
}

# ── Check: scope (actual files vs declared files) ─────────────────

grounding_check_scope() {
    local task_id="$1"
    local task_json="${TASKS_DIR}/${task_id}.json"

    local files_touched
    files_touched=$(jq -r '.files_touched[]?' "$task_json")

    if [[ -z "$files_touched" ]]; then
        # No declaration — can't check scope
        return 0
    fi

    local branch
    branch=$(jq -r '.branch // empty' "$task_json")

    # Get actual files changed on branch
    local actual_files
    actual_files=$(_git diff "$(git_main_branch)...${branch}" --name-only 2>/dev/null)

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
    local worktree_path="${2:-$PROJECT_ROOT}"
    local task_json="${TASKS_DIR}/${task_id}.json"
    local branch
    branch=$(jq -r '.branch // empty' "$task_json")

    # Get Python files changed on this branch
    local py_files
    py_files=$(_git diff "$(git_main_branch)...${branch}" --name-only 2>/dev/null | grep '\.py$' || true)

    if [[ -z "$py_files" ]]; then
        return 0  # No Python files, nothing to check
    fi

    local failed=false
    while IFS= read -r py_file; do
        [[ -z "$py_file" ]] && continue
        local full_path="${worktree_path}/${py_file}"
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
            # Check both as file and as package (look in worktree first, then main repo)
            local found=false
            for base_root in "$worktree_path" "$PROJECT_ROOT"; do
                for base_dir in "src/backend" "src/frontend" "."; do
                    if [[ -f "${base_root}/${base_dir}/${imp_path}.py" ]] || \
                       [[ -f "${base_root}/${base_dir}/${imp_path}/__init__.py" ]] || \
                       [[ -f "${base_root}/${imp_path}.py" ]] || \
                       [[ -f "${base_root}/${imp_path}/__init__.py" ]]; then
                        found=true
                        break 2
                    fi
                done
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

# ── Check: test file coverage ─────────────────────────────────────

# Helper: returns 0 (exclude/skip) if the file does not require a test counterpart.
# Returns 1 (include) if a test file is required.
_test_coverage_excluded() {
    local file="$1"
    local basename
    basename=$(basename "$file")
    local dir
    dir=$(dirname "$file")

    # Test files themselves never require a test-of-test
    case "$basename" in
        *.test.ts|*.test.tsx|*.spec.ts|*.spec.tsx|*_test.py|test_*.py) return 0 ;;
    esac

    # Config and setup files
    case "$basename" in
        vitest.config.*|next.config.*|jest.config.*|tailwind.config.*|postcss.config.*|\
        eslint.config.*|prettier.config.*|tsconfig*.json|*.config.ts|*.config.js|\
        *.config.mjs|*.config.cjs|setup.ts|setup.js) return 0 ;;
    esac

    # Type definitions
    case "$basename" in
        *.d.ts) return 0 ;;
    esac
    if [[ "$basename" == "types.ts" ]] || [[ "$basename" == "types.tsx" ]]; then
        return 0
    fi

    # Barrel exports
    if [[ "$basename" == "index.ts" ]] || [[ "$basename" == "index.tsx" ]]; then
        return 0
    fi

    # Markdown and documentation files (agent definitions, specs, docs — no test coupling)
    case "$basename" in
        *.md|*.mdx) return 0 ;;
    esac

    # CSS / static assets
    case "$basename" in
        *.css|*.scss|*.sass|*.less|*.svg|*.png|*.jpg|*.jpeg|*.gif|*.ico|\
        *.woff|*.woff2|*.ttf|*.eot|*.webp|*.avif) return 0 ;;
    esac

    # Migrations (alembic or generic migrations directory)
    if [[ "$file" == alembic/* ]] || [[ "$file" == */alembic/* ]] || \
       [[ "$file" == migrations/* ]] || [[ "$file" == */migrations/* ]]; then
        return 0
    fi

    # Seed data (src/backend/app/seed/ or any seed directory)
    if [[ "$file" == */seed/* ]]; then
        return 0
    fi

    # Next.js layout and route segments (no logic to test independently)
    case "$basename" in
        page.tsx|page.ts|layout.tsx|layout.ts|route.tsx|route.ts|\
        middleware.ts|loading.tsx|error.tsx|not-found.tsx|template.tsx|\
        global-error.tsx|default.tsx) return 0 ;;
    esac

    # Test directories — all files within test/, tests/, __tests__/ are utilities, not tested
    if [[ "$file" == */test/* ]] || [[ "$file" == */tests/* ]] || \
       [[ "$file" == */__tests__/* ]]; then
        return 0
    fi

    # Test utility mocks
    if [[ "$file" == */__mocks__/* ]] || \
       [[ "$basename" == *.mock.ts ]] || [[ "$basename" == *.mock.tsx ]]; then
        return 0
    fi

    # shadcn/ui components (generated primitives, not product logic)
    if [[ "$file" == src/frontend/components/ui/* ]]; then
        return 0
    fi

    # GraphQL type definitions
    if [[ "$file" == */graphql/types/* ]] || [[ "$file" == */graphql/types.ts ]] || \
       [[ "$file" == */graphql/types.tsx ]]; then
        return 0
    fi

    # types/ directory anywhere in path
    if [[ "$dir" == */types ]] || [[ "$file" == */types/* ]]; then
        return 0
    fi

    return 1  # File requires a corresponding test
}

# Helper: returns 0 if a test file corresponding to $file exists in $diff_files.
# $diff_files is a newline-separated list of all files changed on the branch.
_test_file_exists_in_diff() {
    local file="$1"
    local diff_files="$2"
    local basename dir stem ext

    basename=$(basename "$file")
    dir=$(dirname "$file")

    if [[ "$file" == *.py ]]; then
        # Backend: co-located {stem}_test.py OR any tests/test_{stem}.py in the diff
        stem="${basename%.py}"
        local colocated_test="${dir}/${stem}_test.py"
        # Use suffix match so tests/ at any level (e.g. src/backend/tests/) is found
        if echo "$diff_files" | grep -qF "$colocated_test" || \
           echo "$diff_files" | grep -qF "tests/test_${stem}.py"; then
            return 0
        fi
    else
        # Frontend: same directory, {stem}.test.{tsx|ts}
        ext="${basename##*.}"
        stem="${basename%.*}"
        local test_tsx="${dir}/${stem}.test.tsx"
        local test_ts="${dir}/${stem}.test.ts"
        local test_same="${dir}/${stem}.test.${ext}"
        if echo "$diff_files" | grep -qF "$test_tsx" || \
           echo "$diff_files" | grep -qF "$test_ts" || \
           echo "$diff_files" | grep -qF "$test_same"; then
            return 0
        fi
    fi

    return 1
}

grounding_check_test_coverage() {
    local task_id="$1"
    local task_json="${TASKS_DIR}/${task_id}.json"
    local branch
    branch=$(jq -r '.branch // empty' "$task_json")

    if [[ -z "$branch" ]] || [[ "$branch" == "null" ]]; then
        return 1
    fi

    # Only examine newly added files (not modified/deleted)
    local new_files
    new_files=$(_git diff "$(git_main_branch)...${branch}" --diff-filter=A --name-only 2>/dev/null || true)

    if [[ -z "$new_files" ]]; then
        return 0  # No new files — nothing to check
    fi

    # All files in the branch diff (for test lookup)
    local diff_files
    diff_files=$(_git diff "$(git_main_branch)...${branch}" --name-only 2>/dev/null || true)

    local missing_tests=()
    while IFS= read -r file; do
        [[ -z "$file" ]] && continue
        # Skip excluded file types
        if _test_coverage_excluded "$file"; then
            continue
        fi
        # Require a corresponding test file in the diff
        if ! _test_file_exists_in_diff "$file" "$diff_files"; then
            missing_tests+=("$file")
        fi
    done <<< "$new_files"

    if [[ ${#missing_tests[@]} -gt 0 ]]; then
        log_error "New source files missing test coverage:"
        for f in "${missing_tests[@]}"; do
            log_error "  ${f}"
        done
        return 1
    fi

    return 0
}

# ── Check: gate invocation evidence ───────────────────────────────

grounding_check_gate_evidence() {
    local task_id="$1"
    local output_file="${LOGS_DIR}/${task_id}.log"

    if [[ ! -f "$output_file" ]]; then
        return 1  # No log file — no evidence
    fi

    # Look for markers indicating the agent ran quality gates
    if grep -qE 'Quality Gates:|Running quality gates for task|speed gates' "$output_file" 2>/dev/null; then
        return 0
    fi

    return 1
}

# ── Contract Check: verify artifacts declared in contract.json ────
# Uses existence checks (speed/lib/contract_verify.py) — verifies
# that declared files, symbols, and model classes exist on disk.
# Semantic correctness is verified by LLM agents (reviewer, coherence).

contract_check() {
    local contract_file="${CONTRACT_FILE:-${STATE_DIR}/contract.json}"

    if [[ ! -f "$contract_file" ]]; then
        log_warn "No contract.json found — skipping contract verification"
        return 0
    fi

    local verify_script="${LIB_DIR}/contract_verify.py"
    if [[ ! -f "$verify_script" ]]; then
        log_error "contract_verify.py not found at ${verify_script}"
        return 1
    fi

    log_step "Verifying contract artifacts..."

    local verify_output
    verify_output=$(python3 "$verify_script" "$contract_file" "$PROJECT_ROOT" 2>&1)
    local verify_exit=$?

    # Exit code 2 = script error (bad args, unreadable contract)
    if [[ $verify_exit -eq 2 ]]; then
        local err_msg
        err_msg=$(echo "$verify_output" | jq -r '.error // "Unknown error"' 2>/dev/null || echo "$verify_output")
        log_error "Contract verification script failed: ${err_msg}"
        return 1
    fi

    # Parse structured results
    local results_json
    results_json=$(echo "$verify_output" | jq -c '.' 2>/dev/null)

    if [[ -z "$results_json" ]]; then
        log_error "Contract verification produced no output"
        return 1
    fi

    local all_passed
    all_passed=$(echo "$results_json" | jq -r '.passed')

    # Print each check result
    echo ""
    echo -e "  ${BOLD}Contract Verification:${RESET}"

    local check_count
    check_count=$(echo "$results_json" | jq '.results | length')
    local i=0
    while [[ $i -lt $check_count ]]; do
        local check_name passed detail
        check_name=$(echo "$results_json" | jq -r ".results[$i].check")
        passed=$(echo "$results_json" | jq -r ".results[$i].passed")
        detail=$(echo "$results_json" | jq -r ".results[$i].detail")

        if [[ "$passed" == "true" ]]; then
            echo -e "    ${COLOR_SUCCESS}${SYM_CHECK} ${check_name}${RESET} ${COLOR_DIM}${detail}${RESET}"
        else
            echo -e "    ${COLOR_ERROR}${SYM_CROSS} ${check_name}${RESET} — ${detail}"
        fi
        ((i++))
    done

    echo ""

    if [[ "$all_passed" == "true" ]]; then
        log_success "Contract satisfied — all declared artifacts exist"
        return 0
    else
        log_error "Contract VIOLATED — declared artifacts missing from implementation"
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
                    results+=("${COLOR_SUCCESS}${SYM_CHECK} ${gate_label}: ${COLOR_DIM}${cmd}${RESET}")
                else
                    results+=("${COLOR_ERROR}${SYM_CROSS} ${gate_label} FAILED: ${COLOR_DIM}${cmd}${RESET}")
                    all_passed=false
                fi
            done <<< "$cmds"
        else
            results+=("${COLOR_DIM}○ ${gate_label} (not configured)${RESET}")
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
    my_files=$(jq -r '.files_touched[]?' "$task_json")

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
        other_files=$(jq -r '.files_touched[]?' "$other_json")

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

# ── Spec Grounding: verify spec claims against codebase ───────────
# Runs BEFORE the architect to catch spec-codebase discrepancies.
# Parses spec markdown for table/column claims, code patterns, and
# file paths, then compares against the actual codebase via AST.
#
# Always returns 0 (warnings don't block planning).
# Sets SPEC_CODEBASE_CONTEXT with a text block for the architect.
#
# Args: spec_file

spec_grounding_check() {
    local spec_file="$1"

    local ground_script="${LIB_DIR}/spec_ground.py"
    if [[ ! -f "$ground_script" ]]; then
        log_warn "spec_ground.py not found — skipping spec grounding"
        SPEC_CODEBASE_CONTEXT=""
        return 0
    fi

    log_step "Grounding spec against codebase (AST)..."

    local output
    output=$(python3 "$ground_script" "$spec_file" "$PROJECT_ROOT" 2>&1)
    local exit_code=$?

    if [[ $exit_code -eq 2 ]]; then
        local err_msg
        err_msg=$(echo "$output" | jq -r '.error // "unknown"' 2>/dev/null || echo "$output")
        log_warn "Spec grounding error: ${err_msg} — skipping"
        SPEC_CODEBASE_CONTEXT=""
        return 0
    fi

    # Parse results
    local stats_json warnings_json
    stats_json=$(echo "$output" | jq -c '.stats // {}')
    warnings_json=$(echo "$output" | jq -c '.warnings // []')

    local errors warns infos spec_tables codebase_tables
    errors=$(echo "$stats_json" | jq -r '.errors // 0')
    warns=$(echo "$stats_json" | jq -r '.warnings // 0')
    infos=$(echo "$stats_json" | jq -r '.infos // 0')
    spec_tables=$(echo "$stats_json" | jq -r '.spec_tables // 0')
    codebase_tables=$(echo "$stats_json" | jq -r '.codebase_tables // 0')

    # Display summary
    echo ""
    echo -e "  ${BOLD}Spec Grounding:${RESET} ${spec_tables} tables in spec, ${codebase_tables} in codebase"

    local warn_count
    warn_count=$(echo "$warnings_json" | jq 'length')

    if [[ $warn_count -gt 0 ]]; then
        local i=0
        while [[ $i -lt $warn_count ]]; do
            local severity msg
            severity=$(echo "$warnings_json" | jq -r ".[$i].severity")
            msg=$(echo "$warnings_json" | jq -r ".[$i].message")

            case "$severity" in
                error) echo -e "    ${COLOR_ERROR}${SYM_CROSS} ${msg}${RESET}" ;;
                warn)  echo -e "    ${COLOR_WARN}${SYM_WARN} ${msg}${RESET}" ;;
                info)  echo -e "    ${COLOR_DIM}${SYM_CHECK} ${msg}${RESET}" ;;
            esac
            ((i++))
        done
    else
        echo -e "    ${COLOR_SUCCESS}${SYM_CHECK} No discrepancies found${RESET}"
    fi
    echo ""

    if [[ $errors -gt 0 ]]; then
        log_warn "Spec has ${errors} convention error(s) — consider fixing before planning"
    fi

    # Export codebase context for injection into architect prompt
    SPEC_CODEBASE_CONTEXT=$(echo "$output" | jq -r '.codebase_context // ""')
    export SPEC_CODEBASE_CONTEXT

    return 0
}
