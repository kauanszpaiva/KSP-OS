'use server';

import { revalidatePath } from 'next/cache';
import { getAuthContext, isKspIncOwner } from '@ksp/auth';
import type { SupabaseClient } from '@ksp/database';
import { canDelegate, type PermissionAction } from '@ksp/permissions';
import { buildInternalSubjectContext } from '../../lib/authority-subject-context';
import { getServerSupabase } from '../../lib/supabase';

export interface DelegationActionResult {
  ok: boolean;
  error?: string;
}

const DELEGABLE_PROJECT_ACTIONS = new Set<PermissionAction>([
  'client.read',
  'client.update',
  'project.read',
  'project.manage',
  'project.publish',
  'work.read',
  'work.manage',
  'work.assign',
  'deliverable.read',
  'deliverable.review',
  'deliverable.approve',
  'request.triage',
  'change_order.draft',
  'document.upload',
  'document.download',
  'document.publish'
]);

function asUuid(value: FormDataEntryValue | null): string | null {
  const text = String(value ?? '').trim();
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(text)
    ? text
    : null;
}

function asAction(value: FormDataEntryValue | null): PermissionAction | null {
  const action = String(value ?? '').trim() as PermissionAction;
  return DELEGABLE_PROJECT_ACTIONS.has(action) ? action : null;
}

async function ownerGate() {
  const supabase = await getServerSupabase();
  if (!supabase) return { error: 'not_configured' } as const;
  const ctx = await getAuthContext(supabase);
  if (!ctx) return { error: 'unauthenticated' } as const;
  if (!isKspIncOwner(ctx)) return { error: 'owner_access_required' } as const;
  if (!ctx.mfa) return { error: 'Step-up MFA is required for delegation changes.' } as const;
  return { supabase, ctx } as const;
}

async function activeInternalMember(supabase: SupabaseClient, organizationId: string, profileId: string) {
  const now = new Date().toISOString();
  const { data } = await supabase
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
  return Boolean(data);
}

async function recordEvent(
  supabase: SupabaseClient,
  organizationId: string,
  actorId: string,
  action: string,
  targetId: string,
  summary: string,
  metadata: Record<string, unknown>
) {
  await Promise.all([
    supabase.from('activity_events').insert({
      organization_id: organizationId,
      actor_id: actorId,
      verb: action,
      object_table: 'delegations',
      object_id: targetId,
      summary,
      metadata
    }),
    supabase.from('audit_events').insert({
      organization_id: organizationId,
      actor_id: actorId,
      action,
      target_table: 'delegations',
      target_id: targetId,
      classification: 'internal',
      metadata: { summary, ...metadata }
    })
  ]);
}

function refresh() {
  revalidatePath('/access');
  revalidatePath('/people');
  revalidatePath('/work');
}

export async function createScopedDelegation(
  _prev: DelegationActionResult,
  form: FormData
): Promise<DelegationActionResult> {
  const gate = await ownerGate();
  if ('error' in gate) return { ok: false, error: gate.error };
  const { supabase, ctx } = gate;

  const delegatorId = asUuid(form.get('delegatorId'));
  const delegateId = asUuid(form.get('delegateId'));
  const projectId = asUuid(form.get('projectId'));
  const action = asAction(form.get('action'));
  const hours = Number(form.get('hours') ?? 24);
  if (!delegatorId || !delegateId || !projectId || !action || delegatorId === delegateId) {
    return { ok: false, error: 'Choose distinct internal identities, project and delegable action.' };
  }
  if (!Number.isFinite(hours) || hours < 1 || hours > 720) {
    return { ok: false, error: 'Delegation duration must be between 1 hour and 30 days.' };
  }
  const [delegatorActive, delegateActive, projectResult] = await Promise.all([
    activeInternalMember(supabase, ctx.organizationId, delegatorId),
    activeInternalMember(supabase, ctx.organizationId, delegateId),
    supabase
      .from('projects')
      .select('id')
      .eq('organization_id', ctx.organizationId)
      .eq('id', projectId)
      .neq('status', 'archived')
      .maybeSingle()
  ]);
  if (!delegatorActive || !delegateActive || !projectResult.data) {
    return { ok: false, error: 'Delegation subjects and project must be active in this organization.' };
  }

  const delegatorContext = await buildInternalSubjectContext(supabase, ctx.organizationId, delegatorId);
  if (!delegatorContext) return { ok: false, error: 'Could not resolve delegator authority.' };

  const decision = canDelegate(delegatorContext, action, {
    organizationId: ctx.organizationId,
    projectId,
    resourceType: 'project',
    id: projectId,
    classification: 'internal'
  });
  if (!decision.allowed) {
    return { ok: false, error: `Delegation ceiling denied: ${decision.reason}.` };
  }

  const now = new Date();
  const effectiveUntil = new Date(now.getTime() + hours * 60 * 60 * 1000);
  const { data, error } = await supabase
    .from('delegations')
    .insert({
      organization_id: ctx.organizationId,
      delegator_id: delegatorId,
      delegate_id: delegateId,
      action,
      resource_type: 'project',
      resource_id: projectId,
      effective_from: now.toISOString(),
      effective_until: effectiveUntil.toISOString(),
      granted_by: ctx.user.id
    })
    .select('id')
    .single();
  if (error || !data) return { ok: false, error: 'Could not create the scoped delegation.' };

  await recordEvent(
    supabase,
    ctx.organizationId,
    ctx.user.id,
    'access.delegation.created',
    data.id,
    `Delegated ${action} from ${delegatorId} to ${delegateId} on project ${projectId}`,
    { delegatorId, delegateId, projectId, action, effectiveUntil: effectiveUntil.toISOString(), decisionTrace: decision.trace }
  );
  refresh();
  return { ok: true };
}

export async function revokeScopedDelegation(
  _prev: DelegationActionResult,
  form: FormData
): Promise<DelegationActionResult> {
  const gate = await ownerGate();
  if ('error' in gate) return { ok: false, error: gate.error };
  const { supabase, ctx } = gate;
  const delegationId = asUuid(form.get('delegationId'));
  if (!delegationId) return { ok: false, error: 'Invalid delegation record.' };

  const { data: delegation } = await supabase
    .from('delegations')
    .select('id,delegator_id,delegate_id,action,resource_id')
    .eq('organization_id', ctx.organizationId)
    .eq('id', delegationId)
    .is('revoked_at', null)
    .maybeSingle();
  if (!delegation) return { ok: false, error: 'Delegation is no longer active.' };

  const revokedAt = new Date().toISOString();
  const { error } = await supabase
    .from('delegations')
    .update({ revoked_at: revokedAt })
    .eq('organization_id', ctx.organizationId)
    .eq('id', delegationId)
    .is('revoked_at', null);
  if (error) return { ok: false, error: 'Could not revoke delegation.' };

  await recordEvent(
    supabase,
    ctx.organizationId,
    ctx.user.id,
    'access.delegation.revoked',
    delegationId,
    `Revoked ${delegation.action} delegation from ${delegation.delegator_id} to ${delegation.delegate_id}`,
    { projectId: delegation.resource_id, revokedAt }
  );
  refresh();
  return { ok: true };
}
