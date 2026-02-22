#!/usr/bin/env bash
# test_spec_ground.sh — Tests for spec_ground.py
#
# Usage: bash speed/tests/test_spec_ground.sh
# Exit: 0 if all tests pass, 1 if any fail

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
GROUND_SCRIPT="${SCRIPT_DIR}/../lib/spec_ground.py"
PASS=0
FAIL=0
TEST_DIR=""

# ── Harness ───────────────────────────────────────────────────────

setup() {
    TEST_DIR=$(mktemp -d)
}

teardown() {
    rm -rf "$TEST_DIR"
}

run_test() {
    local test_name="$1"
    setup
    local rc=0
    "$test_name" || rc=$?
    teardown
    if [[ $rc -eq 0 ]]; then
        printf "  PASS  %s\n" "$test_name"
        PASS=$((PASS + 1))
    else
        printf "  FAIL  %s\n" "$test_name"
        FAIL=$((FAIL + 1))
    fi
}

assert_exit_code() {
    local expected="$1" actual="$2" context="${3:-}"
    if [[ "$expected" != "$actual" ]]; then
        echo "    ASSERT: expected exit ${expected}, got ${actual}${context:+ (${context})}" >&2
        return 1
    fi
}

assert_json_field() {
    local json="$1" field="$2" expected="$3" label="${4:-$field}"
    local actual
    actual=$(echo "$json" | python3 -c "import json,sys; print(json.load(sys.stdin)${field})")
    if [[ "$actual" != "$expected" ]]; then
        echo "    ASSERT: expected ${label}='${expected}', got '${actual}'" >&2
        return 1
    fi
}

assert_json_contains() {
    local json="$1" expr="$2" label="${3:-}"
    if ! echo "$json" | python3 -c "import json,sys; d=json.load(sys.stdin); assert ${expr}, 'failed'" 2>/dev/null; then
        echo "    ASSERT: ${label:-$expr} not satisfied" >&2
        return 1
    fi
}

run_ground() {
    python3 "$GROUND_SCRIPT" "$@" 2>&1
}

# ── Tests: always exits 0 ────────────────────────────────────────

test_always_exits_zero() {
    local spec="${TEST_DIR}/spec.md"
    echo "# Spec" > "$spec"
    local rc=0
    run_ground "$spec" "$TEST_DIR" > /dev/null || rc=$?
    assert_exit_code 0 "$rc" "should always exit 0"
}

test_empty_spec() {
    local spec="${TEST_DIR}/spec.md"
    echo "" > "$spec"
    local output rc=0
    output=$(run_ground "$spec" "$TEST_DIR") || rc=$?
    assert_exit_code 0 "$rc"
    assert_json_field "$output" "['stats']['spec_tables']" "0" "spec_tables"
}

# ── Tests: CLI errors ─────────────────────────────────────────────

test_bad_args() {
    local rc=0
    python3 "$GROUND_SCRIPT" 2>/dev/null || rc=$?
    assert_exit_code 2 "$rc" "no args should exit 2"
}

test_missing_spec_file() {
    local rc=0
    python3 "$GROUND_SCRIPT" "${TEST_DIR}/nope.md" "$TEST_DIR" 2>/dev/null || rc=$?
    assert_exit_code 2 "$rc" "missing spec should exit 2"
}

# ── Tests: spec table parsing ─────────────────────────────────────

test_parses_spec_tables() {
    local spec="${TEST_DIR}/spec.md"
    cat > "$spec" <<'EOF'
### `users`
| Column | Type | Constraints | Notes |
|--------|------|-------------|-------|
| email | TEXT | NOT NULL | user email |
| name | TEXT | | display name |
EOF
    local output
    output=$(run_ground "$spec" "$TEST_DIR")
    assert_json_field "$output" "['stats']['spec_tables']" "1" "spec_tables"
    assert_json_contains "$output" "any(w['type'] == 'spec_table' and w['table'] == 'users' for w in d['warnings'])" "users table warning"
}

test_multiple_spec_tables() {
    local spec="${TEST_DIR}/spec.md"
    cat > "$spec" <<'EOF'
### `users`
| Column | Type |
|--------|------|
| email | TEXT |

### `teams`
| Column | Type |
|--------|------|
| name | TEXT |
EOF
    local output
    output=$(run_ground "$spec" "$TEST_DIR")
    assert_json_field "$output" "['stats']['spec_tables']" "2" "spec_tables"
}

# ── Tests: file path checks ──────────────────────────────────────

test_existing_path_no_warning() {
    mkdir -p "${TEST_DIR}/src/backend/app/models"
    echo "class User: pass" > "${TEST_DIR}/src/backend/app/models/user.py"

    local spec="${TEST_DIR}/spec.md"
    echo 'See `src/backend/app/models/user.py` for the model.' > "$spec"

    local output
    output=$(run_ground "$spec" "$TEST_DIR")
    assert_json_contains "$output" "not any(w['type'] == 'path_not_found' for w in d['warnings'])" "no path_not_found warnings"
}

