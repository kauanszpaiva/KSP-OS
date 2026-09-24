import { beforeEach, describe, expect, it, vi } from 'vitest';
import { saveDaySlot, removeDaySlot } from './day-schedule-actions';

const m = vi.hoisted(() => ({ context: vi.fn(), lookup: vi.fn(), rpc: vi.fn(), eq: vi.fn(), revalidate: vi.fn() }));
vi.mock('next/cache', () => ({ revalidatePath: m.revalidate }));
vi.mock('@ksp/auth', () => ({ getAuthContext: m.context }));
vi.mock('../../lib/supabase', () => ({ getServerSupabase: async () => {
  const query = { select: () => query, eq: (...args: unknown[]) => { m.eq(...args); return query; }, maybeSingle: m.lookup };
  return { from: () => query, rpc: m.rpc };
} }));
const input = { id: '11111111-1111-4111-8111-111111111111', taskId: '22222222-2222-4222-8222-222222222222', date: '2026-09-23', startMinute: 540, endMinute: 600, expectedRevision: 0 };
beforeEach(() => {
  vi.resetAllMocks();
  m.context.mockResolvedValue({ user: { id: 'verified-user' }, organizationId: 'verified-org' });
  m.lookup.mockResolvedValue({ data: { id: input.taskId, organization_id: 'verified-org' }, error: null });
});
describe('day schedule server authorization', () => {
  it('rejects unauthenticated callers before any task or schedule write', async () => {
    m.context.mockResolvedValue(null);
    expect((await saveDaySlot(input)).ok).toBe(false);
    expect((await removeDaySlot(input.id, 1)).ok).toBe(false);
    expect(m.lookup).not.toHaveBeenCalled();
    expect(m.rpc).not.toHaveBeenCalled();
  });
  it('rejects a task not visible under the authenticated tenant', async () => {
    m.lookup.mockResolvedValue({ data: null, error: null });
    expect((await saveDaySlot(input)).ok).toBe(false);
    expect(m.eq).toHaveBeenCalledWith('organization_id', 'verified-org');
    expect(m.rpc).not.toHaveBeenCalled();
  });
  it('does not accept a browser-supplied tenant or owner in the RPC', async () => {
    m.rpc.mockResolvedValue({ data: { ...input, revision: 1 }, error: null });
    const result = await saveDaySlot({ ...input, profileId: 'spoofed', organizationId: 'spoofed' } as typeof input);
    expect(result.ok).toBe(true);
    expect(m.rpc).toHaveBeenCalledWith('save_task_day_slot', {
      p_id: input.id, p_task_id: input.taskId, p_date: input.date, p_start_minute: 540, p_end_minute: 600, p_expected_revision: 0
    });
  });
  it('requires a matching server-confirmed range and next revision', async () => {
    m.rpc.mockResolvedValue({ data: { ...input, revision: 1, startMinute: 555 }, error: null });
    expect((await saveDaySlot(input)).ok).toBe(false);
    expect(m.revalidate).not.toHaveBeenCalled();
  });
  it('maps conflicts safely without showing database details', async () => {
    m.rpc.mockResolvedValue({ data: null, error: { code: '23P01', message: 'private database detail' } });
    const result = await saveDaySlot(input);
    expect(result).toEqual({ ok: false, error: expect.stringContaining('overlaps') });
    expect(JSON.stringify(result)).not.toContain('private database detail');
  });
  it('binds unscheduling to the verified owner and tenant', async () => {
    m.rpc.mockResolvedValue({ data: true, error: null });
    expect(await removeDaySlot(input.id, 2)).toEqual({ ok: true });
    expect(m.eq).toHaveBeenCalledWith('profile_id', 'verified-user');
    expect(m.eq).toHaveBeenCalledWith('organization_id', 'verified-org');
    expect(m.rpc).toHaveBeenCalledWith('remove_task_day_slot', { p_id: input.id, p_expected_revision: 2 });
  });
});
