import { describe, expect, it } from 'vitest';
import { isExecutive, isFounder, isKspIncOwner, canViewFounderVault, type AuthContext } from '@ksp/auth';
import type { InternalRole } from '@ksp/permissions';
import { NAV_GROUPS, FOUNDER_MOBILE_PRIMARY, FOUNDER_NAV, FOUNDER_NAV_GROUPS } from './nav';

/**
 * Founder/KSP INC access-layer regression tests (Layers 1 & 2 — navigation +
 * routing decision). The DB layer (RLS) is proven separately by SQL matrices;
 * here we lock the app-side visibility gates.
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

function visibleNav(showFounder: boolean, showExecutive: boolean) {
  return NAV_GROUPS.map((g) => ({
    ...g,
    items: g.items.filter(
      (item) => (!item.founderOnly || showFounder) && (!item.executiveOnly || showExecutive)
    )
  })).filter((g) => g.items.length > 0);
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
    const nonFounder = visibleNav(false, false).flatMap((g) => g.items);
    expect(nonFounder.some((i) => i.href === '/founder')).toBe(false);
    expect(nonFounder.some((i) => i.founderOnly)).toBe(false);
  });

  it('shows the Founder OS entry to the founder', () => {
    const founder = visibleNav(true, true).flatMap((g) => g.items);
    expect(founder.some((i) => i.href === '/founder')).toBe(true);
  });

  it('keeps the complete Second Brain IA grouped and inside /founder', () => {
    const expected = [
      '/founder/home',
      '/founder/inbox',
      '/founder/ideas',
      '/founder/projects',
      '/founder/knowledge',
      '/founder/truth',
      '/founder/sources',
      '/founder/context',
      '/founder/handoffs',
      '/founder/ai-inbox',
      '/founder/ai-access',
      '/founder/work',
      '/founder/vault'
    ];
    expect(FOUNDER_NAV.map((item) => item.href)).toEqual(expected);
    expect(FOUNDER_NAV_GROUPS.map((group) => group.key)).toEqual(['brain', 'truth', 'agents', 'personal']);
    expect(new Set(FOUNDER_NAV.map((item) => item.href)).size).toBe(FOUNDER_NAV.length);
    for (const item of FOUNDER_NAV) expect(item.href.startsWith('/founder/')).toBe(true);
  });

  it('keeps mobile navigation intentionally small', () => {
    expect(FOUNDER_MOBILE_PRIMARY.map((item) => item.href)).toEqual([
      '/founder/home',
      '/founder/inbox',
      '/founder/knowledge',
      '/founder/work'
    ]);
  });
});

describe('KSP INC owner-plane isolation', () => {
  const ownerRoutes = ['/inc', '/divisions', '/control-center'];

  it('maps the KSP INC owner guard to the global executive boundary', () => {
    for (const roles of [['founder_ceo'], ['executive_operations']] as InternalRole[][]) {
      const ctx = ctxWith(roles);
      expect(isExecutive(ctx)).toBe(true);
      expect(isKspIncOwner(ctx)).toBe(true);
    }

    for (const roles of [['developer'], ['designer'], ['sales_specialist'], ['contractor'], []] as InternalRole[][]) {
      const ctx = ctxWith(roles);
      expect(isExecutive(ctx)).toBe(false);
      expect(isKspIncOwner(ctx)).toBe(false);
    }
  });

  it('keeps the KSP INC navigation in one executive-only group', () => {
    const group = NAV_GROUPS.find((item) => item.key === 'inc');
    expect(group).toBeDefined();
    expect(group?.label).toBe('KSP INC');
    expect(group?.items.map((item) => item.href)).toEqual(ownerRoutes);
    for (const item of group?.items ?? []) expect(item.executiveOnly).toBe(true);
  });

  it('shows KSP INC controls to both global-owner roles', () => {
    for (const roles of [['founder_ceo'], ['executive_operations']] as InternalRole[][]) {
      const ctx = ctxWith(roles);
      const visible = visibleNav(isFounder(ctx), isKspIncOwner(ctx)).flatMap((g) => g.items);
      for (const route of ownerRoutes) expect(visible.some((item) => item.href === route)).toBe(true);
    }
  });

  it('hides every KSP INC route from non-executive roles', () => {
    for (const roles of [['developer'], ['designer'], ['sales_specialist'], ['contractor'], []] as InternalRole[][]) {
      const ctx = ctxWith(roles);
      const visible = visibleNav(isFounder(ctx), isKspIncOwner(ctx)).flatMap((g) => g.items);
      for (const route of ownerRoutes) expect(visible.some((item) => item.href === route)).toBe(false);
    }
  });

  it('does not grant Founder OS to executive_operations', () => {
    const executive = ctxWith(['executive_operations']);
    expect(isKspIncOwner(executive)).toBe(true);
    expect(isFounder(executive)).toBe(false);
    expect(canViewFounderVault(executive)).toBe(false);
  });
});
