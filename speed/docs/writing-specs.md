# Writing Specs for SPEED

SPEED agents are only as good as the specs they read. This guide covers how to write specs that produce clean task plans and correct implementations.

## The Three-Spec Model

Every feature in SPEED is described by three spec files:

| Spec | Question it answers | Audience |
|------|---------------------|----------|
| **Product** (`specs/product/<name>.md`) | What does the user need? | Product Guardian, Architect |
| **Tech** (`specs/tech/<name>.md`) | How is it built? | Architect, Developer agents |
| **Design** (`specs/design/<name>.md`) | What does it look like? | Developer agents (frontend tasks) |

Plus one **vision file** (`specs/product/overview.md`) that defines the product's mission, personas, and anti-goals. The Product Guardian reads this at every checkpoint.

### File naming convention

SPEED auto-derives sibling specs from the tech spec path:

```
specs/tech/bookshelf.md
  → specs/product/bookshelf.md    (auto-discovered)
  → specs/design/bookshelf.md     (auto-discovered)
```

All three files must share the same base name. When you run `speed plan specs/tech/bookshelf.md`, the Architect automatically receives the matching product and design specs.

## Anatomy of a Good Spec

### Product spec

The product spec defines features and acceptance criteria. Here's an annotated example from the [bookshelf example project](../example/specs/product/bookshelf.md):

```markdown
# Feature: Bookshelf Core          ← Clear feature name

## Overview                         ← One paragraph of context

## Features

### F1: Book Management             ← Numbered features with names

**Acceptance criteria:**            ← This exact header matters
- User can add a book with title (required), author (required)...
- User can set a book's reading status...
- Empty state shows a clear call-to-action...

### F2: Reading Lists               ← Each feature is self-contained
...

## Out of scope                     ← Explicit boundaries
- User accounts or authentication
- Book cover images
```

**Key elements:**
- Numbered features (`F1`, `F2`) so the Architect can reference them in tasks
- Acceptance criteria as testable statements ("User can X" or "System does Y")
- Out of scope section to prevent agents from inventing features

### Tech spec

The tech spec defines the data model, API, and validation rules. Annotated example from [bookshelf tech spec](../example/specs/tech/bookshelf.md):

```markdown
# Tech Spec: Bookshelf Core

## Data Model

### Tables

#### `authors`                      ← Table name matches DB convention
| Column | Type | Constraints |     ← Every column fully specified
| id | UUID | PK, default ... |
| name | VARCHAR(255) | NOT NULL |

#### `books`
| author_id | UUID | FK → authors(id) ON DELETE CASCADE |  ← FK with behavior

### Relationships                   ← Explicit relationship section
- `books.author_id` → `authors.id` (many-to-one)
- `reading_list_items` is a join table (many-to-many)

## GraphQL API

### Queries                         ← Every query with args + return type
| Query | Arguments | Returns |
| `books` | `status: BookStatus` | `[Book!]!` |

### Mutations                       ← Every mutation with args + return type
| `createBook` | `title: String!, ...` | `Book!` |

## Validation Rules                 ← Business rules the code must enforce
- Book title is required
- A book cannot appear in the same list twice
```

**Key elements:**
- Complete table definitions with types, constraints, and FKs
- FK behavior specified (CASCADE, SET NULL, etc.)
- Explicit relationships section connecting the tables
- API surface fully defined (queries and mutations with types)
- Validation rules as enforceable statements

### Design spec

The design spec defines pages, components, and their states. Annotated example from [bookshelf design spec](../example/specs/design/bookshelf.md):

```markdown
# Design Spec: Bookshelf Core

## Pages

### Dashboard (`/`)                 ← Route path included
**Layout:**                         ← What's on the page
- Stats row: 3 cards showing totals
- Reading lists section
- "Add a book" button

**States:**                         ← Every page needs all four states
- **Empty:** Welcome message + CTA
- **Populated:** Real data
- **Loading:** Skeleton placeholders
- **Error:** Inline error + retry

## Components

### BookCard                        ← Reusable components
- Title (primary text, bold)
- Author name (secondary text)
- StatusBadge
```

