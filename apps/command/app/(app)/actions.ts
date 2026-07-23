'use server';

import { revalidatePath } from 'next/cache';
import { getAuthContext, canManageOutcomes, isExecutive, type AuthContext } from '@ksp/auth';
import type { SupabaseClient } from '@ksp/database';
import { canPerform } from '@ksp/permissions';
import {
  addCommentSchema,
  createCommitmentSchema,
  createOutcomeSchema,
  decideCompletionSchema,
  deleteCommentSchema,
  removeAssigneeSchema,
  setAssigneeSchema,
  submitProofSchema,
  updateCommitmentFieldSchema,
  updateCommitmentStateSchema,
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

// --- Workspace multi-view actions ------------------------------------------

function revalidateWork() {
  revalidatePath('/workspace');
  revalidatePath('/commitments');
  revalidatePath('/focus');
  revalidatePath('/pulse');
}

/** Board drag-and-drop between working columns. proof_submitted/completed are
 * intentionally unreachable here — those transitions run through proof/decision. */
export async function updateCommitmentState(_prev: ActionResult, form: FormData): Promise<ActionResult> {
  const gate = await authed();
  if ('error' in gate) return { ok: false, error: gate.error };
  const { supabase, ctx } = gate;

  const parsed = updateCommitmentStateSchema.safeParse({
    commitmentId: form.get('commitmentId'),
    state: form.get('state')
  });
  if (!parsed.success) return { ok: false, error: firstIssue(parsed.error) };

  const { error } = await supabase.from('commitments').update({ state: parsed.data.state }).eq('id', parsed.data.commitmentId);
  if (error) return { ok: false, error: 'Could not move commitment (check your access).' };

  await record(supabase, ctx, 'commitment.state_changed', 'commitments', parsed.data.commitmentId, `Moved to ${parsed.data.state.replace(/_/g, ' ')}`);
  revalidateWork();
  return { ok: true };
}

/** Inline spreadsheet field edit with optimistic-concurrency guard. */
export async function updateCommitmentField(_prev: ActionResult, form: FormData): Promise<ActionResult> {
  const gate = await authed();
  if ('error' in gate) return { ok: false, error: gate.error };
  const { supabase, ctx } = gate;

  const parsed = updateCommitmentFieldSchema.safeParse({
    field: form.get('field'),
    commitmentId: form.get('commitmentId'),
    expectedUpdatedAt: form.get('expectedUpdatedAt') || undefined,
    value: form.get('value')
  });
  if (!parsed.success) return { ok: false, error: firstIssue(parsed.error) };

  const columnByField: Record<string, string> = {
    title: 'title',
    outcomeStatement: 'outcome_statement',
    progress: 'progress',
    state: 'state',
    dueDate: 'due_date',
    nextActionDate: 'next_action_date',
    outcomeId: 'outcome_id'
  };
  const column = columnByField[parsed.data.field];
  const raw = parsed.data.value;
  const value = raw === '' ? null : raw;

  let query = supabase.from('commitments').update({ [column]: value }).eq('id', parsed.data.commitmentId);
  // Optimistic concurrency: if the row changed since the client last read it,
  // the equality on updated_at matches nothing and we surface a stale conflict.
  if (parsed.data.expectedUpdatedAt) query = query.eq('updated_at', parsed.data.expectedUpdatedAt);
  const { data, error } = await query.select('id');
  if (error) {
    if (error.message.includes('commitments_active_needs_date')) {
      return { ok: false, error: 'An active commitment needs a due date or next-action date.' };
    }
    return { ok: false, error: 'Could not save (check your access).' };
  }
  if (parsed.data.expectedUpdatedAt && (!data || data.length === 0)) {
    return { ok: false, error: 'This row changed since you loaded it. Refresh to see the latest.' };
  }

  await record(supabase, ctx, 'commitment.field_updated', 'commitments', parsed.data.commitmentId, `Updated ${parsed.data.field}`);
  revalidateWork();
  return { ok: true };
}

/** Assign a person to a commitment. Executive-only (mirrors the RLS policy). */
export async function setAssignee(_prev: ActionResult, form: FormData): Promise<ActionResult> {
  const gate = await authed();
  if ('error' in gate) return { ok: false, error: gate.error };
  const { supabase, ctx } = gate;
  if (!isExecutive(ctx)) return { ok: false, error: 'Only executives can change assignees.' };

  const parsed = setAssigneeSchema.safeParse({
    commitmentId: form.get('commitmentId'),
    profileId: form.get('profileId'),
    role: form.get('role') || undefined
  });
  if (!parsed.success) return { ok: false, error: firstIssue(parsed.error) };

  const { error } = await supabase.from('commitment_assignments').upsert(
    {
      organization_id: ctx.organizationId,
      commitment_id: parsed.data.commitmentId,
      profile_id: parsed.data.profileId,
      role: parsed.data.role,
      assigned_by: ctx.user.id
    },
    { onConflict: 'commitment_id,profile_id' }
  );
  if (error) return { ok: false, error: 'Could not assign (executives only).' };

  await record(supabase, ctx, 'commitment.assignment_changed', 'commitments', parsed.data.commitmentId, 'Assignee added');
  revalidateWork();
  return { ok: true };
}

export async function removeAssignee(_prev: ActionResult, form: FormData): Promise<ActionResult> {
  const gate = await authed();
  if ('error' in gate) return { ok: false, error: gate.error };
  const { supabase, ctx } = gate;
  if (!isExecutive(ctx)) return { ok: false, error: 'Only executives can change assignees.' };

  const parsed = removeAssigneeSchema.safeParse({
    commitmentId: form.get('commitmentId'),
    profileId: form.get('profileId')
  });
  if (!parsed.success) return { ok: false, error: firstIssue(parsed.error) };

  const { error } = await supabase
    .from('commitment_assignments')
    .delete()
    .eq('commitment_id', parsed.data.commitmentId)
    .eq('profile_id', parsed.data.profileId);
  if (error) return { ok: false, error: 'Could not remove assignee (executives only).' };

  await record(supabase, ctx, 'commitment.assignment_changed', 'commitments', parsed.data.commitmentId, 'Assignee removed');
  revalidateWork();
  return { ok: true };
}

/** Post a comment to a commitment's discussion thread. */
export async function addComment(_prev: ActionResult, form: FormData): Promise<ActionResult> {
  const gate = await authed();
  if ('error' in gate) return { ok: false, error: gate.error };
  const { supabase, ctx } = gate;

  const parsed = addCommentSchema.safeParse({
    commitmentId: form.get('commitmentId'),
    body: form.get('body')
  });
  if (!parsed.success) return { ok: false, error: firstIssue(parsed.error) };

  const { error } = await supabase.from('commitment_comments').insert({
    organization_id: ctx.organizationId,
    commitment_id: parsed.data.commitmentId,
    author_id: ctx.user.id,
    body: parsed.data.body
  });
  if (error) return { ok: false, error: 'Could not post comment (check your access).' };

  await record(supabase, ctx, 'comment.added', 'commitments', parsed.data.commitmentId, 'Comment posted');
  revalidateWork();
  return { ok: true };
}

/** Soft-delete a comment. Author or executive only (enforced by RLS). */
export async function deleteComment(_prev: ActionResult, form: FormData): Promise<ActionResult> {
  const gate = await authed();
  if ('error' in gate) return { ok: false, error: gate.error };
  const { supabase, ctx } = gate;

  const parsed = deleteCommentSchema.safeParse({ commentId: form.get('commentId') });
  if (!parsed.success) return { ok: false, error: firstIssue(parsed.error) };

  const { error } = await supabase
    .from('commitment_comments')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', parsed.data.commentId);
  if (error) return { ok: false, error: 'Could not delete comment (check your access).' };

  await record(supabase, ctx, 'comment.deleted', 'commitment_comments', parsed.data.commentId, 'Comment deleted');
  revalidateWork();
  return { ok: true };
}
