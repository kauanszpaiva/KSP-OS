import { cookies } from 'next/headers';
import {
  getAuthContext,
  getPortalAuthContext,
  isKspIncOwner,
  type AuthContext,
  type PortalAuthContext,
  type SessionUser
} from '@ksp/auth';
import type { ClientRole, SupabaseClient } from '@ksp/database';
import type { MembershipContext, PermissionAction, ScopedPermissionGrant } from '@ksp/permissions';

export const PORTAL_VIEW_AS_COOKIE = 'ksp_portal_view_as';
export const PORTAL_VIEW_AS_TTL_SECONDS = 15 * 60;

export interface PortalViewAsCookiePayload {
  profileId: string;
  clientOrganizationId: string;
  reason: string;
  startedAt: string;
  expiresAt: string;
}

export interface PortalViewAsTarget {
  profileId: string;
  displayName: string;
  email: string;
  clientOrganizationId: string;
  clientName: string;
  role: ClientRole;
}

export interface ActivePortalViewAs extends PortalViewAsTarget {
  reason: string;
  startedAt: string;
  expiresAt: string;
}

export interface EffectivePortalSession {
  context: PortalAuthContext;
  actor: SessionUser;
  owner: boolean;
  viewAs: ActivePortalViewAs | null;
}

function emptyPortalContext(actor: SessionUser, organizationId: string): PortalAuthContext {
  const membership: MembershipContext = {
    organizationId,
    internalRoles: [],
    clientMemberships: [],
    projectIds: [],
    explicitGrants: [],
    scopedGrants: [],
    mfa: false
  };

  return {
    user: actor,
    organizationId,
    memberships: [],
    membership
  };
}

function parseCookie(raw: string | undefined): PortalViewAsCookiePayload | null {
  if (!raw) return null;
  try {
    const payload = JSON.parse(Buffer.from(raw, 'base64url').toString('utf8')) as Partial<PortalViewAsCookiePayload>;
    if (
      typeof payload.profileId !== 'string' ||
      typeof payload.clientOrganizationId !== 'string' ||
      typeof payload.reason !== 'string' ||
      typeof payload.startedAt !== 'string' ||
      typeof payload.expiresAt !== 'string'
    ) {
      return null;
    }
    if (Date.parse(payload.expiresAt) <= Date.now()) return null;
    return payload as PortalViewAsCookiePayload;
  } catch {
    return null;
  }
}

export function encodePortalViewAsCookie(payload: PortalViewAsCookiePayload): string {
  return Buffer.from(JSON.stringify(payload), 'utf8').toString('base64url');
}

export async function readPortalViewAsCookie(): Promise<PortalViewAsCookiePayload | null> {
  const store = await cookies();
  return parseCookie(store.get(PORTAL_VIEW_AS_COOKIE)?.value);
}

async function activeOwnerContext(supabase: SupabaseClient): Promise<AuthContext | null> {
  const ctx = await getAuthContext(supabase);
  if (!ctx || !isKspIncOwner(ctx)) return null;
  return ctx;
}

export async function listPortalViewAsTargets(supabase: SupabaseClient): Promise<PortalViewAsTarget[]> {
  const owner = await activeOwnerContext(supabase);
  if (!owner) return [];

  const now = new Date();
  const { data: membershipRows } = await supabase
    .from('client_memberships')
    .select('client_organization_id, profile_id, role, effective_from, effective_until, suspended_at')
    .eq('organization_id', owner.organizationId)
    .is('suspended_at', null);

  const memberships = ((membershipRows ?? []) as Array<{
    client_organization_id: string;
    profile_id: string;
    role: ClientRole;
    effective_from: string | null;
    effective_until: string | null;
    suspended_at: string | null;
  }>).filter((row) =>
    (!row.effective_from || new Date(row.effective_from) <= now) &&
    (!row.effective_until || new Date(row.effective_until) > now)
  );

  if (memberships.length === 0) return [];

  const profileIds = [...new Set(memberships.map((row) => row.profile_id))];
  const clientIds = [...new Set(memberships.map((row) => row.client_organization_id))];
  const [{ data: profiles }, { data: clients }] = await Promise.all([
    supabase.from('profiles').select('id, display_name, email, status').in('id', profileIds),
    supabase.from('client_organizations').select('id, display_name, status, archived_at').in('id', clientIds)
  ]);

  const profileById = new Map(
    ((profiles ?? []) as Array<{ id: string; display_name: string; email: string; status: string }>).map((row) => [row.id, row])
  );
  const clientById = new Map(
    ((clients ?? []) as Array<{ id: string; display_name: string; status: string; archived_at: string | null }>).map((row) => [row.id, row])
  );

  return memberships.flatMap((membership): PortalViewAsTarget[] => {
    const profile = profileById.get(membership.profile_id);
    const client = clientById.get(membership.client_organization_id);
    if (!profile || profile.status !== 'active' || !profile.email) return [];
    if (!client || client.status !== 'active' || client.archived_at) return [];
    return [{
      profileId: profile.id,
      displayName: profile.display_name,
      email: profile.email,
      clientOrganizationId: client.id,
      clientName: client.display_name,
      role: membership.role
    }];
  }).sort((a, b) => a.clientName.localeCompare(b.clientName) || a.displayName.localeCompare(b.displayName));
}

