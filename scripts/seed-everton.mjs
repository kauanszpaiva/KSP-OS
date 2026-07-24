#!/usr/bin/env node
/**
 * One-command seed for the Everton / Bez Group client-portal login.
 *
 * Everton's non-secret details are pre-filled here; you only supply the two
 * secrets and a strong password at runtime (nothing sensitive is stored in
 * source):
 *
 *   NEXT_PUBLIC_SUPABASE_URL="https://<project>.supabase.co" \
 *   SUPABASE_SERVER_ONLY_SECRET_KEY="<service key>" \
 *   PORTAL_PASSWORD="<a strong password>" \
 *   pnpm seed:everton
 *
 * Run it against your OWN (non-Production) Supabase — never Production, and
 * never from an automated agent. It delegates to provision-portal-user.mjs.
 */

process.env.PORTAL_EMAIL ??= 'everton@bezgroup.com';
process.env.PORTAL_NAME ??= 'Everton';
process.env.CLIENT_ORG_NAME ??= 'Bez Group';
process.env.PORTAL_ROLE ??= 'client_owner';

if (!process.env.PORTAL_PASSWORD || process.env.PORTAL_PASSWORD.trim().length < 8) {
  console.error('\n  seed-everton: set PORTAL_PASSWORD to a strong password (at least 8 chars; do not reuse "password123").\n');
  process.exit(1);
}

// Delegates to the portal provisioning script, which runs on import.
await import('./provision-portal-user.mjs');
