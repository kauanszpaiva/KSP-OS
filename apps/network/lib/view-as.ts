import { cookies } from 'next/headers';
import {
  getAuthContext,
  getPartnerAuthContext,
  isKspIncOwner,
  type AuthContext,
  type PartnerAuthContext,
  type PartnerRole,
  type SessionUser
} from '@ksp/auth';
import type { SupabaseClient } from '@ksp/database';

export const NETWORK_VIEW_AS_COOKIE = 'ksp_network_view_as';
export const NETWORK_VIEW_AS_TTL_SECONDS = 15 * 60;

export interface NetworkViewAsCookiePayload {
  profileId: string;
  partnerOrganizationId: string;
  reason: string;
  startedAt: string;
  expiresAt: string;
}

export interface NetworkViewAsTarget {
  profileId: string;
  displayName: string;
  email: string;
  partnerOrganizationId: string;
  partnerOrganizationName: string;
  businessUnitId: string | null;
  role: PartnerRole;
}

export interface ActiveNetworkViewAs extends NetworkViewAsTarget {
  reason: string;
  startedAt: string;
  expiresAt: string;
}

export interface EffectiveNetworkSession {
  context: PartnerAuthContext | null;
  actor: SessionUser;
  owner: boolean;
  viewAs: ActiveNetworkViewAs | null;
}

function parseCookie(raw: string | undefined): NetworkViewAsCookiePayload | null {
  if (!raw) return null;
  try {
    const payload = JSON.parse(
      Buffer.from(raw, 'base64url').toString('utf8')
    ) as Partial<NetworkViewAsCookiePayload>;

    if (
      typeof payload.profileId !== 'string' ||
      typeof payload.partnerOrganizationId !== 'string' ||
      typeof payload.reason !== 'string' ||
      typeof payload.startedAt !== 'string' ||
      typeof payload.expiresAt !== 'string'
    ) {
      return null;
    }

    if (Date.parse(payload.expiresAt) <= Date.now()) return null;
    return payload as NetworkViewAsCookiePayload;
  } catch {
    return null;
  }
}

export function encodeNetworkViewAsCookie(
  payload: NetworkViewAsCookiePayload
): string {
  return Buffer.from(JSON.stringify(payload), 'utf8').toString('base64url');
}

export async function readNetworkViewAsCookie(): Promise<NetworkViewAsCookiePayload | null> {
  const store = await cookies();
  return parseCookie(store.get(NETWORK_VIEW_AS_COOKIE)?.value);
}

async function activeOwnerContext(
  supabase: SupabaseClient
): Promise<AuthContext | null> {
  const ctx = await getAuthContext(supabase);
  if (!ctx || !isKspIncOwner(ctx)) return null;
  return ctx;
}

export async function listNetworkViewAsTargets(
  supabase: SupabaseClient
): Promise<NetworkViewAsTarget[]> {
  const owner = await activeOwnerContext(supabase);
  if (!owner) return [];

  const now = new Date();
  const { data: membershipRows } = await supabase
    .from('partner_memberships')
    .select(
      'partner_organization_id,profile_id,role,effective_from,effective_until,suspended_at'
    )
    .eq('organization_id', owner.organizationId)
    .is('suspended_at', null);

  const memberships = (
    (membershipRows ?? []) as Array<{
      partner_organization_id: string;
      profile_id: string;
      role: PartnerRole;
      effective_from: string | null;
      effective_until: string | null;
      suspended_at: string | null;
    }>
  ).filter(
    (row) =>
      (!row.effective_from || new Date(row.effective_from) <= now) &&
      (!row.effective_until || new Date(row.effective_until) > now)
  );

  if (memberships.length === 0) return [];

  const profileIds = [...new Set(memberships.map((row) => row.profile_id))];
  const partnerIds = [
    ...new Set(memberships.map((row) => row.partner_organization_id))
  ];

  const [{ data: profiles }, { data: partners }] = await Promise.all([
    supabase
      .from('profiles')
      .select('id,display_name,email,status')
      .in('id', profileIds),
    supabase
      .from('partner_organizations')
      .select('id,display_name,business_unit_id,status')
      .in('id', partnerIds)
  ]);

  const profileById = new Map(
    (
      (profiles ?? []) as Array<{
        id: string;
        display_name: string;
        email: string;
        status: string;
      }>
    ).map((row) => [row.id, row])
  );
  const partnerById = new Map(
    (
      (partners ?? []) as Array<{
        id: string;
        display_name: string;
        business_unit_id: string | null;
        status: string;
      }>
    ).map((row) => [row.id, row])
  );

  return memberships
    .flatMap((membership): NetworkViewAsTarget[] => {
      const profile = profileById.get(membership.profile_id);
      const partner = partnerById.get(membership.partner_organization_id);

      if (!profile || profile.status !== 'active' || !profile.email) return [];
      if (!partner || partner.status !== 'active') return [];

      return [
        {
          profileId: profile.id,
          displayName: profile.display_name,
          email: profile.email,
          partnerOrganizationId: partner.id,
          partnerOrganizationName: partner.display_name,
          businessUnitId: partner.business_unit_id ?? null,
          role: membership.role
        }
      ];
    })
    .sort(
      (a, b) =>
        a.partnerOrganizationName.localeCompare(b.partnerOrganizationName) ||
        a.displayName.localeCompare(b.displayName)
    );
}

