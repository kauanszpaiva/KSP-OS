# KSP Dominion OS — Test Strategy

Honest layering. A file-existence check is not a test; where a layer is not yet
executable in CI, that is stated plainly.

## Layers

| Layer | Tool | Runs in CI | What it covers |
|---|---|---|---|
| Unit — business invariants | Vitest | Yes (`pnpm test`) | Focus Governor cap, commitment date requirement, proof-gated executive completion, permission engine, finance |
| Type safety | tsc | Yes (`pnpm typecheck`) | All 14 workspace projects, strict |
| Migration guards | Node scripts | Yes | RLS present per table, migration RLS presence, required authz coverage terms |
| Secret guard | Node script | Yes | No service-role secrets committed |
| Build | Next.js | Yes | `build:command` + `build:portal` without secrets |
| DB behavior (RLS/triggers) | psql/pgTAP plan | **No** (needs live DB) | Invariants + cross-tenant/role denial (`supabase/tests/*.sql`) |
| Browser journey | Playwright | **No** (needs seeded DB + running app) | Critical journey, founder-vault denial, 375px no-scroll (`e2e/`) |

## Unit tests (runnable now)

`packages/domain/src/commitments.test.ts` (9), plus pre-existing permission/domain/finance tests. 16 total, green.

## DB / RLS tests

`supabase/tests/authorization.sql` (pre-existing plan) and `supabase/tests/operational_slice.sql` (slice). Required identities and assertions are enumerated in those files. To execute:

1. `supabase start` (or point at a scratch project).
2. Apply migrations.
3. Seed identities.
4. Run the assertion files with psql (or adopt pgTAP) and assert expected errors (e.g. `active_outcome_limit_reached`, `completion_requires_accepted_proof`).

## Browser journey (Playwright)

`e2e/critical-journey.spec.ts` covers outcome→commitment→assignment→focus→proof→completion→pulse, founder-vault denial, and the 375px no-horizontal-scroll check across desktop + mobile projects.

Run locally:

```
E2E_BASE_URL=http://localhost:3000 \
KAUAN_EMAIL=... KAUAN_PASSWORD=... ERIC_EMAIL=... ERIC_PASSWORD=... \
pnpm e2e
```

Specs `test.skip` without credentials, so they never produce a false green. They are deliberately excluded from the default CI job until a CI-provisioned Supabase + seed exists (a Phase 4 item).

## What to test as coverage grows

Happy path, empty state, invalid input, unauthorized access, cross-organization, cross-project, loading, failure, duplicate submission, expired access, suspended user, retry.
