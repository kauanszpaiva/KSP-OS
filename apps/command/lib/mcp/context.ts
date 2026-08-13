import type { AuthInfo } from '@modelcontextprotocol/sdk/server/auth/types.js';
import { createTokenClient, type SupabaseClient } from '@ksp/database';
import { getAuthContext } from '@ksp/auth';

/**
 * Auth + request context for the MCP server.
 *
 * The MCP endpoint reuses the exact model already proven by the v1 connector
 * (`app/api/v1/[resource]/route.ts`): a Supabase user access token in the
 * `Authorization: Bearer <token>` header. Every request — and every tool call —
 * runs as that user through `createTokenClient`, so table RLS is the enforcement
 * backbone. There is NO service-role path here, and only internal members (an
 * active membership resolved by `getAuthContext`) are allowed. The connector can
 * never see or do more than the same person can in the app.
 */

/** Minimal, non-secret identity carried on `AuthInfo.extra` for the tool layer. */
export interface McpIdentity {
  userId: string;
  organizationId: string;
  email: string;
  displayName: string;
  roles: string[];
}

/** The user-scoped client plus resolved identity handed to each tool handler. */
export interface McpToolContext {
  supabase: SupabaseClient;
  identity: McpIdentity;
}

/**
 * Dependency seam so tests can exercise the auth decision without a live
 * Supabase project. Production wiring uses the real package functions.
 */
export interface McpAuthDeps {
  createTokenClient: (accessToken: string) => SupabaseClient | null;
  getAuthContext: typeof getAuthContext;
}

const defaultDeps: McpAuthDeps = { createTokenClient, getAuthContext };

/**
 * Validate a bearer token for the MCP handler. Returns an `AuthInfo` when the
 * token belongs to an authenticated internal member, or `undefined` otherwise
 * — `withMcpAuth({ required: true })` turns `undefined` into a 401 with the
 * correct `WWW-Authenticate` challenge. No token, an unconfigured environment,
 * an invalid token, or a valid token without an active membership all deny.
 */
export async function resolveMcpAuth(
  bearerToken: string | undefined,
  deps: McpAuthDeps = defaultDeps
): Promise<AuthInfo | undefined> {
  const token = bearerToken?.trim();
  if (!token) return undefined;

  const supabase = deps.createTokenClient(token);
  if (!supabase) return undefined; // environment not configured

  const ctx = await deps.getAuthContext(supabase);
  if (!ctx) return undefined; // unauthenticated or no active internal membership

  const identity: McpIdentity = {
    userId: ctx.user.id,
    organizationId: ctx.organizationId,
    email: ctx.user.email,
    displayName: ctx.user.displayName,
    roles: ctx.internalRoles
  };

  return {
    token,
    clientId: ctx.user.id,
    scopes: ctx.internalRoles,
    extra: { identity }
  };
}

/**
 * Rebuild the user-scoped client and identity for a tool call from the
 * `AuthInfo` produced by `resolveMcpAuth`. The client is recreated from the same
 * token so RLS stays in force for every tool — never service-role.
 */
export function toolContextFromAuth(
  auth: AuthInfo | undefined,
  deps: Pick<McpAuthDeps, 'createTokenClient'> = defaultDeps
): McpToolContext | null {
  const identity = auth?.extra?.identity as McpIdentity | undefined;
  if (!auth?.token || !identity) return null;
  const supabase = deps.createTokenClient(auth.token);
  if (!supabase) return null;
  return { supabase, identity };
}
