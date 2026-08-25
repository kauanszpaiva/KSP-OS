'use server';

import { revalidatePath } from 'next/cache';
import { getAuthContext, isKspIncOwner, type AuthContext } from '@ksp/auth';
import type { SupabaseClient } from '@ksp/database';
import type { PermissionAction } from '@ksp/permissions';
import { getServerSupabase } from '../../../../lib/supabase';
import { OWNER_ROLES } from './data';

export interface AccessActionResult {
  ok: boolean;
  error?: string;
}

const PERMISSION_ACTIONS = new Set<PermissionAction>([
  'client.read',
  'client.update',
  'client.internal_note.read',
  'project.read',
  'project.manage',
  'project.publish',
  'request.submit',
  'request.triage',
  'change_order.draft',
  'change_order.internal_approve',
  'change_order.client_approve',
  'invoice.read',
  'invoice.pay',
  'payment.refund',
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

const PARTNER_ROLES = new Set(['partner_owner', 'partner_coordinator', 'editor', 'uploader', 'viewer']);

function asUuid(value: FormDataEntryValue | null): string | null {
  const text = String(value ?? '').trim();
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(text) ? text : null;
}

async function ownerGate(): Promise<{ supabase: SupabaseClient; ctx: AuthContext } | { error: string }> {
  const supabase = await getServerSupabase();
  if (!supabase) return { error: 'not_configured' };
  const ctx = await getAuthContext(supabase);
  if (!ctx) return { error: 'unauthenticated' };
  if (!isKspIncOwner(ctx)) return { error: 'owner_access_required' };
  if (!ctx.mfa) return { error: 'Step-up MFA is required for access changes.' };
  return { supabase, ctx };
}

async function recordAccessEvent(
  supabase: SupabaseClient,
  ctx: AuthContext,
  verb: string,
  objectTable: string,
  objectId: string | null,
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
      metadata: { summary }
    })
  ]);
}

async function activeInternalMember(
  supabase: SupabaseClient,
  ctx: AuthContext,
  profileId: string
): Promise<{ internal_role: string | null } | null> {
  const now = new Date().toISOString();
  const { data } = await supabase
    .from('organization_memberships')
    .select('internal_role')
    .eq('organization_id', ctx.organizationId)
    .eq('profile_id', profileId)
    .not('internal_role', 'is', null)
    .is('suspended_at', null)
    .lte('effective_from', now)
    .or(`effective_until.is.null,effective_until.gt.${now}`)
    .limit(1)
    .maybeSingle();
  return data as { internal_role: string | null } | null;
}

export async function grantInternalPermission(
  _prev: AccessActionResult,
  form: FormData
): Promise<AccessActionResult> {
  const gate = await ownerGate();
  if ('error' in gate) return { ok: false, error: gate.error };
  const { supabase, ctx } = gate;

  const profileId = asUuid(form.get('profileId'));
  const action = String(form.get('action') ?? '') as PermissionAction;
  const projectId = asUuid(form.get('projectId'));
  if (!profileId || !PERMISSION_ACTIONS.has(action)) return { ok: false, error: 'Choose a valid member and permission.' };

  const targetMembership = await activeInternalMember(supabase, ctx, profileId);
  if (!targetMembership) return { ok: false, error: 'Permanent Command grants require an active internal member.' };
  if (targetMembership.internal_role && OWNER_ROLES.has(targetMembership.internal_role)) {
    return { ok: false, error: 'KSP INC owners already inherit the executive permission boundary.' };
  }

  let projectName: string | null = null;
  if (projectId) {
    const { data: project } = await supabase
      .from('projects')
      .select('id, name')
      .eq('id', projectId)
      .eq('organization_id', ctx.organizationId)
      .neq('status', 'archived')
      .maybeSingle();
    if (!project) return { ok: false, error: 'Project scope was not found.' };
    projectName = project.name;
  }

  const now = new Date().toISOString();
  let duplicateQuery = supabase
    .from('internal_permission_grants')
    .select('id')
    .eq('organization_id', ctx.organizationId)
    .eq('profile_id', profileId)
    .eq('action', action)
    .is('revoked_at', null)
    .lte('effective_from', now)
    .or(`effective_until.is.null,effective_until.gt.${now}`);

  duplicateQuery = projectId
    ? duplicateQuery.eq('resource_type', 'project').eq('resource_id', projectId)
    : duplicateQuery.is('resource_type', null).is('resource_id', null);

  const { data: existing } = await duplicateQuery.limit(1);
  if (existing?.length) return { ok: true };

  const { data, error } = await supabase
    .from('internal_permission_grants')
    .insert({
      organization_id: ctx.organizationId,
      profile_id: profileId,
      action,
      resource_type: projectId ? 'project' : null,
      resource_id: projectId,
      effective_from: now,
      granted_by: ctx.user.id
    })
    .select('id')
    .single();
  if (error || !data) return { ok: false, error: 'Could not grant this permission.' };

  await recordAccessEvent(
    supabase,
    ctx,
    'access.permission.granted',
    'internal_permission_grants',
    data.id,
    `Granted ${action} to ${profileId}${projectName ? ` for ${projectName}` : ' organization-wide'}`
  );
  revalidatePath('/inc/access');
  revalidatePath('/inc');
  return { ok: true };
}

