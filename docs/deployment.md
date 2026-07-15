# Deployment Guide

Use separate Vercel environments and Supabase projects.

1. Local: `.env.local` uses local or development Supabase only.
2. Preview: Vercel Preview uses non-production Supabase.
3. Staging: protected branch/environment, staging Supabase, migration rehearsal.
4. Production: manual approval, production Supabase, migration backup, smoke tests, rollback plan.

Required variables: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, server-only Supabase service key for controlled server jobs, and provider credentials as integrations are activated. Do not expose service-role keys to browser code.
