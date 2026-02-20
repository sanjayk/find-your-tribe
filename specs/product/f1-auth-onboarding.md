# F1: Authentication & Onboarding

## Context

This spec covers the authentication and onboarding features for **Find Your Tribe**, a proof-of-work social network for builders. For full product vision, positioning, personas, and success metrics, see [overview.md](./overview.md). For the complete PRD, see [../PRD.md](../PRD.md).

**Find Your Tribe** is a platform where your identity is defined by what you have shipped, not what you claim. Your profile is your portfolio. Your reputation is earned through shipped projects and verified collaborations. The platform answers: **What have you actually built, and who did you build it with?**

---

## Feature Summary

Authentication and onboarding are the entry point for every builder on the platform.

**Authentication** uses Firebase Auth as the primary method, supporting Google and GitHub OAuth. This gives universal coverage — GitHub for engineers, Google for everyone else (designers, PMs, founders, marketers). There are no passwords to manage, no forgot-password flows, no email verification. A home-grown email/password auth system exists as an unexposed fallback for development, testing, and emergency use.

**Onboarding** is an education and discovery experience, not a profile setup form. Profile setup (name, headline, role, skills, timezone, availability) lives in the Settings page and can be completed at any time. Onboarding teaches new builders what the platform is about, how it works, and introduces them to real content — builders, projects, and tribes — so they can immediately engage.

---

## MoSCoW Priority

| Component | Priority |
|---|---|
| Firebase Auth (Google OAuth) | **Must** |
| Firebase Auth (GitHub OAuth) | **Must** |
| Account linking on matching email | **Must** |
| Education & discovery onboarding | **Must** |
| Home-grown email/password (unexposed fallback) | **Have** (already built) |

---

## User Stories

| ID | Story | Priority |
|---|---|---|
| O-1 | As a new builder, I want to sign up with my Google account so that I can join the platform in one click. | Must |
| O-2 | As an engineer, I want to sign up with GitHub so that my technical identity is connected from day one. | Must |
| O-3 | As a builder who used Google to sign up, I want to later connect GitHub and have my accounts linked automatically (same email) so that I don't end up with duplicate profiles. | Must |
| O-4 | As a new builder, I want to go through an onboarding experience that teaches me how the platform works so that I understand the value of projects, tribes, and Builder Score. | Must |
| O-5 | As a new builder, I want to discover real builders, projects, and tribes during onboarding so that I immediately see the community I'm joining. | Must |

---

## User Flow: Signup and Onboarding

```
1. Builder lands on the homepage.
2. Builder clicks "Continue with GitHub" or "Continue with Google."
3. Firebase Auth handles the OAuth flow:
   a. Redirect to provider (GitHub or Google).
   b. Builder authorizes.
   c. Firebase returns ID token to the frontend.
4. Frontend sends Firebase ID token to the backend.
5. Backend verifies the token and finds or creates a user:
   a. If firebase_uid exists → returning user → redirect to /feed.
   b. If email matches an existing user → link Firebase UID → redirect to /feed.
   c. If new user → create user record → redirect to /onboarding.
6. New builder enters the onboarding flow:
   a. Screen 1 — The Constellation: thesis + role selection.
   b. Screen 2 — What counts: project examples across all roles.
   c. Screen 3 — Aspirational profile: burn map, Builder Score, AI workflows.
   d. Screen 4 — "You're ready." CTAs to feed or profile setup.
7. Builder completes onboarding and lands on the feed or their profile.
```

---

## Key Product Decisions

### Firebase Auth with Google + GitHub OAuth

**Decision:** Firebase Auth is the primary authentication method, supporting Google and GitHub as OAuth providers. No email/password signup is exposed in the UI.

**Rationale:** Google + GitHub together cover the full target market — engineers sign in with GitHub (connecting their technical identity), while designers, PMs, founders, and other non-technical builders sign in with Google (everyone has a Google account). Firebase handles OAuth flows, token refresh, and account linking, eliminating the need to build and maintain auth infrastructure. No passwords means no forgot-password flow, no bcrypt, no password strength rules — a whole category of security surface removed.

