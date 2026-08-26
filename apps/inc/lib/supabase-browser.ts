import { createBrowserClient } from "@supabase/ssr";

const PUBLIC_INC_HOSTNAME = "ksp-os-inc.vercel.app";
const PRODUCTION_SUPABASE_URL = "https://tqwnsxjrlomosfblleqy.supabase.co";
const PRODUCTION_SUPABASE_PUBLISHABLE_KEY =
  "sb_publishable_NpvF7WGaA8Iy3xGWFRbZsQ_vvCxsiSs";

export function resolveBrowserSupabaseConfig(hostname?: string) {
  // The public standalone INC hostname is an owner/root surface. It must never
  // authenticate against preview/staging, even if a promoted Vercel deployment
  // carries stale Preview environment variables. Preview hostnames still use
  // their injected environment and remain isolated from production.
  if (hostname === PUBLIC_INC_HOSTNAME) {
    return {
      url: PRODUCTION_SUPABASE_URL,
      key: PRODUCTION_SUPABASE_PUBLISHABLE_KEY,
    };
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key =
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return null;
  return { url, key };
}

export function getBrowserSupabase() {
  const hostname =
    typeof window === "undefined" ? undefined : window.location.hostname;
  const config = resolveBrowserSupabaseConfig(hostname);
  if (!config) return null;
  return createBrowserClient(config.url, config.key);
}
