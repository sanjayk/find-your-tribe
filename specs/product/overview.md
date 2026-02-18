# Find Your Tribe -- Product Overview

**Source:** [Full PRD](../PRD.md)
**Version:** 1.0
**Date:** February 2026
**Status:** Draft

---

## Vision & Positioning

### Problem Statement

LinkedIn has become a platform optimized for performative credentialism. Endorsements are exchanged as social currency. "Thought leadership" posts outperform actual work. The signal-to-noise ratio for identifying real builders has collapsed.

Simultaneously, AI is fundamentally restructuring how teams operate. Tools like Claude, Cursor, and Midjourney are compressing what once required a 50-person company into what 5 people can ship. The era of the small, high-leverage team is arriving, and it will only accelerate. But the infrastructure for forming these teams does not exist. Finding co-builders still relies on luck, warm intros, Twitter DMs, and Slack communities you happen to be in.

The gap: there is no professional network where your identity is defined by what you have shipped rather than what you claim.

### Vision

The best companies of the next decade will be built by small teams wielding AI. Find Your Tribe is the network they start from -- co-builders, first users, first customers. The new way to build a company.

Find Your Tribe is a proof-of-work social network for builders. Your profile is your portfolio. Your reputation is earned through shipped projects and verified collaborations, not self-reported endorsements. Discovery is skill-based and artifact-driven. Teams -- tribes -- form around complementary skills and shared building goals, not job titles and company names.

The platform answers one question: **What have you actually built, and who did you build it with?**

### Competitive Positioning

| Platform | Focus | Weakness (for builders) |
|---|---|---|
| **LinkedIn** | Professional networking, career progression | Performative culture; endorsements are meaningless; content > craft; optimized for recruiters, not builders |
| **Polywork** | Multi-hyphenate identity, side projects | Portfolio-first but no collaboration or team formation; stalled product development |
| **Peerlist** | Developer profiles, project showcasing | Engineer-centric; lacks non-technical builder support; limited discovery |
| **Read.cv** | Minimal professional profiles | Beautiful but static; no collaboration layer; no team formation |
| **Contra** | Freelancer marketplace | Transactional (client-freelancer); not designed for co-builder relationships |
| **Find Your Tribe** | Proof-of-work identity, tribe formation | New entrant; cold start challenge |

**Our differentiation:**

- **Tokens as the universal unit of work.** Every builder on the platform uses AI agents to build — engineers, designers, PMs, marketers, legal, support. Token burn is the universal, discipline-agnostic proof of work. It is to Find Your Tribe what the contribution graph is to GitHub, except it works for every role, not just engineers.
- **Projects as the atomic unit.** Not posts, not profiles, not job titles. Shipped work.
- **Tribes ship projects.** A tribe is a team that ships together. A tribe's credibility = its shipped projects. Projects have an optional tribe attribution.
- **Mutual verification.** Collaborators confirm each other. No unilateral claims.
- **Computed reputation.** Builder Score is derived from artifacts, not gamed through activity.
- **Inclusive by design.** Engineers, designers, PMs, marketers, growth operators, founders. Building is not just code.

### Target Market

**Primary:** Independent builders, indie hackers, early-stage founders, and senior professionals (3-15 years experience) who are leaving or have left traditional employment to build with small teams. They are shipping side projects, micro-SaaS products, design tools, agencies-of-one, or looking for co-founders.

**Secondary:** Senior professionals at large companies who are building on the side and exploring the transition to smaller, more autonomous work. They are not yet ready to leave but are actively looking for their next co-builders.

**Geographics:** English-speaking, remote-first builders. Initial focus on North America, Europe, and South/Southeast Asia -- the three largest pools of independent builders.

**Market size signal:** The number of solo-founded or 2-3 person startups on Product Hunt has grown year over year. The "solopreneur" and "indie hacker" movements on Twitter/X represent hundreds of thousands of active builders. AI tool adoption is accelerating this trend.

---

## User Personas

