# Scaffold Next.js App

> Production Next.js 16 app with shadcn/ui, porting the design system from `src/prototype/index.html`.

## Scope

This spec covers ONLY scaffolding — no feature logic, no API integration, no authentication flows. All components render static/mock data.

## Library Versions

Use the LATEST versions of all libraries:
- **Next.js 16** (App Router, Turbopack default, `next lint` removed, async params)
- **React 19.2** (required by Next.js 16)
- **Tailwind CSS v4** (CSS-native `@theme` config, no `tailwind.config.ts`)
- **shadcn CLI 3.x** (`npx shadcn@latest`)
- **Apollo Client 4.x** (`@apollo/client@latest`)
- **Vitest 4.x** (testing framework)

## TDD Requirements

**All tasks MUST follow Test-Driven Development.** For each component or utility:

1. **Write the test first** — create the `.test.tsx` file before the implementation file
2. **Red** — the test should reference the component/function that doesn't exist yet and fail
3. **Green** — implement the minimum code to make the test pass
4. **Refactor** — clean up while keeping tests green

### Test Stack Setup (must be done as part of init)
- Install: `vitest @testing-library/react @testing-library/jest-dom @testing-library/user-event jsdom @vitejs/plugin-react`
- Create `vitest.config.ts` with jsdom environment
- Create `src/test/setup.ts` importing `@testing-library/jest-dom`
- Add `"test": "vitest"` and `"test:run": "vitest run"` to `package.json` scripts

### Test Requirements per Component
- **Every component** must have a co-located `.test.tsx` file
- **Minimum tests:** renders without crashing, renders correct content/text, variant switching (if applicable)
- **Layout components (Nav, Footer):** test renders logo, links, responsive elements
- **Feature components (BuilderCard, ProjectCard, etc.):** test both variants, test props rendering
- **Route pages:** test that each placeholder renders its expected heading
- **Utilities (cn helper, etc.):** unit tests for behavior

### Test Quality Gates
- `cd src/frontend && npx vitest run` must pass with 0 failures
- This is checked as part of acceptance criteria for every task

## Reference Files

- **Design source of truth:** `src/prototype/index.html`
- **Tech stack:** `specs/tech/overview.md`
- **Project conventions:** `CLAUDE.md`

---

## 1. Initialize Next.js App

Create a Next.js app in `src/frontend/` with latest versions:

```bash
npx create-next-app@latest src/frontend \
  --typescript \
  --tailwind \
  --eslint \
  --app \
  --src-dir \
  --import-alias "@/*" \
  --use-npm
```

This will install Next.js 16, React 19, Tailwind CSS v4, and Turbopack.

After init:
- Enable strict TypeScript in `tsconfig.json`: `"strict": true`
- Install ESLint separately if needed (Next.js 16 removed `next lint` — use `npx eslint .` directly)
- Install Vitest testing dependencies
- Create `vitest.config.ts` and `src/test/setup.ts`
- Add test scripts to `package.json`

**Acceptance criteria:**
- `cd src/frontend && npm run dev` starts without errors
- `cd src/frontend && npx tsc --noEmit` passes
- TypeScript strict mode enabled
- Vitest + Testing Library installed and configured
- `cd src/frontend && npx vitest run` executes (even if no tests yet)
- `vitest.config.ts` and `src/test/setup.ts` exist

---

## 2. Design System — Tailwind v4 CSS Theme + Global Styles

**IMPORTANT: Tailwind CSS v4 uses CSS-native configuration.** There is NO `tailwind.config.ts` file. All design tokens are defined via the `@theme` directive in CSS.

Port all design tokens from the prototype into `src/frontend/src/app/globals.css`.

### globals.css

