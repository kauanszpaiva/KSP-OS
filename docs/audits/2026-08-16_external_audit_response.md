# Response to the 2026-08-16 external audit (AI-0091 / RESP-0152 / CHG-0228)

Branch: `claude/ksp-os-audit-review-sy8rto`. Method: direct inspection of this
repository's migrations and application code, cross-referenced against the
external audit's findings. No Production Supabase project, logs, or advisor
output were reachable from this environment (per `CLAUDE.md`'s "no Production
secrets/access" rule) — findings that depend on those are called out
separately below and were **not** verified or fixed here.

## Findings verified against the repository and fixed

### P0-1 — RLS recursion on `projects` / `project_memberships` / `tasks` / missions

**Confirmed.** `can_access_project()` (`202607150001_foundation.sql`) and
`has_project_access()` (`202607150002_identity_portal_finance_security.sql`)
were declared `language sql stable` with no `security definer`. Every policy
that calls them — `projects_member_read`, `project_members_read`,
`tasks_project_read`, and the mission policies in `202607230002_missions.sql`
— re-enters the same RLS-protected table while evaluating the helper, which
re-enters it again, unbounded. This is the exact `stack depth limit
exceeded` / HTTP 500 the audit observed on `GET /rest/v1/projects` and `GET
/rest/v1/project_memberships`.

The sibling helpers (`current_org_ids`, `is_executive`, `is_internal_member`,
`is_founder`) were already corrected to `security definer set search_path =
public, pg_temp` in `202607210001_operational_slice.sql` — these two were
missed.

**Fix:** `supabase/migrations/202608160001_fix_rls_recursion_and_finance_rpc.sql`
redefines both functions as `security definer set search_path = public,
pg_temp`, matching the already-established pattern. They still only ever
return a boolean derived from `auth.uid()` — no row data crosses the
boundary.

### P0-3 — `post_journal_entry` reachable and under-checked

**Confirmed.** The function is `security definer` with no `set search_path`
(the exact Supabase advisor complaint) and had no `grant`/`revoke`
statement anywhere in the migration history — under Postgres' default PUBLIC
execute grant, that leaves it reachable by `anon` through PostgREST. The
body also trusted its `p_actor_id` argument and did nothing beyond
draft/balance/period checks — no identity or `finance.post` permission
check at all.

**Fix (same migration):**
- `set search_path = public, pg_temp` added.
- `auth.uid() is null` → `authentication_required`.
- `p_actor_id is distinct from auth.uid()` → `actor_mismatch` (the function
  no longer trusts a caller-supplied actor id).
- Requires `is_executive(v_org)` **or** an unrevoked, unexpired
  `internal_permission_grants` row for `finance.post` in that org before any
  posting logic runs.
- `revoke all ... from public/anon; grant execute ... to authenticated`
  makes the previously-implicit anon-reachability an explicit, closed gap.

### P0-4 — MFA is a hardcoded `true`, not real AAL

**Confirmed.** `packages/auth/src/context.ts` (`getAuthContext`) and
`packages/auth/src/portal-context.ts` (`getPortalAuthContext`) both set
`mfa: true` unconditionally. `packages/permissions`'s `canPerform` and
`packages/domain`'s `authorize` both gate `finance.post`,
`finance.reconcile`, `access.grant`, `access.revoke`, `production.deploy`,
`payment.refund` (and `approve`/`administer`/`export`) on `actor.mfa` — but
that gate was a no-op, since every session was reported as MFA-satisfied
regardless of actual step-up status.

**Fix:** added `getSessionAal()` to `packages/auth/src/context.ts`, which
calls Supabase's real `auth.mfa.getAuthenticatorAssuranceLevel()` and returns
`true` only when `currentLevel === 'aal2'` — fails closed (`false`) on any
error or missing data. Both `getAuthContext` and `getPortalAuthContext` now
call it instead of hardcoding `true`. Regression tests added in
`packages/auth/src/context.test.ts` (aal2 → true, aal1 → false, error/null →
false).

## Findings the audit raised that need Production/Supabase access we don't have

These require a live Supabase project connection, Production logs, or the
Supabase advisor — none of which this session has or is permitted to touch
(`CLAUDE.md`: no Production credentials/data/deployment):

- **P0-2 — Founder OS migration parity.** The repo *does* contain
  `202608130002_founder_os_foundation.sql` defining `founder_inbox_items`,
  `founder_tasks`, `founder_promotions` — so the code side is real, not
  vaporware. Whether it is actually applied to the live `appkspos` database is
  an operational fact this environment cannot check.
  `202608130001_runtime_reconciliation.sql`'s own header already documents
  this class of drift ("several later repository migrations are absent or
  only partially reflected in the live schema") — apply the pending
  migrations through the normal reviewed release flow to close this.
- **P0-5 / deployment SHA parity** — requires live CI/Vercel/Supabase state.
- **146 FKs without supporting indexes**, **Leaked Password Protection
  disabled**, and other Supabase Advisor items — require a live project
  connection to enumerate and act on; not verifiable from static SQL review
  alone with confidence about which are still current.
- **Actor-matrix / tenant-isolation E2E, rate limiting, request-memoization
  for `/auth/v1/user`, accessibility focus-trap E2E, Core Web Vitals** — all
  require a running app + live backend to exercise; out of scope for a
  static-repo fix pass.

## Verification run in this environment

All green on this branch after the fix:

- `pnpm test` — 151/151 tests pass (3 new, covering AAL fail-closed behavior).
- `pnpm typecheck` — 14/14 workspace projects pass.
- `pnpm lint` / `format:check` — pass.
- `node scripts/check-rls.mjs` / `check-migrations.mjs` — pass (61 tables,
  20 migration files).
- `node scripts/check-secrets.mjs` — no matches.
- `node scripts/check-db-tests-runner.mjs` — 15 SQL test plans found (Docker
  unavailable in this environment, so no live pgTAP rehearsal — same
  limitation the audit itself notes).
- `pnpm build:command` / `pnpm build:portal` — both compile and prerender.

## What did not change

No RLS policy was weakened, no table's RLS was disabled, no test was
removed, and no business rule was invented — per `CLAUDE.md`'s non-negotiable
controls. The three function bodies changed are additive/restrictive only
(tighter checks, not looser).
