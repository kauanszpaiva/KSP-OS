'use server';

import { revalidatePath } from 'next/cache';
import { getAuthContext, isKspIncOwner, type AuthContext } from '@ksp/auth';
import type { SupabaseClient } from '@ksp/database';
import { financialActions, type PermissionAction } from '@ksp/permissions';
import { getServerSupabase } from '../../lib/supabase';

export interface AuthorityActionResult {
  ok: boolean;
  error?: string;
}

const RELATIONSHIP_TYPES = new Set(['supervises', 'approver_for', 'billing_for', 'delegated_by']);
const PERMISSION_ACTIONS = new Set<PermissionAction>([
  'client.read',
  'client.update',
  'client.internal_note.read',
  'project.read',
  'project.manage',
  'project.publish',
  'work.read',
  'work.manage',
  'work.assign',
  'deliverable.read',
  'deliverable.review',
  'deliverable.approve',
  'request.submit',
  'request.triage',
  'change_order.draft',
  'change_order.internal_approve',
  'change_order.client_approve',
  'invoice.read',
  'invoice.create',
  'invoice.submit',
  'invoice.approve',
  'invoice.pay',
  'payment.status.read',
  'payment.schedule',
  'payment.mark_paid',
  'payment.refund',
  'ar.manage',
  'ap.manage',
  'payout_method.manage',
  'tax_profile.manage',
  'pricing.internal.read',
  'margin.read',
  'cash.read',
  'reconciliation.manage',
  'document.upload',
  'document.download',
  'document.publish',
  'finance.read',
  'finance.post',
  'finance.reconcile',
  'access.grant',
  'access.revoke',
  'production.deploy'
]);

function asUuid(value: FormDataEntryValue | null): string | null {
  const text = String(value ?? '').trim();
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(text)
    ? text
    : null;
}

function asAction(value: FormDataEntryValue | null): PermissionAction | null {
  const action = String(value ?? '').trim() as PermissionAction;
  return PERMISSION_ACTIONS.has(action) ? action : null;
}

async function ownerGate(): Promise<{ supabase: SupabaseClient; ctx: AuthContext } | { error: string }> {
  const supabase = await getServerSupabase();
  if (!supabase) return { error: 'not_configured' };
  const ctx = await getAuthContext(supabase);
  if (!ctx) return { error: 'unauthenticated' };
  if (!isKspIncOwner(ctx)) return { error: 'owner_access_required' };
  if (!ctx.mfa) return { error: 'Step-up MFA is required for authority changes.' };
  return { supabase, ctx };
}

async function activeInternalMember(supabase: SupabaseClient, organizationId: string, profileId: string) {
  const now = new Date().toISOString();
  const { data } = await supabase
    .from('organization_memberships')
    .select('profile_id,internal_role')
    .eq('organization_id', organizationId)
    .eq('profile_id', profileId)
    .not('internal_role', 'is', null)
    .is('suspended_at', null)
    .lte('effective_from', now)
    .or(`effective_until.is.null,effective_until.gt.${now}`)
    .limit(1)
    .maybeSingle();
  return data as { profile_id: string; internal_role: string | null } | null;
}

async function validProject(supabase: SupabaseClient, organizationId: string, projectId: string | null) {
  if (!projectId) return null;
  const { data } = await supabase
    .from('projects')
    .select('id,name')
    .eq('organization_id', organizationId)
    .eq('id', projectId)
    .neq('status', 'archived')
    .maybeSingle();
  return data as { id: string; name: string } | null;
}

async function recordAuthorityEvent(
  supabase: SupabaseClient,
  ctx: AuthContext,
  verb: string,
  objectTable: string,
  objectId: string,
  summary: string,
  metadata: Record<string, unknown> = {}
) {
  await Promise.all([
    supabase.from('activity_events').insert({
      organization_id: ctx.organizationId,
      actor_id: ctx.user.id,
      verb,
      object_table: objectTable,
      object_id: objectId,
      summary,
      metadata
    }),
    supabase.from('audit_events').insert({
      organization_id: ctx.organizationId,
      actor_id: ctx.user.id,
      action: verb,
      target_table: objectTable,
      target_id: objectId,
      classification: 'internal',
      metadata: { summary, ...metadata }
    })
  ]);
}