### Persona 1: Maya Chen -- The Indie Hacker

| Attribute | Detail |
|---|---|
| **Age** | 29 |
| **Location** | Austin, TX (remote) |
| **Role** | Full-stack engineer, solo founder |
| **Background** | Left a mid-level engineering role at Stripe 18 months ago. Has shipped 3 side projects, one generating $2K MRR. Proficient with AI tools. Builds fast and ships weekly. |

**Pain Points:**
- Has ideas that need design and growth skills she does not have. Her products are functional but not polished.
- Finding a co-builder feels random. She has tweeted "looking for a designer co-founder" twice with no results.
- LinkedIn connections are irrelevant -- mostly former colleagues at big tech, not builders.
- Cannot evaluate whether a potential collaborator actually ships or just talks about shipping.

**Goals:**
- Find a designer and a growth person who have actually shipped products, not just agency work.
- Build a small team (3 people) to take her $2K MRR product to $20K MRR.
- Establish a reputation as a prolific builder so that collaborators come to her.

---

### Persona 2: James Okafor -- The Agency Escapee

| Attribute | Detail |
|---|---|
| **Age** | 33 |
| **Location** | London, UK (remote) |
| **Role** | Brand designer, product designer |
| **Background** | 8 years at brand and digital agencies. Senior designer. Burned out on client work where nothing ships on time and everything is designed by committee. Has a side project (a design tool for indie makers) he built with Framer and basic code. |

**Pain Points:**
- His portfolio is full of agency work for clients he cannot name (NDA). His actual skills are undersold.
- LinkedIn shows his job titles, not what he can build. He gets recruiter spam for senior IC roles at corporations.
- He wants to join a small product team but cannot find one. The good ones are invisible -- they do not post job listings.
- He does not know any engineers personally. His professional network is other designers and account managers.

**Goals:**
- Transition from agency life to a small product team as a co-builder, not a hired hand.
- Showcase his side project and independent work as proof he can ship, not just design.
- Find an engineer and a growth person to take his design tool from prototype to product.

---

### Persona 3: Priya Sharma -- The Senior Engineer

| Attribute | Detail |
|---|---|
| **Age** | 37 |
| **Location** | Bangalore, India (IST timezone) |
| **Role** | Staff backend engineer |
| **Background** | 12 years of engineering experience. Currently at a large fintech company. Has open-source contributions and a well-regarded technical blog. Has mentored dozens of engineers. Increasingly disillusioned with big-company politics and the disconnect between effort and impact. |

**Pain Points:**
- At her level, career progression means management, not building. She wants to build.
- She has the technical skills to architect complex systems but no exposure to product, design, or growth disciplines.
- She does not know anyone outside engineering. Her network is deep but narrow.
- She has explored indie hacking but finds the solo path lonely and her weaknesses (design, marketing) are crippling.

**Goals:**
- Find 2-3 complementary builders (design, growth) to start a product together.
- Work on something where her technical depth is a genuine differentiator, not abstracted away by layers of management.
- Build a reputation beyond her current employer's brand name.

---

### Persona 4: David Morales -- The Non-Technical Founder

| Attribute | Detail |
|---|---|
| **Age** | 41 |
| **Location** | Miami, FL |
| **Role** | Former VP of Operations in hospitality, aspiring founder |
| **Background** | 15 years in hospitality operations. Deep domain expertise in hotel technology, guest experience, and operational workflows. Has identified a clear product opportunity in the hospitality space. Zero engineering or design skills. Has tried Upwork and freelancer platforms but the results were poor -- hired hands, not co-builders. |

**Pain Points:**
- He cannot evaluate technical talent. He does not know if an engineer is good until the project fails.
- Freelancer platforms give him contractors, not partners. He needs someone who cares about the product.
- His professional network is hospitality operators, not builders. He is completely outside the tech ecosystem.
- He has been burned by two failed attempts to hire developers who built the wrong thing.