```css
@import "tailwindcss";

@theme {
  /* Colors — surface */
  --color-surface-primary: #f9f8f6;
  --color-surface-secondary: #f2f0ed;
  --color-surface-elevated: #ffffff;
  --color-surface-inverse: #1c1917;

  /* Colors — ink */
  --color-ink: #1c1917;
  --color-ink-secondary: #57534e;
  --color-ink-tertiary: #a8a29e;
  --color-ink-inverse: #fafaf9;

  /* Colors — accent */
  --color-accent: #6366f1;
  --color-accent-hover: #4f46e5;
  --color-accent-subtle: #eef2ff;
  --color-accent-muted: #a5b4fc;

  /* Colors — status */
  --color-shipped: #16a34a;
  --color-shipped-subtle: #f0fdf4;
  --color-in-progress: #d97706;
  --color-in-progress-subtle: #fffbeb;
  --color-error: #dc2626;
  --color-error-subtle: #fef2f2;

  /* Fonts */
  --font-serif: "DM Serif Display", serif;
  --font-sans: "DM Sans", sans-serif;
  --font-mono: "IBM Plex Mono", monospace;

  /* Shadows — warm-tinted */
  --shadow-xs: 0 1px 2px rgba(28,25,23,0.03);
  --shadow-sm: 0 1px 3px rgba(28,25,23,0.05), 0 1px 2px rgba(28,25,23,0.03);
  --shadow-md: 0 4px 12px rgba(28,25,23,0.06);
  --shadow-lg: 0 8px 24px rgba(28,25,23,0.08);
  --shadow-xl: 0 16px 48px rgba(28,25,23,0.10);
}

body {
  background-color: var(--color-surface-primary);
  color: var(--color-ink);
  -webkit-font-smoothing: antialiased;
}

/* Type scale utilities */
.display {
  font-size: clamp(3rem, 7vw, 4.5rem);
  line-height: 1.0;
  letter-spacing: -0.02em;
}
.h1 { font-size: clamp(2rem, 4.5vw, 2.75rem); line-height: 1.08; letter-spacing: -0.015em; }
.h2 { font-size: clamp(1.5rem, 3vw, 1.875rem); line-height: 1.15; }
.body-lg { font-size: 1.125rem; line-height: 1.7; }
.body-sm { font-size: 0.8125rem; line-height: 1.55; }
.overline { font-size: 0.75rem; font-weight: 500; text-transform: uppercase; letter-spacing: 0.04em; }

/* Avatar system */
.avatar { border-radius: 9999px; display: flex; align-items: center; justify-content: center; font-weight: 500; flex-shrink: 0; }
.avatar-xs { width: 24px; height: 24px; }
.avatar-sm { width: 32px; height: 32px; }
.avatar-md { width: 44px; height: 44px; }
.avatar-lg { width: 64px; height: 64px; }
.avatar-xl { width: 96px; height: 96px; }

/* Card hover lift */
.card-lift {
  transition: transform 200ms cubic-bezier(0.25,0.1,0.25,1), box-shadow 200ms cubic-bezier(0.25,0.1,0.25,1);
}
.card-lift:hover {
  transform: translateY(-3px);
  box-shadow: 0 12px 32px rgba(28,25,23,0.10);
}

/* Accent decorative line */
.accent-line::before {
  content: '';
  display: block;
  width: 40px;
  height: 3px;
  background: var(--color-accent);
  margin-bottom: 20px;
  border-radius: 2px;
}

/* Focus ring */
*:focus-visible {
  outline: 2px solid var(--color-accent);
  outline-offset: 2px;
}

@media (prefers-reduced-motion: reduce) {
  .card-lift:hover { transform: none; }
}
```

With Tailwind v4, these `@theme` variables automatically create utility classes:
- `bg-surface-primary`, `text-ink-secondary`, `text-accent` etc.
- `font-serif`, `font-sans`, `font-mono`
- `shadow-md`, `shadow-lg`, `shadow-xl` etc.

**Acceptance criteria:**
- Custom colors available as Tailwind classes: `bg-surface-primary`, `text-ink-secondary`, `text-accent`
- Custom fonts available: `font-serif`, `font-sans`, `font-mono`
- Custom shadows available: `shadow-md`, `shadow-lg`
- Type scale utilities (`.display`, `.h1`, `.h2`) available
- Avatar size classes work
- No `tailwind.config.ts` file (Tailwind v4 CSS-native config only)

---

## 3. shadcn/ui Setup + Base Components

Initialize shadcn/ui in the frontend:

```bash
cd src/frontend && npx shadcn@latest init
```

Configuration:
- Style: New York
- Base color: Neutral
- CSS variables: yes

Install these base components:

```bash
npx shadcn@latest add button input card avatar badge dialog dropdown-menu tabs
```

**Acceptance criteria:**
- `src/frontend/components/ui/` contains button, input, card, avatar, badge, dialog, dropdown-menu, tabs
- Components import and render without errors
- `lib/utils.ts` exists with `cn()` helper

