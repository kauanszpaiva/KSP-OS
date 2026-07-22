#!/usr/bin/env node
/**
 * End-to-end login verification against a Supabase project.
 *
 * Mirrors exactly what the Command OS app does after sign-in:
 *   1. Password sign-in with the PUBLIC (publishable/anon) key — same call the
 *      /login page makes in the browser.
 *   2. Read `profiles` and `organization_memberships` AS THE SIGNED-IN USER
 *      (RLS applies), the same reads `getAuthContext` performs. If this passes,
 *      the app will resolve a session and land on /pulse.
 *
 * Env: NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
 *      VERIFY_EMAIL, VERIFY_PASSWORD. Never prints credentials.
 */

function fail(message) {
  console.error(`FAIL: ${message}`);
  process.exit(1);
}

function need(name) {
  const value = process.env[name];
  if (!value || value.trim().length === 0) fail(`Missing environment variable: ${name}`);
  return value.trim();
}

const baseUrl = need('NEXT_PUBLIC_SUPABASE_URL').replace(/\/$/, '');
const publicKey = need('NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY');
const email = need('VERIFY_EMAIL').toLowerCase();
const password = need('VERIFY_PASSWORD');

// 1) Sign in exactly like the /login page (browser-safe key only).
const signInRes = await fetch(`${baseUrl}/auth/v1/token?grant_type=password`, {
  method: 'POST',
  headers: { apikey: publicKey, 'Content-Type': 'application/json' },
  body: JSON.stringify({ email, password })
});
if (!signInRes.ok) {
  const body = await signInRes.text().catch(() => '');
  fail(`sign-in rejected for ${email} (HTTP ${signInRes.status}): ${body.slice(0, 300)}`);
}
const session = await signInRes.json();
const userId = session.user?.id;
const accessToken = session.access_token;
if (!userId || !accessToken) fail(`sign-in for ${email} returned no session`);
console.log(`Sign-in OK for ${email}.`);

const userHeaders = { apikey: publicKey, Authorization: `Bearer ${accessToken}` };

// 2) Same reads getAuthContext performs, under the user's own RLS context.
const profileRes = await fetch(
  `${baseUrl}/rest/v1/profiles?select=display_name,email&id=eq.${userId}`,
  { headers: userHeaders }
);
if (!profileRes.ok) fail(`profiles read failed (HTTP ${profileRes.status}) — are migrations applied?`);
const profiles = await profileRes.json();
if (profiles.length === 0) fail(`no profiles row for ${email} — run the provisioning step`);
console.log(`Profile OK (${profiles[0].display_name}).`);

const membershipRes = await fetch(
  `${baseUrl}/rest/v1/organization_memberships?select=organization_id,internal_role,suspended_at,effective_until&profile_id=eq.${userId}`,
  { headers: userHeaders }
);
if (!membershipRes.ok) fail(`memberships read failed (HTTP ${membershipRes.status}) — are migrations applied?`);
const memberships = await membershipRes.json();
const active = memberships.filter(
  (m) => m.internal_role && !m.suspended_at && (!m.effective_until || new Date(m.effective_until) > new Date())
);
if (active.length === 0) {
  fail(`${email} signed in but has no ACTIVE internal membership visible under RLS — the app would bounce back to /login`);
}
console.log(`Membership OK (${active.map((m) => m.internal_role).join(', ')}).`);
console.log(`PASS: ${email} can sign in and will land on /pulse.`);