export async function revokeInternalPermission(
  _prev: AccessActionResult,
  form: FormData
): Promise<AccessActionResult> {
  const gate = await ownerGate();
  if ('error' in gate) return { ok: false, error: gate.error };
  const { supabase, ctx } = gate;

  const grantId = asUuid(form.get('grantId'));
  if (!grantId) return { ok: false, error: 'Invalid permission grant.' };

  const { data: grant } = await supabase
    .from('internal_permission_grants')
    .select('id, profile_id, action')
    .eq('id', grantId)
    .eq('organization_id', ctx.organizationId)
    .is('revoked_at', null)
    .maybeSingle();
  if (!grant) return { ok: false, error: 'Permission grant is no longer active.' };

  const { error } = await supabase
    .from('internal_permission_grants')
    .update({ revoked_at: new Date().toISOString() })
    .eq('id', grantId)
    .eq('organization_id', ctx.organizationId)
    .is('revoked_at', null);
  if (error) return { ok: false, error: 'Could not revoke this permission.' };

  await recordAccessEvent(
    supabase,
    ctx,
    'access.permission.revoked',
    'internal_permission_grants',
    grantId,
    `Revoked ${grant.action} from ${grant.profile_id}`
  );
  revalidatePath('/inc/access');
  revalidatePath('/inc');
  return { ok: true };
}

export async function setPartnerMembership(
  _prev: AccessActionResult,
  form: FormData
): Promise<AccessActionResult> {
  const gate = await ownerGate();
  if ('error' in gate) return { ok: false, error: gate.error };
  const { supabase, ctx } = gate;

  const profileId = asUuid(form.get('profileId'));
  const partnerOrganizationId = asUuid(form.get('partnerOrganizationId'));
  const role = String(form.get('role') ?? '').trim();
  if (!profileId || !partnerOrganizationId || !PARTNER_ROLES.has(role)) {
    return { ok: false, error: 'Choose a valid identity, partner organization and Network role.' };
  }

  const { data: partnerOrganization } = await supabase
    .from('partner_organizations')
    .select('id, display_name')
    .eq('id', partnerOrganizationId)
    .eq('organization_id', ctx.organizationId)
    .eq('status', 'active')
    .maybeSingle();
  if (!partnerOrganization) return { ok: false, error: 'Active partner organization was not found.' };

  const { error } = await supabase.from('partner_memberships').upsert(
    {
      organization_id: ctx.organizationId,
      partner_organization_id: partnerOrganizationId,
      profile_id: profileId,
      role,
      suspended_at: null,
      effective_until: null,
      created_by: ctx.user.id
    },
    { onConflict: 'partner_organization_id,profile_id' }
  );
  if (error) return { ok: false, error: 'Could not update Network access.' };

  await recordAccessEvent(
    supabase,
    ctx,
    'network.membership.granted',
    'partner_memberships',
    profileId,
    `Granted ${role} Network access to ${profileId} for ${partnerOrganization.display_name}`
  );
  revalidatePath('/inc/access');
  revalidatePath('/inc');
  return { ok: true };
}

export async function revokePartnerMembership(
  _prev: AccessActionResult,
  form: FormData
): Promise<AccessActionResult> {
  const gate = await ownerGate();
  if ('error' in gate) return { ok: false, error: gate.error };
  const { supabase, ctx } = gate;

  const membershipId = asUuid(form.get('membershipId'));
  if (!membershipId) return { ok: false, error: 'Invalid Network membership.' };

  const { data: membership } = await supabase
    .from('partner_memberships')
    .select('id, profile_id, partner_organization_id, role')
    .eq('id', membershipId)
    .eq('organization_id', ctx.organizationId)
    .maybeSingle();
  if (!membership) return { ok: false, error: 'Network membership was not found.' };

  const { error } = await supabase
    .from('partner_memberships')
    .update({ suspended_at: new Date().toISOString() })
    .eq('id', membershipId)
    .eq('organization_id', ctx.organizationId);
  if (error) return { ok: false, error: 'Could not revoke Network access.' };

  await recordAccessEvent(
    supabase,
    ctx,
    'network.membership.revoked',
    'partner_memberships',
    membershipId,
    `Revoked ${membership.role} Network access from ${membership.profile_id}`
  );
  revalidatePath('/inc/access');
  revalidatePath('/inc');
  return { ok: true };
}
