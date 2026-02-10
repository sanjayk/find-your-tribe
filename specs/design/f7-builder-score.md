# F7: Builder Score — Page Design

> See [design-system.md](./design-system.md) and [components.md](./components.md) for tokens.

---

## Score Display Contexts

Builder Score appears in multiple places across the platform. Each context has a different size and emphasis level.

### 1. Builder Card (Discovery, Feed)

```
Position: top-right corner of card
Font: mono 16px (JetBrains Mono), weight 500
No background — just the number
Color by tier:
  0-30:  text-tertiary (#a8a29e) — new builder, don't highlight
  31-55: in-progress (#d97706) — growing, warm amber
  56-75: accent (#6366f1) — established, indigo
  76+:   shipped (#16a34a) — top builder, green
```

### 2. Profile Header

```
Position: below name/handle in sidebar
Layout:
  ┌────────────────────────┐
  │                        │
  │  ┌──────────────────┐  │
  │  │                  │  │
  │  │       64         │  │  ← mono 28px, tier-colored
  │  │                  │  │     inside 64px circle
  │  └──────────────────┘  │     accent-subtle bg
  │                        │
  │    Builder Score       │  ← caption, text-tertiary
  │    [ How it works → ]  │  ← caption, accent, link
  │                        │
  └────────────────────────┘

Circle: 64px diameter
Background: tier-subtle (accent-subtle for 56-75, shipped-subtle for 76+, etc.)
Clickable → opens score breakdown popover
```

### 3. Nav Bar / Compact

```
On user's own avatar in nav:
  Small badge overlaying avatar, bottom-right
  Size: 20px diameter
  Background: tier color (solid)
  Text: white, mono 10px
  Only shown if score > 0
```

---

## Score Breakdown Popover

Triggered by clicking the score on a profile page.

```
Popover:
  Background: surface-elevated
  Shadow: shadow-lg
  Radius: radius-lg
  Width: 320px
  Padding: 24px
  Arrow pointing to score circle

Content:
┌──────────────────────────────────────┐
│                                      │
│  BUILDER SCORE                       │ ← overline
│                                      │
│  64                                  │ ← mono 40px, tier-colored
│  out of 100                          │ ← caption, text-tertiary
│                                      │
│  ──────────────────────────────────  │
│                                      │
│  Shipped Projects           18/30    │ ← each signal row
│  ████████████░░░░░░░░░░░░░░░░░░░░   │ ← progress bar
│                                      │
│  Collaborator Vouches       12/25    │
│  █████████░░░░░░░░░░░░░░░░░░░░░░░   │
│                                      │
│  Project Impact             14/20    │
│  ████████████████░░░░░░░░░░░░░░░░   │
│                                      │
│  Profile Completeness       12/15    │
│  ██████████████████████░░░░░░░░░░   │
│                                      │
│  Account Age                 8/10    │
│  ████████████████████████░░░░░░░░   │
│                                      │
│  ──────────────────────────────────  │
│                                      │
│  How Builder Score works →           │ ← accent, links to /about/builder-score
│                                      │
└──────────────────────────────────────┘

Signal row:
  Label: body-sm, text-primary
  Value: body-sm, text-secondary, right-aligned ("18/30")
  Progress bar below:
    Track: surface-secondary, 4px height, radius-full
    Fill: accent, width = (value / max) × 100%
    Animation: fill from 0 to actual width, 400ms ease-out, staggered 100ms per bar

Gap between signal rows: 16px
```

---

## About Builder Score Page (`/about/builder-score`)

Public page explaining how the score works. Editorial layout — this is a trust-building page.

