import type { AuthInfo } from '@modelcontextprotocol/sdk/server/auth/types.js';
import { resolveMcpAuth, type McpIdentity } from './context';

export type BaseMcpResolver = (bearerToken: string | undefined) => Promise<AuthInfo | undefined>;

/** Defense-in-depth gate for the private Founder MCP before tools are listed. */
export async function resolveFounderMcpAuth(
  bearerToken: string | undefined,
  baseResolver: BaseMcpResolver = (token) => resolveMcpAuth(token)
): Promise<AuthInfo | undefined> {
  const auth = await baseResolver(bearerToken);
  const identity = auth?.extra?.identity as McpIdentity | undefined;
  if (!auth || !identity?.roles.includes('founder_ceo')) return undefined;
  return auth;
}
