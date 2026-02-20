#!/usr/bin/env python3
"""Contract verification via AST parsing.

Verifies that the codebase implements the schema defined in contract.json
by parsing Python source files structurally — no grep, no regex.

Usage:
    python3 contract_verify.py <contract.json> <project_root>

Output: JSON with passed/failed results per check.
Exit code: 0 if all checks pass, 1 if any fail.
"""

import ast
import json
import os
import sys
import glob


# ── AST extraction ────────────────────────────────────────────────


def extract_models(models_dir):
    """Extract table definitions from SQLAlchemy model files using AST.

    Resolves mixin inheritance: columns from base classes (ULIDMixin,
    TimestampMixin, etc.) are merged into the concrete model's columns.

    Returns: {table_name: {columns: {col: {type, fk}}, fks: [...], file, class_name}}
    """
    # First pass: collect ALL classes and their columns (including mixins)
    all_classes = {}  # class_name -> {columns: {}, bases: [], file: str}

    search_dirs = [models_dir]
    # Also scan the db/ directory for base classes and mixins
    db_dir = os.path.join(os.path.dirname(models_dir), "db")
    if os.path.isdir(db_dir):
        search_dirs.append(db_dir)

    for search_dir in search_dirs:
        for py_file in sorted(glob.glob(os.path.join(search_dir, "**", "*.py"), recursive=True)):
            try:
                source = open(py_file).read()
                tree = ast.parse(source)
            except (SyntaxError, OSError):
                continue

            for node in ast.iter_child_nodes(tree):
                if not isinstance(node, ast.ClassDef):
                    continue

                columns = {}
                table_name = None
                base_names = [_get_func_name(b) or "" for b in node.bases]

                for item in node.body:
                    if isinstance(item, ast.Assign):
                        for target in item.targets:
                            if isinstance(target, ast.Name) and target.id == "__tablename__":
                                table_name = _get_string_value(item.value)

                    col_name, col_info = _extract_column(item)
                    if col_name:
                        columns[col_name] = col_info

                all_classes[node.name] = {
                    "columns": columns,
                    "bases": base_names,
                    "table_name": table_name,
                    "file": os.path.relpath(py_file),
                }

    # Second pass: resolve inheritance — merge base class columns into models
    def resolve_columns(class_name, visited=None):
        if visited is None:
            visited = set()
        if class_name in visited or class_name not in all_classes:
            return {}
        visited.add(class_name)

        cls = all_classes[class_name]
        merged = {}

        # Inherit from bases first (order matters — later bases override)
        for base in cls["bases"]:
            merged.update(resolve_columns(base, visited))

        # Own columns override inherited ones
        merged.update(cls["columns"])
        return merged

    # Third pass: build table map from classes that have __tablename__
    tables = {}
    for class_name, cls in all_classes.items():
        table_name = cls["table_name"]
        if not table_name:
            continue

        columns = resolve_columns(class_name)
        tables[table_name] = {
            "columns": columns,
            "fks": [c["fk"] for c in columns.values() if c.get("fk")],
            "file": cls["file"],
            "class_name": class_name,
        }

    return tables


def extract_migrations(migrations_dir):
    """Extract op.create_table() calls from Alembic migration files using AST.

    Returns: {table_name: {columns: set, file: str}}
    """
    tables = {}

    if not os.path.isdir(migrations_dir):
        return tables

    for py_file in sorted(glob.glob(os.path.join(migrations_dir, "*.py"))):
        try:
            source = open(py_file).read()
            tree = ast.parse(source)
        except (SyntaxError, OSError):
            continue

        for node in ast.walk(tree):
            if not isinstance(node, ast.Call):
                continue

            # Match: op.create_table("name", ...)
            if not (
                isinstance(node.func, ast.Attribute)
                and isinstance(node.func.value, ast.Name)
                and node.func.value.id == "op"
                and node.func.attr == "create_table"
            ):
                continue

            if not node.args:
                continue

            name = _get_string_value(node.args[0])
            if not name:
                continue

            # Extract column names from sa.Column("name", ...) positional args
            col_names = set()
            for arg in node.args[1:]:
                if isinstance(arg, ast.Call):
                    col_arg_name = _get_call_first_string(arg)
                    if col_arg_name:
                        col_names.add(col_arg_name)

            tables[name] = {"columns": col_names, "file": os.path.relpath(py_file)}

    return tables


