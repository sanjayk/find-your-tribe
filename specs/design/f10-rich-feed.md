# Design: F10 Rich Feed

> See [specs/product/f10-rich-feed.md](../product/f10-rich-feed.md) for product context.

## Pages / Routes

| Route | Flow | Description |
|-------|------|-------------|
| `/feed` | Flow 1 (browsing), Flow 2 (empty) | Authenticated feed timeline with rich event cards |

## Visual Hierarchy

Feed items are not all equal. Four visual types correspond to the significance of the event:

| Visual Type | Events | Treatment |
|---|---|---|
| **Milestone** | `PROJECT_SHIPPED` | Tallest card. Gradient header, project name, tech stack. Celebrates a ship moment. |
| **Content embed** | `PROJECT_CREATED`, `TRIBE_CREATED` | Medium card. Structured info (project + tech stack, or tribe + mission). Enough context to evaluate. |
| **Text** | `PROJECT_UPDATE`, `TRIBE_ANNOUNCEMENT` | Quote-block feel. User-authored content with a source attribution line. |
| **Activity line** | `MEMBER_JOINED_TRIBE`, `COLLABORATION_CONFIRMED`, `BUILDER_JOINED` | Compact, one to two lines. Scannable without stopping. |

## Timeline Layout

Events connect via a vertical timeline thread. The thread runs left-aligned, with avatar nodes as connection points. Milestones and content embeds expand from the thread. Activity lines sit tight against it.

```
 ○  Maya Chen shipped                                    2h ago
 │  ┌──────────────────────────────────────────────────┐
 │  │  ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓  │
 │  │  AI Resume Builder                               │
 │  │  React · Python · OpenAI · PostgreSQL            │
 │  └──────────────────────────────────────────────────┘
 │
 ○  Maya Chen posted an update                           4h ago
 │  "Just hit 1,000 users on AI Resume Builder.
 │   The SEO strategy is finally paying off."
 │   on AI Resume Builder
 │
 ○  Tom Nakamura formed a tribe                          6h ago
 │  Hospitality OS
 │  Building the operating system for independent hotels
 │
 ○  James Okafor joined Hospitality OS                  12h ago
 ○  Elena Volkov joined Growth Analytics Dashboard        1d
 ○  Aisha Patel joined · UX / Prototyping / Analytics     3d
```

The timeline node (`○`) is the actor's avatar circle. The vertical line (`│`) is a thin 1px line in `ink-tertiary/20` connecting nodes. Activity lines share the thread without expanding — consecutive activity lines stack tightly.

## Component Inventory

| Component | Type | Parent | Props | Notes |
|-----------|------|--------|-------|-------|
| `FeedTimeline` | new | `FeedPage` | `events: FeedEvent[]` | Renders the vertical thread + nodes |
| `TimelineNode` | new (inline) | `FeedTimeline` | `event: FeedEvent` | Avatar circle + thread connector |
| `MilestoneCard` | new (inline) | `TimelineNode` | `event: FeedEvent` | PROJECT_SHIPPED — gradient header + project details |
| `ContentEmbed` | new (inline) | `TimelineNode` | `event: FeedEvent` | PROJECT_CREATED, TRIBE_CREATED — structured info card |
| `TextCard` | new (inline) | `TimelineNode` | `event: FeedEvent` | PROJECT_UPDATE, TRIBE_ANNOUNCEMENT — quote block |
| `ActivityLine` | new (inline) | `TimelineNode` | `event: FeedEvent` | Compact single-line for joins |
| `FeedSkeleton` | modified | `FeedPage` | — | Updated to match timeline shape |

## Component Composition

```
FeedPage
├── FeedSkeleton (loading)
├── FeedEmpty (no events)
├── FeedError (query failed)
└── FeedTimeline (populated)
    └── TimelineNode[] (one per event)
        ├── Avatar circle (thread node)
        ├── Thread connector line
        ├── ActorHeader (name + action + timestamp)
        └── Body (varies by visual type)
            ├── MilestoneCard (PROJECT_SHIPPED)
            ├── ContentEmbed (PROJECT_CREATED, TRIBE_CREATED)
            ├── TextCard (PROJECT_UPDATE, TRIBE_ANNOUNCEMENT)
            └── ActivityLine (MEMBER_JOINED_TRIBE, COLLABORATION_CONFIRMED, BUILDER_JOINED)
```

## States

### Empty State
Same as current: centered text block on `surface-secondary` background.
- Headline: "Nothing here yet" (font-serif, text-xl)
- Body: "When builders ship projects, form tribes, and share updates, it all shows up here."

### Loading State
Skeleton matching the timeline shape:
```
 [○]  ████████  ████████               ███
  │   ██████████████████████████
  │   ████████████████
  │
 [○]  ████████  ████████               ███
  │   ██████████████
  │
 [○]  ████████████████████████████████████
 [○]  ████████████████████████████████████
```
Four skeleton nodes. Mix of expanded and compact shapes.

