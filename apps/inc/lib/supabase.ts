import { createServerClient, isSupabaseConfigured, type SupabaseClient } from '@ksp/database';
import { cookies } from 'next/headers';

export { isSupabaseConfigured };

export async function getServerSupabase(): Promise<SupabaseClient | null> {
  const cookieStore = await cookies();
  return createServerClient({
    getAll: () => cookieStore.getAll().map((cookie) => ({ name: cookie.name, value: cookie.value })),
    setAll: (toSet) => {
      try {
        for (const { name, value, options } of toSet) cookieStore.set(name, value, options);
      } catch {
        // Middleware persists refreshed cookies when Server Components are read-only.
      }
    }
  });
}
