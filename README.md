# KSP OS

KSP OS is a private pnpm monorepo for KSP Dominion Group. The current repository is a deployable foundation: it contains secure application shells, shared packages, Supabase migration/test scaffolding, and CI checks. New business modules must be delivered as governed vertical slices after the workspace remains installable, testable, and deployable.

## Architecture

```text
KSP-OS/
├── apps/
│   ├── command/      # Command OS Next.js application
│   └── portal/       # Client Portal Next.js application
├── packages/         # Shared UI, domain, validation, auth, and platform packages
├── supabase/         # Migrations and SQL authorization tests
├── docs/             # Architecture, deployment, policy, and runbook documentation
├── tooling/          # Future repository tooling
├── package.json
├── pnpm-workspace.yaml
├── pnpm-lock.yaml
└── turbo.json
```

## Applications

- **Command OS** (`apps/command`): internal executive and operational workspace. It includes navigation and module shells only; production domain behavior must be completed through audited vertical slices.
- **Client Portal** (`apps/portal`): invite-only client-facing shell for published project updates, requests, approvals, deliverables, billing, and support. It must expose only client-safe, explicitly published records.

## Prerequisites

- Node.js 22 in CI and Vercel.
- pnpm 10.28.1 (pinned via the root `packageManager` field).

```bash
corepack enable
pnpm --version
pnpm install --frozen-lockfile
```

## Local development

```bash
pnpm dev:command
pnpm dev:portal
```

`pnpm dev:portal` passes `--port 3001` so the two apps can run side by side when needed.

## Build

```bash
pnpm build:command
pnpm build:portal
pnpm build
```

Vercel should create two projects from this repository. Each app ships a
`vercel.json` that pins the framework, install command, and build command, so
the only per-project setting to configure in the dashboard is the Root
Directory:

| Project | Root Directory | Config |
| --- | --- | --- |
| `ksp-command-os` | `apps/command` | `apps/command/vercel.json` |
| `ksp-client-portal` | `apps/portal` | `apps/portal/vercel.json` |

Enable **Include source files outside Root Directory** for both Vercel projects
so workspace packages (`packages/*`) and root configuration (lockfile,
`tsconfig.base.json`, Tailwind/PostCSS) are available during builds. The
committed `installCommand` runs `pnpm install --frozen-lockfile` from the app
directory, which resolves and links the entire workspace.

## Checks

```bash
pnpm format:check
pnpm lint
pnpm typecheck
pnpm test
pnpm test:db
pnpm test:rls
pnpm test:migrations
pnpm security:secrets
```

`pnpm test:e2e` currently verifies that browser automation entry points exist. It is not a full browser automation suite.

## Environment variables

The current application shells build without Supabase credentials. Configure these per Vercel environment before wiring runtime Supabase features:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` (preferred) or `NEXT_PUBLIC_SUPABASE_ANON_KEY` (legacy fallback)
- `APP_ENV`

Never expose `SUPABASE_SERVER_ONLY_SECRET_KEY` or `SUPABASE_SERVER_ONLY_SERVICE_KEY` through any `NEXT_PUBLIC_` variable or browser bundle.

## Current implementation status

- Workspace configuration, TypeScript configuration, CI, Tailwind/PostCSS configuration, and Vercel monorepo documentation are maintained at the repository level.
- Command OS and Client Portal are separate Next.js applications.
- Shared packages provide foundation types, validation, authorization, UI primitives, and test scaffolding.
- Supabase migrations and SQL tests are present as foundation checks; production credentials and deployments remain external setup tasks.
