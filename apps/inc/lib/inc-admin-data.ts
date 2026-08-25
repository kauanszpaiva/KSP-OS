import type { SupabaseClient } from '@ksp/database';

export interface IncAdminPerson {
  id: string;
  displayName: string;
  email: string;
  role: string;
  suspended: boolean;
}

export interface IncAdminUnit {
  id: string;
  key: string;
  name: string;
}

export interface IncAdminProject {
  id: string;
  name: string;
  status: string;
  businessUnitId: string | null;
}

export interface IncAdminPartner {
  id: string;
  displayName: string;
}

export interface IncPermissionGrant {
  id: string;
  profileId: string;
  action: string;
  scope: string;
}

export interface IncTemporaryGrant {
  id: string;
  profileId: string;
  action: string;
  scope: string;
  effectiveUntil: string;
}

export interface IncPartnerMembership {
  id: string;
  profileId: string;
  partnerOrganizationId: string;
  role: string;
}

export async function getIncAccessAdminData(supabase: SupabaseClient, organizationId: string) {
  const [peopleResult, unitResult, projectResult, permanentResult, temporaryResult, partnerResult, partnerMembershipResult] =
    await Promise.all([
      supabase
        .from('organization_memberships')
        .select('profile_id,internal_role,suspended_at,profiles(display_name,email)')
        .eq('organization_id', organizationId)
        .not('internal_role', 'is', null)
        .order('effective_from', { ascending: true }),
      supabase
        .from('business_units')
        .select('id,key,name')
        .eq('organization_id', organizationId)
        .eq('status', 'active')
        .order('sort_order', { ascending: true }),
      supabase
        .from('projects')
        .select('id,name,status,business_unit_id')
        .eq('organization_id', organizationId)
        .neq('status', 'archived')
        .order('name', { ascending: true }),
      supabase
        .from('internal_permission_grants')
        .select('id,profile_id,action,resource_type,resource_id')
        .eq('organization_id', organizationId)
        .is('revoked_at', null)
        .order('created_at', { ascending: false })
        .limit(80),
      supabase
        .from('temporary_access_grants')
        .select('id,profile_id,action,resource_type,resource_id,effective_until')
        .eq('organization_id', organizationId)
        .is('revoked_at', null)
        .gt('effective_until', new Date().toISOString())
        .order('effective_until', { ascending: true })
        .limit(80),
      supabase
        .from('partner_organizations')
        .select('id,display_name')
        .eq('organization_id', organizationId)
        .eq('status', 'active')
        .order('display_name', { ascending: true }),
      supabase
        .from('partner_memberships')
        .select('id,profile_id,partner_organization_id,role,suspended_at,effective_until')
        .eq('organization_id', organizationId)
        .is('suspended_at', null)
        .order('created_at', { ascending: false })
        .limit(80)
    ]);

  const people: IncAdminPerson[] = (peopleResult.data ?? []).map((row: any) => {
    const profile = Array.isArray(row.profiles) ? row.profiles[0] : row.profiles;
    return {
      id: String(row.profile_id),
      displayName: profile?.display_name ?? profile?.email ?? String(row.profile_id),
      email: profile?.email ?? '',
      role: String(row.internal_role ?? 'internal'),
      suspended: Boolean(row.suspended_at)
    };
  });

  const units: IncAdminUnit[] = unitResult.error
    ? []
    : (unitResult.data ?? []).map((row: any) => ({ id: String(row.id), key: String(row.key), name: String(row.name) }));

  const projects: IncAdminProject[] = (projectResult.data ?? []).map((row: any) => ({
    id: String(row.id),
    name: String(row.name),
    status: String(row.status),
    businessUnitId: row.business_unit_id ? String(row.business_unit_id) : null
  }));

  const permanentGrants: IncPermissionGrant[] = (permanentResult.data ?? []).map((row: any) => ({
    id: String(row.id),
    profileId: String(row.profile_id),
    action: String(row.action),
    scope: row.resource_type ? `${row.resource_type}:${row.resource_id ?? ''}` : 'organization'
  }));

  const temporaryGrants: IncTemporaryGrant[] = (temporaryResult.data ?? []).map((row: any) => ({
    id: String(row.id),
    profileId: String(row.profile_id),
    action: String(row.action),
    scope: `${row.resource_type}:${row.resource_id}`,
    effectiveUntil: String(row.effective_until)
  }));

  const partners: IncAdminPartner[] = partnerResult.error
    ? []
    : (partnerResult.data ?? []).map((row: any) => ({ id: String(row.id), displayName: String(row.display_name) }));

  const partnerMemberships: IncPartnerMembership[] = partnerMembershipResult.error
    ? []
    : (partnerMembershipResult.data ?? []).map((row: any) => ({
        id: String(row.id),
        profileId: String(row.profile_id),
        partnerOrganizationId: String(row.partner_organization_id),
        role: String(row.role)
      }));

  return {
    people,
    units,
    projects,
    permanentGrants,
    temporaryGrants,
    partners,
    partnerMemberships,
    businessUnitsAvailable: !unitResult.error,
    networkAvailable: !partnerResult.error && !partnerMembershipResult.error
  };
}
