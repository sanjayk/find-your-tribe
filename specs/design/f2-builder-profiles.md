# F2: Builder Profiles — Page Design

> See [design-system.md](./design-system.md) and [components.md](./components.md) for tokens.

---

## Core Principle: Tokens Are the Universal Unit of Work

Every builder on Find Your Tribe uses AI agents. Whether they write code, design interfaces, craft marketing campaigns, write legal contracts, or manage products — they all burn tokens to build. **Token burn is the universal, discipline-agnostic proof of work.** It is to Find Your Tribe what the contribution graph is to GitHub, except it works for every role, not just engineers.

This is the platform's fundamental differentiator. We do not track commits, hours logged, or self-reported activity. We track the one thing all agentic builders have in common: tokens burned to ship.

---

## Trust Hierarchy: PROVE → VOUCH → STATE

The profile is not a resume. It is a **trust document**. Every element answers: "Can I trust this person to build with me?"

The information hierarchy is ordered by how hard each signal is to fake:

| Layer | What it is | Trust weight | % of page |
|-------|-----------|-------------|-----------|
| **PROVE** | Burn pattern + shipped projects | Hard evidence | ~70% |
| **VOUCH** | Tribe membership + collaborators who witnessed the building | Social proof | ~20% |
| **STATE** | Skills, availability, links, workflow style | Self-reported context | ~10% |

Everything above the fold is PROVE. The page answers one question in 3 seconds: **"Does this person ship?"**

---

## Entity Relationships

```
User ──is member of──▶ Tribe ──ships──▶ Project ◀──attributed to── BuildActivity
  │                                        │
  │                                        ├── has collaborators (Users)
  │                                        │   └── "witnessed by" derives from this
  │                                        │
  │                           ┌────────────┘
  │                           │
  └── owns solo Projects ─────┘  (project.tribe_id = null)
```

**Key relationships for the profile:**

- **Tribe ships projects.** A tribe is a team that ships together. Projects have an optional `tribe_id`. A tribe's credibility = its shipped projects.
- **Witnessed by = project collaborators.** If Maya and James are both on a project's collaborator list, James is a witness to Maya's building. Higher trust when the project is a tribe project (persistent relationship, not one-off).
- **Burn is attributed to projects.** Each BuildActivity record can have a `project_id`. The per-project sparkline shows how much effort went into that specific work.
- **Solo vs tribe projects.** A project with `tribe_id = null` is solo work. A project with `tribe_id` was built by a team.

---

## Profile Page (`/builders/:handle`)

The flagship page. Full-width editorial flow — no sidebar. Everything flows top to bottom in reading order. The hierarchy is enforced by scroll position.

### Desktop Layout

```
┌────────────────────────────────────────────────────────────────┐
│  nav bar                                                        │
├────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌─ IDENTITY STRIP ─────────────────────────────────────────┐  │
│  │ [Avatar 80px]   Maya Chen                                 │  │
│  │                 @mayachen                                  │  │
│  │                 Building AI tools for small teams.         │  │
│  │                 🟢 Open to tribe · 72 builder score       │  │
│  └───────────────────────────────────────────────────────────┘  │
│                                                                  │
│  ── SHIPPING ACTIVITY ──────────────────────────────────────── │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │  Burn heatmap (52 weeks × 7 days)                         │  │
│  │  ░░░░▒▒▓▓██▓▓▒░░▒▒▓▓██████▓▓▒░░░▒▓████████▓▓████████   │  │
│  │  Mar  Apr  May  Jun  Jul  Aug  Sep  Oct  Nov  Dec  Jan    │  │
│  │                                                            │  │
│  │  ┊Env Sync┊  ┊Latency┊ ┊Schema┊ ┊CodeReview┊ ┊Tribe F┊  │  │
│  │  ─────────────────────────────────────────────────────     │  │
│  │  247 days active · 1.2M tokens · 89% weekly streak        │  │
│  └───────────────────────────────────────────────────────────┘  │
│                                                                  │
│  ── PROOF OF WORK ──────────────────────────────────────────── │
│  ┌──────────────────────────────────────┬──── BURN RECEIPT ──┐  │
│  │ ● Currently building                 │  Duration: 14 wks  │  │
│  │ Tribe Finder                         │  Tokens: 485K      │  │
│  │ AI-powered matching engine...        │  Peak: 52K/wk      │  │
│  │ Python · FastAPI · pgvector          │  ~~sparkline~~     │  │
│  │ [MC] [JO] [PS] 3 builders            │                    │  │
│  │ via Buildspace Alumni                │                    │  │
│  └──────────────────────────────────────┴────────────────────┘  │
│                                                                  │
│  ┌─────────────────────────┐ ┌─────────────────────────────┐  │
│  │ ● Shipped               │ │ ● Shipped                   │  │
│  │ CodeReview Bot           │ │ Schema Forge                │  │
│  │ Automated PR reviewer... │ │ Visual schema designer...   │  │
│  │ 420K tokens · 13 wks    │ │ 310K tokens · 11 wks       │  │
│  └─────────────────────────┘ └─────────────────────────────┘  │
│                                                                  │
│  ── WITNESSED BY ───────────────────────────────────────────── │
│  ┌──────────────────────────┐ ┌────────────────────────────┐  │
│  │ [JO] James Okafor        │ │ [PS] Priya Sharma          │  │
│  │ Product Designer          │ │ Backend Engineer           │  │
│  │ · Tribe Finder (design)  │ │ · Tribe Finder (API)      │  │
│  │ · Schema Forge (UI)      │ │ · Latency Dash (pipeline) │  │
│  │ · CodeReview Bot (UX)    │ │                            │  │
│  └──────────────────────────┘ └────────────────────────────┘  │
│                                                                  │
│  ── TRIBES ─────────────────────────────────────────────────── │
│  ┌─────────────────────────────────────────────────────────┐  │
│  │ Buildspace Alumni · 12 builders · 4 projects shipped     │  │
│  │ [MC] [JO] [PS] [+9]                                      │  │
│  └─────────────────────────────────────────────────────────┘  │
│                                                                  │
│  ── skills · workflow · links ──────────────────────────────── │
│  Python · TypeScript · React · PostgreSQL · FastAPI · ...      │
│  Pair builder · Claude Code, Cursor · 55% human / 45% AI      │
│  GitHub · Twitter · Website · PST (UTC-8) · Joined Mar 2025   │
│                                                                  │
├────────────────────────────────────────────────────────────────┤
│  footer                                                          │
└────────────────────────────────────────────────────────────────┘

Container: 960px max
Full-width flow — no sidebar
Padding: 24px horizontal
```

