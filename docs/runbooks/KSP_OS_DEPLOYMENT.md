# KSP Dominion OS — Deployment

Deployment model is Vercel (per-app), with Supabase as the managed backend.
This runbook is procedural; it does not grant or request Production secrets, and
Production deploys are not performed by automation or by this repository's agents.

## Apps

- `apps/command` (`@ksp/command`) and `apps/portal` (`@ksp/portal`) each have `vercel.json`. They deploy as separate Vercel projects with Root Directory set to the app folder (Tailwind content globs and builds assume the app dir is CWD).

## Environment variables (per Vercel project)

Set in Vercel project settings, never in git:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVER_ONLY_SERVICE_KEY` (server-only; used only by trusted server code, never exposed to the browser bundle)
- `APP_ENV`

The app builds without these (renders `/setup`), so preview builds do not require production credentials.

## Migrations

Apply Supabase migrations to the target project **before** promoting an app
build that depends on new tables. Order: `202607150001`, `202607150002`,
`202607210001`. Use the Supabase CLI or dashboard. Never run destructive
operations against Production data.

## CI gate

`.github/workflows/ci.yml` runs on PRs and pushes to `main`: format, lint,
typecheck, unit tests, migration/RLS/secret guards, and both builds, plus
dependency review. A change is not deployable until CI is green.

## Security headers

`apps/command/next.config.ts` sets a strict CSP (Supabase `connect-src` only),
`X-Frame-Options: DENY`, `nosniff`, referrer, and permissions policies. Preserve
these on any change.

## Controls (do not violate)

- No Production credentials, service-role keys, or direct Production DB access from this repo/agents.
- No direct push to protected `main`; no self-merge.
- No weakening of RLS, MFA, approval, audit, or finance invariants to ship.
