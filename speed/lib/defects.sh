#!/usr/bin/env bash
# defects.sh — Defect pipeline state management and helper functions
#
# Provides CRUD for defect state, state machine transitions, report
# validation, triage I/O, escalation to PRD, and status listing.
#
# Requires config.sh, colors.sh, and log.sh to be sourced first.
# Uses jq for JSON handling; falls back to python3 if jq unavailable.

# ── JSON helper ──────────────────────────────────────────────────
# Prefer jq; fall back to python3 one-liners.

_defect_json_tool=""

_defect_ensure_json() {
    if [[ -n "$_defect_json_tool" ]]; then
        return 0
    fi
    if command -v jq &>/dev/null; then
        _defect_json_tool="jq"
    elif command -v python3 &>/dev/null; then
        _defect_json_tool="python3"
        log_verbose "jq not found — using python3 for JSON operations"
    else
        log_error "Neither jq nor python3 found. Install jq: brew install jq"
        exit 1
    fi
}

# Read a JSON field. Args: file key
# Outputs the raw value (unquoted strings, raw numbers/booleans).
_defect_json_get() {
    local file="$1" key="$2"
    _defect_ensure_json
    if [[ "$_defect_json_tool" == "jq" ]]; then
        jq -r ".$key // empty" "$file"
    else
        python3 -c "
import json, sys
with open('$file') as f:
    d = json.load(f)
v = d.get('$key')
if v is not None:
    print(v)
"
    fi
}

# ── Defect directory paths ───────────────────────────────────────

DEFECTS_DIR="${STATE_DIR}/defects"

_defect_dir() {
    local name="$1"
    echo "${DEFECTS_DIR}/${name}"
}

# ── State machine ────────────────────────────────────────────────
# Valid transitions as a lookup function (bash 3.2 compatible — no
# associative arrays). Returns valid target states on stdout.
#
# Happy path: filed→triaging→triaged→reproducing→reproduced→fixing
#             →fixed→reviewing→reviewed→integrating→resolved
# Shortcuts:  triaged→fixing (trivial skips reproduce)
#             fixed→integrating (trivial skips review)
# Terminals:  triaging→rejected, triaging→escalated

_defect_valid_transitions() {
    case "$1" in
        filed)        echo "triaging" ;;
        triaging)     echo "triaged rejected escalated" ;;
        triaged)      echo "reproducing fixing" ;;
        reproducing)  echo "reproduced" ;;
        reproduced)   echo "fixing" ;;
        fixing)       echo "fixed" ;;
        fixed)        echo "reviewing integrating" ;;
        reviewing)    echo "reviewed" ;;
        reviewed)     echo "integrating" ;;
        integrating)  echo "resolved" ;;
        *)            echo "" ;;
    esac
}

# All valid statuses (for validation)
DEFECT_ALL_STATUSES="filed triaging triaged reproducing reproduced fixing fixed reviewing reviewed integrating resolved rejected escalated"

# ── 1. defect_name_from_path ─────────────────────────────────────
# Extract defect name from spec file path.
# specs/defects/invite-failure.md → invite-failure

defect_name_from_path() {
    local spec_path="$1"
    basename "$spec_path" .md
}

# ── 2. defect_init ───────────────────────────────────────────────
# Create defect directory structure with initial state.
# Args: name spec_path

defect_init() {
    local name="$1"
    local spec_path="$2"

    _defect_ensure_json

    local defect_dir
    defect_dir="$(_defect_dir "$name")"

    if [[ -d "$defect_dir" ]]; then
        log_error "Defect '${name}' already exists at ${defect_dir}"
        return 1
    fi

    # Extract severity from report
    local severity=""
    if [[ -f "$spec_path" ]]; then
        severity=$(grep -i '^Severity:' "$spec_path" | head -1 | sed 's/^[Ss]everity:[[:space:]]*//' | tr -d '[:space:]')
    fi

    if [[ -z "$severity" ]]; then
        log_error "Cannot extract Severity from ${spec_path}"
        return 1
    fi

    # Validate severity value
    case "$severity" in
        P0|P1|P2|P3) ;;
        *)
            log_error "Invalid severity '${severity}' — must be P0, P1, P2, or P3"
            return 1
            ;;
    esac

    # Create directory structure
    mkdir -p "${defect_dir}/logs"

    # Copy spec as report.md
    cp "$spec_path" "${defect_dir}/report.md"

    # Create initial state.json
    local now
    now=$(date -u +%Y-%m-%dT%H:%M:%SZ)

    if [[ "$_defect_json_tool" == "jq" ]]; then
        jq -n \
            --arg status "filed" \
            --arg severity "$severity" \
            --arg created "$now" \
            --arg updated "$now" \
            --arg source "$spec_path" \
            '{
                status: $status,
                reported_severity: $severity,
                defect_type: null,
                complexity: null,
                branch: null,
                created_at: $created,
                updated_at: $updated,
                source_spec: $source
            }' > "${defect_dir}/state.json"
    else
        python3 -c "
