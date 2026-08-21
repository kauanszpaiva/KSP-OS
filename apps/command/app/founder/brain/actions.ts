'use server';

import { revalidatePath } from 'next/cache';
import { getAuthContext, type AuthContext } from '@ksp/auth';
import type { SupabaseClient } from '@ksp/database';
import { getServerSupabase } from '../../../lib/supabase';

export interface BrainActionResult {
  ok: boolean;
  error?: string;
}

const TRUTH_TYPES = new Set(['fact', 'decision', 'assumption', 'question', 'constraint']);
const TRUTH_STATUSES = new Set(['verified', 'unverified', 'needs_review', 'conflict', 'stale']);
const CONFIDENCE = new Set(['low', 'medium', 'high']);
const SOURCE_TYPES = new Set(['web', 'drive', 'github', 'email', 'document', 'conversation', 'note', 'other']);
const TRUST_STATUSES = new Set(['primary', 'trusted', 'unverified', 'conflict']);
const HANDOFF_STATUSES = new Set(['draft', 'ready', 'claimed', 'done', 'blocked', 'cancelled']);
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

async function founderGate(): Promise<{ supabase: SupabaseClient; ctx: AuthContext } | { error: string }> {
  const supabase = await getServerSupabase();
  if (!supabase) return { error: 'not_configured' };
  const ctx = await getAuthContext(supabase);
  if (!ctx) return { error: 'unauthenticated' };
  if (!ctx.internalRoles.includes('founder_ceo')) return { error: 'Second Brain is restricted to the founder.' };
  return { supabase, ctx };
}

function value(form: FormData, key: string): string {
  return String(form.get(key) ?? '').trim();
}

function refreshBrain(...paths: string[]): void {
  for (const path of new Set(['/founder/home', '/founder/knowledge', ...paths])) revalidatePath(path);
}

export async function createTruthItem(_prev: BrainActionResult, form: FormData): Promise<BrainActionResult> {
  const gate = await founderGate();
  if ('error' in gate) return { ok: false, error: gate.error };
  const { supabase, ctx } = gate;

  const title = value(form, 'title');
  const content = value(form, 'content');
  const itemType = value(form, 'itemType') || 'fact';
  const status = value(form, 'status') || 'unverified';
  const confidence = value(form, 'confidence') || 'medium';
  const sourceLabel = value(form, 'sourceLabel');
  const sourceUrl = value(form, 'sourceUrl');
  const sourceDate = value(form, 'sourceDate');

  if (title.length < 2 || title.length > 300) return { ok: false, error: 'Use a title between 2 and 300 characters.' };
  if (!TRUTH_TYPES.has(itemType)) return { ok: false, error: 'Invalid knowledge type.' };
  if (!TRUTH_STATUSES.has(status)) return { ok: false, error: 'Invalid verification status.' };
  if (!CONFIDENCE.has(confidence)) return { ok: false, error: 'Invalid confidence.' };
  if (sourceUrl.length > 2048) return { ok: false, error: 'Source reference is too long.' };

  const { error } = await supabase.from('founder_truth_items').insert({
    organization_id: ctx.organizationId,
    owner_id: ctx.user.id,
    item_type: itemType,
    title,
    content: content || null,
    status,
    confidence,
    source_label: sourceLabel || null,
    source_url: sourceUrl || null,
    source_date: sourceDate || null,
    last_verified_at: status === 'verified' ? new Date().toISOString() : null
  });
  if (error) return { ok: false, error: 'Could not save this Truth item.' };
  refreshBrain('/founder/truth');
  return { ok: true };
}

export async function setTruthStatus(form: FormData): Promise<void> {
  const gate = await founderGate();
  if ('error' in gate) return;
  const id = value(form, 'id');
  const status = value(form, 'status');
  if (!UUID.test(id) || !TRUTH_STATUSES.has(status)) return;
  await gate.supabase
    .from('founder_truth_items')
    .update({ status, last_verified_at: status === 'verified' ? new Date().toISOString() : null })
    .eq('id', id);
  refreshBrain('/founder/truth');
}

export async function createSource(_prev: BrainActionResult, form: FormData): Promise<BrainActionResult> {
  const gate = await founderGate();
  if ('error' in gate) return { ok: false, error: gate.error };
  const { supabase, ctx } = gate;

  const title = value(form, 'title');
  const sourceType = value(form, 'sourceType') || 'other';
  const locator = value(form, 'locator');
  const summary = value(form, 'summary');
  const trustStatus = value(form, 'trustStatus') || 'unverified';
  const sourceDate = value(form, 'sourceDate');

  if (title.length < 2 || title.length > 300) return { ok: false, error: 'Use a title between 2 and 300 characters.' };
  if (!SOURCE_TYPES.has(sourceType)) return { ok: false, error: 'Invalid source type.' };
  if (!TRUST_STATUSES.has(trustStatus)) return { ok: false, error: 'Invalid trust status.' };
  if (locator.length > 2048) return { ok: false, error: 'Source locator is too long.' };

  const { error } = await supabase.from('founder_sources').insert({
    organization_id: ctx.organizationId,
    owner_id: ctx.user.id,
    source_type: sourceType,
    title,
    locator: locator || null,
    summary: summary || null,
    trust_status: trustStatus,
    source_date: sourceDate || null
  });
  if (error) return { ok: false, error: 'Could not save this source.' };
  refreshBrain('/founder/sources', '/founder/context');
  return { ok: true };
}

