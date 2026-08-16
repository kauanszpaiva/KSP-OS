import type { ClientRole, SupabaseClient } from '@ksp/database';
import type { MembershipContext } from '@ksp/permissions';
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
 * active client_memberships rather than organization_memberships. Returns
 * null when unauthenticated or without any active client membership
 * (suspended, expired, or none at all) — the caller decides where that
 * routes to (sign-in vs. a "no active access" notice), same split as the
 * Command app's requireSession.
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
  const memberships: PortalMembership[] = active.map((m) => ({ clientOrganizationId: m.client_organization_id, role: m.role }));

  const mfa = await getSessionAal(supabase);

  const membership: MembershipContext = {
    organizationId,
    internalRoles: [],
    clientMemberships: memberships.map((m) => ({ clientOrganizationId: m.clientOrganizationId, role: m.role })),
    projectIds: [],
    explicitGrants: [],
    mfa
  };

  return { user, organizationId, memberships, membership };
}