---

### PROVE: Identity Strip

```
Layout: flex, horizontal, gap 24px
Top padding: 48px

Avatar: 80px, circle
  If no avatar: initials on gradient (accent-subtle → accent-muted)
  Own profile: ghost button "Edit photo" below

Name: h1, font-serif, 36px, -0.01em tracking
Handle: body-sm, ink-tertiary, @prefixed
Headline: body (16px), ink-secondary, line-height 1.5, margin-top 8px

Meta row: flex, gap 20px, margin-top 12px
  Availability badge: pill, shipped-subtle bg, shipped text, dot + label
  Builder score: mono 14px, accent, "72 builder score"
  Timezone: mono 13px, ink-tertiary
```

---

### PROVE: Shipping Activity (Burn)

The burn visualization is the first major section. It answers "does this person ship?" at a glance. **The unit is tokens burned — the universal measure of agentic building.**

```
Section label: "Shipping activity" (overline with trailing line)

Container: surface-elevated, rounded-xl (16px), p-8, shadow-sm

Burn heatmap:
  52 columns (weeks) × 7 rows (days)
  Cell size: 11px, gap: 3px, rounded: 2px
  Colors by token intensity (daily tokens burned):
    0:     surface-secondary (no activity)
    1-99:  accent-subtle (light day)
    100-499: accent-muted (moderate)
    500-999: accent at 70% opacity (heavy)
    1000+:   accent (intense)
  Hover: cell scales 1.4x, tooltip shows date + token count
  Legend: "Less ░▒▓█ More" in top-right

Month labels: below grid, mono 10px, ink-tertiary

Project markers: below months
  Each shipped/in-progress project marked at its time span midpoint
  Marker: colored dot (shipped=green, in-progress=amber) + rotated label
  Connects burn intensity to specific output — "this peak was Tribe Finder"

Summary stats: below markers, separated by top border
  Flex row, gap 32px
  Each stat: mono 20px value + uppercase 11px label
  Stats: Days active · Tokens burned · Weekly streak · Projects shipped
  If no activity: "No building activity yet" centered
```

---

### PROVE: Projects (Proof of Work)

Projects are the substance behind the burn signal. Each project card includes a **burn receipt** — a sparkline and stats showing the effort that went into it. This connects the macro burn signal to specific output.

