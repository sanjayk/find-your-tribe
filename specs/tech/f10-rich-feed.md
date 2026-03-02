# RFC: F10 Rich Feed

> See [specs/product/f10-rich-feed.md](../product/f10-rich-feed.md) for product context.
> Depends on: [F6 Build Feed](../tech/f6-build-feed.md).

## Basic Example

Before (current EventCard — flat text dump):
```
┌────────────────────────────────────────────┐
│ SHIPPED                            1d ago  │
│ Shipped AI Resume Builder                  │
│ project / 01KJJ0QT88JYFTRF9EKBRDCDC1      │
└────────────────────────────────────────────┘
```

After (timeline with visual hierarchy):
```
 ○  Maya Chen  shipped                               2h ago
 │  ┌────────────────────────────────────────────────┐
 │  │  ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓  │
 │  │  AI Resume Builder                             │
 │  │  React · Python · OpenAI · PostgreSQL          │
 │  └────────────────────────────────────────────────┘
 │
 ○  Tom Nakamura  formed a tribe                      6h ago
 │  Hospitality OS
 │  Building the operating system for independent hotels
 │
 ○  James Okafor joined Hospitality OS               12h ago
 ○  Aisha Patel joined · UX / Prototyping / Analytics  3d
```

## Data Model

No new tables or columns. The feature consumes the existing `FeedEvent` model and its `event_metadata` JSONB field.

### Metadata Contract

The frontend relies on these metadata fields being present per event type. The seed data already provides most of them; gaps are identified below.

| Event Type | Required Metadata Fields | Currently Seeded? |
|---|---|---|
| `PROJECT_SHIPPED` | `project_title`, `tech_stack[]`, `actor_name`, `actor_username` | `actor_name` missing, `actor_username` missing |
| `PROJECT_CREATED` | `project_title`, `tech_stack[]`, `actor_name`, `actor_username` | `actor_name` missing, `actor_username` missing |
| `PROJECT_UPDATE` | `content`, `project_title`, `actor_name`, `actor_username` | N/A (no seeded events of this type) |
| `TRIBE_CREATED` | `tribe_name`, `mission`, `actor_name`, `actor_username` | `actor_name` missing, `actor_username` missing |
| `TRIBE_ANNOUNCEMENT` | `tribe_name`, `content`, `actor_name`, `actor_username` | N/A (no seeded events of this type) |
| `COLLABORATION_CONFIRMED` | `collaborator_name`, `project_title`, `actor_name`, `actor_username` | `actor_name` missing, `actor_username` missing |
| `MEMBER_JOINED_TRIBE` | `member_name`, `tribe_name`, `actor_name`, `actor_username` | Present (use `member_name` as actor display) |
| `BUILDER_JOINED` | `user_name`, `skills[]`, `actor_username` | `actor_username` missing |

## State Machine

N/A — feed events are immutable once created.

## API Surface

No new queries or mutations. The existing `GET_FEED` query already returns all required data:

```graphql
query GetFeed($limit: Int, $offset: Int) {
  feed(limit: $limit, offset: $offset) {
    id
    eventType
    targetType
    targetId
    metadata    # JSONB — contains all display data
    createdAt
  }
}
```

The `metadata` field is `JSON` scalar (Strawberry). The frontend extracts typed fields from it.

## Validation Rules

| Field | Constraints |
|-------|-------------|
| `actor_name` | Falls back to `actor_username` if missing; falls back to "A builder" if both missing |
| `project_title` | Falls back to "Untitled project" if missing |
| `tribe_name` | Falls back to "Untitled tribe" if missing |
| `tech_stack` | Falls back to empty array; renders nothing if empty |
| `skills` | Falls back to empty array; renders nothing if empty |
| `content` | Falls back to empty string; text card hidden if empty |

All fallbacks are client-side. The component never crashes on missing metadata.

## Security & Controls

- No new endpoints or mutations. Read-only feature.
- Feed data is already public — no auth gating changes needed.
- No user input processed; no injection vectors.

## Key Decisions