---

## 4. Layout Shell — Root Layout + Nav + Footer

### Root Layout (`src/frontend/src/app/layout.tsx`)

- Load Google Fonts via `next/font/google`: DM Serif Display, DM Sans, IBM Plex Mono
- Set CSS variables for fonts on `<html>` element
- Set metadata: title "Find Your Tribe", description
- Apply `font-sans` as default body font
- Wrap children with Nav + Footer

### Nav Component (`src/frontend/src/components/layout/nav.tsx`)

Port the navigation from the prototype:
- Sticky top, `bg-surface-primary`, max-width 1120px
- Logo: "find your tribe" in `font-serif`
- Desktop links: How It Works, Builders, Projects, Feed (hidden on mobile)
- Auth section: "Sign in" text link + "Join the waitlist" dark button
- Mobile: hamburger icon, full-screen overlay menu
- Shadow on scroll behavior (client component for scroll listener)

### Footer Component (`src/frontend/src/components/layout/footer.tsx`)

Port the footer from the prototype:
- Logo + tagline: "Clout through building, not posting."
- Links: About, GitHub, Twitter

**TDD — write tests first:**
- `nav.test.tsx`: renders logo text "find your tribe", renders desktop nav links, renders "Join the waitlist" button
- `footer.test.tsx`: renders logo, renders tagline "Clout through building, not posting.", renders About/GitHub/Twitter links

**Acceptance criteria:**
- Root layout renders Nav + children + Footer
- Fonts load correctly (DM Serif Display for serif, DM Sans for sans, IBM Plex Mono for mono)
- Nav is sticky with proper mobile/desktop responsive behavior
- Mobile menu opens/closes
- All layout component tests pass

---

## 5. Route Stubs

Create placeholder pages for every route from the tech overview. Each page should be a minimal Server Component with the route name displayed.

**IMPORTANT (Next.js 16):** Dynamic route `params` are async. Use `await params` in page components:

```tsx
export default async function ProfilePage({ params }: { params: Promise<{ username: string }> }) {
  const { username } = await params;
  return (
    <div className="max-w-[1120px] mx-auto px-5 md:px-6 py-20">
      <h1 className="font-serif h1 text-ink">Profile: {username}</h1>
      <p className="text-ink-secondary mt-4">Coming soon.</p>
    </div>
  );
}
```

Routes to create:
```
src/frontend/src/app/
├── page.tsx                    # Landing page (will be built in step 8)
├── (auth)/
│   ├── login/page.tsx          # "Login" placeholder
│   └── signup/page.tsx         # "Signup" placeholder
├── onboarding/page.tsx         # "Onboarding" placeholder
├── profile/[username]/page.tsx # "Profile for {username}" placeholder
├── project/[id]/page.tsx       # "Project {id}" placeholder
├── tribe/[id]/page.tsx         # "Tribe {id}" placeholder
├── discover/page.tsx           # "Discover" placeholder
└── feed/page.tsx               # "Feed" placeholder
```

**TDD — write tests first:**
- One test file per route page (e.g., `login/page.test.tsx`)
- Each test: renders the page heading, renders "Coming soon." text

**Acceptance criteria:**
- All routes resolve (no 404)
- Each page renders correct content
- Dynamic routes display their parameters (using async params)
- All route page tests pass

---

## 6. Custom Feature Components

Port these components from the prototype. Use static/mock data. Each component in `src/frontend/src/components/features/`.

### BuilderCard (`builder-card.tsx`)

Two variants:
1. **Featured** (large card) — avatar, name, title, bio, skills as tech badges, collaboration status, builder score
2. **List** (compact row) — avatar, name, title, score, skills as slash-separated text, status

Props:
```typescript
interface BuilderCardProps {
  name: string;
  initials: string;
  title: string;
  bio: string;
  skills: string[];
  score: number;
  status: 'open' | 'collaborating' | 'heads-down';
  avatarColor: string;
  avatarTextColor: string;
  variant: 'featured' | 'list';
}
```

### ProjectCard (`project-card.tsx`)

Two variants:
1. **Hero** (large with thumbnail) — gradient thumbnail, title, description, tech badges, collaborators with avatars, stars, shipped date
2. **Compact** (smaller with thumbnail) — compact version for supporting cards

