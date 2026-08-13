'use server';

import { createHash, randomBytes } from 'node:crypto';
import { revalidatePath } from 'next/cache';
import { getAuthContext, canManageOutcomes, isExecutive, type AuthContext } from '@ksp/auth';
import type { SupabaseClient } from '@ksp/database';
import { canPerform } from '@ksp/permissions';
import { resolveMentions, type MentionProfile } from './mentions';
import {
  addClientNoteSchema,
  addDependencySchema,
  createCampaignSchema,
  createClientMeetingSchema,
  createClientSchema,
  createPortalInvitationSchema,
  updateMeetingStatusSchema,
  createCommitmentSchema,
  createConnectionSchema,
  createContactSchema,
  createContentItemSchema,
  createDecisionRequestSchema,
  createDocumentSchema,
  createLeadSchema,
  createMilestoneSchema,
  createMissionSchema,
  createOutcomeSchema,
  createProductSchema,
  createSignalSchema,
  createTaskSchema,
  decideCompletionSchema,
  idParamSchema,
  markNotificationReadSchema,
  postCommentSchema,
  reassignTaskSchema,
  recordDecisionSchema,
  revokeConnectionSchema,
  setMemberSuspendedSchema,
  submitProofSchema,
  toggleProductActiveSchema,
  triageSignalSchema,
  updateClientHealthSchema,
  updateContentStatusSchema,
  updateDocumentClassificationSchema,
  updateClientSchema,
  updateLeadStatusSchema,
  updateMemberRoleSchema,
  updateMilestoneStatusSchema,
  updateMissionHealthSchema,
  updateMissionSchema,
  updateProgressSchema,
  updateTaskLinkSchema,
  updateTaskStatusSchema
} from '@ksp/validation';
import { getServerSupabase } from '../../lib/supabase';
import { searchAll, type SearchResult } from './data';

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

/**
 * Emits a notification to a specific recipient. Called only from a short,
 * curated list of high-signal actions (assigned to you, a decision on your
 * request, your signal was converted) — never from every mutation, per
 * docs/rebuild/command/06_cross_cutting.md. A no-op when the recipient is the
 * actor themselves (no one needs to be notified of their own action).
 */
async function notify(
  supabase: SupabaseClient,
  ctx: AuthContext,
  recipientId: string,
  verb: string,
  objectTable: string,
  objectId: string | null,
  summary: string,
  link?: string
) {
  if (recipientId === ctx.user.id) return;
  await supabase.from('notifications').insert({
    organization_id: ctx.organizationId,
    recipient_id: recipientId,
    actor_id: ctx.user.id,
    verb,
    object_table: objectTable,
    object_id: objectId,
    summary,
    link: link ?? null
  });
}

function firstIssue(error: { issues?: Array<{ message: string }> }): string {
  return error.issues?.[0]?.message ?? 'Invalid input.';
}

/**
 * Executive-scoped delete shared by every entity's delete action. RLS is the
 * real backstop (each table has an is_executive DELETE policy); the app gate
 * gives a clean message and the audit trail. A friendly error covers the
 * common "row still has linked records" foreign-key case.
 */
async function executiveDelete(form: FormData, table: string, verb: string, paths: string[]): Promise<ActionResult> {
  const gate = await authed();
  if ('error' in gate) return { ok: false, error: gate.error };
  const { supabase, ctx } = gate;
  if (!isExecutive(ctx)) return { ok: false, error: 'Only executives can delete records.' };
  const parsed = idParamSchema.safeParse({ id: form.get('id') });
  if (!parsed.success) return { ok: false, error: firstIssue(parsed.error) };
  const { error } = await supabase.from(table).delete().eq('id', parsed.data.id);
  if (error) return { ok: false, error: 'Could not delete — it may still have linked records, or you lack access.' };
  await record(supabase, ctx, verb, table, parsed.data.id, `Deleted from ${table}`);
  for (const p of paths) revalidatePath(p);
  return { ok: true };
}

export async function deleteTask(_prev: ActionResult, form: FormData): Promise<ActionResult> {
  return executiveDelete(form, 'tasks', 'task.deleted', ['/workspace']);
}
export async function deleteMission(_prev: ActionResult, form: FormData): Promise<ActionResult> {
  return executiveDelete(form, 'projects', 'mission.deleted', ['/missions', '/workspace']);
}
export async function deleteClient(_prev: ActionResult, form: FormData): Promise<ActionResult> {
  return executiveDelete(form, 'client_organizations', 'client.deleted', ['/clients']);
}
export async function deleteContact(_prev: ActionResult, form: FormData): Promise<ActionResult> {
  return executiveDelete(form, 'contacts', 'contact.deleted', ['/clients']);
}
export async function deleteComment(_prev: ActionResult, form: FormData): Promise<ActionResult> {
  return executiveDelete(form, 'comments', 'comment.deleted', ['/workspace', '/commitments']);
}
export async function deleteMilestone(_prev: ActionResult, form: FormData): Promise<ActionResult> {
  return executiveDelete(form, 'mission_milestones', 'milestone.deleted', ['/missions']);
}
export async function deleteProduct(_prev: ActionResult, form: FormData): Promise<ActionResult> {
  return executiveDelete(form, 'products', 'product.deleted', ['/products']);
}
export async function deleteLead(_prev: ActionResult, form: FormData): Promise<ActionResult> {
  return executiveDelete(form, 'leads', 'lead.deleted', ['/revenue']);
}
export async function deleteOutcome(_prev: ActionResult, form: FormData): Promise<ActionResult> {
  return executiveDelete(form, 'company_outcomes', 'outcome.deleted', ['/outcomes']);
}
export async function deleteCommitment(_prev: ActionResult, form: FormData): Promise<ActionResult> {
  return executiveDelete(form, 'commitments', 'commitment.deleted', ['/commitments']);
}

/**
 * Archives a client instead of deleting it. A client accumulates linked records
 * (contacts, memberships, invitations, requests, change orders, finance) whose
 * foreign keys deliberately have no ON DELETE CASCADE — finance/audit history is
 * never silently destroyed — so a hard delete fails for any client that has been
 * used. Archiving flips `status` to 'archived' (the clients view already splits
 * Active vs Archived) and stamps `archived_at`, keeping everything recoverable.
 * Executive-gated; the client_organizations_update RLS policy is the backstop.
 */
