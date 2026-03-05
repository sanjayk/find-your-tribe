# Design: F11 Builder Matching

> See [specs/product/f11-builder-matching.md](../product/f11-builder-matching.md) for product context.

## Aesthetic Constraint

All new components must follow the site's **Modern Editorial Luxury** aesthetic. Do not invent new styles, colors, or spacing values.

- **Styles:** Only use tokens defined in `src/frontend/src/app/globals.css` via the `@theme` directive. No raw hex values, no ad-hoc spacing.
- **Base components:** Compose from existing primitives in `src/frontend/src/components/ui/` (Button, Card, Badge, Input, Dialog, etc.) wherever applicable. Only create new components when no existing primitive covers the need.
- **Typography:** DM Serif Display for display text, DM Sans for body/UI, IBM Plex Mono for data/numbers. Use the `font-serif`, `font-sans`, `font-mono` tokens.
- **Visual separation:** No borders. Use background tints (`surface-secondary`, `surface-elevated`), subtle shadows (`shadow-sm`), and whitespace for hierarchy.

## Pages / Routes

| Route | Feature | User Flow |
|-------|---------|-----------|
| `/profile/[username]` | "Suggested Co-Builders" section (own profile only) | Flow 1: Viewing suggestions on own profile |
| `/tribe/[id]` | "Suggested Builders" per open role (tribe owner only) | Flow 2: Viewing suggestions for tribe open roles |

No new routes. Both surfaces are additions to existing pages.

## Component Inventory

| Component | Type | Parent | Props | Notes |
|-----------|------|--------|-------|-------|
| `SuggestedBuilders` | new | ProfileContent | `suggestions: SuggestedBuilder[]` | Section wrapper with heading and card grid. Own profile only. |
| `SuggestionCard` | new | SuggestedBuilders, RoleSuggestions | `builder: BuilderSummary`, `reason: string`, `onDismiss?: () => void` | Individual match card with dismiss action. |
| `RoleSuggestions` | new | TribeOpenRoleCard | `roleId: string`, `suggestions: SuggestedBuilder[]` | Subsection under an open role on tribe page. Owner only. |

## Component Composition

```
ProfileContent (existing, own profile)
├── ... identity block, projects, etc. ...
└── SuggestedBuilders (new, after projects section)
    ├── Section heading
    ├── SuggestionCard[] (up to 3)
    │   ├── Avatar + name + headline
    │   ├── Role badge
    │   ├── Match reason line
    │   ├── Builder Score (mono)
    │   └── Dismiss button (×)
    └── Empty state (insufficient data)

TribePage (existing, owner view)
└── OpenRoles section (existing)
    └── TribeOpenRoleCard (existing)
        └── RoleSuggestions (new, below role details)
            └── SuggestionCard[] (up to 3, no dismiss)
```

## States

### SuggestedBuilders (Profile Page)

#### Loading State

The suggestions load asynchronously after the profile data. While loading, show skeleton cards matching the suggestion card shape.

```
Suggested Co-Builders
┌──────────────────────┐ ┌──────────────────────┐ ┌──────────────────────┐
│ [○]  ████████████     │ │ [○]  ████████████     │ │ [○]  ████████████     │
│      ████████         │ │      ████████         │ │      ████████         │
│                       │ │                       │ │                       │
│ ██████████████████    │ │ ██████████████████    │ │ ██████████████████    │
└──────────────────────┘ └──────────────────────┘ └──────────────────────┘
```

Three skeleton cards in a row. Avatar circle + two text lines + reason line.

#### Populated State (matches found)

```
Suggested Co-Builders

┌──────────────────────┐ ┌──────────────────────┐ ┌──────────────────────┐
│                    ×  │ │                    ×  │ │                    ×  │
│  [JO]                 │ │  [PS]                 │ │  [AK]                 │
│  James Okafor         │ │  Priya Sharma         │ │  Aisha Kone           │
│  Brand & product      │ │  Staff backend        │ │  Growth lead at       │
│  designer             │ │  engineer             │ │  Acme Labs            │
│                       │ │                       │ │                       │
│  Designer             │ │  Engineer             │ │  Growth               │
│                       │ │                       │ │                       │
│  Complements your     │ │  Complements your     │ │  Complements your     │
│  stack · UX Design,   │ │  stack · Go, gRPC     │ │  stack · SEO,         │
│  Prototyping          │ │  · IST timezone       │ │  Analytics            │
│                       │ │                       │ │                       │
│            Score  72  │ │            Score  85  │ │            Score  61  │
└──────────────────────┘ └──────────────────────┘ └──────────────────────┘
```

