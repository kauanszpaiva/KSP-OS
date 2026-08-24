# Vercel Deployment Setup

Current project mapping is verified from the GitHub Vercel integration on PR #120 (2026-08-24).

## Command OS

- Project name: `ksp-os-command`
- Project ID: `prj_Ajm8CXfHQEdsC6LtMN6gayR9mi7r`
- Root directory: `apps/command`
- Canonical production domain: `appkspdominion.com`
- Canonical production URL: `https://appkspdominion.com`
- Set `NEXT_PUBLIC_COMMAND_BASE_URL=https://appkspdominion.com` in the Production environment so generated Command links use the canonical origin.

## Client Portal

- Project name: `ksp-os-portal`
- Project ID: `prj_nn06qnwA5kFwq0y2UBF74xcdK2TP`
- Root directory: `apps/portal`
- Recommended domain: `portal.kspdominion.com`

## KSP Network

- Project name: `kspnetwork`
- Project ID: `prj_fJtKOFCzofQPvkop1QDGr8qiZyXq`
- Root directory: `apps/network`

## Environment variables

Keep Preview/Staging/Production values isolated for all surfaces. At minimum:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `APP_ENV`

Server-only service credentials belong only in protected Vercel environment variables when server jobs require them.

Preview must not use Production Supabase. The currently available Vercel connector cannot read the Preview environment-variable values, so the Preview database target must be treated as unverified until inspected through an authorized Vercel environment configuration path.

## Promotion rule

`Local -> Pull Request -> Vercel Preview -> Staging Supabase -> Production approval -> Production Supabase`

A Vercel Preview is not the Staging Supabase environment. Do not deploy Production database changes until migrations, positive/negative RLS tests, smoke tests, backup/forward-fix evidence, and release approvals pass.