export async function archiveClient(_prev: ActionResult, form: FormData): Promise<ActionResult> {
  const gate = await authed();
  if ('error' in gate) return { ok: false, error: gate.error };
  const { supabase, ctx } = gate;
  if (!isExecutive(ctx)) return { ok: false, error: 'Only executives can archive clients.' };
  const parsed = idParamSchema.safeParse({ id: form.get('id') });
  if (!parsed.success) return { ok: false, error: firstIssue(parsed.error) };
  const { error } = await supabase
    .from('client_organizations')
    .update({ status: 'archived', archived_at: new Date().toISOString() })
    .eq('id', parsed.data.id);
  if (error) return { ok: false, error: 'Could not archive this client.' };
  await record(supabase, ctx, 'client.archived', 'client_organizations', parsed.data.id, 'Client archived');
  revalidatePath('/clients');
  return { ok: true };
}

/** Restores an archived client back to active. Executive-gated, mirrors archiveClient. */
export async function restoreClient(_prev: ActionResult, form: FormData): Promise<ActionResult> {
  const gate = await authed();
  if ('error' in gate) return { ok: false, error: gate.error };
  const { supabase, ctx } = gate;
  if (!isExecutive(ctx)) return { ok: false, error: 'Only executives can restore clients.' };
  const parsed = idParamSchema.safeParse({ id: form.get('id') });
  if (!parsed.success) return { ok: false, error: firstIssue(parsed.error) };
  const { error } = await supabase
    .from('client_organizations')
    .update({ status: 'active', archived_at: null })
    .eq('id', parsed.data.id);
  if (error) return { ok: false, error: 'Could not restore this client.' };
  await record(supabase, ctx, 'client.restored', 'client_organizations', parsed.data.id, 'Client restored');
  revalidatePath('/clients');
  return { ok: true };
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
  await notify(supabase, ctx, parsed.data.ownerId, 'commitment.assigned', 'commitments', data.id, `You were assigned: ${parsed.data.title}`, '/focus');
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
  const { data: signalRow } = await supabase
    .from('inbox_items')
    .update({ triage_status: 'converted', target_table: 'commitments', target_id: data.id })
    .eq('id', signalId)
    .select('created_by')
    .single();

  await record(supabase, ctx, 'signal.converted', 'inbox_items', signalId, `Converted to commitment: ${title}`);
  if (signalRow?.created_by) {
    await notify(supabase, ctx, signalRow.created_by, 'signal.converted', 'inbox_items', signalId, `Your signal became a commitment: ${title}`, '/commitments');
  }
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

  const { data: requestRow } = await supabase
    .from('approval_requests')
    .select('requester_id, approval_type')
    .eq('id', parsed.data.approvalRequestId)
    .maybeSingle();

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
  if (requestRow?.requester_id) {
    const typeLabel = String(requestRow.approval_type).replace(/_/g, ' ');
    await notify(
      supabase,
      ctx,
      requestRow.requester_id,
      'decision.recorded',
      'approval_requests',
      parsed.data.approvalRequestId,
      `Your ${typeLabel} request was ${parsed.data.decision}`,
      '/decisions'
    );
  }
  revalidatePath('/decisions');
  return { ok: true };
}

/* --------------------------------------------------------------- Phase C3 -- */

export async function createMission(_prev: ActionResult, form: FormData): Promise<ActionResult> {
  const gate = await authed();
  if ('error' in gate) return { ok: false, error: gate.error };
  const { supabase, ctx } = gate;

  const decision = canPerform(ctx.membership, 'project.manage', { organizationId: ctx.organizationId, classification: 'internal' });
  if (!decision.allowed) return { ok: false, error: 'You are not permitted to create missions.' };

  const parsed = createMissionSchema.safeParse({
    name: form.get('name'),
    projectType: form.get('projectType'),
    clientId: form.get('clientId') || undefined
  });
  if (!parsed.success) return { ok: false, error: firstIssue(parsed.error) };

  const { error, data } = await supabase
    .from('projects')
    .insert({
      organization_id: ctx.organizationId,
      client_id: parsed.data.clientId ?? null,
      name: parsed.data.name,
      project_type: parsed.data.projectType,
      health: 'unknown',
      status: 'active'
    })
    .select('id')
    .single();
  if (error) return { ok: false, error: 'Could not create the mission.' };

  // The creator must join their own mission or it becomes invisible to them
  // (project_memberships gates read access via can_access_project).
  await supabase.from('project_memberships').insert({
    organization_id: ctx.organizationId,
    project_id: data.id,
    profile_id: ctx.user.id,
    role: ctx.internalRoles[0] ?? 'contractor'
  });

  await record(supabase, ctx, 'mission.created', 'projects', data.id, `Created mission: ${parsed.data.name}`);
  revalidatePath('/missions');
  revalidatePath('/workspace');
  return { ok: true };
}

export async function updateMissionHealth(_prev: ActionResult, form: FormData): Promise<ActionResult> {
  const gate = await authed();
  if ('error' in gate) return { ok: false, error: gate.error };
  const { supabase, ctx } = gate;

  const parsed = updateMissionHealthSchema.safeParse({
    id: form.get('id'),
    health: form.get('health'),
    nextAction: form.get('nextAction') ?? undefined
  });
  if (!parsed.success) return { ok: false, error: firstIssue(parsed.error) };

  const patch: Record<string, unknown> = { health: parsed.data.health };
  if (parsed.data.nextAction) patch.next_action = parsed.data.nextAction;
  const { error } = await supabase.from('projects').update(patch).eq('id', parsed.data.id);
  if (error) return { ok: false, error: 'Could not update the mission (check your access).' };

  await record(supabase, ctx, 'mission.health_changed', 'projects', parsed.data.id, `Health set to ${parsed.data.health}`);
  revalidatePath('/missions');
  return { ok: true };
}

