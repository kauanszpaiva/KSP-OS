# Vercel Deployment Setup

## Command OS

- Project name: `ksp-command-os`
- Root directory: `apps/command`
- Recommended domain: `app.kspdominion.com`
- Environment variables: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, server-only service credentials in protected Vercel env only when server jobs require them.

## Client Portal

- Project name: `ksp-client-portal`
- Root directory: `apps/portal`
- Recommended domain: `portal.kspdominion.com`
- Environment variables: use the same non-production Supabase project for local/Preview/Staging as appropriate, never Production for Preview/local.

## Promotion rule

Local -> Pull Request -> Vercel Preview -> Staging Supabase -> Production approval -> Production Supabase.

Do not deploy Production until migrations, RLS tests, smoke tests, backup/rollback, and human approvals pass.
