import { metadataCorsOptionsRequestHandler, protectedResourceHandler } from 'mcp-handler';

export const dynamic = 'force-dynamic';

const supabaseBase = (process.env.NEXT_PUBLIC_SUPABASE_URL ?? 'https://tqwnsxjrlomosfblleqy.supabase.co').replace(/\/$/, '');

const handler = protectedResourceHandler({
  authServerUrls: [`${supabaseBase}/auth/v1`]
});

const corsHandler = metadataCorsOptionsRequestHandler();

export { handler as GET, corsHandler as OPTIONS };
