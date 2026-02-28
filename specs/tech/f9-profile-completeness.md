# RFC: Profile Completeness

> See [specs/product/f9-profile-completeness.md](../product/f9-profile-completeness.md) for product context.
> Depends on: [F1 Auth](./f1-auth-onboarding.md) (User model, session), [F2 Profiles](./f2-builder-profiles.md) (UserType).

## Basic Example

```graphql
query GetBuilder($username: String!) {
  builder(username: $username) {
    id
    displayName
    profileCompleteness     # 0.67
    missingProfileFields    # ["bio", "timezone"]
    builderScore
  }
}
```

A builder with avatar, headline, primary role, and contact links filled but missing bio and timezone returns `profileCompleteness: 0.67` and `missingProfileFields: ["bio", "timezone"]`.

## Data Model

No new tables or columns. Profile completeness is a computed field derived from existing columns on the `users` table.

### Tracked Fields

The completeness calculation uses these six fields from the `users` table (matching the existing `calculate_profile_completeness` function in `score_service.py`):

| Field | Column | Type | Complete when |
|-------|--------|------|---------------|
| Avatar | `avatar_url` | `VARCHAR` nullable | Non-null, non-empty string |
| Headline | `headline` | `VARCHAR(200)` nullable | Non-null, non-empty string |
| Bio | `bio` | `TEXT` nullable | Non-null, non-empty string |
| Role | `primary_role` | `ENUM(UserRole)` nullable | Non-null |
| Timezone | `timezone` | `VARCHAR(50)` nullable | Non-null, non-empty string |
| Contact Links | `contact_links` | `JSONB` | Non-null, at least one key-value pair |

**Completeness formula:** `completed_field_count / 6`

This matches `score_service.calculate_profile_completeness` exactly. No divergence.

## API Surface

### New Fields on `UserType`

Two computed fields added to the existing `UserType` Strawberry type:

```python
@strawberry.type
class UserType:
    # ... existing fields ...

    @strawberry.field
    def profile_completeness(self) -> float:
        """0.0 to 1.0 fraction of tracked profile fields filled."""
        ...

    @strawberry.field
    def missing_profile_fields(self) -> list[str]:
        """Human-readable labels for unfilled profile fields.
        Returns e.g. ["bio", "timezone"]. Empty list when 100% complete."""
        ...
```

| Field | Return Type | Auth Required | Error Cases |
|-------|-------------|---------------|-------------|
| `profileCompleteness` | `Float!` (0.0-1.0) | No (read-only computed) | None — always returns a value |
| `missingProfileFields` | `[String!]!` | No (read-only computed) | None — returns empty list at 100% |

**Why no auth check on these fields?** They are computed from data that is already public on the user's profile (avatar, headline, bio, etc.). Exposing "this user has no bio" is equivalent to viewing their profile and seeing no bio. The frontend only renders the nudge UI for the authenticated user's own profile, but the GraphQL field itself is safe to expose.

### No New Mutations

No mutations needed. Completeness changes when the user updates their profile via the existing `updateProfile` mutation. After a successful `updateProfile`, the frontend refetches the builder query, which includes the updated `profileCompleteness` and `missingProfileFields`.

### No New Queries

Both fields are added to the existing `UserType`, which is already returned by the `builder(username)` query and the `me` query. No new query resolvers needed.

## Validation Rules

| Field | Constraints |
|-------|-------------|
| `profileCompleteness` | Always in range [0.0, 1.0]. Computed, not user-supplied. |
| `missingProfileFields` | Always a subset of `["avatar", "headline", "bio", "role", "timezone", "contact_links"]`. Computed, not user-supplied. |

No user input validation needed for this feature — both fields are read-only computed values.

## Security & Controls

- **No new endpoints.** Two computed fields on an existing type.
- **No PII exposure.** The field returns a float and a list of generic labels. It does not return the actual field values.
- **No write operations.** Completeness cannot be directly manipulated.
- **No rate limiting needed.** These fields piggyback on existing queries with existing rate limits.

## Key Decisions

| Decision | Choice | Alternatives Considered | Rationale |
|----------|--------|------------------------|-----------|
| Compute completeness in the GraphQL resolver, not store it | Computed field (no DB column) | Stored column recalculated on profile update | 6-field boolean check is trivial (~0.01ms). No stale data risk. A stored column would need triggers or service hooks to stay in sync, adding complexity for zero performance gain. |
| Return `missingProfileFields` as a list of strings | `["bio", "timezone"]` | Structured objects `[{field, label, anchor}]` | Keeps the API simple. The frontend owns the mapping from field name to human label and scroll anchor. The backend should not know about UI anchors. |
| Reuse `score_service.calculate_profile_completeness` logic | Inline the same boolean checks in the resolver | Import and call the function directly | The function takes a `User` model instance. The Strawberry resolver has access to field values but not the ORM model. Duplicating six boolean checks is clearer than passing the ORM object through. A shared constant list of field names ensures they stay in sync. |
| Surface on all `UserType` instances | Yes | Only on `me` query | No security concern (see above). Allows the profile page to access completeness without a separate query. Frontend gates the UI display on `isOwnProfile`. |

