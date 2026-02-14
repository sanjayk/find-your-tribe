#!/usr/bin/env bash
# gates.sh — Quality gate runner
#
# Gates are split into two categories:
# 1. Grounding gates (non-LLM) — in grounding.sh
# 2. Quality gates (lint, typecheck, tests) — in this file
#
# Grounding gates verify FACTS (files exist, imports resolve, diff non-empty).
# Quality gates verify CODE QUALITY (syntax, lint, types, tests).

# Requires config.sh, log.sh, and grounding.sh to be sourced first

# Run all gates on a completed task: grounding + quality
# Returns 0 if all pass, 1 if any fail
gates_run() {
    local task_id="$1"
    local grounding_passed=true
    local quality_passed=true

    # During scaffolding, skip quality gates (validate at integration time)
    if [[ "${SKIP_GATES:-}" == "true" ]]; then
        log_step "Quality gates skipped (SKIP_GATES=true)"
        return 0
    fi

    # ── Grounding gates first (non-LLM) ──────────────────────────
    if ! grounding_run "$task_id"; then
        grounding_passed=false
    fi

    # If grounding failed, don't bother with quality gates
    if ! $grounding_passed; then
        log_error "Grounding checks failed — skipping quality gates"
        return 1
    fi

    # ── Quality gates ─────────────────────────────────────────────
    local results=()
    local subsystem
    subsystem=$(_detect_subsystem "$task_id")

    log_step "Running quality gates for task ${task_id} (subsystem: ${subsystem})..."

    # Gate 1: Syntax check — look for common syntax errors
    if gate_syntax_check "$task_id"; then
        results+=("${GREEN}${SYM_CHECK} Syntax check${RESET}")
    else
        results+=("${RED}${SYM_CROSS} Syntax check${RESET}")
        quality_passed=false
    fi

    # Gate 2-4: Run each gate type with subsystem filtering
    local gate_type gate_label
    for gate_type in lint typecheck test; do
        case "$gate_type" in
            lint)      gate_label="Lint" ;;
            typecheck) gate_label="Type check" ;;
            test)      gate_label="Tests" ;;
        esac

        local cmds
        cmds=$(gates_get_config "$gate_type" "$subsystem")
        if [[ -n "$cmds" ]]; then
            local all_ok=true
            while IFS= read -r cmd; do
                [[ -z "$cmd" ]] && continue
                if gate_run_command "${gate_label}" "$cmd"; then
                    results+=("${GREEN}${SYM_CHECK} ${gate_label}: ${DIM}${cmd}${RESET}")
                else
                    results+=("${RED}${SYM_CROSS} ${gate_label}: ${DIM}${cmd}${RESET}")
                    all_ok=false
                fi
            done <<< "$cmds"
            if ! $all_ok; then
                quality_passed=false
            fi
        else
            results+=("${DIM}○ ${gate_label} (not configured for ${subsystem})${RESET}")
        fi
    done

    # Print gate results
    echo ""
    echo -e "  ${BOLD}Quality Gates:${RESET}"
    for r in "${results[@]}"; do
        echo -e "    $r"
    done
    echo ""

    if $quality_passed; then
        return 0
    else
        return 1
    fi
}

