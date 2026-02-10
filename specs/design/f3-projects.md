# F3: Projects — Page Design

> See [design-system.md](./design-system.md) and [components.md](./components.md) for tokens.

---

## Project Detail Page (`/projects/:id`)

The project page is the centerpiece of Find Your Tribe. This is where "clout through building" lives. Each project page should feel like a magazine feature spread.

### Layout

```
┌──────────────────────────────────────────────────────────────────┐
│  nav bar                                                         │
├──────────────────────────────────────────────────────────────────┤
│                                                                  │
│  SHIPPED PROJECT                                        ← overline
│                                                                  │
│  AI Resume Builder                                      ← h1 (Instrument Serif, 40px)
│                                                                  │
│  One paragraph description that explains what this               │
│  project does and why it matters. Can wrap to                    │ ← body-lg, text-secondary
│  multiple lines. Max-width 680px.                                │
│                                                                  │
│  ┌───────────────────────────────────────────────────────────┐   │
│  │                                                           │   │
│  │                                                           │   │
│  │              Project Thumbnail (16:10)                    │   │ ← full-width within container
│  │              radius-lg, shadow-md                         │   │    max-height: 480px
│  │                                                           │   │
│  │                                                           │   │
│  └───────────────────────────────────────────────────────────┘   │
│                                                                  │
│  ─────────────────────────────────────────────────────────────   │
│                                                                  │
│  ┌──────────────────────┐     ┌──────────────────────────────┐  │
│  │                      │     │                              │  │
│  │  BUILT BY            │     │  IMPACT                      │  │
│  │  [Av] Maya Chen      │     │  ⭐ 142 stars               │  │
│  │  Full-Stack Developer│     │  👤 1.2k users               │  │
│  │                      │     │  📥 5k downloads             │  │
│  │  COLLABORATORS       │     │                              │  │
│  │  [Av] James · Design │     │  TECH STACK                  │  │
│  │  [Av] Priya · Backend│     │  ┌──────┐ ┌──────┐ ┌──────┐ │  │
│  │                      │     │  │React │ │Fast  │ │PG    │ │  │
│  │  ROLE                │     │  └──────┘ │API   │ └──────┘ │  │
│  │  Lead Developer      │     │           └──────┘          │  │
│  │                      │     │                              │  │
│  │  LINKS               │     │  STATUS                      │  │
│  │  🔗 Live site        │     │  ● Shipped                   │  │
│  │  📦 GitHub repo      │     │                              │  │
│  │  🏆 Product Hunt     │     │  SHIPPED                     │  │
│  │                      │     │  March 2025                  │  │
│  └──────────────────────┘     └──────────────────────────────┘  │
│                                                                  │
└──────────────────────────────────────────────────────────────────┘

Top section: centered, max-width 680px (editorial column)
Thumbnail: full container width (1120px), breaks out of text column
Meta section below: two-column grid (desktop), stacked (mobile)
  Left column: people (builder, collaborators, role)
  Right column: data (impact, tech, status)
  Each column: surface-elevated, radius-lg, shadow-md, 24px padding
```

### Overline + Status

```
Overline varies by status:
  Shipped: "SHIPPED PROJECT" in shipped color
  In Progress: "IN PROGRESS" in in-progress color
  Archived: "ARCHIVED PROJECT" in text-tertiary

Status badge: also shown as pill badge next to the overline
```

### Impact Metrics

```
Each metric is a row:
  Icon (18px, text-tertiary) + value (h3, text-primary) + label (body-sm, text-secondary)

Example:
  ⭐  142      stars
  👤  1,200    users
  📥  5,000    downloads
  💰  $10k     MRR

Numbers: h3 (Inter 600), text-primary
Labels: body-sm, text-secondary
Icons: Lucide equivalents (Star, Users, Download, DollarSign)

If no metrics: section hidden entirely (not empty state)
```

### Links

```
Each link: icon (18px) + label (body, accent)
  repo → GitHub icon + "View source"
  live_url → ExternalLink icon + "Visit site"
  product_hunt → Lucide Rocket + "Product Hunt"
  app_store → Smartphone icon + "App Store"
  play_store → Smartphone icon + "Play Store"

Links clickable, open in new tab
```

### Collaborators

```
Each collaborator:
  [Avatar 36px]  Name (h4, text-primary) · Role (body-sm, text-secondary)
  Status indicator:
    Confirmed: small check icon (16px, shipped green)
    Pending: "Pending" caption, text-tertiary
  Click name → navigate to profile

If pending collaboration for current user:
  Yellow highlight bar at top:
    "[Name] invited you to collaborate on this project"
    [ Accept ]  [ Decline ]
```

---

## Create Project Modal

Triggered from: Profile page "Add Project" button, or nav menu.

```
Modal: medium (600px)

  CREATE PROJECT                           ← overline
  Ship something new                       ← h1 (Instrument Serif)

  TITLE *
  [ My Awesome Project ]

  DESCRIPTION
  [ What does it do? Why does it matter? ]  ← textarea, 120px min

  STATUS
  ( ) In Progress  ( ) Shipped             ← radio group, selectable cards

  YOUR ROLE
  [ Lead Developer ]                       ← text input

  TECH STACK
  [ Add technologies... ]                  ← tag input (search + select)
  ┌──────┐ ┌────────┐ ┌──────┐
  │React │ │FastAPI │ │PG    │            ← selected tags with ×
  └──────┘ └────────┘ └──────┘

  LINKS
  REPOSITORY    [ https://github.com/... ]
  LIVE SITE     [ https://... ]

  THUMBNAIL
  [ Upload image ]  or drag & drop        ← file upload area
    Surface-secondary bg, dashed outline (the one place we use a visible border),
    64px height, centered upload icon + "Drop image or click to upload"

                      [ Cancel ]  [ Create Project ]
```

### GitHub Import Flow

Alternative to manual creation:

```
  IMPORT FROM GITHUB                       ← overline
  Pull in your shipped work                ← h1

  Select repositories to import:

  ┌────────────────────────────────────────┐
  │  [ ] ai-resume-builder                │
  │      ⭐ 142 · Python · 2 days ago     │
  ├────────────────────────────────────────┤
  │  [✓] tribe-finder                     │
  │      ⭐ 23 · TypeScript · 1 week ago  │
  ├────────────────────────────────────────┤
  │  [ ] dotfiles                          │
  │      ⭐ 5 · Shell · 3 months ago      │
  └────────────────────────────────────────┘

  Selecting: 1 repository                  ← caption, text-secondary

              [ Cancel ]  [ Import Selected ]

Repo list: scrollable, max-height 400px
Each row: checkbox + repo name (h4) + meta (caption, text-tertiary)
Selected row: accent-subtle background
```

---

## Edit Project

Same modal as Create, pre-filled with current values. Title changes to "Edit Project".

Additional options at bottom:
```
  ─────────────────────────────────────────

  DANGER ZONE                              ← overline, error color

  [ Delete Project ]                       ← ghost button, error color text
    Confirmation dialog: "This cannot be undone. Type the project name to confirm."
```

---

## Project Card States

### On Profile Page
Full project card as defined in components.md. 2-column grid.

### On Discovery Page
Same full card, 3-column grid.

### On Feed (Embedded)
Compact variant: no thumbnail, surface-secondary bg, smaller padding.

### Empty State (Profile, no projects)

```
  [Code icon, 48px, text-tertiary]

  No projects yet                          ← h3
  Ship something and show it off.          ← body-sm, text-secondary

  [ Add a Project ]   [ Import from GitHub ]
```