**Goals:**
- Find a technical co-founder (engineer + designer) who is excited about hospitality tech.
- Validate his product idea with a small team before raising capital.
- Contribute his domain expertise and operational skills as a legitimate "builder" credential, not be dismissed as "the business guy."

---

## Success Metrics & KPIs

### North Star Metric

**Collaborator connections made per week** -- the number of new mutually verified collaborator relationships formed on the platform. This metric captures the core value proposition: builders finding and validating co-builders.

### Activation

| Metric | Definition | Target (3 months post-launch) |
|---|---|---|
| **Project creation rate** | % of signups who add at least 1 project within 7 days of registration | 40% |
| **Profile completion rate** | % of signups who complete all onboarding fields (name, headline, role, skills, timezone) | 70% |
| **Time to first project** | Median time from signup to first project created | Under 15 minutes |

### Engagement

| Metric | Definition | Target |
|---|---|---|
| **Projects per builder per month** | Average number of projects created or updated per active builder per month | 1.5 |
| **Collaborator connections per month** | Total new mutual collaborator verifications per month | Growing 20% month-over-month |
| **Discovery sessions per week** | Average number of discovery/search sessions per active builder per week | 2 |
| **Tribes formed per month** | New tribes created per month | Growing after tribe feature launch |

### Retention

| Metric | Definition | Target |
|---|---|---|
| **Monthly active builders (MAB)** | Builders who log in and perform at least one meaningful action (create/edit project, verify collaborator, search, browse) per month | 60% of all registered builders |
| **Week-1 retention** | % of new signups who return in their second week | 35% |
| **Month-1 retention** | % of new signups who are active in their second month | 25% |

### Growth

| Metric | Definition | Target |
|---|---|---|
| **Organic referral rate** | % of new signups who were invited by an existing builder (via collaborator invitations or shared profile/project links) | 30% of all signups |
| **Collaborator invite conversion** | % of collaborator invitations that result in a new signup | 50% |
| **Viral coefficient** | Average number of new signups generated per existing builder | Greater than 0.5 |

### Quality

| Metric | Definition | Target |
|---|---|---|
| **Verified collaborator rate** | % of projects with at least one mutually verified collaborator | 30% |
| **Project completeness** | % of projects with description, at least one link, and tech stack tags | 60% |
| **Builder Score distribution** | Distribution of Builder Scores across the platform (should be normal, not bimodal) | Healthy bell curve |

---

## Key Product Decisions

### No text-only posts

**Decision:** The platform does not support text-only posts, articles, status updates, or any content that is not tied to a build artifact (project, tribe, or milestone).

**Rationale:** This is the defining anti-LinkedIn differentiator. LinkedIn's feed is dominated by performative content -- motivational posts, hot takes, engagement farming. Find Your Tribe's feed is exclusively build artifacts. This means every item in the feed represents something someone actually made. It keeps the signal-to-noise ratio high and prevents the platform from devolving into a content game. Builders who want to write can link to their blog from their profile.

### Mutual verification for collaborators

**Decision:** When a builder tags a collaborator on a project, the collaborator must confirm the relationship before it appears publicly. Unconfirmed collaborators are not displayed.

**Rationale:** This is the trust foundation of the platform. On LinkedIn, anyone can claim they worked at any company or on any project. On Find Your Tribe, collaboration claims are bilateral. This makes every displayed collaborator relationship a verified signal. It also creates a natural viral loop: inviting a collaborator who is not yet on the platform sends them a signup invitation.

### Builder Score is computed, not gamed

**Decision:** Builder Score is derived algorithmically from objective signals: number of shipped projects, mutual collaborator verifications, project impact metrics (when provided), and profile completeness. There is no way to directly increase your score through platform activity like posting or commenting.

**Rationale:** Any system that rewards activity will be gamed. LinkedIn's algorithm rewards engagement, so people optimize for engagement over substance. Builder Score must correlate with actual building output. The inputs are hard to fake: you need real projects, real collaborators who verify you, and real impact metrics. The formula will be transparent so builders understand what it measures, but there is no shortcut to inflating it.

