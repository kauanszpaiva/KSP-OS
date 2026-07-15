# KSP Dominion Command OS

Production-oriented modular monolith for KSP Dominion Group, built with Next.js, TypeScript, Supabase Postgres/Auth/Storage/RLS, Tailwind CSS, Vercel, GitHub Actions, Zod validation, and automated tests.

## Current operational state

This repository contains the secured foundation vertical slice: app shell, role workspaces, domain invariants, validation contracts, Supabase foundation migration with RLS policies, CI, security checks, and delivery documentation. The blueprint remains the source of truth; unfinished business modules must be completed through reviewable vertical slices rather than placeholders being treated as release-ready.

## Important directories

- `apps/web` — Next.js application and role workspaces.
- `packages/domain` — authorization, finance, approval, and prioritization domain logic.
- `packages/validation` — Zod command/input schemas.
- `supabase/migrations` — versioned database schema and RLS policies.
- `scripts` — local CI guardrails for secrets, migrations, and RLS coverage.
- `docs` — architecture, runbooks, deployment, security, and user guides.

## Local setup

```bash
corepack enable
pnpm install
cp .env.example .env.local
pnpm typecheck
pnpm test
pnpm test:rls
pnpm test:migrations
pnpm security:secrets
pnpm build
```

Never point local or Preview environments at Production Supabase. Use separate Supabase projects for Staging and Production.
