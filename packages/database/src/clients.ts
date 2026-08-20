import { createBrowserClient as createSsrBrowserClient, createServerClient as createSsrServerClient } from '@supabase/ssr';
import { createClient as createSupabaseClient, type SupabaseClient } from '@supabase/supabase-js';
import { readPublicEnv, readServiceRoleKey } from './env';

export type { SupabaseClient } from '@supabase/supabase-js';

/**
 * Cookie adapter the caller (Next app) supplies. Keeps this package free of any
 * framework import so it can be reused by route handlers, server actions, and
 * middleware without coupling to `next/headers`.
 */
export interface CookieAdapter {
  getAll(): Array<{ name: string; value: string }>;
  setAll(cookies: Array<{ name: string; value: string; options?: Record<string, unknown> }>): void;
}

/** Browser client — uses only public env. Returns null when unconfigured. */
export function createBrowserClient(): SupabaseClient | null {
  const env = readPublicEnv();
  if (!env) return null;
  return createSsrBrowserClient(env.url, env.anonKey);
}

/** Request-scoped server client bound to the user's session via cookies. */
export function createServerClient(cookies: CookieAdapter): SupabaseClient | null {
  const env = readPublicEnv();
  if (!env) return null;
  return createSsrServerClient(env.url, env.anonKey, {
    cookies: {
      getAll: () => cookies.getAll(),
      setAll: (toSet: Array<{ name: string; value: string; options?: Record<string, unknown> }>) => cookies.setAll(toSet)
    }
  });
}

/**
 * User-token client for machine callers (the AI connector API). Binds a Supabase
 * access token as the Authorization header so every query runs as that user with
 * their RLS in force — it is NOT service-role and grants no elevated access. The
 * caller must still resolve getAuthContext to confirm an active membership.
 */
export function createTokenClient(accessToken: string): SupabaseClient | null {
  const env = readPublicEnv();
  if (!env || !accessToken) return null;
  return createSupabaseClient(env.url, env.anonKey, {
    global: { headers: { Authorization: `Bearer ${accessToken}` } },
    auth: { autoRefreshToken: false, persistSession: false }
  });
}

/**
 * Service-role client for trusted server-side jobs only. Bypasses RLS, so it is
 * used sparingly and never in request paths that act on behalf of a user without
 * an explicit authorization check first.
 */
export function createServiceClient(): SupabaseClient | null {
  const env = readPublicEnv();
  const key = readServiceRoleKey();
  if (!env || !key) return null;
  return createSupabaseClient(env.url, key, {
    auth: { autoRefreshToken: false, persistSession: false }
  });
}