export async function updateMission(_prev: ActionResult, form: FormData): Promise<ActionResult> {
  const gate = await authed();
  if ('error' in gate) return { ok: false, error: gate.error };
  const { supabase, ctx } = gate;

  const decision = canPerform(ctx.membership, 'project.manage', { organizationId: ctx.organizationId, classification: 'internal' });
  if (!decision.allowed) return { ok: false, error: 'You are not permitted to edit missions.' };

  const parsed = updateMissionSchema.safeParse({
    id: form.get('id'),
    name: form.get('name') ?? undefined,
    projectType: form.get('projectType') ?? undefined,
    nextAction: form.get('nextAction') ?? undefined,
    clientId: form.get('clientId') ?? undefined
  });
  if (!parsed.success) return { ok: false, error: firstIssue(parsed.error) };

  const patch: Record<string, unknown> = {};
  if (parsed.data.name !== undefined) patch.name = parsed.data.name;
  if (parsed.data.projectType !== undefined) patch.project_type = parsed.data.projectType;
  if (parsed.data.nextAction !== undefined) patch.next_action = parsed.data.nextAction || null;
  // Empty string clears the link; a uuid sets it; `undefined` leaves it untouched.
  if (parsed.data.clientId !== undefined) patch.client_id = parsed.data.clientId || null;
  if (Object.keys(patch).length === 0) return { ok: true };

  const { error } = await supabase.from('projects').update(patch).eq('id', parsed.data.id);
  if (error) return { ok: false, error: 'Could not update the mission (check your access).' };

  await record(supabase, ctx, 'mission.updated', 'projects', parsed.data.id, `Updated mission details`);
  revalidatePath('/missions');
  revalidatePath('/workspace');
  return { ok: true };
}

export async function createMilestone(_prev: ActionResult, form: FormData): Promise<ActionResult> {
  const gate = await authed();
  if ('error' in gate) return { ok: false, error: gate.error };
  const { supabase, ctx } = gate;

  const parsed = createMilestoneSchema.safeParse({
    projectId: form.get('projectId'),
    title: form.get('title'),
    phase: form.get('phase') ?? undefined,
    startDate: form.get('startDate') ?? undefined,
    dueDate: form.get('dueDate') ?? undefined
  });
  if (!parsed.success) return { ok: false, error: firstIssue(parsed.error) };

  const { error, data } = await supabase
    .from('mission_milestones')
    .insert({
      organization_id: ctx.organizationId,
      project_id: parsed.data.projectId,
      title: parsed.data.title,
      phase: parsed.data.phase || null,
      start_date: parsed.data.startDate || null,
      due_date: parsed.data.dueDate || null,
      created_by: ctx.user.id
    })
    .select('id')
    .single();
  if (error) return { ok: false, error: 'Could not add the milestone (check your access).' };

  await record(supabase, ctx, 'milestone.created', 'mission_milestones', data.id, `Milestone: ${parsed.data.title}`);
  revalidatePath('/missions');
  return { ok: true };
}

export async function updateMilestoneStatus(_prev: ActionResult, form: FormData): Promise<ActionResult> {
  const gate = await authed();
  if ('error' in gate) return { ok: false, error: gate.error };
  const { supabase, ctx } = gate;

  const parsed = updateMilestoneStatusSchema.safeParse({ id: form.get('id'), status: form.get('status') });
  if (!parsed.success) return { ok: false, error: firstIssue(parsed.error) };

  const { error } = await supabase.from('mission_milestones').update({ status: parsed.data.status }).eq('id', parsed.data.id);
  if (error) return { ok: false, error: 'Could not update the milestone (check your access).' };

  await record(supabase, ctx, 'milestone.status_changed', 'mission_milestones', parsed.data.id, `Milestone moved to ${parsed.data.status}`);
  revalidatePath('/missions');
  revalidatePath('/schedule');
  revalidatePath('/horizon');
  return { ok: true };
}

export async function addMissionDependency(_prev: ActionResult, form: FormData): Promise<ActionResult> {
  const gate = await authed();
  if ('error' in gate) return { ok: false, error: gate.error };
  const { supabase, ctx } = gate;

  const parsed = addDependencySchema.safeParse({
    projectId: form.get('projectId'),
    dependsOnProjectId: form.get('dependsOnProjectId'),
    note: form.get('note') ?? undefined
  });
  if (!parsed.success) return { ok: false, error: firstIssue(parsed.error) };

  const { error, data } = await supabase
    .from('mission_dependencies')
    .insert({
      organization_id: ctx.organizationId,
      project_id: parsed.data.projectId,
      depends_on_project_id: parsed.data.dependsOnProjectId,
      note: parsed.data.note || null,
      created_by: ctx.user.id
    })
    .select('id')
    .single();
  if (error) {
    if (error.message.includes('duplicate key') || error.message.includes('unique')) {
      return { ok: false, error: 'This dependency already exists.' };
    }
    return { ok: false, error: 'Could not add the dependency (check your access).' };
  }

  await record(supabase, ctx, 'mission.dependency_added', 'mission_dependencies', data.id, 'Dependency added');
  revalidatePath('/missions');
  return { ok: true };
}

/* --------------------------------------------------------- Phase C3: Workspace -- */

export async function createTask(_prev: ActionResult, form: FormData): Promise<ActionResult> {
  const gate = await authed();
  if ('error' in gate) return { ok: false, error: gate.error };
  const { supabase, ctx } = gate;

  const parsed = createTaskSchema.safeParse({
    title: form.get('title'),
    projectId: form.get('projectId') || undefined,
    ownerId: form.get('ownerId') || undefined,
    startDate: form.get('startDate') ?? undefined,
    dueDate: form.get('dueDate') ?? undefined
  });
  if (!parsed.success) return { ok: false, error: firstIssue(parsed.error) };

  const { error, data } = await supabase
    .from('tasks')
    .insert({
      organization_id: ctx.organizationId,
      project_id: parsed.data.projectId ?? null,
      owner_id: parsed.data.ownerId ?? ctx.user.id,
      title: parsed.data.title,
      start_date: parsed.data.startDate || null,
      due_date: parsed.data.dueDate || null
    })
    .select('id')
    .single();
  if (error) return { ok: false, error: 'Could not create the task (check your access to the mission).' };

  await record(supabase, ctx, 'task.created', 'tasks', data.id, `Task: ${parsed.data.title}`);
  revalidatePath('/workspace');
  return { ok: true };
}

