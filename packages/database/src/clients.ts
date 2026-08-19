import { createBrowserClient as createSsrBrowserClient, createServerClient as createSsrServerClient } from '@supabase/ssr';
import { createClient as createSupabaseClient, type SupabaseClient } from '@supabase/supabase-js';
import { readPublicEnv, readServiceRoleKey } from './env';
import { metrics, logger, getRequestId } from '@ksp/observability';

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

const customFetch = async (url: string | URL | Request, init?: RequestInit): Promise<Response> => {
  const start = Date.now();
  const requestId = getRequestId();
  const urlStr = url instanceof Request ? url.url : url.toString();
  const method = init?.method || (url instanceof Request ? url.method : 'GET');

  logger.debug(`Supabase Request: ${method} ${urlStr}`);

  try {
    const response = await fetch(url, init);
    const duration = Date.now() - start;

    // Attempt to extract query information if possible (for GET requests, it's often in URL parameters)
    const isMutation = method !== 'GET' && method !== 'HEAD';
    const operation = isMutation ? 'api.write' : 'api.read';

    metrics.recordLatency(operation, duration, {
      method,
      url: urlStr,
      status: response.status,
      isSupabase: true
    });

    if (!response.ok) {
      logger.warn(`Supabase Response Error: ${response.status}`, {
        url: urlStr,
        status: response.status
      });
    }

    return response;
  } catch (error) {
    const duration = Date.now() - start;
    const isMutation = method !== 'GET' && method !== 'HEAD';
    const operation = isMutation ? 'api.write' : 'api.read';

    metrics.recordLatency(operation, duration, {
      method,
      url: urlStr,
      success: false,
      isSupabase: true
    });

    logger.error(`Supabase Request Failed: ${method} ${urlStr}`, error);
    throw error;
  }
};

/** Browser client — uses only public env. Returns null when unconfigured. */
export function createBrowserClient(): SupabaseClient | null {
  const env = readPublicEnv();
  if (!env) return null;
  return createSsrBrowserClient(env.url, env.anonKey, {
    global: { fetch: customFetch }
  });
}

/** Request-scoped server client bound to the user's session via cookies. */
export function createServerClient(cookies: CookieAdapter): SupabaseClient | null {
  const env = readPublicEnv();
  if (!env) return null;
  return createSsrServerClient(env.url, env.anonKey, {
    cookies: {
      getAll: () => cookies.getAll(),
      setAll: (toSet: Array<{ name: string; value: string; options?: Record<string, unknown> }>) => cookies.setAll(toSet)
    },
    global: { fetch: customFetch }
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
    global: {
      headers: { Authorization: `Bearer ${accessToken}` },
      fetch: customFetch
    },
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
    auth: { autoRefreshToken: false, persistSession: false },
    global: { fetch: customFetch }
  });
}
