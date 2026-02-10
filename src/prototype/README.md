# Prototype - Find Your Tribe

## Overview

This is a single-page HTML prototype demonstrating the navigation component and design system for Find Your Tribe.

## Navigation Component

The navigation component is located at the top of the `<body>` tag in `index.html` and includes:

### Features

- **Sticky positioning**: Stays at top on scroll with `position: sticky` and `z-index: 50`
- **Logo**: "find your tribe" in Instrument Serif, lowercase
- **Jump links**: Six navigation links (How It Works, Builders, Projects, Feed, Profile, Tribe)
- **Smooth scrolling**: Enabled via CSS `scroll-behavior: smooth` on `<html>` element
- **Active state**: Current section highlighted with accent color underline
- **Hover effects**: Links transition to accent color in 150ms
- **Scroll shadow**: Subtle shadow appears when page is scrolled
- **Mobile responsive**: Hamburger menu at 768px breakpoint

### Design System

- **Background**: `surface-elevated` (#ffffff)
- **Logo color**: `text-ink` (#1c1917)
- **Link colors**: `text-ink-secondary` (default), `text-ink` (hover/active)
- **Accent**: `#6366f1` for active underline
- **Height**: 56px (h-14)
- **Font**: Inter 500 for links, Instrument Serif for logo
- **Shadow**: `shadow-xs` when scrolled

### Mobile Menu

- **Trigger**: Hamburger icon button (hidden on desktop)
- **Overlay**: Full-screen with `surface-elevated` background
- **Links**: Large Instrument Serif text (3xl)
- **Close**: X button in top-right
- **Auto-close**: Menu closes when link is clicked

## Usage

Simply open `index.html` in a browser:

```bash
open src/prototype/index.html
```

No build step required. All dependencies loaded via CDN:
- Tailwind CSS
- Google Fonts (Instrument Serif, Inter, JetBrains Mono)
- Lucide Icons

## Testing

Test at these viewport sizes:
- **Mobile**: 375px - Hamburger menu should appear
- **Desktop**: 1280px - Horizontal navigation links should appear
