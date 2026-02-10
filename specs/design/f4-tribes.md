# F4: Tribes — Page Design

> See [design-system.md](./design-system.md) and [components.md](./components.md) for tokens.

---

## Tribe Detail Page (`/tribes/:id`)

A tribe page should feel like a team's "about" page — their mission, who's in, and what roles they need. Editorial layout with clear structure.

### Layout

```
┌──────────────────────────────────────────────────────────────────┐
│  nav bar                                                         │
├──────────────────────────────────────────────────────────────────┤
│                                                                  │
│  OPEN TRIBE                                             ← overline (accent color for open)
│                                                                  │
│  Hospitality OS                                         ← h1 (Instrument Serif, 40px)
│                                                                  │
│  Reimagining hotel operations for the AI era.                    │
│  We're building the operating system that small                  │ ← body-lg, text-secondary
│  boutique hotels need to compete with chains.                    │   max-width 680px
│                                                                  │
│  Created by [Av] Maya Chen · March 2025                 ← body-sm, text-tertiary
│                                                                  │
│  ─────────────────────────────────────────────────────────────   │
│                                                                  │
│  ┌───────────────────────────┐  ┌────────────────────────────┐  │
│  │                           │  │                            │  │
│  │  MEMBERS (3/5)            │  │  OPEN ROLES               │  │
│  │                           │  │                            │  │
│  │  [Av 48px]                │  │  ┌────────────────────┐    │  │
│  │  Maya Chen        OWNER   │  │  │ Backend Engineer   │    │  │
│  │  Full-Stack Developer     │  │  │ Python, PostgreSQL │    │  │
│  │                           │  │  │                    │    │  │
│  │  [Av 48px]                │  │  │ [ Request to Join ]│    │  │
│  │  James Okafor     MEMBER  │  │  └────────────────────┘    │  │
│  │  Product Designer         │  │                            │  │
│  │                           │  │  ┌────────────────────┐    │  │
│  │  [Av 48px]                │  │  │ Growth Marketer    │    │  │
│  │  Priya Sharma     MEMBER  │  │  │ SEO, Analytics     │    │  │
│  │  Backend Engineer         │  │  │                    │    │  │
│  │                           │  │  │ [ Request to Join ]│    │  │
│  │                           │  │  └────────────────────┘    │  │
│  │                           │  │                            │  │
│  └───────────────────────────┘  └────────────────────────────┘  │
│                                                                  │
│  ─────────────────────────────────────────────────────────────   │
│                                                                  │
│  PENDING REQUESTS (owner only)                                   │
│  ... member request cards ...                                    │
│                                                                  │
└──────────────────────────────────────────────────────────────────┘

Top section: centered text, editorial column (680px)
Meta section: two-column grid, surface-elevated cards
Left: Members list
Right: Open roles
Both cards: radius-lg, shadow-md, 24px padding
```

### Status Overlines

```
Open:   "OPEN TRIBE" — accent color
Active: "ACTIVE TRIBE" — shipped color
Alumni: "ALUMNI TRIBE" — text-tertiary
```

### Members List

```
Each member row:
  [Avatar 48px]
  Name: h4 (Inter 600)
  Role badge: caption, uppercase
    OWNER: accent-subtle bg, accent text
    MEMBER: surface-secondary bg, text-secondary
  Title: body-sm, text-secondary (their primary_role)

  Hover: surface-secondary background
  Click: navigate to profile

  Vertical gap: 16px between members
```

### Open Roles

```
Each role card:
  Background: surface-primary (inside the surface-elevated parent)
  Radius: radius-md
  Padding: 16px

  Role title: h4 (Inter 600)
  Skills needed: skill tags (mono, surface-secondary)
  CTA: primary button "Request to Join" (sm size)
    Disabled if: already member, already pending, role filled
    If pending: secondary button "Request Pending" (disabled look)
    If filled: "Filled by [Name]" — body-sm, text-tertiary, with avatar

  Vertical gap: 12px between role cards
```

### Pending Requests (Owner View)

```
Only visible to tribe owner.

Section: below main content
Each request:
  ┌────────────────────────────────────────────────────┐
  │  [Av 44px]  David Morales                          │
  │             Growth Marketer · Score: 42            │
  │             Requested: Backend Engineer role       │
  │             2 days ago                             │
  │                                                    │
  │             [ View Profile ]  [ Approve ] [ Deny ] │
  └────────────────────────────────────────────────────┘

Card: surface-elevated, shadow-sm, radius-lg, 20px padding
Approve: primary button (sm)
Deny: ghost button, error text (sm)
View Profile: accent ghost (sm)
```

---

## Create Tribe Modal

```
Modal: medium (600px)

  CREATE TRIBE                             ← overline
  Form your team                           ← h1 (Instrument Serif)

  TRIBE NAME *
  [ Hospitality OS ]

  MISSION
  [ What are you building and why?       ] ← textarea
  [ Describe the vision in 2-3 sentences ]

  MAX MEMBERS
  [ 5 ▾ ]                                 ← select, options 2-8

  OPEN ROLES
  Add the roles you're looking for:

  ┌────────────────────────────────────┐
  │  Role 1                            │
  │  TITLE     [ Backend Engineer    ] │
  │  SKILLS    [ Python ] [ PG ] [+]   │ ← tag input
  │                          [ Remove ]│
  └────────────────────────────────────┘

  [ + Add another role ]                   ← accent ghost button

                    [ Cancel ]  [ Create Tribe ]

Role entry card: surface-secondary bg, radius-md, 16px padding
Skills input: same tag input as onboarding
"+ Add another role" adds a new card
```

---

## Edit Tribe (Owner)

Same layout as create, pre-filled. Additional sections:

```
  STATUS
  ( ) Open — looking for members
  ( ) Active — full team, building
  ( ) Alumni — past collaboration

  ─────────────────────────────────────────

  DANGER ZONE

  [ Archive this tribe ]                   ← ghost, error text
```

---

## Tribe Card States

### On Discovery Page
Full tribe card as defined in components.md. 3-column grid.

### On Profile Page
Compact: tribe name + your role + member count. Single row, clickable.

```
  ┌───────────────────────────────────────────┐
  │  Hospitality OS   MEMBER   3/5 members    │
  └───────────────────────────────────────────┘
```

### On Feed (Embedded)
Surface-secondary bg, compact: name + mission (1 line) + open roles count.

---

## Empty States

### No Tribes (Discovery)

```
  [Users icon, 48px, text-tertiary]

  No tribes yet                            ← h3
  Be the first to form a team.            ← body-sm, text-secondary

  [ Create a Tribe ]
```

### No Members (Owner, just created)

```
  You're the only one here.               ← body-sm, text-secondary
  Share your tribe or add open roles      ← body-sm, text-secondary
  to attract builders.

  [ Add Open Roles ]
```
