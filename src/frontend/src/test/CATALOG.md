# Frontend Test Catalog

**708 tests** across **44 files** | 708 passed

## Pages (10 files)

| File | Tests | Coverage |
|------|------:|----------|
| `app/page.test.tsx` | 6 | Landing page — hero heading, subtitle, GitHub CTA, features section, pricing |
| `app/layout.test.tsx` | 9 | Root layout — font loading, Nav/Footer presence, GraphQLProvider wrapping |
| `app/feed/page.test.tsx` | 9 | Feed page — GET_FEED mock, event rendering (shipped, tribe created), timestamps |
| `app/profile/[username]/page.test.tsx` | 20 | Profile page — GET_BUILDER + GET_BURN_SUMMARY mocks, canvas for charts, builder data |
| `app/discover/page.test.tsx` | 8 | Discover page — GET_BUILDERS mock, builder listing, pagination |
| `app/(auth)/login/page.test.tsx` | 8 | Login page — form rendering, useAuth mock, email/password validation |
| `app/(auth)/signup/page.test.tsx` | 7 | Signup page — form rendering, useAuth mock, field validation |
| `app/project/[id]/page.test.tsx` | 11 | Project page — GET_PROJECT mock, tech stack, collaborators, GitHub stats |
| `app/tribe/[id]/page.test.tsx` | 10 | Tribe page — GET_TRIBE mock, members, mission, open roles |
| `app/onboarding/page.test.tsx` | 8 | Onboarding page — form steps, user context, completeOnboarding mutation |

## Feature Components (16 files)

| File | Tests | Coverage |
|------|------:|----------|
| `components/features/builder-card.test.tsx` | 23 | BuilderCard — featured/compact variants, name, skills, score, availability |
| `components/features/project-card.test.tsx` | 10 | ProjectCard — title, description, status (building/shipped), tech badges |
| `components/features/tribe-card.test.tsx` | 15 | TribeCard — name (serif), description, member avatars, open roles |
| `components/features/burn-heatmap.test.tsx` | 10 | BurnHeatmap — canvas rendering, 364-cell grid, intensity levels |
| `components/features/burn-map.test.tsx` | 12 | BurnMapDotGrid — compact/full modes, month labels, color intensity mapping |
| `components/features/burn-receipt.test.tsx` | 10 | BurnReceipt — weekly data, canvas sparkline, peak week metrics |
| `components/features/proof-card.test.tsx` | 14 | ProofCard — hero/standard variants, sparkline canvas, agent tools |
| `components/features/agent-panel.test.tsx` | 12 | AgentPanel — tool names, capabilities, workflow style display |
| `components/features/agent-workflow-card.test.tsx` | 8 | AgentWorkflowCard — null handling, tool pills, workflow badge, ratio |
| `components/features/score-display.test.tsx` | 10 | ScoreDisplay — large/inline variants, score number, label styling |
| `components/features/witness-credits.test.tsx` | 9 | WitnessCredits — witness list, initials, roles, project associations |
| `components/features/feed-item.test.tsx` | 11 | FeedItem — event types (shipped/joined/created), actor info, timestamp |
| `components/features/domain-tags.test.tsx` | 8 | DomainTags — tag rendering, empty array, count verification |
| `components/features/tech-badge.test.tsx` | 6 | TechBadge — pill/inline variants, styling, gap spacing |
| `components/features/shipping-timeline.test.tsx` | 8 | ShippingTimeline — project timeline, date ordering, status indicators |
| `components/features/collaborator-network.test.tsx` | 7 | CollaboratorNetwork — collaborators display, self-filtering |

## UI Primitives (8 files)

| File | Tests | Coverage |
|------|------:|----------|
| `components/ui/button.test.tsx` | 4 | Button — children, click events, data-slot, element type |
| `components/ui/avatar.test.tsx` | 5 | Avatar/Fallback/Badge/Group — subcomponents, data-slot |
| `components/ui/badge.test.tsx` | 4 | Badge — children, data-slot, span element, variants |
| `components/ui/card.test.tsx` | 7 | Card/Header/Footer/Title/Description/Content — subcomponents, className |
| `components/ui/input.test.tsx` | 5 | Input — element, data-slot, type handling, placeholder |
| `components/ui/dialog.test.tsx` | 5 | Dialog — trigger/content, open/close, header/title/description |
| `components/ui/dropdown-menu.test.tsx` | 5 | DropdownMenu — trigger/content, items, labels |
| `components/ui/tabs.test.tsx` | 4 | Tabs/TabsList/TabsTrigger/TabsContent — data-slot, switching |

## Layout Components (2 files)

| File | Tests | Coverage |
|------|------:|----------|
| `components/layout/nav.test.tsx` | 10 | Nav — logo, desktop links, scroll behavior, mobile menu |
| `components/layout/footer.test.tsx` | 8 | Footer — logo, tagline, social links, copyright |

## Hooks (1 file)

| File | Tests | Coverage |
|------|------:|----------|
| `hooks/use-auth.test.ts` | 10 | useAuth — login, logout, token storage, localStorage, router redirect |

## GraphQL Layer (5 files)

| File | Tests | Coverage |
|------|------:|----------|
| `lib/graphql/client.test.ts` | 8 | apolloClient — ApolloClient instance, InMemoryCache, HttpLink, ENV config |
| `lib/graphql/provider.test.tsx` | 4 | GraphQLProvider — ApolloProvider wrapping, client context delivery |
| `lib/graphql/types.test.ts` | 31 | Type definitions — all enums, interfaces, and response types validate as importable |
| `lib/graphql/queries/queries.test.ts` | 50 | 9 query documents — parseable, correct operation names, key fields present |
| `lib/graphql/mutations/mutations.test.ts` | 92 | 21 mutation documents — parseable, correct operation names, key fields present |

## Utilities (1 file)

| File | Tests | Coverage |
|------|------:|----------|
| `lib/utils.test.ts` | 14 | cn() — class merging, conditional classes, Tailwind conflict resolution, edge cases |
