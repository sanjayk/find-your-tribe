#!/usr/bin/env python3
"""Pre-plan spec grounding: verify spec claims against actual codebase.

Parses a spec markdown file for data model claims (tables, columns, file paths,
code conventions) and compares them against the real codebase using AST parsing.
This catches the kind of spec rot where docs say Column() but code uses
mapped_column(), or specs reference UUID when the codebase uses ULID.

Runs before the architect so discrepancies surface BEFORE they cascade into
task descriptions and generated code.

Usage:
    python3 spec_ground.py <spec_file> <project_root>

Output: JSON with {warnings, codebase_context, stats}
Exit code: 0 always (warnings inform, they don't block planning)
"""

import json
import os
import re
import sys

# Import shared AST extraction
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from contract_verify import extract_models, extract_migrations


# ── Spec parsing ─────────────────────────────────────────────────


def parse_spec_tables(spec_content):
    """Extract table definitions from markdown spec tables.

    Looks for:
        ### `table_name`
        | Column | Type | Constraints | Notes |
        |--------|------|-------------|-------|
        | col1   | TYPE | ...         | ...   |

    Returns: {table_name: {columns: {col_name: {type: str}}}}
    """
    tables = {}
    current_table = None
    in_table = False
    separator_seen = False

    for line in spec_content.split("\n"):
        # Match ### `table_name`
        m = re.match(r"^###\s+`(\w+)`", line)
        if m:
            current_table = m.group(1)
            tables[current_table] = {"columns": {}}
            in_table = False
            separator_seen = False
            continue

        if current_table is None:
            continue

        # Match table header row: | Column | Type | ...
        if not in_table and re.match(r"^\|\s*Column\s*\|", line, re.IGNORECASE):
            in_table = True
            separator_seen = False
            continue

        # Skip separator row: |---|---|...|
        if in_table and not separator_seen and re.match(r"^\|[-|\s:]+\|$", line):
            separator_seen = True
            continue

        # Parse data rows
        if in_table and separator_seen and line.startswith("|"):
            cells = [c.strip() for c in line.split("|")[1:-1]]
            if len(cells) >= 2:
                col_name = cells[0].strip()
                col_type = cells[1].strip()
                if col_name and not col_name.startswith("-"):
                    tables[current_table]["columns"][col_name] = {"type": col_type}
            continue

        # End of table on non-empty, non-table line
        if in_table and separator_seen and not line.startswith("|"):
            if line.strip() == "":
                continue  # blank lines within table section OK
            in_table = False
            current_table = None

    return tables


def parse_spec_file_paths(spec_content):
    """Extract file paths mentioned in the spec.

    Finds backtick-wrapped paths and Python comment paths.
    Returns: set of path strings
    """
    paths = set()

    # Backtick-wrapped paths starting with known directories
    for m in re.finditer(r"`((?:src|app|migrations)/[^`\s]+)`", spec_content):
        paths.add(m.group(1))

    # Python comment paths: # app/models/foo.py
    for m in re.finditer(r"#\s+(app/[^\s(]+\.py)", spec_content):
        paths.add(m.group(1))

    return paths


def detect_spec_code_patterns(spec_content):
    """Detect code patterns used in spec's Python code blocks.

    Returns dict of boolean flags for Column/mapped_column/UUID/ULID usage.
    """
    patterns = {
        "uses_Column": False,
        "uses_mapped_column": False,
        "mentions_UUID_only": False,
        "mentions_ULID": False,
    }

    in_python = False
    for line in spec_content.split("\n"):
        if line.strip().startswith("```python"):
            in_python = True
            continue
        if line.strip() == "```":
            in_python = False
            continue
        if in_python:
            # Strip inline comments before checking
            code = line.split("#")[0]
            if "Column(" in code:
                patterns["uses_Column"] = True
            if "mapped_column(" in code:
                patterns["uses_mapped_column"] = True

    # Check entire spec for UUID-only vs ULID mentions
    has_uuid = bool(re.search(r"\bUUID\b", spec_content))
    has_ulid = bool(re.search(r"\bULID\b", spec_content))
    if has_uuid and not has_ulid:
        patterns["mentions_UUID_only"] = True
    if has_ulid:
        patterns["mentions_ULID"] = True

    return patterns


# ── Codebase detection ───────────────────────────────────────────


