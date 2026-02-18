# Backend Test Catalog

**643 tests** across **43 files** | 643 passed, 2 skipped

## Models (8 files, 166 tests)

| File | Tests | Coverage |
|------|------:|----------|
| `test_user.py` | 43 | User, RefreshToken, user_skills models — columns, types, constraints, indexes, relationships, defaults |
| `test_project.py` | 32 | Project, ProjectCollaborator models — columns, FK constraints, indexes, status enum, JSON fields |
| `test_tribe.py` | 36 | Tribe, TribeOpenRole, tribe_members association — columns, constraints, relationships, open roles |
| `test_skill.py` | 11 | Skill model — columns, slug uniqueness, category enum, user relationship |
| `test_feed_event.py` | 16 | FeedEvent model — columns, actor FK, indexes (created_at desc, composite, actor_id), EventType enum |
| `test_build_activity_model.py` | 9 | BuildActivity model — columns, FK constraints, source enum, timestamp defaults |
| `test_base.py` | 10 | Base model mixin — id ULID generation, created_at/updated_at server defaults, metadata registration |
| `test_enums.py` | 30 | All 11 StrEnum types — inheritance, value correctness, count validation, string behavior |

## Services (7 files, 121 tests)

| File | Tests | Coverage |
|------|------:|----------|
| `test_user_service.py` | 24 | get_by_id, get_by_id_with_skills, update_profile (11 field tests + validation), add/remove skill |
| `test_project_service.py` | 19 | create, update, delete (owner-only), invite/confirm/decline collaborator, remove collaborator |
| `test_tribe_service.py` | 18 | create, update (owner-only), request_to_join, approve/reject member, remove/leave tribe |
| `test_auth_service.py` | 16 | signup (duplicate email/username), login (success, wrong password, no user), JWT token lifecycle |
| `test_feed_service.py` | 10 | get_feed pagination, create_event, event ordering, limit/offset |
| `test_burn_service.py` | 10 | get_summary (weeks param, activity aggregation), get_receipt (project-scoped, peak week) |
| `test_score_service.py` | 24 | recalculate (no user, no projects, shipped projects, score persistence), scoring formula |

## GraphQL Types (6 files, 82 tests)

| File | Tests | Coverage |
|------|------:|----------|
| `test_types_auth.py` | 4 | AuthPayload — Strawberry type validation, field presence, instantiation |
| `test_types_burn.py` | 15 | BurnDayType, BurnReceiptType, BurnSummaryType — fields, types, instantiation, nested data |
| `test_types_skill.py` | 8 | SkillType — fields, types, from_model conversion, category enum mapping |
| `test_project_types.py` | 17 | ProjectType, CollaboratorType — fields, lazy resolvers, from_model with relationships |
| `test_tribe_types.py` | 28 | TribeType, TribeMemberType, OpenRoleType — fields, lazy resolvers, from_model, membership data |
| `test_feed_event_types.py` | 10 | FeedEventType — fields, types, actor resolver (returns None), event_type enum, metadata |

## Mutations (6 files, 122 tests)

| File | Tests | Coverage |
|------|------:|----------|
| `test_mutations_auth.py` | 15 | signup, login, refreshToken, logout, completeOnboarding — success + error paths via GraphQL |
| `test_mutations_projects.py` | 26 | createProject, updateProject, deleteProject, inviteCollaborator, confirm/decline/remove — auth + ownership |
| `test_mutations_tribes.py` | 37 | createTribe, updateTribe, addOpenRole, removeOpenRole, requestToJoin, approve/reject/remove/leave — full membership lifecycle |
| `test_mutations_feed.py` | 15 | Feed query integration — pagination, event type filtering, metadata structure |
| `test_mutations_burn.py` | 9 | burnSummary, burnReceipt queries via GraphQL — parameter handling, response structure |
| `test_mutations_profile.py` | 10 | updateProfile mutation — field updates, auth required, validation errors |

## Queries (2 files, 5 tests)

| File | Tests | Coverage |
|------|------:|----------|
| `test_health_query.py` | 4 | Health query — status field, database connectivity check, response format |
| `test_health.py` | 1 | Health endpoint — HTTP health check |

## Seed Data (6 files, 64 tests)

| File | Tests | Coverage |
|------|------:|----------|
| `test_seed_skills.py` | 9 | 103 skills across 8 categories — count, slug generation, category distribution |
| `test_seed_users.py` | 9 | 10 users — builder scores, roles, availability statuses, skill relationships, profile completeness |
| `test_seed_projects.py` | 12 | Projects — owner assignment, status distribution, tech stack, collaborator setup |
| `test_seed_tribes.py` | 8 | Tribes — owner/member setup, open roles, status, max_members |
| `test_seed_feed_events.py` | 11 | Feed events — all event types, actor assignment, metadata structure, chronological ordering |
| `test_seed_build_activities.py` | 8 | Build activities — source distribution, token amounts, date ranges, user assignment |
| `test_seed_package.py` | 3 | Seed package — module imports, function availability |

## Infrastructure (7 files, 56 tests)

| File | Tests | Coverage |
|------|------:|----------|
| `test_config.py` | 4 | Settings — database URL, secret key, CORS origins, environment defaults |
| `test_context.py` | 7 | GraphQL context — session injection, auth token extraction, user resolution |
| `test_schema.py` | 29 | Full schema introspection — all query/mutation fields exist, argument types, return types |
| `test_main.py` | 7 | FastAPI app — CORS middleware, GraphQL endpoint mount, startup/shutdown (2 skipped: require running server) |
| `test_engine.py` | 7 | Database engine — async engine creation, session factory, connection pooling |
| `test_conftest_fixtures.py` | 9 | Test infrastructure — async_engine, async_session, seed_test_data, async_client, transaction rollback |
| `test_auth_e2e.py` | 4 | End-to-end auth — signup → onboarding flow, JWT token validation, unauthorized access |

## Helpers (1 file, 11 tests)

| File | Tests | Coverage |
|------|------:|----------|
| `test_helpers.py` | 11 | Utility functions — ULID generation, pagination helpers, input validation |
