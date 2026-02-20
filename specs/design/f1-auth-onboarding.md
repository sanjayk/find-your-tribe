# F1: Auth & Onboarding — Page Design

> See [design-system.md](./design-system.md) and [components.md](./components.md) for tokens.

---

## Landing Page (`/`)

The first impression. Editorial confidence — big type, clear value proposition, proof through real builder activity.

### Hero Section

```
Background: surface-primary
Padding: 96px top, 80px bottom (desktop) / 64px top, 48px bottom (mobile)

Layout:
┌──────────────────────────────────────────────────────────────────┐
│                                                                  │
│              FIND YOUR TRIBE                                     │  ← overline, caption
│                                                                  │
│              Where builders                                      │  ← display (Instrument Serif)
│              find their people                                   │
│                                                                  │
│              Clout through building, not posting.                 │  ← body-lg, text-secondary
│              Ship projects. Form tribes. Earn your score.        │
│                                                                  │
│              [ ◆ Continue with GitHub ]                           │  ← primary button, lg size
│              [ ● Continue with Google ]                           │  ← secondary button, lg size
│                                                                  │
└──────────────────────────────────────────────────────────────────┘

Hero text: centered on mobile, left-aligned on desktop
Max width of text block: 560px
The headline uses Instrument Serif at display size — this is the biggest type on the entire platform.
Buttons: stacked vertically, 12px gap, same width (280px), centered below hero text.
GitHub button is primary (accent bg). Google button is secondary (surface-elevated, shadow-xs).
```

### Social Proof Section

```
Background: surface-secondary (sunken)
Padding: 64px vertical

┌──────────────────────────────────────────────────────────────────┐
│                                                                  │
│  HOW IT WORKS                                          ← overline│
│                                                                  │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐           │
│  │              │  │              │  │              │           │
│  │  01          │  │  02          │  │  03          │           │
│  │  Ship        │  │  Form        │  │  Earn        │           │
│  │              │  │              │  │              │           │
│  │  Add your    │  │  Find co-    │  │  Your Builder│           │
│  │  shipped     │  │  builders    │  │  Score grows │           │
│  │  projects    │  │  and form    │  │  as you ship │           │
│  │              │  │  tribes      │  │  and collab  │           │
│  └──────────────┘  └──────────────┘  └──────────────┘           │
│                                                                  │
└──────────────────────────────────────────────────────────────────┘

Step number: h1 size (Instrument Serif), text-tertiary — large, faded, editorial
Step title: h3 (Inter 600), text-primary
Step description: body-sm, text-secondary
Cards: surface-elevated, shadow-md, 24px padding
3 columns desktop, stacked mobile
```

### Live Feed Preview

```
Background: surface-primary
Padding: 80px vertical

Title: "What builders shipped this week" — h1, Instrument Serif, centered
Subtitle: body-lg, text-secondary, centered

Below: 3 real feed event cards (pulled from API or static at launch)
Cards arranged horizontally on desktop, stacked on mobile
Each card is a compact feed event card (see components.md)

Below cards: "See the full feed →" — accent ghost button, centered
```

### Footer CTA

```
Background: surface-inverse (#1c1917)
Padding: 80px vertical
Text: centered

"Ready to build?" — h1, Instrument Serif, text-inverse
"Join 0 builders shipping together" — body-lg, text-inverse at 60% opacity

[ ◆ Continue with GitHub ]  [ ● Continue with Google ]
Buttons: side by side on desktop, stacked on mobile. Same styling as hero.
```

---

## OAuth Sign-In Buttons

```
GitHub button (primary):
  Background: accent (#6366f1)
  Icon: GitHub mark (20px, white) left of text
  Text: "Continue with GitHub" (white, 14px, font-medium)
  Width: 280px, centered
  Radius: radius-lg
  Shadow: shadow-sm

Google button (secondary):
  Background: surface-elevated (#ffffff)
  Border: 1px solid surface-secondary
  Icon: Google "G" logo (20px, color) left of text
  Text: "Continue with Google" (text-primary, 14px, font-medium)
  Width: 280px, centered
  Radius: radius-lg
  Shadow: shadow-xs

Loading state (either button):
  Button shows spinner, text changes to "Connecting..."
  Disabled during redirect, both buttons disabled

Error state:
  Toast (dark): "Couldn't sign in. Try again."
  Buttons return to normal
```