export async function updateTaskStatus(_prev: ActionResult, form: FormData): Promise<ActionResult> {
  const gate = await authed();
  if ('error' in gate) return { ok: false, error: gate.error };
  const { supabase, ctx } = gate;

  const parsed = updateTaskStatusSchema.safeParse({
    id: form.get('id'),
    status: form.get('status') || undefined,
    blocked: form.get('blocked') || undefined
  });
  if (!parsed.success) return { ok: false, error: firstIssue(parsed.error) };

  const patch: Record<string, unknown> = {};
  if (parsed.data.status) patch.status = parsed.data.status;
  if (parsed.data.blocked !== undefined) patch.blocked = parsed.data.blocked;
  const { error } = await supabase.from('tasks').update(patch).eq('id', parsed.data.id);
  if (error) return { ok: false, error: 'Could not update the task (check your access).' };

  await record(supabase, ctx, 'task.updated', 'tasks', parsed.data.id, 'Task updated');
  revalidatePath('/workspace');
  return { ok: true };
}

export async function reassignTask(_prev: ActionResult, form: FormData): Promise<ActionResult> {
  const gate = await authed();
  if ('error' in gate) return { ok: false, error: gate.error };
  const { supabase, ctx } = gate;

  const parsed = reassignTaskSchema.safeParse({
    id: form.get('id'),
    ownerId: form.get('ownerId')
  });
  if (!parsed.success) return { ok: false, error: firstIssue(parsed.error) };

  const { error } = await supabase.from('tasks').update({ owner_id: parsed.data.ownerId }).eq('id', parsed.data.id);
  if (error) return { ok: false, error: 'Could not reassign the task (check your access).' };

  await record(supabase, ctx, 'task.reassigned', 'tasks', parsed.data.id, 'Task reassigned');
  revalidatePath('/workspace');
  return { ok: true };
}

/* --------------------------------------------------------------- Phase C4 -- */

export async function createLead(_prev: ActionResult, form: FormData): Promise<ActionResult> {
  const gate = await authed();
  if ('error' in gate) return { ok: false, error: gate.error };
  const { supabase, ctx } = gate;

  const parsed = createLeadSchema.safeParse({
    name: form.get('name'),
    source: form.get('source') ?? undefined,
    expectedValueMinor: form.get('expectedValueMinor') || undefined,
    probability: form.get('probability') || undefined,
    targetCloseDate: form.get('targetCloseDate') ?? undefined,
    nextAction: form.get('nextAction') ?? undefined
  });
  if (!parsed.success) return { ok: false, error: firstIssue(parsed.error) };

  const { error, data } = await supabase
    .from('leads')
    .insert({
      organization_id: ctx.organizationId,
      owner_id: ctx.user.id,
      name: parsed.data.name,
      source: parsed.data.source || null,
      expected_value_minor: parsed.data.expectedValueMinor ?? null,
      probability: parsed.data.probability ?? null,
      target_close_date: parsed.data.targetCloseDate || null,
      next_action: parsed.data.nextAction || null,
      status: 'active'
    })
    .select('id')
    .single();
  if (error) return { ok: false, error: 'Could not create the lead.' };

  await record(supabase, ctx, 'lead.created', 'leads', data.id, `Lead: ${parsed.data.name}`);
  revalidatePath('/revenue');
  return { ok: true };
}

export async function updateLeadStatus(_prev: ActionResult, form: FormData): Promise<ActionResult> {
  const gate = await authed();
  if ('error' in gate) return { ok: false, error: gate.error };
  const { supabase, ctx } = gate;

  const parsed = updateLeadStatusSchema.safeParse({
    id: form.get('id'),
    status: form.get('status'),
    nextAction: form.get('nextAction') ?? undefined
  });
  if (!parsed.success) return { ok: false, error: firstIssue(parsed.error) };

  const patch: Record<string, unknown> = { status: parsed.data.status };
  if (parsed.data.nextAction) patch.next_action = parsed.data.nextAction;
  const { error } = await supabase.from('leads').update(patch).eq('id', parsed.data.id);
  if (error) return { ok: false, error: 'Could not update the lead (check your access).' };

  await record(supabase, ctx, 'lead.status_changed', 'leads', parsed.data.id, `Lead moved to ${parsed.data.status}`);
  revalidatePath('/revenue');
  return { ok: true };
}

export async function createClient(_prev: ActionResult, form: FormData): Promise<ActionResult> {
  const gate = await authed();
  if ('error' in gate) return { ok: false, error: gate.error };
  const { supabase, ctx } = gate;

  const parsed = createClientSchema.safeParse({ legalName: form.get('legalName'), displayName: form.get('displayName') });
  if (!parsed.success) return { ok: false, error: firstIssue(parsed.error) };

  const { error, data } = await supabase
    .from('client_organizations')
    .insert({
      organization_id: ctx.organizationId,
      legal_name: parsed.data.legalName,
      display_name: parsed.data.displayName,
      created_by: ctx.user.id
    })
    .select('id')
    .single();
  if (error) return { ok: false, error: 'Could not create the client.' };

  await record(supabase, ctx, 'client.created', 'client_organizations', data.id, `Client: ${parsed.data.displayName}`);
  revalidatePath('/clients');
  return { ok: true };
}

export interface InviteActionResult {
  ok: boolean;
  error?: string;
  /** The one-time invite path to send to the client, e.g. `/invite/<token>`. Shown once — the raw token is never stored, only its hash. */
  invitePath?: string;
}

/**
 * Creates a client portal invitation and returns the one-time invite link. Only
 * the sha256 of the token is stored (token_hash) — the raw token is returned
 * once for the internal user to hand to the client and never persisted, exactly
 * like accept_portal_invitation reads it back. The insert is governed by the
 * pre-existing internal-only `portal_invitations_internal` RLS policy
 * (202607150002); the app gate is `isExecutive`, matching member-management —
 * granting portal access is an executive action.
 */
