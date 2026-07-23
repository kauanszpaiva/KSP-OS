'use server';

import { revalidatePath } from 'next/cache';
import { getAuthContext, canManageOutcomes, isExecutive, type AuthContext } from '@ksp/auth';
import type { SupabaseClient } from '@ksp/database';
import { canPerform } from '@ksp/permissions';
import {
  createCommitmentSchema,
  createDecisionRequestSchema,
  createOutcomeSchema,
  createSignalSchema,
  decideCompletionSchema,
  recordDecisionSchema,
  submitProofSchema,
  triageSignalSchema,
  updateProgressSchema
} from '@ksp/validation';
import { getServerSupabase } from '../../lib/supabase';

export interface ActionResult {
  ok: boolean;
  error?: string;
}

async function authed(): Promise<{ supabase: SupabaseClient; ctx: AuthContext } | { error: string }> {
  const supabase = await getServerSupabase();
  if (!supabase) return { error: 'not_configured' };
  const ctx = await getAuthContext(supabase);
  if (!ctx) return { error: 'unauthenticated' };
  return { supabase, ctx };
}

async function record(
  supabase: SupabaseClient,
  ctx: AuthContext,
  verb: string,
  objectTable: string,
  objectId: string | null,
  summary: string
) {
  await supabase.from('activity_events').insert({
    organization_id: ctx.organizationId,
    actor_id: ctx.user.id,
    verb,
    object_table: objectTable,
    object_id: objectId,
    summary
  });
  await supabase.from('audit_events').insert({
    organization_id: ctx.organizationId,
    actor_id: ctx.user.id,
    action: verb,
    target_table: objectTable,
    target_id: objectId,
    classification: 'internal',
    metadata: { summary }
  });
}

function firstIssue(error: { issues?: Array<{ message: string }> }): string {
  return error.issues?.[0]?.message ?? 'Invalid input.';
}

export async function createVaultEntry(_prev: ActionResult, form: FormData): Promise<ActionResult> {
  const gate = await authed();
  if ('error' in gate) return { ok: false, error: gate.error };
  const { supabase, ctx } = gate;

  if (!ctx.internalRoles.includes('founder_ceo')) return { ok: false, error: 'Founder Vault is restricted to the founder.' };

  const title = String(form.get('title') ?? '').trim();
  const entryType = String(form.get('entryType') ?? 'note').trim();
  const body = String(form.get('body') ?? '').trim();
  if (title.length < 2) return { ok: false, error: 'A title is required.' };

  const { error } = await supabase.from('founder_vault_entries').insert({
    organization_id: ctx.organizationId,
    owner_id: ctx.user.id,
    entry_type: entryType,
    title,
    body: body || null
  });
  if (error) return { ok: false, error: 'Could not save vault entry.' };
  // Founder Vault is excluded from company/activity surfaces by design — no
  // activity_event or company audit is emitted here.
  revalidatePath('/founder-vault');
  return { ok: true };
}

export async function createOutcome(_prev: ActionResult, form: FormData): Promise<ActionResult> {
  const gate = await authed();
  if ('error' in gate) return { ok: false, error: gate.error };
  const { supabase, ctx } = gate;

  if (!canManageOutcomes(ctx)) return { ok: false, error: 'Only executives can create company outcomes.' };

  const parsed = createOutcomeSchema.safeParse({
    title: form.get('title'),
    description: form.get('description') ?? undefined,
    metric: form.get('metric') ?? undefined,
    target: form.get('target') ?? undefined,
    horizonDays: form.get('horizonDays') || undefined,
    ownerId: form.get('ownerId') || undefined
  });
  if (!parsed.success) return { ok: false, error: firstIssue(parsed.error) };

  const { error, data } = await supabase
    .from('company_outcomes')
    .insert({
      organization_id: ctx.organizationId,
      title: parsed.data.title,
      description: parsed.data.description || null,
      metric: parsed.data.metric || null,
      target: parsed.data.target || null,
      horizon_days: parsed.data.horizonDays ?? null,
      owner_id: parsed.data.ownerId ?? ctx.user.id,
      created_by: ctx.user.id,
      state: 'active'
    })
    .select('id')
    .single();

  if (error) {
    if (error.message.includes('active_outcome_limit_reached')) {
      return { ok: false, error: 'Three company outcomes are already active. Complete, pause, or replace one first.' };
    }
    return { ok: false, error: 'Could not create outcome.' };
  }
  await record(supabase, ctx, 'outcome.created', 'company_outcomes', data.id, `Created outcome: ${parsed.data.title}`);
  revalidatePath('/outcomes');
  revalidatePath('/pulse');
  return { ok: true };
}

