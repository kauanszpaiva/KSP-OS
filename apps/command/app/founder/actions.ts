'use server';

import { revalidatePath } from 'next/cache';
import { getAuthContext, type AuthContext } from '@ksp/auth';
import type { SupabaseClient } from '@ksp/database';
import { getServerSupabase } from '../../lib/supabase';
import { sendEmail } from '@ksp/notifications';
import {
  buildJulesTaskPrompt,
  createJulesClient,
  julesSessionPullRequestUrl,
  mapJulesState
} from '../../lib/jules';

export interface ActionResult {
  ok: boolean;
  error?: string;
}

const INBOX_TYPES = new Set([
  'note', 'idea', 'task', 'opportunity', 'person', 'link',
  'project_thought', 'reminder', 'financial_thought', 'learning_item', 'other'
]);
const TASK_STATUSES = new Set(['open', 'in_progress', 'waiting', 'done', 'archived']);
const TASK_PRIORITIES = new Set(['low', 'normal', 'high']);

async function founderGate(): Promise<{ supabase: SupabaseClient; ctx: AuthContext } | { error: string }> {
  const supabase = await getServerSupabase();
  if (!supabase) return { error: 'not_configured' };
  const ctx = await getAuthContext(supabase);
  if (!ctx) return { error: 'unauthenticated' };
  if (!ctx.internalRoles.includes('founder_ceo')) return { error: 'Founder OS is restricted to the founder.' };
  return { supabase, ctx };
}

// --------------------------------------------------------------------------
// AI Inbox — founder-only, non-urgent repository requests
// --------------------------------------------------------------------------
export async function createAiInboxItem(_prev: ActionResult, form: FormData): Promise<ActionResult> {
  const gate = await founderGate();
  if ('error' in gate) return { ok: false, error: gate.error };
  const { supabase, ctx } = gate;

  const title = String(form.get('title') ?? '').trim();
  const body = String(form.get('body') ?? '').trim();
  const priority = String(form.get('priority') ?? 'normal');
  if (title.length < 3) return { ok: false, error: 'Describe what you want changed.' };
  if (!['low', 'normal', 'high'].includes(priority)) return { ok: false, error: 'Invalid priority.' };

  const combined = `${title}\n${body}`.toLowerCase();
  const sensitive = /\b(finance|invoice|payment|stripe|auth|login|password|secret|rls|permission|role|migration|database|supabase|production|deploy|vercel|delete|drop)\b/.test(combined);

  const { error } = await supabase.from('founder_vault_entries').insert({
    organization_id: ctx.organizationId,
    owner_id: ctx.user.id,
    entry_type: 'ai_request',
    title,
    body: body || null,
    metadata: {
      ai_inbox: true,
      status: sensitive ? 'needs_review' : 'queued',
      priority,
      sensitive,
      executor: 'google_jules',
      repository: 'kauanszpaiva/KSP-OS',
      base_branch: 'main',
      created_via: 'founder_ai_inbox'
    }
  });
  if (error) return { ok: false, error: 'Could not queue this request.' };
  revalidatePath('/founder/ai-inbox');
  return { ok: true };
}

export async function setAiInboxStatus(form: FormData): Promise<void> {
  const gate = await founderGate();
  if ('error' in gate) return;
  const { supabase } = gate;
  const id = String(form.get('id') ?? '');
  const next = String(form.get('status') ?? '');
  if (!id || !['queued', 'needs_review', 'cancelled'].includes(next)) return;

  const { data } = await supabase
    .from('founder_vault_entries')
    .select('metadata')
    .eq('id', id)
    .eq('entry_type', 'ai_request')
    .maybeSingle();
  if (!data) return;
  const metadata = (data.metadata ?? {}) as Record<string, unknown>;
  if (metadata.sensitive === true && next === 'queued') return;
  await supabase
    .from('founder_vault_entries')
    .update({ metadata: { ...metadata, status: next } })
    .eq('id', id)
    .eq('entry_type', 'ai_request');
  revalidatePath('/founder/ai-inbox');
}

async function readAiRequest(supabase: SupabaseClient, id: string) {
  const { data } = await supabase
    .from('founder_vault_entries')
    .select('id, title, body, metadata')
    .eq('id', id)
    .eq('entry_type', 'ai_request')
    .maybeSingle();
  return data as { id: string; title: string; body: string | null; metadata: Record<string, unknown> | null } | null;
}

