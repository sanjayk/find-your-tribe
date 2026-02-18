# Find Your Tribe -- Frontend

> Next.js 16 app with React 19, Tailwind CSS 4, and Apollo Client 4.

## Quick Start

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). The backend GraphQL API must be running at `http://localhost:8000/graphql`.

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start dev server (Turbopack) |
| `npm run build` | Production build |
| `npm run lint` | ESLint |
| `npm run test` | Vitest (watch mode) |
| `npm run test:run` | Vitest (single run) |

## Design System

The aesthetic is **Modern Editorial Luxury** -- warm sophistication, editorial typography, restrained minimalism.

- **Fonts:** DM Serif Display (headlines), DM Sans (body), IBM Plex Mono (code)
- **Colors:** Cream surfaces, terracotta accents, warm earth tones
- **Tokens:** Defined via Tailwind v4 `@theme` directive in `globals.css`

No borders. Use color, depth, and spacing for visual separation.

## Project Structure

```
src/
  app/                    # Pages (App Router)
    feed/                 # Build feed
    onboarding/           # Guided onboarding flow
    profile/[username]/   # Builder profiles
    settings/             # Profile settings
  components/
    ui/                   # shadcn/ui primitives
    layout/               # Nav, Footer
    features/             # Product components (AgentPanel, BurnHeatmap, etc.)
  lib/
    graphql/              # Apollo Client setup, queries, mutations, types
  test/                   # Test setup and utilities
```

## Conventions

- Server Components by default; `"use client"` only when needed
- Route `params` and `searchParams` are async -- always `await` them
- Components: `PascalCase`. Files: `kebab-case`. Hooks: `use` prefix.
- Tests co-located: `component.tsx` + `component.test.tsx`