### Populated State — by visual type

**Milestone (PROJECT_SHIPPED):**
```
 ○  Maya Chen  shipped                               2h ago
 │  ┌────────────────────────────────────────────────┐
 │  │  ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓  │
 │  │  ▓▓▓▓▓▓▓▓▓▓▓ gradient header ▓▓▓▓▓▓▓▓▓▓▓▓▓  │
 │  │  ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓  │
 │  │                                                │
 │  │  AI Resume Builder                             │
 │  │  React · Python · OpenAI · PostgreSQL          │
 │  └────────────────────────────────────────────────┘
```
The gradient is generated deterministically from the project title (hash → pick from a curated palette of 4 gradient pairs). The `FeedItem` component already demonstrates this pattern.

**Content embed (PROJECT_CREATED):**
```
 ○  Alex Rivera  started building                     2d ago
 │  ┌────────────────────────────────────────────────┐
 │  │  [◻]  Open Source CRM                          │
 │  │       React · Node.js · PostgreSQL             │
 │  └────────────────────────────────────────────────┘
```
The `[◻]` is a small gradient icon square (same pattern as `FeedItem`'s `StartedBuildingMetadata`). Lighter treatment than a milestone — no hero gradient header, just a compact card.

**Content embed (TRIBE_CREATED):**
```
 ○  Tom Nakamura  formed a tribe                      6h ago
 │
 │  Hospitality OS
 │  Building the operating system for independent hotels
```
Tribe name in serif, mission in secondary text. No member avatars (data not in metadata).

**Text (PROJECT_UPDATE):**
```
 ○  Maya Chen  posted an update                       4h ago
 │
 │  "Just hit 1,000 users on AI Resume Builder.
 │   The SEO strategy is finally paying off."
 │
 │   on AI Resume Builder
```
Content in quotes with slightly inset styling. Source attribution below in tertiary text.

**Text (TRIBE_ANNOUNCEMENT):**
```
 ○  Sarah Kim  announced                              1d ago
 │
 │  "Looking for a backend engineer to join
 │   AI for Education. Rust or Go preferred."
 │
 │   in AI for Education
```

**Activity line (MEMBER_JOINED_TRIBE):**
```
 ○  James Okafor joined Hospitality OS               12h ago
```

**Activity line (COLLABORATION_CONFIRMED):**
```
 ○  Elena Volkov joined Growth Analytics Dashboard      1d
```

**Activity line (BUILDER_JOINED):**
```
 ○  Aisha Patel joined · UX / Prototyping / Analytics   3d
```
Skills shown inline after a `·` separator when present.

### Error State
Same as current: centered text block on `surface-secondary`.

## Data Binding

| UI Element | Data Source | Fallback |
|---|---|---|
| Avatar initials | First letter of each word in `metadata.actor_name` (max 2 chars) | First 2 chars of `metadata.actor_username`, or "?" |
| Avatar color | Deterministic hash of `metadata.actor_name` → palette index | `bg-surface-secondary` + `text-ink-secondary` |
| Actor name | `metadata.actor_name` | `metadata.actor_username` → "A builder" |
| Action text | Derived from `eventType` (see table below) | — |
| Timestamp | `relativeTime(createdAt)` — reuse existing helper | — |
| Project title | `metadata.project_title` | "Untitled project" |
| Tech stack | `metadata.tech_stack` joined with ` · ` | Hidden if empty/missing |
| Tribe name | `metadata.tribe_name` | "Untitled tribe" |
| Tribe mission | `metadata.mission` | Hidden if missing |
| Tribe members | Not in metadata — omit for now | Hidden |
| Skills | `metadata.skills` joined with ` / ` | Hidden if empty/missing |
| Text content | `metadata.content` | Hidden if missing |
| Source attribution | `metadata.project_title` or `metadata.tribe_name` | Hidden if missing |
| Milestone gradient | Deterministic hash of `metadata.project_title` → gradient pair index | Solid `surface-secondary` background |
| Project icon gradient | Deterministic hash of `metadata.project_title` → gradient pair index | Solid `accent-subtle` background |
| Link target | `/${targetType}/${targetId}` mapping: project→`project`, tribe→`tribe`, user→`profile` | No link wrapper if targetType unknown |

**Action text by event type:**

| Event Type | Action Text |
|---|---|
| `PROJECT_SHIPPED` | "shipped" |
| `PROJECT_CREATED` | "started building" |
| `PROJECT_UPDATE` | "posted an update" |
| `TRIBE_CREATED` | "formed a tribe" |
| `TRIBE_ANNOUNCEMENT` | "announced" |
| `COLLABORATION_CONFIRMED` | "joined a project" |
| `MEMBER_JOINED_TRIBE` | "joined a tribe" |
| `BUILDER_JOINED` | "joined" |

## Interactions

| Trigger | Response |
|---|---|
| Click on a milestone/content/text card | Navigate to target detail page |
| Click on an activity line | Navigate to target detail page |
| Hover on milestone/content/text card | Subtle `surface-secondary/50` tint, 150ms ease |
| Hover on activity line | Underline actor name, 150ms ease |
| Click "Load more" | Append next page, button shows "Loading..." while fetching. New timeline nodes appear below the thread. |

## Responsive Behavior

- **Desktop (>768px):** Timeline at `max-w-[720px]` centered, `px-6`, `py-16`. Thread line offset `left-[18px]` (center of avatar).
- **Mobile (<768px):** Same layout with `px-5`, `py-12`. Avatar stays `w-9 h-9`. The single-column timeline is inherently mobile-friendly — no reflow needed.

## Accessibility

- Each timeline node is an `<article>` element
- Milestone and content cards wrapped in `<Link>` — keyboard-navigable via Tab
- Activity lines wrapped in `<Link>` — keyboard-navigable via Tab
- Actor avatar is decorative (`aria-hidden="true"`) — name is in text
- The timeline thread line is decorative (`aria-hidden="true"`)
- Relative timestamps use `<time datetime={iso}>` for machine-readable dates
- "Load more" button has `disabled` state during fetch
- Visual type is never communicated through color alone — event significance is conveyed through layout size and text content

## Design Tokens

### Timeline structure

| Element | Token |
|---|---|
| Thread line | `w-px bg-ink-tertiary/20`, positioned at avatar center |
| Avatar circle | `w-9 h-9 rounded-full`, deterministic bg from palette |
| Avatar text | `text-[12px] font-medium` |
| Node spacing | `py-5` between nodes; activity lines use `py-2` |

### Actor header

| Element | Token |
|---|---|
| Actor name | `text-ink`, `text-[14px]`, `font-medium` |
| Action text | `text-ink-tertiary`, `text-[12px]` |
| Timestamp | `text-ink-tertiary`, `text-[11px]`, `ml-auto` |

### Milestone card (PROJECT_SHIPPED)

| Element | Token |
|---|---|
| Card | `surface-elevated`, `rounded-lg`, `shadow-sm`, `overflow-hidden` |
| Gradient header | `aspect-[3/1]`, deterministic gradient pair |
| Project title | `font-serif`, `text-[16px]`, `text-ink`, `p-4` |
| Tech stack | `font-mono`, `text-[10px]`, `text-ink-tertiary`, `mt-2` |

### Content embed (PROJECT_CREATED)

| Element | Token |
|---|---|
| Card | `surface-secondary`, `rounded-lg`, `p-4` |
| Icon square | `w-10 h-10 rounded-lg`, deterministic gradient |
| Project title | `font-serif`, `text-[15px]`, `text-ink` |
| Tech stack | `font-mono`, `text-[10px]`, `text-ink-tertiary` |

### Content embed (TRIBE_CREATED)

| Element | Token |
|---|---|
| Tribe name | `font-serif`, `text-[15px]`, `text-ink` |
| Mission | `text-[12px]`, `text-ink-secondary` |

### Text card (PROJECT_UPDATE, TRIBE_ANNOUNCEMENT)

| Element | Token |
|---|---|
| Content text | `text-[13px]`, `text-ink-secondary`, `italic` |
| Source attribution | `text-[11px]`, `text-ink-tertiary`, `mt-2` |

### Activity line

| Element | Token |
|---|---|
| Text | `text-[13px]`, `text-ink-secondary` |
| Skills (BUILDER_JOINED) | `font-mono`, `text-[11px]`, `text-ink-tertiary`, separated with ` / ` |
| Spacing | `py-2` (tighter than other types) |

### Avatar color palette (deterministic, hash-based selection)

| Index | Background | Text |
|---|---|---|
| 0 | `bg-accent-subtle` | `text-accent` |
| 1 | `bg-shipped-subtle` | `text-shipped` |
| 2 | `bg-in-progress-subtle` | `text-in-progress` |
| 3 | `bg-surface-inverse` | `text-ink-inverse` |
| 4 | `bg-accent-muted/30` | `text-accent` |
| 5 | `bg-surface-secondary` | `text-ink-secondary` |

### Gradient palette (deterministic, hash-based selection for milestones and project icons)

| Index | From | Via | To |
|---|---|---|---|
| 0 | `from-indigo-500` | `via-purple-500` | `to-pink-500` |
| 1 | `from-emerald-500` | `via-teal-500` | `to-cyan-500` |
| 2 | `from-amber-500` | `via-orange-500` | `to-red-500` |
| 3 | `from-blue-500` | `via-indigo-500` | `to-violet-500` |

All other tokens reference existing values in `globals.css`. No new design system tokens introduced.

## Figma Reference

N/A — the visual reference is the landing page feed section (`src/frontend/src/app/page.tsx`, lines 615-775) which demonstrates the target aesthetic for shipped, tribe, building, and joined event types.