| Decision | Choice | Alternatives Considered | Rationale |
|----------|--------|------------------------|-----------|
| Layout | Vertical timeline with thread line connecting avatar nodes | Card stack (flat list of equal-weight cards) | Timeline gives a sense of progression and allows visual hierarchy. Milestones expand from the thread; activity lines sit tight against it. Matches editorial aesthetic. |
| Visual hierarchy | Four types: milestone, content embed, text, activity line | Uniform cards for all events | A ship event and a member-join are different in significance. Uniform treatment buries milestones and bloats routine activity. |
| Actor resolution | Extract from metadata (client-side) | Server-side dataloader on `actor` field | The `FeedEventType.actor` resolver returns `None` (TODO comment). Metadata already contains actor names. Adding a dataloader is a separate backend task. |
| Avatar rendering | Deterministic initials + color from name | Store avatar URLs in metadata | Initials match the existing avatar pattern across the app (discover, profile, tribes all use initials). No new data dependency. |
| Color generation | Hash actor name → pick from fixed 6-color palette | Store colors in metadata; random assignment | Deterministic means same actor always gets same color. Fixed palette of warm/earthy tones stays within the design system. |
| Gradient generation | Deterministic hash of project title → pick from curated 4-pair gradient palette | Store gradient colors in metadata; skip gradients entirely | Gradients give milestone cards visual weight. Curated palette ensures all combinations are tested against the warm surface background. No new data dependency. |
| Component architecture | Six named inline components within `page.tsx`: `FeedTimeline`, `TimelineNode`, `MilestoneCard`, `ContentEmbed`, `TextCard`, `ActivityLine` | Single `RichFeedItem` adapter mapping all types | Four visual types are distinct enough to warrant separate render functions. Named components make the code self-documenting and map directly to the design spec's hierarchy. |
| Navigation | Wrap feed items in `<Link>` to target detail page | onClick handler with router.push | `<Link>` gives prefetch, keyboard nav, and right-click "open in new tab" for free. |

## Drawbacks

- **Metadata coupling.** The frontend depends on specific metadata field names. If the backend changes field names, the feed silently degrades to fallbacks. Acceptable at current scale; a typed metadata schema would be the fix if this becomes a problem.
- **No actor photos.** Initials-only avatars are less visually engaging than real photos. But the app doesn't have avatar image uploads yet — initials are the established pattern.
- **Gradient palette is fixed.** Only 4 gradient pairs means projects with different titles may share the same gradient. Acceptable — the gradient is decoration, not identity.

## Search / Query Strategy

N/A — no new queries.

## Migration Strategy

N/A — no schema changes. The only backend change is enriching seed data metadata with `actor_name` and `actor_username` fields.

## File Impact

| File | Change | Owner |
|------|--------|-------|
| `src/frontend/src/app/feed/page.tsx` | Replace `EventCard` with timeline layout: `FeedTimeline`, `TimelineNode`, `MilestoneCard`, `ContentEmbed`, `TextCard`, `ActivityLine` (all inline), plus avatar/color/gradient utility functions. Update `FeedSkeleton` to match timeline shape. Add `<Link>` wrappers and hover states. | Frontend |
| `src/frontend/src/app/feed/page.test.tsx` | New test file covering: all 8 event type renderings by visual type, fallback behavior for missing metadata, navigation links, timeline structure, hover interactions | Frontend |
| `src/backend/app/seed/feed_events.py` | Add `actor_name` and `actor_username` to all event metadata objects | Backend |

Existing files NOT modified:
- `src/frontend/src/components/features/feed-item.tsx` — kept as-is (landing page showcase component)
- `src/frontend/src/lib/graphql/queries/feed.ts` — query already returns all needed fields
- `src/backend/app/graphql/types/feed_event.py` — no resolver changes

## Dependencies

- Existing `GET_FEED` query and `FeedEvent` model (F6)
- Existing `FeedItem` component as visual reference (not imported)
- Design tokens from `globals.css`

## Unresolved Questions

None.
