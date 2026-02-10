# Prototype Spec: Find Your Tribe — Interactive HTML Prototype

## Goal

Build a single self-contained HTML file (`src/prototype/index.html`) that showcases the visual design of Find Your Tribe. It should demonstrate the "Editorial Confidence + Studio Warmth" aesthetic with real-looking sample data.

## Tech Constraints

- **Single HTML file** — everything inline (styles, scripts, markup)
- **Tailwind CSS via CDN** — `<script src="https://cdn.tailwindcss.com"></script>` with custom config
- **Google Fonts** — Instrument Serif, Inter, JetBrains Mono via `<link>`
- **Lucide Icons via CDN** — `https://unpkg.com/lucide@latest`
- **No build step** — open in browser and it works
- **Responsive** — must look good on mobile and desktop

## Design System (from specs/design/design-system.md)

### Colors (configure in Tailwind)
- Surface: primary `#f9f8f6`, secondary `#f2f0ed`, elevated `#ffffff`, inverse `#1c1917`
- Text: primary `#1c1917`, secondary `#57534e`, tertiary `#a8a29e`, inverse `#fafaf9`
- Accent: default `#6366f1`, hover `#4f46e5`, subtle `#eef2ff`
- Shipped: `#16a34a`, subtle `#f0fdf4`
- In-progress: `#d97706`, subtle `#fffbeb`

### Typography
- Headlines (h1, h2, display): Instrument Serif, weight 400
- Body/UI: Inter
- Technical: JetBrains Mono for skill tags, scores

### Rules
- No borders anywhere. Use shadows and background tints for depth.
- Generous whitespace. Content breathes.
- Border radius: 6px (tags), 8px (buttons/inputs), 12px (cards), 16px (modals)
- Shadows: warm-toned (`rgba(28,25,23,...)`)

## Pages to Build

Build these as sections in a single page, separated by clear dividers. Add a simple navigation at the top to jump between sections.

### 1. Landing Page Hero
- Logo: "find your tribe" in Instrument Serif, lowercase
- Headline: "Where builders find their people" — display size Instrument Serif
- Subtext: "Clout through building, not posting. Ship projects. Form tribes. Earn your score."
- CTA button: "Continue with GitHub" with GitHub icon (use SVG inline)
- Background: surface-primary

### 2. "How It Works" Section
- 3 step cards: "01 Ship", "02 Form", "03 Earn"
- Numbers large and faded (Instrument Serif, text-tertiary)
- Background: surface-secondary

### 3. Builder Card Grid (Discovery)
- Show 6 builder cards in a 3-column grid (responsive to 1 col on mobile)
- Each card: avatar placeholder (colored circle with initials), name, role, headline, 3 skill tags (JetBrains Mono), availability status, Builder Score (color-coded by tier)
- Use realistic sample data (diverse names, varied roles like Full-Stack Developer, Product Designer, Growth Marketer, Backend Engineer)

### 4. Project Card Grid
- Show 3 project cards
- Each: placeholder thumbnail (colored gradient), project title in Instrument Serif, description, tech stack tags, owner avatar + name, star count + status badge
- Status badges: one "Shipped" (green), one "In Progress" (amber)

### 5. Build Feed
- Max-width 640px centered
- Filter pills: All, Projects, Tribes, Builders
- 4 feed event cards:
  1. "shipped a project" — with embedded project card (thumbnail + title + tags)
  2. "started building a project" — no thumbnail, just title + tags
  3. "formed a tribe" — with open roles
  4. "joined Find Your Tribe" — with skill tags

### 6. Profile Page
- Two-column layout: 320px sidebar + fluid main
- Sidebar: large avatar, name (Instrument Serif), handle, role, Builder Score circle (64px, with tier color), bio, skill tags, availability, timezone, links
- Main: "SHIPPED PROJECTS" overline + 2 project cards, "COLLABORATORS" section with avatar rows

### 7. Tribe Detail
- Overline: "OPEN TRIBE"
- Name in Instrument Serif
- Mission text
- Two columns: Members list (with avatars, roles) + Open Roles cards with "Request to Join" buttons

## Sample Data

Use these builders (keep it diverse and realistic):

1. Maya Chen — Full-Stack Developer, Score 72, skills: React, Python, PostgreSQL
2. James Okafor — Product Designer, Score 58, skills: Figma, UI/UX, Prototyping
3. Priya Sharma — Backend Engineer, Score 65, skills: Go, Kubernetes, gRPC
4. David Morales — Growth Marketer, Score 41, skills: SEO, Analytics, Content
5. Sarah Kim — Frontend Developer, Score 49, skills: React, TypeScript, Next.js
6. Alex Rivera — DevOps Engineer, Score 35, skills: AWS, Terraform, Docker

Projects:
1. "AI Resume Builder" — React, FastAPI, PostgreSQL — Shipped, 142 stars
2. "Tribe Finder" — Next.js, Go, Redis — In Progress
3. "Open Source CRM" — Vue, Django, PostgreSQL — Shipped, 89 stars

Tribe: "Hospitality OS" — Maya Chen owner, James + Priya members, looking for Backend Engineer and Growth Marketer

## Quality Bar

- Must look polished — this is a design prototype, visual quality is everything
- Smooth hover transitions (200ms) on cards
- Proper type hierarchy — the Instrument Serif headlines should immediately look "editorial"
- Color-coded Builder Scores
- Responsive: test at 375px (mobile) and 1280px (desktop)
- Total file size should be reasonable (under 50KB of HTML/CSS/JS, excluding CDN assets)
