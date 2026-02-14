# Cleanup: Remove Endorsements

## Context

Endorsements were built into the codebase but violate the product vision. The product overview explicitly lists endorsements as a **Won't Have (V1)** feature:

> **Endorsements / Testimonials** — Avoids performative endorsement culture. Builder Score is computed, not written.

All endorsement references have been removed from specs. The code must now be cleaned up to match.

## What to Remove

### Files to Delete

1. `src/backend/app/models/endorsement.py` — SQLAlchemy Endorsement model
2. `src/backend/app/graphql/types/endorsement.py` — Strawberry EndorsementType
3. `src/backend/app/seed/endorsements.py` — Endorsement seed data
4. `src/frontend/src/components/features/endorsement-card.tsx` — EndorsementCard component

### Files to Edit (remove endorsement references)

**Backend models:**
5. `src/backend/app/models/user.py` — Remove `endorsements_received` relationship and the `Endorsement` import
6. `src/backend/app/models/__init__.py` — Remove `Endorsement` import and export

**Backend seed:**
7. `src/backend/app/seed/run.py` — Remove endorsement import, `DROP TABLE IF EXISTS endorsements` line, endorsement seeding block

**Backend GraphQL:**
8. `src/backend/app/graphql/queries/health.py` — Remove Endorsement import, remove `selectinload(User.endorsements_received)` eager loading chain, remove `endorsements=user.endorsements_received` from UserType construction
9. `src/backend/app/graphql/types/user.py` — Remove `_endorsements` private field, `endorsements` property/resolver, `EndorsementType` import, endorsement conversion in `from_model`
10. `src/backend/app/graphql/types/__init__.py` — Remove `EndorsementType` import and export
11. `src/backend/app/graphql/types/tribe.py` — Remove `_endorsements=[]` from all UserType constructions
12. `src/backend/app/graphql/types/project.py` — Remove `_endorsements=[]` from all UserType constructions

**Frontend:**
13. `src/frontend/src/lib/graphql/types.ts` — Remove `Endorsement` interface, remove `endorsements` field from `Builder` interface
14. `src/frontend/src/lib/graphql/queries/builders.ts` — Remove `endorsements { ... }` from GraphQL query
15. `src/frontend/src/app/profile/[username]/page.tsx` — Remove `EndorsementCard` import, remove endorsements section from profile page
16. `src/frontend/src/app/profile/[username]/page.test.tsx` — Remove `endorsements: []` from mock data

### Database Migration

17. Create an Alembic migration to drop the `endorsements` table.

## Acceptance Criteria

- No file in `src/` contains the word "endorsement" (case-insensitive) after cleanup
- Backend starts without errors (`uvicorn app.main:app`)
- Frontend builds without errors (`npx tsc --noEmit`)
- All existing tests pass
- Alembic migration exists to drop the endorsements table

## Why This Matters

Every line of endorsement code is a contradiction. The specs say "Won't Have." The code says "built." This is exactly the kind of drift that erodes trust in the codebase as a source of truth. Clean it up so the code matches the vision.
