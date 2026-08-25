# KSP Network

KSP Network is the standalone KSP workspace for external partners, freelancers and subcontractors.

## Boundary

- `apps/command`: internal KSP operations
- `apps/portal`: client-facing workspace
- `apps/network`: partner/subcontractor workspace

Network access is invite-only. KSP INC creates an expiring one-time `/invite/<token>` link; the recipient can create a password, confirm email through `/auth/callback`, preview the partner role, and accept exactly once. Invitation rows are never readable from the browser; preview and acceptance use narrow server functions.

Network reuses the shared Supabase/Auth/RLS foundation from the monorepo, but owns its own Next.js runtime, session redirects, routes and deployment boundary.

## Local development

```bash
pnpm dev:network
```

Default local port: `3002`.

## Build

```bash
pnpm build:network
```

A Vercel project for Network should use `apps/network` as its Root Directory and the same public Supabase project mapping used by the approved partner-operations environment. Secrets remain provider-managed and must not be committed.