export async function setOutcomeState(_prev: ActionResult, form: FormData): Promise<ActionResult> {
  const gate = await authed();
  if ('error' in gate) return { ok: false, error: gate.error };
  const { supabase, ctx } = gate;
  if (!canManageOutcomes(ctx)) return { ok: false, error: 'Only executives can change outcomes.' };

  const id = String(form.get('id') ?? '');
  const state = String(form.get('state') ?? '');
  if (!['active', 'paused', 'completed', 'replaced'].includes(state)) return { ok: false, error: 'Invalid state.' };

  const patch: Record<string, unknown> = { state };
  if (state !== 'active') patch.closed_at = new Date().toISOString();
  const { error } = await supabase.from('company_outcomes').update(patch).eq('id', id);
  if (error) {
    if (error.message.includes('active_outcome_limit_reached')) {
      return { ok: false, error: 'Cannot re-activate: three outcomes are already active.' };
    }
    return { ok: false, error: 'Could not update outcome.' };
  }
  await record(supabase, ctx, 'outcome.state_changed', 'company_outcomes', id, `Outcome moved to ${state}`);
  revalidatePath('/outcomes');
  revalidatePath('/pulse');
  return { ok: true };
}

export async function createCommitment(_prev: ActionResult, form: FormData): Promise<ActionResult> {
  const gate = await authed();
  if ('error' in gate) return { ok: false, error: gate.error };
  const { supabase, ctx } = gate;

  // Authorization: creating/managing commitments is an internal project.manage action.
  const decision = canPerform(ctx.membership, 'project.manage', {
    organizationId: ctx.organizationId,
    classification: 'internal'
  });
  if (!decision.allowed) return { ok: false, error: 'You are not permitted to create commitments.' };

  const parsed = createCommitmentSchema.safeParse({
    title: form.get('title'),
    outcomeStatement: form.get('outcomeStatement'),
    context: form.get('context') ?? undefined,
    outcomeId: form.get('outcomeId') || undefined,
    ownerId: form.get('ownerId'),
    dueDate: form.get('dueDate') ?? undefined,
    nextActionDate: form.get('nextActionDate') ?? undefined,
    requiresProof: form.get('requiresProof') === 'on' || form.get('requiresProof') === 'true'
  });
  if (!parsed.success) return { ok: false, error: firstIssue(parsed.error) };

  const { error, data } = await supabase
    .from('commitments')
    .insert({
      organization_id: ctx.organizationId,
      outcome_id: parsed.data.outcomeId ?? null,
      title: parsed.data.title,
      outcome_statement: parsed.data.outcomeStatement,
      context: parsed.data.context || null,
      owner_id: parsed.data.ownerId,
      due_date: parsed.data.dueDate || null,
      next_action_date: parsed.data.nextActionDate || null,
      requires_proof: parsed.data.requiresProof,
      created_by: ctx.user.id,
      state: 'open'
    })
    .select('id')
    .single();
  if (error) return { ok: false, error: 'Could not create commitment.' };

  // Owner is accountable; assignment mirrors ownership for capacity views.
  await supabase.from('commitment_assignments').insert({
    organization_id: ctx.organizationId,
    commitment_id: data.id,
    profile_id: parsed.data.ownerId,
    role: 'accountable',
    assigned_by: ctx.user.id
  });
  await record(supabase, ctx, 'commitment.created', 'commitments', data.id, `Committed: ${parsed.data.title}`);
  revalidatePath('/commitments');
  revalidatePath('/focus');
  revalidatePath('/pulse');
  return { ok: true };
}

export async function updateProgress(_prev: ActionResult, form: FormData): Promise<ActionResult> {
  const gate = await authed();
  if ('error' in gate) return { ok: false, error: gate.error };
  const { supabase, ctx } = gate;

  const parsed = updateProgressSchema.safeParse({
    commitmentId: form.get('commitmentId'),
    progress: form.get('progress'),
    state: form.get('state') || undefined
  });
  if (!parsed.success) return { ok: false, error: firstIssue(parsed.error) };

  const patch: Record<string, unknown> = { progress: parsed.data.progress };
  if (parsed.data.state) patch.state = parsed.data.state;
  const { error } = await supabase.from('commitments').update(patch).eq('id', parsed.data.commitmentId);
  if (error) return { ok: false, error: 'Could not update progress (check your access).' };

  await record(supabase, ctx, 'commitment.progress', 'commitments', parsed.data.commitmentId, `Progress set to ${parsed.data.progress}%`);
  revalidatePath('/commitments');
  revalidatePath('/focus');
  revalidatePath('/pulse');
  return { ok: true };
}

