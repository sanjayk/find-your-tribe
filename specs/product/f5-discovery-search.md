# F5: Discovery & Search

## Context

This spec covers discovery and search for **Find Your Tribe**, a proof-of-work social network for builders. For full product vision, positioning, personas, and success metrics, see [overview.md](./overview.md). For the complete PRD, see [../PRD.md](../PRD.md).

**Find Your Tribe** is a platform where your identity is defined by what you have shipped, not what you claim. Discovery is skill-based and artifact-driven -- builders find each other through their shipped work, verified collaborations, and complementary skills, not through job titles, company names, or social connections.

---

## Feature Summary

Discovery is the core value delivery mechanism of the platform. It is how builders find co-builders, evaluate potential collaborators, discover interesting projects, and locate tribes to join. Discovery has three tabs -- Builders, Projects, and Tribes -- each with filter-based browsing. Results are ranked by Builder Score when available. An AI-powered natural language search ("find me a designer who shipped B2B tools") is a future enhancement.

This feature has four components:
1. **Builder Discovery** -- browse and filter builders
2. **Project Discovery** -- browse and filter projects
3. **Tribe Discovery** -- browse and filter open tribes
4. **AI-Powered Natural Language Search** -- semantic search (Could Have)

---

## MoSCoW Priority

| Component | Priority |
|---|---|
| Builder Discovery (browse, filter by skill/role/timezone/availability) | **Must** |
| Project Discovery (browse, filter by tech stack/category/recency) | **Must** |
| Tribe Discovery (browse, filter by skills needed) | **Should** |
| Ranked Discovery (sorted by Builder Score) | **Should** |
| AI-Powered Natural Language Search | **Could** |

---

## User Stories

| ID | Story | Priority |
|---|---|---|
| D-1 | As a builder, I want to browse other builders filtered by skill, role, timezone, and availability so that I can find potential collaborators. | Must |
| D-2 | As a builder, I want to browse projects filtered by tech stack, category, and recency so that I can see what is being built. | Must |
| D-3 | As a builder, I want to browse open tribes filtered by skills needed so that I can find teams looking for my expertise. | Should |
| D-4 | As a builder, I want to use natural language search (e.g., "designer who has shipped B2B SaaS tools") so that I can find people without constructing filters. | Could |
| D-5 | As a builder, I want discovery results to be ranked by Builder Score so that high-quality builders surface first. | Should |

---

## Builder Discovery

### Filters

- **Skill:** Filter by specific skills (e.g., "Product Design," "React," "SEO")
- **Role:** Filter by primary role (Engineer, Designer, PM, Marketer, Growth, Founder, Other)
- **Timezone:** Filter by timezone or timezone range (e.g., "PST +/- 3 hours")
- **Availability:** Filter by status (Open to tribe, Available for projects, Just browsing)

### Results Display

Each result shows:
- Builder name, headline, avatar
- Role and key skills (tags)
- Availability status
- Builder Score (when available)
- Number of shipped projects
- Link to full profile

### Default Sort

Results are sorted by Builder Score (descending) when Builder Score is available. Before Builder Score is implemented, results can be sorted by profile completeness or recency.

---

## Project Discovery

### Filters

- **Tech Stack:** Filter by technologies used (e.g., "React," "Python," "Figma")
- **Category:** Filter by project type or domain (if categorized)
- **Recency:** Filter or sort by when the project was created or last updated

### Results Display

Each result shows:
- Project title and brief description
- Tech stack tags
- Status (Shipped / In Progress / Archived)
- Creator name and avatar
- Number of collaborators
- Link to full project detail page

---

## Tribe Discovery

### Filters

- **Skills Needed:** Filter by skills the tribe is looking for (matches open roles)
- **Timezone:** Filter by timezone compatibility
- **Project Type:** Filter by the kind of project the tribe is building (if categorized)

### Results Display

