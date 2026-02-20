# F3: Projects — Page Design

> See [design-system.md](./design-system.md) and [components.md](./components.md) for tokens.

---

## Project Detail Page (`/project/:id`)

The project page is the centerpiece of Find Your Tribe. This is where "clout through building" lives. Each project page should feel like a magazine feature spread — but also serve as the management surface for the project owner.

### Key Design Decision: One Page, Two Modes

The project detail page serves dual purpose:
- **Visitor view:** Only sections with content are rendered. Empty sections are hidden. The project looks complete regardless of data density.
- **Owner view:** All sections are visible. Empty sections show as prompts with inline "+ Add" affordances. The page IS the editor.

### Layout (Visitor View — Populated)

```
┌──────────────────────────────────────────────────────────────────┐
│  nav bar                                                         │
├──────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ● SHIPPED                                              ← status pill
│                                                                  │
│  AI Resume Builder                                      ← h1 (DM Serif Display, 40px)
│                                                                  │
│  One paragraph description that explains what this               │
│  project does and why it matters. Can wrap to                    │ ← body-lg, text-secondary
│  multiple lines. Max-width 680px.                                │   max-width 680px
│                                                                  │
│  Created by [Av] Maya Chen · Lead Developer · March 2025        │ ← body-sm, text-tertiary
│                                                                  │
│  ─────────────────────────────────────────────────────────────   │
│                                                                  │
│  ── TECH STACK ──────────────────────────────────────────────   │
│  [React] [FastAPI] [PostgreSQL] [GPT-4]                         │
│                                                                  │
│  ── DOMAIN ──────────────────────────────────────────────────   │
│  [devtools] [ai]                                                │
│                                                                  │
│  ── BUILT WITH ──────────────────────────────────────────────   │
│  AI Tools: [Claude Code] [Cursor]                               │
│  Style: [agent-driven] [solo-with-ai]                           │
│  Services: [Stripe] [Vercel] [Supabase]                         │
│                                                                  │
│  ── BUILD TIMELINE ──────────────────────────────────────────   │
│                                                                  │
│  Feb 1     ○  Started project                                   │
│  Feb 1-5   ■  45.2K tokens burned · Claude Code                 │
│  Feb 5     ○  Added Stripe integration                          │
│  Feb 6-10  ■  82.4K tokens burned · Claude Code                 │
│  Feb 10    ○  Deployed to Vercel                                │
│  Feb 15    ●  Launched on Product Hunt                          │
│                                                                  │
│  ── IMPACT ──────────────────────────────────────────────────   │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐                      │
│  │ 142      │  │ 1.2K     │  │ 5K       │                      │
│  │ stars    │  │ users    │  │ downloads│                      │
│  └──────────┘  └──────────┘  └──────────┘                      │
│                                                                  │
│  ── LINKS ───────────────────────────────────────────────────   │
│  → View source (GitHub)                                         │
│  → Visit site                                                   │
│  → Product Hunt                                                 │
│                                                                  │
│  ── COLLABORATORS ───────────────────────────────────────────   │
│  [Av] James Okafor · Designer           ✓ Confirmed            │
│  [Av] Priya Sharma · Backend Engineer   ✓ Confirmed            │
│                                                                  │
└──────────────────────────────────────────────────────────────────┘

Top section: editorial column, max-width 680px centered
All sections below: full container width (max 1080px)
Section headers: accent-line style (12px uppercase, text-tertiary, accent left bar)
Tag sections: inline pills, mono font
Timeline: vertical line with dots (see Build Timeline section below)
Impact: grid of metric cards (surface-secondary bg, rounded-xl)
Collaborators: person cards (surface-elevated, shadow-xs)
```

### Layout (Owner View — Just Created, Sparse)