### FeedItem (`feed-item.tsx`)

Renders a single feed event. Types: "shipped", "formed-tribe", "started-building", "joined".

### ScoreDisplay (`score-display.tsx`)

Builder score number display with large/inline/small variants.

### TribeCard (`tribe-card.tsx`)

Tribe display with: name, description, members (avatars), tech stack, open roles count.

### TechBadge (`tech-badge.tsx`)

Two variants: pill (bg badge) and inline (slash-separated text).

**TDD — write tests first for each component:**
- `builder-card.test.tsx`: renders name/title/bio for featured variant, renders name/score for list variant, renders skills, renders status badge
- `project-card.test.tsx`: renders title/description for hero variant, renders title for compact variant, renders tech badges
- `feed-item.test.tsx`: renders name + action text for each event type, renders timestamp
- `score-display.test.tsx`: renders score number for each variant (large/inline/small)
- `tribe-card.test.tsx`: renders tribe name, members, tech stack
- `tech-badge.test.tsx`: renders badge text for pill variant, renders with dividers for inline variant

**Acceptance criteria:**
- All components render without errors
- Both variants of each component work
- Props are properly typed
- Visual output matches prototype
- All component tests pass

---

## 7. Apollo Client Boilerplate

### Client Config (`src/frontend/src/lib/graphql/client.ts`)

```typescript
import { ApolloClient, InMemoryCache, createHttpLink } from '@apollo/client';

const httpLink = createHttpLink({
  uri: process.env.NEXT_PUBLIC_GRAPHQL_URL || 'http://localhost:8000/graphql',
});

export const apolloClient = new ApolloClient({
  link: httpLink,
  cache: new InMemoryCache(),
});
```

### Provider (`src/frontend/src/lib/graphql/provider.tsx`)

A `"use client"` component that wraps children with `ApolloProvider`.

### Placeholder files

Create empty query/mutation files as placeholders:
- `src/frontend/src/lib/graphql/queries/builders.ts`
- `src/frontend/src/lib/graphql/queries/projects.ts`
- `src/frontend/src/lib/graphql/queries/tribes.ts`
- `src/frontend/src/lib/graphql/queries/feed.ts`
- `src/frontend/src/lib/graphql/mutations/auth.ts`
- `src/frontend/src/lib/graphql/mutations/projects.ts`
- `src/frontend/src/lib/graphql/mutations/tribes.ts`

### Integration

Wrap the app in the Apollo Provider in root layout.

**Acceptance criteria:**
- Apollo Client 4 configured and exported
- Provider wraps the app
- Placeholder files exist
- App builds without errors (Apollo not actually querying anything)

---

## 8. Landing Page

Port the full landing page from `src/prototype/index.html` into Next.js components at `src/frontend/src/app/page.tsx`.

### Sections to port:

1. **Hero** — "Your reputation is what you build, not what you post." with subtitle, GitHub CTA, "See how it works" link, social proof stats (2,847 builders, 612 projects, 184 tribes)

2. **How It Works** — 3-column editorial numbered sections (01 Ship your work, 02 Form your tribe, 03 Earn your score)

3. **Builders** — Featured builder (Maya Chen) + 4 stacked list builders using BuilderCard components

4. **Projects** — Hero project card (AI Resume Builder) + 2 supporting cards using ProjectCard components

5. **Feed** — Narrow column with filter tabs + 4 feed events using FeedItem components

6. **Profile Preview** — Editorial magazine-style profile (Maya Chen) with sidebar + main content

7. **Tribe Preview** — Team feature article (Hospitality OS) with members + open roles

All data should be hardcoded as mock constants (same data as prototype). Use Lucide React for icons (`lucide-react`).

**TDD — write tests first:**
- `page.test.tsx` (landing page): renders hero heading text, renders social proof stats, renders "How It Works" section headings, renders Builders section, renders Projects section, renders Feed section

**Acceptance criteria:**
- Landing page renders all 7 sections
- Visual design matches prototype closely
- Responsive — works on mobile and desktop
- All custom components from step 6 are used
- Icons render via lucide-react
- Page is a Server Component (no "use client" unless needed for interactivity)
- Landing page tests pass
- `cd src/frontend && npx vitest run` — ALL tests pass with 0 failures
