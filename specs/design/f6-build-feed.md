# F6: Build Feed — Page Design

> See [design-system.md](./design-system.md) and [components.md](./components.md) for tokens.

---

## Feed Page (`/feed`)

The heartbeat of the platform. A chronological stream of building activity — projects shipped, collaborations formed, tribes created. This is not Twitter. There are no text posts. Every item in the feed is an *artifact* of building.

### Layout

```
┌──────────────────────────────────────────────────────────────────┐
│  nav bar                                                         │
├──────────────────────────────────────────────────────────────────┤
│                                                                  │
│                    Build Feed                           ← h1 (Instrument Serif), centered
│                    What builders shipped today.         ← body-lg, text-secondary, centered
│                                                                  │
│                    All   Projects   Tribes   Builders   ← filter tabs (pill variant)
│                    ===                                            │
│                                                                  │
│              ┌──────────────────────────────────────┐            │
│              │                                      │            │
│              │  Feed Event Card                     │            │ ← max-width 640px
│              │                                      │            │    centered
│              └──────────────────────────────────────┘            │
│                                                                  │
│              ┌──────────────────────────────────────┐            │
│              │                                      │            │
│              │  Feed Event Card                     │            │
│              │                                      │            │
│              └──────────────────────────────────────┘            │
│                                                                  │
│              ┌──────────────────────────────────────┐            │
│              │                                      │            │
│              │  Feed Event Card                     │            │
│              │                                      │            │
│              └──────────────────────────────────────┘            │
│                                                                  │
│              ... infinite scroll ...                              │
│                                                                  │
└──────────────────────────────────────────────────────────────────┘

Container: max-width 640px, centered
Cards: stacked vertically, 16px gap
Padding: 48px top (below nav)
```

### Filter Tabs

```
Pill variant (not underline):
  All | Projects | Tribes | Builders

  Default: surface-secondary bg, text-secondary
  Active: accent-subtle bg, accent text
  Radius: radius-full
  Padding: 6px 14px
  Gap: 8px
  Font: body-sm, 500 weight

Filter mapping:
  All: no filter (all event types)
  Projects: project_created, project_shipped
  Tribes: tribe_created, member_joined_tribe
  Builders: builder_joined, collaboration_confirmed

Clicking a tab: instant filter, no page reload, smooth content transition
```

---

## Event Card Variants

Each event type has a specific layout. All share the base:

```
Background: surface-elevated
Radius: radius-lg (12px)
Shadow: shadow-md
Padding: 20px
Hover: shadow-lg (subtle, since these aren't clickable cards — content inside is)
```

### Project Shipped (highest emphasis)

The most important event. A builder shipped something. This gets the most visual weight.

```
┌──────────────────────────────────────────────────────┐
│                                                      │
│  [Av 44px]  Maya Chen shipped a project              │ ← "shipped" in 500 weight
│             2 hours ago                              │ ← caption, text-tertiary
│                                                      │
│  ┌──────────────────────────────────────────────┐    │
│  │                                              │    │
│  │  ┌────────────────────────────────────────┐  │    │
│  │  │       Project Thumbnail (16:10)        │  │    │ ← embedded project
│  │  └────────────────────────────────────────┘  │    │   surface-secondary bg
│  │                                              │    │   radius-md
│  │  AI Resume Builder                           │    │ ← h3 (Inter 600)
│  │  Build your resume with AI assistance.       │    │ ← body-sm, text-secondary
│  │                                              │    │
│  │  ┌──────┐ ┌────────┐ ┌──────┐               │    │
│  │  │React │ │FastAPI │ │PG    │               │    │ ← skill tags
│  │  └──────┘ └────────┘ └──────┘               │    │
│  │                                              │    │
│  │  ⭐ 142  ·  👤 1.2k users                   │    │ ← caption, text-tertiary
│  │                                              │    │
│  └──────────────────────────────────────────────┘    │
│                                                      │
└──────────────────────────────────────────────────────┘

Thumbnail shown for shipped projects (if available).
Embedded card: surface-secondary bg, radius-md, 16px padding.
Entire embedded card is clickable → project page.
```

### Project Created

Same layout as shipped but without thumbnail. Lower visual weight.