```
┌──────────────────────────────────────────────────────────────────┐
│  nav bar                                                         │
├──────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ● IN PROGRESS                                                   │
│                                                                  │
│  AI Resume Builder                                               │
│                                                                  │
│  Created by [Av] You · Lead Developer · just now                │
│                                                                  │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │  [ ✏ Edit ]                 [ 👥 Invite Collaborators ]  │   │ ← owner action bar
│  └──────────────────────────────────────────────────────────┘   │   surface-secondary, ghost buttons
│                                                                  │
│  ── TECH STACK ───────────────────────────────── + Add tags     │
│  Add the technologies you used                   ← text-tertiary│
│                                                                  │
│  ── DOMAIN ───────────────────────────────────── + Add tags     │
│  What space is this project in?                  ← text-tertiary│
│                                                                  │
│  ── BUILT WITH ───────────────────────────────── + Add tags     │
│  What AI tools and services did you use?         ← text-tertiary│
│                                                                  │
│  ── BUILD TIMELINE ───────────────────────────── + Add milestone│
│  Tell the story of how you built this            ← text-tertiary│
│                                                                  │
│  ── IMPACT ───────────────────────────────────── + Add metrics  │
│  Users, revenue, downloads, stars                ← text-tertiary│
│                                                                  │
│  ── LINKS ────────────────────────────────────── + Add links    │
│  Repository, live site, app store                ← text-tertiary│
│                                                                  │
│  ── COLLABORATORS ────────────────────────────── + Invite       │
│  Invite builders you worked with                 ← text-tertiary│
│                                                                  │
└──────────────────────────────────────────────────────────────────┘

Empty sections: visible to owner only, hidden to visitors.
Each empty section: prompt text (text-tertiary) + "+ Add" action (accent, right-aligned in header).
Clicking "+ Add" opens inline editing (typeahead for tags, form for milestones/metrics).
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
    Pending: "Pending" caption, text-tertiary (visible to owner only)
  Click name → navigate to profile

If pending collaboration for current user (invitee visiting the page):
  Yellow highlight bar at top of collaborators section:
    "[Name] invited you to collaborate on this project"
    [ Accept ]  [ Decline ]
    Accept: accent button. Decline: ghost button.
```

### Invite Collaborators Flow (Owner)

Two paths: invite a platform member (search) or invite a non-member (copy link).

```
Clicking "+ Invite" or "Invite Collaborators" button opens inline panel
below the owner action bar:

  ┌────────────────────────────────────────────────────────────────┐
  │  INVITE A COLLABORATOR                        ← overline      │
  │                                                                │
  │  Search by name or username                                    │
  │  [ 🔍 Search builders...                                    ] │
  │                                                                │
  │  ┌────────────────────────────────────────────────────────┐   │ ← typeahead dropdown
  │  │  [Av] James Okafor · @jamesokafor                     │   │   (appears on typing)
  │  │  [Av] Priya Sharma · @priyasharma                     │   │
  │  │  [Av] David Morales · @davidmorales                   │   │
  │  └────────────────────────────────────────────────────────┘   │
  │                                                                │
  │  THEIR ROLE (optional)                                         │
  │  [ e.g., Designer, Growth Lead                             ]  │
  │                                                                │
  │                              [ Cancel ]  [ Send Invite ]      │
  │                                                                │
  │  ─── OR ───────────────────────────────────────────────────   │
  │                                                                │
  │  NOT ON THE PLATFORM YET?                     ← caption       │
  │  Copy a link to share via email, SMS, or WhatsApp.            │
  │                                                                │
  │  [ 🔗 Copy Invite Link ]                     ← ghost button  │
  │  "Copied!" toast appears on click                              │
  │                                                                │
  └────────────────────────────────────────────────────────────────┘

Panel: surface-elevated bg, radius-lg, shadow-sm, 24px padding
Search input: standard input, 16px font
Typeahead dropdown: surface-elevated, shadow-md, max 5 results
  Each result: avatar (28px) + name (h4) + username (body-sm, text-tertiary)
  Hover: surface-secondary bg
  Click: selects the user, dropdown closes, name appears as selected chip
Selected user: pill chip with avatar + name + × remove
Role input: standard input, text-tertiary placeholder
Send Invite: accent button, disabled until a user is selected
Copy Invite Link: ghost button with link icon, full width

After sending: panel closes, new collaborator row appears with "Pending" status.
After copying link: toast "Invite link copied to clipboard" (auto-dismiss 3s).
```

