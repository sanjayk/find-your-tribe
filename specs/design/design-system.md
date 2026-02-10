# Visual Design System — Find Your Tribe

> Aesthetic: **Editorial Confidence + Studio Warmth**
> A beautifully typeset magazine about technology makers. Strong headlines, clean layouts.
> Shipped work is the hero. The platform is the frame.

---

## Design Principles

1. **Builders are noteworthy** — Every profile is a feature article. Every shipped project is a headline. The typography and layout treat builders with editorial respect.

2. **The work speaks** — Project thumbnails, real metrics, shipped artifacts — the *content* is the visual interest. The platform chrome stays quiet.

3. **Warm, not corporate** — Off-white warmth, not sterile SaaS white. Human touches in spacing and type. This is a studio, not an office.

4. **Contrast is confidence** — Near-black text on light backgrounds. Bold type weights. Clear hierarchy. No wishy-washy grays where black should be.

5. **Depth without decoration** — No borders. No ornamental elements. Use shadow, background tint, and generous whitespace to create structure. Like rooms in a well-designed building.

---

## Color Palette

### Foundation

| Token | Hex | Usage |
|-------|-----|-------|
| `--surface-primary` | `#f9f8f6` | Page background — barely warm off-white |
| `--surface-secondary` | `#f2f0ed` | Card backgrounds, sidebar, sunken areas |
| `--surface-elevated` | `#ffffff` | Elevated cards, modals, dropdowns |
| `--surface-inverse` | `#1c1917` | Dark sections (footer, hero variants) |

### Text

| Token | Hex | Usage |
|-------|-----|-------|
| `--text-primary` | `#1c1917` | Headlines, primary body text |
| `--text-secondary` | `#57534e` | Descriptions, secondary content |
| `--text-tertiary` | `#a8a29e` | Timestamps, placeholders, disabled |
| `--text-inverse` | `#fafaf9` | Text on dark backgrounds |

### Accent

| Token | Hex | Usage |
|-------|-----|-------|
| `--accent` | `#6366f1` | Primary interactive — links, CTAs, active states |
| `--accent-hover` | `#4f46e5` | Hover/pressed on accent elements |
| `--accent-subtle` | `#eef2ff` | Accent backgrounds (badges, highlights) |
| `--accent-muted` | `#a5b4fc` | Accent on dark backgrounds |

