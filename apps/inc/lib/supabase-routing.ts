const PUBLIC_INC_HOSTNAME = "ksp-os-inc.vercel.app";
const PRODUCTION_SUPABASE_URL = "https://tqwnsxjrlomosfblleqy.supabase.co";
const PRODUCTION_SUPABASE_PUBLISHABLE_KEY =
  "sb_publishable_NpvF7WGaA8Iy3xGWFRbZsQ_vvCxsiSs";

function normalizeHostname(hostname?: string): string | undefined {
  if (!hostname) return undefined;
  return hostname.trim().toLowerCase().split(":")[0];
}

export function resolveIncSupabaseConfig(hostname?: string) {
  // KSP INC's exact public hostname is a production owner surface. Browser,
  // middleware, and Server Components must all resolve the same Supabase
  // project; otherwise a successful browser login can be rejected server-side.
  if (normalizeHostname(hostname) === PUBLIC_INC_HOSTNAME) {
    return {
      url: PRODUCTION_SUPABASE_URL,
      anonKey: PRODUCTION_SUPABASE_PUBLISHABLE_KEY,
    };
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey =
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anonKey) return null;
  return { url, anonKey };
}
