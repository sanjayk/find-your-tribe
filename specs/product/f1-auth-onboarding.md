# F1: Authentication & Onboarding

## Context

This spec covers the authentication and onboarding features for **Find Your Tribe**, a proof-of-work social network for builders. For full product vision, positioning, personas, and success metrics, see [overview.md](./overview.md). For the complete PRD, see [../PRD.md](../PRD.md).

**Find Your Tribe** is a platform where your identity is defined by what you have shipped, not what you claim. Your profile is your portfolio. Your reputation is earned through shipped projects and verified collaborations. The platform answers: **What have you actually built, and who did you build it with?**

---

## Feature Summary

Authentication and onboarding are the entry point for every builder on the platform. This feature must support two signup methods (email/password and GitHub OAuth) and a guided onboarding flow that ensures every new profile is useful from day one. The onboarding flow also prompts builders to add their first project, establishing the proof-of-work identity immediately.

---

## MoSCoW Priority

| Component | Priority |
|---|---|
| Email + Password Auth | **Must** |
| GitHub OAuth | **Must** |
| Guided Onboarding Flow | **Must** |
| First Project Prompt During Onboarding | **Must** |
| GitHub Project Import During Onboarding | **Should** |

---

## User Stories

| ID | Story | Priority |
|---|---|---|
| O-1 | As a new builder, I want to sign up with my email so that I can create an account without needing a GitHub profile. | Must |
| O-2 | As a new builder, I want to sign up with GitHub OAuth so that I can quickly connect my technical identity. | Must |
| O-3 | As a new builder, I want to complete a guided onboarding flow (name, headline, role, skills, timezone) so that my profile is useful from day one. | Must |
| O-4 | As an engineer signing up, I want to import projects from my GitHub repositories so that I do not have to manually re-enter my portfolio. | Should |
| O-5 | As a new builder, I want to see a prompt to add my first project during onboarding so that I immediately contribute a build artifact. | Must |

---

## User Flow: Signup, Onboarding, and First Project

```
1. Builder lands on the homepage.
2. Builder clicks "Get Started" or "Sign Up."
3. Builder chooses signup method:
   a. Email + password: enters email, creates password, verifies email.
   b. GitHub OAuth: redirects to GitHub, authorizes, returns to platform.
4. Builder enters the onboarding flow:
   a. Step 1 -- Identity: full name, avatar upload (optional), headline
      (e.g., "Full-stack engineer building fintech tools").
   b. Step 2 -- Role: selects primary role from predefined list
      (Engineer, Designer, PM, Marketer, Growth, Founder, Other).
   c. Step 3 -- Skills: selects up to 10 skills from a searchable list
      (React, Figma, SEO, Python, etc.). Can add custom skills.
   d. Step 4 -- Timezone & Availability: selects timezone, sets availability
      status (open to tribe / available for projects / just browsing).
5. Builder is prompted to add their first project:
   a. Option A -- Manual: enters title, description, role, links, tech stack, status.
   b. Option B -- GitHub Import (if GitHub connected): selects from a list of
      their repositories; name, description, languages, and stars auto-populate;
      builder adds role and any additional details.
   c. Option C -- Skip for now (allowed but discouraged via copy:
      "Your profile is stronger with projects").
6. Builder lands on their completed profile page.
7. Builder sees a prompt to invite collaborators to their project or explore
   the discovery feed.
```

---

## Key Product Decisions

### Email-first signup with optional GitHub OAuth

**Decision:** Email/password is the primary signup method. GitHub OAuth is offered as a convenience for engineers, not required.

**Rationale:** Find Your Tribe is for all builders, not just engineers. Designers, PMs, marketers, growth operators, and non-technical founders do not have GitHub accounts. Making GitHub the primary or required signup method would exclude a significant portion of the target market. Email-first is inclusive; GitHub import is an accelerator for those who have it.

### Guided onboarding ensures useful profiles

Every builder must complete name, headline, role, skills, and timezone during onboarding. This ensures that discovery results are meaningful from day one and prevents the "empty profile" problem that plagues other platforms.

### First project prompt during onboarding

The onboarding flow prompts the builder to add their first project before landing on their profile page. This is allowed to be skipped but is discouraged with copy like "Your profile is stronger with projects." This establishes the proof-of-work identity immediately and drives the core activation metric (project creation within 7 days).

---

## Relevant Personas

- **Maya Chen (Indie Hacker):** Signs up with GitHub OAuth, imports her 3 shipped projects. The fastest path to a populated profile.
- **James Okafor (Agency Escapee):** Signs up with email. No GitHub. Creates his profile focused on his side project. Needs the onboarding to make it clear that a "project" is not just code.
- **Priya Sharma (Senior Engineer):** Signs up with GitHub OAuth. Imports her open-source contributions as portfolio pieces.
- **David Morales (Non-Technical Founder):** Signs up with email. Creates projects based on operational work: systems he designed, workflows he optimized. The onboarding must communicate that non-code work counts.

---

## Relevant Risks

### Cold Start -- GitHub Import as Bootstrapping

Engineers who connect GitHub immediately have a populated profile. This reduces the "empty profile" problem and gives discovery something to index from day one.

### Non-Technical User Adoption

- **Broad project definition.** The project creation flow should make it clear that a "project" is not just code. Examples in the UI: "a brand identity you designed," "a go-to-market strategy you executed," "an operational system you built."
- **Role-specific onboarding nudges.** When a builder selects "Designer" or "PM" or "Growth" as their role, tailor the project creation prompts to match their work type.

---

## Success Metrics (Activation)

| Metric | Definition | Target (3 months post-launch) |
|---|---|---|
| **Profile completion rate** | % of signups who complete all onboarding fields (name, headline, role, skills, timezone) | 70% |
| **Project creation rate** | % of signups who add at least 1 project within 7 days of registration | 40% |
| **Time to first project** | Median time from signup to first project created | Under 15 minutes |

---

## Dependencies

```
Authentication (this feature)
  |
  v
Onboarding (this feature)
  |
  v
Builder Profiles (F2) -------> Builder Discovery (F5)
  |
  v
Project Creation (F3)
```

Authentication and onboarding are the foundation of the entire platform. No other feature can function without them. This feature must be implemented first.

---

## Out of Scope (V1)

- Social login providers other than GitHub (Google, Twitter, etc.)
- Push or email notifications
- Mobile native apps (web-first, responsive design)
- Multi-factor authentication (may be added later)