export async function resolvePortalViewAsContext(
  supabase: SupabaseClient,
  owner: AuthContext,
  payload: PortalViewAsCookiePayload
): Promise<{ context: PortalAuthContext; target: ActivePortalViewAs } | null> {
  const now = new Date();
  if (Date.parse(payload.expiresAt) <= now.getTime()) return null;

  const [{ data: profile }, { data: client }, { data: membershipRow }] = await Promise.all([
    supabase
      .from('profiles')
      .select('id, display_name, email, status')
      .eq('id', payload.profileId)
      .eq('status', 'active')
      .maybeSingle(),
    supabase
      .from('client_organizations')
      .select('id, display_name, status, archived_at')
      .eq('id', payload.clientOrganizationId)
      .eq('organization_id', owner.organizationId)
      .eq('status', 'active')
      .is('archived_at', null)
      .maybeSingle(),
    supabase
      .from('client_memberships')
      .select('client_organization_id, profile_id, role, effective_from, effective_until, suspended_at')
      .eq('organization_id', owner.organizationId)
      .eq('profile_id', payload.profileId)
      .eq('client_organization_id', payload.clientOrganizationId)
      .is('suspended_at', null)
      .maybeSingle()
  ]);

  const membership = membershipRow as {
    client_organization_id: string;
    profile_id: string;
    role: ClientRole;
    effective_from: string | null;
    effective_until: string | null;
    suspended_at: string | null;
  } | null;

  if (!profile || !client || !membership) return null;
  if (membership.effective_from && new Date(membership.effective_from) > now) return null;
  if (membership.effective_until && new Date(membership.effective_until) <= now) return null;

  const clientOrganizationId = payload.clientOrganizationId;
  const nowIso = now.toISOString();
  const [{ data: projectGrants }, { data: permissionGrants }] = await Promise.all([
    supabase
      .from('project_access_grants')
      .select('project_id, client_organization_id, profile_id, action, effective_from, effective_until, revoked_at')
      .eq('organization_id', owner.organizationId)
      .eq('client_organization_id', clientOrganizationId)
      .eq('action', 'project.read')
      .is('revoked_at', null)
      .lte('effective_from', nowIso)
      .or(`effective_until.is.null,effective_until.gt.${nowIso}`),
    supabase
      .from('client_permission_grants')
      .select('action, client_organization_id, project_id, profile_id, effective_from, effective_until, revoked_at')
      .eq('organization_id', owner.organizationId)
      .eq('client_organization_id', clientOrganizationId)
      .eq('profile_id', payload.profileId)
      .is('revoked_at', null)
      .lte('effective_from', nowIso)
      .or(`effective_until.is.null,effective_until.gt.${nowIso}`)
  ]);

  const projectIds = ((projectGrants ?? []) as Array<{
    project_id: string;
    profile_id: string | null;
  }>).filter((row) => row.profile_id === null || row.profile_id === payload.profileId).map((row) => row.project_id);

  const scopedGrants: ScopedPermissionGrant[] = ((permissionGrants ?? []) as Array<{
    action: PermissionAction;
    client_organization_id: string;
    project_id: string | null;
  }>).map((row) => ({
    action: row.action,
    clientOrganizationId: row.client_organization_id,
    projectId: row.project_id ?? undefined
  }));

  const effectiveMembership: MembershipContext = {
    organizationId: owner.organizationId,
    internalRoles: [],
    clientMemberships: [{ clientOrganizationId, role: membership.role }],
    projectIds: [...new Set(projectIds)],
    explicitGrants: [],
    scopedGrants,
    mfa: false
  };

  const targetUser: SessionUser = {
    id: String(profile.id),
    displayName: String(profile.display_name),
    email: String(profile.email)
  };

  return {
    context: {
      user: targetUser,
      organizationId: owner.organizationId,
      memberships: [{ clientOrganizationId, role: membership.role }],
      membership: effectiveMembership
    },
    target: {
      profileId: targetUser.id,
      displayName: targetUser.displayName,
      email: targetUser.email,
      clientOrganizationId,
      clientName: String(client.display_name),
      role: membership.role,
      reason: payload.reason,
      startedAt: payload.startedAt,
      expiresAt: payload.expiresAt
    }
  };
}

export async function getEffectivePortalSession(supabase: SupabaseClient): Promise<EffectivePortalSession | null> {
  const [naturalPortalContext, ownerContext, payload] = await Promise.all([
    getPortalAuthContext(supabase),
    activeOwnerContext(supabase),
    readPortalViewAsCookie()
  ]);

  if (ownerContext && payload) {
    const resolved = await resolvePortalViewAsContext(supabase, ownerContext, payload);
    if (resolved) {
      return {
        context: resolved.context,
        actor: ownerContext.user,
        owner: true,
        viewAs: resolved.target
      };
    }
  }

  if (naturalPortalContext) {
    return {
      context: naturalPortalContext,
      actor: naturalPortalContext.user,
      owner: Boolean(ownerContext),
      viewAs: null
    };
  }

  if (ownerContext) {
    return {
      context: emptyPortalContext(ownerContext.user, ownerContext.organizationId),
      actor: ownerContext.user,
      owner: true,
      viewAs: null
    };
  }

  return null;
}

export async function isPortalViewAsActive(supabase: SupabaseClient): Promise<boolean> {
  return Boolean((await getEffectivePortalSession(supabase))?.viewAs);
}
