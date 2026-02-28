# Design: Profile Completeness

> See [specs/product/f9-profile-completeness.md](../product/f9-profile-completeness.md) for product context.

## Aesthetic Constraint

All new components must follow the site's **Modern Editorial Luxury** aesthetic. Do not invent new styles, colors, or spacing values.

- **Styles:** Only use tokens defined in `src/frontend/src/app/globals.css` via the `@theme` directive. No raw hex values, no ad-hoc spacing.
- **Base components:** Compose from existing primitives in `src/frontend/src/components/ui/` (Button, Card, Badge, Input, Dialog, etc.) wherever applicable. Only create new components when no existing primitive covers the need.
- **Typography:** DM Serif Display for display text, DM Sans for body/UI, IBM Plex Mono for data/numbers. Use the `font-serif`, `font-sans`, `font-mono` tokens.
- **Visual separation:** No borders. Use background tints (`surface-secondary`, `surface-elevated`), subtle shadows (`shadow-sm`), and whitespace for hierarchy.

## Pages / Routes

| Route | Feature | User Flow |
|-------|---------|-----------|
| `/settings` | Completeness section at top of page (ring + missing fields checklist) | Flow 1: Discovering and acting on completeness |
| `/profile/[username]` | Inline nudge badge below identity block (own profile only) | Flow 2: Nudge on own profile page |

No new routes. Both surfaces are additions to existing pages.

## Component Inventory

| Component | Type | Parent | Props | Notes |
|-----------|------|--------|-------|-------|
| `CompletenessRing` | new | Settings page, Profile page | `percentage: number`, `size: 'sm' \| 'lg'` | Circular SVG progress ring. `lg` for settings, `sm` for profile nudge. |
| `CompletenessSection` | new | Settings page | `completeness: number`, `missingFields: string[]` | Ring + missing-fields checklist. Top of settings. |
| `CompletenessNudge` | new | ProfileContent | `completeness: number` | Inline badge on own profile. Links to /settings. |

## Component Composition

```
Settings page (existing)
└── CompletenessSection (new, inserted before form sections)
    ├── CompletenessRing (size="lg")
    └── MissingFieldsList (inline — not a separate component)
        └── Field links (scroll-to anchors)

ProfileContent (existing)
└── Identity block (existing)
    └── CompletenessNudge (new, below availability badge, own profile only)
        └── CompletenessRing (size="sm")
```

## States

### CompletenessSection (Settings Page)

#### Empty State (0%)

No fields filled. Unusual in practice (display name is required at signup) but must handle gracefully.

```
┌──────────────────────────────────────────────────────────────┐
│                                                              │
│   ┌─────┐                                                    │
│   │     │                                                    │
│   │  0% │   Profile Completeness                             │
│   │     │                                                    │
│   └─────┘   Complete your profile so other builders          │
│             can find and evaluate you.                        │
│                                                              │
│             ○  Add an avatar                                 │
│             ○  Add a headline                                │
│             ○  Add a bio                                     │
│             ○  Set your role                                 │
│             ○  Set your timezone                             │
│             ○  Add contact links                             │
│                                                              │
└──────────────────────────────────────────────────────────────┘
```

#### Loading State

The completeness data comes from the same `GET_BUILDER` query the settings page already uses. No separate loading state needed. The completeness section renders when the builder data arrives. While loading, the settings page shows its existing skeleton, and the completeness section is absent (appears with the rest of the data).

#### Populated State (partial, e.g. 67%)

```
┌──────────────────────────────────────────────────────────────┐
│                                                              │
│   ┌─────┐                                                    │
│   │     │                                                    │
│   │ 67% │   Profile Completeness                             │
│   │     │                                                    │
│   └─────┘   2 fields remaining                               │
│                                                              │
│             ○  Add a bio                                     │
│             ○  Set your timezone                             │
│                                                              │
└──────────────────────────────────────────────────────────────┘

Ring is 2/3 filled. Stroke color: accent (indigo).
Missing fields listed with hollow circle bullets.
Each field name is a clickable link that scrolls to and focuses the input.
```

#### Populated State (100% complete)

```
┌──────────────────────────────────────────────────────────────┐
│                                                              │
│   ┌─────┐                                                    │
│   │     │                                                    │
│   │ ✓   │   Profile Complete                                 │
│   │     │                                                    │
│   └─────┘   All fields filled. Your profile is ready         │
│             for discovery.                                    │
│                                                              │
└──────────────────────────────────────────────────────────────┘

Ring fully filled. Stroke color: shipped (green).
Checkmark replaces percentage.
No missing-fields list.
Copy changes to "Profile Complete."
```

#### Error State

Completeness data comes from the builder query. If that query fails, the entire settings page shows its existing error state. No separate error state for completeness.

### CompletenessNudge (Profile Page)

#### Incomplete (< 100%)

```
   ... availability badge ...

   ┌──────────────────────────────────┐
   │  [○67%]  67% complete · Finish → │
   │          profile                  │
   └──────────────────────────────────┘
```

