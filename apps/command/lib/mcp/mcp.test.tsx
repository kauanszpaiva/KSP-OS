import { describe, expect, it } from 'vitest';
import { z } from 'zod';
import type { SupabaseClient } from '@ksp/database';
import type { AuthContext } from '@ksp/auth';
import { resolveMcpAuth, toolContextFromAuth, type McpAuthDeps } from './context';
import { createTaskTool, listMissionsTool, readTools, registerTools, whoamiTool, writeToolsEnabled } from './tools';

/**
 * Governance-critical tests for the MCP server:
 * - unauthenticated / no-membership requests are rejected (auth is fail-closed);
 * - every tool runs under the caller's user-scoped client (RLS respected — no
 *   service-role path);
 * - write tools are off by default and only appear behind the flag;
 * - a write validates input and returns explicitly what it changed.
 */

const validContext: AuthContext = {
  user: { id: 'user-1', email: 'op@ksp.test', displayName: 'Operator One', avatarUrl: null },
  organizationId: 'org-1',
  internalRoles: ['founder_ceo'],
  mfa: true,
  membership: {
    organizationId: 'org-1',
    internalRoles: ['founder_ceo'],
    clientMemberships: [],
    projectIds: [],
    explicitGrants: [],
    mfa: true
  }
};

/** A Supabase stub whose every query resolves to empty data (RLS returns nothing). */
function emptyReadClient(): SupabaseClient {
  const builder: Record<string, unknown> = {};
  for (const method of ['select', 'order', 'eq', 'in', 'not', 'ilike', 'limit']) {
    builder[method] = () => builder;
  }
  builder.then = (resolve: (value: { data: unknown[] }) => unknown) => Promise.resolve({ data: [] }).then(resolve);
  return { from: () => builder } as unknown as SupabaseClient;
}

describe('resolveMcpAuth', () => {
  const deps = (ctx: AuthContext | null, client: SupabaseClient | null = {} as SupabaseClient): McpAuthDeps => ({
    createTokenClient: () => client,
    getAuthContext: async () => ctx
  });

  it('rejects a request with no bearer token', async () => {
    expect(await resolveMcpAuth(undefined, deps(validContext))).toBeUndefined();
    expect(await resolveMcpAuth('   ', deps(validContext))).toBeUndefined();
  });

  it('rejects when the environment is not configured', async () => {
    expect(await resolveMcpAuth('token', deps(validContext, null))).toBeUndefined();
  });

  it('rejects a valid token without an active internal membership', async () => {
    expect(await resolveMcpAuth('token', deps(null))).toBeUndefined();
  });

  it('accepts an internal member and carries a non-secret identity', async () => {
    const auth = await resolveMcpAuth('token-abc', deps(validContext));
    expect(auth).toBeDefined();
    expect(auth?.token).toBe('token-abc');
    expect(auth?.clientId).toBe('user-1');
    expect((auth?.extra?.identity as { organizationId: string }).organizationId).toBe('org-1');
  });
});

describe('toolContextFromAuth', () => {
  it('returns null without a valid AuthInfo', () => {
    expect(toolContextFromAuth(undefined, { createTokenClient: () => ({}) as SupabaseClient })).toBeNull();
  });

  it('rebuilds a user-scoped client from the same token', () => {
    let seen = '';
    const ctx = toolContextFromAuth(
      { token: 'tok', clientId: 'user-1', scopes: [], extra: { identity: validContext } },
      {
        createTokenClient: (t: string) => {
          seen = t;
          return {} as SupabaseClient;
        }
      }
    );
    expect(seen).toBe('tok');
    expect(ctx).not.toBeNull();
  });
});

describe('tool registration and flag gating', () => {
  function capture(env: Record<string, string | undefined>): string[] {
    const names: string[] = [];
    const server = { registerTool: (name: string) => names.push(name) } as never;
    registerTools(server, env);
    return names;
  }

  it('exposes only read tools by default', () => {
    const names = capture({});
    expect(names).toEqual(['whoami', 'list_missions', 'list_tasks', 'list_clients']);
    expect(names).not.toContain('create_task');
  });

  it('adds the write tool only when the flag is set', () => {
    expect(writeToolsEnabled({ MCP_ENABLE_WRITE_TOOLS: 'true' })).toBe(true);
    expect(capture({ MCP_ENABLE_WRITE_TOOLS: 'true' })).toContain('create_task');
    expect(writeToolsEnabled({})).toBe(false);
  });

  it('every tool has a specific description to guide model selection', () => {
    for (const tool of readTools) {
      expect(tool.description.length).toBeGreaterThan(40);
    }
  });
});

describe('read tools', () => {
  const identity = {
    userId: 'user-1',
    organizationId: 'org-1',
    email: 'op@ksp.test',
    displayName: 'Operator One',
    roles: ['founder_ceo']
  };

  it('whoami returns the acting identity without querying', async () => {
    const result = (await whoamiTool.run({}, { supabase: {} as SupabaseClient, identity })) as Record<string, unknown>;
    expect(result.userId).toBe('user-1');
    expect(result.organizationId).toBe('org-1');
  });

  it('list_missions runs through the provided (RLS-scoped) client', async () => {
    const result = await listMissionsTool.run({ limit: 500 }, { supabase: emptyReadClient(), identity });
    expect(Array.isArray(result)).toBe(true);
    expect(result).toHaveLength(0);
  });
});

describe('create_task write tool', () => {
  const identity = {
    userId: 'user-1',
    organizationId: 'org-1',
    email: 'op@ksp.test',
    displayName: 'Operator One',
    roles: ['founder_ceo']
  };

  it('validates input with the shared schema', async () => {
    const schema = z.object(createTaskTool.inputSchema);
    expect(schema.safeParse({ title: 'x' }).success).toBe(false); // too short
    const bad = (await createTaskTool.run({ title: 'x' }, { supabase: {} as SupabaseClient, identity })) as {
      ok: boolean;
    };
    expect(bad.ok).toBe(false);
  });

  it('writes under the caller client, audits, and returns what changed', async () => {
    const inserts: Array<{ table: string; row: Record<string, unknown> }> = [];
    const supabase = {
      from: (table: string) => ({
        insert: (row: Record<string, unknown>) => {
          inserts.push({ table, row });
          const thenable = Promise.resolve({ data: null, error: null }) as Promise<unknown> & {
            select?: unknown;
          };
          thenable.select = () => ({ single: async () => ({ data: { id: 'task-42' }, error: null }) });
          return thenable;
        }
      })
    } as unknown as SupabaseClient;

    const result = (await createTaskTool.run(
      { title: 'Draft the SOP', projectId: undefined },
      { supabase, identity }
    )) as { ok: boolean; id: string; created: Record<string, unknown> };

    expect(result.ok).toBe(true);
    expect(result.id).toBe('task-42');
    expect(result.created.title).toBe('Draft the SOP');
    expect(result.created.organization_id).toBe('org-1');
    expect(result.created.owner_id).toBe('user-1'); // defaulted to caller

    const tables = inserts.map((i) => i.table);
    expect(tables).toContain('tasks');
    expect(tables).toContain('activity_events');
    expect(tables).toContain('audit_events');
    const auditRow = inserts.find((i) => i.table === 'audit_events')?.row;
    expect((auditRow?.metadata as { via: string }).via).toBe('mcp_connector');
  });
});