async function updateAiRequestMetadata(
  supabase: SupabaseClient,
  id: string,
  metadata: Record<string, unknown>
): Promise<void> {
  await supabase
    .from('founder_vault_entries')
    .update({ metadata })
    .eq('id', id)
    .eq('entry_type', 'ai_request');
}

async function auditJulesAction(
  supabase: SupabaseClient,
  ctx: AuthContext,
  id: string,
  action: string,
  metadata: Record<string, unknown> = {}
): Promise<void> {
  await supabase.from('activity_events').insert({
    organization_id: ctx.organizationId,
    actor_id: ctx.user.id,
    verb: action,
    object_table: 'founder_vault_entries',
    object_id: id,
    summary: `Google Jules: ${action}`
  });
  await supabase.from('audit_events').insert({
    organization_id: ctx.organizationId,
    actor_id: ctx.user.id,
    action: `founder.jules.${action}`,
    target_table: 'founder_vault_entries',
    target_id: id,
    classification: 'internal',
    metadata
  });
}

export async function dispatchAiInboxToJules(_prev: ActionResult, form: FormData): Promise<ActionResult> {
  const gate = await founderGate();
  if ('error' in gate) return { ok: false, error: gate.error };
  const { supabase, ctx } = gate;
  const id = String(form.get('id') ?? '').trim();
  if (!id) return { ok: false, error: 'Missing AI Inbox request.' };

  const item = await readAiRequest(supabase, id);
  if (!item) return { ok: false, error: 'AI Inbox request not found.' };
  const metadata = item.metadata ?? {};
  if (metadata.sensitive === true) return { ok: false, error: 'This request requires human execution and cannot be sent to Jules.' };
  if (metadata.status !== 'queued') return { ok: false, error: 'This request is not ready for Jules.' };
  if (typeof metadata.jules_session_name === 'string') return { ok: false, error: 'This request already has a Jules session.' };

  const repository = typeof metadata.repository === 'string' ? metadata.repository : 'kauanszpaiva/KSP-OS';
  const [owner, repo] = repository.split('/');
  if (!owner || !repo) return { ok: false, error: 'Invalid repository configuration.' };
  const baseBranch = typeof metadata.base_branch === 'string' ? metadata.base_branch : 'main';

  await updateAiRequestMetadata(supabase, id, { ...metadata, status: 'dispatching' });

  try {
    const session = await createJulesClient().createRepositorySession({
      owner,
      repo,
      startingBranch: baseBranch,
      title: item.title,
      prompt: buildJulesTaskPrompt({ title: item.title, body: item.body })
    });
    const nextMetadata = {
      ...metadata,
      status: mapJulesState(session.state),
      jules_session_name: session.name,
      jules_session_id: session.id ?? null,
      jules_session_url: session.url ?? null,
      jules_state: session.state ?? null,
      dispatched_at: new Date().toISOString(),
      last_error: null
    };
    await updateAiRequestMetadata(supabase, id, nextMetadata);
    await auditJulesAction(supabase, ctx, id, 'dispatched', {
      jules_session_name: session.name,
      repository,
      base_branch: baseBranch,
      require_plan_approval: true
    });
    revalidatePath('/founder/ai-inbox');
    return { ok: true };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Google Jules dispatch failed.';
    await updateAiRequestMetadata(supabase, id, {
      ...metadata,
      status: 'queued',
      last_error: message,
      last_attempt_at: new Date().toISOString()
    });
    revalidatePath('/founder/ai-inbox');
    return { ok: false, error: message };
  }
}

export async function refreshAiInboxJules(_prev: ActionResult, form: FormData): Promise<ActionResult> {
  const gate = await founderGate();
  if ('error' in gate) return { ok: false, error: gate.error };
  const { supabase } = gate;
  const id = String(form.get('id') ?? '').trim();
  if (!id) return { ok: false, error: 'Missing AI Inbox request.' };

  const item = await readAiRequest(supabase, id);
  if (!item) return { ok: false, error: 'AI Inbox request not found.' };
  const metadata = item.metadata ?? {};
  const sessionName = typeof metadata.jules_session_name === 'string' ? metadata.jules_session_name : '';
  if (!sessionName) return { ok: false, error: 'No Jules session is attached to this request.' };

  try {
    const session = await createJulesClient().getSession(sessionName);
    const prUrl = julesSessionPullRequestUrl(session);
    await updateAiRequestMetadata(supabase, id, {
      ...metadata,
      status: mapJulesState(session.state),
      jules_state: session.state ?? null,
      jules_session_url: session.url ?? metadata.jules_session_url ?? null,
      pr_url: prUrl ?? metadata.pr_url ?? null,
      last_synced_at: new Date().toISOString(),
      last_error: null
    });
    revalidatePath('/founder/ai-inbox');
    return { ok: true };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Could not refresh Google Jules.';
    return { ok: false, error: message };
  }
}

