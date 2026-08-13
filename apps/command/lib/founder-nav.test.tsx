import { describe, expect, it } from 'vitest';
import { isFounder, canViewFounderVault, type AuthContext } from '@ksp/auth';
import type { InternalRole } from '@ksp/permissions';
import { NAV_GROUPS, FOUNDER_NAV } from './nav';

/**
 * Founder OS access-layer regression tests (Layers 1 & 2 — navigation + routing
 * decision). The DB layer (RLS) is proven separately by the SQL matrix in
 * supabase/tests/founder_os.sql; here we lock the app-side gates.
 */

function ctxWith(roles: InternalRole[]): AuthContext {
  return {
    user: { id: 'u1', email: 'u@ksp', displayName: 'U' },
    organizationId: 'org',
    internalRoles: roles,
    mfa: true,
    membership: { organizationId: 'org', internalRoles: roles, clientMemberships: [], projectIds: [], explicitGrants: [], mfa: true }
  };
}

// The exact predicate AppLayout uses to build the company sidebar.
function visibleNav(showFounder: boolean) {
  return NAV_GROUPS.map((g) => ({ ...g, items: g.items.filter((item) => !item.founderOnly || showFounder) })).filter(
    (g) => g.items.length > 0
  );
}

describe('Founder OS role gate (app layer)', () => {
  it('recognizes only founder_ceo as founder', () => {
    expect(isFounder(ctxWith(['founder_ceo']))).toBe(true);
    expect(canViewFounderVault(ctxWith(['founder_ceo']))).toBe(true);
  });

  it('denies every non-founder archetype', () => {
    for (const roles of [['executive_operations'], ['developer'], ['sales_specialist'], ['contractor'], []] as InternalRole[][]) {
      expect(isFounder(ctxWith(roles))).toBe(false);
      expect(canViewFounderVault(ctxWith(roles))).toBe(false);
    }
  });
});

describe('Founder OS navigation isolation', () => {
  it('marks the Founder OS entry founderOnly and points it at /founder', () => {
    const entry = NAV_GROUPS.flatMap((g) => g.items).find((i) => i.href === '/founder');
    expect(entry).toBeDefined();
    expect(entry?.founderOnly).toBe(true);
  });

  it('hides the Founder OS entry from non-founders', () => {
    const nonFounder = visibleNav(false).flatMap((g) => g.items);
    expect(nonFounder.some((i) => i.href === '/founder')).toBe(false);
    expect(nonFounder.some((i) => i.founderOnly)).toBe(false);
  });

  it('shows the Founder OS entry to the founder', () => {
    const founder = visibleNav(true).flatMap((g) => g.items);
    expect(founder.some((i) => i.href === '/founder')).toBe(true);
  });

  it('keeps every Founder OS nav route inside the /founder namespace', () => {
    expect(FOUNDER_NAV.length).toBeGreaterThanOrEqual(4);
    for (const item of FOUNDER_NAV) expect(item.href.startsWith('/founder/')).toBe(true);
    expect(FOUNDER_NAV.map((i) => i.href)).toEqual([
      '/founder/home',
      '/founder/inbox',
      '/founder/work',
      '/founder/vault'
    ]);
  });
});
