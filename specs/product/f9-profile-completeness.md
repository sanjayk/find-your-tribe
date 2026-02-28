# F9: Profile Completeness

## Problem

Builders sign up, fill in a name and email, and stop. The profile sits at 20% complete, invisible to the builder and underwhelming to anyone who discovers them. There is no feedback loop telling a builder what fields matter, which ones are empty, or how a sparse profile affects their discoverability. The Builder Score algorithm already penalizes incomplete profiles (15 of 100 points come from completeness), but the builder never sees that penalty or knows how to fix it.

## Users

- **A builder who signed up last week and added one project but left their bio, role, and timezone blank.** They don't realize they're invisible in discovery filters that match on role or timezone. They don't know their Builder Score is capped.
- **A builder evaluating whether to invest more time on the platform.** They need a clear signal that the platform rewards depth over breadth. A completeness indicator says "we value your profile being real."

Personas from [overview.md](./overview.md): Maya Chen (imports GitHub but skips bio and role), James Okafor (fills headline but forgets timezone and links), David Morales (non-technical, needs nudging to add skills and tools).

## User Stories

| ID | Story | Acceptance Criteria | Priority |
|----|-------|---------------------|----------|
| PC-1 | As a builder, I want to see how complete my profile is so that I know what to fill in. | Given I am on my settings page, When the page loads, Then I see a percentage (0-100%) and a visual indicator of my profile completeness. | Must |
| PC-2 | As a builder, I want to see which specific fields are missing so that I can fix them without guessing. | Given my profile is less than 100% complete, When I view the completeness section, Then each missing field is listed by name with a link to its input. | Must |
| PC-3 | As a builder, I want to see my completeness update in real time as I fill in fields so that I get immediate feedback. | Given I am on the settings page with 50% completeness, When I save a previously empty field, Then the percentage and visual update without a full page reload. | Should |
| PC-4 | As a builder viewing my own profile, I want a subtle nudge when my profile is incomplete so that I remember to finish it. | Given I am on my own profile page and my completeness is below 100%, When the page loads, Then I see a small completeness indicator near the identity section with a link to settings. | Should |

## User Flows

### Flow 1: Discovering and acting on completeness (settings page)

```
1. Builder navigates to /settings.
2. At the top of the page (before the form fields), a completeness section displays:
   - A circular progress ring showing the percentage (e.g., "67%").
   - A label: "Profile Completeness".
   - Below, a list of missing fields: "Add your bio", "Set your timezone", etc.
   - Each item links to its corresponding input field on the same page (scroll + focus).
3. Builder clicks "Add your bio."
4. Page scrolls to the bio textarea, which receives focus.
5. Builder types a bio and clicks Save.
6. The completeness section updates: percentage increases, "Add your bio" disappears from the list.
7. Builder repeats until 100% — at which point the missing-fields list disappears
   and the ring shows a filled state with a "Complete" label.
```

### Flow 2: Nudge on own profile page

```
1. Builder visits their own profile page (/profile/[username]).
2. Below the avatar and name block, a small inline badge shows: "67% complete · Finish profile →"
3. Clicking "Finish profile →" navigates to /settings.
4. When completeness reaches 100%, this badge no longer appears.
5. Other users visiting this profile never see this badge.
```

### Flow 3: Already complete

```
1. Builder who has filled all tracked fields visits /settings.
2. The completeness section shows 100% with a filled ring.
3. No missing fields listed.
4. No nudge appears on their profile page.
```

## Success Criteria

- [ ] Builders who see the completeness indicator fill in at least 1 additional field within the same session at a rate of 40%+
- [ ] Average profile completeness across all active builders increases by 15 percentage points within 30 days of launch
- [ ] 100% of completeness field checks match the backend `calculate_profile_completeness` logic (no drift between frontend display and backend score)
- [ ] Settings page load time does not increase by more than 100ms (completeness is computed server-side, returned as a single field)

## Scope

### In Scope

- Exposing profile completeness as a GraphQL field on the user type
- Settings page: completeness ring, percentage, missing-field checklist with scroll-to-field links
- Profile page (own): inline completeness nudge badge
- Real-time update after saving profile changes (refetch or optimistic)
- Matching the existing `calculate_profile_completeness` logic from `score_service.py`

### Out of Scope (and why)

- **Gamification (badges, streaks, rewards):** Requires a reward system that does not exist. Completeness should feel informational, not gamified. Revisit after Builder Score is fully surfaced.
- **Onboarding integration:** The onboarding flow (F1) is a separate feature with its own progressive disclosure. Adding completeness nudges to onboarding is a separate spec.
- **Email/push reminders about incomplete profiles:** The platform does not send emails (product decision from F3). Completeness is shown in-app only.
- **Completeness visible to other users:** Displaying someone else's completeness percentage leaks private information and creates a judgment signal the platform doesn't want. Completeness is private to the profile owner.

## Dependencies

- **F1 Auth (User model and session):** Requires the authenticated user context from `/auth/me` to know whose profile to compute completeness for. Already built.
- **F2 Builder Profiles (UserType in GraphQL):** Requires `UserType` to add a `profileCompleteness` field. Already built at `src/backend/app/graphql/types/user.py`.
- **`score_service.calculate_profile_completeness`:** The backend function that computes completeness from user fields. Already implemented at `src/backend/app/services/score_service.py`. This spec reuses that logic rather than duplicating it.

## Security & Controls

- **Authentication:** The `profileCompleteness` field and missing-fields list are only meaningful for the authenticated user's own profile. The GraphQL field itself is read-only and computed, so exposing it on all UserType instances is safe (it reveals nothing beyond what the profile itself shows).
- **Authorization:** No new write operations. Completeness is derived from existing profile fields.
- **No PII concerns:** Completeness is a percentage (0.0-1.0). The missing-field names are generic labels ("bio", "timezone"), not user data.
- **Rate limiting:** Not applicable. This adds a computed field to an existing query, not a new endpoint.

## Risks

| Risk | Severity | Mitigation |
|------|----------|------------|
| Frontend completeness calculation drifts from backend | Medium | Single source of truth: backend computes and returns `profileCompleteness` and `missingFields`. Frontend never recomputes. |
| Users feel nagged by the profile nudge | Low | Nudge is subtle (inline badge, not a modal or banner), only on own profile, disappears at 100%. |
| Adding fields to completeness in the future breaks the percentage silently | Low | The tracked fields are defined in one place (`calculate_profile_completeness`). New fields require updating both the function and the missing-fields resolver. Add a test that asserts the field list is exhaustive. |

## Open Questions

None. The backend logic exists, the fields are defined, and the UI surfaces are clear.
