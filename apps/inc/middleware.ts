import { createServerClient } from "@ksp/database";
import { logger, metrics, tracingContext } from "@ksp/observability";
import { NextResponse, type NextRequest } from "next/server";

export async function middleware(request: NextRequest) {
  const requestId = crypto.randomUUID();
  request.headers.set("x-request-id", requestId);

  const response = NextResponse.next({ request });
  response.headers.set("x-request-id", requestId);
  const path = request.nextUrl.pathname;

  return tracingContext.run({ requestId }, async () => {
    if (!path.startsWith("/_next") && !path.startsWith("/favicon.ico")) {
      logger.info(`KSP INC request: ${request.method} ${path}`, {
        method: request.method,
        path,
      });
    }

    const supabase = createServerClient({
      getAll: () =>
        request.cookies
          .getAll()
          .map((cookie) => ({ name: cookie.name, value: cookie.value })),
      setAll: (toSet) => {
        for (const { name, value, options } of toSet)
          response.cookies.set(name, value, options);
      },
    });

    if (supabase) {
      try {
        await metrics.measure("inc.middleware.auth.getUser", async () => {
          await supabase.auth.getUser();
        });
      } catch (error) {
        logger.warn("KSP INC middleware failed to refresh the session", {
          error,
        });
      }
    }

    return response;
  });
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