**Key elements:**
- Every page has a route path
- Every page defines four states: empty, populated, loading, error
- Components list what data they display and how
- Component names match what the tech spec's API returns

## How the Architect Reads Specs

Understanding what the Architect extracts helps you write better specs:

1. **Entities** — Table names from the tech spec become the backbone of the task graph. Each table or group of related tables becomes a task.

2. **Relationships** — FKs determine task dependencies. If `books` has `author_id FK → authors`, then the authors task must complete before the books task.

3. **Acceptance criteria** — Each criterion from the product spec gets mapped to a task. Criteria without a clear technical home get flagged.

4. **API surface** — Queries and mutations become tasks, grouped logically. The Architect looks for which queries/mutations depend on which tables.

5. **Pages and components** — Frontend tasks are derived from the design spec. Each page may become a task. Components shared across pages become their own task.

The result is a **task DAG** — a directed acyclic graph where nodes are tasks and edges are dependencies.

## Common Mistakes

### 1. Hollow spec (no acceptance criteria)

**Bad:**
```markdown
### User Management
Users can manage their account.
```

**Good:**
```markdown
### User Management
**Acceptance criteria:**
- User can update their display name (max 50 characters)
- User can change their email (requires verification)
- User can delete their account (with confirmation dialog)
```

**Why it matters:** Without acceptance criteria, the Architect guesses at scope and the Reviewer has nothing to check against.

### 2. Kitchen sink (too many features)

**Bad:** A single spec with 15 features, 20 tables, and 30 API endpoints.

**Good:** Split into multiple specs. One spec per coherent feature area. A bookshelf spec should not include user authentication, notifications, and analytics.

**Why it matters:** The Architect produces better task plans when the scope is focused. Large specs produce large plans with more opportunities for coordination failures.

### 3. Missing relationship (product says X→Y, tech has no FK)

**Bad:**
- Product spec: "Books belong to reading lists"
- Tech spec: `books` table has no FK to `reading_lists`

**Good:**
- Product spec: "Books can be added to reading lists"
- Tech spec: `reading_list_items` join table with FKs to both `books` and `reading_lists`

**Why it matters:** The Validator catches these, but it's better to get them right upfront. Missing relationships mean the Architect can't derive correct task dependencies.

### 4. Orphaned UI (design page with no API)

**Bad:**
- Design spec defines a "Reading Stats" page showing "books read per month"
- Tech spec has no query for monthly reading stats

**Good:**
- Design spec defines "Reading Stats" page
- Tech spec includes `readingStatsByMonth` query returning `[{month, count}]`

**Why it matters:** Frontend tasks will reference API endpoints that don't exist. The developer agent will either invent an API (scope creep) or report blocked.

### 5. Missing out-of-scope section

**Bad:** No mention of what the feature does NOT include.

**Good:**
```markdown
## Out of scope
- User accounts or authentication
- Book cover images
- Notes or annotations
```

**Why it matters:** Without explicit boundaries, agents fill gaps with reasonable-sounding features that weren't requested. The Product Guardian catches some of this, but an out-of-scope section is cheaper and more reliable.

### 6. Spec-codebase gap

**Bad:** Spec references a `users` table, but the codebase already has a `profiles` table serving the same purpose.

**Good:** Spec references the existing `profiles` table by its actual name and schema.

**Why it matters:** Developer agents will create duplicate tables or fail trying to reference tables that don't exist. If the codebase already has relevant code, the spec should acknowledge it.

## Pre-flight Checklist

Before running `speed plan`, verify:

- [ ] Product spec has numbered features with acceptance criteria
- [ ] Product spec has an "Out of scope" section
- [ ] Tech spec has complete table definitions (all columns, types, constraints)
- [ ] Tech spec FKs specify ON DELETE behavior
- [ ] Tech spec has a "Relationships" section
- [ ] Tech spec API surface covers all product spec features
- [ ] Design spec pages have routes and all four states (empty, populated, loading, error)
- [ ] Design spec component names align with tech spec types
- [ ] Vision file (`overview.md`) has anti-goals and won't-have sections
- [ ] All three spec files share the same base name
- [ ] `speed validate specs/` passes without errors
