# Component Library — Find Your Tribe

> See [design-system.md](./design-system.md) for tokens and foundations.
> Aesthetic: Editorial Confidence + Studio Warmth.

---

## Buttons

### Primary

```
Background: accent (#6366f1)
Text: white
Font: 14px / Inter 500
Padding: 10px 20px
Radius: radius-md (8px)
Shadow: shadow-sm
Hover: accent-hover (#4f46e5)
Active: scale(0.98)
Disabled: opacity 0.4, cursor not-allowed
```

Usage: Ship Project, Create Tribe, Sign Up — actions that move things forward.

### Secondary

```
Background: surface-secondary (#f2f0ed)
Text: text-primary (#1c1917)
Font: 14px / Inter 500
Padding: 10px 20px
Radius: radius-md
Shadow: none
Hover: darken background slightly
```

Usage: Cancel, Back, View All — secondary actions.

### Ghost

```
Background: transparent
Text: text-secondary (#57534e)
Font: 14px / Inter 500
Padding: 8px 16px
Radius: radius-md
Hover: surface-secondary background
```

Usage: Edit, Remove, inline actions.

### Accent Ghost

```
Background: transparent
Text: accent (#6366f1)
Font: 14px / Inter 500
Padding: 8px 16px
Radius: radius-md
Hover: accent-subtle (#eef2ff) background
```

Usage: "View Profile", "See All Projects" — editorial links styled as buttons.

### Icon Button

```
Size: 36x36px
Background: transparent
Icon: 18px, text-secondary
Radius: radius-md
Hover: surface-secondary background
```

### Button Sizes

| Size | Padding | Font | Min Height |
|------|---------|------|------------|
| `sm` | 6px 12px | 13px | 32px |
| `md` | 10px 20px | 14px | 40px |
| `lg` | 12px 28px | 15px | 44px |

---

## Cards

### Base Card

```
Background: surface-elevated (#fff)
Radius: radius-lg (12px)
Shadow: shadow-md
Padding: 20px
Hover: shadow-lg, translateY(-2px), 200ms ease
No border.
```

### Builder Card

```
┌─────────────────────────────────────┐
│                                     │
│  BUILDER                  ── 64 ──  │  ← overline label    score (mono)
│                                     │
│  [Avatar 44px]                      │
│  Maya Chen                          │  ← h3 (Inter 600)
│  Full-Stack Developer               │  ← body-sm, text-secondary
│                                     │
│  Building AI tools for small teams  │  ← body-sm, text-secondary, clamp 2
│                                     │
│  ┌────────┐ ┌────────┐ ┌────────┐  │
│  │ React  │ │ Python │ │ Node   │  │  ← skill tags (mono)
│  └────────┘ └────────┘ └────────┘  │
│                                     │
│  Open to collaborate · PST          │  ← caption, text-tertiary
│                                     │
└─────────────────────────────────────┘

Score badge: top-right, mono font, colored by tier
  0-30: text-tertiary
  31-55: in-progress (#d97706)
  56-75: accent (#6366f1)
  76+:   shipped (#16a34a)
Availability dot: 8px, shipped-green if available
```

### Project Card

```
┌─────────────────────────────────────┐
│  ┌───────────────────────────────┐  │
│  │                               │  │
│  │      Thumbnail (16:10)        │  │  ← radius-md, surface-secondary fallback
│  │                               │  │
│  │                    SHIPPED ●  │  │  ← status badge, bottom-right overlay
│  └───────────────────────────────┘  │
│                                     │
│  AI Resume Builder                  │  ← h2 (Instrument Serif) — editorial
│                                     │
│  One-line description that wraps    │  ← body-sm, text-secondary, clamp 2
│  to a max of two lines here...      │
│                                     │
│  ┌────────┐ ┌──────────┐ ┌──────┐  │
│  │ React  │ │ FastAPI  │ │ PG   │  │  ← skill tags
│  └────────┘ └──────────┘ └──────┘  │
│                                     │
│  [Av 24px] Maya Chen  · ⭐ 142     │  ← caption, text-tertiary
│                                     │
└─────────────────────────────────────┘

Project title uses Instrument Serif (h2) — this is the editorial moment.
Each project card should feel like a magazine feature thumbnail.
```

### Tribe Card