Three cards in a horizontal row. Each card is a self-contained unit: avatar, name, headline, role badge, match reason, and score.

#### Empty State (insufficient data)

```
┌──────────────────────────────────────────────────────────────────────┐
│                                                                      │
│  Suggested Co-Builders                                               │
│                                                                      │
│  Add skills and projects to your profile to get                      │
│  matched with co-builders.                                           │
│                                                                      │
│  Complete your profile →                                             │
│                                                                      │
└──────────────────────────────────────────────────────────────────────┘
```

Single block on `surface-secondary`. Heading in serif. Body in secondary ink. Link to `/settings` in accent.

#### Empty State (all dismissed)

```
┌──────────────────────────────────────────────────────────────────────┐
│                                                                      │
│  Suggested Co-Builders                                               │
│                                                                      │
│  Check back soon. New builders join every week.                      │
│                                                                      │
└──────────────────────────────────────────────────────────────────────┘
```

#### Not shown (other user's profile)

The section does not render when viewing another builder's profile.

### RoleSuggestions (Tribe Page)

#### Populated State

```
Open Roles

  Backend Engineer
  Go · PostgreSQL · gRPC

  Suggested builders:
  ┌────────────────────┐ ┌────────────────────┐ ┌────────────────────┐
  │ [PS] Priya Sharma  │ │ [TN] Tom Nakamura  │ │ [EV] Elena Volkov  │
  │ 3 shipped · Go,    │ │ 2 shipped · Rust,  │ │ 4 shipped · Python │
  │ PostgreSQL         │ │ PostgreSQL         │ │ PostgreSQL         │
  │          Score  85 │ │          Score  71 │ │          Score  68 │
  └────────────────────┘ └────────────────────┘ └────────────────────┘
```

Compact cards below each open role. No dismiss on tribe suggestions (the tribe owner evaluates, not filters). Match reason focuses on skill overlap and project count.

#### Empty State (no matches for role)

No section rendered. The open role displays as it does today, without a suggestions subsection. Clean absence rather than an empty message.

#### Not shown (non-owner view)

Suggestions only appear for the tribe owner. Members and visitors see the open roles without suggestions.

## Data Binding

| UI Element | Data Source | Fallback |
|---|---|---|
| Section heading | Static: "Suggested Co-Builders" | — |
| Builder avatar | Initials from `suggestion.displayName` (same deterministic color as feed) | First 2 chars of username |
| Builder name | `suggestion.displayName` | `suggestion.username` |
| Builder headline | `suggestion.headline` | Hidden if null |
| Role badge | `suggestion.primaryRole` | Hidden if null |
| Match reason | `suggestion.matchReason` (server-generated string) | Hidden if empty |
| Builder Score | `suggestion.builderScore` | Hidden if 0 |
| Dismiss action | `dismissSuggestion(builderId)` mutation | — |
| Empty state threshold | `builder.skills.length < 2` (client check from existing builder query) | — |
| Tribe role suggestions | `openRole.suggestedBuilders` (server-resolved) | Section hidden if empty array |

### Match Reason Templates

The backend generates reason strings from templates. The frontend renders them as-is.

| Signal | Template | Example |
|---|---|---|
| Complementary skills | "Complements your stack · {skills}" | "Complements your stack · UX Design, Prototyping" |
| Timezone match | "· {timezone} timezone" (appended) | "· IST timezone" |
| Shipped projects | "{n} shipped projects" | "3 shipped projects" |
| Tribe role match | "Has {skills} · {n} shipped projects" | "Has React, Node.js · 3 shipped projects" |

Reason strings are capped at 80 characters. Skill lists truncate with ellipsis after 3 skills.

## Interactions

| Trigger | Response |
|---|---|
| Click on a suggestion card | Navigate to builder's profile (`/profile/[username]`) |
| Click dismiss (×) button | Card fades out (200ms opacity transition). `dismissSuggestion` mutation fires. Remaining cards reflow. |
| Hover on suggestion card | Subtle `surface-secondary/50` tint, 150ms ease (same as feed cards) |
| Hover on dismiss button | Button opacity goes from 0.4 to 1.0, 150ms ease |
| Click "Complete your profile" link | Navigate to `/settings` |