export async function submitProof(_prev: ActionResult, form: FormData): Promise<ActionResult> {
  const gate = await authed();
  if ('error' in gate) return { ok: false, error: gate.error };
  const { supabase, ctx } = gate;

  const parsed = submitProofSchema.safeParse({
    commitmentId: form.get('commitmentId'),
    kind: form.get('kind'),
    reference: form.get('reference'),
    description: form.get('description') ?? undefined
  });
  if (!parsed.success) return { ok: false, error: firstIssue(parsed.error) };

  const { error, data } = await supabase
    .from('proofs')
    .insert({
      organization_id: ctx.organizationId,
      commitment_id: parsed.data.commitmentId,
      kind: parsed.data.kind,
      reference: parsed.data.reference,
      description: parsed.data.description || null,
      submitted_by: ctx.user.id
    })
    .select('id')
    .single();
  if (error) return { ok: false, error: 'Could not attach proof (check your access).' };

  // Requesting completion moves the commitment into the review state.
  await supabase.from('commitments').update({ state: 'proof_submitted' }).eq('id', parsed.data.commitmentId);
  await record(supabase, ctx, 'proof.submitted', 'commitments', parsed.data.commitmentId, `Proof submitted (${parsed.data.kind})`);
  revalidatePath('/commitments');
  revalidatePath('/focus');
  revalidatePath('/pulse');
  return { ok: true };
}

export async function decideCompletion(_prev: ActionResult, form: FormData): Promise<ActionResult> {
  const gate = await authed();
  if ('error' in gate) return { ok: false, error: gate.error };
  const { supabase, ctx } = gate;

  const parsed = decideCompletionSchema.safeParse({
    commitmentId: form.get('commitmentId'),
    proofId: form.get('proofId') || undefined,
    decision: form.get('decision'),
    comment: form.get('comment') ?? undefined
  });
  if (!parsed.success) return { ok: false, error: firstIssue(parsed.error) };

  if (parsed.data.decision === 'reject') {
    const { error } = await supabase.from('commitments').update({ state: 'in_progress' }).eq('id', parsed.data.commitmentId);
    if (error) return { ok: false, error: 'Could not reject completion.' };
    await record(supabase, ctx, 'commitment.rejected', 'commitments', parsed.data.commitmentId, 'Completion rejected — returned to in progress');
    revalidatePath('/commitments');
    revalidatePath('/pulse');
    return { ok: true };
  }

  // Accept: mark the proof accepted first, then complete. The DB trigger requires
  // executive acceptance and an accepted proof, so these ordering steps matter.
  if (parsed.data.proofId) {
    const { error: proofError } = await supabase
      .from('proofs')
      .update({ accepted_at: new Date().toISOString(), accepted_by: ctx.user.id })
      .eq('id', parsed.data.proofId);
    if (proofError) return { ok: false, error: 'Only executives can accept proof.' };
  }
  const { error } = await supabase
    .from('commitments')
    .update({ state: 'completed', progress: 100 })
    .eq('id', parsed.data.commitmentId);
  if (error) {
    if (error.message.includes('completion_requires_accepted_proof')) {
      return { ok: false, error: 'Completion needs an accepted proof.' };
    }
    if (error.message.includes('completion_requires_executive_acceptance')) {
      return { ok: false, error: 'Only executives can accept completion.' };
    }
    return { ok: false, error: 'Could not complete commitment.' };
  }
  await record(supabase, ctx, 'commitment.completed', 'commitments', parsed.data.commitmentId, 'Completion accepted with proof');
  revalidatePath('/commitments');
  revalidatePath('/focus');
  revalidatePath('/pulse');
  return { ok: true };
}

/* --------------------------------------------------------------- Phase C2 -- */

export async function createSignal(_prev: ActionResult, form: FormData): Promise<ActionResult> {
  const gate = await authed();
  if ('error' in gate) return { ok: false, error: gate.error };
  const { supabase, ctx } = gate;

  const parsed = createSignalSchema.safeParse({
    itemType: form.get('itemType'),
    title: form.get('title'),
    body: form.get('body') ?? undefined
  });
  if (!parsed.success) return { ok: false, error: firstIssue(parsed.error) };

  const { error, data } = await supabase
    .from('inbox_items')
    .insert({
      organization_id: ctx.organizationId,
      created_by: ctx.user.id,
      item_type: parsed.data.itemType,
      title: parsed.data.title,
      body: parsed.data.body || null
    })
    .select('id')
    .single();
  if (error) return { ok: false, error: 'Could not capture signal.' };

  await record(supabase, ctx, 'signal.captured', 'inbox_items', data.id, `Signal: ${parsed.data.title}`);
  revalidatePath('/signals');
  return { ok: true };
}

