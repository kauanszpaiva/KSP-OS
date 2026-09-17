const PUBLIC_INC_HOSTNAME = "ksp-os-inc.vercel.app";

function normalizeHostname(hostname?: string): string | undefined {
  if (!hostname) return undefined;
  return hostname.trim().toLowerCase().split(":")[0];
}

export function resolveIncSupabaseConfig(hostname?: string) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey =
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !anonKey) return null;

  // Production, preview, middleware, Server Components, and browser code must
  // all use the environment-selected Supabase project. Historically this helper
  // pinned the public INC hostname to a specific project/key in source, which
  // made a backend promotion impossible without a code deploy and could route
  // auth to a stale project. next.config.ts remains responsible for preventing a
  // main-branch deployment from using the isolated preview Supabase environment.
  normalizeHostname(hostname);
  return { url, anonKey };
}

export { PUBLIC_INC_HOSTNAME };
