# 06 — Founder OS Release Evidence

**Status:** P0 evidence collected
**Date:** 2026-08-13
**Branch:** `claude/founder-os-brownfield-de0kbc`
**Production:** UNCHANGED. No Production Supabase mutation, no Production deploy, no service-role use, no Kauan-Home state changed.

---

## 1. Static guards

```
$ node scripts/check-migrations.mjs      → Validated 19 migration file(s).
$ node scripts/check-rls.mjs             → RLS policy coverage present for 61 tables.
$ node scripts/check-secrets.mjs         → No repository secrets matched configured patterns.
$ pnpm --filter @ksp/command lint        → Source lint guard passed.
$ pnpm format:check                       → 14 successful, 14 total (Repository formatting guard passed).
```

Pre-existing unrelated failure (also red on `main`, not caused by this change):
```
$ node scripts/check-e2e-placeholders.mjs → Missing e2e entry points: [ 'apps/command/app/(app)/executive/page.tsx' ]
```
`executive/page.tsx` does not exist on `main` either (`git ls-tree origin/main` confirms). Untouched by Founder OS.

## 2. Typecheck + unit tests + build

```
$ pnpm --filter @ksp/command typecheck   → tsc --noEmit (clean, no errors)

$ pnpm test                              → Test Files  17 passed (17)
                                            Tests  135 passed (135)
   including apps/command/lib/founder-nav.test.tsx (6 tests)

$ pnpm --filter @ksp/command build       → compiled successfully. Founder routes built:
     ƒ /founder            (redirect → /founder/home)
     ƒ /founder/home       2.76 kB
     ƒ /founder/inbox      2.82 kB
     ƒ /founder/vault      1.93 kB
     ƒ /founder/work       2.83 kB
     ƒ /founder-vault      (legacy redirect → /founder/vault)
```

## 3. RLS behavioral evidence — ephemeral PostgreSQL 16 cluster

Harness stubs the Supabase primitives (`auth.uid()`, `authenticated`/`anon` roles), applies the **exact** `is_founder()` helper and the **exact** `202608130002_founder_os_foundation.sql` policies, seeds fixtures, and drives the adversarial matrix. **24/24 PASS, 0 FAIL:**

```
PASS  A.select own inbox (rows=1)
PASS  A.select own tasks (rows=1)
PASS  A.after insert inbox=2 (rows=2)
PASS  A.update own reflected (rows=1)
PASS  A.delete own row (affected=1)
PASS  A.after delete inbox=1 (rows=1)
PASS  A.promotion visible to founder (rows=1)
PASS  B.select inbox = 0 rows (rows=0)
PASS  B.select tasks = 0 rows (rows=0)
PASS  B.select promotions = 0 rows (rows=0)
PASS  B.insert as self (owner=b1) denied (denied: new row violates row-level security policy for table "founder_inbox_items")
PASS  B.insert impersonating founder owner denied (denied: new row violates row-level security policy for table "founder_inbox_items")
PASS  B.update founder row affects 0 (affected=0)
PASS  B.delete founder row affects 0 (affected=0)
PASS  C.select inbox denied (no grant) (denied: permission denied for table founder_inbox_items)
PASS  C.insert denied (denied: permission denied for table founder_inbox_items)
PASS  D.select inbox = 0 rows (rows=0)
PASS  D.insert denied (denied: new row violates row-level security policy for table "founder_inbox_items")
PASS  E.select KSP inbox = 0 rows (rows=0)
PASS  E.insert into KSP org denied (not founder of a1) (denied: new row violates row-level security policy for table "founder_inbox_items")
PASS  E.insert own row into OTHER org but owner cross-check (denied: new row violates row-level security policy for table "founder_inbox_items")
PASS  waiting task requires waiting_on (denied: ... founder_tasks_waiting_has_context)
PASS  invalid item_type rejected (denied: ... founder_inbox_items_item_type_check)
PASS  duplicate promotion rejected (idempotency) (denied: 23505 duplicate key ... founder_promotions_unique)
```

Actors: A=Founder, B=Team member, C=Unauthenticated (anon), D=Other authed non-founder, E=Founder of a different org.

## 4. Full migration-chain rehearsal — real Postgres, seeded actors

All **19** migrations (including `202608130002`) applied in order to a fresh database with the Supabase auth bootstrap, then the seeded founder isolation matrix run under RLS:

```
MIGRATIONS_APPLIED_OK
NOTICE:  PASS founder self-read (inbox/tasks/promotions = 1)
NOTICE:  PASS member isolation (0 rows, insert/update/delete denied)
NOTICE:  PASS anon isolation (0 rows)
NOTICE:  PASS other-org founder isolation (0 rows, insert denied)
FOUNDER_ISOLATION_OK
```

The same assertions are wired into the CI database harness (`scripts/check-db-tests.mjs`) so they run on `postgres:17.6` on every CI pass. (Docker image pull was proxy-blocked in this environment; the identical matrix was executed on local PostgreSQL 16 instead — SQL is version-agnostic.)

## 5. CI harness extension

`scripts/check-db-tests.mjs` `actorTests` now seeds founder-private rows and asserts: founder self-read = 1; member sees 0 and cannot insert (own or impersonated owner) / update / delete; anon sees 0; other-org founder sees 0 and cannot insert; plus the `waiting_on` and `item_type` constraints. `supabase/tests/founder_os.sql` documents the full plan.

## 6. Browser evidence

Deferred. Founder routes build and render server-side (§2). The repo's Playwright e2e requires CI browser provisioning, and its placeholder guard is already red on `main` for an unrelated reason (§1). Desktop/mobile chrome is implemented (responsive sidebar + mobile bottom nav, focus states, aria-current, landmarks); full browser capture attaches in CI.

## 7. Git

- Branch: `claude/founder-os-brownfield-de0kbc`
- Head SHA (at PR open): `85c55acaeffcd20d54c912e1b5c8530561730486`
- Commits: `docs:` audit + security model → `db:` founder os private data foundation → `feat:` founder os context (home/inbox/my work/vault).
- PR: **DRAFT** — https://github.com/kauanszpaiva/KSP-OS/pull/50 (not merged).

## 8. Deployment

No deployment performed. A Vercel Preview, if the repo integration creates one automatically, would be acceptable for review; **Production remains unchanged** and is not authorized by any Preview.