export async function createPortalInvitation(_prev: InviteActionResult, form: FormData): Promise<InviteActionResult> {
  const gate = await authed();
  if ('error' in gate) return { ok: false, error: gate.error };
  const { supabase, ctx } = gate;

  if (!isExecutive(ctx)) return { ok: false, error: 'Only executives can invite client contacts.' };

  const parsed = createPortalInvitationSchema.safeParse({
    clientOrganizationId: form.get('clientOrganizationId'),
    email: form.get('email'),
    initialRole: form.get('initialRole'),
    expiresInDays: form.get('expiresInDays') || undefined
  });
  if (!parsed.success) return { ok: false, error: firstIssue(parsed.error) };

  const token = randomBytes(32).toString('base64url');
  const tokenHash = createHash('sha256').update(token).digest('hex');
  const expiresAt = new Date(Date.now() + parsed.data.expiresInDays * 86_400_000).toISOString();

  const { data, error } = await supabase
    .from('portal_invitations')
    .insert({
      organization_id: ctx.organizationId,
      client_organization_id: parsed.data.clientOrganizationId,
      email: parsed.data.email,
      initial_role: parsed.data.initialRole,
      invited_by: ctx.user.id,
      token_hash: tokenHash,
      expires_at: expiresAt
    })
    .select('id')
    .single();
  if (error) return { ok: false, error: 'Could not create the invitation. Check the client and try again.' };

  await record(supabase, ctx, 'portal_invitation.created', 'portal_invitations', data.id, `Invited ${parsed.data.email} as ${parsed.data.initialRole}`);
  revalidatePath('/clients');
  return { ok: true, invitePath: `/invite/${token}` };
}

/**
 * Schedules a client meeting (the "Schedule" half of the portal's Meetings &
 * Requests screen). Executive-gated at the app level; the insert is also
 * governed by the client_meetings_internal RLS policy (is_internal_member).
 * The client reads it via client_meetings_portal_read but never writes.
 */
export async function createClientMeeting(_prev: ActionResult, form: FormData): Promise<ActionResult> {
  const gate = await authed();
  if ('error' in gate) return { ok: false, error: gate.error };
  const { supabase, ctx } = gate;

  if (!isExecutive(ctx)) return { ok: false, error: 'Only executives can schedule client meetings.' };

  const parsed = createClientMeetingSchema.safeParse({
    clientOrganizationId: form.get('clientOrganizationId'),
    projectId: form.get('projectId') || undefined,
    title: form.get('title'),
    scheduledAt: form.get('scheduledAt'),
    durationMinutes: form.get('durationMinutes') || undefined,
    location: form.get('location') || undefined,
    agenda: form.get('agenda') || undefined
  });
  if (!parsed.success) return { ok: false, error: firstIssue(parsed.error) };

  const scheduled = new Date(parsed.data.scheduledAt);
  if (Number.isNaN(scheduled.getTime())) return { ok: false, error: 'Enter a valid date and time.' };

  const { data, error } = await supabase
    .from('client_meetings')
    .insert({
      organization_id: ctx.organizationId,
      client_organization_id: parsed.data.clientOrganizationId,
      project_id: parsed.data.projectId || null,
      title: parsed.data.title,
      scheduled_at: scheduled.toISOString(),
      duration_minutes: parsed.data.durationMinutes ?? null,
      location: parsed.data.location || null,
      agenda: parsed.data.agenda || null,
      created_by: ctx.user.id
    })
    .select('id')
    .single();
  if (error) return { ok: false, error: 'Could not schedule the meeting.' };

  await record(supabase, ctx, 'client_meeting.scheduled', 'client_meetings', data.id, `Meeting: ${parsed.data.title}`);
  revalidatePath('/clients');
  return { ok: true };
}

export async function updateMeetingStatus(_prev: ActionResult, form: FormData): Promise<ActionResult> {
  const gate = await authed();
  if ('error' in gate) return { ok: false, error: gate.error };
  const { supabase, ctx } = gate;

  if (!isExecutive(ctx)) return { ok: false, error: 'Only executives can update client meetings.' };

  const parsed = updateMeetingStatusSchema.safeParse({ id: form.get('id'), status: form.get('status') });
  if (!parsed.success) return { ok: false, error: firstIssue(parsed.error) };

  const { error } = await supabase.from('client_meetings').update({ status: parsed.data.status }).eq('id', parsed.data.id);
  if (error) return { ok: false, error: 'Could not update the meeting.' };

  await record(supabase, ctx, 'client_meeting.status', 'client_meetings', parsed.data.id, `Meeting ${parsed.data.status}`);
  revalidatePath('/clients');
  return { ok: true };
}

export async function updateClientHealth(_prev: ActionResult, form: FormData): Promise<ActionResult> {
  const gate = await authed();
  if ('error' in gate) return { ok: false, error: gate.error };
  const { supabase, ctx } = gate;

  const parsed = updateClientHealthSchema.safeParse({ id: form.get('id'), relationshipHealth: form.get('relationshipHealth') });
  if (!parsed.success) return { ok: false, error: firstIssue(parsed.error) };

  const { error } = await supabase
    .from('client_organizations')
    .update({ relationship_health: parsed.data.relationshipHealth })
    .eq('id', parsed.data.id);
  if (error) return { ok: false, error: 'Could not update the client (check your access).' };

  await record(supabase, ctx, 'client.health_changed', 'client_organizations', parsed.data.id, `Health set to ${parsed.data.relationshipHealth}`);
  revalidatePath('/clients');
  return { ok: true };
}