No separate login/signup pages. Two buttons handle everything. New users go to onboarding, returning users go to feed.

---

## Onboarding Flow (`/onboarding`)

Education and discovery experience. One concept per screen. Show the platform's value through real content, not forms.

### Layout (all steps)

```
Background: surface-primary
Nav: minimal — logo only, no main navigation
Max width: 480px, centered
Padding: 64px top

Progress: step dots at top
  Dots: 8px circles
  Active: accent
  Completed: accent, filled
  Upcoming: surface-secondary
  Gap: 12px
  Centered above content
```

### Screen 1: The Constellation

```
┌──────────────────────────────────────────┐
│                                          │
│          ● ○ ○ ○                         │  ← progress dots (4 steps)
│                                          │
│                                          │
│  The next great product                  │  ← display (Instrument Serif)
│  will be built by                        │
│  five people.                            │
│                                          │
│                                          │
│          ○                               │
│         / \                              │  ← constellation animation
│        ○───○                             │    5 circles connect one by one
│       / \ / \                            │    forming a network/tribe
│      ○───○                               │
│                                          │
│                                          │
│  The right engineer. The right           │  ← body, text-secondary
│  designer. The right strategist.         │
│  Known by their work, not               │
│  their words.                            │
│                                          │
│                                          │
│  Which one are you?                      │  ← body, text-primary
│                                          │
│  ┌──────┐ ┌──────┐ ┌────────┐           │
│  │ Code │ │Design│ │Product │           │  ← role chips (row 1)
│  └──────┘ └──────┘ └────────┘           │
│  ┌──────┐ ┌──────────┐ ┌─────┐         │
│  │Growth│ │Operations│ │Other│          │  ← role chips (row 2)
│  └──────┘ └──────────┘ └─────┘         │
│                                          │
│                         [ Continue → ]   │
│                                          │
└──────────────────────────────────────────┘

Constellation animation:
  Circles: 12px, surface-secondary fill, 1.5px ink-tertiary stroke
  Lines: 1px ink-tertiary, animate in with circles
  Timing: circles appear one by one (200ms stagger), lines connect after (150ms each)
  Total animation: ~1.5s

Role chips:
  Default: surface-secondary bg, text-secondary, 8px 16px padding, radius-full
  Hover: surface-elevated, shadow-xs
  Selected: accent bg, text-inverse
  Only one selectable at a time (radio behavior)
  Font: body-sm, font-sans 500

Body text:
  "The right engineer..." — body, text-secondary, max-width 360px
  "Which one are you?" — body, text-primary, font-sans 500
```

### Screen 2: What Counts

```
┌──────────────────────────────────────────┐
│                                          │
│          ● ● ○ ○                         │
│                                          │
│  A project is anything                   │  ← h1 (Instrument Serif)
│  you've built.                           │
│                                          │
│  ┌────────────────────────────────────┐  │
│  │  A budgeting app for freelancers   │  │  ← project example card
│  │  Product · React · API             │  │  ← tags, text-tertiary
│  └────────────────────────────────────┘  │
│  ┌────────────────────────────────────┐  │
│  │  Brand system for a coffee roaster │  │
│  │  Design · Brand Identity · Figma   │  │
│  └────────────────────────────────────┘  │
│  ┌────────────────────────────────────┐  │
│  │  Product Hunt launch that hit #1   │  │
│  │  Growth · Launch · Marketing       │  │
│  └────────────────────────────────────┘  │
│  ┌────────────────────────────────────┐  │
│  │  SOC 2 compliance from scratch     │  │
│  │  Compliance · Process · Legal      │  │
│  └────────────────────────────────────┘  │
│                                          │
│  If you shipped it, it counts.           │  ← body, text-secondary
│                                          │
│                         [ Continue → ]   │
│                                          │
└──────────────────────────────────────────┘

Project example cards:
  Background: surface-elevated
  Shadow: shadow-xs
  Padding: 16px
  Radius: radius-md
  Gap between cards: 12px
  Title: body, text-primary, font-sans 500
  Tags: caption, text-tertiary, separated by " · "

"If you shipped it, it counts." — body, text-secondary, centered, 16px top margin
```

