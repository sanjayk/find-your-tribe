# F2: Builder Profiles — Page Design

> See [design-system.md](./design-system.md) and [components.md](./components.md) for tokens.

---

## Profile Page (`/builders/:handle`)

The flagship page. This is the "feature article" about a builder. Editorial layout — generous space, strong type, the work is the visual centerpiece.

### Desktop Layout

```
┌──────────────────────────────────────────────────────────────────┐
│  nav bar                                                         │
├──────────────────────┬───────────────────────────────────────────┤
│                      │                                           │
│  BUILDER PROFILE     │  SHIPPED PROJECTS                        │ ← overline
│                      │                                           │
│  [Avatar 88px]       │  ┌─────────────┐ ┌─────────────┐        │
│                      │  │ Project     │ │ Project     │        │
│  Maya Chen           │  │ Card        │ │ Card        │        │
│  @mayachen           │  │ (full)      │ │ (full)      │        │
│                      │  └─────────────┘ └─────────────┘        │
│  Full-Stack          │                                           │
│  Developer           │  ┌─────────────┐                         │
│                      │  │ Project     │                         │
│  ── 64 ──            │  │ Card        │                         │
│  Builder Score       │  │ (full)      │                         │
│                      │  └─────────────┘                         │
│  ─────────────────   │                                           │
│                      │  ─────────────────────────────────────    │
│  Building AI tools   │                                           │
│  for small teams.    │  COLLABORATORS                           │ ← overline
│  Previously at...    │                                           │
│                      │  [Av] James Okafor · Designer            │
│  ─────────────────   │  [Av] Priya Sharma · Backend             │
│                      │  [Av] David Morales · PM                 │
│  SKILLS              │                                           │
│  ┌──────┐ ┌──────┐  │  ─────────────────────────────────────    │
│  │React │ │Python│  │                                           │
│  └──────┘ └──────┘  │  TRIBES                                  │ ← overline
│  ┌──────┐ ┌──────┐  │                                           │
│  │Node  │ │PG    │  │  ┌───────────────────────────────────┐   │
│  └──────┘ └──────┘  │  │  Compact Tribe Card               │   │
│                      │  └───────────────────────────────────┘   │
│  ─────────────────   │                                           │
│                      │                                           │
│  AVAILABILITY        │                                           │
│  🟢 Open to collab   │                                           │
│                      │                                           │
│  TIMEZONE            │                                           │
│  PST (UTC-8)         │                                           │
│                      │                                           │
│  LINKS               │                                           │
│  GitHub · Twitter     │                                           │
│  Website              │                                           │
│                      │                                           │
│  JOINED              │                                           │
│  March 2025          │                                           │
│                      │                                           │
├──────────────────────┴───────────────────────────────────────────┤
│  footer                                                          │
└──────────────────────────────────────────────────────────────────┘

Left sidebar: 320px, sticky (top: 80px)
Right main: fluid
Gap: 48px
Container: 1120px max

Updated layout includes:
- Sidebar: headline (italic), timezone with overlap, preferred stack bars, role pattern, "How They Build" (agent workflow)
- Content: aggregate impact row, split projects (currently building + shipped),
  shipping timeline, burn map, tribes, collaborator network
```

### Sidebar Details

```
Avatar: 88px, circle
  Below avatar (own profile): ghost button "Edit photo"

Name: h1 (Instrument Serif, 40px)
Handle: body-sm, text-tertiary, @prefixed

Role: h4 (Inter 600), text-secondary
  Below role: availability badge (status + dot)

Builder Score:
  Score number: mono 28px, tier-colored
  Label: caption, text-tertiary, "Builder Score"
  Clickable: opens score breakdown popover
    Popover shows: 5 horizontal bars (one per signal)
    Each bar: label (caption), value, colored segment
    Link: "How scores work →" (accent ghost)

Bio: body (15px), text-primary
  Max display: 4 lines, expandable "Read more" (accent ghost)

Section separators: 1px surface-secondary horizontal line, 20px vertical margin

Skills: wrapped skill tags (see component)
  Max shown: 8, "+N more" link

Availability: status dot + label
  🟢 Open to collaborate — shipped green
  🔵 Open to join a tribe — accent
  🟡 Busy — in-progress amber

Timezone: body-sm, text-secondary

Links: icon (16px, text-tertiary) + label (body-sm, accent)
  GitHub, Twitter/X, LinkedIn, Website — each with appropriate Lucide icon

Joined date: body-sm, text-tertiary

HOW THEY BUILD (agent workflow):
  Overline: "HOW THEY BUILD"
  Workflow label: body-sm, bg-accent-subtle, px-2.5, py-1, rounded-md
    e.g. "Pair builder" / "Swarm builder" / "Autonomous"
  Tools: wrapped tags (same style as skill tags but accent-subtle bg)
    e.g. "Claude Code" · "Cursor"
  Human/AI bar: single horizontal bar, 4px height, rounded-full
    Left segment: ink-tertiary (human proportion)
    Right segment: accent (AI proportion)
    Label below: "60% human · 40% AI" (caption, ink-tertiary)
  If no data: section hidden entirely (not "No data")
```