### Pending Invitation Discovery (Invitee)

Invitees discover pending invitations in three places:

**1. Project detail page (already covered above):**
Yellow highlight bar at top of collaborators section with Accept/Decline buttons.

**2. Profile page — Pending Invitations section:**
```
Appears at top of the profile page, only visible to the profile owner.
Only renders when the user has pending invitations.

  ┌────────────────────────────────────────────────────────────────┐
  │  PENDING INVITATIONS                          ← overline      │
  │                                                                │
  │  ┌──────────────────────────────────────────────────────────┐ │
  │  │  [Av] Maya Chen invited you to collaborate on            │ │
  │  │  AI Resume Builder · as Designer                         │ │
  │  │                           [ Decline ]  [ Accept ]        │ │
  │  └──────────────────────────────────────────────────────────┘ │
  │                                                                │
  │  ┌──────────────────────────────────────────────────────────┐ │
  │  │  [Av] James Okafor invited you to collaborate on         │ │
  │  │  Tribe Finder                                            │ │
  │  │                           [ Decline ]  [ Accept ]        │ │
  │  └──────────────────────────────────────────────────────────┘ │
  └────────────────────────────────────────────────────────────────┘

Each invitation card: surface-elevated, shadow-xs, radius-lg, 16px padding
Inviter: avatar (28px) + name (h4, text-primary)
Project title: accent color, clickable (links to project detail)
Role: body-sm, text-secondary (only shown if role was specified)
Accept: accent button. Decline: ghost button.
After action: card animates out. Section hides when no invitations remain.
```

**3. Nav badge:**
```
When the user has pending invitations, show a small dot indicator
on the profile/avatar nav item:

  [Av●]                                          ← small accent dot
                                                     top-right of avatar
                                                     8px, accent color
                                                     no count — just presence

Dot disappears when all invitations are resolved (accepted or declined).
```

---

## Create Project Page (`/projects/new`)

Dedicated page, not a modal. Lightweight form with only essential fields. After creation, redirects to the project detail page where the builder can progressively enrich.

Triggered from: Profile page "Add Project" button, nav, or onboarding flow.

```
┌──────────────────────────────────────────────────────────────────┐
│  nav bar                                                         │
├──────────────────────────────────────────────────────────────────┤
│                                                                  │
│  max-width: 600px, centered                                      │
│                                                                  │
│  CREATE PROJECT                                         ← overline (accent)
│  Ship something new                                     ← h1 (DM Serif Display)
│                                                                  │
│  TITLE *                                                         │
│  [ My Awesome Project                                 ]          │
│                                                                  │
│  STATUS                                                          │
│  ┌─────────────────┐  ┌─────────────────┐                       │
│  │  ● In Progress  │  │  ● Shipped      │               ← selectable cards
│  └─────────────────┘  └─────────────────┘                  default: In Progress
│                                                                  │
│  DESCRIPTION                                                     │
│  [ What does it do? Why does it matter?               ]  ← textarea, 120px min
│  [ Build something people want and tell us about it.  ]
│                                                                  │
│  YOUR ROLE                                                       │
│  [ Lead Developer                                     ]          │
│                                                                  │
│  LINKS                                                           │
│  REPOSITORY    [ https://github.com/...               ]          │
│  LIVE SITE     [ https://...                          ]          │
│                                                                  │
│                                        [ Create Project ]        │
│                                                                  │
│  Hint text below button (text-tertiary, 13px):                   │
│  "You can add tech stack, AI tools, milestones, and more         │
│   after creating."                                               │
│                                                                  │
└──────────────────────────────────────────────────────────────────┘

Page: surface-primary background
Form: max-width 600px, centered, generous vertical spacing (32px between fields)
No Cancel button — back navigation via browser/nav
Hint text reassures that this isn't the only chance to add details
After submit: redirect to /project/[new-id] (owner view with enrichment prompts)
```

### Form Validation

