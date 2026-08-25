'use server';

import { createHash, randomBytes } from 'node:crypto';
import { revalidatePath } from 'next/cache';
import { getAuthContext, isKspIncOwner, type AuthContext } from '@ksp/auth';
import type { SupabaseClient } from '@ksp/database';
import type { PermissionAction } from '@ksp/permissions';
import { getServerSupabase } from '../../lib/supabase';
import { createPartnerInvitationSchema, invitationPayloadSchema } from '@ksp/validation';

export interface IncAccessActionResult {
  ok: boolean;
  error?: string;
}

const OWNER_ROLES = new Set(['founder_ceo', 'executive_operations']);
const PARTNER_ROLES = new Set(['partner_owner', 'partner_coordinator', 'billing', 'editor', 'uploader', 'viewer']);
const UNIT_ACCESS_LEVELS = new Set(['admin', 'member', 'viewer']);
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

function refreshOwnerAccess() {
  revalidatePath('/');
  revalidatePath('/access');
  revalidatePath('/people');
  revalidatePath('/network');
  revalidatePath('/structure');
  revalidatePath('/work');
}

export async function setBusinessUnitMembership(
  _prev: IncAccessActionResult,
  form: FormData
): Promise<IncAccessActionResult> {
  const gate = await ownerGate();
  if ('error' in gate) return { ok: false, error: gate.error };
  const { supabase, ctx } = gate;

  const profileId = asUuid(form.get('profileId'));
  const businessUnitId = asUuid(form.get('businessUnitId'));
  const accessLevel = String(form.get('accessLevel') ?? 'member');
  if (!profileId || !businessUnitId || !UNIT_ACCESS_LEVELS.has(accessLevel)) {
    return { ok: false, error: 'Choose a valid team member, division and access level.' };
  }

  const [targetMembership, unitResult] = await Promise.all([
    activeInternalMember(supabase, ctx, profileId),
    supabase
      .from('business_units')
      .select('id,name')
      .eq('id', businessUnitId)
      .eq('organization_id', ctx.organizationId)
      .eq('status', 'active')
      .maybeSingle()
  ]);
  const unit = unitResult.data as { id: string; name: string } | null;
  if (!targetMembership || !unit) return { ok: false, error: 'Active team member or division was not found.' };
  if (targetMembership.internal_role && OWNER_ROLES.has(targetMembership.internal_role)) {
    return { ok: false, error: 'KSP INC owners already have global division scope.' };
  }

  const { error } = await supabase.from('business_unit_memberships').upsert(
    {
      organization_id: ctx.organizationId,
      business_unit_id: businessUnitId,
      profile_id: profileId,
      access_level: accessLevel,
      suspended_at: null,
      effective_until: null,
      granted_by: ctx.user.id
    },
    { onConflict: 'business_unit_id,profile_id' }
  );
  if (error) return { ok: false, error: 'Could not update division access.' };

  await recordAccessEvent(
    supabase,
    ctx,
    'business_unit.access_granted',
    'business_unit_memberships',
    businessUnitId,
    `Granted ${accessLevel} access to ${unit.name} for ${profileId}`
  );
  refreshOwnerAccess();
  return { ok: true };
}

