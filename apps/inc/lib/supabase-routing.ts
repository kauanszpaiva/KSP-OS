const PUBLIC_INC_HOSTNAME = "ksp-os-inc.vercel.app";
const CANONICAL_INC_HOSTNAMES = new Set([
  PUBLIC_INC_HOSTNAME,
  "ksp-os-inc-ksp-dominion-group.vercel.app",
  "ksp-os-inc-git-main-ksp-dominion-group.vercel.app",
]);

// These are browser-safe public credentials. Keeping the canonical owner-plane
// target here provides a runtime backstop against stale/static preview bundles
// being served under a production alias.
const KSPCENTER_SUPABASE_URL = "https://rmaxqwbjizivkhurvuvx.supabase.co";
const KSPCENTER_SUPABASE_PUBLISHABLE_KEY =
  "sb_publishable_-0aveLl4f5ZbtooQWa_lRg_E3MG4eEB";

function normalizeHostname(hostname?: string): string | undefined {
  if (!hostname) return undefined;
  return hostname.trim().toLowerCase().split(":")[0];
}

function isCanonicalIncHostname(hostname?: string): boolean {
  const normalized = normalizeHostname(hostname);
  return Boolean(normalized && CANONICAL_INC_HOSTNAMES.has(normalized));
}

export function resolveIncSupabaseConfig(hostname?: string) {
  // Production aliases must never inherit the preview Supabase target from a
  // stale build artifact or provider cache. Resolve them to KSPCENTER at request
  // time in browser, middleware and Server Components.
  if (isCanonicalIncHostname(hostname)) {
    return {
      url: KSPCENTER_SUPABASE_URL,
      anonKey: KSPCENTER_SUPABASE_PUBLISHABLE_KEY,
    };
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey =
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !anonKey) return null;
  return { url, anonKey };
}

export {
  PUBLIC_INC_HOSTNAME,
  CANONICAL_INC_HOSTNAMES,
  KSPCENTER_SUPABASE_URL,
};
