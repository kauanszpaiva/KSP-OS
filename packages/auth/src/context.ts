import type { SupabaseClient } from '@ksp/database';
import type { InternalRole, MembershipContext, PermissionAction, ScopedPermissionGrant } from '@ksp/permissions';
import { createProfileAvatarUrl } from './profile';

export interface SessionUser {
  id: string;
  email: string;
  displayName: string;
  avatarUrl: string | null;
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
    .select('display_name, email, avatar_path')
    .eq('id', data.user.id)
    .maybeSingle();
  return {
    id: data.user.id,
    email: profile?.email ?? data.user.email ?? '',
    displayName: profile?.display_name ?? data.user.email ?? 'Member',
    avatarUrl: await createProfileAvatarUrl(supabase, profile?.avatar_path)
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

/**
 * Build the full authorization context for the signed-in user: their org,
 * internal roles, MFA state, project assignments, and persisted grants.
 *
 * Only genuinely organization-wide grants are placed in `explicitGrants`.
 * Resource-bound rows remain in `scopedGrants`; flattening them would turn a
 * one-project entitlement into authority across the whole KSP organization.
 */
export async function getAuthContext(supabase: SupabaseClient): Promise<AuthContext | null> {
  const user = await getSessionUser(supabase);
  if (!user) return null;

  const { data: memberships } = await supabase
    .from('organization_memberships')
    .select('organization_id, internal_role, effective_until, suspended_at')
    .eq('profile_id', user.id);

  const active = (memberships ?? []).filter(
    (m: { internal_role: string | null; suspended_at: string | null; effective_until: string | null }) =>
      m.internal_role && !m.suspended_at && (!m.effective_until || new Date(m.effective_until) > new Date())
  );
  if (active.length === 0) return null;

  const organizationId = active[0].organization_id as string;
  const internalRoles = [
    ...new Set(active.filter((m: any) => m.organization_id === organizationId).map((m: any) => m.internal_role as InternalRole))
  ];
  const now = new Date().toISOString();

  const [projectMembershipResult, internalGrantResult, projectGrantResult, temporaryGrantResult, mfa] = await Promise.all([
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
    getSessionAal(supabase)
  ]);

  const projectIds = (projectMembershipResult.data ?? []).map((r: { project_id: string }) => r.project_id);
  const explicitGrants: PermissionAction[] = [];
  const scopedGrants: ScopedPermissionGrant[] = [];

  for (const row of (internalGrantResult.data ?? []) as Array<{ action: PermissionAction; resource_type: string | null; resource_id: string | null }>) {
    if (!row.resource_type && !row.resource_id) {
      explicitGrants.push(row.action);
      continue;
    }
    if (row.resource_type === 'project' && row.resource_id) {
      scopedGrants.push({ action: row.action, projectId: row.resource_id });
      continue;
    }
    scopedGrants.push({
      action: row.action,
      resourceType: row.resource_type ?? undefined,
      resourceId: row.resource_id ?? undefined
    });
  }

  for (const row of (projectGrantResult.data ?? []) as Array<{ project_id: string; action: PermissionAction }>) {
    scopedGrants.push({ action: row.action, projectId: row.project_id });
  }

  for (const row of (temporaryGrantResult.data ?? []) as Array<{ action: PermissionAction; resource_type: string; resource_id: string }>) {
    if (row.resource_type === 'project') {
      scopedGrants.push({ action: row.action, projectId: row.resource_id });
      continue;
    }
    scopedGrants.push({
      action: row.action,
      resourceType: row.resource_type,
      resourceId: row.resource_id
    });
  }

  const membership: MembershipContext = {
    organizationId,
    internalRoles,
    clientMemberships: [],
    projectIds: [...new Set(projectIds)],
    explicitGrants: [...new Set(explicitGrants)],
    scopedGrants,
    mfa
  };

  return { user, organizationId, internalRoles, mfa, membership };
}