# Basic syntax check for common file types
# Uses branch diff against main (not HEAD~1) to check correct files
gate_syntax_check() {
    local task_id="${1:-}"
    local failed=false

    # Determine diff base: use task branch if available, fallback to HEAD~1
    local diff_cmd="git -C ${TRIBE_ROOT} diff --name-only HEAD~1 HEAD"
    if [[ -n "$task_id" ]]; then
        local task_file="${TASKS_DIR}/${task_id}.json"
        if [[ -f "$task_file" ]]; then
            local branch
            branch=$(jq -r '.branch' "$task_file" 2>/dev/null)
            if [[ -n "$branch" ]] && [[ "$branch" != "null" ]]; then
                diff_cmd="git -C ${TRIBE_ROOT} diff --name-only main...${branch}"
            fi
        fi
    fi

    # Check Python syntax
    for f in $(eval "$diff_cmd" 2>/dev/null | grep '\.py$' || true); do
        local full_path="${TRIBE_ROOT}/${f}"
        [[ -f "$full_path" ]] || continue
        if ! python3 -c "import ast; ast.parse(open('${full_path}').read())" 2>/dev/null; then
            log_error "Syntax error in: $f"
            failed=true
        fi
    done

    # Check JSON syntax
    for f in $(eval "$diff_cmd" 2>/dev/null | grep '\.json$' || true); do
        local full_path="${TRIBE_ROOT}/${f}"
        [[ -f "$full_path" ]] || continue
        if ! jq empty "$full_path" 2>/dev/null; then
            log_error "JSON syntax error in: $f"
            failed=true
        fi
    done

    # Check JavaScript/TypeScript syntax (basic)
    # Note: node --check only works on plain .js/.ts files, NOT .jsx/.tsx (JSX is not valid JS)
    # TSX/JSX syntax is validated by the typecheck gate (tsc --noEmit) instead
    for f in $(eval "$diff_cmd" 2>/dev/null | grep -E '\.(js|ts)$' | grep -v -E '\.(jsx|tsx)$' || true); do
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
# Captures output to a log file for diagnostics (Fix 8)
gate_run_command() {
    local name="$1"
    local cmd="$2"
    local timestamp
    timestamp=$(date +%s)
    local log_file="${LOGS_DIR}/gate-${name}-${timestamp}.log"

    log_step "Running ${name}: ${DIM}${cmd}${RESET}"

    mkdir -p "$LOGS_DIR"

    if (cd "$TRIBE_ROOT" && eval "$cmd" > "$log_file" 2>&1); then
        return 0
    else
        log_error "${name} failed. Last 20 lines:"
        tail -20 "$log_file" | while IFS= read -r line; do
            echo -e "    ${DIM}${line}${RESET}" >&2
        done
        return 1
    fi
}

# Detect which subsystem a task touches based on its files_touched
# Returns: "frontend", "backend", or "both"
_detect_subsystem() {
    local task_id="$1"
    local task_file="${TASKS_DIR}/${task_id}.json"

    if [[ ! -f "$task_file" ]]; then
        echo "both"
        return
    fi

    local files_touched
    files_touched=$(jq -r '.files_touched[]?' "$task_file" 2>/dev/null)

    if [[ -z "$files_touched" ]]; then
        echo "both"
        return
    fi

    local has_frontend=false
    local has_backend=false

    while IFS= read -r f; do
        [[ -z "$f" ]] && continue
        if [[ "$f" == src/frontend/* ]]; then
            has_frontend=true
        elif [[ "$f" == src/backend/* ]]; then
            has_backend=true
        fi
    done <<< "$files_touched"

    if $has_frontend && $has_backend; then
        echo "both"
    elif $has_frontend; then
        echo "frontend"
    elif $has_backend; then
        echo "backend"
    else
        echo "both"
    fi
}

# Read gate configuration from CLAUDE.md
# Looks for a "## Quality Gates" section with `gate_name: command` entries
# Optional second arg filters by subsystem: "frontend", "backend", or "both" (default)
gates_get_config() {
    local gate_name="$1"
    local subsystem="${2:-both}"

    if [[ ! -f "$CLAUDE_MD" ]]; then
        return
    fi

    # Parse CLAUDE.md for quality gate commands
    local in_gates_section=false
    local current_subsection=""
    while IFS= read -r line; do
        # Enter the Quality Gates section
        if [[ "$line" =~ ^##[[:space:]]+Quality[[:space:]]+Gates ]]; then
            in_gates_section=true
            continue
        fi
        # Exit on the next h2 header (but NOT h3 subsection headers)
        if $in_gates_section && [[ "$line" =~ ^##[[:space:]] ]] && [[ ! "$line" =~ ^###[[:space:]] ]]; then
            break
        fi
        if $in_gates_section; then
            # Track h3 subsection headers (### Frontend, ### Backend)
            if [[ "$line" =~ ^###[[:space:]]+(.+)$ ]]; then
                current_subsection="${BASH_REMATCH[1]}"
                # Normalize to lowercase
                current_subsection=$(echo "$current_subsection" | tr '[:upper:]' '[:lower:]')
                continue
            fi
            # Match "- gate_name: `command`" or "gate_name: command"
            if [[ "$line" =~ ^[-[:space:]]*${gate_name}:[[:space:]]*(.+)$ ]]; then
                local cmd="${BASH_REMATCH[1]}"
                # Strip backticks (Fix 10)
                cmd="${cmd#\`}"
                cmd="${cmd%\`}"
                # Filter by subsystem
                if [[ "$subsystem" == "both" ]]; then
                    echo "$cmd"
                elif [[ "$current_subsection" == *"$subsystem"* ]]; then
                    echo "$cmd"
                fi
                # Do NOT return — continue to find ALL matching commands
            fi
        fi
    done < "$CLAUDE_MD"
}