function refreshAuthority() {
  revalidatePath('/');
  revalidatePath('/access');
  revalidatePath('/people');
  revalidatePath('/network');
  revalidatePath('/work');
}

export async function createExplicitDeny(
  _prev: AuthorityActionResult,
  form: FormData
): Promise<AuthorityActionResult> {
  const gate = await ownerGate();
  if ('error' in gate) return { ok: false, error: gate.error };
  const { supabase, ctx } = gate;

  const profileId = asUuid(form.get('profileId'));
  const action = asAction(form.get('action'));
  const projectId = asUuid(form.get('projectId'));
  const reason = String(form.get('reason') ?? '').trim();
  const hours = Number(form.get('hours') ?? 0);
  if (!profileId || !action || reason.length < 3 || reason.length > 1000) {
    return { ok: false, error: 'Choose a member/action and provide a clear deny reason.' };
  }
  if (!Number.isFinite(hours) || hours < 0 || hours > 24 * 30) {
    return { ok: false, error: 'Deny duration must be permanent or between 1 hour and 30 days.' };
  }
  if (!(await activeInternalMember(supabase, ctx.organizationId, profileId))) {
    return { ok: false, error: 'Explicit denies require an active internal identity.' };
  }
  if (projectId && !(await validProject(supabase, ctx.organizationId, projectId))) {
    return { ok: false, error: 'Project scope was not found.' };
  }

  const now = new Date();
  const effectiveUntil = hours > 0 ? new Date(now.getTime() + hours * 60 * 60 * 1000).toISOString() : null;
  const { data, error } = await supabase
    .from('internal_permission_denies')
    .insert({
      organization_id: ctx.organizationId,
      profile_id: profileId,
      action,
      resource_type: projectId ? 'project' : null,
      resource_id: projectId,
      effective_from: now.toISOString(),
      effective_until: effectiveUntil,
      reason,
      denied_by: ctx.user.id
    })
    .select('id')
    .single();
  if (error || !data) return { ok: false, error: 'Could not create the explicit deny.' };

  await recordAuthorityEvent(
    supabase,
    ctx,
    'access.explicit_deny.created',
    'internal_permission_denies',
    data.id,
    `Denied ${action} for ${profileId}${projectId ? ` on project ${projectId}` : ' organization-wide'}`,
    { profileId, action, projectId, effectiveUntil, reason }
  );
  refreshAuthority();
  return { ok: true };
}

export async function revokeExplicitDeny(
  _prev: AuthorityActionResult,
  form: FormData
): Promise<AuthorityActionResult> {
  const gate = await ownerGate();
  if ('error' in gate) return { ok: false, error: gate.error };
  const { supabase, ctx } = gate;
  const denyId = asUuid(form.get('denyId'));
  if (!denyId) return { ok: false, error: 'Invalid deny record.' };

  const { data: deny } = await supabase
    .from('internal_permission_denies')
    .select('id,profile_id,action')
    .eq('organization_id', ctx.organizationId)
    .eq('id', denyId)
    .is('revoked_at', null)
    .maybeSingle();
  if (!deny) return { ok: false, error: 'Deny is no longer active.' };

  const { error } = await supabase
    .from('internal_permission_denies')
    .update({ revoked_at: new Date().toISOString(), updated_at: new Date().toISOString() })
    .eq('id', denyId)
    .eq('organization_id', ctx.organizationId)
    .is('revoked_at', null);
  if (error) return { ok: false, error: 'Could not revoke the deny.' };

  await recordAuthorityEvent(
    supabase,
    ctx,
    'access.explicit_deny.revoked',
    'internal_permission_denies',
    denyId,
    `Revoked ${deny.action} deny for ${deny.profile_id}`
  );
  refreshAuthority();
  return { ok: true };
}

