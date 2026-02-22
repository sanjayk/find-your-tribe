# Design: {Feature Name}

> See [{product-spec}]({product-spec}) for product context.

## Pages / Routes
<!-- Which URLs? What does the user see at each step?
     Map each route to a user flow from the PRD. If a user flow has no route,
     something is missing. If a route has no user flow, it shouldn't exist. -->

## Component Inventory
<!-- New and modified components. The "Parent" column shows nesting —
     this is the information a developer needs to generate file structure. -->
| Component | Type | Parent | Props | Notes |
|-----------|------|--------|-------|-------|
| | new / modified | where it nests | | |

## Component Composition
<!-- How components nest. Tree structure showing containment.
     e.g., ProfileCard → Avatar + NameBlock + StatRow
     This bridges the gap between "list of components" and "how they fit together."
     Without this, the developer guesses at hierarchy. -->

## States
<!-- Every component must account for ALL states. The most common design spec
     failure is only showing the happy path. If you only design for "user has
     avatar, full name, 3 projects, and a bio," the developer will improvise
     the empty states. That improvisation will be wrong.
     Read by: Developer (implementation), Audit Agent (completeness) -->

### Empty State
<!-- What the user sees with no data. Must look intentional, not broken.
     Include fallback chain: e.g., no avatar → show initials → no initials →
     show generic icon. Design for sparse data as the COMMON case. -->

### Loading State
<!-- Skeleton, spinner, or progressive reveal?
     Which parts of the page load first? Does the skeleton show the layout
     shape or just a generic spinner? Specify the sequence. -->

### Populated State
<!-- Primary view with typical data. This is what most specs show.
     Include realistic data, not "Lorem ipsum" — real names, real numbers,
     real content lengths. -->

### Error State
<!-- What happens when things fail. Error messages, retry affordances,
     partial failure (some data loaded, some didn't).
     Don't just show a red banner — show what the user can DO about it. -->

## Data Binding
<!-- What dynamic data populates each element?
     e.g., "Name field displays user.displayName. Bio truncates at 280 chars
     with ellipsis. Member count shows tribe.members.length."
     This bridges design and implementation — don't leave it to the developer
     to guess which API field maps to which UI element. -->

## Interactions
<!-- User actions → system responses. For each interaction:
     - What triggers it (click, hover, scroll, keypress)
     - What happens visually (transition, animation, state change)
     - Duration and easing (e.g., "fade in 200ms ease-out")
     Only specify animations that matter. Don't over-specify micro-interactions
     at the expense of core state handling. -->

## Responsive Behavior
<!-- Specific layout changes at each breakpoint. Not "it stacks on mobile" —
     which components reorder? Which hide? Which change from horizontal
     to vertical? What's the minimum viable mobile experience? -->

## Accessibility
<!-- Keyboard navigation: tab order, focus indicators, keyboard shortcuts.
     ARIA: roles, labels, live regions for dynamic content.
     Screen reader: what's announced, in what order?
     Contrast: any elements near the 4.5:1 threshold?
     If this section is empty, the implementation won't be accessible. -->

## Design Tokens
<!-- Reference globals.css token names, not raw values.
     Good: "Card background: surface-elevated, text: ink-DEFAULT"
     Bad: "Background: #ffffff, text: #1c1917"
     No inventing new values. If the token doesn't exist, discuss adding
     it to the design system — don't hardcode a hex value. -->

## Figma Reference
<!-- Link to Figma file/frame, or FigmaMCP reference.
     Figma is the source of truth for visual design. This spec is the
     source of truth for states, data binding, and interactions.
     The two should agree. -->
