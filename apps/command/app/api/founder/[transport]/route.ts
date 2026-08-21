import { createMcpHandler, withMcpAuth } from 'mcp-handler';
import type { AuthInfo } from '@modelcontextprotocol/sdk/server/auth/types.js';
import { resolveMcpAuth, type McpIdentity } from '../../../../lib/mcp/context';
import { registerFounderTools } from '../../../../lib/mcp/founder-tools';

/**
 * Founder-only Second Brain MCP.
 *
 * Endpoint: /api/founder/mcp
 * Transport: stateless Streamable HTTP.
 * Auth: the same user-scoped Supabase bearer token used by the Company MCP,
 * plus a hard founder_ceo role requirement before the tool catalog is exposed.
 * Every tool still executes through the caller's RLS-scoped Supabase client.
 */
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

const baseHandler = createMcpHandler(
  (server) => registerFounderTools(server),
  { serverInfo: { name: 'ksp-founder-second-brain', version: '1.0.0' } },
  { basePath: '/api/founder', disableSse: true, verboseLogs: false }
);

const verifyFounder = async (_req: Request, bearerToken?: string): Promise<AuthInfo | undefined> => {
  const auth = await resolveMcpAuth(bearerToken);
  const identity = auth?.extra?.identity as McpIdentity | undefined;
  if (!auth || !identity?.roles.includes('founder_ceo')) return undefined;
  return auth;
};

const handler = withMcpAuth(baseHandler, verifyFounder, { required: true });

export { handler as GET, handler as POST, handler as DELETE };
