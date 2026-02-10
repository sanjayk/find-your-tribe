# F5: Discovery & Search — Page Design

> See [design-system.md](./design-system.md) and [components.md](./components.md) for tokens.

---

## Discovery Hub (`/discover`)

The browsing experience. Three tabs, filterable, searchable. This is where "find your people" happens.

### Page Layout

```
┌──────────────────────────────────────────────────────────────────┐
│  nav bar                                                         │
├──────────────────────────────────────────────────────────────────┤
│                                                                  │
│  Discover                                               ← h1 (Instrument Serif)
│  Find builders, projects, and tribes.                   ← body-lg, text-secondary
│                                                                  │
│  ┌────────────────────────────────────────────────────────────┐  │
│  │  🔍 Search builders, projects, tribes...        [AI off] │  │ ← search input, full-width
│  └────────────────────────────────────────────────────────────┘  │
│                                                                  │
│  Builders    Projects    Tribes                         ← page tabs (underline style)
│  ═══════                                                         │
│                                                                  │
│  ┌────────────┐                                                  │
│  │ Filters    │  ┌──────────┐ ┌──────────┐ ┌──────────┐        │
│  │            │  │ Builder  │ │ Builder  │ │ Builder  │        │
│  │ ROLE       │  │ Card     │ │ Card     │ │ Card     │        │
│  │ [ ] Full.. │  └──────────┘ └──────────┘ └──────────┘        │
│  │ [ ] Front. │                                                  │
│  │ [ ] Back.. │  ┌──────────┐ ┌──────────┐ ┌──────────┐        │
│  │ [ ] Design │  │ Builder  │ │ Builder  │ │ Builder  │        │
│  │ [ ] PM     │  │ Card     │ │ Card     │ │ Card     │        │
│  │            │  └──────────┘ └──────────┘ └──────────┘        │
│  │ SKILLS     │                                                  │
│  │ [search..] │  ┌──────────┐ ┌──────────┐ ┌──────────┐        │
│  │ React      │  │ Builder  │ │ Builder  │ │ Builder  │        │
│  │ Python     │  │ Card     │ │ Card     │ │ Card     │        │
│  │            │  └──────────┘ └──────────┘ └──────────┘        │
│  │ AVAILABLE  │                                                  │
│  │ [ ] Open   │  ──────────────────────────────────────          │
│  │ [ ] Tribe  │                                                  │
│  │            │  [ ← ]  Page 2 of 8  [ → ]             ← pagination
│  │ TIMEZONE   │                                                  │
│  │ [select ▾] │                                                  │
│  └────────────┘                                                  │
│                                                                  │
└──────────────────────────────────────────────────────────────────┘

Sidebar: 260px, sticky (top: 80px), surface-secondary bg, radius-lg, 20px padding
  Hidden on mobile — replaced by filter button that opens bottom sheet
Main: fluid, 3-column card grid (desktop), 2-column (tablet), 1-column (mobile)
Gap between sidebar and main: 24px
```

### Tab Content

**Builders tab** — Builder cards in grid. Default sort: Builder Score (descending).
**Projects tab** — Project cards in grid. Default sort: recent.
**Tribes tab** — Tribe cards in grid. Default sort: recent.

Each tab has its own filter sidebar configuration:

### Builder Filters

```
ROLE                                       ← overline label
[ ] Full-Stack Developer
[ ] Frontend Developer
[ ] Backend Developer
[ ] Designer
[ ] Product Manager
[ ] Growth / Marketing
[ ] DevOps / Infra

SKILLS                                     ← overline
[ Search skills... ]                       ← text input
Selected: tag row with × to remove

AVAILABILITY                               ← overline
[ ] Open to collaborate
[ ] Open to join a tribe

TIMEZONE                                   ← overline
[ Any timezone ▾ ]                         ← select dropdown

[ Clear all filters ]                      ← ghost button, bottom of sidebar
```

