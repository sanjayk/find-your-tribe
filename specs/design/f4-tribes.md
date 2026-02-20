# F4: Tribes — Page Design

> See [design-system.md](./design-system.md) and [components.md](./components.md) for tokens.

---

## Tribe Detail Page (`/tribe/:id`)

A tribe page should feel like a team's "about" page — their mission, who's in, and what roles they need. Single editorial column, top-to-bottom reading flow. Reads like a magazine article.

The same page serves both visitors and owners. Owners see inline management controls threaded into each section — the visitor sees a magazine article, the owner sees a magazine article with a red pen in hand.

### Layout

```
┌──────────────────────────────────────────────────────────────────┐
│  nav bar                                                         │
├──────────────────────────────────────────────────────────────────┤
│                                                                  │
│                    ← editorial column, 680px →                   │
│                                                                  │
│  OPEN TRIBE                                ← overline, terracotta│
│                                                                  │
│  Hospitality OS                            ← h1, DM Serif, 40px │
│                                                                  │
│  Reimagining hotel operations for the      ← body-lg,            │
│  AI era. We're building the operating        ink-secondary        │
│  system that small boutique hotels need                          │
│  to compete with chains.                                         │
│                                                                  │
│  Created by [Av] Maya Chen · March 2025    ← body-sm, ink-tert  │
│                                                                  │
│  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━   │
│                                                                  │
│  MEMBERS                                   3 / 5                 │
│                                                                  │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │                                                           │  │
│  │  [Av 48]  Maya Chen                            OWNER     │  │
│  │           Full-Stack Developer                            │  │
│  │                                                           │  │
│  │  [Av 48]  James Okafor                         MEMBER    │  │
│  │           Product Designer                                │  │
│  │                                                           │  │
│  │  [Av 48]  Priya Sharma                         MEMBER    │  │
│  │           Backend Engineer                                │  │
│  │                                                           │  │
│  └───────────────────────────────────────────────────────────┘  │
│                                                                  │
│  OPEN ROLES                                                      │
│                                                                  │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │                                                           │  │
│  │  Backend Engineer                                         │  │
│  │  [ Python ]  [ PostgreSQL ]             ← mono skill tags │  │
│  │                                                           │  │
│  │                               [ Request to Join ]         │  │
│  │                                                           │  │
│  ├ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ┤  │
│  │                                                           │  │
│  │  Growth Marketer                                          │  │
│  │  [ SEO ]  [ Analytics ]                                   │  │
│  │                                                           │  │
│  │                               [ Request to Join ]         │  │
│  │                                                           │  │
│  └───────────────────────────────────────────────────────────┘  │
│                                                                  │
└──────────────────────────────────────────────────────────────────┘

Single editorial column: 680px max-width, centered.
Hero: overline + h1 + body-lg mission + creator meta.
Members card: surface-elevated, radius-lg, shadow-md, 24px padding.
Open roles card: surface-elevated, radius-lg, shadow-md, 24px padding.
Roles separated by subtle dividers within the card.
```

### Member View — Contextual Controls

When the authenticated user is a non-owner member of the tribe, they see the public page plus:

```
  Below the hero section, a subtle action bar:

  You're a member of this tribe.                    [ Leave Tribe ]

  Text: body-sm, ink-tertiary.
  "Leave Tribe": ghost button, error text (sm).
  Confirmation dialog before leaving.
```

Members do not see pending requests, remove buttons, or role management. They see the same page as visitors, plus the leave action.

### Owner View — Contextual Controls

When the authenticated user is the tribe owner, the same page renders inline management controls throughout. No separate admin panel or route.

