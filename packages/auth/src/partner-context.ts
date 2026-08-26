import type { SupabaseClient } from '@ksp/database';
import { getSessionAal, getSessionUser, type SessionUser } from './context';

export type PartnerRole = 'partner_owner' | 'partner_coordinator' | 'billing' | 'editor' | 'uploader' | 'viewer';

export interface PartnerAuthContext {
  user: SessionUser;
  organizationId: string;
  partnerOrganizationId: string;
  partnerOrganizationName: string;
  businessUnitId: string | null;
  role: PartnerRole;
  mfa: boolean;
}

type PartnerOrganizationRow = {
  display_name: string;
  business_unit_id: string | null;
  status: string;
};

function firstPartnerOrganization(value: PartnerOrganizationRow | PartnerOrganizationRow[] | null | undefined) {
  return Array.isArray(value) ? (value[0] ?? null) : (value ?? null);
}

export async function getPartnerAuthContext(supabase: SupabaseClient): Promise<PartnerAuthContext | null> {
  const user = await getSessionUser(supabase);
  if (!user) return null;
  const now = new Date().toISOString();
  const { data: memberships, error } = await supabase
    .from('partner_memberships')
    .select(
      'organization_id, partner_organization_id, role, effective_from, effective_until, suspended_at, partner_organizations!inner(display_name,business_unit_id,status)'
    )
    .eq('profile_id', user.id)
    .is('suspended_at', null)
    .lte('effective_from', now)
    .or(`effective_until.is.null,effective_until.gt.${now}`);
  if (error || !memberships?.length) return null;

  const active = memberships.find((row) => firstPartnerOrganization(row.partner_organizations)?.status === 'active');
  if (!active) return null;
  const partnerOrganization = firstPartnerOrganization(active.partner_organizations);
  if (!partnerOrganization) return null;

  return {
    user,
    organizationId: active.organization_id,
    partnerOrganizationId: active.partner_organization_id,
    partnerOrganizationName: partnerOrganization.display_name,
    businessUnitId: partnerOrganization.business_unit_id ?? null,
    role: active.role as PartnerRole,
    mfa: await getSessionAal(supabase)
  };
}
