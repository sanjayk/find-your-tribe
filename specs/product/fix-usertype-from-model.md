# Fix: Add UserType.from_model() classmethod

## Problem

`UserType` in `src/backend/app/graphql/types/user.py` is missing a `from_model()` classmethod. Two GraphQL queries (`user` and `builders` in `health.py`) call `UserType.from_model()` — this crashes at runtime.

Other GraphQL types (`ProjectType`, `TribeType`) already have `from_model()` and manually construct `UserType` inline — duplicating field mappings everywhere. UserType should own its own construction.

## Requirements

### 1. Add missing fields to UserType

The following fields are referenced when constructing UserType in `project.py` and `tribe.py` but do not exist on UserType:

- `agent_tools: list[str]` (JSON list in model)
- `agent_workflow_style: str | None`
- `human_agent_ratio: float | None`

Add these as plain fields. Also add private fields for lazy-resolved relationships:

- `_skills: strawberry.Private[list]`
- `_owned_projects: strawberry.Private[list]`
- `_tribes: strawberry.Private[list]`

Convert the existing `skills()` method to resolve from `_skills` (like `ProjectType.owner()` resolves from `_owner`).

### 2. Add `from_model()` classmethod

Signature:

```python
@classmethod
def from_model(
    cls,
    user: "User",
    skills: "list | None" = None,
    projects: "list | None" = None,
    tribes: "list | None" = None,
) -> "UserType":
```

Map all User model fields to UserType fields. For relationships:
- `skills` → convert via `SkillType.from_model()` if provided, else `[]`
- `projects` → convert via `ProjectType.from_model()` if provided, else `[]`
- `tribes` → convert via `TribeType.from_model()` if provided, else `[]`

Handle the circular import the same way project.py and tribe.py do — import at the bottom of the file after class definitions.

### 3. Add resolvers for owned_projects and tribes

Add `@strawberry.field` resolvers for `owned_projects` and `tribes` that return from the private fields, matching the existing pattern.

## Files to modify

- `src/backend/app/graphql/types/user.py` — add fields, from_model, resolvers

## Acceptance criteria

- `UserType.from_model(user)` works with just a user model (no relations)
- `UserType.from_model(user, skills=..., projects=..., tribes=...)` works with all relations
- `cd src/backend && ruff check .` passes
- The `user(username)` and `builders` GraphQL queries no longer crash
