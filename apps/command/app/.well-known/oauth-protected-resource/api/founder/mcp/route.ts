import { metadataCorsOptionsRequestHandler, protectedResourceHandler } from 'mcp-handler';

export const dynamic = 'force-dynamic';

const supabaseBase = process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/\/$/, '');

const handler = supabaseBase
  ? protectedResourceHandler({
      authServerUrls: [`${supabaseBase}/auth/v1`]
    })
  : async () =>
      Response.json(
        { error: 'supabase_auth_not_configured' },
        {
          status: 503,
          headers: { 'Cache-Control': 'no-store' }
        }
      );

const corsHandler = metadataCorsOptionsRequestHandler();

export { handler as GET, corsHandler as OPTIONS };
