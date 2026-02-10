#!/usr/bin/env bash
# gates.sh — Quality gate runner

# Requires config.sh and log.sh to be sourced first

# Run all configured quality gates on the current working tree
# Returns 0 if all pass, 1 if any fail
gates_run() {
    local task_id="$1"
    local results=()
    local all_passed=true

    log_step "Running quality gates for task ${task_id}..."

    # Gate 1: Syntax check — look for common syntax errors
    if gate_syntax_check; then
        results+=("${GREEN}${SYM_CHECK} Syntax check${RESET}")
    else
        results+=("${RED}${SYM_CROSS} Syntax check${RESET}")
        all_passed=false
    fi

    # Gate 2: Lint (if configured in CLAUDE.md)
    local lint_cmd
    lint_cmd=$(gates_get_config "lint")
    if [[ -n "$lint_cmd" ]]; then
        if gate_run_command "Lint" "$lint_cmd"; then
            results+=("${GREEN}${SYM_CHECK} Lint${RESET}")
        else
            results+=("${RED}${SYM_CROSS} Lint${RESET}")
            all_passed=false
        fi
    else
        results+=("${DIM}○ Lint (not configured)${RESET}")
    fi

    # Gate 3: Type check (if configured)
    local typecheck_cmd
    typecheck_cmd=$(gates_get_config "typecheck")
    if [[ -n "$typecheck_cmd" ]]; then
        if gate_run_command "Typecheck" "$typecheck_cmd"; then
            results+=("${GREEN}${SYM_CHECK} Type check${RESET}")
        else
            results+=("${RED}${SYM_CROSS} Type check${RESET}")
            all_passed=false
        fi
    else
        results+=("${DIM}○ Type check (not configured)${RESET}")
    fi

    # Gate 4: Tests (if configured)
    local test_cmd
    test_cmd=$(gates_get_config "test")
    if [[ -n "$test_cmd" ]]; then
        if gate_run_command "Tests" "$test_cmd"; then
            results+=("${GREEN}${SYM_CHECK} Tests${RESET}")
        else
            results+=("${RED}${SYM_CROSS} Tests${RESET}")
            all_passed=false
        fi
    else
        results+=("${DIM}○ Tests (not configured)${RESET}")
    fi

    # Print gate results
    echo ""
    echo -e "  ${BOLD}Quality Gates:${RESET}"
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

# Basic syntax check for common file types
gate_syntax_check() {
    local failed=false

    # Check Python syntax
    for f in $(git -C "$TRIBE_ROOT" diff --name-only HEAD~1 HEAD 2>/dev/null | grep '\.py$' || true); do
        local full_path="${TRIBE_ROOT}/${f}"
        [[ -f "$full_path" ]] || continue
        if ! python3 -c "import ast; ast.parse(open('${full_path}').read())" 2>/dev/null; then
            log_error "Syntax error in: $f"
            failed=true
        fi
    done

    # Check JSON syntax
    for f in $(git -C "$TRIBE_ROOT" diff --name-only HEAD~1 HEAD 2>/dev/null | grep '\.json$' || true); do
        local full_path="${TRIBE_ROOT}/${f}"
        [[ -f "$full_path" ]] || continue
        if ! jq empty "$full_path" 2>/dev/null; then
            log_error "JSON syntax error in: $f"
            failed=true
        fi
    done

    # Check JavaScript/TypeScript syntax (basic)
    for f in $(git -C "$TRIBE_ROOT" diff --name-only HEAD~1 HEAD 2>/dev/null | grep -E '\.(js|ts|jsx|tsx)$' || true); do
        local full_path="${TRIBE_ROOT}/${f}"
        [[ -f "$full_path" ]] || continue
        if command -v node &>/dev/null; then
            if ! node --check "$full_path" 2>/dev/null; then
                log_error "Syntax error in: $f"
                failed=true
            fi
        fi
    done

    ! $failed
}

# Run a gate command and return its exit code
gate_run_command() {
    local name="$1"
    local cmd="$2"

    log_step "Running ${name}: ${DIM}${cmd}${RESET}"

    if (cd "$TRIBE_ROOT" && eval "$cmd" &>/dev/null); then
        return 0
    else
        return 1
    fi
}

# Read gate configuration from CLAUDE.md
# Looks for a "## Quality Gates" section with `gate_name: command` entries
gates_get_config() {
    local gate_name="$1"

    if [[ ! -f "$CLAUDE_MD" ]]; then
        return
    fi

    # Parse CLAUDE.md for quality gate commands
    local in_gates_section=false
    while IFS= read -r line; do
        if [[ "$line" =~ ^##[[:space:]]+Quality[[:space:]]+Gates ]]; then
            in_gates_section=true
            continue
        fi
        if $in_gates_section && [[ "$line" =~ ^## ]]; then
            break
        fi
        if $in_gates_section; then
            # Match "gate_name: command" or "- gate_name: command"
            if [[ "$line" =~ ^[-[:space:]]*${gate_name}:[[:space:]]*(.+)$ ]]; then
                echo "${BASH_REMATCH[1]}"
                return
            fi
        fi
    done < "$CLAUDE_MD"
}
