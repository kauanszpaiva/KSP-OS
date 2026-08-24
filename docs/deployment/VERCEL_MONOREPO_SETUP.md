# Vercel Monorepo Setup

This repository deploys three independent Vercel projects from the same GitHub repository. Do not add a root `vercel.json` that forces a single build or output directory across the applications.

The project names and IDs below are verified from the GitHub Vercel integration on PR #120 (2026-08-24).

## Command OS Project

```text
Project Name: ksp-os-command
Project ID: prj_Ajm8CXfHQEdsC6LtMN6gayR9mi7r
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
Project Name: ksp-os-portal
Project ID: prj_nn06qnwA5kFwq0y2UBF74xcdK2TP
Git Repository: kauanszpaiva/KSP-OS
Production Branch: main
Framework Preset: Next.js
Root Directory: apps/portal
Install Command: use Vercel's detected pnpm workspace installation
Build Command: pnpm build
Output Directory: leave empty/default
Include source files outside Root Directory: enabled
```

## KSP Network Project

```text
Project Name: kspnetwork
Project ID: prj_fJtKOFCzofQPvkop1QDGr8qiZyXq
Git Repository: kauanszpaiva/KSP-OS
Production Branch: main
Framework Preset: Next.js
Root Directory: apps/network
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
pnpm build:network
pnpm build
```

If Vercel does not run an app-local `pnpm build` correctly from the selected root directory, use the tested workspace filter command for that application.

## Environment variables

Configure separate Preview, Staging, and Production values for all three projects:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `APP_ENV`

Do not expose `SUPABASE_SERVER_ONLY_SERVICE_KEY` as a `NEXT_PUBLIC_` variable. Ordinary page rendering must not require the service key.

Preview deployments must not silently use the production `appkspos` database. Verify the Preview Supabase target before using a Vercel Preview for authorization, migration, or seeded integration testing.

## Environment model

`Local -> Pull Request -> Vercel Preview -> Staging Supabase -> Production approval -> Production Supabase`

A Vercel Preview is an application deployment layer. It is not a substitute for the isolated Supabase staging database required for migration and RLS testing.

## Rollback

Rollback application code by reverting the repair commit or redeploying the last successful Vercel deployment for the affected project. Database rollback remains forward-fix/corrective migration based; do not rewrite applied migration history.