export async function revokeBusinessUnitMembership(
  _prev: IncAccessActionResult,
  form: FormData
): Promise<IncAccessActionResult> {
  const gate = await ownerGate();
  if ('error' in gate) return { ok: false, error: gate.error };
  const { supabase, ctx } = gate;

  const profileId = asUuid(form.get('profileId'));
  const businessUnitId = asUuid(form.get('businessUnitId'));
  if (!profileId || !businessUnitId) return { ok: false, error: 'Invalid team member or division.' };

  const { data: targetMembership } = await supabase
    .from('organization_memberships')
    .select('internal_role')
    .eq('organization_id', ctx.organizationId)
    .eq('profile_id', profileId)
    .not('internal_role', 'is', null)
    .limit(1)
    .maybeSingle();
  if (targetMembership?.internal_role && OWNER_ROLES.has(String(targetMembership.internal_role))) {
    return { ok: false, error: 'Global owner scope is not controlled by a division membership.' };
  }

  const { error } = await supabase
    .from('business_unit_memberships')
    .update({ suspended_at: new Date().toISOString() })
    .eq('organization_id', ctx.organizationId)
    .eq('business_unit_id', businessUnitId)
    .eq('profile_id', profileId)
    .is('suspended_at', null);
  if (error) return { ok: false, error: 'Could not revoke division access.' };

  await recordAccessEvent(
    supabase,
    ctx,
    'business_unit.access_revoked',
    'business_unit_memberships',
    businessUnitId,
    `Revoked division access from ${profileId}`
  );
  refreshOwnerAccess();
  return { ok: true };
}

export async function setInternalMembershipSuspended(
  _prev: IncAccessActionResult,
  form: FormData
): Promise<IncAccessActionResult> {
  const gate = await ownerGate();
  if ('error' in gate) return { ok: false, error: gate.error };
  const { supabase, ctx } = gate;

  const profileId = asUuid(form.get('profileId'));
  const suspended = String(form.get('suspended') ?? '') === 'true';
  if (!profileId) return { ok: false, error: 'Invalid team member.' };
  if (profileId === ctx.user.id) return { ok: false, error: 'You cannot suspend your own owner session.' };

  const { data: membership } = await supabase
    .from('organization_memberships')
    .select('id,internal_role')
    .eq('organization_id', ctx.organizationId)
    .eq('profile_id', profileId)
    .not('internal_role', 'is', null)
    .limit(1)
    .maybeSingle();
  if (!membership) return { ok: false, error: 'Internal membership was not found.' };
  if (membership.internal_role && OWNER_ROLES.has(String(membership.internal_role))) {
    return { ok: false, error: 'Owner-role suspension requires a separate recovery-governed process.' };
  }

  const { error } = await supabase
    .from('organization_memberships')
    .update({ suspended_at: suspended ? new Date().toISOString() : null })
    .eq('id', membership.id)
    .eq('organization_id', ctx.organizationId);
  if (error) return { ok: false, error: suspended ? 'Could not suspend access.' : 'Could not reactivate access.' };

  await recordAccessEvent(
    supabase,
    ctx,
    suspended ? 'organization.access_suspended' : 'organization.access_reactivated',
    'organization_memberships',
    membership.id,
    `${suspended ? 'Suspended' : 'Reactivated'} internal access for ${profileId}`
  );
  refreshOwnerAccess();
  return { ok: true };
}

export async function grantInternalPermission(
  _prev: IncAccessActionResult,
  form: FormData
): Promise<IncAccessActionResult> {
  const gate = await ownerGate();
  if ('error' in gate) return { ok: false, error: gate.error };
  const { supabase, ctx } = gate;

  const profileId = asUuid(form.get('profileId'));
  const action = String(form.get('action') ?? '') as PermissionAction;
  const projectId = asUuid(form.get('projectId'));
  if (!profileId || !PERMISSION_ACTIONS.has(action)) return { ok: false, error: 'Choose a valid member and permission.' };

  const targetMembership = await activeInternalMember(supabase, ctx, profileId);
  if (!targetMembership) return { ok: false, error: 'Permanent grants require an active internal member.' };
  if (targetMembership.internal_role && OWNER_ROLES.has(targetMembership.internal_role)) {
    return { ok: false, error: 'KSP INC owners already inherit the executive permission boundary.' };
  }

  if (projectId) {
    const { data: project } = await supabase
      .from('projects')
      .select('id')
      .eq('id', projectId)
      .eq('organization_id', ctx.organizationId)
      .neq('status', 'archived')
      .maybeSingle();
    if (!project) return { ok: false, error: 'Project scope was not found.' };
  }

  const now = new Date().toISOString();
  let existingQuery = supabase
    .from('internal_permission_grants')
    .select('id')
    .eq('organization_id', ctx.organizationId)
    .eq('profile_id', profileId)
    .eq('action', action)
    .is('revoked_at', null)
    .lte('effective_from', now)
    .or(`effective_until.is.null,effective_until.gt.${now}`);
  existingQuery = projectId
    ? existingQuery.eq('resource_type', 'project').eq('resource_id', projectId)
    : existingQuery.is('resource_type', null).is('resource_id', null);
  const { data: existing } = await existingQuery.limit(1);
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
    `Granted ${action} to ${profileId}${projectId ? ` for project ${projectId}` : ' organization-wide'}`
  );
  refreshOwnerAccess();
  return { ok: true };
}