```
┌─────────────────────────────────────┐
│                                     │
│  OPEN TRIBE                         │  ← overline, uppercase, caption
│                                     │
│  Hospitality OS                     │  ← h2 (Instrument Serif)
│                                     │
│  Reimagining hotel operations       │  ← body-sm, text-secondary, clamp 2
│  for the AI era.                    │
│                                     │
│  ┌───────────────────────────────┐  │
│  │  Looking for:                 │  │  ← surface-secondary bg, radius-md
│  │  Backend Engineer · Designer  │  │  ← body-sm, text-primary
│  └───────────────────────────────┘  │
│                                     │
│  [Av][Av][Av] +2  · 3/5 members    │  ← avatar stack + caption
│                                     │
└─────────────────────────────────────┘
```

### Feed Event Card

```
┌──────────────────────────────────────────────────┐
│                                                  │
│  [Avatar 44px]  Maya Chen shipped a project      │  ← body, actor name is 500 weight
│                 2 hours ago                       │  ← caption, text-tertiary
│                                                  │
│     ┌──────────────────────────────────────┐     │
│     │  AI Resume Builder                   │     │  ← embedded compact project card
│     │  React · FastAPI · PostgreSQL        │     │    surface-secondary bg
│     │  ⭐ 142 · 1.2k users                │     │
│     └──────────────────────────────────────┘     │
│                                                  │
└──────────────────────────────────────────────────┘

Feed cards: surface-elevated bg, max-width 640px
Embedded cards: surface-secondary bg, smaller padding (12px)
Event types have distinct sentence patterns:
  project_created:  "[Name] started building [Project]"
  project_shipped:  "[Name] shipped [Project]"  ← strongest emphasis
  collab_confirmed: "[Name] and [Name] are collaborating on [Project]"
  tribe_created:    "[Name] formed a tribe: [Tribe Name]"
  member_joined:    "[Name] joined [Tribe Name]"
  builder_joined:   "[Name] joined Find Your Tribe"
```

---

## Tags

### Skill Tag

```
Background: surface-secondary (#f2f0ed)
Text: text-secondary (#57534e)
Font: mono 13px (JetBrains Mono)
Padding: 3px 8px
Radius: radius-sm (6px)
No shadow. No border.
Hover: slightly darker background
```

### Status Badge

```
Font: caption (11px / Inter 500)
Padding: 2px 8px
Radius: radius-full (pill)
```

