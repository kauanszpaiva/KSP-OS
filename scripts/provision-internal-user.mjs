#!/usr/bin/env node
/**
 * Provision an internal member login for KSP Dominion OS.
 *
 * Creates (idempotently) a Supabase Auth user, a matching `profiles` row, and an
 * `organization_memberships` row with an `internal_role`, so the person can sign
 * in at /login and resolve an active internal membership via getAuthContext.
 *
 * Secrets are NEVER read from source. Credentials come from environment
 * variables only, and the password is never printed or persisted by this script.
 *
 * Usage (run against your own Supabase project — do not target Production):
 *
 *   NEXT_PUBLIC_SUPABASE_URL="https://<project>.supabase.co" \
 *   SUPABASE_SERVER_ONLY_SECRET_KEY="<privileged server key>" \
 *   PROVISION_EMAIL="kauan@kspdominion.group" \
 *   PROVISION_PASSWORD="<the password>" \
 *   PROVISION_NAME="Kauan Paiva" \
 *   PROVISION_ROLE="founder_ceo" \
 *   node scripts/provision-internal-user.mjs
 *
 * Optional: ORG_SLUG (default "ksp-dominion"), ORG_NAME (default "KSP Dominion Group").
 *
 * Uses only Node's global fetch (Node 22+) against the Supabase Auth Admin API
 * and PostgREST — no extra dependencies to install.
 */

const INTERNAL_ROLES = new Set([
  'founder_ceo',
  'executive_operations',
  'project_manager',
  'department_lead',
  'developer',
  'designer',
  'capture_specialist',
  'videographer',
  'photographer',
  'editor',
  'content_specialist',
  'marketing_specialist',
  'sales_specialist',
  'contractor',
  'freelancer',
  'intern'
]);

function required(name) {
  const value = process.env[name];
  if (!value || value.trim().length === 0) {
    fail(`Missing required environment variable: ${name}`);
  }
  return value.trim();
}

function fail(message) {
  console.error(`\n  provision-internal-user: ${message}\n`);
  process.exit(1);
}

function assertAllowedUrl(url) {
  let parsed;
  try {
    parsed = new URL(url);
  } catch {
    fail(`NEXT_PUBLIC_SUPABASE_URL is not a valid URL: ${url}`);
  }
  if (parsed.protocol !== 'https:' || !parsed.hostname.endsWith('.supabase.co')) {
    fail('NEXT_PUBLIC_SUPABASE_URL must be an https://*.supabase.co URL.');
  }
  return parsed.origin;
}

async function readError(response) {
  const text = await response.text().catch(() => '');
  return `${response.status} ${response.statusText}${text ? ` — ${text}` : ''}`;
}