export async function revokeInternalPermission(
  _prev: IncAccessActionResult,
  form: FormData
): Promise<IncAccessActionResult> {
  const gate = await ownerGate();
  if ('error' in gate) return { ok: false, error: gate.error };
  const { supabase, ctx } = gate;
  const grantId = asUuid(form.get('grantId'));
  if (!grantId) return { ok: false, error: 'Invalid permission grant.' };

  const { data: grant } = await supabase
    .from('internal_permission_grants')
    .select('id,profile_id,action')
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
  refreshOwnerAccess();
  return { ok: true };
}

export async function grantTemporaryAccess(
  _prev: IncAccessActionResult,
  form: FormData
): Promise<IncAccessActionResult> {
  const gate = await ownerGate();
  if ('error' in gate) return { ok: false, error: gate.error };
  const { supabase, ctx } = gate;

  const profileId = asUuid(form.get('profileId'));
  const action = String(form.get('action') ?? '') as PermissionAction;
  const resourceType = String(form.get('resourceType') ?? 'project');
  const resourceId = asUuid(form.get('resourceId'));
  const hours = Number(form.get('hours') ?? 24);
  if (!profileId || !resourceId || !PERMISSION_ACTIONS.has(action) || !['project', 'task'].includes(resourceType)) {
    return { ok: false, error: 'Choose a valid member, permission and resource.' };
  }
  if (!Number.isFinite(hours) || hours < 1 || hours > 24 * 30) {
    return { ok: false, error: 'Temporary access must last between 1 hour and 30 days.' };
  }

  const targetMembership = await activeInternalMember(supabase, ctx, profileId);
  if (!targetMembership) return { ok: false, error: 'Temporary grants require an active internal member.' };
  if (targetMembership.internal_role && OWNER_ROLES.has(targetMembership.internal_role)) {
    return { ok: false, error: 'KSP INC owners do not need temporary grants.' };
  }

  const targetTable = resourceType === 'project' ? 'projects' : 'tasks';
  const { data: resource } = await supabase
    .from(targetTable)
    .select('id')
    .eq('id', resourceId)
    .eq('organization_id', ctx.organizationId)
    .maybeSingle();
  if (!resource) return { ok: false, error: 'The scoped resource was not found.' };

  const effectiveFrom = new Date();
  const effectiveUntil = new Date(effectiveFrom.getTime() + hours * 60 * 60 * 1000);
  const { data, error } = await supabase
    .from('temporary_access_grants')
    .insert({
      organization_id: ctx.organizationId,
      profile_id: profileId,
      action,
      resource_type: resourceType,
      resource_id: resourceId,
      effective_from: effectiveFrom.toISOString(),
      effective_until: effectiveUntil.toISOString(),
      created_by: ctx.user.id
    })
    .select('id')
    .single();
  if (error || !data) return { ok: false, error: 'Could not create temporary access.' };

  await recordAccessEvent(
    supabase,
    ctx,
    'access.temporary.granted',
    'temporary_access_grants',
    data.id,
    `Granted ${action} on ${resourceType} ${resourceId} to ${profileId} for ${hours}h`
  );
  refreshOwnerAccess();
  return { ok: true };
}