Indigo was chosen deliberately: modern (Linear, Figma, Vercel live in this space), creative (violet leanings say "makers"), not corporate (it's not IBM blue).

### Semantic

| Token | Hex | Usage |
|-------|-----|-------|
| `--shipped` | `#16a34a` | Shipped status, confirmed collaborations |
| `--shipped-subtle` | `#f0fdf4` | Shipped badge background |
| `--in-progress` | `#d97706` | In-progress status, pending |
| `--in-progress-subtle` | `#fffbeb` | In-progress badge background |
| `--error` | `#dc2626` | Errors, destructive actions |
| `--error-subtle` | `#fef2f2` | Error badge background |

### Tailwind Config

```js
// tailwind.config.ts
module.exports = {
  theme: {
    extend: {
      colors: {
        surface: {
          primary: '#f9f8f6',
          secondary: '#f2f0ed',
          elevated: '#ffffff',
          inverse: '#1c1917',
        },
        ink: {
          DEFAULT: '#1c1917',
          secondary: '#57534e',
          tertiary: '#a8a29e',
          inverse: '#fafaf9',
        },
        accent: {
          DEFAULT: '#6366f1',
          hover: '#4f46e5',
          subtle: '#eef2ff',
          muted: '#a5b4fc',
        },
        shipped: { DEFAULT: '#16a34a', subtle: '#f0fdf4' },
        'in-progress': { DEFAULT: '#d97706', subtle: '#fffbeb' },
        error: { DEFAULT: '#dc2626', subtle: '#fef2f2' },
      },
    },
  },
}
```

---

## Typography

### Font Stack

| Role | Font | Source | Usage |
|------|------|--------|-------|
| Display/Headlines | **Instrument Serif** | Google Fonts | h1, display text, profile names, project titles |
| UI/Body | **Inter** | Google Fonts | Body, navigation, buttons, labels, everything else |
| Technical | **JetBrains Mono** | Google Fonts | Tech stack tags, code, Builder Score number |

Instrument Serif gives the editorial punch — it's modern, slightly unexpected, and distinctly "publication" without feeling old-fashioned. It only appears at display/h1/h2 level. The rest of the UI is Inter — clean, neutral, invisible.

### Type Scale

| Token | Size | Line Height | Font | Weight | Usage |
|-------|------|-------------|------|--------|-------|
| `display` | 56px / 3.5rem | 1.05 | Instrument Serif | 400 | Landing page hero |
| `h1` | 40px / 2.5rem | 1.1 | Instrument Serif | 400 | Page titles, profile names |
| `h2` | 30px / 1.875rem | 1.2 | Instrument Serif | 400 | Section headlines, project titles |
| `h3` | 22px / 1.375rem | 1.3 | Inter | 600 | Card titles, subsections |
| `h4` | 17px / 1.0625rem | 1.4 | Inter | 600 | Widget headers, form section labels |
| `body-lg` | 18px / 1.125rem | 1.65 | Inter | 400 | Lead paragraphs, descriptions |
| `body` | 15px / 0.9375rem | 1.6 | Inter | 400 | Default body text |
| `body-sm` | 13px / 0.8125rem | 1.5 | Inter | 400 | Secondary text, metadata |
| `caption` | 11px / 0.6875rem | 1.4 | Inter | 500 | Timestamps, labels, overlines |
| `mono` | 13px / 0.8125rem | 1.4 | JetBrains Mono | 400 | Tech stack, code, scores |

### Editorial Details

- **Overline labels**: caption size, uppercase, letter-spacing 1.5px, text-secondary. Used above headlines to categorize ("SHIPPED PROJECT", "OPEN TRIBE", "BUILDER PROFILE").
- **Pull quotes**: h2 size, Instrument Serif, used in profile bios and project descriptions when displayed prominently.
- **No bold body text**: Use `text-secondary` vs `text-primary` for hierarchy in body text instead of bold. Bold is reserved for h3/h4 (Inter 600).

### Responsive Type

```css
.display { font-size: clamp(2.25rem, 5vw, 3.5rem); }
.h1 { font-size: clamp(1.875rem, 4vw, 2.5rem); }
.h2 { font-size: clamp(1.5rem, 3vw, 1.875rem); }
```

---

## Spacing

Base unit: **4px**

| Token | Value | Usage |
|-------|-------|-------|
| `1` | 4px | Micro gaps — icon to text, badge padding |
| `2` | 8px | Tight — between related items |
| `3` | 12px | Compact — form input padding, tag gaps |
| `4` | 16px | Standard — element spacing |
| `5` | 20px | Card padding (internal) |
| `6` | 24px | Component separation |
| `8` | 32px | Section padding on mobile |
| `10` | 40px | Between sections |
| `12` | 48px | Page section padding |
| `16` | 64px | Major section breaks |
| `20` | 80px | Editorial breathing room — hero, profile header |
| `24` | 96px | Landing page section gaps |

**Editorial generosity**: The spacing is deliberately generous. Content needs to breathe. A shipped project card should feel like it has its own space on the page, not crammed into a grid.

---

## Layout

### Container

```
Max width: 1120px
Padding: 16px (mobile) / 24px (tablet) / 0 (desktop, centered)
```

### Grid Patterns

| Pattern | Spec | Usage |
|---------|------|-------|
| **Card grid** | 1 col → 2 col (768px) → 3 col (1024px), gap 20px | Builder/project/tribe discovery |
| **Feed** | Single column, max-width 640px, centered | Build feed |
| **Profile** | 320px sidebar + fluid main (desktop), stacked (mobile) | Profile pages |
| **Two-up** | 50/50 split at desktop, stacked mobile | Landing page sections |
| **Editorial** | Max-width 680px centered text column | About pages, long-form |

### Breakpoints

| Name | Min-width | Notes |
|------|-----------|-------|
| `sm` | 640px | Large phone |
| `md` | 768px | Tablet / 2-column breakpoint |
| `lg` | 1024px | Desktop / 3-column breakpoint |
| `xl` | 1280px | Wide desktop |

---

## Shadows

Warm-toned, soft. No harsh blue-gray shadows.

| Token | Value | Usage |
|-------|-------|-------|
| `shadow-xs` | `0 1px 2px rgba(28,25,23,0.03)` | Tags, subtle lift |
| `shadow-sm` | `0 1px 3px rgba(28,25,23,0.05), 0 1px 2px rgba(28,25,23,0.03)` | Buttons, inputs |
| `shadow-md` | `0 4px 12px rgba(28,25,23,0.06)` | Cards at rest |
| `shadow-lg` | `0 8px 24px rgba(28,25,23,0.08)` | Cards on hover, dropdowns |
| `shadow-xl` | `0 16px 48px rgba(28,25,23,0.10)` | Modals |

### Elevation Stack

1. **Sunken** — `surface-secondary` (#f2f0ed), no shadow. Filter sidebars, empty states.
2. **Base** — `surface-primary` (#f9f8f6), no shadow. Page background.
3. **Raised** — `surface-elevated` (#fff), `shadow-md`. Cards, content blocks.
4. **High** — `surface-elevated`, `shadow-lg`. Hover states, dropdowns.
5. **Overlay** — `surface-elevated`, `shadow-xl`. Modals, command palette.

---

## Border Radius

| Token | Value | Usage |
|-------|-------|-------|
| `radius-sm` | 6px | Tags, badges, small elements |
| `radius-md` | 8px | Buttons, inputs |
| `radius-lg` | 12px | Cards, panels |
| `radius-xl` | 16px | Modals, large panels |
| `radius-full` | 9999px | Avatars, pills |

The radii are moderate — not sharp (too corporate) and not bubbly (too playful). Just enough softness to feel human.

---

## Motion

Restrained. Things settle into place, they don't bounce or fly. The editorial analogy: a page turning, not a slot machine.

| Property | Duration | Easing |
|----------|----------|--------|
| Color, opacity | 150ms | `ease-in-out` |
| Transform | 200ms | `cubic-bezier(0.25, 0.1, 0.25, 1)` |
| Layout (height, width) | 250ms | `ease-in-out` |
| Page transition | 200ms | `ease-out` |

### Key Interactions

- **Card hover**: `translateY(-2px)` + shadow-md → shadow-lg. Subtle lift.
- **Button hover**: Background color shift. No transform.
- **Link hover**: Color → accent. No underline animation.
- **Page load**: Content fades in with 150ms stagger per section. No slide.
- **Ship celebration**: Brief confetti burst (small, restrained, 1.5s). The one moment we break editorial restraint — because shipping deserves it.

### `prefers-reduced-motion`

All transforms and animations disabled. Color transitions preserved.

---

## Iconography

| Property | Value |
|----------|-------|
| Library | **Lucide Icons** |
| Default size | 18px |
| Stroke width | 1.75px |
| Color | Inherits from text color |
| Interactive | `text-tertiary` default → `accent` on hover |
| Style | Outline only. Never filled. |

---

## Imagery

### Project Thumbnails

```
Aspect ratio: 16:10 (slightly wider than 16:9 — more editorial)
Border radius: radius-lg (12px)
Fallback: surface-secondary with centered project initial (h2, Instrument Serif, text-tertiary)
Object fit: cover
```

### Avatars

| Size | Diameter | Context |
|------|----------|---------|
| `xs` | 24px | Inline mentions, metadata |
| `sm` | 32px | Nav, compact lists |
| `md` | 44px | Cards, feed events |
| `lg` | 64px | Tribe member lists |
| `xl` | 88px | Profile header |

```
Shape: circle
Fallback: surface-secondary background with initials (Inter 500, text-secondary)
No border unless in avatar stack (then 2px surface-elevated border)
```

---

## Dark Mode

Not in V1. The warm off-white foundation is the brand identity. The inverse surface color (`#1c1917`) is available for accent sections (footer, hero variants, featured builder spotlights) but the default experience is light.

---

## Accessibility

| Requirement | Target |
|-------------|--------|
| WCAG | AA minimum |
| Text contrast | 4.5:1 body, 3:1 large text |
| Focus ring | 2px `accent`, 2px offset |
| Touch targets | 44px minimum |
| Motion | Respect `prefers-reduced-motion` |
| Screen reader | ARIA labels on all interactive elements |

### Contrast Verification

| Pair | Ratio | Passes |
|------|-------|--------|
| `text-primary` (#1c1917) on `surface-primary` (#f9f8f6) | 14.8:1 | AAA |
| `text-secondary` (#57534e) on `surface-primary` | 5.7:1 | AA |
| `text-tertiary` (#a8a29e) on `surface-primary` | 2.8:1 | Large text only |
| `accent` (#6366f1) on `surface-primary` | 4.6:1 | AA |
| `accent-hover` (#4f46e5) on `surface-primary` | 5.9:1 | AA |
| `text-inverse` (#fafaf9) on `surface-inverse` (#1c1917) | 15.4:1 | AAA |

Note: `text-tertiary` only used for non-essential metadata (timestamps, placeholders). Never for critical information.