export async function updateClient(_prev: ActionResult, form: FormData): Promise<ActionResult> {
  const gate = await authed();
  if ('error' in gate) return { ok: false, error: gate.error };
  const { supabase, ctx } = gate;

  const parsed = updateClientSchema.safeParse({
    id: form.get('id'),
    legalName: form.get('legalName') ?? undefined,
    displayName: form.get('displayName') ?? undefined
  });
  if (!parsed.success) return { ok: false, error: firstIssue(parsed.error) };

  const patch: Record<string, unknown> = {};
  if (parsed.data.legalName !== undefined) patch.legal_name = parsed.data.legalName;
  if (parsed.data.displayName !== undefined) patch.display_name = parsed.data.displayName;
  if (Object.keys(patch).length === 0) return { ok: true };

  const { error } = await supabase.from('client_organizations').update(patch).eq('id', parsed.data.id);
  if (error) return { ok: false, error: 'Could not update the client (check your access).' };

  await record(supabase, ctx, 'client.updated', 'client_organizations', parsed.data.id, `Updated client details`);
  revalidatePath('/clients');
  return { ok: true };
}

/**
 * Member management (executive-only). Changing another member's role is an
 * access.grant-class action; the app gate is isExecutive (matching every other
 * executive mutation here), the DB backstop is the executive-only UPDATE policy
 * on organization_memberships, and the last-founder invariant is enforced by a
 * DB trigger. An executive cannot change their own role or suspend themselves,
 * to avoid self-lockout. Both `role` (legacy app_role) and `internal_role` are
 * kept in sync so getAuthContext (which reads internal_role) sees the change.
 */
export async function updateMemberRole(_prev: ActionResult, form: FormData): Promise<ActionResult> {
  const gate = await authed();
  if ('error' in gate) return { ok: false, error: gate.error };
  const { supabase, ctx } = gate;

  if (!isExecutive(ctx)) return { ok: false, error: 'Only executives can manage member roles.' };

  const parsed = updateMemberRoleSchema.safeParse({ profileId: form.get('profileId'), role: form.get('role') });
  if (!parsed.success) return { ok: false, error: firstIssue(parsed.error) };

  if (parsed.data.profileId === ctx.user.id) return { ok: false, error: 'You cannot change your own role.' };

  const { error } = await supabase
    .from('organization_memberships')
    .update({ role: parsed.data.role, internal_role: parsed.data.role })
    .eq('organization_id', ctx.organizationId)
    .eq('profile_id', parsed.data.profileId);
  if (error) {
    const msg = /last active founder/i.test(error.message) ? 'The organization must keep at least one active founder.' : 'Could not update the member (check your access).';
    return { ok: false, error: msg };
  }

  await record(supabase, ctx, 'member.role_changed', 'organization_memberships', parsed.data.profileId, `Role set to ${parsed.data.role}`);
  revalidatePath('/team');
  return { ok: true };
}

export async function setMemberSuspended(_prev: ActionResult, form: FormData): Promise<ActionResult> {
  const gate = await authed();
  if ('error' in gate) return { ok: false, error: gate.error };
  const { supabase, ctx } = gate;

  if (!isExecutive(ctx)) return { ok: false, error: 'Only executives can suspend or reactivate members.' };

  const parsed = setMemberSuspendedSchema.safeParse({ profileId: form.get('profileId'), suspended: form.get('suspended') });
  if (!parsed.success) return { ok: false, error: firstIssue(parsed.error) };

  if (parsed.data.profileId === ctx.user.id) return { ok: false, error: 'You cannot suspend yourself.' };

  const { error } = await supabase
    .from('organization_memberships')
    .update({ suspended_at: parsed.data.suspended ? new Date().toISOString() : null })
    .eq('organization_id', ctx.organizationId)
    .eq('profile_id', parsed.data.profileId);
  if (error) {
    const msg = /last active founder/i.test(error.message) ? 'The organization must keep at least one active founder.' : 'Could not update the member (check your access).';
    return { ok: false, error: msg };
  }

  await record(supabase, ctx, parsed.data.suspended ? 'member.suspended' : 'member.reactivated', 'organization_memberships', parsed.data.profileId, parsed.data.suspended ? 'Member suspended' : 'Member reactivated');
  revalidatePath('/team');
  return { ok: true };
}

export async function createContact(_prev: ActionResult, form: FormData): Promise<ActionResult> {
  const gate = await authed();
  if ('error' in gate) return { ok: false, error: gate.error };
  const { supabase, ctx } = gate;

  const parsed = createContactSchema.safeParse({
    clientId: form.get('clientId'),
    name: form.get('name'),
    email: form.get('email') ?? undefined,
    phone: form.get('phone') ?? undefined
  });
  if (!parsed.success) return { ok: false, error: firstIssue(parsed.error) };

  const { error, data } = await supabase
    .from('contacts')
    .insert({
      organization_id: ctx.organizationId,
      client_id: parsed.data.clientId,
      name: parsed.data.name,
      email: parsed.data.email || null,
      phone: parsed.data.phone || null
    })
    .select('id')
    .single();
  if (error) return { ok: false, error: 'Could not add the contact.' };

  await record(supabase, ctx, 'contact.created', 'contacts', data.id, `Contact: ${parsed.data.name}`);
  revalidatePath('/clients');
  return { ok: true };
}

export async function addClientNote(_prev: ActionResult, form: FormData): Promise<ActionResult> {
  const gate = await authed();
  if ('error' in gate) return { ok: false, error: gate.error };
  const { supabase, ctx } = gate;

  const parsed = addClientNoteSchema.safeParse({ clientId: form.get('clientId'), body: form.get('body') });
  if (!parsed.success) return { ok: false, error: firstIssue(parsed.error) };

  const { error, data } = await supabase
    .from('client_internal_notes')
    .insert({
      organization_id: ctx.organizationId,
      client_organization_id: parsed.data.clientId,
      body: parsed.data.body,
      created_by: ctx.user.id
    })
    .select('id')
    .single();
  if (error) return { ok: false, error: 'Could not add the note.' };

  // Internal notes are excluded from company/client-facing activity by design.
  await record(supabase, ctx, 'client.note_added', 'client_internal_notes', data.id, 'Internal note added');
  revalidatePath('/clients');
  return { ok: true };
}