export async function triageSignal(_prev: ActionResult, form: FormData): Promise<ActionResult> {
  const gate = await authed();
  if ('error' in gate) return { ok: false, error: gate.error };
  const { supabase, ctx } = gate;

  const parsed = triageSignalSchema.safeParse({
    id: form.get('id'),
    triageStatus: form.get('triageStatus')
  });
  if (!parsed.success) return { ok: false, error: firstIssue(parsed.error) };

  const { error } = await supabase
    .from('inbox_items')
    .update({ triage_status: parsed.data.triageStatus })
    .eq('id', parsed.data.id);
  if (error) return { ok: false, error: 'Could not update the signal (check your access).' };

  await record(supabase, ctx, 'signal.triaged', 'inbox_items', parsed.data.id, `Signal moved to ${parsed.data.triageStatus}`);
  revalidatePath('/signals');
  return { ok: true };
}

export async function convertSignalToCommitment(_prev: ActionResult, form: FormData): Promise<ActionResult> {
  const gate = await authed();
  if ('error' in gate) return { ok: false, error: gate.error };
  const { supabase, ctx } = gate;

  const signalId = String(form.get('signalId') ?? '');
  const title = String(form.get('title') ?? '').trim();
  if (!signalId || title.length < 3) return { ok: false, error: 'A commitment title is required.' };

  const { error, data } = await supabase
    .from('commitments')
    .insert({
      organization_id: ctx.organizationId,
      title,
      outcome_statement: title,
      owner_id: ctx.user.id,
      next_action_date: new Date().toISOString().slice(0, 10),
      created_by: ctx.user.id,
      state: 'open'
    })
    .select('id')
    .single();
  if (error) return { ok: false, error: 'Could not create the commitment.' };

  await supabase.from('commitment_assignments').insert({
    organization_id: ctx.organizationId,
    commitment_id: data.id,
    profile_id: ctx.user.id,
    role: 'accountable',
    assigned_by: ctx.user.id
  });
  await supabase
    .from('inbox_items')
    .update({ triage_status: 'converted', target_table: 'commitments', target_id: data.id })
    .eq('id', signalId);

  await record(supabase, ctx, 'signal.converted', 'inbox_items', signalId, `Converted to commitment: ${title}`);
  revalidatePath('/signals');
  revalidatePath('/commitments');
  revalidatePath('/focus');
  return { ok: true };
}

export async function createDecisionRequest(_prev: ActionResult, form: FormData): Promise<ActionResult> {
  const gate = await authed();
  if ('error' in gate) return { ok: false, error: gate.error };
  const { supabase, ctx } = gate;

  const parsed = createDecisionRequestSchema.safeParse({
    approvalType: form.get('approvalType'),
    riskLevel: form.get('riskLevel'),
    amountMinor: form.get('amountMinor') || undefined,
    dueAt: form.get('dueAt') ?? undefined
  });
  if (!parsed.success) return { ok: false, error: firstIssue(parsed.error) };

  const { error, data } = await supabase
    .from('approval_requests')
    .insert({
      organization_id: ctx.organizationId,
      requester_id: ctx.user.id,
      approval_type: parsed.data.approvalType,
      risk_level: parsed.data.riskLevel,
      amount_minor: parsed.data.amountMinor ?? null,
      due_at: parsed.data.dueAt || null
    })
    .select('id')
    .single();
  if (error) return { ok: false, error: 'Could not create the approval request.' };

  await record(supabase, ctx, 'decision.requested', 'approval_requests', data.id, `Requested decision: ${parsed.data.approvalType}`);
  revalidatePath('/decisions');
  return { ok: true };
}

export async function recordDecision(_prev: ActionResult, form: FormData): Promise<ActionResult> {
  const gate = await authed();
  if ('error' in gate) return { ok: false, error: gate.error };
  const { supabase, ctx } = gate;

  if (!isExecutive(ctx)) return { ok: false, error: 'Only executives can decide on approval requests.' };

  const parsed = recordDecisionSchema.safeParse({
    approvalRequestId: form.get('approvalRequestId'),
    decision: form.get('decision'),
    comments: form.get('comments') ?? undefined
  });
  if (!parsed.success) return { ok: false, error: firstIssue(parsed.error) };

  const { error } = await supabase.from('approval_decisions').insert({
    organization_id: ctx.organizationId,
    approval_request_id: parsed.data.approvalRequestId,
    approver_id: ctx.user.id,
    decision: parsed.data.decision,
    comments: parsed.data.comments || null
  });
  if (error) {
    if (error.message.includes('duplicate key') || error.message.includes('unique')) {
      return { ok: false, error: 'You have already decided on this request.' };
    }
    return { ok: false, error: 'Could not record the decision — requesters cannot approve their own request.' };
  }

  await record(supabase, ctx, 'decision.recorded', 'approval_requests', parsed.data.approvalRequestId, `Decision: ${parsed.data.decision}`);
  revalidatePath('/decisions');
  return { ok: true };
}
