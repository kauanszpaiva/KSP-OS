// Regression source: createMissionInBusinessUnit plus the canonical
// 20260824023100_project_creator_membership.sql AFTER INSERT trigger.
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createMissionInBusinessUnit } from './actions';

const m = vi.hoisted(() => ({ auth: vi.fn(), decision: vi.fn(), unit: vi.fn(), admin: vi.fn(), project: vi.fn(), insert: vi.fn(), remove: vi.fn(), revalidate: vi.fn() }));
vi.mock('next/cache', () => ({ revalidatePath: m.revalidate }));
vi.mock('@ksp/auth', () => ({ getAuthContext: m.auth, isExecutive: () => true }));
vi.mock('@ksp/permissions', () => ({ canPerform: m.decision }));
vi.mock('@ksp/validation', async () => import('../../../../../packages/validation/src/schemas'));
vi.mock('../../../lib/supabase', () => ({ getServerSupabase: async () => ({
  from: (table: string) => {
    const q = {
      select: () => q, eq: () => q, in: () => q, is: () => q, lte: () => q, or: () => q, limit: () => q,
      maybeSingle: () => table === 'business_units' ? m.unit() : m.admin(),
      single: m.project,
      insert: (value: unknown) => {
        m.insert(table, value);
        if (table === 'projects') return q;
        // The real AFTER INSERT trigger has already inserted this membership.
        if (table === 'project_memberships') return Promise.resolve({ error: { code: '23505', message: 'duplicate key' } });
        return Promise.resolve({ error: null });
      },
      delete: () => { m.remove(table); return q; },
      then: (resolve: (value: unknown) => unknown) => Promise.resolve({ error: null }).then(resolve)
    };
    return q;
  }
}) }));
const org = '11111111-1111-4111-8111-111111111111';
const user = '22222222-2222-4222-8222-222222222222';
const division = '33333333-3333-4333-8333-333333333333';
const project = '44444444-4444-4444-8444-444444444444';
function form() {
  const value = new FormData();
  value.set('name', 'Synthetic project'); value.set('projectType', 'internal'); value.set('businessUnitId', division);
  value.set('organization_id', 'untrusted-org'); value.set('profile_id', 'untrusted-owner');
  return value;
}
beforeEach(() => {
  vi.resetAllMocks();
  m.auth.mockResolvedValue({ user: { id: user }, organizationId: org, internalRoles: ['founder_ceo'], membership: {} });
  m.decision.mockReturnValue({ allowed: true });
  m.unit.mockResolvedValue({ data: { id: division, name: 'Synthetic division' }, error: null });
  m.admin.mockResolvedValue({ data: null, error: null });
  m.project.mockResolvedValue({ data: { id: project }, error: null });
});
describe('atomic project creator membership', () => {
  it('preserves a successful project when the database has already created its membership', async () => {
    expect(await createMissionInBusinessUnit({ ok: false }, form())).toEqual({ ok: true });
    expect(m.insert.mock.calls.filter(([table]) => table === 'project_memberships')).toHaveLength(0);
    expect(m.remove).not.toHaveBeenCalled();
    expect(m.insert).toHaveBeenCalledWith('projects', expect.objectContaining({ organization_id: org, business_unit_id: division }));
    expect(m.insert).toHaveBeenCalledWith('audit_events', expect.objectContaining({ actor_id: user, target_id: project }));
    expect(m.revalidate).toHaveBeenCalledWith('/missions');
  });
  it('rejects missing division instead of creating an unclassified project', async () => {
    const value = form(); value.delete('businessUnitId');
    expect((await createMissionInBusinessUnit({ ok: false }, value)).ok).toBe(false);
    expect(m.insert).not.toHaveBeenCalled();
  });
  it('does not grant access to an unauthorized member', async () => {
    m.decision.mockReturnValue({ allowed: false });
    expect((await createMissionInBusinessUnit({ ok: false }, form())).ok).toBe(false);
    expect(m.insert).not.toHaveBeenCalled();
  });
  it('rejects an inaccessible division under the existing RLS', async () => {
    m.unit.mockResolvedValue({ data: null, error: null });
    expect((await createMissionInBusinessUnit({ ok: false }, form())).ok).toBe(false);
    expect(m.insert).not.toHaveBeenCalled();
  });
  it('reports failed project insertion without issuing any cleanup delete', async () => {
    m.project.mockResolvedValue({ data: null, error: { code: '42501' } });
    expect((await createMissionInBusinessUnit({ ok: false }, form())).ok).toBe(false);
    expect(m.remove).not.toHaveBeenCalled();
    expect(m.revalidate).not.toHaveBeenCalled();
  });
});