export async function createContextPack(_prev: BrainActionResult, form: FormData): Promise<BrainActionResult> {
  const gate = await founderGate();
  if ('error' in gate) return { ok: false, error: gate.error };
  const { supabase, ctx } = gate;

  const title = value(form, 'title');
  const purpose = value(form, 'purpose');
  const content = value(form, 'content');
  const sourceIds = form.getAll('sourceIds').map(String).filter((id) => UUID.test(id)).slice(0, 50);
  if (title.length < 2 || title.length > 300) return { ok: false, error: 'Use a title between 2 and 300 characters.' };
  if (content.length < 2) return { ok: false, error: 'Add the context the AI should receive.' };

  const { data: pack, error } = await supabase
    .from('founder_context_packs')
    .insert({ organization_id: ctx.organizationId, owner_id: ctx.user.id, title, purpose: purpose || null, content })
    .select('id')
    .single();
  if (error || !pack) return { ok: false, error: 'Could not create the context pack.' };

  if (sourceIds.length > 0) {
    const { error: linkError } = await supabase.from('founder_context_pack_sources').insert(
      sourceIds.map((sourceId) => ({
        organization_id: ctx.organizationId,
        owner_id: ctx.user.id,
        context_pack_id: pack.id,
        source_id: sourceId
      }))
    );
    if (linkError) {
      await supabase.from('founder_context_packs').delete().eq('id', pack.id);
      return { ok: false, error: 'Could not attach the selected sources; the pack was rolled back.' };
    }
  }

  refreshBrain('/founder/context', '/founder/handoffs');
  return { ok: true };
}

export async function archiveContextPack(form: FormData): Promise<void> {
  const gate = await founderGate();
  if ('error' in gate) return;
  const id = value(form, 'id');
  if (!UUID.test(id)) return;
  await gate.supabase.from('founder_context_packs').update({ status: 'archived' }).eq('id', id);
  refreshBrain('/founder/context');
}

export async function createHandoff(_prev: BrainActionResult, form: FormData): Promise<BrainActionResult> {
  const gate = await founderGate();
  if ('error' in gate) return { ok: false, error: gate.error };
  const { supabase, ctx } = gate;

  const title = value(form, 'title');
  const fromAgent = value(form, 'fromAgent') || 'Kauan';
  const toAgent = value(form, 'toAgent');
  const objective = value(form, 'objective');
  const contextPackId = value(form, 'contextPackId');
  const instructions = value(form, 'instructions');
  const status = value(form, 'status') || 'ready';

  if (title.length < 2 || title.length > 300) return { ok: false, error: 'Use a title between 2 and 300 characters.' };
  if (toAgent.length < 1 || toAgent.length > 120) return { ok: false, error: 'Choose the receiving AI/agent.' };
  if (objective.length < 2) return { ok: false, error: 'Describe the objective.' };
  if (!HANDOFF_STATUSES.has(status)) return { ok: false, error: 'Invalid handoff status.' };
  if (contextPackId && !UUID.test(contextPackId)) return { ok: false, error: 'Invalid context pack.' };

  const { error } = await supabase.from('founder_handoffs').insert({
    organization_id: ctx.organizationId,
    owner_id: ctx.user.id,
    title,
    from_agent: fromAgent,
    to_agent: toAgent,
    objective,
    context_pack_id: contextPackId || null,
    instructions: instructions || null,
    status
  });
  if (error) return { ok: false, error: 'Could not create this handoff.' };
  refreshBrain('/founder/handoffs');
  return { ok: true };
}

export async function setHandoffStatus(_prev: BrainActionResult, form: FormData): Promise<BrainActionResult> {
  const gate = await founderGate();
  if ('error' in gate) return { ok: false, error: gate.error };
  const id = value(form, 'id');
  const status = value(form, 'status');
  const output = value(form, 'output');
  const claimedBy = value(form, 'claimedBy');
  if (!UUID.test(id) || !HANDOFF_STATUSES.has(status)) return { ok: false, error: 'Invalid handoff update.' };
  if (status === 'done' && output.length < 2) return { ok: false, error: 'Completed handoffs need an output.' };

  const patch: Record<string, unknown> = { status };
  if (output) patch.output = output;
  if (claimedBy) patch.claimed_by = claimedBy;
  const { error } = await gate.supabase.from('founder_handoffs').update(patch).eq('id', id);
  if (error) return { ok: false, error: 'Could not update this handoff.' };
  refreshBrain('/founder/handoffs');
  return { ok: true };
}
