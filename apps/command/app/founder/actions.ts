'use server';

import { revalidatePath } from 'next/cache';
import { getAuthContext, type AuthContext } from '@ksp/auth';
import type { SupabaseClient } from '@ksp/database';
import { getServerSupabase } from '../../lib/supabase';

export interface ActionResult {
  ok: boolean;
  error?: string;
}

const INBOX_TYPES = new Set([
  'note',
  'idea',
  'task',
  'opportunity',
  'person',
  'link',
  'project_thought',
  'reminder',
  'financial_thought',
  'learning_item',
  'other'
]);
const TASK_STATUSES = new Set(['open', 'in_progress', 'waiting', 'done', 'archived']);
const TASK_PRIORITIES = new Set(['low', 'normal', 'high']);

/**
 * Founder gate (Layer 3 — server). Every Founder OS action independently
 * re-checks the founder role; the UI is never trusted. RLS (Layer 4) is the
 * final backstop, but denying here gives a clean error and avoids emitting rows
 * a non-founder could never read back anyway.
 */
async function founderGate(): Promise<{ supabase: SupabaseClient; ctx: AuthContext } | { error: string }> {
  const supabase = await getServerSupabase();
  if (!supabase) return { error: 'not_configured' };
  const ctx = await getAuthContext(supabase);
  if (!ctx) return { error: 'unauthenticated' };
  if (!ctx.internalRoles.includes('founder_ceo')) return { error: 'Founder OS is restricted to the founder.' };
  return { supabase, ctx };
}

// --------------------------------------------------------------------------
// Inbox — universal private capture
// --------------------------------------------------------------------------
export async function createInboxItem(_prev: ActionResult, form: FormData): Promise<ActionResult> {
  const gate = await founderGate();
  if ('error' in gate) return { ok: false, error: gate.error };
  const { supabase, ctx } = gate;

  const title = String(form.get('title') ?? '').trim();
  const itemType = String(form.get('itemType') ?? 'note').trim();
  const body = String(form.get('body') ?? '').trim();
  if (title.length < 2) return { ok: false, error: 'A title is required.' };
  if (!INBOX_TYPES.has(itemType)) return { ok: false, error: 'Unknown capture type.' };

  const { error } = await supabase.from('founder_inbox_items').insert({
    organization_id: ctx.organizationId,
    owner_id: ctx.user.id,
    item_type: itemType,
    title,
    body: body || null
  });
  if (error) return { ok: false, error: 'Could not capture the item.' };
  revalidatePath('/founder/inbox');
  revalidatePath('/founder/home');
  return { ok: true };
}

/** Plain form action (fire-and-forget) — archive an inbox capture. */
export async function archiveInboxItem(form: FormData): Promise<void> {
  const gate = await founderGate();
  if ('error' in gate) return;
  const { supabase } = gate;
  const id = String(form.get('id') ?? '');
  if (!id) return;
  await supabase.from('founder_inbox_items').update({ triage_status: 'archived' }).eq('id', id);
  revalidatePath('/founder/inbox');
}

// --------------------------------------------------------------------------
// Private tasks
// --------------------------------------------------------------------------
export async function createFounderTask(_prev: ActionResult, form: FormData): Promise<ActionResult> {
  const gate = await founderGate();
  if ('error' in gate) return { ok: false, error: gate.error };
  const { supabase, ctx } = gate;

  const title = String(form.get('title') ?? '').trim();
  const priority = String(form.get('priority') ?? 'normal').trim();
  const dueDate = String(form.get('dueDate') ?? '').trim();
  const notes = String(form.get('notes') ?? '').trim();
  if (title.length < 2) return { ok: false, error: 'A title is required.' };
  if (!TASK_PRIORITIES.has(priority)) return { ok: false, error: 'Invalid priority.' };

  const { error } = await supabase.from('founder_tasks').insert({
    organization_id: ctx.organizationId,
    owner_id: ctx.user.id,
    title,
    priority,
    due_date: dueDate || null,
    notes: notes || null
  });
  if (error) return { ok: false, error: 'Could not create the task.' };
  revalidatePath('/founder/work');
  revalidatePath('/founder/home');
  return { ok: true };
}

export async function setTaskStatus(_prev: ActionResult, form: FormData): Promise<ActionResult> {
  const gate = await founderGate();
  if ('error' in gate) return { ok: false, error: gate.error };
  const { supabase } = gate;

  const id = String(form.get('id') ?? '');
  const status = String(form.get('status') ?? '').trim();
  const waitingOn = String(form.get('waitingOn') ?? '').trim();
  if (!id || !TASK_STATUSES.has(status)) return { ok: false, error: 'Invalid update.' };
  // The DB enforces waiting -> waiting_on; surface a clean message first.
  if (status === 'waiting' && !waitingOn) return { ok: false, error: 'Say what this is waiting on.' };

  const patch: Record<string, unknown> = { status };
  if (status === 'waiting') patch.waiting_on = waitingOn;
  const { error } = await supabase.from('founder_tasks').update(patch).eq('id', id);
  if (error) return { ok: false, error: 'Could not update the task.' };
  revalidatePath('/founder/work');
  revalidatePath('/founder/home');
  return { ok: true };
}

// --------------------------------------------------------------------------
// Conversion & promotion
// --------------------------------------------------------------------------

