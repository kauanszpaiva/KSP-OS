import type { SupabaseClient } from '@ksp/database';
import type {
  AuthorityRelationship,
  BreakGlassGrant,
  InternalRole,
  MembershipContext,
  PermissionAction,
  ScopedPermissionDeny,
  ScopedPermissionGrant
} from '@ksp/permissions';

export interface SessionUser {
  id: string;
  email: string;
  displayName: string;
}

export interface AuthContext {
  user: SessionUser;
  organizationId: string;
  internalRoles: InternalRole[];
  mfa: boolean;
  membership: MembershipContext;
}

/** Resolve the signed-in user, or null when there is no valid session. */
export async function getSessionUser(supabase: SupabaseClient): Promise<SessionUser | null> {
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) return null;
  const { data: profile } = await supabase
    .from('profiles')
    .select('display_name, email')
    .eq('id', data.user.id)
    .maybeSingle();
  return {
    id: data.user.id,
    email: profile?.email ?? data.user.email ?? '',
    displayName: profile?.display_name ?? data.user.email ?? 'Member'
  };
}

/**
 * Whether the current session has actually completed step-up (MFA)
 * verification, per Supabase's Authenticator Assurance Level — NOT whether
 * the account has a factor enrolled. `currentLevel === 'aal2'` means the
 * session itself presented a second factor; `aal1` means it did not, even if
 * `nextLevel` reports a factor is available. Callers gating sensitive
 * actions must check `currentLevel`, never assume assurance from session
 * presence alone.
 */
export async function getSessionAal(supabase: SupabaseClient): Promise<boolean> {
  const { data, error } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
  if (error || !data) return false;
  return data.currentLevel === 'aal2';
}

function scopedResource(resourceType: string | null, resourceId: string | null): Partial<ScopedPermissionGrant> {
  if (!resourceType || !resourceId) return {};
  if (resourceType === 'project') return { projectId: resourceId };
  if (resourceType === 'client_organization') return { clientOrganizationId: resourceId };
  return { resourceType, resourceId };
}

/**
 * Build the full authorization context for the signed-in user: their org,
 * internal roles, MFA state, project assignments, persisted grants, explicit
 * denies, directional authority relationships and canonical scoped delegations.
 *
 * Only genuinely organization-wide grants are placed in `explicitGrants`.
 * Resource-bound rows remain in `scopedGrants`; flattening them would turn a
 * one-project entitlement into authority across the whole KSP organization.
 */