### Project Filters

```
TECH STACK
[ Search tech... ]
Selected tags

STATUS
[ ] Shipped
[ ] In Progress

SORT BY
( ) Recent (default)
( ) Most Stars
( ) Builder Score
```

### Tribe Filters

```
SKILLS NEEDED
[ Search skills... ]
Selected tags

STATUS
[ ] Open (looking for members)
[ ] Active

SORT BY
( ) Recent (default)
```

### Filter Interactions

```
Checkbox: immediate filter (no "Apply" button needed)
Tags: add/remove triggers re-fetch
Select: change triggers re-fetch
Clear all: resets everything, refetches

Active filter count shown on mobile filter button:
  [ Filters (3) ]  ← primary button variant, count in badge
```

---

## Search

### Inline Search (Top of Discovery)

```
Input: full-width, surface-elevated, shadow-sm
  Placeholder: "Search builders, projects, tribes..."
  Left icon: Search (20px, text-tertiary)
  Right: AI toggle
    Off: pill, surface-secondary bg, text-tertiary, "AI"
    On: pill, accent bg, white text, "AI ✨"
  Height: 48px
  Radius: radius-lg

On type: debounce 300ms, results update in the grid below
Clear: × button appears when input has value
```

### AI Search Mode

When AI toggle is on:

```
Input placeholder changes: "Describe who you're looking for..."
Input background: subtle accent-subtle tint

Example queries shown below input (first time):
  "designer who's shipped B2B SaaS"
  "backend engineer with Python, PST timezone"
  "growth marketer for a fintech startup"
  Font: body-sm, text-tertiary, clickable → populates input

Results: same grid layout, but with relevance scores
  Each card gets a small "AI match" badge: accent-subtle bg, accent text, caption
  Badge shows match percentage: "92% match"
```

---

## Command Palette (`Cmd+K`)

Global quick search — available from any page.

See components.md for full spec. Key page-level details:

```
Trigger: ⌘K keyboard shortcut, or search icon in nav
Opens overlay with search input

Result groups (overline labels):
  BUILDERS — avatar + name + role
  PROJECTS — title + tech stack preview
  TRIBES — name + status

Result actions:
  Enter: navigate to result
  Tab: cycle through groups

Recent searches: shown when input is empty
  "Recent" overline label
  Last 5 searches, clickable
  [ Clear recent ] ghost button
```

---

## Mobile Filters (Bottom Sheet)

```
Trigger: "Filters" button below search input (mobile only)
Sheet: slides up from bottom
  Background: surface-elevated
  Radius: radius-xl top only
  Handle: 40px × 4px, surface-secondary, centered, 12px from top
  Max height: 80vh
  Scrollable content

Content: same filter sections as sidebar
Footer (sticky):
  Results count: "42 builders" — body-sm, text-secondary
  [ Clear ] [ Show Results ]

  Clear: ghost button
  Show Results: primary button, full width
```

---

## Results States

### Loading

```
Grid: 6 skeleton cards (matching card layout)
Sidebar: visible, interactive (not skeleton)
```

### No Results

```
  [Search icon, 48px, text-tertiary]

  No results found                         ← h3
  Try adjusting your filters or            ← body-sm, text-secondary
  search with different terms.

  [ Clear all filters ]                    ← ghost button

If AI mode: "Try describing what you're looking for differently."
```

### Search Results Count

```
Above grid: "42 builders found" — body-sm, text-secondary
With active filters: "42 builders · 3 filters active"
```

---

## Responsive Behavior

| Element | Mobile | Tablet | Desktop |
|---------|--------|--------|---------|
| Search | Full width | Full width | Full width |
| Tabs | Horizontal scroll | Static | Static |
| Filters | Bottom sheet | Bottom sheet | Sticky sidebar |
| Card grid | 1 column | 2 columns | 3 columns |
| Pagination | Full width | Centered | Centered |