/**
 * Plain form action — inbox capture -> private task. Stays private; records
 * provenance (source_inbox_id + target pointer) only.
 */
export async function convertInboxToTask(form: FormData): Promise<void> {
  const gate = await founderGate();
  if ('error' in gate) return;
  const { supabase, ctx } = gate;

  const id = String(form.get('id') ?? '');
  if (!id) return;

  const { data: item } = await supabase
    .from('founder_inbox_items')
    .select('id, title, body, triage_status')
    .eq('id', id)
    .maybeSingle();
  if (!item || item.triage_status === 'promoted') return;

  const { data: task } = await supabase
    .from('founder_tasks')
    .insert({
      organization_id: ctx.organizationId,
      owner_id: ctx.user.id,
      title: item.title,
      notes: item.body,
      source_inbox_id: item.id
    })
    .select('id')
    .single();
  if (!task) return;

  await supabase
    .from('founder_inbox_items')
    .update({ triage_status: 'promoted', target_table: 'founder_tasks', target_id: task.id })
    .eq('id', item.id);

  revalidatePath('/founder/inbox');
  revalidatePath('/founder/work');
}

/**
 * Plain form action — advance a private task's status (Start / Done). The
 * `waiting` transition needs context, so it goes through setTaskStatus
 * (useActionState) instead; this rejects `waiting` to keep the DB constraint safe.
 */
export async function advanceTaskStatus(form: FormData): Promise<void> {
  const gate = await founderGate();
  if ('error' in gate) return;
  const { supabase } = gate;
  const id = String(form.get('id') ?? '');
  const status = String(form.get('status') ?? '').trim();
  if (!id || !TASK_STATUSES.has(status) || status === 'waiting') return;
  await supabase.from('founder_tasks').update({ status }).eq('id', id);
  revalidatePath('/founder/work');
  revalidatePath('/founder/home');
}

/**
 * Explicit, one-way promotion: private inbox capture -> company commitment.
 * The founder chooses this; nothing promotes automatically. Only the title and
 * outcome statement cross the boundary — the private body stays private. The
 * event is audited on both the company surface (activity/audit) and the private
 * founder_promotions ledger (idempotency + provenance). The private source row
 * is preserved and marked promoted; later edits to it never rewrite the company
 * record.
 */
export async function promoteInboxToCommitment(_prev: ActionResult, form: FormData): Promise<ActionResult> {
  const gate = await founderGate();
  if ('error' in gate) return { ok: false, error: gate.error };
  const { supabase, ctx } = gate;

  const id = String(form.get('id') ?? '');
  const outcomeStatement = String(form.get('outcomeStatement') ?? '').trim();
  if (!id) return { ok: false, error: 'Missing item.' };

  const { data: item } = await supabase
    .from('founder_inbox_items')
    .select('id, title, triage_status')
    .eq('id', id)
    .maybeSingle();
  if (!item) return { ok: false, error: 'Item not found.' };

  // Idempotency: refuse a second promotion into commitments for this source.
  const { data: existing } = await supabase
    .from('founder_promotions')
    .select('id')
    .eq('source_table', 'founder_inbox_items')
    .eq('source_id', item.id)
    .eq('target_table', 'commitments')
    .maybeSingle();
  if (existing) return { ok: false, error: 'This capture was already promoted to KSP.' };

  const today = new Date().toISOString().slice(0, 10);
  const { data: commitment, error: cErr } = await supabase
    .from('commitments')
    .insert({
      organization_id: ctx.organizationId,
      title: item.title,
      outcome_statement: outcomeStatement || item.title,
      owner_id: ctx.user.id,
      created_by: ctx.user.id,
      next_action_date: today,
      classification: 'internal'
    })
    .select('id')
    .single();
  if (cErr || !commitment) return { ok: false, error: 'Could not create the KSP commitment.' };

  // Private promotion ledger (RLS: founder-only). Idempotency backstop via unique.
  const { error: pErr } = await supabase.from('founder_promotions').insert({
    organization_id: ctx.organizationId,
    owner_id: ctx.user.id,
    source_table: 'founder_inbox_items',
    source_id: item.id,
    target_table: 'commitments',
    target_id: commitment.id,
    fields: { title: item.title, outcome_statement: outcomeStatement || item.title }
  });
  if (pErr) return { ok: false, error: 'Promotion recorded partially — check the commitment before retrying.' };

  // Company-visible audit — this record is now company truth.
  await supabase.from('activity_events').insert({
    organization_id: ctx.organizationId,
    actor_id: ctx.user.id,
    verb: 'promoted',
    object_table: 'commitments',
    object_id: commitment.id,
    summary: `Promoted a founder capture into a company commitment`
  });
  await supabase.from('audit_events').insert({
    organization_id: ctx.organizationId,
    actor_id: ctx.user.id,
    action: 'founder.promote',
    target_table: 'commitments',
    target_id: commitment.id,
    classification: 'internal',
    metadata: { source_table: 'founder_inbox_items' }
  });

  await supabase
    .from('founder_inbox_items')
    .update({ triage_status: 'promoted', target_table: 'commitments', target_id: commitment.id })
    .eq('id', item.id);

  revalidatePath('/founder/inbox');
  revalidatePath('/founder/home');
  return { ok: true };
}
