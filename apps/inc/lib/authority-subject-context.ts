import type { SupabaseClient } from '@ksp/database';
import type {
  AuthorityRelationship,
  InternalRole,
  MembershipContext,
  PermissionAction,
  ScopedPermissionDeny,
  ScopedPermissionGrant
} from '@ksp/permissions';

function resourceScope(resourceType: string | null, resourceId: string | null): Partial<ScopedPermissionGrant> {
  if (!resourceType || !resourceId) return {};
  if (resourceType === 'project') return { projectId: resourceId };
  if (resourceType === 'client_organization') return { clientOrganizationId: resourceId };
  return { resourceType, resourceId };
}

/**
 * Builds a stored-policy context for a different internal identity without
 * impersonating that person or borrowing the owner's session assurance.
 *
 * Deliberately excluded:
 * - break-glass sessions: emergency authority must never become delegable;
 * - inbound delegations: delegated authority cannot be re-delegated by default;
 * - owner MFA state: a simulator/admin operation is not the subject's session.
 */
export async function buildInternalSubjectContext(
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
    internalRoles: [...new Set(activeMemberships.map((row: any) => row.internal_role as InternalRole))],
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
