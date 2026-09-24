// Regression sources: createMissionInBusinessUnit, the creator AFTER INSERT
// trigger, and authority_v4_project_read_deny. Hosted PostgreSQL rehearsal
// confirmed INSERT RETURNING fails while a plain INSERT and later SELECT work.
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createMissionInBusinessUnit } from './actions';

const m = vi.hoisted(() => ({ auth: vi.fn(), decision: vi.fn(), unit: vi.fn(), admin: vi.fn(), project: vi.fn(), returning: vi.fn(), insert: vi.fn(), remove: vi.fn(), revalidate: vi.fn() }));
vi.mock('next/cache', () => ({ revalidatePath: m.revalidate }));
vi.mock('@ksp/auth', () => ({ getAuthContext: m.auth, isExecutive: () => true }));
vi.mock('@ksp/permissions', () => ({ canPerform: m.decision }));
vi.mock('@ksp/validation', async () => import('../../../../../packages/validation/src/schemas'));
vi.mock('../../../lib/supabase', () => ({ getServerSupabase: async () => ({
  from: (table: string) => {
    const q = {
      select: () => q, eq: () => q, in: () => q, is: () => q, lte: () => q, or: () => q, limit: () => q,
      maybeSingle: () => table === 'business_units' ? m.unit() : m.admin(),
      single: m.returning,
      insert: (value: unknown) => {
        m.insert(table, value);
        if (table === 'projects') return q;
        // The real AFTER INSERT trigger has already inserted this membership.
        if (table === 'project_memberships') return Promise.resolve({ error: { code: '23505', message: 'duplicate key' } });
        return Promise.resolve({ error: null });
      },
      delete: () => { m.remove(table); return q; },
      then: (resolve: (value: unknown) => unknown, reject?: (reason: unknown) => unknown) =>
        (table === 'projects' ? m.project() : Promise.resolve({ error: null })).then(resolve, reject)
    };
    return q;
  }
}) }));
const org = '11111111-1111-4111-8111-111111111111';
const user = '22222222-2222-4222-8222-222222222222';
const division = '33333333-3333-4333-8333-333333333333';
const untrustedProject = '44444444-4444-4444-8444-444444444444';
function form() {
  const value = new FormData();
  value.set('name', 'Synthetic project'); value.set('projectType', 'internal'); value.set('businessUnitId', division);
  value.set('organization_id', 'untrusted-org'); value.set('profile_id', 'untrusted-owner');
  value.set('id', untrustedProject); value.set('projectId', untrustedProject);
  return value;
}
function insertedProjectId(): string {
  return m.insert.mock.calls.find(([table]) => table === 'projects')?.[1]?.id as string;
}
beforeEach(() => {
  vi.resetAllMocks();
  m.auth.mockResolvedValue({ user: { id: user }, organizationId: org, internalRoles: ['founder_ceo'], membership: {} });
  m.decision.mockReturnValue({ allowed: true });
  m.unit.mockResolvedValue({ data: { id: division, name: 'Synthetic division' }, error: null });
  m.admin.mockResolvedValue({ data: null, error: null });
  // Supabase v2 return=minimal succeeds with no returned row. Asking for
  // RETURNING exercises the restrictive SELECT policy before the row is visible
  // to its STABLE helper and before the AFTER INSERT membership is available.
  m.project.mockResolvedValue({ data: null, error: null });
  m.returning.mockResolvedValue({ data: null, error: { code: '42501', message: 'new row violates row-level security policy "authority_v4_project_read_deny" for table "projects"' } });
});
describe('atomic project creator membership and insert visibility', () => {
  it('creates successfully without requesting a row from the INSERT statement', async () => {
    expect(await createMissionInBusinessUnit({ ok: false }, form())).toEqual({ ok: true });
    expect(m.returning).not.toHaveBeenCalled();
    expect(m.insert.mock.calls.filter(([table]) => table === 'projects')).toHaveLength(1);
    expect(m.insert.mock.calls.filter(([table]) => table === 'project_memberships')).toHaveLength(0);
    expect(m.remove).not.toHaveBeenCalled();
    expect(m.insert).toHaveBeenCalledWith('projects', expect.objectContaining({ organization_id: org, business_unit_id: division }));
    expect(m.revalidate).toHaveBeenCalledWith('/missions');
    expect(m.revalidate).toHaveBeenCalledWith('/workspace');
  });
  it('uses a server-generated UUID for both the inserted project and its audit records', async () => {
    expect(await createMissionInBusinessUnit({ ok: false }, form())).toEqual({ ok: true });
    const id = insertedProjectId();
    expect(id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i);
    expect(id).not.toBe(untrustedProject);
    expect(m.insert).toHaveBeenCalledWith('activity_events', expect.objectContaining({ actor_id: user, organization_id: org, object_id: id }));
    expect(m.insert).toHaveBeenCalledWith('audit_events', expect.objectContaining({ actor_id: user, organization_id: org, target_id: id }));
  });
  it('generates a distinct project identifier on each creation', async () => {
    await createMissionInBusinessUnit({ ok: false }, form());
    await createMissionInBusinessUnit({ ok: false }, form());
    const ids = m.insert.mock.calls.filter(([table]) => table === 'projects').map(([, row]) => row.id);
    expect(ids).toHaveLength(2);
    expect(new Set(ids).size).toBe(2);
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
  it('allows an authorized unit admin through the existing unit gate', async () => {
    m.decision.mockReturnValue({ allowed: false });
    m.admin.mockResolvedValue({ data: { id: 'synthetic-unit-membership' }, error: null });
    expect(await createMissionInBusinessUnit({ ok: false }, form())).toEqual({ ok: true });
    expect(m.returning).not.toHaveBeenCalled();
  });
  it('rejects an inaccessible division under the existing RLS', async () => {
    m.unit.mockResolvedValue({ data: null, error: null });
    expect((await createMissionInBusinessUnit({ ok: false }, form())).ok).toBe(false);
    expect(m.insert).not.toHaveBeenCalled();
  });
  it('reports a genuine INSERT denial without cleanup deletion or a success audit', async () => {
    m.project.mockResolvedValue({ data: null, error: { code: '42501' } });
    expect((await createMissionInBusinessUnit({ ok: false }, form())).ok).toBe(false);
    expect(m.remove).not.toHaveBeenCalled();
    expect(m.revalidate).not.toHaveBeenCalled();
    expect(m.insert.mock.calls.map(([table]) => table)).toEqual(['projects']);
  });
  it('rejects an unauthenticated request before accessing the database', async () => {
    m.auth.mockResolvedValue(null);
    expect(await createMissionInBusinessUnit({ ok: false }, form())).toEqual({ ok: false, error: 'unauthenticated' });
    expect(m.insert).not.toHaveBeenCalled();
  });
  it('keeps schema validation before persistence', async () => {
    const value = form(); value.set('name', '');
    expect((await createMissionInBusinessUnit({ ok: false }, value)).ok).toBe(false);
    expect(m.insert).not.toHaveBeenCalled();
  });
});