async function main() {
  const baseUrl = assertAllowedUrl(required('NEXT_PUBLIC_SUPABASE_URL'));
  const serviceKey =
    process.env.SUPABASE_SERVER_ONLY_SECRET_KEY?.trim() ||
    process.env.SUPABASE_SERVER_ONLY_SERVICE_KEY?.trim();
  if (!serviceKey) {
    fail('Set SUPABASE_SERVER_ONLY_SECRET_KEY (or legacy SUPABASE_SERVER_ONLY_SERVICE_KEY).');
  }

  const email = required('PROVISION_EMAIL').toLowerCase();
  const password = required('PROVISION_PASSWORD');
  const displayName = process.env.PROVISION_NAME?.trim() || email;
  const role = (process.env.PROVISION_ROLE?.trim() || 'founder_ceo').toLowerCase();
  const orgSlug = process.env.ORG_SLUG?.trim() || 'ksp-dominion';
  const orgName = process.env.ORG_NAME?.trim() || 'KSP Dominion Group';

  if (!INTERNAL_ROLES.has(role)) {
    fail(`PROVISION_ROLE "${role}" is not a valid internal_role. One of: ${[...INTERNAL_ROLES].join(', ')}`);
  }

  const authHeaders = { apikey: serviceKey, Authorization: `Bearer ${serviceKey}` };
  const restHeaders = { ...authHeaders, 'Content-Type': 'application/json' };

  // 1) Create the auth user (email confirmed so they can sign in immediately).
  let userId;
  const createRes = await fetch(`${baseUrl}/auth/v1/admin/users`, {
    method: 'POST',
    headers: { ...authHeaders, 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password, email_confirm: true })
  });

  if (createRes.ok) {
    const created = await createRes.json();
    userId = created.id;
    console.log(`Created auth user for ${email}.`);
  } else if (createRes.status === 422 || createRes.status === 409) {
    // Already exists — find and update the password so the login is usable.
    userId = await findUserIdByEmail(baseUrl, authHeaders, email);
    if (!userId) fail(`Auth user for ${email} exists but could not be located.`);
    const updateRes = await fetch(`${baseUrl}/auth/v1/admin/users/${userId}`, {
      method: 'PUT',
      headers: { ...authHeaders, 'Content-Type': 'application/json' },
      body: JSON.stringify({ password, email_confirm: true })
    });
    if (!updateRes.ok) fail(`Failed to update existing user password: ${await readError(updateRes)}`);
    console.log(`Auth user for ${email} already existed — password reset.`);
  } else {
    fail(`Failed to create auth user: ${await readError(createRes)}`);
  }

  // 2) Upsert the profile (id must equal the auth user id).
  const profileRes = await fetch(`${baseUrl}/rest/v1/profiles`, {
    method: 'POST',
    headers: { ...restHeaders, Prefer: 'resolution=merge-duplicates,return=minimal' },
    body: JSON.stringify({ id: userId, display_name: displayName, email })
  });
  if (!profileRes.ok) fail(`Failed to upsert profile: ${await readError(profileRes)}`);
  console.log('Profile row is in place.');

  // 3) Resolve the organization (create it if missing).
  const orgId = await ensureOrganization(baseUrl, restHeaders, orgSlug, orgName);

  // 4) Upsert the internal membership (unique on organization_id, profile_id, role).
  const membershipRes = await fetch(`${baseUrl}/rest/v1/organization_memberships`, {
    method: 'POST',
    headers: { ...restHeaders, Prefer: 'resolution=merge-duplicates,return=minimal' },
    body: JSON.stringify({
      organization_id: orgId,
      profile_id: userId,
      role,
      internal_role: role,
      scope: 'assigned'
    })
  });
  if (!membershipRes.ok) fail(`Failed to upsert membership: ${await readError(membershipRes)}`);

  console.log(`Membership set: ${email} -> ${role} @ ${orgSlug}.`);
  console.log(`\nDone. ${email} can now sign in at /login.`);
}

async function findUserIdByEmail(baseUrl, authHeaders, email) {
  for (let page = 1; page <= 20; page += 1) {
    const res = await fetch(`${baseUrl}/auth/v1/admin/users?page=${page}&per_page=200`, {
      headers: authHeaders
    });
    if (!res.ok) fail(`Failed to list users: ${await readError(res)}`);
    const body = await res.json();
    const users = Array.isArray(body) ? body : body.users ?? [];
    if (users.length === 0) return null;
    const match = users.find((u) => (u.email ?? '').toLowerCase() === email);
    if (match) return match.id;
  }
  return null;
}

async function ensureOrganization(baseUrl, restHeaders, slug, name) {
  const lookup = await fetch(
    `${baseUrl}/rest/v1/organizations?slug=eq.${encodeURIComponent(slug)}&select=id`,
    { headers: restHeaders }
  );
  if (!lookup.ok) fail(`Failed to look up organization: ${await readError(lookup)}`);
  const rows = await lookup.json();
  if (rows.length > 0) return rows[0].id;

  const insert = await fetch(`${baseUrl}/rest/v1/organizations`, {
    method: 'POST',
    headers: { ...restHeaders, Prefer: 'return=representation' },
    body: JSON.stringify({ name, slug })
  });
  if (!insert.ok) fail(`Failed to create organization: ${await readError(insert)}`);
  const created = await insert.json();
  console.log(`Created organization "${name}" (${slug}).`);
  return created[0].id;
}

main().catch((error) => fail(error?.message ?? String(error)));
