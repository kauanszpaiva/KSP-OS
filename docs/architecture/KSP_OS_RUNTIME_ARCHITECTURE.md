# KSP Dominion OS — Runtime Architecture

## Topology

- **Monorepo**: pnpm workspace + Turbo. Apps: `apps/command` (internal OS), `apps/portal` (client portal — kept separate). Shared `packages/*`.
- **Framework**: Next.js 15 App Router, React 19, TypeScript strict.
- **Data**: Supabase Postgres + Auth + (future) Storage. RLS is the authorization backstop.

## Runtime packages (implemented)

- `@ksp/database` — env-guarded Supabase client factories:
  - `createBrowserClient()` — public env only.
  - `createServerClient(cookieAdapter)` — request-scoped, session-bound; framework-agnostic cookie adapter.
  - `createServiceClient()` — service-role, **server-only**; `readServiceRoleKey()` throws if read in a browser.
  - Typed row interfaces for slice tables. Returns `null` when unconfigured so builds succeed without secrets.
- `@ksp/auth` — `getSessionUser`, `getAuthContext` (resolves org, internal roles, `MembershipContext`), and role guards.
- `@ksp/permissions` — pure `canPerform` engine (pre-existing).
- `@ksp/validation` — Zod schemas incl. slice command schemas.
- `@ksp/domain` — pure operating invariants (Focus Governor, proof gate), unit-tested.

## Command app wiring

- `middleware.ts` — refreshes the Supabase session cookie per navigation; no-op without env.
- `lib/supabase.ts` — binds `@ksp/database` server client to Next `cookies()`.
- `lib/session.ts` — `readSession` / `requireSession` (redirects to `/login` or `/setup`).
- `app/(app)/layout.tsx` — `force-dynamic`, resolves session, filters nav by role, renders the shell.
- Server Components by default; Client Components only for interactive forms/shell.

## Critical write pipeline

Every consequential mutation (`app/(app)/actions.ts`) follows:

```
UI form → Server Action
  → Zod validation
  → getAuthContext (authentication)
  → guard / canPerform (authorization)
  → Supabase write (RLS + triggers enforce again)
  → activity_events + audit_events
  → revalidatePath
```

The browser never writes directly to critical tables; the anon/user key is
constrained by RLS, and the service-role key is never shipped to the client.

## Build/CI behavior without secrets

App routes under `(app)` are `force-dynamic`, so `next build` does not execute
DB calls at build time. Missing env renders `/setup` instead of crashing. Both
`build:command` and `build:portal` pass in CI with no Supabase project.