export async function approveAiInboxJulesPlan(_prev: ActionResult, form: FormData): Promise<ActionResult> {
  const gate = await founderGate();
  if ('error' in gate) return { ok: false, error: gate.error };
  const { supabase, ctx } = gate;
  const id = String(form.get('id') ?? '').trim();
  if (!id) return { ok: false, error: 'Missing AI Inbox request.' };

  const item = await readAiRequest(supabase, id);
  if (!item) return { ok: false, error: 'AI Inbox request not found.' };
  const metadata = item.metadata ?? {};
  if (metadata.sensitive === true) return { ok: false, error: 'Sensitive work cannot be approved for Jules.' };
  const sessionName = typeof metadata.jules_session_name === 'string' ? metadata.jules_session_name : '';
  if (!sessionName) return { ok: false, error: 'No Jules session is attached to this request.' };

  try {
    const session = await createJulesClient().approvePlan(sessionName);
    await updateAiRequestMetadata(supabase, id, {
      ...metadata,
      status: mapJulesState(session.state || 'IN_PROGRESS'),
      jules_state: session.state ?? 'IN_PROGRESS',
      plan_approved_at: new Date().toISOString(),
      last_error: null
    });
    await auditJulesAction(supabase, ctx, id, 'plan_approved', { jules_session_name: sessionName });
    revalidatePath('/founder/ai-inbox');
    return { ok: true };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Could not approve the Jules plan.';
    return { ok: false, error: message };
  }
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
  const { error } = await supabase.from('founder_inbox_items').insert({ organization_id: ctx.organizationId, owner_id: ctx.user.id, item_type: itemType, title, body: body || null });
  if (error) return { ok: false, error: 'Could not capture the item.' };
  revalidatePath('/founder/inbox');
  revalidatePath('/founder/home');
  if (itemType === 'reminder') await sendEmail({ to: ctx.user.email, subject: `Founder OS Reminder: ${title}`, html: `<p>You requested a private reminder for: <strong>${title}</strong></p><p><a href="https://command.kspdominion.group/founder/inbox">View in Inbox</a></p>` });
  return { ok: true };
}

export async function archiveInboxItem(form: FormData): Promise<void> {
  const gate = await founderGate(); if ('error' in gate) return;
  const id = String(form.get('id') ?? ''); if (!id) return;
  await gate.supabase.from('founder_inbox_items').update({ triage_status: 'archived' }).eq('id', id);
  revalidatePath('/founder/inbox');
}

export async function createFounderTask(_prev: ActionResult, form: FormData): Promise<ActionResult> {
  const gate = await founderGate(); if ('error' in gate) return { ok: false, error: gate.error };
  const { supabase, ctx } = gate;
  const title = String(form.get('title') ?? '').trim();
  const priority = String(form.get('priority') ?? 'normal').trim();
  const dueDate = String(form.get('dueDate') ?? '').trim();
  const notes = String(form.get('notes') ?? '').trim();
  if (title.length < 2) return { ok: false, error: 'A title is required.' };
  if (!TASK_PRIORITIES.has(priority)) return { ok: false, error: 'Invalid priority.' };
  const { error } = await supabase.from('founder_tasks').insert({ organization_id: ctx.organizationId, owner_id: ctx.user.id, title, priority, due_date: dueDate || null, notes: notes || null });
  if (error) return { ok: false, error: 'Could not create the task.' };
  revalidatePath('/founder/work'); revalidatePath('/founder/home');
  if (priority === 'high') await sendEmail({ to: ctx.user.email, subject: `Founder OS Action Required: ${title}`, html: `<p>A new high-priority private task requires your attention: <strong>${title}</strong></p><p><a href="https://command.kspdominion.group/founder/work">View in My Work</a></p>` });
  return { ok: true };
}