### Home-grown email/password as unexposed fallback

**Decision:** The existing email/password auth system (JWT + refresh tokens + bcrypt) is kept fully functional but not exposed in the UI. The `/login` and `/signup` pages are removed from navigation. The GraphQL mutations (`signup`, `login`, `refreshToken`, `logout`) remain in the schema.

**Rationale:** The home-grown system is already built and tested. Keeping it provides: (1) a fallback if Firebase has an outage, (2) working auth for seed data and integration tests without needing to mock Firebase, (3) developer/admin access via direct API calls. Removing code that works and has tests would be waste.

### Auto-merge accounts on matching email

**Decision:** When a builder signs in with a new provider (e.g., first used GitHub, now tries Google) and the email matches an existing account, the accounts are automatically linked. No manual linking required.

**Rationale:** This is standard behavior in modern apps (LinkedIn, Notion, etc.). It prevents duplicate accounts and eliminates a confusing "this email is already registered" error. Firebase supports this natively.

### Onboarding is education and discovery, not profile setup

**Decision:** The onboarding flow teaches new builders what the platform is about and surfaces real content. Profile setup (name, headline, role, skills, timezone, availability, bio) lives in the Settings page and can be completed at any time.

**Rationale:** Forcing profile completion during signup adds friction to the activation path. Builders should understand *why* the platform exists before being asked to fill out forms. Education-first onboarding increases engagement by showing value before requesting investment. Profile completeness is encouraged through in-app prompts and Builder Score incentives, not a gate.

---

## Onboarding Flow

The onboarding flow is an education and identity experience. Four screens, under 60 seconds. Each screen earns its spot.

**Design principles:**
- One concept per screen. No forms.
- Show, don't tell. The platform's value is communicated through visuals and interaction, not paragraphs.
- Tie back to the core thesis: small teams, AI-native builders, proof of work.
- End with a clear call to action that drives the builder into the core loop.

**Screens:**

### Screen 1: The Constellation

**Headline:** "The next great product will be built by five people."
**Body:** "The right engineer. The right designer. The right strategist. Known by their work, not their words."
**Visual:** Five abstract circles animate in one by one, connecting into a constellation — a tribe forming before the builder's eyes.
**Interactive:** "Which one are you?" — six role chips: Code, Design, Product, Growth, Operations, Other. Builder taps one; their selection highlights in accent.
**Button:** Continue

*Purpose: States the thesis, separates FYT from LinkedIn in one beat, and captures the builder's primary role without it feeling like a form.*

### Screen 2: What Counts

**Headline:** "A project is anything you've built."
**Visual:** Four example project cards, each tangible and real:
- "A budgeting app for freelancers" — Product, React, API
- "Brand system for a coffee roaster" — Design, Brand Identity, Figma
- "Product Hunt launch that hit #1" — Growth, Launch, Marketing
- "SOC 2 compliance from scratch" — Compliance, Process, Legal
**Below cards:** "If you shipped it, it counts."
**Button:** Continue

*Purpose: Broadens "project" beyond code. Non-engineers (designers, PMs, lawyers, ops) see themselves here. The tag vocabulary signals this isn't just a developer platform.*

### Screen 3: Your Builder Identity

**Headline:** "This is what shipping looks like."
**Visual:** An aspirational mock profile card — beautiful, editorial, the kind of thing you'd want to screenshot:
- Builder name and headline
- Builder Score (e.g., 142)
- Burn map in warm accent tones showing consistent activity
- AI Workflows: Claude, Copilot, Cursor (first-class profile concept)
- Stats: 3 projects · 2 tribes · 4 collabs
**Below card:** "Ship projects. Work with AI. Build with your tribe. Your score tells the story."
**Button:** Continue

*Purpose: Shows the builder what their profile COULD look like. The burn map, AI workflows, and tribe count paint a picture of an active, AI-native builder. Ties back to Screen 1's "five people" thesis. AI workflows is a first-class profile concept — builders list the AI tools they work with as part of their identity.*

