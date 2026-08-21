import { createMcpHandler, withMcpAuth } from 'mcp-handler';
import type { AuthInfo } from '@modelcontextprotocol/sdk/server/auth/types.js';
import { resolveFounderMcpAuth } from '../../../../lib/mcp/founder-auth';
import { registerFounderTools } from '../../../../lib/mcp/founder-tools';

/**
 * Founder-only Second Brain MCP.
 * Endpoint: /api/founder/mcp
 * Transport: stateless Streamable HTTP.
 * Auth: user-scoped Supabase bearer token + founder_ceo gate before tool listing.
 * Every tool then executes through the same RLS-scoped user client.
 */
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

const baseHandler = createMcpHandler(
  (server) => registerFounderTools(server),
  { serverInfo: { name: 'ksp-founder-second-brain', version: '1.0.0' } },
  { basePath: '/api/founder', disableSse: true, verboseLogs: false }
);

const verifyFounder = async (_req: Request, bearerToken?: string): Promise<AuthInfo | undefined> =>
  resolveFounderMcpAuth(bearerToken);

const handler = withMcpAuth(baseHandler, verifyFounder, { required: true });

export { handler as GET, handler as POST, handler as DELETE };