Each result shows:
- Tribe name and mission (truncated)
- Open roles with skill requirements
- Current member count and member avatars
- Tribe status (Open)
- Link to full tribe page

---

## AI-Powered Natural Language Search (Could Have)

### How It Works

Builder types a natural language query like:
- "Designer who has shipped B2B SaaS tools"
- "Backend engineer experienced with fintech in IST timezone"
- "Growth person who has taken a product from 0 to 10K users"

The system uses embeddings and semantic search to match the query against builder profiles, project descriptions, and skills. Results are ranked by relevance and Builder Score.

### Rationale

This is powerful but requires embeddings infrastructure and meaningful data volume. It is a "Could Have" feature for V1 -- valuable but can wait for post-MVP iterations when there is enough data to make semantic search useful.

---

## User Flow: Discovering and Evaluating a Potential Collaborator

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
   c. Collaborators section -- sees who they have built with and whether
      those relationships are verified.
   d. Builder Score.
   e. Availability status.
7. Builder decides this person is a good fit.
8. Builder uses the external contact link (Twitter, email, Calendly) on
   the profile to reach out.
   (In V1, there is no in-platform messaging. The platform is for discovery
   and evaluation; outreach happens externally.)
```

---

## Relevant Personas

- **Maya Chen (Indie Hacker):** Browses open tribes that need an engineer, or discovers designers who have shipped B2B SaaS. Evaluates potential collaborators by their project history and builder scores.
- **James Okafor (Agency Escapee):** Browses engineers who have shipped design-related tools or developer tools. Searches for tribes that need a designer.
- **Priya Sharma (Senior Engineer):** Uses discovery to find designers and growth people in overlapping timezones (IST +/- 3 hours).
- **David Morales (Non-Technical Founder):** Searches for engineers who have built in hospitality, travel, or marketplace verticals. Browses open tribes that need operational expertise. Evaluates builders by their project history and collaborator endorsements.

---

## Relevant Risks

### Cold Start

Discovery is useless without builders, projects, and tribes to discover. **Mitigations:**
- Seed the platform with 200-500 curated builders
- GitHub import populates profiles immediately
- Collaborator invitations drive signups
- Focus on a niche first (indie hackers, open-source contributors)

### Quality of Results

Poor discovery results (irrelevant matches, empty profiles, inactive builders) will erode trust in the platform. **Mitigations:**
- Builder Score ranking surfaces high-quality builders first
- Profile completion requirements during onboarding ensure minimum data quality
- Availability status filters out builders who are not actively looking

---

## Success Metrics

| Metric | Definition | Target |
|---|---|---|
| **Discovery sessions per week** | Average number of discovery/search sessions per active builder per week | 2 |
| **Collaborator connections made per week** | New mutually verified collaborator relationships formed (North Star) | Growing |
| **Profile click-through rate** | % of discovery results that lead to a profile view | Tracked post-launch |
| **Tribe join request rate** | % of tribe discovery views that result in a join request | Tracked post-launch |

---

## Dependencies

```
Authentication & Onboarding (F1)
  |
  v
Builder Profiles (F2) -------> Builder Discovery (this feature)
  |                                       |
  v                                       v
Project Creation (F3) -------> Project Discovery (this feature)
  |
  v
Collaborator Verification (F3)
  |
  +-------> Builder Score (F7) -------> Ranked Discovery (this feature)
  |
  +-------> Tribe Formation (F4) -----> Tribe Discovery (this feature)
```

Builder and project discovery depend on profiles (F2) and projects (F3) existing. Ranked discovery depends on Builder Score (F7). Tribe discovery depends on tribes (F4) existing. AI search depends on sufficient data volume and embeddings infrastructure.

---

## Out of Scope (V1)

- Saved searches or search alerts
- "Recommended for you" personalized suggestions
- Builder matching (AI-suggested co-builders based on skills and gaps)
- Tribe recommendations (AI-suggested tribes)
- Search analytics or trending searches
- Geographic (map-based) discovery