import json
state = {
    'status': 'filed',
    'reported_severity': '$severity',
    'defect_type': None,
    'complexity': None,
    'branch': None,
    'created_at': '$now',
    'updated_at': '$now',
    'source_spec': '$spec_path'
}
print(json.dumps(state, indent=2))
" > "${defect_dir}/state.json"
    fi

    log_info "Defect '${name}' initialized at ${defect_dir}"
}

# ── 3. defect_state_read ─────────────────────────────────────────
# Read and output state.json for a defect.

defect_state_read() {
    local name="$1"
    local state_file
    state_file="$(_defect_dir "$name")/state.json"

    if [[ ! -f "$state_file" ]]; then
        log_error "Defect '${name}' not found (no state.json)"
        return 1
    fi

    cat "$state_file"
}

# ── 4. defect_state_write ────────────────────────────────────────
# Write state.json, always updating updated_at.
# Args: name json_string

defect_state_write() {
    local name="$1"
    local json="$2"

    _defect_ensure_json

    local state_file
    state_file="$(_defect_dir "$name")/state.json"

    if [[ ! -d "$(_defect_dir "$name")" ]]; then
        log_error "Defect '${name}' not found"
        return 1
    fi

    local now
    now=$(date -u +%Y-%m-%dT%H:%M:%SZ)

    if [[ "$_defect_json_tool" == "jq" ]]; then
        echo "$json" | jq --arg ts "$now" '.updated_at = $ts' > "$state_file"
    else
        python3 -c "
import json, sys
d = json.loads(sys.stdin.read())
d['updated_at'] = '$now'
print(json.dumps(d, indent=2))
" <<< "$json" > "$state_file"
    fi
}

# ── 5. defect_state_transition ───────────────────────────────────
# Validate and execute state transition per the state machine.
# Args: name new_status

defect_state_transition() {
    local name="$1"
    local new_status="$2"

    _defect_ensure_json

    local state_file
    state_file="$(_defect_dir "$name")/state.json"

    if [[ ! -f "$state_file" ]]; then
        log_error "Defect '${name}' not found (no state.json)"
        return 1
    fi

    # Read current status
    local current_status
    current_status=$(_defect_json_get "$state_file" "status")

    if [[ -z "$current_status" ]]; then
        log_error "Defect '${name}' has no status field"
        return 1
    fi

    # Check if current status is terminal
    if [[ "$current_status" == "resolved" || "$current_status" == "rejected" || "$current_status" == "escalated" ]]; then
        log_error "Defect '${name}' is in terminal state '${current_status}' — no transitions allowed"
        return 1
    fi

    # Validate transition
    local valid_targets
    valid_targets=$(_defect_valid_transitions "$current_status")

    if [[ -z "$valid_targets" ]]; then
        log_error "Defect '${name}': unknown current state '${current_status}'"
        return 1
    fi

    local is_valid=false
    for target in $valid_targets; do
        if [[ "$target" == "$new_status" ]]; then
            is_valid=true
            break
        fi
    done

    if ! $is_valid; then
        log_error "Defect '${name}': invalid transition '${current_status}' → '${new_status}'"
        log_error "Valid transitions from '${current_status}': ${valid_targets}"
        return 1
    fi

    # Execute transition: update status and updated_at
    local now
    now=$(date -u +%Y-%m-%dT%H:%M:%SZ)

    if [[ "$_defect_json_tool" == "jq" ]]; then
        local tmp
        tmp=$(mktemp)
        jq --arg s "$new_status" --arg ts "$now" \
            '.status = $s | .updated_at = $ts' \
            "$state_file" > "$tmp" && mv "$tmp" "$state_file"
    else
        local tmp
        tmp=$(mktemp)
        python3 -c "
import json
with open('$state_file') as f:
    d = json.load(f)
d['status'] = '$new_status'
d['updated_at'] = '$now'
print(json.dumps(d, indent=2))
" > "$tmp" && mv "$tmp" "$state_file"
    fi

    log_verbose "Defect '${name}': ${current_status} → ${new_status}"
}

# ── 6. defect_validate_report ────────────────────────────────────
# Validate defect report has required fields.
# Returns non-zero exit code if required fields missing.