def detect_codebase_conventions(project_root):
    """Scan model files to detect which conventions the codebase uses.

    Returns: {column_style, id_type, has_mixins}
    """
    conventions = {
        "column_style": "unknown",
        "id_type": "unknown",
        "has_mixins": False,
    }

    search_dirs = [
        os.path.join(project_root, "src", "backend", "app", "models"),
        os.path.join(project_root, "src", "backend", "app", "db"),
    ]

    mapped_column_count = 0
    old_column_count = 0

    for search_dir in search_dirs:
        if not os.path.isdir(search_dir):
            continue
        for root, _dirs, files in os.walk(search_dir):
            for fname in files:
                if not fname.endswith(".py"):
                    continue
                try:
                    source = open(os.path.join(root, fname)).read()
                except OSError:
                    continue

                mapped_column_count += source.count("mapped_column(")
                old_column_count += source.count("Column(")

                if "ULIDMixin" in source:
                    conventions["has_mixins"] = True
                    conventions["id_type"] = "ULID"

                if "TimestampMixin" in source:
                    conventions["has_mixins"] = True

    if mapped_column_count > old_column_count:
        conventions["column_style"] = "mapped_column"
    elif old_column_count > 0:
        conventions["column_style"] = "Column"

    return conventions


# ── Comparison ───────────────────────────────────────────────────


def compare_spec_with_codebase(
    spec_tables, model_tables, migration_tables,
    spec_patterns, conventions, spec_paths, project_root,
):
    """Compare spec claims against actual codebase. Returns list of warnings."""
    warnings = []
    all_known = set(model_tables.keys()) | set(migration_tables.keys())

    # ── 1. Table & column comparison ─────────────────────────────
    for table_name, spec_info in spec_tables.items():
        if table_name in model_tables:
            model_cols = set(model_tables[table_name]["columns"].keys())
            # Include DB column name overrides
            for attr, info in model_tables[table_name]["columns"].items():
                db_name = info.get("db_name")
                if db_name:
                    model_cols.add(db_name)

            spec_cols = set(spec_info["columns"].keys())

            # Columns in spec but not yet in model (to be added)
            new_cols = spec_cols - model_cols
            if new_cols:
                warnings.append({
                    "type": "new_columns",
                    "severity": "info",
                    "table": table_name,
                    "columns": sorted(new_cols),
                    "message": f"'{table_name}': columns to add: {sorted(new_cols)}",
                })

            # Columns in model but missing from spec
            inherited = {"id", "created_at", "updated_at"}
            undocumented = model_cols - spec_cols - inherited
            if undocumented:
                warnings.append({
                    "type": "undocumented_columns",
                    "severity": "info",
                    "table": table_name,
                    "columns": sorted(undocumented),
                    "message": f"'{table_name}': existing columns not in spec: {sorted(undocumented)}",
                })

        elif table_name in migration_tables:
            # In migrations but not as a mapped class — likely association Table()
            warnings.append({
                "type": "association_table",
                "severity": "info",
                "table": table_name,
                "message": f"'{table_name}' exists in migrations as association Table() (not a mapped class)",
            })
        else:
            # Genuinely new table to create
            warnings.append({
                "type": "new_table",
                "severity": "info",
                "table": table_name,
                "message": f"'{table_name}' not in codebase yet — new table to create",
            })

    # ── 2. Convention mismatches ─────────────────────────────────
    if spec_patterns["uses_Column"] and not spec_patterns["uses_mapped_column"]:
        if conventions["column_style"] == "mapped_column":
            warnings.append({
                "type": "convention_mismatch",
                "severity": "error",
                "message": (
                    "Spec uses Column() but codebase uses mapped_column() "
                    "with Mapped[] type annotations — spec code will mislead the architect"
                ),
            })

    if spec_patterns["mentions_UUID_only"]:
        if conventions["id_type"] == "ULID":
            warnings.append({
                "type": "convention_mismatch",
                "severity": "error",
                "message": (
                    "Spec references UUID for IDs but codebase uses ULID "
                    "(via ULIDMixin) — generated migrations would use wrong type"
                ),
            })

    # ── 3. File path checks ─────────────────────────────────────
    for path in sorted(spec_paths):
        found = False
        for base in [
            project_root,
            os.path.join(project_root, "src", "backend"),
            os.path.join(project_root, "src", "frontend"),
        ]:
            full = os.path.join(base, path)
            if os.path.exists(full):
                found = True
                break
        if not found:
            warnings.append({
                "type": "path_not_found",
                "severity": "warn",
                "path": path,
                "message": f"Path '{path}' in spec does not exist on disk",
            })

    return warnings