test_missing_path_warns() {
    local spec="${TEST_DIR}/spec.md"
    echo 'See `src/backend/app/models/nope.py` for the model.' > "$spec"

    local output
    output=$(run_ground "$spec" "$TEST_DIR")
    assert_json_contains "$output" "any(w['type'] == 'path_not_found' for w in d['warnings'])" "should warn about missing path"
}

# ── Tests: convention detection ───────────────────────────────────

test_detects_mapped_column_convention() {
    mkdir -p "${TEST_DIR}/src/backend/app/models"
    cat > "${TEST_DIR}/src/backend/app/models/user.py" <<'PYEOF'
from sqlalchemy.orm import Mapped, mapped_column
class User:
    name: Mapped[str] = mapped_column()
    email: Mapped[str] = mapped_column()
PYEOF

    local spec="${TEST_DIR}/spec.md"
    echo "# Spec" > "$spec"

    local output
    output=$(run_ground "$spec" "$TEST_DIR")
    assert_json_contains "$output" "'mapped_column' in d['codebase_context']" "context should mention mapped_column"
}

test_convention_mismatch_warns() {
    mkdir -p "${TEST_DIR}/src/backend/app/models"
    cat > "${TEST_DIR}/src/backend/app/models/user.py" <<'PYEOF'
from sqlalchemy.orm import Mapped, mapped_column
class User:
    name: Mapped[str] = mapped_column()
    email: Mapped[str] = mapped_column()
PYEOF

    local spec="${TEST_DIR}/spec.md"
    cat > "$spec" <<'EOF'
```python
name = Column(String)
```
EOF

    local output
    output=$(run_ground "$spec" "$TEST_DIR")
    assert_json_contains "$output" "any(w['type'] == 'convention_mismatch' for w in d['warnings'])" "should warn about Column vs mapped_column"
    assert_json_field "$output" "['stats']['errors']" "1" "error count"
}

# ── Tests: codebase context ───────────────────────────────────────

test_context_lists_existing_files() {
    mkdir -p "${TEST_DIR}/speed/agents"
    echo "# Agent" > "${TEST_DIR}/speed/agents/audit.md"
    echo "# Reviewer" > "${TEST_DIR}/speed/agents/reviewer.md"

    local spec="${TEST_DIR}/spec.md"
    echo "# Spec" > "$spec"

    local output
    output=$(run_ground "$spec" "$TEST_DIR")
    assert_json_contains "$output" "'speed/agents/audit.md' in d['codebase_context']" "context should list audit.md"
    assert_json_contains "$output" "'speed/agents/reviewer.md' in d['codebase_context']" "context should list reviewer.md"
}

test_context_empty_project() {
    local spec="${TEST_DIR}/spec.md"
    echo "# Spec" > "$spec"

    local output
    output=$(run_ground "$spec" "$TEST_DIR")
    assert_json_contains "$output" "'no source files found' in d['codebase_context']" "context should note empty project"
}

# ── Tests: no import of deleted functions ─────────────────────────

test_no_extract_models_import() {
    if grep -q "extract_models" "$GROUND_SCRIPT"; then
        echo "    ASSERT: spec_ground.py should not reference extract_models" >&2
        return 1
    fi
}

test_no_extract_migrations_import() {
    if grep -q "extract_migrations" "$GROUND_SCRIPT"; then
        echo "    ASSERT: spec_ground.py should not reference extract_migrations" >&2
        return 1
    fi
}

# ── Tests: output structure ───────────────────────────────────────

test_output_has_required_keys() {
    local spec="${TEST_DIR}/spec.md"
    echo "# Spec" > "$spec"

    local output
    output=$(run_ground "$spec" "$TEST_DIR")
    assert_json_contains "$output" "'warnings' in d" "has warnings"
    assert_json_contains "$output" "'codebase_context' in d" "has codebase_context"
    assert_json_contains "$output" "'stats' in d" "has stats"
    assert_json_contains "$output" "'spec_tables' in d['stats']" "has stats.spec_tables"
    assert_json_contains "$output" "'errors' in d['stats']" "has stats.errors"
}

test_no_migration_tables_in_stats() {
    local spec="${TEST_DIR}/spec.md"
    echo "# Spec" > "$spec"

    local output
    output=$(run_ground "$spec" "$TEST_DIR")
    assert_json_contains "$output" "'migration_tables' not in d['stats']" "should not have migration_tables stat"
}

# ── Main ──────────────────────────────────────────────────────────

echo "Running spec_ground tests..."
echo ""

# Basic
run_test test_always_exits_zero
run_test test_empty_spec

# CLI
run_test test_bad_args
run_test test_missing_spec_file

# Spec parsing
run_test test_parses_spec_tables
run_test test_multiple_spec_tables

# File paths
run_test test_existing_path_no_warning
run_test test_missing_path_warns

# Conventions
run_test test_detects_mapped_column_convention
run_test test_convention_mismatch_warns

# Codebase context
run_test test_context_lists_existing_files
run_test test_context_empty_project

# No stale imports
run_test test_no_extract_models_import
run_test test_no_extract_migrations_import

# Output structure
run_test test_output_has_required_keys
run_test test_no_migration_tables_in_stats

echo ""
echo "────────────────────────────────────────────────────────────"
echo "Results: ${PASS} passed, ${FAIL} failed"
echo ""

[[ $FAIL -eq 0 ]]