defect_validate_report() {
    local spec_path="$1"
    local errors=0
    local warnings=0

    if [[ ! -f "$spec_path" ]]; then
        log_error "Defect spec not found: ${spec_path}"
        return 1
    fi

    # Severity: required, must be P0/P1/P2/P3
    local severity_line
    severity_line=$(grep -i '^Severity:' "$spec_path" | head -1 || true)
    if [[ -z "$severity_line" ]]; then
        log_error "Missing required field: Severity"
        ((errors++))
    else
        local severity_val
        severity_val=$(echo "$severity_line" | sed 's/^[Ss]everity:[[:space:]]*//' | tr -d '[:space:]')
        case "$severity_val" in
            P0|P1|P2|P3) ;;
            *)
                log_error "Invalid Severity '${severity_val}' — must be P0, P1, P2, or P3"
                ((errors++))
                ;;
        esac
    fi

    # Related Feature: recommended (warn if missing, don't fail)
    local related_line
    related_line=$(grep -i '^Related Feature:' "$spec_path" | head -1 || true)
    if [[ -z "$related_line" ]]; then
        log_warn "Missing recommended field: Related Feature"
        ((warnings++))
    fi

    # Observed / Observed Behavior: required
    local observed_line
    observed_line=$(grep -iE '^(Observed|Observed Behavior):' "$spec_path" | head -1 || true)
    if [[ -z "$observed_line" ]]; then
        log_error "Missing required field: Observed (or Observed Behavior)"
        ((errors++))
    fi

    # Expected / Expected Behavior: required
    local expected_line
    expected_line=$(grep -iE '^(Expected|Expected Behavior):' "$spec_path" | head -1 || true)
    if [[ -z "$expected_line" ]]; then
        log_error "Missing required field: Expected (or Expected Behavior)"
        ((errors++))
    fi

    # Repro / Reproduction Steps: required
    local repro_line
    repro_line=$(grep -iE '^(Repro|Reproduction Steps):' "$spec_path" | head -1 || true)
    if [[ -z "$repro_line" ]]; then
        log_error "Missing required field: Repro (or Reproduction Steps)"
        ((errors++))
    fi

    if [[ $errors -gt 0 ]]; then
        log_error "Defect report validation failed: ${errors} error(s), ${warnings} warning(s)"
        return 1
    fi

    if [[ $warnings -gt 0 ]]; then
        log_info "Defect report valid with ${warnings} warning(s)"
    else
        log_info "Defect report valid"
    fi
    return 0
}

# ── 7. defect_triage_write ───────────────────────────────────────
# Write triage.json to defect directory.
# Args: name json_string

defect_triage_write() {
    local name="$1"
    local json="$2"

    local defect_dir
    defect_dir="$(_defect_dir "$name")"

    if [[ ! -d "$defect_dir" ]]; then
        log_error "Defect '${name}' not found"
        return 1
    fi

    echo "$json" > "${defect_dir}/triage.json"
    log_verbose "Triage written for defect '${name}'"
}

# ── 8. defect_triage_read ────────────────────────────────────────
# Read and output triage.json.

defect_triage_read() {
    local name="$1"
    local triage_file
    triage_file="$(_defect_dir "$name")/triage.json"

    if [[ ! -f "$triage_file" ]]; then
        log_error "Defect '${name}' has no triage.json"
        return 1
    fi

    cat "$triage_file"
}

# ── 9. defect_escalate_to_prd ────────────────────────────────────
# Pre-populate PRD from defect report.
# Maps report fields to PRD sections and writes specs/product/<name>.md.
# Returns the output path on stdout.

defect_escalate_to_prd() {
    local name="$1"

    local defect_dir
    defect_dir="$(_defect_dir "$name")"
    local report="${defect_dir}/report.md"

    if [[ ! -f "$report" ]]; then
        log_error "Defect '${name}' report not found"
        return 1
    fi

    # Extract fields from report
    local observed="" expected="" repro="" related=""

    # Observed Behavior — capture value after the field label
    observed=$(sed -n 's/^[Oo]bserved[[:space:]]*[Bb]ehavior:[[:space:]]*//p' "$report" | head -1)
    if [[ -z "$observed" ]]; then
        observed=$(sed -n 's/^[Oo]bserved:[[:space:]]*//p' "$report" | head -1)
    fi

    # Expected Behavior
    expected=$(sed -n 's/^[Ee]xpected[[:space:]]*[Bb]ehavior:[[:space:]]*//p' "$report" | head -1)
    if [[ -z "$expected" ]]; then
        expected=$(sed -n 's/^[Ee]xpected:[[:space:]]*//p' "$report" | head -1)
    fi

    # Reproduction Steps
    repro=$(sed -n 's/^[Rr]epro[duction]*[[:space:]]*[Ss]teps:[[:space:]]*//p' "$report" | head -1)
    if [[ -z "$repro" ]]; then
        repro=$(sed -n 's/^[Rr]epro:[[:space:]]*//p' "$report" | head -1)
    fi

    # Related Feature
    related=$(sed -n 's/^[Rr]elated[[:space:]]*[Ff]eature:[[:space:]]*//p' "$report" | head -1)

    # Build PRD
    local prd_path="${PROJECT_ROOT}/specs/product/${name}.md"
    mkdir -p "$(dirname "$prd_path")"

    cat > "$prd_path" <<EOF
# ${name}

> Auto-generated from defect report. Requires human review and expansion.

## Problem

${observed:-No observed behavior captured from defect report.}

## Success Criteria

${expected:-No expected behavior captured from defect report.}

## User Flows

${repro:-No reproduction steps captured from defect report.}

## Dependencies

${related:-No related feature specified in defect report.}
EOF

    log_info "PRD created at ${prd_path}" >&2
    echo "$prd_path"
}