export async function setTaskStatus(_prev: ActionResult, form: FormData): Promise<ActionResult> {
  const gate = await founderGate(); if ('error' in gate) return { ok: false, error: gate.error };
  const id = String(form.get('id') ?? ''); const status = String(form.get('status') ?? '').trim(); const waitingOn = String(form.get('waitingOn') ?? '').trim();
  if (!id || !TASK_STATUSES.has(status)) return { ok: false, error: 'Invalid update.' };
  if (status === 'waiting' && !waitingOn) return { ok: false, error: 'Say what this is waiting on.' };
  const patch: Record<string, unknown> = { status }; if (status === 'waiting') patch.waiting_on = waitingOn;
  const { error } = await gate.supabase.from('founder_tasks').update(patch).eq('id', id);
  if (error) return { ok: false, error: 'Could not update the task.' };
  revalidatePath('/founder/work'); revalidatePath('/founder/home'); return { ok: true };
}

export async function convertInboxToTask(form: FormData): Promise<void> {
  const gate = await founderGate(); if ('error' in gate) return; const { supabase, ctx } = gate;
  const id = String(form.get('id') ?? ''); if (!id) return;
  const { data: item } = await supabase.from('founder_inbox_items').select('id, title, body, triage_status').eq('id', id).maybeSingle();
  if (!item || item.triage_status === 'promoted') return;
  const { data: task } = await supabase.from('founder_tasks').insert({ organization_id: ctx.organizationId, owner_id: ctx.user.id, title: item.title, notes: item.body, source_inbox_id: item.id }).select('id').single();
  if (!task) return;
  await supabase.from('founder_inbox_items').update({ triage_status: 'promoted', target_table: 'founder_tasks', target_id: task.id }).eq('id', item.id);
  revalidatePath('/founder/inbox'); revalidatePath('/founder/work');
}

export async function advanceTaskStatus(form: FormData): Promise<void> {
  const gate = await founderGate(); if ('error' in gate) return;
  const id = String(form.get('id') ?? ''); const status = String(form.get('status') ?? '').trim();
  if (!id || !TASK_STATUSES.has(status) || status === 'waiting') return;
  await gate.supabase.from('founder_tasks').update({ status }).eq('id', id);
  revalidatePath('/founder/work'); revalidatePath('/founder/home');
}

export async function promoteInboxToCommitment(_prev: ActionResult, form: FormData): Promise<ActionResult> {
  const gate = await founderGate(); if ('error' in gate) return { ok: false, error: gate.error }; const { supabase, ctx } = gate;
  const id = String(form.get('id') ?? ''); const outcomeStatement = String(form.get('outcomeStatement') ?? '').trim(); if (!id) return { ok: false, error: 'Missing item.' };
  const { data: item } = await supabase.from('founder_inbox_items').select('id, title, triage_status').eq('id', id).maybeSingle(); if (!item) return { ok: false, error: 'Item not found.' };
  const { data: existing } = await supabase.from('founder_promotions').select('id').eq('source_table', 'founder_inbox_items').eq('source_id', item.id).eq('target_table', 'commitments').maybeSingle();
  if (existing) return { ok: false, error: 'This capture was already promoted to KSP.' };
  const today = new Date().toISOString().slice(0, 10);
  const { data: commitment, error: cErr } = await supabase.from('commitments').insert({ organization_id: ctx.organizationId, title: item.title, outcome_statement: outcomeStatement || item.title, owner_id: ctx.user.id, created_by: ctx.user.id, next_action_date: today, classification: 'internal' }).select('id').single();
  if (cErr || !commitment) return { ok: false, error: 'Could not create the KSP commitment.' };
  const { error: pErr } = await supabase.from('founder_promotions').insert({ organization_id: ctx.organizationId, owner_id: ctx.user.id, source_table: 'founder_inbox_items', source_id: item.id, target_table: 'commitments', target_id: commitment.id, fields: { title: item.title, outcome_statement: outcomeStatement || item.title } });
  if (pErr) return { ok: false, error: 'Promotion recorded partially — check the commitment before retrying.' };
  await supabase.from('activity_events').insert({ organization_id: ctx.organizationId, actor_id: ctx.user.id, verb: 'promoted', object_table: 'commitments', object_id: commitment.id, summary: 'Promoted a founder capture into a company commitment' });
  await supabase.from('audit_events').insert({ organization_id: ctx.organizationId, actor_id: ctx.user.id, action: 'founder.promote', target_table: 'commitments', target_id: commitment.id, classification: 'internal', metadata: { source_table: 'founder_inbox_items' } });
  await supabase.from('founder_inbox_items').update({ triage_status: 'promoted', target_table: 'commitments', target_id: commitment.id }).eq('id', item.id);
  revalidatePath('/founder/inbox'); revalidatePath('/founder/home'); return { ok: true };
}