```
┌──────────────────────────────────────────────────────────────────┐
│  nav bar                                                         │
├──────────────────────────────────────────────────────────────────┤
│                                                                  │
│              HOW IT WORKS                               ← overline
│                                                                  │
│              Builder Score                              ← display (Instrument Serif, 56px)
│                                                                  │
│              Your reputation, earned through            ← body-lg, text-secondary
│              building. Not posting, not networking      │   max-width 680px, centered
│              — shipping.                                │
│                                                                  │
│  ─────────────────────────────────────────────────────────────   │
│                                                                  │
│  THE FIVE SIGNALS                                       ← h2 (Instrument Serif)
│                                                                  │
│  Your Builder Score is calculated from five                      │
│  objective, hard-to-fake signals:                       ← body-lg
│                                                                  │
│  ┌────────────────────────────────────────────────────────────┐  │
│  │                                                            │  │
│  │  01                                                        │  │ ← h1, text-tertiary (large, faded)
│  │  Shipped Projects                         30 points max    │  │ ← h3 + caption
│  │                                                            │  │
│  │  Projects you've built and marked as shipped.              │  │ ← body, text-secondary
│  │  Diminishing returns: your first few projects              │  │
│  │  count the most.                                           │  │
│  │                                                            │  │
│  │  ┌──────────────────────────────────────────────────────┐  │  │
│  │  │  Curve visualization                                 │  │  │ ← simple SVG chart
│  │  │  X: projects (1-10)                                  │  │  │    showing log curve
│  │  │  Y: points (0-30)                                    │  │  │    text-tertiary axes
│  │  │  Line: accent color                                  │  │  │    accent line
│  │  └──────────────────────────────────────────────────────┘  │  │
│  │                                                            │  │
│  └────────────────────────────────────────────────────────────┘  │
│                                                                  │
│  ... repeat for signals 02-05 ...                                │
│                                                                  │
│  ─────────────────────────────────────────────────────────────   │
│                                                                  │
│  WHY THIS APPROACH                                      ← h2
│                                                                  │
│  • Logarithmic scaling prevents gaming through bulk.             │
│  • Mutual verification means collaborator vouches are real.      │
│  • No points for logging in, posting, or browsing.               │
│  • Your score reflects what you've built, not how active         │
│    you appear.                                                   │
│                                                                  │
│  ─────────────────────────────────────────────────────────────   │
│                                                                  │
│  SCORE EXAMPLES                                         ← h2
│                                                                  │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐             │
│  │    ~15      │  │    ~40      │  │    ~65      │             │
│  │   New       │  │   Active    │  │ Experienced │             │
│  │  builder    │  │  builder    │  │  builder    │             │
│  │             │  │             │  │             │             │
│  │ Completed   │  │ 2 shipped   │  │ 5 projects  │             │
│  │ profile,    │  │ projects,   │  │ 3 collabs,  │             │
│  │ 0 projects  │  │ 1 collab    │  │ real impact │             │
│  └─────────────┘  └─────────────┘  └─────────────┘             │
│                                                                  │
│              [ Start Building → ]                       ← primary button, centered
│                                                                  │
└──────────────────────────────────────────────────────────────────┘

Layout: editorial column (680px max-width), centered
Signal cards: surface-elevated, radius-lg, shadow-md, 32px padding
  Number: h1 (Instrument Serif), text-tertiary — large, faded (editorial numbering)
  Title: h3 (Inter 600), text-primary + max points (caption, text-tertiary, right)
  Description: body, text-secondary
  Chart: simple SVG, 200px height, showing the diminishing returns curve
  Gap between signal cards: 24px

Example score cards: surface-elevated, radius-lg, shadow-md, 24px padding
  Score number: mono 32px, tier-colored
  Label: h4, text-primary
  Description: body-sm, text-secondary
  3-column grid (desktop), stacked (mobile)
```

---

## Score Change Notification

When a user's score changes (after project shipped, collab confirmed, etc.):

```
Toast:
  "Your Builder Score went up! 58 → 64"
  Icon: TrendingUp (16px, shipped green)
  Background: surface-inverse
  Text: text-inverse

Profile page:
  Score circle briefly pulses (scale 1.0 → 1.1 → 1.0, 400ms)
  Only on the session where the change happened
```

---

## Score in Context

### Discovery Sort

When discovery is sorted by Builder Score:
```
Cards show score more prominently — top-right, slightly larger (mono 18px)
Sort indicator: "Sorted by Builder Score" caption below tabs
```

### Tribe Join Requests

When tribe owner reviews join requests:
```
Score shown next to applicant name:
  [Av] David Morales · 42                  ← mono, tier-colored, inline
  Growth Marketer

Helps owner assess builder credibility at a glance.
```

### Feed Events

Score not shown in feed cards (too noisy). Clicking through to profile reveals it.