### Feed is build artifacts only

**Decision:** The feed displays only: new projects shipped, tribes forming, builders joining, and milestone updates on active projects. Every feed item links to a concrete artifact.

**Rationale:** This follows from the "no text-only posts" decision. The feed exists to surface building activity, not to be a content consumption experience. It should feel more like a changelog than a social media timeline.

### Email-first signup with optional GitHub OAuth

**Decision:** Email/password is the primary signup method. GitHub OAuth is offered as a convenience for engineers, not required.

**Rationale:** Find Your Tribe is for all builders, not just engineers. Designers, PMs, marketers, growth operators, and non-technical founders do not have GitHub accounts. Making GitHub the primary or required signup method would exclude a significant portion of the target market. Email-first is inclusive; GitHub import is an accelerator for those who have it.

### No in-platform messaging for V1

**Decision:** Builders contact each other through external channels (email, Twitter, Calendly links on profiles). The platform does not include messaging, DMs, or chat.

**Rationale:** Messaging is a massive feature surface area -- real-time infrastructure, spam prevention, abuse moderation, notification systems, read receipts, and more. It would double the scope of V1. The platform's core value is discovery and evaluation, not communication. Builders who find each other can use any of dozens of existing communication tools. Messaging may be added in V2 once the discovery value is proven.

### Tribes are small by design

**Decision:** Tribes are capped at 2-8 members.

**Rationale:** This is not a community platform or a Discord alternative. Tribes represent working teams -- small groups of complementary builders actively collaborating on a project. The 2-8 range reflects the reality of high-leverage small teams in the AI era. Larger groups can form multiple tribes.

---

## User Flows

### Signup, Onboarding, and First Project

```
1. Builder lands on the homepage.
2. Builder clicks "Get Started" or "Sign Up."
3. Builder chooses signup method:
   a. Email + password: enters email, creates password, verifies email.
   b. GitHub OAuth: redirects to GitHub, authorizes, returns to platform.
4. Builder enters the onboarding flow:
   a. Step 1 -- Identity: full name, avatar upload (optional), headline (e.g., "Full-stack engineer building fintech tools").
   b. Step 2 -- Role: selects primary role from predefined list (Engineer, Designer, PM, Marketer, Growth, Founder, Other).
   c. Step 3 -- Skills: selects up to 10 skills from a searchable list (React, Figma, SEO, Python, etc.). Can add custom skills.
   d. Step 4 -- Timezone & Availability: selects timezone, sets availability status (open to tribe / available for projects / just browsing).
5. Builder is prompted to add their first project:
   a. Option A -- Manual: enters title, description, role, links, tech stack, status.
   b. Option B -- GitHub Import (if GitHub connected): selects from a list of their repositories; name, description, languages, and stars auto-populate; builder adds role and any additional details.
   c. Option C -- Skip for now (allowed but discouraged via copy: "Your profile is stronger with projects").
6. Builder lands on their completed profile page.
7. Builder sees a prompt to invite collaborators to their project or explore the discovery feed.
```

### Discovering and Evaluating a Potential Collaborator

```
1. Builder navigates to the Discover section.
2. Builder selects the "Builders" tab.
3. Builder applies filters:
   a. Skill: e.g., "Product Design"
   b. Availability: "Open to tribe"
   c. Timezone: e.g., "PST +/- 3 hours"
4. Builder browses results, sorted by Builder Score by default.
5. Builder clicks on a profile that looks promising.
6. Builder reviews the profile:
   a. Headline and role.
   b. Projects grid -- clicks into 1-2 projects to see what they shipped.
   c. Collaborators section -- sees who they have built with and whether those relationships are verified.
   d. Builder Score.
   e. Availability status.
7. Builder decides this person is a good fit.
8. Builder uses the external contact link (Twitter, email, Calendly) on the profile to reach out.
   (In V1, there is no in-platform messaging. The platform is for discovery and evaluation; outreach happens externally.)
```