```
HERO — owner gets edit affordance:

  VISITOR:                              OWNER:

  OPEN TRIBE                            OPEN TRIBE                    [ Edit ]
  Hospitality OS                        Hospitality OS
  Reimagining hotel...                  Reimagining hotel...
  Created by Maya Chen · Mar 2025      You created this · Mar 2025

Edit button: accent ghost (sm), top-right of hero, opens Edit Tribe modal.
Creator line changes to "You created this" for the owner.


MEMBERS — owner gets remove controls:

  VISITOR:                              OWNER:

  [Av] Maya Chen         OWNER         [Av] Maya Chen          OWNER  (you)
       Full-Stack Developer                  Full-Stack Developer

  [Av] James Okafor      MEMBER        [Av] James Okafor       MEMBER  [ Remove ]
       Product Designer                      Product Designer

Remove: ghost button, error text (sm). Owner cannot remove themselves.


OPEN ROLES — owner manages instead of applying:

  VISITOR:                              OWNER:

  Backend Engineer                      Backend Engineer
  [Python] [PostgreSQL]                 [Python] [PostgreSQL]
                [ Request to Join ]                    [ Edit ] [ Remove ]

                                        [ + Add a role ]    ← accent ghost, below last role

Edit: accent ghost (sm), opens inline edit or modal.
Remove: ghost, error text (sm).
"+ Add a role": accent ghost button below the last role card.


PENDING REQUESTS — owner only, below open roles:

  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  PENDING REQUESTS                          2 pending

  ┌───────────────────────────────────────────────────────────┐
  │                                                           │
  │  [Av 44]  David Morales                                   │
  │           Growth Marketer · Score: 42                     │
  │           Requested: Backend Engineer · 2 days ago        │
  │                                                           │
  │           [ View Profile ]  [ Approve ]  [ Deny ]         │
  │                                                           │
  ├ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ┤
  │                                                           │
  │  [Av 44]  Sarah Kim                                       │
  │           Frontend Developer · Score: 67                  │
  │           Requested: Backend Engineer · 5 hours ago       │
  │                                                           │
  │           [ View Profile ]  [ Approve ]  [ Deny ]         │
  │                                                           │
  └───────────────────────────────────────────────────────────┘

Card: surface-elevated, shadow-sm, radius-lg, 20px padding
Approve: primary button (sm)
Deny: ghost button, error text (sm)
View Profile: accent ghost (sm)


MANAGE TRIBE — owner only, bottom of page:

  [ Edit Tribe ]                        ← opens Edit Tribe modal
```

### Status Overlines

```
Open:   "OPEN TRIBE"   — terracotta (#c4775a)
Active: "ACTIVE TRIBE" — shipped color (#16a34a)
Alumni: "ALUMNI TRIBE" — ink-tertiary (#a8a29e)
```

### Members List

```
Each member row:
  [Avatar 48px]
  Name: h4 (DM Sans 600)
  Role badge: caption, uppercase
    OWNER: accent-subtle bg, accent text
    MEMBER: surface-secondary bg, ink-secondary
  Title: body-sm, ink-secondary (their primary_role)

  Hover: surface-secondary background
  Click: navigate to profile

  Vertical gap: 16px between members
```

### Open Roles

```
All roles live in a single surface-elevated card, separated by subtle dividers.

Each role entry:
  Role title: h4 (DM Sans 600)
  Skills needed: skill tags (IBM Plex Mono, surface-secondary bg)
  CTA: primary button "Request to Join" (sm size), right-aligned

  Button states:
    Default: primary button "Request to Join"
    Already pending: secondary/muted "Request Pending" (disabled)
    Already a member: button hidden
    Role filled: "Filled by [Name]" — body-sm, ink-tertiary, with small avatar
    Tribe not open: roles shown but no buttons

  Vertical gap: 16px between role entries
  Divider: 1px, surface-secondary, between entries
```

---

## Tribe Discovery Page (`/tribes`)

The discovery page is where builders browse and search for tribes. Single search bar, compact row layout optimized for scanning.

### Layout

```
┌──────────────────────────────────────────────────────────────────┐
│  nav bar                                                         │
├──────────────────────────────────────────────────────────────────┤
│                                                                  │
│                    ← editorial column, centered →                │
│                                                                  │
│  TRIBES                                            ← overline    │
│                                                                  │
│  Find your people                                  ← h1, serif   │
│                                                                  │
│  Search by skill, role, name, or mission.          ← body-sm,    │
│                                                      ink-secondary│
│                                                                  │
│  ┌──────────────────────────────────────────────┐               │
│  │  🔍  Python, hotel, designer...              │  ← search bar │
│  └──────────────────────────────────────────────┘               │
│                                              search max-width 560│
│                                                                  │
│  12 tribes                                         ← ink-tertiary│
│                                                                  │
│  ▌ Hospitality OS       "Building the operating    3/5   ● Open │
│  ▌                       system for independent…"               │
│  ▌                       Seeking: Backend Eng, Growth Marketer  │
│  │                                                               │
│  ▌ Fintech Builders     "Open banking APIs for     1/6   ● Open │
│  ▌                       the next generation"                   │
│  ▌                       Seeking: React Native, Designer, +1   │
│  │                                                               │
│  ▌ AI for Education     "Making personalized       3/3 ● Active │
│  ▌                       learning accessible…"                  │
│  │                                                               │
│  ▌ Creator Economy       "Empowering independent   2    Alumni  │
│  ▌  Tools                creators with better…"                 │
│  │                                                               │
│                                                                  │
│                       [ Load more ]                              │
│                                                                  │
└──────────────────────────────────────────────────────────────────┘

Results max-width: 780px, centered.
```