export async function revokeTemporaryAccess(
  _prev: IncAccessActionResult,
  form: FormData
): Promise<IncAccessActionResult> {
  const gate = await ownerGate();
  if ('error' in gate) return { ok: false, error: gate.error };
  const { supabase, ctx } = gate;
  const grantId = asUuid(form.get('grantId'));
  if (!grantId) return { ok: false, error: 'Invalid temporary grant.' };

  const { data: grant } = await supabase
    .from('temporary_access_grants')
    .select('id,profile_id,action')
    .eq('id', grantId)
    .eq('organization_id', ctx.organizationId)
    .is('revoked_at', null)
    .maybeSingle();
  if (!grant) return { ok: false, error: 'Temporary grant is no longer active.' };

  const { error } = await supabase
    .from('temporary_access_grants')
    .update({ revoked_at: new Date().toISOString() })
    .eq('id', grantId)
    .eq('organization_id', ctx.organizationId)
    .is('revoked_at', null);
  if (error) return { ok: false, error: 'Could not revoke temporary access.' };

  await recordAccessEvent(
    supabase,
    ctx,
    'access.temporary.revoked',
    'temporary_access_grants',
    grantId,
    `Revoked ${grant.action} temporary access from ${grant.profile_id}`
  );
  refreshOwnerAccess();
  return { ok: true };
}

export async function setPartnerMembership(
  _prev: IncAccessActionResult,
  form: FormData
): Promise<IncAccessActionResult> {
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
    .select('id,display_name')
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
  refreshOwnerAccess();
  return { ok: true };
}

export interface PartnerInvitationActionResult {
  ok: boolean;
  error?: string;
  invitePath?: string;
}

/**
 * Creates a Network invitation with an explicit surface, organization, role,
 * bounded partner scope and expiry. Team/project scopes are intentionally empty
 * until Network has a dedicated scope ledger; acceptance rejects non-empty
 * values rather than widening access implicitly.
 */
export async function createPartnerInvitation(
  _prev: PartnerInvitationActionResult,
  form: FormData
): Promise<PartnerInvitationActionResult> {
  const gate = await ownerGate();
  if ('error' in gate) return { ok: false, error: gate.error };
  const { supabase, ctx } = gate;

  const parsed = createPartnerInvitationSchema.safeParse({
    partnerOrganizationId: form.get('partnerOrganizationId'),
    email: form.get('email'),
    role: form.get('role'),
    expiresInDays: form.get('expiresInDays') || undefined
  });
  if (!parsed.success) return { ok: false, error: 'Choose a valid partner, email, role and expiry.' };

  const { data: partnerOrganization } = await supabase
    .from('partner_organizations')
    .select('id,display_name')
    .eq('id', parsed.data.partnerOrganizationId)
    .eq('organization_id', ctx.organizationId)
    .eq('status', 'active')
    .maybeSingle();
  if (!partnerOrganization) return { ok: false, error: 'Active partner organization was not found.' };

  const token = randomBytes(32).toString('base64url');
  const tokenHash = createHash('sha256').update(token).digest('hex');
  const expiresAt = new Date(Date.now() + parsed.data.expiresInDays * 86_400_000).toISOString();
  const payloadResult = invitationPayloadSchema.safeParse({
    version: 1,
    surface: 'network',
    organizationId: ctx.organizationId,
    email: parsed.data.email,
    role: parsed.data.role,
    scope: {
      organizationId: ctx.organizationId,
      partnerOrganizationId: parsed.data.partnerOrganizationId,
      projectIds: [],
      teamKey: null
    },
    expiresAt
  });
  if (!payloadResult.success) return { ok: false, error: 'Could not establish a valid Network invitation context.' };
  const payload = payloadResult.data;

  const { data, error } = await supabase
    .from('partner_invitations')
    .insert({
      organization_id: ctx.organizationId,
      partner_organization_id: parsed.data.partnerOrganizationId,
      email: payload.email,
      role: payload.role,
      surface: payload.surface,
      context_version: payload.version,
      scope: payload.scope,
      team_key: payload.scope.teamKey,
      token_hash: tokenHash,
      invited_by: ctx.user.id,
      expires_at: payload.expiresAt
    })
    .select('id')
    .single();
  if (error || !data) return { ok: false, error: 'Could not create the Network invitation.' };

  await recordAccessEvent(
    supabase,
    ctx,
    'network.invitation.created',
    'partner_invitations',
    data.id,
    `Invited ${payload.email} as ${payload.role} to ${partnerOrganization.display_name}`
  );
  refreshOwnerAccess();

  const base = process.env.NEXT_PUBLIC_NETWORK_BASE_URL?.trim().replace(/\/+$/, '');
  const invitePath = `/invite/${token}`;
  return { ok: true, invitePath: base ? `${base}${invitePath}` : invitePath };
}

