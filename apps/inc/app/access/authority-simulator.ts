'use server';

import { getAuthContext, isKspIncOwner } from '@ksp/auth';
import type { SupabaseClient } from '@ksp/database';
import {
  canPerform,
  type AuthorityRelationship,
  type Classification,
  type InternalRole,
  type MembershipContext,
  type PermissionAction,
  type ScopedPermissionDeny,
  type ScopedPermissionGrant
} from '@ksp/permissions';
import { getServerSupabase } from '../../lib/supabase';

export interface AuthoritySimulationState {
  ok: boolean;
  error?: string;
  allowed?: boolean;
  reason?: string;
  approvalRequired?: boolean;
  outcome?: string;
  trace?: string[];
}

const classifications = new Set<Classification>([
  'public',
  'client_safe',
  'partner_safe',
  'internal',
  'confidential',
  'restricted',
  'finance_restricted',
  'legal_restricted',
  'security_restricted'
]);

function asUuid(value: FormDataEntryValue | null): string | null {
  const text = String(value ?? '').trim();
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(text)
    ? text
    : null;
}

function resourceScope(resourceType: string | null, resourceId: string | null) {
  if (!resourceType || !resourceId) return {};
  if (resourceType === 'project') return { projectId: resourceId };
  if (resourceType === 'client_organization') return { clientOrganizationId: resourceId };
  return { resourceType, resourceId };
}

async function buildSubjectContext(
  supabase: SupabaseClient,
  organizationId: string,
  profileId: string
): Promise<MembershipContext | null> {
  const nowDate = new Date();
  const now = nowDate.toISOString();
  const [membershipResult, projectResult, grantResult, projectGrantResult, temporaryResult, denyResult, relationshipResult] =
    await Promise.all([
      supabase
        .from('organization_memberships')
        .select('internal_role,effective_from,effective_until,suspended_at')
        .eq('organization_id', organizationId)
        .eq('profile_id', profileId),
      supabase
        .from('project_memberships')
        .select('project_id')
        .eq('organization_id', organizationId)
        .eq('profile_id', profileId)
        .or(`effective_until.is.null,effective_until.gt.${now}`),
      supabase
        .from('internal_permission_grants')
        .select('action,resource_type,resource_id')
        .eq('organization_id', organizationId)
        .eq('profile_id', profileId)
        .is('revoked_at', null)
        .lte('effective_from', now)
        .or(`effective_until.is.null,effective_until.gt.${now}`),
      supabase
        .from('project_access_grants')
        .select('project_id,action')
        .eq('organization_id', organizationId)
        .eq('profile_id', profileId)
        .is('revoked_at', null)
        .lte('effective_from', now)
        .or(`effective_until.is.null,effective_until.gt.${now}`),
      supabase
        .from('temporary_access_grants')
        .select('action,resource_type,resource_id')
        .eq('organization_id', organizationId)
        .eq('profile_id', profileId)
        .is('revoked_at', null)
        .lte('effective_from', now)
        .gt('effective_until', now),
      supabase
        .from('internal_permission_denies')
        .select('action,resource_type,resource_id,effective_from,effective_until,reason')
        .eq('organization_id', organizationId)
        .eq('profile_id', profileId)
        .is('revoked_at', null)
        .lte('effective_from', now)
        .or(`effective_until.is.null,effective_until.gt.${now}`),
      supabase
        .from('authority_relationships')
        .select('relationship_type,target_profile_id,action,resource_type,resource_id,effective_from,effective_until,reason')
        .eq('organization_id', organizationId)
        .eq('source_profile_id', profileId)
        .is('revoked_at', null)
        .lte('effective_from', now)
        .or(`effective_until.is.null,effective_until.gt.${now}`)
    ]);

  const activeMemberships = (membershipResult.data ?? []).filter((row: any) =>
    row.internal_role &&
    !row.suspended_at &&
    (!row.effective_from || new Date(row.effective_from) <= nowDate) &&
    (!row.effective_until || new Date(row.effective_until) > nowDate)
  );
  if (!activeMemberships.length) return null;

  const internalRoles = [...new Set(activeMemberships.map((row: any) => row.internal_role as InternalRole))];
  const explicitGrants: PermissionAction[] = [];
  const scopedGrants: ScopedPermissionGrant[] = [];

  for (const row of (grantResult.data ?? []) as any[]) {
    if (!row.resource_type && !row.resource_id) explicitGrants.push(row.action as PermissionAction);
    else scopedGrants.push({ action: row.action as PermissionAction, ...resourceScope(row.resource_type, row.resource_id) });
  }
  for (const row of (projectGrantResult.data ?? []) as any[]) {
    scopedGrants.push({ action: row.action as PermissionAction, projectId: String(row.project_id) });
  }
  for (const row of (temporaryResult.data ?? []) as any[]) {
    scopedGrants.push({ action: row.action as PermissionAction, ...resourceScope(row.resource_type, row.resource_id) });
  }

  const explicitDenies: ScopedPermissionDeny[] = (denyResult.data ?? []).map((row: any) => ({
    action: row.action as PermissionAction,
    ...resourceScope(row.resource_type, row.resource_id),
    effectiveFrom: row.effective_from ? new Date(row.effective_from) : undefined,
    effectiveUntil: row.effective_until ? new Date(row.effective_until) : undefined,
    reason: row.reason ?? undefined
  }));
  const authorityRelationships: AuthorityRelationship[] = (relationshipResult.data ?? []).map((row: any) => ({
    type: row.relationship_type as AuthorityRelationship['type'],
    targetProfileId: row.target_profile_id ?? undefined,
    action: row.action ? (row.action as PermissionAction) : undefined,
    ...resourceScope(row.resource_type, row.resource_id),
    effectiveFrom: row.effective_from ? new Date(row.effective_from) : undefined,
    effectiveUntil: row.effective_until ? new Date(row.effective_until) : undefined,
    reason: row.reason ?? undefined
  }));

  return {
    organizationId,
    internalRoles,
    clientMemberships: [],
    projectIds: [...new Set((projectResult.data ?? []).map((row: any) => String(row.project_id)))],
    explicitGrants: [...new Set(explicitGrants)],
    scopedGrants,
    explicitDenies,
    authorityRelationships,
    breakGlassGrants: [],
    mfa: false
  };
}

