import { createServerClient } from '@ksp/database';
import { metrics, logger, tracingContext } from '@ksp/observability';
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
  const requestId = crypto.randomUUID();
  request.headers.set('x-request-id', requestId);

  const path = request.nextUrl.pathname;

  const response = NextResponse.next({ request });
  response.headers.set('x-request-id', requestId);

  return tracingContext.run({ requestId }, async () => {
    // Skip logging for static assets and health checks
    if (!path.startsWith('/_next') && !path.startsWith('/favicon.ico') && path !== '/api/health') {
      logger.info(`Request started: ${request.method} ${path}`, { method: request.method, path });
    }

    const supabase = createServerClient({
      getAll: () => request.cookies.getAll().map((c) => ({ name: c.name, value: c.value })),
      setAll: (toSet) => {
        for (const { name, value, options } of toSet) {
          response.cookies.set(name, value, options);
        }
      }
    });

    if (supabase) {
      try {
        await metrics.measure('middleware.auth.getUser', async () => {
          await supabase.auth.getUser();
        });
      } catch (error) {
        logger.warn('Failed to get user in middleware', { error });
      }
    }

    return response;
  });
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)']
};
