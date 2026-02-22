#!/usr/bin/env python3
"""Contract verification — technology-agnostic existence checks.

Verifies that the codebase contains the artifacts declared in contract.json.
Checks EXISTENCE only (does the file/symbol exist?). Semantic correctness
(are columns right? are FKs valid?) is the LLM reviewer's job.

Usage:
    python3 contract_verify.py <contract.json> <project_root>

Output: JSON with passed/failed results per entity.
Exit code: 0 if all checks pass, 1 if any fail.
"""

import json
import os
import sys


# ── Entity type inference ─────────────────────────────────────────


def _infer_entity_type(entity):
    """Infer entity type from fields. Backward compat for contracts without 'type'."""
    if "type" in entity:
        return entity["type"]
    # Legacy: table field with path-like value
    table = entity.get("table", "")
    if "/" in table or "." in table:
        if ":" in table:
            return "function"
        return "file"
    return "database"


# ── Entity verification ──────────────────────────────────────────


def verify_file_entity(entity, project_root):
    """Check that a file entity exists on disk.

    Returns list of {check, passed, detail} dicts.
    """
    results = []
    path = entity.get("path") or entity.get("table", "")
    name = entity.get("name", path)

    if not path:
        results.append({
            "check": f"File entity '{name}'",
            "passed": False,
            "detail": "No path declared — cannot verify",
        })
        return results

    # Handle parameterized paths like .speed/defects/<name>/state.json
    if "<" in path and ">" in path:
        parts = path.split("/")
        static_parts = []
        for part in parts:
            if "<" in part:
                break
            static_parts.append(part)
        parent_dir = os.path.join(project_root, *static_parts) if static_parts else project_root
        exists = os.path.isdir(parent_dir)
        results.append({
            "check": f"File entity '{name}'",
            "passed": exists,
            "detail": f"Parameterized path '{path}' — parent dir '{'/'.join(static_parts) or '.'}' {'exists' if exists else 'NOT FOUND'}",
        })
    else:
        full_path = os.path.join(project_root, path)
        exists = os.path.exists(full_path)
        results.append({
            "check": f"File entity '{name}'",
            "passed": exists,
            "detail": f"Path '{path}' {'exists' if exists else 'NOT FOUND'}",
        })

    return results


def verify_function_entity(entity, project_root):
    """Check that a function entity's file exists and contains the symbol.

    Returns list of {check, passed, detail} dicts.
    """
    results = []
    raw = entity.get("path") or entity.get("table", "")
    # Handle legacy "file:func" format in table field
    if ":" in raw and not entity.get("path"):
        path = raw.split(":")[0]
        func_name = raw.split(":")[-1]
    else:
        path = raw
        func_name = entity.get("function", "")

    name = entity.get("name", f"{path}:{func_name}" if func_name else path)

    if not path:
        results.append({
            "check": f"Function entity '{name}'",
            "passed": False,
            "detail": "No path declared — cannot verify",
        })
        return results

    full_path = os.path.join(project_root, path)

    if not os.path.exists(full_path):
        results.append({
            "check": f"Function entity '{name}'",
            "passed": False,
            "detail": f"File '{path}' NOT FOUND",
        })
        return results

    # File exists — check for the symbol name in content
    try:
        content = open(full_path).read()
    except OSError as e:
        results.append({
            "check": f"Function entity '{name}'",
            "passed": False,
            "detail": f"Cannot read '{path}': {e}",
        })
        return results

    if func_name and func_name in content:
        results.append({
            "check": f"Function entity '{name}'",
            "passed": True,
            "detail": f"File '{path}' exists and contains '{func_name}'",
        })
    elif func_name:
        results.append({
            "check": f"Function entity '{name}'",
            "passed": False,
            "detail": f"File '{path}' exists but '{func_name}' NOT FOUND in content",
        })
    else:
        results.append({
            "check": f"Function entity '{name}'",
            "passed": True,
            "detail": f"File '{path}' exists (no function name specified)",
        })

    return results


def verify_database_entity(entity, project_root):
    """Check that a database entity's model file exists and contains the model class.

    If the entity has a `path`, checks file existence (and `function` as symbol).
    If no `path`, emits an advisory — the entity is not verifiable by this script.

    Returns list of {check, passed, detail} dicts.
    """
    path = entity.get("path", "")
    name = entity.get("name", entity.get("table", "unknown"))

    if path:
        # Has a path — verify like a function entity (file + optional symbol)
        return verify_function_entity(entity, project_root)

    # No path — legacy contract with only a table name
    table = entity.get("table", "")
    return [{
        "check": f"Database entity '{name}'",
        "passed": True,
        "detail": f"Table '{table}' declared without path — existence not verifiable by automated check (LLM agents will verify)",
    }]


# ── Verification ──────────────────────────────────────────────────


def verify_contract(contract, project_root):
    """Verify contract entities exist in the project.

    Checks existence only. Semantic correctness (key_fields, relationships)
    is verified by LLM agents (reviewer, coherence checker).

    Returns list of {check, passed, detail} dicts.
    """
    results = []

    entities = contract.get("entities", [])

    # Empty entities = failure — every feature creates something
    if not entities:
        results.append({
            "check": "Entity coverage",
            "passed": False,
            "detail": "No entities declared — every feature must declare verifiable artifacts",
        })
        return results

    for entity in entities:
        entity_type = _infer_entity_type(entity)

        if entity_type == "file":
            results.extend(verify_file_entity(entity, project_root))
        elif entity_type == "function":
            results.extend(verify_function_entity(entity, project_root))
        elif entity_type == "database":
            results.extend(verify_database_entity(entity, project_root))
        else:
            results.append({
                "check": f"Entity '{entity.get('name', '?')}'",
                "passed": False,
                "detail": f"Unknown entity type '{entity_type}'",
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

    results = verify_contract(contract, project_root)

    passed = all(r["passed"] for r in results)

    output = {
        "passed": passed,
        "results": results,
    }

    print(json.dumps(output))
    sys.exit(0 if passed else 1)


if __name__ == "__main__":
    main()