### Creating a Tribe and Recruiting Members

```
1. Builder navigates to the Tribes section and clicks "Create a Tribe."
2. Builder fills in tribe details:
   a. Tribe name (e.g., "Hospitality OS").
   b. Mission statement (e.g., "Building an operations platform for boutique hotels").
   c. Current members: auto-includes the creator. Can invite existing platform builders.
   d. Open roles: selects roles needed (e.g., "Backend Engineer," "Product Designer") with optional skill requirements.
3. Tribe is created with status "Open."
4. Tribe appears in discovery for builders browsing open tribes.
5. Other builders find the tribe via discovery:
   a. They filter by skills needed, timezone, or project type.
   b. They click into the tribe page to see the mission, current members (with links to their profiles), and open roles.
6. A builder clicks "Request to Join" and selects the role they want to fill.
7. The tribe creator receives the join request:
   a. They review the requesting builder's profile and projects.
   b. They accept or decline the request.
8. If accepted:
   a. The new member appears on the tribe page.
   b. The open role is marked as filled (or remains open if multiple slots exist).
   c. The tribe status updates based on whether roles are still open.
9. When all roles are filled, the tribe status changes to "Active."
```

### Finding and Joining a Tribe

```
1. Builder sets their availability to "Open to tribe" on their profile.
2. Builder navigates to Discover and selects the "Tribes" tab.
3. Builder applies filters:
   a. Skills needed: e.g., "React, TypeScript" (matches their skills).
   b. Timezone: compatible with their own.
4. Builder browses open tribes.
5. Builder clicks into a tribe that interests them:
   a. Reads the mission statement.
   b. Reviews current members by clicking through to their profiles.
   c. Checks the open roles to see if their skills match.
6. Builder clicks "Request to Join" for a specific open role.
7. Builder waits for the tribe creator to review and respond.
8. If accepted, builder sees the tribe on their profile and gains access to the tribe dashboard.
```

---

## Risks & Mitigations

### Risk 1: Cold Start Problem

**Description:** A social network with no builders has no reason to join. Early users arrive, see empty discovery results, and leave. The platform cannot demonstrate its value without a critical mass of builders with complete profiles and projects.

**Severity:** High

**Mitigations:**

- **Seed the platform with curated builders.** Manually invite 200-500 active indie hackers, open-source maintainers, and prolific builders from Twitter/X, Product Hunt, and Indie Hackers. Offer early access as a status signal.
- **GitHub import as bootstrapping.** Engineers who connect GitHub immediately have a populated profile. This reduces the "empty profile" problem and gives discovery something to index from day one.
- **Collaborator invitations as viral loop.** Every time a builder tags a collaborator who is not on the platform, they receive a personalized invitation ("Maya tagged you as a collaborator on ProjectX. Claim your profile."). This is the strongest growth mechanism and it is built into the core product.
- **Focus on a niche first.** Do not try to attract "all builders." Start with indie hackers and open-source contributors -- a concentrated, identifiable community. Expand to designers, PMs, and non-technical builders after the initial network has traction.
- **Community seeding through the build feed.** Curate and highlight interesting projects in the build feed during the early phase to make the platform feel alive even with a small user base.

### Risk 2: Quality Control -- Preventing LinkedIn-Style Gaming

**Description:** As the platform grows, users may attempt to game the system: creating fake projects, inflating impact metrics, forming reciprocal verification rings, or treating Builder Score as a vanity metric to optimize.

**Severity:** Medium

**Mitigations:**

- **Mutual verification is structural.** Fake collaborations require two accounts to collude. This is a much higher bar than LinkedIn's unilateral endorsements.
- **Builder Score is multi-signal.** No single input dominates the score. A builder cannot inflate their score by creating many empty projects -- project completeness, impact metrics, and collaborator count all factor in. The score resists single-vector gaming.
- **Link verification.** Projects require external links (live URL, repository, app store listing). These are verifiable. In future versions, the AI layer can crawl and validate these links.
- **Community reporting.** Allow builders to flag suspicious profiles or projects for review. Build lightweight moderation tooling.
- **Transparency.** Publish the Builder Score formula. Transparency discourages gaming because the community can identify and call out manipulation.