export async function simulateAuthorityDecision(
  _prev: AuthoritySimulationState,
  form: FormData
): Promise<AuthoritySimulationState> {
  const supabase = await getServerSupabase();
  if (!supabase) return { ok: false, error: 'not_configured' };
  const owner = await getAuthContext(supabase);
  if (!owner || !isKspIncOwner(owner)) return { ok: false, error: 'owner_access_required' };

  const profileId = asUuid(form.get('profileId'));
  const projectId = asUuid(form.get('projectId'));
  const resourceOwnerId = asUuid(form.get('resourceOwnerId'));
  const action = String(form.get('action') ?? '').trim() as PermissionAction;
  const rawClassification = String(form.get('classification') ?? 'internal') as Classification;
  if (!profileId || !action || !classifications.has(rawClassification)) {
    return { ok: false, error: 'Choose a valid identity, action and classification.' };
  }

  const subject = await buildSubjectContext(supabase, owner.organizationId, profileId);
  if (!subject) return { ok: false, error: 'The selected identity has no active internal membership.' };

  // Simulation is intentionally conservative about the subject session. It does
  // not impersonate them or inherit the owner's AAL2 session. Setting MFA=false
  // means the result will surface step-up requirements for sensitive actions.
  const decision = canPerform(subject, action, {
    organizationId: owner.organizationId,
    projectId: projectId ?? undefined,
    resourceType: projectId ? 'project' : undefined,
    id: projectId ?? undefined,
    ownerId: resourceOwnerId ?? undefined,
    assignedProfileIds: resourceOwnerId ? [resourceOwnerId] : undefined,
    classification: rawClassification
  });

  return {
    ok: true,
    allowed: decision.allowed,
    reason: decision.reason,
    approvalRequired: decision.approvalRequired,
    outcome: decision.outcome,
    trace: decision.trace
  };
}
