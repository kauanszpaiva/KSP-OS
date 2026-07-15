# Vercel Monorepo Setup

This repository deploys two independent Vercel projects from the same GitHub repository. Do not add a root `vercel.json` that forces a single build or output directory for both applications.

## Command OS Project

```text
Project Name: ksp-command-os
Git Repository: kauanszpaiva/KSP-OS
Production Branch: main
Framework Preset: Next.js
Root Directory: apps/command
Install Command: use Vercel's detected pnpm workspace installation
Build Command: pnpm build
Output Directory: leave empty/default
Include source files outside Root Directory: enabled
```

## Client Portal Project

```text
Project Name: ksp-client-portal
Git Repository: kauanszpaiva/KSP-OS
Production Branch: main
Framework Preset: Next.js
Root Directory: apps/portal
Install Command: use Vercel's detected pnpm workspace installation
Build Command: pnpm build
Output Directory: leave empty/default
Include source files outside Root Directory: enabled
```

## Verified local commands

The intended verification commands are:

```bash
pnpm install --frozen-lockfile
pnpm build:command
pnpm build:portal
pnpm build
```

If Vercel does not run the app-local `pnpm build` correctly from the selected root directory, use the tested workspace filter commands instead:

```bash
pnpm --filter @ksp/command build
pnpm --filter @ksp/portal build
```

## Environment variables

Configure separate Preview, Staging, and Production values for both projects:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `APP_ENV`

Do not expose `SUPABASE_SERVER_ONLY_SERVICE_KEY` as a `NEXT_PUBLIC_` variable. Ordinary page rendering must not require the service key.

## Rollback

Rollback by reverting the repair commit or by redeploying the last successful Vercel deployment for each project. If a lockfile or dependency change is reverted, rerun `pnpm install --frozen-lockfile`, both filtered builds, and CI before merging.