### Screen 3: Your Builder Identity

```
┌──────────────────────────────────────────┐
│                                          │
│          ● ● ● ○                         │
│                                          │
│  This is what shipping                   │  ← h1 (Instrument Serif)
│  looks like.                             │
│                                          │
│  ┌────────────────────────────────────┐  │
│  │                                    │  │  ← aspirational profile card
│  │  Maya Chen                         │  │  ← h4, text-primary
│  │  Full-stack engineer               │  │  ← body-sm, text-secondary
│  │                                    │  │
│  │  Builder Score                     │  │  ← caption, text-tertiary
│  │      142                           │  │  ← mono, 32px, accent
│  │                                    │  │
│  │  ▪▪▫▪▪▪▫▪▪▪▪▫▪▪▪▫▪▪▪▪▪▫▪▪▪▪▪▪   │  │  ← burn map
│  │  ▪▫▫▪▪▫▫▪▪▪▫▫▪▪▫▪▪▪▪▫▪▪▪▪▫▪▪▪   │  │    warm accent tones
│  │  ▫▫▪▪▫▫▪▪▫▪▪▪▪▫▪▪▫▪▪▪▪▪▫▪▪▪▪▪   │  │    (accent-subtle → accent)
│  │                                    │  │
│  │  AI Workflows                      │  │  ← caption, text-tertiary
│  │  Claude · Copilot · Cursor         │  │  ← body-sm, text-primary
│  │                                    │  │
│  │  3 projects · 2 tribes · 4 collabs │  │  ← caption, text-tertiary
│  │                                    │  │
│  └────────────────────────────────────┘  │
│                                          │
│  Ship projects. Work with AI.            │  ← body, text-secondary
│  Build with your tribe.                  │
│  Your score tells the story.             │
│                                          │
│                         [ Continue → ]   │
│                                          │
└──────────────────────────────────────────┘

Profile card:
  Background: surface-elevated
  Shadow: shadow-md
  Padding: 24px
  Radius: radius-lg
  Centered within max-width

Burn map:
  Grid of small squares (6px, 2px gap)
  Colors: surface-secondary (empty) → accent-subtle (low) → accent-muted (medium) → accent (high)
  Rows: 3, Columns: ~30 (represents weeks)
  No axis labels — purely visual/aspirational

AI Workflows:
  Label: caption, text-tertiary, uppercase
  Tools: body-sm, text-primary, separated by " · "

Stats line:
  caption, text-tertiary, separated by " · "
```

### Screen 4: Go

```
┌──────────────────────────────────────────┐
│                                          │
│          ● ● ● ●                         │
│                                          │
│                                          │
│                                          │
│                                          │
│  You're ready.                           │  ← display (Instrument Serif)
│                                          │
│                                          │
│                                          │
│        [ Explore the feed → ]            │  ← primary button, lg
│                                          │
│          Complete your profile            │  ← ghost/text button, text-secondary
│                                          │
│                                          │
│                                          │
└──────────────────────────────────────────┘

Centered vertically and horizontally within the viewport.
Maximum restraint — just the headline and two actions.
"Explore the feed" → navigates to /feed
"Complete your profile" → navigates to /settings
Primary button: accent bg, text-inverse, lg size, 280px width
Ghost button: no bg, text-secondary, underline on hover
Gap between buttons: 16px
```

### Reusable Patterns

```
Role chip (used in Screen 1):
  Default: surface-secondary bg, text-secondary, 8px 16px padding, radius-full
  Hover: surface-elevated, shadow-xs
  Selected: accent bg, text-inverse
  Font: body-sm, font-sans 500
  Only one selectable at a time (radio behavior)

Progress dots (used in all screens):
  4 dots, 8px circles, 12px gap, centered
  Active: accent, filled
  Completed: accent, filled
  Upcoming: surface-secondary
```

---

## Returning User Login

No separate login page. The landing page OAuth buttons handle it.

```
If returning user (firebase_uid exists) → skip onboarding → redirect to /feed
If token expired → redirect to / with toast: "Session expired. Sign in again."
```
