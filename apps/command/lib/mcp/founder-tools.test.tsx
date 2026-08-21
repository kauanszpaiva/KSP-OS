import { describe, expect, it } from 'vitest';
import type { AuthInfo } from '@modelcontextprotocol/sdk/server/auth/types.js';
import type { SupabaseClient } from '@ksp/database';
import { resolveFounderMcpAuth } from './founder-auth';
import { founderReadTools, founderTools, founderWriteTools, registerFounderTools } from './founder-tools';

const identity = {
  userId: '11111111-1111-4111-8111-111111111111',
  organizationId: '22222222-2222-4222-8222-222222222222',
  email: 'founder@ksp.test',
  displayName: 'Founder',
  roles: ['founder_ceo']
};

const founderAuth: AuthInfo = { token: 'token', clientId: identity.userId, scopes: ['founder_ceo'], extra: { identity } };
const memberAuth: AuthInfo = { token: 'token', clientId: 'member', scopes: ['developer'], extra: { identity: { ...identity, userId: 'member', roles: ['developer'] } } };

describe('Founder MCP authorization', () => {
  it('rejects missing and non-founder identities before tool listing', async () => {
    expect(await resolveFounderMcpAuth(undefined, async () => undefined)).toBeUndefined();
    expect(await resolveFounderMcpAuth('token', async () => memberAuth)).toBeUndefined();
  });

  it('accepts a founder identity', async () => {
    expect(await resolveFounderMcpAuth('token', async () => founderAuth)).toBe(founderAuth);
  });
});

describe('Founder MCP catalog', () => {
  it('registers the bounded Second Brain catalog', () => {
    const names: string[] = [];
    const server = { registerTool: (name: string) => names.push(name) } as never;
    registerFounderTools(server);
    expect(names).toEqual(founderTools.map((tool) => tool.name));
    expect(names).toContain('brain_search');
    expect(names).toContain('create_handoff');
    expect(names).toContain('complete_handoff');
  });

  it('keeps every tool description specific enough for model selection', () => {
    for (const tool of founderTools) expect(tool.description.length).toBeGreaterThan(60);
    expect(founderReadTools.length).toBeGreaterThanOrEqual(6);
    expect(founderWriteTools.length).toBeGreaterThanOrEqual(6);
  });
});

describe('Founder MCP writes', () => {
  it('fails closed when a non-founder reaches a write tool directly', async () => {
    const capture = founderWriteTools.find((tool) => tool.name === 'capture');
    expect(capture).toBeDefined();
    const result = await capture!.run({ type: 'note', title: 'Private' }, { supabase: {} as SupabaseClient, identity: { ...identity, roles: ['developer'] } });
    expect(result).toEqual({ ok: false, error: 'founder_only' });
  });

  it('writes private capture rows under the caller identity, never service role', async () => {
    let written: Record<string, unknown> | null = null;
    const supabase = {
      from: (table: string) => ({
        insert: (row: Record<string, unknown>) => {
          expect(table).toBe('founder_inbox_items');
          written = row;
          return { select: () => ({ single: async () => ({ data: { id: '33333333-3333-4333-8333-333333333333' }, error: null }) }) };
        }
      })
    } as unknown as SupabaseClient;
    const capture = founderWriteTools.find((tool) => tool.name === 'capture')!;
    const result = await capture.run({ type: 'idea', title: 'Private idea', body: 'Context' }, { supabase, identity });
    expect(result).toEqual({ ok: true, id: '33333333-3333-4333-8333-333333333333' });
    expect(written?.organization_id).toBe(identity.organizationId);
    expect(written?.owner_id).toBe(identity.userId);
    expect(written?.metadata).toEqual({ via: 'founder_mcp' });
  });
});