# ── AST helpers ───────────────────────────────────────────────────


def _get_string_value(node):
    """Extract string value from an AST Constant node."""
    if isinstance(node, ast.Constant) and isinstance(node.value, str):
        return node.value
    return None


def _get_call_first_string(call_node):
    """Get the first string argument of a Call node."""
    if isinstance(call_node, ast.Call) and call_node.args:
        return _get_string_value(call_node.args[0])
    return None


def _get_func_name(node):
    """Get function/attribute name from a Name or Attribute node."""
    if isinstance(node, ast.Name):
        return node.id
    if isinstance(node, ast.Attribute):
        return node.attr
    return None


def _extract_column(item):
    """Extract column info from an AST assignment node.

    Handles:
      name = Column(Type, ForeignKey("ref"), ...)
      name: Mapped[X] = mapped_column(ForeignKey("ref"), ...)
    """
    # name = Column(...)
    if isinstance(item, ast.Assign) and len(item.targets) == 1:
        target = item.targets[0]
        if isinstance(target, ast.Name) and isinstance(item.value, ast.Call):
            return _parse_column_call(target.id, item.value)

    # name: Mapped[X] = mapped_column(...)
    if isinstance(item, ast.AnnAssign) and isinstance(item.target, ast.Name):
        if isinstance(item.value, ast.Call):
            return _parse_column_call(item.target.id, item.value)

    return None, None


def _parse_column_call(col_name, call_node):
    """Parse a Column() or mapped_column() call for type, FK, and DB name.

    Handles DB column name override: mapped_column("metadata", JSONB, ...)
    means the Python attr is `metadata_` but the DB column is `metadata`.
    Returns (col_name, col_info) where col_info includes `db_name` if overridden.
    """
    func_name = _get_func_name(call_node.func)

    if func_name not in ("Column", "mapped_column"):
        return None, None

    col_info = {"type": None, "fk": None, "db_name": None}

    # Check if first positional arg is a string (DB column name override)
    if call_node.args:
        first_str = _get_string_value(call_node.args[0])
        if first_str is not None:
            col_info["db_name"] = first_str

    for arg in call_node.args:
        if isinstance(arg, ast.Call):
            arg_func = _get_func_name(arg.func)
            if arg_func == "ForeignKey" and arg.args:
                fk_ref = _get_string_value(arg.args[0])
                if fk_ref:
                    col_info["fk"] = fk_ref
            elif col_info["type"] is None and arg_func:
                col_info["type"] = arg_func
        elif isinstance(arg, ast.Name) and col_info["type"] is None:
            col_info["type"] = arg.id
        elif isinstance(arg, ast.Attribute) and col_info["type"] is None:
            col_info["type"] = arg.attr

    # Also check keyword arguments for ForeignKey
    for kw in call_node.keywords:
        if isinstance(kw.value, ast.Call):
            kw_func = _get_func_name(kw.value.func)
            if kw_func == "ForeignKey" and kw.value.args:
                fk_ref = _get_string_value(kw.value.args[0])
                if fk_ref:
                    col_info["fk"] = fk_ref

    return col_name, col_info


# ── Verification ──────────────────────────────────────────────────


