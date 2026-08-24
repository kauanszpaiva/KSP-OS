import type { ClientRole, SupabaseClient } from '@ksp/database';
import type { MembershipContext, PermissionAction, ScopedPermissionGrant } from '@ksp/permissions';
import { getSessionAal, getSessionUser, type SessionUser } from './context';

export interface PortalMembership {
  clientOrganizationId: string;
  role: ClientRole;
}

export interface PortalAuthContext {
  user: SessionUser;
  organizationId: string;
  memberships: PortalMembership[];
  membership: MembershipContext;
}

/**
 * Client-portal equivalent of getAuthContext: resolves the signed-in user's
 * active client memberships plus the concrete Portal projects and scoped
 * permission rows that are effective for that client identity.
 */
export async function getPortalAuthContext(supabase: SupabaseClient): Promise<PortalAuthContext | null> {
  const user = await getSessionUser(supabase);
  if (!user) return null;

  const { data: rows } = await supabase
    .from('client_memberships')
    .select('organization_id, client_organization_id, role, effective_until, suspended_at')
    .eq('profile_id', user.id);

  const active = (
    (rows ?? []) as Array<{
      organization_id: string;
      client_organization_id: string;
      role: ClientRole;
      effective_until: string | null;
      suspended_at: string | null;
    }>
  ).filter((m) => !m.suspended_at && (!m.effective_until || new Date(m.effective_until) > new Date()));
  if (active.length === 0) return null;

  const organizationId = active[0].organization_id;
  const memberships: PortalMembership[] = active
    .filter((m) => m.organization_id === organizationId)
    .map((m) => ({ clientOrganizationId: m.client_organization_id, role: m.role }));
  const now = new Date().toISOString();

  // Do not derive Portal scope from a generic `projects` SELECT: a person may
  // legitimately have both internal and client identities, and the internal
  // projects_member_read policy would then widen this list. `portal_visible_projects`
  // is the canonical Portal-only projection backed by project_access_grants +
  // active client membership.
  const [projectResult, grantResult, mfa] = await Promise.all([
    supabase.rpc('portal_visible_projects'),
    supabase
      .from('client_permission_grants')
      .select('action, client_organization_id, project_id')
      .eq('organization_id', organizationId)
      .eq('profile_id', user.id)
      .is('revoked_at', null)
      .lte('effective_from', now)
      .or(`effective_until.is.null,effective_until.gt.${now}`),
    getSessionAal(supabase)
  ]);

  const projectIds = ((projectResult.data ?? []) as Array<{ id: string }>).map((row) => row.id);
  const scopedGrants: ScopedPermissionGrant[] = (
    (grantResult.data ?? []) as Array<{
      action: PermissionAction;
      client_organization_id: string;
      project_id: string | null;
    }>
  ).map((row) => ({
    action: row.action,
    clientOrganizationId: row.client_organization_id,
    projectId: row.project_id ?? undefined
  }));

  const membership: MembershipContext = {
    organizationId,
    internalRoles: [],
    clientMemberships: memberships.map((m) => ({ clientOrganizationId: m.clientOrganizationId, role: m.role })),
    projectIds: [...new Set(projectIds)],
    explicitGrants: [],
    scopedGrants,
    mfa
  };

  return { user, organizationId, memberships, membership };
}