### Screen 4: Go

**Headline:** "You're ready."
**Primary CTA:** "Explore the feed" → `/feed`
**Secondary CTA:** "Complete your profile" → `/settings`

*Purpose: Land the plane. No body copy, no score preview, no confetti. The confidence is in the restraint. The builder chooses their next step.*

### Key Product Decision: AI Workflows as First-Class Profile Concept

AI workflows (the AI tools a builder works with — Claude, Copilot, Cursor, Midjourney, v0, etc.) are a first-class profile concept, not just project-level tags. This means:
- Builders list AI tools on their profile alongside skills, projects, and tribes.
- AI workflows are visible on profile cards and in discovery.
- It signals "AI-native builder" to potential collaborators.
- It's a discovery/matching dimension — find builders who use the same AI stack.
- This decision ripples into F2 (Builder Profiles) for full implementation.

---

## Relevant Personas

- **Maya Chen (Indie Hacker):** Signs up with GitHub. Her GitHub identity is immediately connected. Goes through onboarding, sees builders like her, then heads to settings to complete her profile and add projects.
- **James Okafor (Agency Escapee):** Signs up with Google (no GitHub). Onboarding shows him that projects aren't just code — he sees non-technical builders too. Completes his profile in settings.
- **Priya Sharma (Senior Engineer):** Signs up with GitHub. Onboarding surfaces builders and projects in her domain. Later connects Google for convenience (auto-linked via email).
- **David Morales (Non-Technical Founder):** Signs up with Google. Onboarding educates him on what "proof-of-work" means for non-engineers. Sees operational and strategic projects on the platform.

---

## Relevant Risks

### OAuth provider dependency

Firebase Auth depends on Google infrastructure. Mitigation: the home-grown email/password system remains functional as a fallback. In an emergency, the login/signup forms can be re-exposed.

### Non-Technical User Adoption

- **Onboarding must show non-code projects.** The discovery steps should surface diverse project types (design, growth, operational work) so non-engineers see themselves in the platform.
- **Google sign-in removes the "I don't have GitHub" barrier.** Previously a risk for non-technical users.

---

## Success Metrics (Activation)

| Metric | Definition | Target (3 months post-launch) |
|---|---|---|
| **Signup completion rate** | % of OAuth attempts that result in a created account | 90% |
| **Onboarding completion rate** | % of new signups who complete the onboarding flow | 80% |
| **Profile completion rate** | % of signups who complete profile setup in settings within 7 days | 50% |
| **Project creation rate** | % of signups who add at least 1 project within 7 days | 40% |

---

## Dependencies

```
Authentication (this feature — Firebase Auth)
  |
  v
Onboarding (this feature — education & discovery)
  |
  v
Builder Profiles (F2) -------> Builder Discovery (F5)
  |                              (onboarding surfaces content from F5)
  v
Project Creation (F3)
```

Authentication and onboarding are the foundation of the entire platform. No other feature can function without them. This feature must be implemented first.

---

## Implementation Status

| Component | Status | Notes |
|-----------|--------|-------|
| Email/password auth (backend) | Built | Unexposed fallback — signup, login, refresh, logout |
| Email/password auth (frontend) | Built | Login/signup pages exist but will be removed from nav |
| JWT + refresh token system | Built | Kept for fallback and testing |
| Complete onboarding mutation | Built | Sets profile fields — will be repurposed or removed |
| Firebase Auth integration | Not built | Primary auth method |
| Firebase account linking | Not built | Auto-merge on matching email |
| Onboarding flow (4 screens) | Not built | Constellation, What Counts, Builder Identity, Go |
| AI workflows (profile concept) | Not built | First-class profile concept — ripples into F2 |

---

## Out of Scope (V1)

- Social login providers other than GitHub and Google (Apple, Twitter, etc.)
- Push or email notifications
- Mobile native apps (web-first, responsive design)
- Multi-factor authentication (may be added later)
- Email/password signup exposed in the UI (kept as unexposed fallback)