A single-line inline badge. Small ring (16px) showing percentage. Text links to `/settings`. Sits below the availability badge in the identity column.

#### Complete (100%)

Not rendered. The badge disappears entirely. No "congrats" state on the profile page.

#### Other user's profile

Not rendered. Only the authenticated user sees this on their own profile.

## Data Binding

| UI Element | Data Source | Notes |
|------------|-------------|-------|
| Ring percentage | `builder.profileCompleteness` | Multiply by 100 for display. `0.67` renders as `67%`. |
| Ring fill amount | `builder.profileCompleteness` | SVG `stroke-dashoffset` calculated from percentage. |
| Missing fields list | `builder.missingProfileFields` | Array of strings: `["bio", "timezone"]`. |
| Field labels | Frontend mapping from field key to display label | `bio` → "Add a bio", `timezone` → "Set your timezone", etc. |
| Scroll targets | Frontend mapping from field key to DOM id | `bio` → `#field-bio`, `timezone` → `#field-timezone`, etc. |
| "N fields remaining" | `builder.missingProfileFields.length` | Derived client-side from the array length. |
| 100% check icon | `builder.profileCompleteness === 1.0` | Swap percentage text for a checkmark. |

### Field Label Mapping

| API field key | Display label | Scroll target id |
|---|---|---|
| `avatar` | Add an avatar | `field-avatar` |
| `headline` | Add a headline | `field-headline` |
| `bio` | Add a bio | `field-bio` |
| `role` | Set your role | `field-role` |
| `timezone` | Set your timezone | `field-timezone` |
| `contact_links` | Add contact links | `field-contact-links` |

The settings page form inputs must have these `id` attributes for scroll-to-field to work. Add `id` props to existing inputs as needed.

## Interactions

| Trigger | Action | Detail |
|---------|--------|--------|
| Click missing field link | Smooth scroll to input + focus | `element.scrollIntoView({ behavior: 'smooth', block: 'center' })` then `element.focus()` after 300ms delay (wait for scroll). |
| Save profile (existing) | Refetch builder query | The existing `updateProfile` mutation's `onCompleted` handler should refetch `GET_BUILDER`, which updates `profileCompleteness` and `missingProfileFields`. Ring animates to new value. |
| Ring percentage change | Animate ring fill | CSS transition on `stroke-dashoffset`, 400ms ease-out. Percentage text updates immediately (no counter animation). |
| Click "Finish profile" nudge on profile | Navigate to /settings | Standard `<Link>` navigation. |

## Responsive Behavior

### CompletenessSection (Settings)

- **Desktop (>= 768px):** Ring (64px) left, text and checklist right. Horizontal layout.
- **Mobile (< 768px):** Ring (48px) centered above text. Checklist below. Vertical stack.

### CompletenessNudge (Profile)

- **All breakpoints:** Single-line inline badge. No layout change. The ring scales to 16px at all sizes.

## Accessibility

- **Ring:** `role="progressbar"`, `aria-valuenow={percentage}`, `aria-valuemin="0"`, `aria-valuemax="100"`, `aria-label="Profile completeness"`.
- **Missing field links:** Standard anchor elements with descriptive text. Focus-visible ring on keyboard navigation.
- **100% checkmark:** `aria-label="Profile complete"` on the checkmark icon.
- **Color contrast:** accent (indigo) on surface-elevated (white) passes WCAG AA at 4.5:1. shipped (green) on surface-elevated passes AA.
- **Screen reader:** "Profile completeness: 67%. 2 fields remaining. Add a bio. Set your timezone." Natural reading order.

## Design Tokens

| Element | Token | Value |
|---------|-------|-------|
| Section background | `surface-elevated` | #ffffff |
| Section shadow | `shadow-sm` | subtle elevation |
| Section radius | `rounded-xl` | 12px |
| Section padding | `p-6` | 24px |
| Ring track (unfilled) | `surface-secondary` | #f2f0ed |
| Ring stroke (incomplete) | `accent` | #6366f1 |
| Ring stroke (complete) | `shipped` | #16a34a |
| Percentage text | `font-mono`, `text-accent` | IBM Plex Mono, indigo |
| Checkmark (100%) | `text-shipped` | #16a34a |
| Title text | `font-sans`, `text-ink`, `font-medium` | DM Sans 500, #1c1917 |
| Subtitle text | `text-ink-tertiary`, `text-[13px]` | #a8a29e |
| Missing field text | `text-accent`, `text-[13px]`, `font-medium` | Indigo, clickable |
| Hollow bullet | `text-ink-tertiary` | #a8a29e |
| Nudge badge bg | `surface-secondary` | #f2f0ed |
| Nudge badge text | `text-ink-secondary`, `text-[12px]` | #57534e |
| Nudge link text | `text-accent`, `text-[12px]`, `font-medium` | Indigo |

No new tokens. All values from existing design system in `globals.css`.

## Figma Reference

No Figma file exists for this feature. The design spec above is the source of truth.
