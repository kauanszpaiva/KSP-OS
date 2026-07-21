/**
 * Environment access for Supabase. Values are read lazily so the app can build
 * without secrets present (CI, preview builds). Nothing here throws at import.
 */

export interface SupabasePublicEnv {
  url: string;
  /** Public browser-safe key. Supabase now calls this a publishable key; legacy anon keys remain supported. */
  anonKey: string;
}

function isAllowedSupabaseUrl(value: string): boolean {
  try {
    const parsed = new URL(value);
    return parsed.protocol === 'https:' && parsed.hostname.endsWith('.supabase.co');
  } catch {
    return false;
  }
}

function firstPresent(...values: Array<string | undefined>): string | undefined {
  return values.find((value) => value !== undefined && value.trim().length > 0);
}

export function readPublicEnv(): SupabasePublicEnv | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = firstPresent(process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
  if (!url || !anonKey || !isAllowedSupabaseUrl(url)) return null;
  return { url, anonKey };
}

export function isSupabaseConfigured(): boolean {
  return readPublicEnv() !== null;
}

/**
 * Server-only privileged Supabase key. Never expose to the browser. Guarded so
 * an accidental client-side import fails loudly instead of leaking the key.
 */
export function readServiceRoleKey(): string | null {
  if (typeof window !== 'undefined') {
    throw new Error('supabase_privileged_key_must_not_be_read_in_browser');
  }
  return firstPresent(process.env.SUPABASE_SERVER_ONLY_SECRET_KEY, process.env.SUPABASE_SERVER_ONLY_SERVICE_KEY) ?? null;
}