### Search Bar

```
Single input, no filters, no dropdowns.
Background: surface-elevated
Radius: radius-lg
Shadow: shadow-sm
Icon: magnifying glass, ink-tertiary
Placeholder: "Python, hotel, designer..."
Max-width: 560px, centered.
Debounced: 300ms after typing stops.
```

### Result Rows

```
Each row is a clickable band. Full-width within the 780px column.

Line 1: Name (DM Serif Display, 16px, ink)
         Mission (DM Serif Display italic, 14px, ink-secondary, truncated to 1 line, in quotes)
         Member count (13px, ink-tertiary — "3/5" for open/active, "2" for alumni)
         Status dot + label (11px, uppercase)
Line 2: (Open tribes only) "Seeking:" in ink-tertiary + role titles in ink, comma-separated
         Max 3 roles shown, then "+ N more" in ink-tertiary

Left accent strip: 3px, color by status (terracotta / accent / ink-tertiary)
Row padding: 16px vertical, 20px horizontal
Row hover: surface-secondary background
Row click: navigates to /tribe/[id]
Row gap: 4px (the accent strip restarting provides visual separation)

Active tribes: no "Seeking" line — row is 1 line, naturally compact.
Alumni rows: opacity 0.85
```

### Results Count

```
Default (no search): "N tribes" — ink-tertiary, body-sm
With search: "N tribes matching 'Python'" — ink-tertiary, body-sm
```

### Pagination

```
Offset-based. "Load more" ghost button centered below last result.
No infinite scroll — intentional. User decides when to see more.
Keeps the page feeling curated, not infinite.
```

---

## Create Tribe Modal

```
Modal: medium (600px)

  CREATE TRIBE                             ← overline, accent
  Form your team                           ← h1 (DM Serif Display)

  ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─

  TRIBE NAME *                             ← label, uppercase, ink-tertiary
  ┌─────────────────────────────────┐
  │ Hospitality OS                  │      ← input
  └─────────────────────────────────┘

  MISSION
  ┌─────────────────────────────────┐
  │ What are you building and why?  │      ← textarea, placeholder
  │ Describe the vision in 2-3      │
  │ sentences.                      │
  └─────────────────────────────────┘

  MAX MEMBERS
  ┌──────┐
  │  8   │                                 ← number input, min 1, no upper bound
  └──────┘

  ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─

  OPEN ROLES
  Add the roles you're looking for:

  ┌────────────────────────────────────────────┐
  │                                            │
  │  TITLE                                     │
  │  ┌─────────────────────────────────┐       │
  │  │ Backend Engineer                │       │
  │  └─────────────────────────────────┘       │
  │                                            │
  │  SKILLS                                    │
  │  [ Python ]  [ PostgreSQL ]  [+]           │
  │                                            │
  │                            [ Remove Role ] │
  └────────────────────────────────────────────┘

  [ + Add another role ]                   ← accent ghost button

  ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─

                    [ Cancel ]  [ Create Tribe ]

Role entry card: surface-secondary bg, radius-md, 16px padding
Skills input: same tag input component as onboarding (IBM Plex Mono tags)
"+ Add another role" adds a new role card
"Remove Role": ghost button, error text, bottom-right of card
Cancel: ghost button
Create Tribe: primary button
Footer: right-aligned
New tribes always start as "Open" — no status field on creation.
```

---

## Edit Tribe Modal (Owner)

Same layout as Create Tribe, pre-filled with current values. Additional sections:

```
  STATUS
  ( ) Open — looking for members
  ( ) Active — full team, building
  ( ) Alumni — past collaboration

  Radio group: vertical, 12px gap between options.
  Label: uppercase overline.
  Description: body-sm, ink-secondary, inline after label.

  ─────────────────────────────────────────

  DANGER ZONE

  [ Archive this tribe ]                   ← ghost button, error text

  Danger zone: separated by full divider.
  "Archive this tribe" sets status to alumni.
```

---

## Tribe Card — "The Editorial Callout"

The tribe card is visually distinct from project cards via a warm left accent strip and editorial italic mission. It signals "people coming together" vs a project card's "thing that was built."

### Visual Identity

```
Card: surface-elevated, radius-lg, shadow-sm, 20px padding
Left accent strip: 3px wide, color varies by status, radius matches card left edge
Hover: shadow-md, slight lift (card-lift class)
Click: entire card → /tribe/[id]
```

**Accent strip color by status:**

| Status | Strip color | Rationale |
|--------|------------|-----------|
| Open | Terracotta/coral `#c4775a` | Warm, inviting — "come join us" |
| Active | Accent `#6366f1` | Confident, focused — "we're building" |
| Alumni | Ink-tertiary `#a8a29e` | Muted, nostalgic — "we were" |

