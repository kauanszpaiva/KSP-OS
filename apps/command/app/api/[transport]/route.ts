import { createMcpHandler, withMcpAuth } from 'mcp-handler';
import type { AuthInfo } from '@modelcontextprotocol/sdk/server/auth/types.js';
import { resolveMcpAuth } from '../../../lib/mcp/context';
import { registerTools } from '../../../lib/mcp/tools';

/**
 * Remote MCP server for KSP Command OS — a Vercel Function that exposes the
 * Command OS as Model Context Protocol tools for custom connectors in Claude and
 * ChatGPT. See docs/integrations/mcp-server.md.
 *
 * Transport: stateless Streamable HTTP. SSE is disabled, so there is no Redis
 * dependency and no server-side session state. With basePath `/api`, the single
 * connector endpoint is `/api/mcp` (the `[transport]` segment resolves to
 * `mcp`); static sibling routes `/api/health` and `/api/v1/*` keep precedence.
 *
 * Auth: `withMcpAuth` requires a valid bearer token on every request and
 * responds with the correct `WWW-Authenticate` challenge otherwise. Token
 * verification (`resolveMcpAuth`) runs the caller through a user-scoped Supabase
 * client and requires an active internal membership — RLS is the enforcement
 * backbone and there is no service-role path.
 */

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

const baseHandler = createMcpHandler(
  (server) => {
    registerTools(server);
  },
  {
    serverInfo: { name: 'ksp-command', version: '1.0.0' }
  },
  {
    basePath: '/api',
    disableSse: true,
    verboseLogs: false
  }
);

const verifyToken = async (_req: Request, bearerToken?: string): Promise<AuthInfo | undefined> =>
  resolveMcpAuth(bearerToken);

const handler = withMcpAuth(baseHandler, verifyToken, { required: true });

export { handler as GET, handler as POST, handler as DELETE };