## Drawbacks

- **Field list coupling:** If a new profile field is added (e.g., `skills`, `agent_tools`), someone must remember to update both `calculate_profile_completeness` in `score_service.py` and the resolver's field list. Mitigation: a shared constant and a test that asserts both use the same list.
- **No persistence means no historical tracking.** We can't chart "completeness over time." For V1, this is acceptable. If analytics needs arise, we can add a periodic snapshot.

## File Impact

### Backend

| File | Change |
|------|--------|
| `src/backend/app/graphql/types/user.py` | Add `profile_completeness` and `missing_profile_fields` resolver methods to `UserType` |
| `src/backend/app/services/score_service.py` | Extract `COMPLETENESS_FIELDS` constant (shared list of field names) for reuse |
| `src/backend/tests/test_score_service.py` | Add tests asserting `COMPLETENESS_FIELDS` matches the fields used in `calculate_profile_completeness` |

### Frontend — GraphQL Layer

| File | Change |
|------|--------|
| `src/frontend/src/lib/graphql/queries/builders.ts` | Add `profileCompleteness` and `missingProfileFields` to the `GET_BUILDER` query selection set |
| `src/frontend/src/lib/graphql/types.ts` | Add `profileCompleteness: number` and `missingProfileFields: string[]` to the `Builder` interface |

### Frontend — New Components

| File | Change |
|------|--------|
| `src/frontend/src/components/features/completeness-ring.tsx` | **New.** Circular SVG progress ring. Props: `percentage: number`, `size: 'sm' \| 'lg'`. Uses `font-mono` for percentage text, `accent`/`shipped` stroke colors from design tokens. |
| `src/frontend/src/components/features/completeness-ring.test.tsx` | **New.** Tests: renders at 0%/50%/100%, correct aria attributes, size variants, checkmark at 100%. |
| `src/frontend/src/components/features/completeness-section.tsx` | **New.** Settings page section: ring + title + missing-fields checklist with scroll-to-field links. Props: `completeness: number`, `missingFields: string[]`. |
| `src/frontend/src/components/features/completeness-section.test.tsx` | **New.** Tests: renders missing fields, scroll links work, hides list at 100%, displays correct count. |
| `src/frontend/src/components/features/completeness-nudge.tsx` | **New.** Inline badge for own profile page. Props: `completeness: number`. Renders small ring + "N% complete · Finish profile →" text linking to `/settings`. Not rendered at 100%. |
| `src/frontend/src/components/features/completeness-nudge.test.tsx` | **New.** Tests: renders at <100%, hidden at 100%, links to /settings. |

### Frontend — Modified Pages

| File | Change |
|------|--------|
| `src/frontend/src/app/settings/page.tsx` | Import `CompletenessSection`. Insert above existing form sections. Pass `builder.profileCompleteness` and `builder.missingProfileFields`. Add `id` attributes (`field-avatar`, `field-headline`, `field-bio`, `field-role`, `field-timezone`, `field-contact-links`) to existing form inputs for scroll-to-field targeting. |
| `src/frontend/src/app/settings/page.test.tsx` | Add tests: completeness section renders, missing field links scroll to correct inputs. |
| `src/frontend/src/app/profile/[username]/profile-content.tsx` | Import `CompletenessNudge`. Insert below availability badge, inside identity column, gated on `isOwnProfile && completeness < 1.0`. |
| `src/frontend/src/app/profile/[username]/page.test.tsx` | Add tests: nudge renders on own profile when incomplete, hidden when complete, hidden on other profiles. |

## Dependencies

- **`UserType` at `src/backend/app/graphql/types/user.py`:** Must exist with current field set. Already built.
- **`calculate_profile_completeness` at `src/backend/app/services/score_service.py`:** Reference implementation for which fields matter. Already built.
- **`GET_BUILDER` query at `src/frontend/src/lib/graphql/queries/builders.ts`:** Must exist so we can add fields to it. Already built.
- **`updateProfile` mutation at `src/frontend/src/lib/graphql/mutations/profile.ts`:** Must exist so completeness updates after save. Already built.

## Unresolved Questions

None. The computation logic exists, the API surface is minimal (two computed fields), and the UI locations are defined in the PRD.