### Main Content Area

```
Sections stacked vertically, 48px gap.
Each section starts with overline label.

SHIPPED PROJECTS section:
  Grid: 2 columns (desktop), 1 column (tablet/mobile)
  Gap: 20px
  Cards: full project cards (see components.md)
  If no projects: empty state with "No projects yet" + "Add a project" CTA

BUILDING ACTIVITY (burn map) section:
  Overline: "BUILDING ACTIVITY"
  Container: surface-elevated, rounded-xl, p-6, shadow-sm
  Dot grid: 52 columns (weeks) × 7 rows (days), 10px cells, 2px gap
  Dot colors by activity level:
    0: surface-secondary (no activity)
    1-2: accent-subtle (low)
    3-5: accent-muted (medium)
    6+: accent (high)
  Summary stats below grid: "X active weeks · Y total events" (caption, ink-tertiary)
  If no events in 52 weeks: "No recent activity" (body-sm, ink-tertiary, centered)

COLLABORATORS section:
  List layout (not grid)
  Each row:
    [Avatar 36px]  Name (h4) · Role on project (body-sm, text-secondary)
    Hover: surface-secondary background
    Click: navigate to their profile
  Verified badge: small checkmark, accent, after name
  If none: "No collaborators yet"

TRIBES section:
  Compact tribe cards (name + role in tribe + member count)
  If none: "Not in any tribes yet"
```

### Mobile Layout

```
Stacked: everything in single column
Avatar: centered, 88px
Name + handle: centered
Score: centered, below name
Bio: full width
Skills: wrapped
Projects: 1 column cards
Sidebar info (availability, timezone, links): horizontal pills or compact list
```

---

## Edit Profile (`/settings/profile`)

Not a separate page from the profile — uses a settings page layout.

### Layout

```
Container: max-width 640px (editorial column)
Padding: 48px top

Page title: "Edit Profile" — h1 (Instrument Serif)
```

### Form Sections

Each section uses the overline pattern:

```
AVATAR
[Current avatar 88px]  [ Change photo ]  ← ghost button
                       [ Remove ]         ← ghost button, text-tertiary

BASICS
DISPLAY NAME    [ Maya Chen          ]
HANDLE          [ @mayachen          ]  ← read-only after creation
PRIMARY ROLE    [ Full-Stack Developer ▾ ]  ← select dropdown
HEADLINE        [ Building AI tools for small teams ]

ABOUT
BIO
[ Textarea with current bio... ]
Character count: body-sm, text-tertiary, right-aligned ("142 / 500")

SKILLS
[ Search and add skills... ]
Selected: tag row with × to remove
Minimum 3 required for profile completeness

AVAILABILITY
[ Select dropdown: Open to collaborate ▾ ]

TIMEZONE
[ Select dropdown: PST (UTC-8) ▾ ]

LINKS
GITHUB      [ https://github.com/mayachen    ]
TWITTER     [ https://twitter.com/mayachen   ]
WEBSITE     [ https://mayachen.dev           ]
Each: text input with icon prefix

                    [ Cancel ]  [ Save Changes ]
```

### Validation

```
Display name: required, 1-100 chars
Headline: max 200 chars
Bio: max 500 chars
Links: must be valid HTTPS URLs
Skills: min 3 recommended (warning, not blocking)

Errors shown inline below each field (see form validation component)
Success: toast "Profile updated"
```

---

## Public vs Own Profile

| Element | Own Profile | Other's Profile |
|---------|------------|-----------------|
| Edit button | Ghost button below avatar: "Edit Profile" | Not shown |
| Avatar | Clickable to change | Static |
| Availability | Shown | Shown |
| Contact links | Shown | Shown |
| Builder Score | Clickable → breakdown | Clickable → breakdown |
| Invite to project | Not shown | Ghost button: "Invite to project" |
| Invite to tribe | Not shown | Ghost button: "Invite to tribe" |