# ── Context builder ──────────────────────────────────────────────


def build_codebase_context(model_tables, migration_tables, conventions):
    """Build a text block describing what actually exists in the codebase.

    This gets injected into the architect prompt so task decomposition
    is grounded in reality, not spec assumptions.
    """
    lines = [
        "## Codebase Reality (auto-generated by spec grounding)",
        "",
        "Use this as the source of truth for what already exists. "
        "If the spec contradicts this section, trust this section.",
        "",
        "### Conventions",
        "",
        f"- Column definitions: `{conventions['column_style']}()` "
        + ("with `Mapped[]` type annotations" if conventions["column_style"] == "mapped_column" else ""),
        f"- ID type: {conventions['id_type']}"
        + (" (via `ULIDMixin` — provides `id: Mapped[str]`)" if conventions["id_type"] == "ULID" else ""),
        f"- Mixins: {'`ULIDMixin`, `TimestampMixin` (provides `created_at`, `updated_at`)' if conventions['has_mixins'] else 'None detected'}",
        "",
        "### Existing Tables (mapped classes)",
        "",
    ]

    for table_name in sorted(model_tables.keys()):
        info = model_tables[table_name]
        cols = info["columns"]
        class_name = info.get("class_name", "?")
        file_path = info.get("file", "?")
        col_names = sorted(cols.keys())
        fks = [f"{k} -> {v['fk']}" for k, v in cols.items() if v.get("fk")]

        lines.append(f"**{table_name}** (`{class_name}` in `{file_path}`)")
        lines.append(f"  Columns: {', '.join(col_names)}")
        if fks:
            lines.append(f"  FKs: {', '.join(fks)}")
        lines.append("")

    # Add migration-only tables (association tables, etc.)
    migration_only = set(migration_tables.keys()) - set(model_tables.keys())
    if migration_only:
        lines.append("### Association Tables (not mapped classes)")
        lines.append("")
        for table_name in sorted(migration_only):
            info = migration_tables[table_name]
            col_names = sorted(info.get("columns", set()))
            lines.append(f"**{table_name}** (migration: `{info.get('file', '?')}`)")
            if col_names:
                lines.append(f"  Columns: {', '.join(col_names)}")
            lines.append("")

    return "\n".join(lines)


# ── Main ─────────────────────────────────────────────────────────


def main():
    if len(sys.argv) != 3:
        print(json.dumps({"error": f"Usage: {sys.argv[0]} <spec_file> <project_root>"}))
        sys.exit(2)

    spec_file = sys.argv[1]
    project_root = sys.argv[2]

    try:
        with open(spec_file) as f:
            spec_content = f.read()
    except OSError as e:
        print(json.dumps({"error": f"Cannot read spec: {e}"}))
        sys.exit(2)

    # ── Extract codebase state ───────────────────────────────────
    models_dir = os.path.join(project_root, "src", "backend", "app", "models")
    migrations_dir = os.path.join(project_root, "src", "backend", "migrations", "versions")

    model_tables = extract_models(models_dir)
    migration_tables = extract_migrations(migrations_dir)
    conventions = detect_codebase_conventions(project_root)

    # ── Parse spec claims ────────────────────────────────────────
    spec_tables = parse_spec_tables(spec_content)
    spec_paths = parse_spec_file_paths(spec_content)
    spec_patterns = detect_spec_code_patterns(spec_content)

    # ── Compare ──────────────────────────────────────────────────
    warnings = compare_spec_with_codebase(
        spec_tables, model_tables, migration_tables,
        spec_patterns, conventions, spec_paths, project_root,
    )

    # ── Build context ────────────────────────────────────────────
    codebase_context = build_codebase_context(model_tables, migration_tables, conventions)

    # ── Output ───────────────────────────────────────────────────
    errors = len([w for w in warnings if w["severity"] == "error"])
    warns = len([w for w in warnings if w["severity"] == "warn"])
    infos = len([w for w in warnings if w["severity"] == "info"])

    output = {
        "warnings": warnings,
        "codebase_context": codebase_context,
        "stats": {
            "spec_tables": len(spec_tables),
            "codebase_tables": len(model_tables),
            "migration_tables": len(migration_tables),
            "errors": errors,
            "warnings": warns,
            "infos": infos,
        },
    }

    print(json.dumps(output))
    sys.exit(0)  # Always 0 — warnings inform, they don't block


if __name__ == "__main__":
    main()
