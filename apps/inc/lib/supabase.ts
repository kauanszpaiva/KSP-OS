import { isSupabaseConfigured, type SupabaseClient } from "@ksp/database";
import { createServerClient as createSsrServerClient } from "@supabase/ssr";
import { cookies, headers } from "next/headers";
import { resolveIncSupabaseConfig } from "./supabase-routing";

export { isSupabaseConfigured };

export async function getServerSupabase(): Promise<SupabaseClient | null> {
  const [cookieStore, headerStore] = await Promise.all([cookies(), headers()]);
  const hostname = (
    headerStore.get("x-forwarded-host") ??
    headerStore.get("host") ??
    undefined
  )
    ?.split(",")[0]
    ?.trim();
  const config = resolveIncSupabaseConfig(hostname);
  if (!config) return null;

  return createSsrServerClient(config.url, config.anonKey, {
    cookies: {
      getAll: () =>
        cookieStore
          .getAll()
          .map((cookie) => ({ name: cookie.name, value: cookie.value })),
      setAll: (toSet) => {
        try {
          for (const { name, value, options } of toSet)
            cookieStore.set(name, value, options);
        } catch {
          // Middleware persists refreshed cookies when Server Components are read-only.
        }
      },
    },
  });
}