export async function createAuthorityRelationship(
  _prev: AuthorityActionResult,
  form: FormData
): Promise<AuthorityActionResult> {
  const gate = await ownerGate();
  if ('error' in gate) return { ok: false, error: gate.error };
  const { supabase, ctx } = gate;

  const sourceProfileId = asUuid(form.get('sourceProfileId'));
  const relationshipType = String(form.get('relationshipType') ?? '').trim();
  const targetProfileId = asUuid(form.get('targetProfileId'));
  const projectId = asUuid(form.get('projectId'));
  const action = asAction(form.get('action'));
  const reason = String(form.get('reason') ?? '').trim();
  const hours = Number(form.get('hours') ?? 0);

  if (!sourceProfileId || !RELATIONSHIP_TYPES.has(relationshipType)) {
    return { ok: false, error: 'Choose a valid source identity and relationship.' };
  }
  if (relationshipType === 'supervises' && !targetProfileId) {
    return { ok: false, error: 'Supervision requires a subordinate identity.' };
  }
  if (targetProfileId && targetProfileId === sourceProfileId) {
    return { ok: false, error: 'An identity cannot supervise or delegate authority to itself.' };
  }
  if (relationshipType !== 'supervises' && !action) {
    return { ok: false, error: 'Approval, billing and delegation relationships require a specific action.' };
  }
  if (relationshipType === 'billing_for' && action && !financialActions.includes(action)) {
    return { ok: false, error: 'Billing relationships may contain financial capabilities only.' };
  }
  if (reason.length > 1000 || !Number.isFinite(hours) || hours < 0 || hours > 24 * 30) {
    return { ok: false, error: 'Relationship reason/duration is invalid.' };
  }

  const source = await activeInternalMember(supabase, ctx.organizationId, sourceProfileId);
  const target = targetProfileId
    ? await activeInternalMember(supabase, ctx.organizationId, targetProfileId)
    : null;
  if (!source || (targetProfileId && !target)) {
    return { ok: false, error: 'Relationship identities must be active internal members.' };
  }
  if (projectId && !(await validProject(supabase, ctx.organizationId, projectId))) {
    return { ok: false, error: 'Project scope was not found.' };
  }

  const now = new Date();
  const effectiveUntil = hours > 0 ? new Date(now.getTime() + hours * 60 * 60 * 1000).toISOString() : null;
  const { data, error } = await supabase
    .from('authority_relationships')
    .insert({
      organization_id: ctx.organizationId,
      source_profile_id: sourceProfileId,
      target_profile_id: relationshipType === 'supervises' ? targetProfileId : null,
      relationship_type: relationshipType,
      action: relationshipType === 'supervises' ? action : action,
      resource_type: projectId ? 'project' : null,
      resource_id: projectId,
      effective_from: now.toISOString(),
      effective_until: effectiveUntil,
      reason: reason || null,
      granted_by: ctx.user.id
    })
    .select('id')
    .single();
  if (error || !data) return { ok: false, error: 'Could not create the authority relationship.' };

  await recordAuthorityEvent(
    supabase,
    ctx,
    'access.relationship.created',
    'authority_relationships',
    data.id,
    `Created ${relationshipType} authority for ${sourceProfileId}`,
    { sourceProfileId, targetProfileId, action, projectId, effectiveUntil, reason }
  );
  refreshAuthority();
  return { ok: true };
}

export async function revokeAuthorityRelationship(
  _prev: AuthorityActionResult,
  form: FormData
): Promise<AuthorityActionResult> {
  const gate = await ownerGate();
  if ('error' in gate) return { ok: false, error: gate.error };
  const { supabase, ctx } = gate;
  const relationshipId = asUuid(form.get('relationshipId'));
  if (!relationshipId) return { ok: false, error: 'Invalid relationship.' };

  const { data: relationship } = await supabase
    .from('authority_relationships')
    .select('id,source_profile_id,relationship_type')
    .eq('organization_id', ctx.organizationId)
    .eq('id', relationshipId)
    .is('revoked_at', null)
    .maybeSingle();
  if (!relationship) return { ok: false, error: 'Relationship is no longer active.' };

  const { error } = await supabase
    .from('authority_relationships')
    .update({ revoked_at: new Date().toISOString(), updated_at: new Date().toISOString() })
    .eq('organization_id', ctx.organizationId)
    .eq('id', relationshipId)
    .is('revoked_at', null);
  if (error) return { ok: false, error: 'Could not revoke the relationship.' };

  await recordAuthorityEvent(
    supabase,
    ctx,
    'access.relationship.revoked',
    'authority_relationships',
    relationshipId,
    `Revoked ${relationship.relationship_type} authority for ${relationship.source_profile_id}`
  );
  refreshAuthority();
  return { ok: true };
}