## Responsive Behavior

### SuggestedBuilders (Profile Page)

- **Desktop (>= 1024px):** Three cards in a horizontal row, `gap-4`, each card `flex-1`. Section has `py-8`.
- **Tablet (768px - 1023px):** Two cards visible, third card accessible via horizontal scroll. `gap-4`.
- **Mobile (< 768px):** Single card per row, stacked vertically. `gap-3`. `py-6`.

### RoleSuggestions (Tribe Page)

- **Desktop (>= 768px):** Three compact cards in a row, `gap-3`.
- **Mobile (< 768px):** Horizontal scroll with snap points. Cards are `min-w-[200px]`.

## Accessibility

- Each `SuggestionCard` is an `<article>` element with `aria-label="{name}, suggested co-builder"`
- The card is wrapped in a `<Link>` for keyboard navigation via Tab
- Dismiss button: `<button aria-label="Dismiss suggestion for {name}">` positioned inside the card but outside the link wrapper (not nested interactive elements)
- Dismiss button: `role="button"`, keyboard-accessible, focus-visible ring
- Match reason line uses `aria-description` on the card link for screen readers
- Skeleton loading state uses `aria-hidden="true"` with an `aria-live="polite"` region that announces "Loading suggestions" → "3 co-builder suggestions loaded"
- Empty state: the "Complete your profile" link is a standard `<Link>`, keyboard-navigable

## Design Tokens

### Section

| Element | Token |
|---|---|
| Section heading | `font-serif`, `text-[18px]`, `text-ink`, `font-medium` |
| Section spacing | `py-8` (desktop), `py-6` (mobile) |
| Card grid gap | `gap-4` (desktop/tablet), `gap-3` (mobile) |

### SuggestionCard

| Element | Token |
|---|---|
| Card background | `surface-elevated` |
| Card shadow | `shadow-sm` |
| Card radius | `rounded-xl` |
| Card padding | `p-5` |
| Avatar circle | `w-10 h-10 rounded-full`, deterministic bg from palette (same as feed avatar palette) |
| Avatar text | `text-[13px]`, `font-medium` |
| Builder name | `text-ink`, `text-[15px]`, `font-medium` |
| Headline | `text-ink-secondary`, `text-[13px]`, line-clamp-2 |
| Role badge | `surface-secondary`, `rounded-full`, `px-2 py-0.5`, `text-[11px]`, `text-ink-secondary`, `font-medium` |
| Match reason | `text-ink-tertiary`, `text-[12px]`, `font-sans` |
| Builder Score label | `text-ink-tertiary`, `text-[11px]` |
| Builder Score value | `font-mono`, `text-[13px]`, `text-ink`, `font-medium` |
| Dismiss button | `absolute top-3 right-3`, `text-ink-tertiary`, `opacity-40`, hover: `opacity-100`, `transition-opacity duration-150` |

### RoleSuggestions (compact variant)

| Element | Token |
|---|---|
| Card background | `surface-secondary` |
| Card radius | `rounded-lg` |
| Card padding | `p-3` |
| Builder name | `text-ink`, `text-[13px]`, `font-medium` |
| Match reason | `text-ink-tertiary`, `text-[11px]` |
| Score | `font-mono`, `text-[11px]`, `text-ink-secondary` |
| Subsection label | `text-ink-tertiary`, `text-[11px]`, `uppercase`, `tracking-wide`, `mb-2` |

### Avatar color palette

Same deterministic hash-based palette as F10 Rich Feed:

| Index | Background | Text |
|---|---|---|
| 0 | `bg-accent-subtle` | `text-accent` |
| 1 | `bg-shipped-subtle` | `text-shipped` |
| 2 | `bg-in-progress-subtle` | `text-in-progress` |
| 3 | `bg-surface-inverse` | `text-ink-inverse` |
| 4 | `bg-accent-muted/30` | `text-accent` |
| 5 | `bg-surface-secondary` | `text-ink-secondary` |

All other tokens reference existing values in `globals.css`. No new design system tokens introduced.

## Figma Reference

No Figma file exists for this feature. The design spec above is the source of truth.
