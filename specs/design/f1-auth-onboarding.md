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
│              [ Continue with GitHub ]                             │  ← primary button, lg size
│                                                                  │
│              GitHub icon + "Continue with GitHub"                 │
│              No email option in V1 — GitHub IS the signal.       │
│                                                                  │
└──────────────────────────────────────────────────────────────────┘

Hero text: centered on mobile, left-aligned on desktop
Max width of text block: 560px
The headline uses Instrument Serif at display size — this is the biggest type on the entire platform.
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

[ Continue with GitHub ] — primary button (accent on dark bg works)
```

---

## GitHub OAuth Login

```
Button: primary lg
  Icon: GitHub mark (20px, white) left of text
  Text: "Continue with GitHub"
  Width: 280px, centered

Loading state:
  Button shows spinner, text changes to "Connecting..."
  Disabled during redirect

Error state:
  Toast (dark): "Couldn't connect to GitHub. Try again."
  Button returns to normal
```

No separate login/signup pages. It's one button. New users go to onboarding, returning users go to feed.

---

## Onboarding Flow (`/onboarding`)

Multi-step form. One thing per screen. No overwhelming forms. The editorial approach: each step is a clean, focused question.

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

### Step 1: Your Role

```
┌──────────────────────────────────────────┐
│                                          │
│          ● ● ○ ○ ○                       │  ← progress dots
│                                          │
│  STEP 1 OF 5                             │  ← overline
│                                          │
│  What do you build?                      │  ← h1 (Instrument Serif)
│                                          │
│  ┌────────────────────────────────────┐  │
│  │  Full-Stack Developer             │  │  ← selectable card
│  └────────────────────────────────────┘  │
│  ┌────────────────────────────────────┐  │
│  │  Frontend Developer               │  │
│  └────────────────────────────────────┘  │
│  ┌────────────────────────────────────┐  │
│  │  Backend Developer                │  │
│  └────────────────────────────────────┘  │
│  ┌────────────────────────────────────┐  │
│  │  Designer                         │  │
│  └────────────────────────────────────┘  │
│  ┌────────────────────────────────────┐  │
│  │  Product Manager                  │  │
│  └────────────────────────────────────┘  │
│  ... more roles ...                      │
│                                          │
│                         [ Continue → ]   │
│                                          │
└──────────────────────────────────────────┘

Selectable card:
  Default: surface-elevated, shadow-xs, 12px padding, radius-md
  Hover: shadow-sm
  Selected: 2px accent ring, accent-subtle background
  Text: body, text-primary
  Only one selectable at a time (radio behavior)
```

### Step 2: Your Skills

```
  STEP 2 OF 5

  What are your skills?                    ← h1
  Pick at least 3.                         ← body-sm, text-secondary

  [ Search skills... ]                     ← text input

  Popular:                                 ← caption, text-tertiary
  ┌────────┐ ┌──────────┐ ┌────────────┐
  │ React  │ │ Python   │ │ TypeScript │  ← skill tags, clickable
  └────────┘ └──────────┘ └────────────┘
  ┌──────┐ ┌────────────┐ ┌────────────┐
  │ Go   │ │ PostgreSQL │ │ Figma      │
  └──────┘ └────────────┘ └────────────┘

  Selected (3):                            ← caption, accent
  ┌────────┐ ┌──────────┐ ┌────────┐
  │ React ×│ │ Python × │ │ Go   × │     ← selected: accent-subtle bg, accent text
  └────────┘ └──────────┘ └────────┘

                           [ Continue → ]

Tag states:
  Default: surface-secondary bg, text-secondary (same as skill tag component)
  Selected: accent-subtle bg, accent text, × icon to deselect
  Tap to toggle
```

### Step 3: Availability

```
  STEP 3 OF 5

  What's your availability?                ← h1

  ┌────────────────────────────────────┐
  │  🟢  Open to collaborate           │   ← selectable card
  │     Looking for co-builders        │   ← body-sm, text-secondary
  └────────────────────────────────────┘
  ┌────────────────────────────────────┐
  │  🔵  Open to join a tribe          │
  │     Looking for a team             │
  └────────────────────────────────────┘
  ┌────────────────────────────────────┐
  │  🟡  Busy, just browsing           │
  │     Not available right now        │
  └────────────────────────────────────┘

                           [ Continue → ]

Status dots: 10px circles, colored by availability
  Open: shipped (#16a34a)
  Tribe: accent (#6366f1)
  Busy: in-progress (#d97706)
```

### Step 4: Headline & Bio

```
  STEP 4 OF 5

  Tell builders about yourself             ← h1

  HEADLINE
  [ Building AI tools for small teams ]    ← text input, placeholder

  BIO
  [ Tell your story in a few sentences.    ← textarea
    What do you build? Why?              ]

  Both optional — can be filled later.     ← body-sm, text-tertiary

                           [ Continue → ]
```

### Step 5: Import Projects

```
  STEP 5 OF 5

  Import your work                         ← h1
  Pull projects from GitHub or             ← body-sm, text-secondary
  add them manually later.

  ┌────────────────────────────────────┐
  │  repo-name                    [✓]  │   ← GitHub repo card
  │  ⭐ 142 · Python · Updated 2d ago │
  └────────────────────────────────────┘
  ┌────────────────────────────────────┐
  │  another-repo                 [ ]  │
  │  ⭐ 23 · TypeScript · Updated 1w  │
  └────────────────────────────────────┘
  ... scrollable list ...

  Import selected (2)      [ Skip for now ]

                        [ Finish setup → ]

Repo card:
  Background: surface-elevated
  Checkbox: right-aligned
  Repo name: h4 (Inter 600)
  Meta: caption, text-tertiary
  Selected: accent-subtle bg, accent ring
```

### Completion

```
  ✓                                        ← large check icon (48px, shipped green)

  You're in.                               ← h1 (Instrument Serif)
  Welcome to Find Your Tribe.              ← body-lg, text-secondary

  Your Builder Score: 15                   ← mono 32px, accent
  (Complete your profile to grow it)       ← caption, text-tertiary

              [ Explore the feed → ]       ← primary button

Auto-redirect to /feed after 3 seconds if no interaction.
The shipped-green checkmark + confetti burst (subtle, 1.5s).
```

---

## Returning User Login

No separate login page. The landing page GitHub button handles it.

```
If returning user → skip onboarding → redirect to /feed
If token expired → redirect to / with toast: "Session expired. Sign in again."
```
