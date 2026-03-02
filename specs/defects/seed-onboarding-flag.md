# Defect: Seed Onboarding Flag

**Severity:** P2-moderate
**Related Feature:** specs/product/f1-auth-onboarding.md
**Reproducibility:** always
**Last Known Working:** never worked

## Observed Behavior

After logging in with any seed user (e.g., `maya.chen@example.com` / `password123`), the app redirects to `/onboarding` which immediately bounces back to `/login`, creating an infinite redirect loop. The user never reaches the authenticated app.

The root cause: all seed users are created with `onboarding_completed = False`. The auth flow checks this flag and redirects unauthenticated-looking users away from protected routes.

## Expected Behavior

Seed users should log in and land on `/feed` (or `/discover`) without hitting the onboarding redirect. Seed users represent established builders with complete profiles — they should have `onboarding_completed = True`.

## Reproduction Steps

1. Start the app with `docker compose up`
2. Run migrations and seed: `docker compose exec backend bash -c "cd /app && alembic upgrade head && python manage.py seed"`
3. Navigate to `http://localhost:4200/login`
4. Enter `maya.chen@example.com` / `password123` and click "Sign in"
5. App redirects to `/onboarding`, then back to `/login`

## Environment

- Any browser, any OS
- Affects all 10 seed users
- Local development via docker-compose (frontend :4200, backend :8787, postgres :5433)

## Error Output

No console errors. The redirect is silent — the auth hook reads `onboardingCompleted: false` from the login response and triggers the redirect before the protected route renders.

## Additional Context

Workaround: manually set `onboardingCompleted: true` in localStorage via browser console:
```js
const auth = JSON.parse(localStorage.getItem('tribe_auth'));
auth.onboardingCompleted = true;
localStorage.setItem('tribe_auth', JSON.stringify(auth));
```

The fix is a one-line change in `src/backend/app/seed/users.py` — set `onboarding_completed=True` for all seed users.