export async function startBreakGlass(
  _prev: AuthorityActionResult,
  form: FormData
): Promise<AuthorityActionResult> {
  const gate = await ownerGate();
  if ('error' in gate) return { ok: false, error: gate.error };
  const { supabase, ctx } = gate;

  const action = asAction(form.get('action'));
  const projectId = asUuid(form.get('projectId'));
  const reason = String(form.get('reason') ?? '').trim();
  const minutes = Number(form.get('minutes') ?? 15);
  if (!action || !projectId || reason.length < 12 || reason.length > 1000) {
    return { ok: false, error: 'Break-glass requires an action, project and specific emergency reason.' };
  }
  if (!Number.isFinite(minutes) || minutes < 5 || minutes > 30) {
    return { ok: false, error: 'Break-glass access must last between 5 and 30 minutes.' };
  }
  if (!(await validProject(supabase, ctx.organizationId, projectId))) {
    return { ok: false, error: 'Project scope was not found.' };
  }

  const now = new Date();
  const { data: matchingDeny } = await supabase
    .from('internal_permission_denies')
    .select('id')
    .eq('organization_id', ctx.organizationId)
    .eq('profile_id', ctx.user.id)
    .eq('action', action)
    .eq('resource_type', 'project')
    .eq('resource_id', projectId)
    .is('revoked_at', null)
    .lte('effective_from', now.toISOString())
    .or(`effective_until.is.null,effective_until.gt.${now.toISOString()}`)
    .limit(1)
    .maybeSingle();
  if (!matchingDeny) {
    return { ok: false, error: 'Break-glass is only available to override an active explicit deny in the same scope.' };
  }

  const effectiveUntil = new Date(now.getTime() + minutes * 60 * 1000);
  const { data, error } = await supabase
    .from('access_break_glass_sessions')
    .insert({
      organization_id: ctx.organizationId,
      profile_id: ctx.user.id,
      action,
      resource_type: 'project',
      resource_id: projectId,
      effective_from: now.toISOString(),
      effective_until: effectiveUntil.toISOString(),
      reason,
      created_by: ctx.user.id
    })
    .select('id')
    .single();
  if (error || !data) return { ok: false, error: 'Could not start emergency access.' };

  await recordAuthorityEvent(
    supabase,
    ctx,
    'access.break_glass.started',
    'access_break_glass_sessions',
    data.id,
    `Started ${minutes}m break-glass for ${action} on project ${projectId}`,
    { action, projectId, reason, effectiveUntil: effectiveUntil.toISOString(), matchingDenyId: matchingDeny.id }
  );
  refreshAuthority();
  return { ok: true };
}

export async function revokeBreakGlass(
  _prev: AuthorityActionResult,
  form: FormData
): Promise<AuthorityActionResult> {
  const gate = await ownerGate();
  if ('error' in gate) return { ok: false, error: gate.error };
  const { supabase, ctx } = gate;
  const sessionId = asUuid(form.get('sessionId'));
  if (!sessionId) return { ok: false, error: 'Invalid break-glass session.' };

  const { data: session } = await supabase
    .from('access_break_glass_sessions')
    .select('id,action,resource_id')
    .eq('organization_id', ctx.organizationId)
    .eq('profile_id', ctx.user.id)
    .eq('id', sessionId)
    .is('revoked_at', null)
    .maybeSingle();
  if (!session) return { ok: false, error: 'Break-glass session is no longer active.' };

  const { error } = await supabase
    .from('access_break_glass_sessions')
    .update({ revoked_at: new Date().toISOString() })
    .eq('organization_id', ctx.organizationId)
    .eq('profile_id', ctx.user.id)
    .eq('id', sessionId)
    .is('revoked_at', null);
  if (error) return { ok: false, error: 'Could not revoke emergency access.' };

  await recordAuthorityEvent(
    supabase,
    ctx,
    'access.break_glass.revoked',
    'access_break_glass_sessions',
    sessionId,
    `Revoked break-glass ${session.action} on ${session.resource_id}`
  );
  refreshAuthority();
  return { ok: true };
}