### Risk 3: Non-Technical User Adoption

**Description:** Despite the inclusive design intent (email-first signup, broad role definitions), the platform may skew heavily toward engineers. Non-technical builders (designers, PMs, marketers, founders with domain expertise) may not see themselves in the product or may struggle to represent their work as "projects."

**Severity:** Medium

**Mitigations:**

- **Broad project definition.** The project creation flow should make it clear that a "project" is not just code. Examples in the UI: "a brand identity you designed," "a go-to-market strategy you executed," "an operational system you built." Use diverse examples throughout onboarding.
- **Role-specific onboarding nudges.** When a builder selects "Designer" or "PM" or "Growth" as their role, tailor the project creation prompts to match their work type.
- **Persona-driven marketing.** Marketing materials should feature non-technical builder personas prominently. The landing page should show designers, PMs, and founders alongside engineers.
- **Tribe formation as the hook for non-technical builders.** Non-technical builders may be more motivated by "find a technical co-builder" than by "showcase your portfolio." Position tribe discovery as the primary value proposition for this segment.

### Risk 4: Retention Beyond Initial Profile Setup

**Description:** Builders may sign up, create their profile and projects, then have no reason to return. Unlike LinkedIn (which has a feed, messaging, and job alerts), Find Your Tribe in V1 has limited ongoing engagement surfaces.

**Severity:** Medium

**Mitigations:**

- **Collaborator invitations as re-engagement.** When a builder is tagged as a collaborator, they receive an email prompting them to return and verify.
- **Tribe activity.** Builders in tribes have a reason to check the tribe dashboard for updates and new join requests.
- **Build feed (Could Have).** If implemented, the build feed gives builders a reason to browse regularly.
- **New builder discovery.** As new builders join, existing builders may return to discover potential collaborators. Periodic digest emails (post-V1) can surface "new builders with your skills" or "new tribes looking for your role."
- **The core retention insight:** This is a network, not a content platform. Retention will be driven by the value of the connections made, not by daily engagement. A builder who finds a co-founder through the platform will attribute that to Find Your Tribe even if they only log in twice a month. Measure success by connections made, not daily active users.

### Risk 5: Scope Creep Toward LinkedIn

**Description:** User requests and competitive pressure may push the product toward features that erode its differentiation -- text posts, reactions, follower counts, endorsements, content algorithms. Each individual feature seems reasonable; collectively, they turn Find Your Tribe into another LinkedIn.

**Severity:** Medium (long-term)

**Mitigations:**

- **Explicit product principles.** The "no text-only posts" and "computed reputation" decisions are documented as product principles, not just V1 constraints. Any feature request that conflicts must clear a high bar.
- **Decision framework.** For every proposed feature, ask: "Does this reward building or performing?" If the answer is performing, reject it.
- **Anti-goals as documentation.** Maintain an explicit list of things the product will never be: a content platform, a job board, a freelancer marketplace, a LinkedIn clone with better UI.

---

## Feature Prioritization (MoSCoW) Summary

### Must Have (MVP)

| Feature | Description |
|---|---|
| Email + Password Auth | Sign up, log in, log out with email/password |
| GitHub OAuth | Sign up / connect with GitHub |
| Guided Onboarding | Name, headline, role, skills, timezone |
| Builder Profiles | View and edit profiles with portfolio display |
| Project Creation & Management | Create, edit, archive projects with full metadata |
| Collaborator Invitations & Verification | Invite collaborators; they must confirm |
| Builder Discovery | Browse and filter builders by skill, role, timezone, availability |
| Project Discovery | Browse and filter projects by tech stack, category, recency |
| Project Detail Pages | Full project view with description, links, collaborators, tech stack |
| Profile Detail Pages | Public profile view with projects, collaborators, status |

