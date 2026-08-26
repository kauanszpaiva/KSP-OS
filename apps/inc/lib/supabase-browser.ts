import { createBrowserClient } from "@supabase/ssr";
import { resolveIncSupabaseConfig } from "./supabase-routing";

export function getBrowserSupabase() {
  const hostname =
    typeof window === "undefined" ? undefined : window.location.hostname;
  const config = resolveIncSupabaseConfig(hostname);
  if (!config) return null;
  return createBrowserClient(config.url, config.anonKey);
}
