'use server';

import { revalidatePath } from 'next/cache';
import { getAuthContext, type AuthContext } from '@ksp/auth';
import type { SupabaseClient } from '@ksp/database';
import { canPerform } from '@ksp/permissions';
import { getServerSupabase } from '../../lib/supabase';

export interface BacklogActionResult {
  ok: boolean;
  error?: string;
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

async function authed(): Promise<{ supabase: SupabaseClient; ctx: AuthContext } | { error: string }> {
  const supabase = await getServerSupabase();
  if (!supabase) return { error: 'not_configured' };
  const ctx = await getAuthContext(supabase);
  if (!ctx) return { error: 'unauthenticated' };
  return { supabase, ctx };
}

function canManage(ctx: AuthContext): boolean {
  return canPerform(ctx.membership, 'project.manage', {
    organizationId: ctx.organizationId,
    classification: 'internal'
  }).allowed;
}

function text(form: FormData, key: string): string {
  return String(form.get(key) ?? '').trim();
}

function dateOrNull(value: string): string | null | undefined {
  if (!value) return null;
  return DATE_RE.test(value) ? value : undefined;
}

async function record(
  supabase: SupabaseClient,
  ctx: AuthContext,
  verb: string,
  objectTable: string,
  objectId: string,
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
 * Edit the mutable task details that belong to Workspace. Owner changes keep
 * using the existing reassignment control so there is one accountability path.
 * `start_date` is intentionally included: this action must not be promoted to a
 * runtime that has not applied the reviewed runtime-reconciliation migration.
 */
export async function updateTaskDetails(_prev: BacklogActionResult, form: FormData): Promise<BacklogActionResult> {
  const gate = await authed();
  if ('error' in gate) return { ok: false, error: gate.error };
  const { supabase, ctx } = gate;
  if (!canManage(ctx)) return { ok: false, error: 'You are not permitted to edit tasks.' };

  const id = text(form, 'id');
  const title = text(form, 'title');
  const startDate = dateOrNull(text(form, 'startDate'));
  const dueDate = dateOrNull(text(form, 'dueDate'));
  const link = text(form, 'link');

  if (!UUID_RE.test(id)) return { ok: false, error: 'Invalid task id.' };
  if (title.length < 2 || title.length > 200) return { ok: false, error: 'Task title must be 2–200 characters.' };
  if (startDate === undefined || dueDate === undefined) return { ok: false, error: 'Use valid YYYY-MM-DD dates.' };
  if (startDate && dueDate && startDate > dueDate) return { ok: false, error: 'Start date cannot be after due date.' };
  if (link.length > 2000) return { ok: false, error: 'Link is too long.' };

  const { error } = await supabase
    .from('tasks')
    .update({
      title,
      start_date: startDate,
      due_date: dueDate,
      link: link || null
    })
    .eq('id', id)
    .eq('organization_id', ctx.organizationId);

  if (error) {
    if (error.message.includes('start_date')) {
      return { ok: false, error: 'Task editing needs the reviewed runtime-reconciliation migration before this build can be promoted.' };
    }
    return { ok: false, error: 'Could not update task details (check your access).' };
  }

  await record(supabase, ctx, 'task.updated', 'tasks', id, `Updated task details: ${title}`);
  revalidatePath('/workspace');
  revalidatePath('/schedule');
  revalidatePath('/horizon');
  return { ok: true };
}

/**
 * Edit a commitment's promise, owner and dates. Reassignment is kept in sync
 * with the accountable assignment row; if that second write fails, the owner
 * field is rolled back to avoid two conflicting accountability sources.
 */
export async function updateCommitmentDetails(_prev: BacklogActionResult, form: FormData): Promise<BacklogActionResult> {
  const gate = await authed();
  if ('error' in gate) return { ok: false, error: gate.error };
  const { supabase, ctx } = gate;
  if (!canManage(ctx)) return { ok: false, error: 'You are not permitted to edit commitments.' };

  const id = text(form, 'id');
  const title = text(form, 'title');
  const outcomeStatement = text(form, 'outcomeStatement');
  const context = text(form, 'context');
  const outcomeId = text(form, 'outcomeId');
  const ownerId = text(form, 'ownerId');
  const dueDate = dateOrNull(text(form, 'dueDate'));
  const nextActionDate = dateOrNull(text(form, 'nextActionDate'));
  const requiresProof = form.get('requiresProof') === 'on';

  if (!UUID_RE.test(id)) return { ok: false, error: 'Invalid commitment id.' };
  if (!UUID_RE.test(ownerId)) return { ok: false, error: 'Choose a valid owner.' };
  if (outcomeId && !UUID_RE.test(outcomeId)) return { ok: false, error: 'Choose a valid outcome.' };
  if (title.length < 3 || title.length > 160) return { ok: false, error: 'Commitment title must be 3–160 characters.' };
  if (outcomeStatement.length < 3 || outcomeStatement.length > 500) return { ok: false, error: 'Outcome statement must be 3–500 characters.' };
  if (context.length > 2000) return { ok: false, error: 'Context is too long.' };
  if (dueDate === undefined || nextActionDate === undefined) return { ok: false, error: 'Use valid YYYY-MM-DD dates.' };
  if (!dueDate && !nextActionDate) return { ok: false, error: 'A commitment needs a due date or an explicit next-action date.' };

  const { data: current, error: currentError } = await supabase
    .from('commitments')
    .select('owner_id')
    .eq('id', id)
    .eq('organization_id', ctx.organizationId)
    .maybeSingle();
  if (currentError || !current) return { ok: false, error: 'Commitment not found or inaccessible.' };

  const previousOwnerId = String(current.owner_id);
  const { error } = await supabase
    .from('commitments')
    .update({
      title,
      outcome_statement: outcomeStatement,
      context: context || null,
      outcome_id: outcomeId || null,
      owner_id: ownerId,
      due_date: dueDate,
      next_action_date: nextActionDate,
      requires_proof: requiresProof,
      updated_at: new Date().toISOString()
    })
    .eq('id', id)
    .eq('organization_id', ctx.organizationId);
  if (error) return { ok: false, error: 'Could not update commitment details (check your access).' };

  if (ownerId !== previousOwnerId) {
    const { data: accountable } = await supabase
      .from('commitment_assignments')
      .select('id')
      .eq('commitment_id', id)
      .eq('role', 'accountable')
      .maybeSingle();

    const assignmentResult = accountable
      ? await supabase.from('commitment_assignments').update({ profile_id: ownerId, assigned_by: ctx.user.id }).eq('id', accountable.id)
      : await supabase.from('commitment_assignments').insert({
          organization_id: ctx.organizationId,
          commitment_id: id,
          profile_id: ownerId,
          role: 'accountable',
          assigned_by: ctx.user.id
        });

    if (assignmentResult.error) {
      await supabase.from('commitments').update({ owner_id: previousOwnerId }).eq('id', id).eq('organization_id', ctx.organizationId);
      return { ok: false, error: 'Could not reassign the commitment; the owner change was rolled back.' };
    }
  }

  await record(supabase, ctx, 'commitment.updated', 'commitments', id, `Updated commitment details: ${title}`);
  revalidatePath('/commitments');
  revalidatePath('/focus');
  revalidatePath('/pulse');
  return { ok: true };
}