### Should Have

| Feature | Description |
|---|---|
| Tribe Creation & Management | Create tribes with name, mission, open roles |
| Tribe Discovery | Browse and filter open tribes |
| Tribe Join Requests | Request to join; creator accepts/declines |
| Builder Score | Computed reputation metric |
| GitHub Project Import | Auto-populate project from repo metadata |
| Impact Metrics | Add users, revenue, downloads, stars to projects |
| Availability Status | Open to tribe, available for projects, just browsing |

### Could Have

| Feature | Description |
|---|---|
| AI-Powered Natural Language Search | "Find me a designer who shipped B2B tools" |
| Build Feed | Chronological feed of build activity |
| Project Analysis (AI) | Auto-extract tech stack and metadata from URLs/repos |
| Tribe Recommendations (AI) | Suggest complementary builders for a tribe |
| Builder Matching (AI) | AI-suggested co-builders based on skills and gaps |

### Won't Have (V1)

| Feature | Rationale |
|---|---|
| Direct Messaging / DMs | Massive surface area (moderation, spam, abuse). Builders link to external contacts. |
| Payments / Monetization | Focus on product-market fit first. |
| Push or Email Notifications | Adds infrastructure complexity. |
| Mobile Native Apps | Web-first, responsive design. Native apps after PMF. |
| Text-Only Posts / Content Creation | Anti-LinkedIn decision. Every artifact tied to something built. |
| Job Listings | Not a job board. Tribes are the collaboration mechanism. |
| Endorsements / Testimonials | Avoids performative endorsement culture. Builder Score is computed, not written. |

---

## Feature Dependency Map

```
Authentication (Must)
  |
  v
Onboarding (Must)
  |
  v
Builder Profiles (Must) -------> Builder Discovery (Must)
  |                                       |
  v                                       v
Project Creation (Must) -------> Project Discovery (Must)
  |
  v
Collaborator Verification (Must)
  |
  +-------> Builder Score (Should) -------> Ranked Discovery (Should)
  |
  +-------> Tribe Formation (Should) -----> Tribe Discovery (Should)
  |
  +-------> Build Feed (Could)
  |
  v
GitHub Import (Should)
  |
  v
AI Search & Matching (Could)
```

---

## Glossary

| Term | Definition |
|---|---|
| **Builder** | Any user on the platform. Engineers, designers, PMs, marketers, growth operators, founders -- anyone who makes things. |
| **Project** | The atomic unit of proof-of-work. A thing that was built, with metadata: description, links, role, collaborators, tech stack, impact metrics, status. |
| **Tribe** | A small group (2-8) of builders with complementary skills, either actively building together or looking for members. |
| **Builder Score** | A computed reputation metric derived from shipped projects, collaborator verifications, impact metrics, and profile completeness. |
| **Collaborator** | A builder who is mutually verified as having worked on a project with another builder. |
| **Build Feed** | A chronological feed of build artifacts: new projects, forming tribes, joining builders, milestone updates. No text-only content. |
| **Proof-of-Work** | The principle that reputation on the platform is earned through demonstrated building output, not self-reported claims or social activity. |

---

## Feature Spec Index

| File | Feature |
|---|---|
| [f1-auth-onboarding.md](./f1-auth-onboarding.md) | F1: Authentication & Onboarding |
| [f2-builder-profiles.md](./f2-builder-profiles.md) | F2: Builder Profiles |
| [f3-projects.md](./f3-projects.md) | F3: Projects, Collaborator Verification & GitHub Import |
| [f4-tribes.md](./f4-tribes.md) | F4: Tribe Formation, Join & Management |
| [f5-discovery-search.md](./f5-discovery-search.md) | F5: Discovery & Search |
| [f6-build-feed.md](./f6-build-feed.md) | F6: Build Feed |
| [f7-builder-score.md](./f7-builder-score.md) | F7: Builder Score Algorithm |