export async function resolveNetworkViewAsContext(
  supabase: SupabaseClient,
  owner: AuthContext,
  payload: NetworkViewAsCookiePayload
): Promise<{
  context: PartnerAuthContext;
  target: ActiveNetworkViewAs;
} | null> {
  const now = new Date();
  if (Date.parse(payload.expiresAt) <= now.getTime()) return null;

  const [{ data: profile }, { data: partner }, { data: membership }] =
    await Promise.all([
      supabase
        .from('profiles')
        .select('id,display_name,email,status')
        .eq('id', payload.profileId)
        .eq('status', 'active')
        .maybeSingle(),
      supabase
        .from('partner_organizations')
        .select('id,display_name,business_unit_id,status')
        .eq('id', payload.partnerOrganizationId)
        .eq('organization_id', owner.organizationId)
        .eq('status', 'active')
        .maybeSingle(),
      supabase
        .from('partner_memberships')
        .select(
          'partner_organization_id,profile_id,role,effective_from,effective_until,suspended_at'
        )
        .eq('organization_id', owner.organizationId)
        .eq('partner_organization_id', payload.partnerOrganizationId)
        .eq('profile_id', payload.profileId)
        .is('suspended_at', null)
        .maybeSingle()
    ]);

  if (!profile || !partner || !membership) return null;

  const membershipRow = membership as {
    partner_organization_id: string;
    profile_id: string;
    role: PartnerRole;
    effective_from: string | null;
    effective_until: string | null;
    suspended_at: string | null;
  };

  if (
    membershipRow.effective_from &&
    new Date(membershipRow.effective_from) > now
  ) {
    return null;
  }
  if (
    membershipRow.effective_until &&
    new Date(membershipRow.effective_until) <= now
  ) {
    return null;
  }

  const targetUser: SessionUser = {
    id: String(profile.id),
    displayName: String(profile.display_name),
    email: String(profile.email)
  };

  const context: PartnerAuthContext = {
    user: targetUser,
    organizationId: owner.organizationId,
    partnerOrganizationId: String(partner.id),
    partnerOrganizationName: String(partner.display_name),
    businessUnitId: partner.business_unit_id
      ? String(partner.business_unit_id)
      : null,
    role: membershipRow.role,
    mfa: false
  };

  return {
    context,
    target: {
      profileId: targetUser.id,
      displayName: targetUser.displayName,
      email: targetUser.email,
      partnerOrganizationId: context.partnerOrganizationId,
      partnerOrganizationName: context.partnerOrganizationName,
      businessUnitId: context.businessUnitId,
      role: context.role,
      reason: payload.reason,
      startedAt: payload.startedAt,
      expiresAt: payload.expiresAt
    }
  };
}

export async function getEffectiveNetworkSession(
  supabase: SupabaseClient
): Promise<EffectiveNetworkSession | null> {
  const [naturalPartnerContext, ownerContext, payload] = await Promise.all([
    getPartnerAuthContext(supabase),
    activeOwnerContext(supabase),
    readNetworkViewAsCookie()
  ]);

  if (ownerContext && payload) {
    const resolved = await resolveNetworkViewAsContext(
      supabase,
      ownerContext,
      payload
    );
    if (resolved) {
      return {
        context: resolved.context,
        actor: ownerContext.user,
        owner: true,
        viewAs: resolved.target
      };
    }
  }

  if (naturalPartnerContext) {
    return {
      context: naturalPartnerContext,
      actor: naturalPartnerContext.user,
      owner: Boolean(ownerContext),
      viewAs: null
    };
  }

  if (ownerContext) {
    return {
      context: null,
      actor: ownerContext.user,
      owner: true,
      viewAs: null
    };
  }

  return null;
}

export async function isNetworkViewAsActive(
  supabase: SupabaseClient
): Promise<boolean> {
  return Boolean((await getEffectiveNetworkSession(supabase))?.viewAs);
}