```
Validation is inline, shown below the field on blur or on submit attempt.

  TITLE *
  [                                                    ]
  ← error: "Title is required" (body-sm, error color, 4px top margin)

  LINKS
  REPOSITORY    [ http://github.com/...                ]
  ← error: "Links must use HTTPS" (body-sm, error color)

Error styling:
  - Error text: body-sm (13px), error color (#dc2626)
  - Input border: error color on the field with the error
  - No error icons — text is sufficient
  - Errors clear when the user starts typing in the field

Submit button: disabled while submitting (shows loading spinner).
If server returns an error: toast notification at top (error variant, auto-dismiss 5s).
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

## Build Timeline Component

The build timeline interleaves manual milestones with auto-tracked burn sessions. Vertical layout with a thin line connecting entries.

```
── BUILD TIMELINE ──────────────────────────── + Add milestone

  Feb 1     ○  Started project                          ← milestone (start type)
            │                                              line connecting to next
  Feb 1-5   ■  45.2K tokens · Claude Code               ← burn range (auto-tracked)
            │                                              surface-secondary bg pill
  Feb 5     ○  Added Stripe integration                 ← milestone (general)
            │
  Feb 6-10  ■  82.4K tokens · Claude Code               ← burn range
            │
  Feb 10    ○  Deployed to Vercel                       ← milestone (deploy type)
            │
  Feb 15    ●  Launched on Product Hunt                 ← milestone (launch type)
                                                          filled dot, accent color

Milestone types and their dots:
  start:     ○  hollow circle, accent border
  milestone: ○  hollow circle, ink-tertiary border
  deploy:    ○  hollow circle, shipped border
  launch:    ●  filled circle, accent color

Burn range entries:
  ■  small filled square, ink-tertiary
  Date range + token count + tool name
  Font: mono, 12px, text-tertiary
  If verification=extension_tracked: no label (trusted)
  If verification=self_reported: "· self-reported" suffix

Vertical line: 1px, ink/10 color, connects all entries
Date column: mono, 12px, text-tertiary, fixed width 80px
```

### Add Milestone Inline Form

```
Clicking "+ Add milestone" expands inline:

  ┌────────────────────────────────────────────────────────┐
  │  DATE         [ 2026-02-15    📅 ]                     │
  │  TITLE        [ Launched on Product Hunt             ] │
  │  TYPE         ( ) Start  ( ) Milestone  (•) Launch     │
  │                                                        │
  │                          [ Cancel ]  [ Add Milestone ] │
  └────────────────────────────────────────────────────────┘

  Surface-elevated bg, radius-lg, shadow-sm, 16px padding
  Appears at the bottom of the timeline
  After adding: form collapses, milestone appears in timeline at correct position
```

---

## "Built With" Section Design

Groups AI tools, build style, and services in one section.

```
── BUILT WITH ──────────────────────────────── + Add tags

  AI TOOLS                                    ← caption, text-tertiary
  [Claude Code] [Cursor]                      ← tag pills, mono, accent-subtle bg

  STYLE                                       ← caption, text-tertiary
  [agent-driven] [solo-with-ai]               ← tag pills, mono, surface-secondary bg

  SERVICES                                    ← caption, text-tertiary
  [Stripe] [Vercel] [Supabase]                ← tag pills, mono, surface-secondary bg

Subsection labels: 11px, uppercase, text-tertiary, 4px bottom margin
Tag pills: mono 11px, rounded-md, px-2.5 py-0.5
Vertical gap between subsections: 12px
```

---

## Tag Input Behavior

All tag fields (tech stack, domains, AI tools, build style, services) use the same input pattern: a typeahead with predefined suggestions that also allows custom entries.

```
Clicking "+ Add tags" on any tag section opens inline editing:

  ── TECH STACK ──────────────────────────────────────────────
  [React] [FastAPI] [×]  [PostgreSQL] [×]                ← existing tags with remove button
                                                            × appears on hover
  [ 🔍 Add a technology...                              ]  ← typeahead input
  ┌──────────────────────────────────────────────────────┐
  │  Python                                              │  ← matching suggestions
  │  PyTorch                                             │     from predefined list
  │  Prisma                                              │
  │  ──────────────────────────────────────────────────  │
  │  + Add "Py" as custom tag                            │  ← always available at bottom
  └──────────────────────────────────────────────────────┘