# ── 10. defect_status_list ───────────────────────────────────────
# List all defects from .speed/defects/*/state.json.
# Format: <name>  <severity>  <complexity>  <status>  <branch or note>
# Sort by severity (P0 first), then by updated_at.

defect_status_list() {
    _defect_ensure_json

    if [[ ! -d "$DEFECTS_DIR" ]]; then
        return 0
    fi

    local entries=()

    for state_file in "${DEFECTS_DIR}"/*/state.json; do
        [[ -f "$state_file" ]] || continue

        local defect_dir
        defect_dir=$(dirname "$state_file")
        local name
        name=$(basename "$defect_dir")

        local status severity complexity branch updated_at

        if [[ "$_defect_json_tool" == "jq" ]]; then
            status=$(jq -r '.status // "unknown"' "$state_file")
            severity=$(jq -r '.reported_severity // "?"' "$state_file")
            complexity=$(jq -r '.complexity // "-"' "$state_file")
            branch=$(jq -r '.branch // empty' "$state_file")
            updated_at=$(jq -r '.updated_at // ""' "$state_file")
        else
            status=$(python3 -c "import json; d=json.load(open('$state_file')); print(d.get('status','unknown'))")
            severity=$(python3 -c "import json; d=json.load(open('$state_file')); print(d.get('reported_severity','?'))")
            complexity=$(python3 -c "import json; d=json.load(open('$state_file')); v=d.get('complexity'); print(v if v else '-')")
            branch=$(python3 -c "import json; d=json.load(open('$state_file')); v=d.get('branch'); print(v if v else '')")
            updated_at=$(python3 -c "import json; d=json.load(open('$state_file')); print(d.get('updated_at',''))")
        fi

        # Handle null complexity display
        if [[ "$complexity" == "null" || -z "$complexity" ]]; then
            complexity="-"
        fi

        # Determine note column
        local note="$branch"
        if [[ "$status" == "resolved" ]]; then
            note="(merged)"
        elif [[ "$status" == "escalated" ]]; then
            note="→ specs/product/${name}.md"
        elif [[ -z "$note" ]]; then
            note=""
        fi

        # Severity sort key (P0=0, P1=1, P2=2, P3=3)
        local sev_key="${severity#P}"

        entries+=("${sev_key}|${updated_at}|${name}|${severity}|${complexity}|${status}|${note}")
    done

    if [[ ${#entries[@]} -eq 0 ]]; then
        return 0
    fi

    # Sort by severity (field 1) then updated_at (field 2)
    printf '%s\n' "${entries[@]}" | sort -t'|' -k1,1n -k2,2r | while IFS='|' read -r _sev _ts name severity complexity status note; do
        printf "  %-20s %-4s %-10s %-14s %s\n" "$name" "$severity" "$complexity" "$status" "$note"
    done
}

# ── 11. defect_resolve_specs ─────────────────────────────────────
# Extract Related Feature from report, resolve to spec paths.
# Returns paths that exist (one per line).

defect_resolve_specs() {
    local spec_path="$1"

    if [[ ! -f "$spec_path" ]]; then
        log_error "Defect spec not found: ${spec_path}"
        return 1
    fi

    # Extract Related Feature value
    local related
    related=$(grep -i '^Related Feature:' "$spec_path" | head -1 | sed 's/^[Rr]elated[[:space:]]*[Ff]eature:[[:space:]]*//' | tr -d '[:space:]')

    if [[ -z "$related" ]]; then
        log_verbose "No Related Feature field in ${spec_path}"
        return 0
    fi

    # Resolve to spec paths
    local product_spec="${PROJECT_ROOT}/specs/product/${related}.md"
    local tech_spec="${PROJECT_ROOT}/specs/tech/${related}.md"

    if [[ -f "$product_spec" ]]; then
        echo "$product_spec"
    fi

    if [[ -f "$tech_spec" ]]; then
        echo "$tech_spec"
    fi
}