```
Section label: "Proof of work" (overline with trailing line)

Featured card (currently building or most recent shipped):
  Full-width, surface-elevated, rounded-xl, shadow-sm
  Grid: content (left) + burn receipt (right, 260px)

  Content side:
    Status: "Currently building" (amber) or "Shipped" (green)
      Dot (5px) + uppercase 11px label
    Title: font-serif, 24px
    Description: 14px, ink-secondary, line-height 1.65
    Tech stack: mono 11px tags, surface-secondary bg
    Footer: collaborator avatars (24px, overlapping) + count label
    Tribe attribution: "via Buildspace Alumni" if tribe project

  Burn receipt side:
    Background: surface-primary
    Border-left: 1px surface-secondary
    Label: "Burn receipt" (uppercase 10px, ink-tertiary)
    Sparkline: 40px height, smooth bezier curve
      In-progress: amber (#d97706)
      Shipped: green (#16a34a)
    Stats list:
      Duration: "14 weeks"
      Tokens: "485K"
      Peak week: "52K"

Regular cards (2-column grid, gap 16px):
  Compact version: status, title, description, burn row
  Burn row: inline sparkline + "310K tokens · 11 wks" (mono 10px, ink-tertiary)

Card interactions:
  Hover: translateY(-2px), shadow-md
  Click: navigate to project detail page

Solo vs tribe projects:
  Tribe projects show "via [Tribe Name]" below collaborators
  Solo projects show no tribe attribution
```

---

### VOUCH: Witnessed By

Witnesses are collaborators who built alongside this person. They are derived from `project_collaborators` — not a separate entity. Each witness card shows which projects they co-built, making the social proof evidence-based, not just a name on a list.

```
Section label: "Witnessed by" (overline with trailing line)

Grid: 2 columns, gap 24px

Witness card: surface-elevated, rounded-xl, p-6, shadow-sm
  Header: avatar (44px) + name (15px, 500) + role (12px, ink-tertiary)
  Evidence list: below header, separated by top border
    Each row: dot (4px, shipped green) + project name + role on that project
    "Tribe Finder — design lead"
    "Schema Forge — UI design"

If no collaborators: section hidden (not "No witnesses")
```

---

### VOUCH: Tribes

Tribes are shown with their shipped output — not just a name and member count. A tribe without projects is just a group chat. A tribe with shipped projects is a studio.

```
Section label: "Tribes" (overline with trailing line)

Tribe chip: surface-elevated, rounded-xl, p-4, shadow-sm
  Flex row: name (font-serif, 16px) + member count (mono 11px) + project count
  Member avatars: overlapping 24px circles on the right
  Key metric: "X projects shipped" (only if > 0)

  Hover: translateY(-1px), shadow-md
  Click: navigate to tribe page
```

---

### STATE: Skills, Workflow, Links

Lowest trust weight — self-reported claims. Kept minimal and pushed to the bottom.

```
Border-top: 1px surface-secondary
Padding-top: 48px
Grid: 3 columns, gap 32px

Column 1 — Skills:
  Overline: "Skills"
  Wrapped tags: 12px, ink-secondary, surface-secondary bg, rounded-md (6px), py-1.5 px-3
  Max shown: 10

Column 2 — How they build:
  Overline: "How they build"
  Workflow label: 13px, ink-secondary ("Pair builder")
  Tool tags: accent-subtle bg
  Human/AI bar: 4px height, rounded-full
    Left segment: ink-tertiary (human)
    Right segment: accent (AI)
    Label below: "55% human · 45% AI" (mono 11px, ink-tertiary)
  If no data: column hidden

Column 3 — Links & info:
  Overline: "Links"
  Stacked list: label (uppercase 10px, ink-tertiary) + value (13px, accent for links)
  GitHub, Twitter, Website, Timezone, Joined date
```

---

### Mobile Layout

```
Stacked: single column, no grid
Identity: avatar centered (80px), name + handle centered
Meta: badges stacked or wrapped
Burn heatmap: horizontal scroll if needed, or condensed to weekly summary bars
Projects: single column, receipt panel stacks below content
Witnesses: single column cards
Tribes: full-width chips
STATE: single column, each block stacked
```

---

## Edit Profile (`/settings/profile`)

Not a separate page from the profile — uses a settings page layout.

### Layout

```
Container: max-width 640px (editorial column)
Padding: 48px top

Page title: "Edit Profile" — h1 (DM Serif Display)
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

HOW YOU BUILD
WORKFLOW STYLE    [ Pair builder ▾ ]
AI TOOLS          [ Search and add... ] → tags with × to remove
HUMAN/AI RATIO    [ Slider 0-100% ] with live preview bar

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

---

## Prototypes

Interactive HTML prototypes live in `playground/`:

- **`concept-a-timeline.html`** — Burn as a continuous waveform with project markers pinned to the timeline. Burn is the visual spine; projects hang off it.
- **`concept-b-proof.html`** — GitHub-style heatmap grid alongside identity, with burn receipts embedded in each project card. Each project carries its own proof.

Both implement the PROVE → VOUCH → STATE hierarchy. Open in browser to evaluate.
