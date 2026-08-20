import { createServerClient } from '@ksp/database';
import { NextResponse, type NextRequest } from 'next/server';

/**
 * Refreshes the Supabase auth session on each navigation so server components
 * read a valid token. No-op when Supabase env is absent (build/CI).
 *
 * Uses the shared `@ksp/database` client so the public key resolution matches
 * the rest of the app: `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` is preferred and
 * `NEXT_PUBLIC_SUPABASE_ANON_KEY` remains a legacy fallback.
 */
export async function middleware(request: NextRequest) {
  const response = NextResponse.next({ request });

  const supabase = createServerClient({
    getAll: () => request.cookies.getAll().map((c) => ({ name: c.name, value: c.value })),
    setAll: (toSet) => {
      for (const { name, value, options } of toSet) {
        response.cookies.set(name, value, options);
      }
    }
  });
  if (!supabase) return response;

  await supabase.auth.getUser();
  return response;
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|api/health).*)']
};