export async function createProduct(_prev: ActionResult, form: FormData): Promise<ActionResult> {
  const gate = await authed();
  if ('error' in gate) return { ok: false, error: gate.error };
  const { supabase, ctx } = gate;

  const parsed = createProductSchema.safeParse({
    name: form.get('name'),
    description: form.get('description') ?? undefined,
    priceMinor: form.get('priceMinor') || undefined,
    category: form.get('category') ?? undefined
  });
  if (!parsed.success) return { ok: false, error: firstIssue(parsed.error) };

  const { error, data } = await supabase
    .from('products')
    .insert({
      organization_id: ctx.organizationId,
      name: parsed.data.name,
      description: parsed.data.description || null,
      price_minor: parsed.data.priceMinor ?? null,
      category: parsed.data.category || null,
      created_by: ctx.user.id
    })
    .select('id')
    .single();
  if (error) return { ok: false, error: 'Could not create the product.' };

  await record(supabase, ctx, 'product.created', 'products', data.id, `Product: ${parsed.data.name}`);
  revalidatePath('/products');
  return { ok: true };
}

export async function toggleProductActive(_prev: ActionResult, form: FormData): Promise<ActionResult> {
  const gate = await authed();
  if ('error' in gate) return { ok: false, error: gate.error };
  const { supabase, ctx } = gate;

  const parsed = toggleProductActiveSchema.safeParse({ id: form.get('id'), active: form.get('active') });
  if (!parsed.success) return { ok: false, error: firstIssue(parsed.error) };

  const { error } = await supabase.from('products').update({ active: parsed.data.active }).eq('id', parsed.data.id);
  if (error) return { ok: false, error: 'Could not update the product (check your access).' };

  await record(supabase, ctx, 'product.toggled', 'products', parsed.data.id, parsed.data.active ? 'Activated' : 'Archived');
  revalidatePath('/products');
  return { ok: true };
}

export async function createCampaign(_prev: ActionResult, form: FormData): Promise<ActionResult> {
  const gate = await authed();
  if ('error' in gate) return { ok: false, error: gate.error };
  const { supabase, ctx } = gate;

  const parsed = createCampaignSchema.safeParse({
    name: form.get('name'),
    objective: form.get('objective') ?? undefined,
    channel: form.get('channel') ?? undefined
  });
  if (!parsed.success) return { ok: false, error: firstIssue(parsed.error) };

  const { error, data } = await supabase
    .from('campaigns')
    .insert({
      organization_id: ctx.organizationId,
      name: parsed.data.name,
      objective: parsed.data.objective || null,
      channel: parsed.data.channel || null,
      created_by: ctx.user.id
    })
    .select('id')
    .single();
  if (error) return { ok: false, error: 'Could not create the campaign.' };

  await record(supabase, ctx, 'campaign.created', 'campaigns', data.id, `Campaign: ${parsed.data.name}`);
  revalidatePath('/content');
  return { ok: true };
}

export async function createContentItem(_prev: ActionResult, form: FormData): Promise<ActionResult> {
  const gate = await authed();
  if ('error' in gate) return { ok: false, error: gate.error };
  const { supabase, ctx } = gate;

  const parsed = createContentItemSchema.safeParse({
    campaignId: form.get('campaignId') || undefined,
    title: form.get('title'),
    channel: form.get('channel'),
    publishDate: form.get('publishDate') ?? undefined
  });
  if (!parsed.success) return { ok: false, error: firstIssue(parsed.error) };

  const { error, data } = await supabase
    .from('content_items')
    .insert({
      organization_id: ctx.organizationId,
      campaign_id: parsed.data.campaignId ?? null,
      title: parsed.data.title,
      channel: parsed.data.channel,
      publish_date: parsed.data.publishDate || null,
      created_by: ctx.user.id
    })
    .select('id')
    .single();
  if (error) return { ok: false, error: 'Could not create the content item.' };

  await record(supabase, ctx, 'content.created', 'content_items', data.id, `Content: ${parsed.data.title}`);
  revalidatePath('/content');
  return { ok: true };
}

export async function updateContentStatus(_prev: ActionResult, form: FormData): Promise<ActionResult> {
  const gate = await authed();
  if ('error' in gate) return { ok: false, error: gate.error };
  const { supabase, ctx } = gate;

  const parsed = updateContentStatusSchema.safeParse({ id: form.get('id'), status: form.get('status') });
  if (!parsed.success) return { ok: false, error: firstIssue(parsed.error) };

  const { error } = await supabase.from('content_items').update({ status: parsed.data.status }).eq('id', parsed.data.id);
  if (error) return { ok: false, error: 'Could not update the content item (check your access).' };

  await record(supabase, ctx, 'content.status_changed', 'content_items', parsed.data.id, `Content moved to ${parsed.data.status}`);
  revalidatePath('/content');
  return { ok: true };
}

/* --------------------------------------------------------------- Phase C5 -- */

export async function createDocumentRecord(_prev: ActionResult, form: FormData): Promise<ActionResult> {
  const gate = await authed();
  if ('error' in gate) return { ok: false, error: gate.error };
  const { supabase, ctx } = gate;

  const parsed = createDocumentSchema.safeParse({
    title: form.get('title'),
    storagePath: form.get('storagePath'),
    classification: form.get('classification') || undefined
  });
  if (!parsed.success) return { ok: false, error: firstIssue(parsed.error) };

  const { error, data } = await supabase
    .from('documents')
    .insert({
      organization_id: ctx.organizationId,
      title: parsed.data.title,
      storage_path: parsed.data.storagePath,
      classification: parsed.data.classification
    })
    .select('id')
    .single();
  if (error) return { ok: false, error: 'Could not add the document.' };

  await record(supabase, ctx, 'document.created', 'documents', data.id, `Document: ${parsed.data.title}`);
  revalidatePath('/knowledge');
  return { ok: true };
}

