'use server';

import { revalidatePath } from 'next/cache';
import { getAuthContext } from '@ksp/auth';
import { isUuid, validateSlotInput, type DaySlot, type SlotInput, type SlotResult } from '@ksp/domain';
import { getServerSupabase } from '../../lib/supabase';

function message(code?: string): string {
  if (code === '23P01') return 'This time overlaps another task in your day. Choose another time.';
  if (code === '40001' || code === '23505') return 'The schedule changed in another session. Refresh and try again.';
  if (code === '42501') return 'Your access to this task or schedule is no longer available.';
  if (code === '23514' || code === '22003' || code === '23502') return 'Choose valid times in 15-minute increments.';
  return 'Daily scheduling is unavailable. No change was confirmed; refresh and try again.';
}

export async function saveDaySlot(input: SlotInput): Promise<SlotResult> {
  const invalid = validateSlotInput(input);
  if (invalid) return { ok: false, error: invalid };
  const supabase = await getServerSupabase();
  if (!supabase) return { ok: false, error: 'Daily scheduling is unavailable.' };
  const context = await getAuthContext(supabase);
  if (!context) return { ok: false, error: 'Sign in with your internal KSP account.' };
  // Never accept an actor or tenant from the browser; check the task under RLS.
  const { data: task, error: taskError } = await supabase.from('tasks').select('id, organization_id')
    .eq('id', input.taskId).eq('organization_id', context.organizationId).maybeSingle();
  if (taskError || !task) return { ok: false, error: 'You do not have access to this task.' };
  const { data, error } = await supabase.rpc('save_task_day_slot', {
    p_id: input.id, p_task_id: input.taskId, p_date: input.date,
    p_start_minute: input.startMinute, p_end_minute: input.endMinute, p_expected_revision: input.expectedRevision
  });
  if (error) return { ok: false, error: message(error.code) };
  const slot = data as DaySlot | null;
  if (!slot || validateSlotInput({ ...slot, expectedRevision: slot.revision }) || slot.id !== input.id
      || slot.taskId !== input.taskId || slot.date !== input.date || slot.revision !== input.expectedRevision + 1
      || slot.startMinute !== input.startMinute || slot.endMinute !== input.endMinute) {
    return { ok: false, error: 'The server did not confirm this schedule. Refresh before trying again.' };
  }
  revalidatePath('/schedule');
  return { ok: true, slot };
}

export async function removeDaySlot(id: string, revision: number): Promise<SlotResult> {
  if (!isUuid(id) || !Number.isSafeInteger(revision) || revision < 1) return { ok: false, error: 'Invalid schedule. Refresh and try again.' };
  const supabase = await getServerSupabase();
  if (!supabase) return { ok: false, error: 'Daily scheduling is unavailable.' };
  const context = await getAuthContext(supabase);
  if (!context) return { ok: false, error: 'Sign in with your internal KSP account.' };
  const { data: existing, error: lookupError } = await supabase.from('task_day_schedule').select('id')
    .eq('id', id).eq('profile_id', context.user.id).eq('organization_id', context.organizationId).maybeSingle();
  if (lookupError || !existing) return { ok: false, error: 'This schedule is no longer available. Refresh the page.' };
  const { data, error } = await supabase.rpc('remove_task_day_slot', { p_id: id, p_expected_revision: revision });
  if (error || data !== true) return { ok: false, error: message(error?.code) };
  revalidatePath('/schedule');
  return { ok: true };
}
