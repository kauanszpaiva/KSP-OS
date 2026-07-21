import { cookies } from 'next/headers';
import { createServerClient, isSupabaseConfigured, type SupabaseClient } from '@ksp/database';

export { isSupabaseConfigured };

/**
 * Request-scoped Supabase client bound to the caller's session cookies. Returns
 * null when Supabase env is absent (e.g. CI build) so pages can render a
 * configuration notice instead of crashing.
 */
export async function getServerSupabase(): Promise<SupabaseClient | null> {
  const cookieStore = await cookies();
  return createServerClient({
    getAll: () => cookieStore.getAll().map((c) => ({ name: c.name, value: c.value })),
    setAll: (toSet) => {
      try {
        for (const { name, value, options } of toSet) {
          cookieStore.set(name, value, options);
        }
      } catch {
        // set() throws in Server Components (read-only cookies); the middleware
        // is responsible for persisting refreshed tokens. Safe to ignore here.
      }
    }
  });
}
