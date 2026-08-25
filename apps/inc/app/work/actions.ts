'use server';

import { revalidatePath } from 'next/cache';
import { getAuthContext, isKspIncOwner, type AuthContext } from '@ksp/auth';
import type { SupabaseClient } from '@ksp/database';
import { getServerSupabase } from '../../lib/supabase';
import { resolveMentions, type MentionProfile } from '../../lib/mentions';

export interface IncWorkActionResult {
  ok: boolean;
  error?: string;
  warning?: string;
}

function uuid(value: FormDataEntryValue | null): string | null {
  const text = String(value ?? '').trim();
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(text) ? text : null;
}

async function ownerWorkGate(): Promise<{ supabase: SupabaseClient; ctx: AuthContext } | { error: string }> {
  const supabase = await getServerSupabase();
  if (!supabase) return { error: 'KSP INC is not configured.' };
  const ctx = await getAuthContext(supabase);
  if (!ctx || !isKspIncOwner(ctx)) return { error: 'KSP INC owner access is required.' };
  if (!ctx.mfa) return { error: 'Step-up MFA is required for assignment or mention changes.' };
  return { supabase, ctx };
}

async function activeInternalProfile(
  supabase: SupabaseClient,
  organizationId: string,
  profileId: string
): Promise<{ id: string; display_name: string } | null> {
  const now = new Date().toISOString();
  const { data: membership } = await supabase
    .from('organization_memberships')
    .select('profile_id')
    .eq('organization_id', organizationId)
    .eq('profile_id', profileId)
    .not('internal_role', 'is', null)
    .is('suspended_at', null)
    .lte('effective_from', now)
    .or(`effective_until.is.null,effective_until.gt.${now}`)
    .limit(1)
    .maybeSingle();
  if (!membership) return null;

  const { data: profile } = await supabase
    .from('profiles')
    .select('id,display_name')
    .eq('id', profileId)
    .eq('status', 'active')
    .maybeSingle();
  return profile as { id: string; display_name: string } | null;
}

async function recordWorkEvent(
  supabase: SupabaseClient,
  ctx: AuthContext,
  verb: string,
  objectTable: string,
  objectId: string,
  summary: string
) {
  await Promise.all([
    supabase.from('activity_events').insert({
      organization_id: ctx.organizationId,
      actor_id: ctx.user.id,
      verb,
      object_table: objectTable,
      object_id: objectId,
      summary
    }),
    supabase.from('audit_events').insert({
      organization_id: ctx.organizationId,
      actor_id: ctx.user.id,
      action: verb,
      target_table: objectTable,
      target_id: objectId,
      classification: 'internal',
      metadata: { summary, surface: 'inc' }
    })
  ]);
}

async function notifyCommandUser(
  supabase: SupabaseClient,
  ctx: AuthContext,
  recipientId: string,
  verb: string,
  taskId: string,
  summary: string
) {
  if (recipientId === ctx.user.id) return;
  await supabase.from('notifications').insert({
    organization_id: ctx.organizationId,
    recipient_id: recipientId,
    actor_id: ctx.user.id,
    verb,
    object_table: 'tasks',
    object_id: taskId,
    summary,
    link: '/workspace'
  });
}

export async function createIncTask(
  _prev: IncWorkActionResult,
  form: FormData
): Promise<IncWorkActionResult> {
  const gate = await ownerWorkGate();
  if ('error' in gate) return { ok: false, error: gate.error };
  const { supabase, ctx } = gate;

  const projectId = uuid(form.get('projectId'));
  const ownerId = uuid(form.get('ownerId'));
  const title = String(form.get('title') ?? '').trim();
  const dueDate = String(form.get('dueDate') ?? '').trim();
  const requiresDelivery = String(form.get('requiresDelivery') ?? '') === 'true' || form.get('requiresDelivery') === 'on';
  if (!projectId || !ownerId || title.length < 2 || title.length > 240) {
    return { ok: false, error: 'Choose a project, assignee and a task title between 2 and 240 characters.' };
  }
  if (dueDate && !/^\d{4}-\d{2}-\d{2}$/.test(dueDate)) return { ok: false, error: 'Due date is invalid.' };

  const [assignee, projectResult] = await Promise.all([
    activeInternalProfile(supabase, ctx.organizationId, ownerId),
    supabase
      .from('projects')
      .select('id,name,business_unit_id')
      .eq('id', projectId)
      .eq('organization_id', ctx.organizationId)
      .neq('status', 'archived')
      .maybeSingle()
  ]);
  if (!assignee || !projectResult.data) return { ok: false, error: 'The assignee or project is not active.' };

  const { data: task, error } = await supabase
    .from('tasks')
    .insert({
      organization_id: ctx.organizationId,
      project_id: projectId,
      owner_id: ownerId,
      title,
      due_date: dueDate || null,
      created_by: ctx.user.id,
      requires_delivery: requiresDelivery
    })
    .select('id')
    .single();
  if (error || !task) return { ok: false, error: 'Could not create the task.' };

  await recordWorkEvent(supabase, ctx, 'task.created', 'tasks', task.id, `INC created and assigned: ${title} → ${assignee.display_name}`);
  await notifyCommandUser(supabase, ctx, ownerId, 'task.assigned', task.id, `You were assigned: ${title}`);
  revalidatePath('/work');
  return { ok: true };
}