```
┌──────────────────────────────────────────────────────┐
│                                                      │
│  [Av 44px]  James Okafor started building a project  │
│             5 hours ago                              │
│                                                      │
│  ┌──────────────────────────────────────────────┐    │
│  │  Tribe Finder                                │    │ ← no thumbnail
│  │  Discover co-builders near you.              │    │
│  │  ┌────────┐ ┌──────┐                        │    │
│  │  │Next.js │ │Go    │                        │    │
│  │  └────────┘ └──────┘                        │    │
│  └──────────────────────────────────────────────┘    │
│                                                      │
└──────────────────────────────────────────────────────┘
```

### Collaboration Confirmed

Two builders confirmed they worked together. Shows both people.

```
┌──────────────────────────────────────────────────────┐
│                                                      │
│  [Av 36px][Av 36px]                                  │ ← two avatars, overlapping -8px
│  Maya Chen and Priya Sharma are collaborating        │
│  on AI Resume Builder                                │ ← project name in 500 weight
│  1 day ago                                           │
│                                                      │
└──────────────────────────────────────────────────────┘

Simpler card. No embedded card — just the text.
Project name is a link → project page.
Both names are links → profile pages.
```

### Tribe Created

```
┌──────────────────────────────────────────────────────┐
│                                                      │
│  [Av 44px]  Maya Chen formed a tribe                 │
│             3 days ago                               │
│                                                      │
│  ┌──────────────────────────────────────────────┐    │
│  │  Hospitality OS                              │    │ ← h3
│  │  Reimagining hotel operations for AI era.    │    │ ← body-sm, text-secondary
│  │                                              │    │
│  │  Looking for:                                │    │ ← caption, text-tertiary
│  │  Backend Engineer · Designer                 │    │ ← body-sm, text-primary
│  │                                              │    │
│  │  [ View Tribe → ]                            │    │ ← accent ghost, sm
│  └──────────────────────────────────────────────┘    │
│                                                      │
└──────────────────────────────────────────────────────┘

Embedded tribe summary: surface-secondary bg.
Open roles listed to attract interest.
```

### Member Joined Tribe

```
┌──────────────────────────────────────────────────────┐
│                                                      │
│  [Av 44px]  David Morales joined Hospitality OS      │
│             as Growth Marketer                       │ ← role in text-secondary
│             12 hours ago                             │
│                                                      │
└──────────────────────────────────────────────────────┘

Simple text event. Tribe name is a link.
```

### Builder Joined

```
┌──────────────────────────────────────────────────────┐
│                                                      │
│  [Av 44px]  David Morales joined Find Your Tribe     │
│             Growth Marketer · Score: 15              │
│             1 day ago                                │
│                                                      │
│             ┌──────┐ ┌───────────┐ ┌──────┐         │
│             │SEO   │ │Analytics  │ │Growth│         │
│             └──────┘ └───────────┘ └──────┘         │
│                                                      │
└──────────────────────────────────────────────────────┘

Shows skills to help discoverability.
Name is a link → profile.
```

---

## Infinite Scroll

```
Trigger: IntersectionObserver, 300px from page bottom
Loading: 3 skeleton feed cards (same dimensions as real cards)
End of feed:
  "You've seen everything."               ← body-sm, text-tertiary, centered
  "Come back later or ship something      ← body-sm, text-tertiary
   to get on the feed."
  40px padding above and below
```

---

## Empty Feed

```
Container: centered, max-width 400px, 80px padding top

  [Activity icon, 48px, text-tertiary]

  Nothing here yet                         ← h2 (Instrument Serif)
  Be the first to ship something.          ← body, text-secondary

  [ Add a Project ]   ← primary button
  [ Create a Tribe ]  ← secondary button

  Buttons stacked vertically, 12px gap, centered
```

---

## Mobile Feed

```
Same layout, just more padding:
  Container: 16px horizontal padding
  Cards: full width
  Tabs: horizontal, scrollable if needed (though they fit)
  Gap between cards: 12px (tighter on mobile)
```

---

## Feed Freshness

No real-time updates in V1. Pull-to-refresh on mobile (native scroll behavior).

When user returns to feed tab after being away:
  Subtle banner at top: "New activity since you left · [ Refresh ]"
  Banner: accent-subtle bg, accent text, body-sm, 12px padding, radius-md
  Clicking "Refresh": smooth scroll to top + refetch