| Status | Background | Text |
|--------|-----------|------|
| Shipped | shipped-subtle (#f0fdf4) | shipped (#16a34a) |
| In Progress | in-progress-subtle (#fffbeb) | in-progress (#d97706) |
| Open | accent-subtle (#eef2ff) | accent (#6366f1) |
| Active | shipped-subtle | shipped |
| Pending | in-progress-subtle | in-progress |
| Archived | surface-secondary | text-tertiary |

### Builder Score Display

**In cards** (compact):
```
Font: mono 16px (JetBrains Mono), weight 500
Color: tier-based (see builder card spec)
No background — just the number, aligned top-right
```

**On profile** (prominent):
```
Size: 64px diameter circle
Background: accent-subtle
Text: accent, mono 24px
Label below: "Builder Score" in caption, text-tertiary
```

**Score breakdown** (profile detail):
```
Horizontal bar segments showing contribution of each signal
Each bar: 4px height, radius-full, colored by signal type
Labels: caption, text-tertiary
```

---

## Form Inputs

### Text Input

```
Background: surface-elevated (#fff)
Text: text-primary
Placeholder: text-tertiary
Font: 15px / Inter 400
Padding: 10px 14px
Radius: radius-md (8px)
Shadow: shadow-sm
No border.
Focus: 2px ring accent (#6366f1), shadow-sm → shadow-md
Error: 2px ring error (#dc2626)
Disabled: opacity 0.5, surface-secondary bg
```

### Textarea

Same as input, plus:
```
Min height: 100px
Resize: vertical
```

### Select / Dropdown

```
Trigger: text input appearance + chevron-down icon (18px, text-tertiary)
Panel:
  Background: surface-elevated
  Shadow: shadow-lg
  Radius: radius-lg
  Padding: 4px
  Max height: 280px, scroll
  Animation: fade in + translateY(-4px), 150ms
Option:
  Padding: 8px 12px
  Radius: radius-sm
  Hover: surface-secondary
  Selected: accent text, accent-subtle background
  Checkmark: accent, 16px, right-aligned
```

### Checkbox

```
Size: 16px
Unchecked: surface-elevated, shadow-xs
Checked: accent, white checkmark (2px stroke)
Radius: 4px
Focus: 2px ring accent, 2px offset
```

### Form Labels

```
Font: caption (11px / Inter 500)
Color: text-secondary
Text transform: uppercase
Letter spacing: 1.5px
Margin bottom: 6px
```

This is the "overline" pattern — creates editorial structure in forms.

### Validation

```
Error text: body-sm, error (#dc2626)
Success text: body-sm, shipped (#16a34a)
Icon: 14px, matching color
Margin top: 4px
```

---

## Navigation

### Top Bar

```
┌──────────────────────────────────────────────────────────────┐
│  find your tribe     Discover    Feed    Tribes    [Av] [⌘K] │
└──────────────────────────────────────────────────────────────┘

Height: 56px
Background: surface-primary with backdrop-blur(12px) when scrolled
Position: sticky top-0, z-50
Shadow: none (top of page), shadow-xs (scrolled)

Logo: "find your tribe" — Instrument Serif, 18px, text-primary
  Lowercase, no abbreviation. The full name is the brand.

Nav links: body (15px / Inter 500), text-secondary
Active: text-primary, 2px accent underline (offset 6px below)
Hover: text-primary

Avatar: 32px, clickable → user menu
Search trigger: ⌘K icon button or "Search" text
```

### Mobile Nav

```
Trigger: hamburger icon button (top-right)
Panel: full-screen overlay
  Background: surface-elevated
  Animation: fade in, 200ms
  Close: X button top-right

Links: h2 size (Instrument Serif), stacked, 20px gap
  Active: accent color
  Touch target: full width, 56px height
```

### User Menu (Dropdown)

```
Trigger: avatar click
Panel:
  Background: surface-elevated
  Shadow: shadow-lg
  Radius: radius-lg
  Width: 240px
  Padding: 6px

Sections:
  1. Profile summary: avatar 40px + name (h4) + handle (caption, text-tertiary)
  2. Separator: 1px surface-secondary, 6px vertical margin
  3. Links: My Profile, My Projects, My Tribes, Settings
  4. Separator
  5. Sign Out (text-secondary, not red — it's not destructive, it's routine)

Item: padding 8px 12px, radius-sm, hover surface-secondary
Icon: 16px, text-tertiary, left of label
```

### Breadcrumbs

```
Font: caption (11px / Inter 500), uppercase, letter-spacing 1.5px
Separator: / (text-tertiary)
Links: text-tertiary, hover accent
Current: text-secondary
```

Uses the overline treatment — small, uppercase, structural.

---

## Modal / Dialog

```
Overlay: surface-inverse at 50% opacity
Panel:
  Background: surface-elevated
  Shadow: shadow-xl
  Radius: radius-xl (16px)
  Width: 480px (sm) / 600px (md) / 720px (lg)
  Padding: 32px
  Animation: fade in + scale from 0.97, 200ms ease-out
  Mobile: full-screen sheet, radius top only

Header:
  Overline: "CREATE TRIBE" / "INVITE COLLABORATOR" (caption, uppercase)
  Title: h1 (Instrument Serif)
  Close: icon button, top-right
  Spacing: 24px below header

Footer:
  Padding top: 24px
  Buttons: right-aligned, 12px gap
```

---

## Toast

```
Position: bottom-center (mobile), bottom-right (desktop)
Background: surface-inverse (#1c1917)
Text: text-inverse (#fafaf9)
Font: body-sm (13px)
Padding: 12px 16px
Radius: radius-md
Shadow: shadow-lg
Max width: 400px
Animation: slide up 8px + fade in, 200ms

Icon: 16px, left
  Success: shipped color
  Error: error color
  Info: accent-muted

Auto-dismiss: 4 seconds
Action link: accent-muted, right side
```

Dark toast on light UI — creates clear contrast and urgency.

---

## Tabs

```
Container: no border (editorial — borders are avoided)

Tab:
  Font: body (15px / Inter 500)
  Color: text-tertiary (inactive), text-primary (active)
  Padding: 10px 0
  Gap: 28px between tabs
  Active indicator: 2px accent, bottom, full tab width
  Transition: color 150ms
  Hover: text-secondary
```

### Tab Variants

**Page tabs** (Discovery: Builders | Projects | Tribes):
Standard tabs as above, below page header.

**Filter tabs** (Feed: All | Projects | Tribes | Builders):
Pill variant — active tab gets `accent-subtle` background + `accent` text. No underline.

---

## Pagination

### Infinite Scroll (Feed)

```
Trigger: IntersectionObserver, 300px from bottom
Loading: 3 skeleton cards
End: "You've reached the end" — body-sm, text-tertiary, centered, 40px padding
```

### Offset (Discovery)

```
Layout: [ ← ]  Page 3 of 12  [ → ]
Buttons: ghost style, 36x36
Text: caption, text-secondary
Position: centered below results, 32px margin top
```

---

## Loading States

### Skeleton

```
Background: surface-secondary
Shimmer: linear gradient sweep
  From: surface-secondary
  Through: surface-primary (lighter)
  Duration: 1.5s, infinite
Radius: matches content shape
```

Match actual content layout exactly — skeleton builder card should have same dimensions as real builder card.

### Spinner

```
Size: 20px (inline) / 32px (page)
Color: accent
Style: rotating arc, 2px stroke, 270deg
Duration: 750ms
```

### Empty State

```
Container: centered, max-width 320px, 64px padding top

Illustration: none (too playful). Instead, large Lucide icon (48px, text-tertiary)
Heading: h3, text-primary
Subtext: body-sm, text-secondary, centered
CTA: primary button (if actionable)
Spacing: 12px between elements
```

---

## Tooltip

```
Background: surface-inverse (#1c1917)
Text: text-inverse, body-sm (13px)
Padding: 6px 10px
Radius: radius-sm (6px)
Shadow: shadow-md
Max width: 220px
Delay: 400ms appear
Animation: fade in, 100ms
Arrow: 5px, matching bg
```

---

## Command Palette (Search + AI)

```
Trigger: ⌘K (desktop), search icon (mobile)

Overlay: surface-inverse at 30% opacity
Panel:
  Background: surface-elevated
  Shadow: shadow-xl
  Radius: radius-xl (16px)
  Width: 540px
  Max height: 440px
  Position: centered, top third of viewport (desktop)
  Mobile: full-screen sheet

Input:
  Font: body-lg (18px / Inter 400)
  Padding: 16px 20px
  Placeholder: "Search builders, projects, tribes..."
  Left: Search icon (20px, text-tertiary)
  Right: AI toggle pill
    Off: surface-secondary bg, text-tertiary, "AI"
    On: accent bg, white text, "AI"

AI mode:
  Placeholder changes: "Describe who you're looking for..."
  Subtle accent-subtle background tint on input area

Results:
  Section label: "BUILDERS" / "PROJECTS" / "TRIBES" (caption, overline style)
  Item: 12px padding, radius-md
  Hover: surface-secondary
  Keyboard: highlighted with surface-secondary + 2px accent left border
  No results: "No matches found" (body-sm, text-tertiary, centered)

Footer:
  Keyboard hints: ↑↓ navigate · ↵ select · esc close
  Font: caption, text-tertiary
```

---

## Avatar Stack

```
Overlap: -8px margin-left (after first)
Border: 2px surface-elevated (creates separation)
Max shown: 4 + overflow
Overflow: surface-secondary circle with "+N" (caption, text-secondary)
```

---

## Responsive Summary

| Component | Mobile (<768px) | Desktop (>=1024px) |
|-----------|-----------------|---------------------|
| Nav | Hamburger + full-screen menu | Horizontal links |
| Card grid | 1 column | 3 columns |
| Filters | Bottom sheet | Sticky sidebar 260px |
| Profile | Stacked, avatar centered | Sidebar + main |
| Modal | Full-screen sheet | Centered floating |
| Feed | Full width, 16px padding | Max 640px centered |
| Cmd palette | Full-screen sheet | 540px centered |
| Tabs | Horizontal scroll if needed | Static |

---

## Profile-Specific Components (V1)

### Shipping Timeline

```
Container: surface-elevated, rounded-xl, p-6, shadow-sm
Height: 48px content area

Axis: 1px horizontal line, ink-tertiary/20, centered vertically
Dots:
  Shipped: 12px circle, bg-accent, filled
  In-progress: 12px circle, transparent bg, 2px ring in-progress
  Position: left % = (projectDate - earliest) / range
Hover: scale 1.5x, tooltip above with project title
  Tooltip: 11px, bg-surface-inverse, text-ink-inverse, rounded

Date labels: 10px mono, ink-tertiary, left = earliest date, right = latest date
```

### Agent Workflow Card ("How They Build")

```
Container: sidebar section, no card wrapper (follows sidebar section pattern)
Overline: "HOW THEY BUILD" (11px mono, uppercase, tracking)

Workflow label:
  Text: 12px, ink-secondary
  Background: accent-subtle, px-2.5, py-1, rounded-md
  Values: "Pair builder" | "Swarm builder" | "Review-first" | "Autonomous" | "Minimal AI"
  Derived from agent_workflow_style enum

Tool tags:
  Same style as skill tags but accent-subtle bg instead of surface-secondary
  Font: mono 12px
  Wrapped row, gap-1.5
  Show all tools (no max — typically 2-5)

Human/AI ratio bar:
  Container: flex, items-center, gap-2, mt-3
  Bar: flex-1, h-1.5, rounded-full, overflow-hidden
    Human segment: bg-ink-tertiary/30, width = (1 - ratio) * 100%
    AI segment: bg-accent, width = ratio * 100%
  Label: 11px, ink-tertiary — "60% human · 40% AI"

If agent_workflow_style is null: entire section hidden.
If agent_tools is empty but style is set: show style label, hide tools row.
```

### Burn Map (Building Activity)

```
Container: surface-elevated, rounded-xl, p-6, shadow-sm
Overline: "BUILDING ACTIVITY" (11px mono, uppercase, tracking)

Dot grid:
  Layout: 52 columns × 7 rows, CSS grid
  Cell size: 10px × 10px, gap 2px
  Dot shape: rounded-sm (2px radius)
  Colors by activity level:
    0 events: surface-secondary
    1-2 events: accent-subtle (#eef2ff)
    3-5 events: accent-muted (#a5b4fc)
    6+ events: accent (#6366f1)
  Tooltip on hover: "3 events · Week of Jan 6" (same tooltip style as ShippingTimeline)

Month labels: 10px mono, ink-tertiary, above grid, spaced at month boundaries
Day labels: optional, 10px mono, ink-tertiary, left of grid (Mon/Wed/Fri)

Summary: below grid, mt-3
  Text: 12px, ink-tertiary
  Format: "N active weeks · M total events this year"

Empty state: "No recent activity" — 12px, ink-tertiary, centered in container
```

### Collaborator Network ("Built With")

```
Overline: "BUILT WITH" (11px mono, uppercase, tracking)
Avatar row: overlapping circles, -8px margin, 36px each
  Ring: 2px ring-surface for separation
  Hover: scale 1.1x, z-10
Name list: 13px, ink-secondary, comma-separated, accent on hover
```

### Aggregate Impact Row

```
Layout: flex, items-baseline, gap-3, flex-wrap
Each metric:
  Value: font-mono, 24px, font-medium, ink
  Label: 13px, ink-tertiary
  Separator: middot (·), ink-tertiary, mx-1
Render only non-zero metrics. Hide entirely if all zero.
```

### Preferred Stack (Sidebar)

```
Overline: "PREFERRED STACK"
Each row: flex, items-center, gap-2
  Label: 12px, ink-secondary, w-20, truncate
  Bar container: flex-1, h-1.5, bg-surface-secondary, rounded-full
  Fill: bg-accent-subtle, rounded-full, width proportional to max count
Top 5 technologies derived from all projects' techStack.
```

### Timezone Overlap (Sidebar)

```
Icon: MapPin (16px, ink-tertiary) + timezone string (13px)
Below: 11px, ink-tertiary, pl-6 — "{N}hrs overlap with you" or "No work-hour overlap"
Same timezone: just show timezone, no overlap text.
```

### Role Pattern (Sidebar)

```
Label: 12px, ink-tertiary, bg-surface-secondary, px-2.5, py-1, rounded-md
Values: "Usually the founder" | "Versatile builder" | "Independent builder"
Derived from project count and collaborator presence.
```
