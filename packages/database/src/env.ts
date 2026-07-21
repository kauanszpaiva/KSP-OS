/**
 * Environment access for Supabase. Values are read lazily so the app can build
 * without secrets present (CI, preview builds). Nothing here throws at import.
 */

export interface SupabasePublicEnv {
  url: string;
  anonKey: string;
}

export function readPublicEnv(): SupabasePublicEnv | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anonKey) return null;
  return { url, anonKey };
}

export function isSupabaseConfigured(): boolean {
  return readPublicEnv() !== null;
}

/**
 * Server-only service-role key. Never expose to the browser. Guarded so an
 * accidental client-side import fails loudly instead of leaking the key.
 */
export function readServiceRoleKey(): string | null {
  if (typeof window !== 'undefined') {
    throw new Error('service_role_key_must_not_be_read_in_browser');
  }
  return process.env.SUPABASE_SERVER_ONLY_SERVICE_KEY ?? null;
}