export async function updateDocumentClassification(_prev: ActionResult, form: FormData): Promise<ActionResult> {
  const gate = await authed();
  if ('error' in gate) return { ok: false, error: gate.error };
  const { supabase, ctx } = gate;

  if (!isExecutive(ctx)) return { ok: false, error: 'Only executives can reclassify documents.' };

  const parsed = updateDocumentClassificationSchema.safeParse({ id: form.get('id'), classification: form.get('classification') });
  if (!parsed.success) return { ok: false, error: firstIssue(parsed.error) };

  const { error } = await supabase.from('documents').update({ classification: parsed.data.classification }).eq('id', parsed.data.id);
  if (error) return { ok: false, error: 'Could not update the document.' };

  await record(supabase, ctx, 'document.reclassified', 'documents', parsed.data.id, `Classification set to ${parsed.data.classification}`);
  revalidatePath('/knowledge');
  return { ok: true };
}

export async function createConnection(_prev: ActionResult, form: FormData): Promise<ActionResult> {
  const gate = await authed();
  if ('error' in gate) return { ok: false, error: gate.error };
  const { supabase, ctx } = gate;

  if (!isExecutive(ctx)) return { ok: false, error: 'Only executives can manage connections.' };

  const parsed = createConnectionSchema.safeParse({ provider: form.get('provider'), scopes: form.get('scopes') ?? undefined });
  if (!parsed.success) return { ok: false, error: firstIssue(parsed.error) };

  const scopes = parsed.data.scopes
    ? parsed.data.scopes.split(',').map((s) => s.trim()).filter(Boolean)
    : [];
  const { error, data } = await supabase
    .from('integration_connections')
    .insert({ organization_id: ctx.organizationId, provider: parsed.data.provider, scopes })
    .select('id')
    .single();
  if (error) {
    if (error.message.includes('duplicate key') || error.message.includes('unique')) {
      return { ok: false, error: 'A connection for this provider already exists.' };
    }
    return { ok: false, error: 'Could not create the connection.' };
  }

  await record(supabase, ctx, 'connection.created', 'integration_connections', data.id, `Connection: ${parsed.data.provider}`);
  revalidatePath('/connections');
  return { ok: true };
}

export async function revokeConnection(_prev: ActionResult, form: FormData): Promise<ActionResult> {
  const gate = await authed();
  if ('error' in gate) return { ok: false, error: gate.error };
  const { supabase, ctx } = gate;

  if (!isExecutive(ctx)) return { ok: false, error: 'Only executives can manage connections.' };

  const parsed = revokeConnectionSchema.safeParse({ id: form.get('id') });
  if (!parsed.success) return { ok: false, error: firstIssue(parsed.error) };

  const { error } = await supabase.from('integration_connections').update({ status: 'archived' }).eq('id', parsed.data.id);
  if (error) return { ok: false, error: 'Could not revoke the connection.' };

  await record(supabase, ctx, 'connection.revoked', 'integration_connections', parsed.data.id, 'Connection revoked');
  revalidatePath('/connections');
  return { ok: true };
}

export async function updateTaskLink(_prev: ActionResult, form: FormData): Promise<ActionResult> {
  const gate = await authed();
  if ('error' in gate) return { ok: false, error: gate.error };
  const { supabase, ctx } = gate;

  const parsed = updateTaskLinkSchema.safeParse({ id: form.get('id'), link: form.get('link') ?? undefined });
  if (!parsed.success) return { ok: false, error: firstIssue(parsed.error) };

  const { error } = await supabase.from('tasks').update({ link: parsed.data.link || null }).eq('id', parsed.data.id);
  if (error) return { ok: false, error: 'Could not update the link (check your access).' };

  await record(supabase, ctx, 'task.link_updated', 'tasks', parsed.data.id, 'Link updated');
  revalidatePath('/software');
  revalidatePath('/workspace');
  return { ok: true };
}

/* --------------------------------------------------------------- Phase C6 -- */

export async function markNotificationRead(_prev: ActionResult, form: FormData): Promise<ActionResult> {
  const gate = await authed();
  if ('error' in gate) return { ok: false, error: gate.error };
  const { supabase } = gate;

  const parsed = markNotificationReadSchema.safeParse({ id: form.get('id') });
  if (!parsed.success) return { ok: false, error: firstIssue(parsed.error) };

  const { error } = await supabase.from('notifications').update({ read_at: new Date().toISOString() }).eq('id', parsed.data.id);
  if (error) return { ok: false, error: 'Could not update the notification.' };

  revalidatePath('/pulse');
  return { ok: true };
}

/** Which page to revalidate after posting a comment, per object_table — extend as CommentThread rolls out further. */
const COMMENT_REVALIDATE_PATH: Record<string, string> = {
  commitments: '/commitments',
  tasks: '/workspace',
  projects: '/missions',
  approval_requests: '/decisions',
  client_organizations: '/clients'
};

export async function postComment(_prev: ActionResult, form: FormData): Promise<ActionResult> {
  const gate = await authed();
  if ('error' in gate) return { ok: false, error: gate.error };
  const { supabase, ctx } = gate;

  const parsed = postCommentSchema.safeParse({
    objectTable: form.get('objectTable'),
    objectId: form.get('objectId'),
    body: form.get('body')
  });
  if (!parsed.success) return { ok: false, error: firstIssue(parsed.error) };

  const { data: profiles } = await supabase.from('profiles').select('id, display_name');
  const mentions = resolveMentions(parsed.data.body, (profiles ?? []) as MentionProfile[], ctx.user.id);

  const { error } = await supabase.from('comments').insert({
    organization_id: ctx.organizationId,
    object_table: parsed.data.objectTable,
    object_id: parsed.data.objectId,
    author_id: ctx.user.id,
    body: parsed.data.body,
    mentions
  });
  if (error) return { ok: false, error: 'Could not post the comment.' };

  const link = COMMENT_REVALIDATE_PATH[parsed.data.objectTable];
  for (const recipientId of mentions) {
    await notify(supabase, ctx, recipientId, 'comment.mention', parsed.data.objectTable, parsed.data.objectId, `${ctx.user.displayName} mentioned you in a comment`, link);
  }

  revalidatePath(link ?? '/pulse');
  return { ok: true };
}

/** Called directly from the command palette client component (not a form action). */
export async function runSearch(query: string): Promise<SearchResult[]> {
  const gate = await authed();
  if ('error' in gate) return [];
  return searchAll(gate.supabase, query);
}