export async function reassignIncTask(
  _prev: IncWorkActionResult,
  form: FormData
): Promise<IncWorkActionResult> {
  const gate = await ownerWorkGate();
  if ('error' in gate) return { ok: false, error: gate.error };
  const { supabase, ctx } = gate;

  const taskId = uuid(form.get('taskId'));
  const ownerId = uuid(form.get('ownerId'));
  if (!taskId || !ownerId) return { ok: false, error: 'Choose a valid task and assignee.' };

  const assignee = await activeInternalProfile(supabase, ctx.organizationId, ownerId);
  if (!assignee) return { ok: false, error: 'The assignee is not an active internal KSP member.' };

  const { data: task, error } = await supabase
    .from('tasks')
    .update({ owner_id: ownerId })
    .eq('id', taskId)
    .eq('organization_id', ctx.organizationId)
    .select('id,title')
    .single();
  if (error || !task) return { ok: false, error: 'Could not reassign the task.' };

  await recordWorkEvent(supabase, ctx, 'task.reassigned', 'tasks', task.id, `INC reassigned ${task.title} → ${assignee.display_name}`);
  await notifyCommandUser(supabase, ctx, ownerId, 'task.assigned', task.id, `You were assigned: ${task.title}`);
  revalidatePath('/work');
  return { ok: true };
}

export async function commentOnIncTask(
  _prev: IncWorkActionResult,
  form: FormData
): Promise<IncWorkActionResult> {
  const gate = await ownerWorkGate();
  if ('error' in gate) return { ok: false, error: gate.error };
  const { supabase, ctx } = gate;

  const taskId = uuid(form.get('taskId'));
  const body = String(form.get('body') ?? '').trim();
  if (!taskId || body.length < 1 || body.length > 5000) return { ok: false, error: 'Choose a task and write a comment up to 5,000 characters.' };

  const { data: task } = await supabase
    .from('tasks')
    .select('id,title')
    .eq('id', taskId)
    .eq('organization_id', ctx.organizationId)
    .maybeSingle();
  if (!task) return { ok: false, error: 'Task was not found.' };

  const now = new Date().toISOString();
  const { data: activeMemberships } = await supabase
    .from('organization_memberships')
    .select('profile_id')
    .eq('organization_id', ctx.organizationId)
    .not('internal_role', 'is', null)
    .is('suspended_at', null)
    .lte('effective_from', now)
    .or(`effective_until.is.null,effective_until.gt.${now}`);
  const ids = [...new Set((activeMemberships ?? []).map((row: any) => String(row.profile_id)))];
  const { data: profiles } = ids.length
    ? await supabase.from('profiles').select('id,display_name').in('id', ids).eq('status', 'active')
    : { data: [] as MentionProfile[] };
  const mentions = resolveMentions(body, (profiles ?? []) as MentionProfile[], ctx.user.id);

  if (body.includes('@') && mentions.length === 0) {
    return { ok: false, error: 'No active internal KSP user matched the @mention. Use the person’s first name or compact full name.' };
  }

  const { data: comment, error } = await supabase
    .from('comments')
    .insert({
      organization_id: ctx.organizationId,
      object_table: 'tasks',
      object_id: taskId,
      author_id: ctx.user.id,
      body,
      mentions
    })
    .select('id')
    .single();
  if (error || !comment) return { ok: false, error: 'Could not post the task comment.' };

  await recordWorkEvent(supabase, ctx, 'task.comment_added', 'comments', comment.id, `INC commented on: ${task.title}`);
  for (const recipientId of mentions) {
    await notifyCommandUser(supabase, ctx, recipientId, 'comment.mention', taskId, `${ctx.user.displayName} mentioned you in: ${task.title}`);
  }

  revalidatePath('/work');
  return {
    ok: true,
    warning: mentions.length > 0 ? `${mentions.length} resource-scoped mention${mentions.length === 1 ? '' : 's'} created.` : undefined
  };
}