export async function getAuthContext(supabase: SupabaseClient): Promise<AuthContext | null> {
  const user = await getSessionUser(supabase);
  if (!user) return null;

  const nowDate = new Date();
  const now = nowDate.toISOString();
  const { data: memberships } = await supabase
    .from('organization_memberships')
    .select('organization_id, internal_role, effective_from, effective_until, suspended_at')
    .eq('profile_id', user.id);

  const active = (memberships ?? []).filter(
    (m: {
      internal_role: string | null;
      suspended_at: string | null;
      effective_from: string | null;
      effective_until: string | null;
    }) =>
      m.internal_role &&
      !m.suspended_at &&
      (!m.effective_from || new Date(m.effective_from) <= nowDate) &&
      (!m.effective_until || new Date(m.effective_until) > nowDate)
  );
  if (active.length === 0) return null;

  const organizationId = active[0].organization_id as string;
  const internalRoles = [
    ...new Set(active.filter((m: any) => m.organization_id === organizationId).map((m: any) => m.internal_role as InternalRole))
  ];

  const [
    projectMembershipResult,
    internalGrantResult,
    projectGrantResult,
    temporaryGrantResult,
    denyResult,
    relationshipResult,
    delegationResult,
    breakGlassResult,
    mfa
  ] = await Promise.all([
    supabase
      .from('project_memberships')
      .select('project_id')
      .eq('organization_id', organizationId)
      .eq('profile_id', user.id)
      .or(`effective_until.is.null,effective_until.gt.${now}`),
    supabase
      .from('internal_permission_grants')
      .select('action, resource_type, resource_id')
      .eq('organization_id', organizationId)
      .eq('profile_id', user.id)
      .is('revoked_at', null)
      .lte('effective_from', now)
      .or(`effective_until.is.null,effective_until.gt.${now}`),
    supabase
      .from('project_access_grants')
      .select('project_id, action')
      .eq('organization_id', organizationId)
      .eq('profile_id', user.id)
      .is('revoked_at', null)
      .lte('effective_from', now)
      .or(`effective_until.is.null,effective_until.gt.${now}`),
    supabase
      .from('temporary_access_grants')
      .select('action, resource_type, resource_id')
      .eq('organization_id', organizationId)
      .eq('profile_id', user.id)
      .is('revoked_at', null)
      .lte('effective_from', now)
      .gt('effective_until', now),
    supabase
      .from('internal_permission_denies')
      .select('action, resource_type, resource_id, effective_from, effective_until, reason')
      .eq('organization_id', organizationId)
      .eq('profile_id', user.id)
      .is('revoked_at', null)
      .lte('effective_from', now)
      .or(`effective_until.is.null,effective_until.gt.${now}`),
    supabase
      .from('authority_relationships')
      .select(
        'relationship_type, target_profile_id, action, resource_type, resource_id, effective_from, effective_until, reason'
      )
      .eq('organization_id', organizationId)
      .eq('source_profile_id', user.id)
      .is('revoked_at', null)
      .lte('effective_from', now)
      .or(`effective_until.is.null,effective_until.gt.${now}`),
    supabase
      .from('delegations')
      .select('delegator_id, action, resource_type, resource_id, effective_from, effective_until')
      .eq('organization_id', organizationId)
      .eq('delegate_id', user.id)
      .not('resource_type', 'is', null)
      .not('resource_id', 'is', null)
      .is('revoked_at', null)
      .lte('effective_from', now)
      .gt('effective_until', now),
    supabase
      .from('access_break_glass_sessions')
      .select('id, action, resource_type, resource_id, effective_until, reason')
      .eq('organization_id', organizationId)
      .eq('profile_id', user.id)
      .is('revoked_at', null)
      .lte('effective_from', now)
      .gt('effective_until', now),
    getSessionAal(supabase)
  ]);

  const projectIds = (projectMembershipResult.data ?? []).map((r: { project_id: string }) => r.project_id);
  const explicitGrants: PermissionAction[] = [];
  const scopedGrants: ScopedPermissionGrant[] = [];

  for (const row of (internalGrantResult.data ?? []) as Array<{
    action: PermissionAction;
    resource_type: string | null;
    resource_id: string | null;
  }>) {
    if (!row.resource_type && !row.resource_id) {
      explicitGrants.push(row.action);
      continue;
    }
    scopedGrants.push({ action: row.action, ...scopedResource(row.resource_type, row.resource_id) });
  }

  for (const row of (projectGrantResult.data ?? []) as Array<{ project_id: string; action: PermissionAction }>) {
    scopedGrants.push({ action: row.action, projectId: row.project_id });
  }

  for (const row of (temporaryGrantResult.data ?? []) as Array<{
    action: PermissionAction;
    resource_type: string;
    resource_id: string;
  }>) {
    scopedGrants.push({ action: row.action, ...scopedResource(row.resource_type, row.resource_id) });
  }

  const explicitDenies: ScopedPermissionDeny[] = (denyResult.data ?? []).map((row: any) => ({
    action: row.action as PermissionAction,
    ...scopedResource(row.resource_type, row.resource_id),
    effectiveFrom: row.effective_from ? new Date(row.effective_from) : undefined,
    effectiveUntil: row.effective_until ? new Date(row.effective_until) : undefined,
    reason: row.reason ?? undefined
  }));

  const authorityRelationships: AuthorityRelationship[] = [
    ...(relationshipResult.data ?? []).map((row: any) => ({
      type: row.relationship_type as AuthorityRelationship['type'],
      targetProfileId: row.target_profile_id ?? undefined,
      action: row.action ? (row.action as PermissionAction) : undefined,
      ...scopedResource(row.resource_type, row.resource_id),
      effectiveFrom: row.effective_from ? new Date(row.effective_from) : undefined,
      effectiveUntil: row.effective_until ? new Date(row.effective_until) : undefined,
      reason: row.reason ?? undefined
    })),
    ...(delegationResult.data ?? []).map((row: any) => ({
      type: 'delegated_by' as const,
      targetProfileId: row.delegator_id ? String(row.delegator_id) : undefined,
      action: row.action as PermissionAction,
      ...scopedResource(row.resource_type, row.resource_id),
      effectiveFrom: row.effective_from ? new Date(row.effective_from) : undefined,
      effectiveUntil: row.effective_until ? new Date(row.effective_until) : undefined,
      reason: 'canonical_delegation'
    }))
  ];

  const breakGlassGrants: BreakGlassGrant[] = (breakGlassResult.data ?? []).map((row: any) => ({
    id: String(row.id),
    action: row.action as PermissionAction,
    ...scopedResource(row.resource_type, row.resource_id),
    effectiveUntil: new Date(row.effective_until),
    reason: String(row.reason)
  }));

  const membership: MembershipContext = {
    organizationId,
    internalRoles,
    clientMemberships: [],
    projectIds: [...new Set(projectIds)],
    explicitGrants: [...new Set(explicitGrants)],
    scopedGrants,
    explicitDenies,
    authorityRelationships,
    breakGlassGrants,
    mfa
  };

  return { user, organizationId, internalRoles, mfa, membership };
}
