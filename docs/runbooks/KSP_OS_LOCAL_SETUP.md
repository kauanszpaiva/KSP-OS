# KSP Dominion OS — Local Setup

## Prerequisites

- Node 22.x, pnpm 10.x.
- A Supabase project (cloud or local via the Supabase CLI).

## Install

```
pnpm install --frozen-lockfile
```

## Environment

Copy `.env.example` and set values (never commit real keys):

```
NEXT_PUBLIC_SUPABASE_URL=https://tqwnsxjrlomosfblleqy.supabase.co  # KSP Supabase backend
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=...                  # publishable/public key; set locally or in Vercel, never commit real keys
# NEXT_PUBLIC_SUPABASE_ANON_KEY=...                       # legacy fallback for older anon JWT projects
SUPABASE_SERVER_ONLY_SECRET_KEY=...                       # privileged server key — server only, never shipped to browser
# SUPABASE_SERVER_ONLY_SERVICE_KEY=...                    # legacy fallback for older service-role JWT projects
APP_ENV=local
```

Without these, the app renders `/setup` and login is disabled — builds still succeed. The runtime client only accepts HTTPS `*.supabase.co` URLs and refuses to read privileged Supabase keys in browser code.

## Database

Apply migrations in order to your Supabase project:

```
supabase db push          # or run supabase/migrations/*.sql in order
```

Migrations: `202607150001`, `202607150002`, `202607210001`.

### Seed identities (for the vertical slice)

Create auth users and matching `profiles`, one `organizations` row, and
`organization_memberships` with `internal_role`:

- Kauan → `founder_ceo`
- Vanessa → `executive_operations`
- Eric → `sales_specialist`
- Joshua → `designer`

(Use the Supabase dashboard or a seed script with the service role. `supabase/seed.sql` is a starting point.)

## Run

```
pnpm dev:command    # http://localhost:3000
pnpm dev:portal     # http://localhost:3001
```

## Verify

```
pnpm lint
pnpm format:check
pnpm typecheck
pnpm test
pnpm build:command && pnpm build:portal
```

## Optional: browser journey

With the app running and identities seeded:

```
E2E_BASE_URL=http://localhost:3000 KAUAN_EMAIL=... KAUAN_PASSWORD=... ERIC_EMAIL=... ERIC_PASSWORD=... pnpm e2e
```