def verify_contract(contract, model_tables, migration_tables):
    """Verify contract against extracted schema info.

    Returns list of {check, passed, detail} dicts.
    """
    results = []
    all_known_tables = set(model_tables.keys()) | set(migration_tables.keys())

    # ── Check entities ────────────────────────────────────────────
    for entity in contract.get("entities", []):
        table = entity.get("table")
        if not table:
            continue

        in_models = table in model_tables
        in_migrations = table in migration_tables

        if in_models or in_migrations:
            sources = []
            if in_models:
                sources.append(f"model ({model_tables[table]['file']})")
            if in_migrations:
                sources.append(f"migration ({migration_tables[table]['file']})")
            results.append({
                "check": f"Table '{table}'",
                "passed": True,
                "detail": f"Found in: {', '.join(sources)}",
            })

            # ── Check key_fields against model columns ────────────
            key_fields = entity.get("key_fields", [])
            if key_fields and in_models:
                model_cols = model_tables[table]["columns"]
                # Build lookup: DB column names (overrides) + Python attr names
                col_names = set(model_cols.keys())
                db_name_map = {}  # db_name -> python_attr
                for attr, info in model_cols.items():
                    db_name = info.get("db_name")
                    if db_name:
                        col_names.add(db_name)
                        db_name_map[db_name] = attr

                for field in key_fields:
                    if field in col_names:
                        detail = "Found in model"
                        if field in db_name_map:
                            detail += f" (attr: {db_name_map[field]})"
                        results.append({
                            "check": f"Column '{table}.{field}'",
                            "passed": True,
                            "detail": detail,
                        })
                    else:
                        results.append({
                            "check": f"Column '{table}.{field}'",
                            "passed": False,
                            "detail": f"NOT FOUND. Model columns: {', '.join(sorted(col_names)) or '(none)'}",
                        })
        else:
            results.append({
                "check": f"Table '{table}'",
                "passed": False,
                "detail": f"NOT FOUND. Known tables: {', '.join(sorted(all_known_tables)) or '(none)'}",
            })

    # ── Check relationships ───────────────────────────────────────
    for rel in contract.get("relationships", []):
        from_table = rel.get("from", "")
        to_table = rel.get("to", "")
        rel_type = rel.get("type", "")
        via = rel.get("via", "")

        if rel_type == "many_to_many":
            if via in all_known_tables:
                results.append({
                    "check": f"Join table '{via}' ({from_table} <-> {to_table})",
                    "passed": True,
                    "detail": "Found",
                })
            else:
                results.append({
                    "check": f"Join table '{via}' ({from_table} <-> {to_table})",
                    "passed": False,
                    "detail": f"NOT FOUND. Known tables: {', '.join(sorted(all_known_tables)) or '(none)'}",
                })
        else:
            # Check FK column exists in the source table's model
            found = False
            detail = ""

            if from_table in model_tables:
                model_info = model_tables[from_table]
                cols = model_info["columns"]

                # Strategy 1: column named `via` exists
                if via in cols:
                    found = True
                    fk = cols[via].get("fk", "")
                    detail = f"Column '{via}' found in {from_table}"
                    if fk:
                        detail += f" (FK -> {fk})"

                # Strategy 2: any column has FK pointing to target table
                if not found:
                    for col_name, col_info in cols.items():
                        fk = col_info.get("fk", "")
                        if fk and to_table in fk:
                            found = True
                            detail = f"FK found: {col_name} -> {fk}"
                            break

                if not found:
                    all_cols = sorted(cols.keys())
                    all_fks = [
                        f"{k}->{v['fk']}"
                        for k, v in cols.items()
                        if v.get("fk")
                    ]
                    detail = (
                        f"NOT FOUND in '{from_table}' model. "
                        f"Columns: {all_cols}. FKs: {all_fks or '(none)'}"
                    )
            else:
                detail = f"Source table '{from_table}' not found in models"

            results.append({
                "check": f"FK '{via}' ({from_table} -> {to_table})",
                "passed": found,
                "detail": detail,
            })

    return results


# ── Main ──────────────────────────────────────────────────────────


def main():
    if len(sys.argv) != 3:
        print(json.dumps({"error": f"Usage: {sys.argv[0]} <contract.json> <project_root>"}))
        sys.exit(2)

    contract_path = sys.argv[1]
    project_root = sys.argv[2]

    try:
        with open(contract_path) as f:
            contract = json.load(f)
    except (OSError, json.JSONDecodeError) as e:
        print(json.dumps({"error": f"Failed to read contract: {str(e)}"}))
        sys.exit(2)

    models_dir = os.path.join(project_root, "src", "backend", "app", "models")
    migrations_dir = os.path.join(project_root, "src", "backend", "migrations", "versions")

    model_tables = extract_models(models_dir)
    migration_tables = extract_migrations(migrations_dir)

    results = verify_contract(contract, model_tables, migration_tables)

    passed = all(r["passed"] for r in results) if results else True

    output = {
        "passed": passed,
        "results": results,
        "schema_summary": {
            "model_tables": sorted(model_tables.keys()),
            "migration_tables": sorted(migration_tables.keys()),
        },
    }

    print(json.dumps(output))
    sys.exit(0 if passed else 1)


if __name__ == "__main__":
    main()