Input: standard text input, 14px, surface-elevated bg
Existing tags: inline pills with × remove on hover (16px, text-tertiary)
Typeahead dropdown: surface-elevated, shadow-md, max 5 suggestions
  Each suggestion: body, text-primary, hover: surface-secondary bg
  Custom entry: body, accent color, at bottom of list
  Appears after typing 1+ characters
  Filtered from predefined list (case-insensitive substring match)
Adding a tag: click suggestion or press Enter on custom → tag appears as pill, input clears
Removing a tag: click × on pill → tag removed
Closing: click outside or press Escape → inline editing closes, tags saved

Max tags per field: shown as count (e.g., "3 / 20") in text-tertiary
When max reached: input disabled, hint: "Maximum reached"
```

### Predefined Tag Lists

Suggestions are seeded from a predefined list. Builders can always add custom tags not on the list.

- **Tech Stack**: React, Next.js, Vue, Angular, Svelte, Node.js, Python, FastAPI, Django, Flask, Ruby, Rails, Go, Rust, Java, Spring, Swift, Kotlin, Flutter, React Native, TypeScript, PostgreSQL, MySQL, MongoDB, Redis, GraphQL, REST, Docker, Kubernetes, AWS, GCP, Azure, Terraform, Figma, Webflow, Framer, Tailwind, SASS
- **Domains**: fintech, devtools, health, education, ecommerce, saas, ai, climate, social, gaming, media, marketplace, enterprise, consumer, b2b, b2c, hospitality, real-estate, logistics, legal
- **AI Tools**: Claude Code, Cursor, ChatGPT, Copilot, Midjourney, DALL-E, Stable Diffusion, v0, Bolt, Lovable, Windsurf, Gemini, Perplexity, Devin, Claude
- **Build Style**: agent-driven, pair-programming, human-led, solo-with-ai, no-code, low-code, vibe-coded
- **Services**: Stripe, Supabase, Vercel, Netlify, Cloudflare, Resend, Twilio, Firebase, Auth0, Clerk, PlanetScale, Neon, Upstash, Convex, AWS S3, Sentry, PostHog, Mixpanel, Algolia, Pinecone

---

## Edit Project

Same page as detail page. Clicking "Edit" on the owner action bar opens an edit overlay/modal with the core fields pre-filled. Title changes to "Edit Project".

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
Max 6 projects shown, sorted: In Progress → Shipped → Archived (most recently updated within each group).

```
If builder has > 6 projects:

  [card] [card]
  [card] [card]
  [card] [card]

  View all projects →                     ← body-sm, accent color, right-aligned
                                             links to /projects?owner=username
```

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

---

## Responsive / Mobile Notes

All project pages are responsive. Key breakpoint behavior:

```
Breakpoints:
  sm: 640px   md: 768px   lg: 1024px   xl: 1280px

Project detail page:
  - Hero section (title, description, byline): always full width, max-width shrinks naturally
  - Tag sections: pills wrap to multiple lines on narrow screens
  - Impact metrics: stack vertically on mobile (1 column), 3 columns on desktop
  - Build timeline: date column shrinks from 80px to auto, text truncates if needed
  - Collaborators: single column on mobile
  - Owner action bar: buttons stack vertically on mobile (< 640px)

Create project page:
  - Form max-width 600px works well on all screens
  - On mobile (< 640px): full-width with 16px horizontal padding
  - Status cards: stack vertically on mobile if space is tight

Project cards:
  - Profile page: 1 column on mobile, 2 columns on desktop (md+)
  - Discovery page: 1 column on mobile, 2 on tablet (md+), 3 on desktop (lg+)

Invite collaborator panel:
  - Full width on mobile
  - Typeahead dropdown: full-width within panel
  - Copy invite link button: full width on mobile

General:
  - All padding scales down on mobile: 24px → 16px
  - Section headers: text wraps naturally, "+ Add" actions stay right-aligned
  - No horizontal scrolling — everything wraps or stacks
```