export async function revokePartnerMembership(
  _prev: IncAccessActionResult,
  form: FormData
): Promise<IncAccessActionResult> {
  const gate = await ownerGate();
  if ('error' in gate) return { ok: false, error: gate.error };
  const { supabase, ctx } = gate;
  const membershipId = asUuid(form.get('membershipId'));
  if (!membershipId) return { ok: false, error: 'Invalid Network membership.' };

  const { data: membership } = await supabase
    .from('partner_memberships')
    .select('id,profile_id,role')
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
  refreshOwnerAccess();
  return { ok: true };
}

export async function createBusinessUnit(
  _prev: IncAccessActionResult,
  form: FormData
): Promise<IncAccessActionResult> {
  const gate = await ownerGate();
  if ('error' in gate) return { ok: false, error: gate.error };
  const { supabase, ctx } = gate;
  const name = String(form.get('name') ?? '').trim();
  const rawKey = String(form.get('key') ?? '').trim().toLowerCase();
  const focus = String(form.get('focus') ?? '').trim();
  const key = rawKey
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9_-]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 63);
  if (name.length < 2 || name.length > 120 || !/^[a-z0-9][a-z0-9_-]{1,62}$/.test(key)) {
    return { ok: false, error: 'Use a valid division name and key.' };
  }
  if (focus.length > 500) return { ok: false, error: 'Focus is too long.' };

  const { data, error } = await supabase
    .from('business_units')
    .insert({ organization_id: ctx.organizationId, key, name, focus: focus || null, status: 'active' })
    .select('id')
    .single();
  if (error || !data) return { ok: false, error: 'Could not create the KSP division.' };
  await recordAccessEvent(supabase, ctx, 'business_unit.created', 'business_units', data.id, `Created KSP division: ${name}`);
  refreshOwnerAccess();
  return { ok: true };
}

export async function setProjectBusinessUnit(
  _prev: IncAccessActionResult,
  form: FormData
): Promise<IncAccessActionResult> {
  const gate = await ownerGate();
  if ('error' in gate) return { ok: false, error: gate.error };
  const { supabase, ctx } = gate;
  const projectId = asUuid(form.get('projectId'));
  const businessUnitId = asUuid(form.get('businessUnitId'));
  if (!projectId || !businessUnitId) return { ok: false, error: 'Choose a valid project and division.' };

  const { data: unit } = await supabase
    .from('business_units')
    .select('id,name')
    .eq('id', businessUnitId)
    .eq('organization_id', ctx.organizationId)
    .eq('status', 'active')
    .maybeSingle();
  if (!unit) return { ok: false, error: 'Division was not found.' };

  const { data: project, error } = await supabase
    .from('projects')
    .update({ business_unit_id: businessUnitId })
    .eq('id', projectId)
    .eq('organization_id', ctx.organizationId)
    .select('id,name')
    .single();
  if (error || !project) return { ok: false, error: 'Could not classify the project.' };

  await recordAccessEvent(
    supabase,
    ctx,
    'project.business_unit_changed',
    'projects',
    project.id,
    `Assigned ${project.name} to ${unit.name}`
  );
  refreshOwnerAccess();
  return { ok: true };
}