### Open Tribe (recruiting)

```
┌─────────────────────────────────────────┐
│▌                                        │
│▌ Hospitality OS              ● Open    │
│▌                                        │
│▌ "Building the operating system         │
│▌  for independent hotels"              │
│▌                                        │
│▌ [MC] [JO] [PS]  3 / 5                 │
│▌                                        │
│▌ ╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌  │
│▌                                        │
│▌ SEEKING                                │
│▌ Backend Engineer                       │
│▌ Growth Marketer                        │
│▌                                        │
└─────────────────────────────────────────┘

Name: DM Serif Display, 17px, ink
Status: 11px, uppercase, terracotta (#c4775a) + terracotta dot
Mission: DM Serif Display italic, 14px, ink-secondary
  Wrapped in quotation marks. 2-line clamp.
Avatars: 32px, overlapping (-8px), warm gradient bg (accent-subtle)
Member count: 13px, ink-tertiary, "3 / 5"
Divider: 1px dashed, surface-secondary
"SEEKING": 10px, uppercase, tracking-wide, ink-tertiary
Roles: 13px, ink, each on its own line
  Max 4 roles shown, then "+ N more" in ink-tertiary
```

### Active Tribe (full, not recruiting)

```
┌─────────────────────────────────────────┐
│▌                                        │
│▌ AI for Education            ● Active  │
│▌                                        │
│▌ "Making personalized learning          │
│▌  accessible to every student"         │
│▌                                        │
│▌ [SK] [AR] [LP]  3 / 3                 │
│▌                                        │
└─────────────────────────────────────────┘

Status: accent color + accent dot
Accent strip: accent (#6366f1)
No divider, no "SEEKING" section — all roles filled.
Card is shorter. The absence itself communicates "complete team."
```

### Alumni Tribe (past collaboration)

```
┌─────────────────────────────────────────┐
│▌                                        │
│▌ Creator Economy Tools        Alumni   │
│▌                                        │
│▌ "Empowering independent creators       │
│▌  with better business tools"          │
│▌                                        │
│▌ [EV] [MJ]  2 members                  │
│▌                                        │
└─────────────────────────────────────────┘

Status: no dot, ink-tertiary text
Accent strip: ink-tertiary (#a8a29e)
No fraction — just "N members"
Card opacity: 0.85 — feels like a memory, not active.
```

### Edge Cases

**Solo tribe (1 member, just created):**
```
│▌ [DM]  1 / 8                           │  ← single avatar, fraction shows potential
```

**No mission:**
Mission block absent, card is shorter, still balanced.

**Many members (6+):**
```
│▌ [A] [B] [C] [D] [E] +3  8 / 12       │  ← first 5 avatars, "+N" counter
```

**Many open roles (5+):**
```
│▌ SEEKING                                │
│▌ Backend Engineer                       │
│▌ Mobile Developer                       │
│▌ Growth Marketer                        │
│▌ Product Designer                       │
│▌ + 2 more                              │  ← ink-tertiary
```

### Context Variants

**On Discovery Page:**
Not used. Discovery uses compact row layout (see Tribe Discovery Page).

**On Profile Page — compact inline:**
```
│▌ Hospitality OS  ·  MEMBER  ·  3/5 members  ·  ● Open │
```
Accent strip on left, everything inline. Single row, clickable.

**On Feed — embedded in event:**
```
│▌ Hospitality OS                                         │
│▌ "Building the operating system for independent hotels" │
│▌ ● Open · 2 roles available                             │
```
No avatars, no role list — name, mission, status summary only.

---

## Empty States

### No Tribes (Discovery)

```
  [Users icon, 48px, ink-tertiary]

  No tribes yet                            ← h3
  Be the first to form a team.            ← body-sm, ink-secondary

  [ Create a Tribe ]
```

### No Search Results (Discovery)

```
  [Search icon, 48px, ink-tertiary]

  No tribes match that search              ← h3
  Try different keywords or browse         ← body-sm, ink-secondary
  all open tribes.

  [ Clear search ]                         ← accent ghost button
```

### No Members (Owner, just created)

```
  You're the only one here.               ← body-sm, ink-secondary
  Share your tribe or add open roles      ← body-sm, ink-secondary
  to attract builders.

  [ Add Open Roles ]
```

### No Open Roles

```
  Open roles section is hidden entirely.
  No empty state card — the absence is the message.
```

### No Pending Requests (Owner)

```
  Pending requests section is hidden entirely.
  Only appears when there are requests to review.
```
