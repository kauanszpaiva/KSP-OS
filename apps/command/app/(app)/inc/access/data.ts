import type { SupabaseClient } from '@ksp/database';
import type { PermissionAction } from '@ksp/permissions';
import { getMembersAdmin } from '../../data';
import { getClientPortalAccessEntries, type ClientPortalAccessEntry } from '../../clients/portal-access-data';

export const OWNER_ROLES = new Set(['founder_ceo', 'executive_operations']);

export interface DivisionAccessSummary {
  businessUnitId: string;
  name: string;
  accessLevel: string;
}

export interface ProjectAccessSummary {
  projectId: string;
  name: string;
  role: string;
}

export interface PermissionGrantSummary {
  id: string;
  action: PermissionAction;
  resourceType: string | null;
  resourceId: string | null;
  resourceName: string | null;
  effectiveUntil: string | null;
}

export interface TemporaryGrantSummary extends PermissionGrantSummary {
  effectiveFrom: string;
}

export interface PartnerMembershipSummary {
  membershipId: string;
  partnerOrganizationId: string;
  partnerOrganizationName: string;
  role: string;
  suspended: boolean;
  effectiveUntil: string | null;
  assignmentCount: number;
  openAssignmentCount: number;
}

export interface AccessDirectoryPerson {
  profileId: string;
  displayName: string;
  email: string;
  profileStatus: string;
  internalRole: string | null;
  internalSuspended: boolean;
  owner: boolean;
  surfaces: {
    inc: boolean;
    command: boolean;
    portal: boolean;
    network: boolean;
  };
  divisions: DivisionAccessSummary[];
  projects: ProjectAccessSummary[];
  portal: ClientPortalAccessEntry[];
  network: PartnerMembershipSummary[];
  permanentGrants: PermissionGrantSummary[];
  temporaryGrants: TemporaryGrantSummary[];
  accessReasons: string[];
}

export interface AccessDirectoryData {
  people: AccessDirectoryPerson[];
  businessUnits: Array<{ id: string; name: string }>;
  projects: Array<{ id: string; name: string }>;
  partnerOrganizations: Array<{ id: string; name: string }>;
  temporaryGrantMutationBlocked: boolean;
}

type ProfileRow = { id: string; display_name: string; email: string | null; status: string };
type UnitRow = { id: string; name: string; status: string };
type UnitMembershipRow = {
  business_unit_id: string;
  profile_id: string;
  access_level: string;
  effective_from: string;
  effective_until: string | null;
  suspended_at: string | null;
};
type ProjectRow = { id: string; name: string; status: string };
type ProjectMembershipRow = { project_id: string; profile_id: string; role: string; effective_until: string | null };
type InternalGrantRow = {
  id: string;
  profile_id: string;
  action: PermissionAction;
  resource_type: string | null;
  resource_id: string | null;
  effective_from: string;
  effective_until: string | null;
  revoked_at: string | null;
};
type TemporaryGrantRow = {
  id: string;
  profile_id: string;
  action: PermissionAction;
  resource_type: string;
  resource_id: string;
  effective_from: string;
  effective_until: string;
  revoked_at: string | null;
};
type PartnerOrganizationRow = { id: string; display_name: string; status: string };
type PartnerMembershipRow = {
  id: string;
  partner_organization_id: string;
  profile_id: string;
  role: string;
  effective_from: string;
  effective_until: string | null;
  suspended_at: string | null;
};
type PartnerAssignmentRow = { partner_organization_id: string; status: string };

function activeWindow(
  effectiveFrom: string | null | undefined,
  effectiveUntil: string | null | undefined,
  suspendedAt?: string | null
): boolean {
  if (suspendedAt) return false;
  const now = Date.now();
  if (effectiveFrom) {
    const startsAt = Date.parse(effectiveFrom);
    if (Number.isFinite(startsAt) && startsAt > now) return false;
  }
  if (effectiveUntil) {
    const endsAt = Date.parse(effectiveUntil);
    if (!Number.isFinite(endsAt) || endsAt <= now) return false;
  }
  return true;
}

function resourceName(resourceType: string | null, resourceId: string | null, projectNameById: Map<string, string>): string | null {
  if (!resourceType && !resourceId) return 'All KSP';
  if (resourceType === 'project' && resourceId) return projectNameById.get(resourceId) ?? 'Project';
  if (resourceType && resourceId) return `${resourceType} · ${resourceId.slice(0, 8)}`;
  return resourceType ?? null;
}

export async function getAccessDirectoryData(supabase: SupabaseClient): Promise<AccessDirectoryData> {
  const [
    internalMembers,
    portalEntries,
    profileResult,
    unitResult,
    unitMembershipResult,
    projectResult,
    projectMembershipResult,
    internalGrantResult,
    temporaryGrantResult,
    partnerOrganizationResult,
    partnerMembershipResult,
    partnerAssignmentResult
  ] = await Promise.all([
    getMembersAdmin(supabase),
    getClientPortalAccessEntries(supabase),
    supabase.from('profiles').select('id, display_name, email, status'),
    supabase.from('business_units').select('id, name, status').order('sort_order', { ascending: true }).order('name'),
    supabase
      .from('business_unit_memberships')
      .select('business_unit_id, profile_id, access_level, effective_from, effective_until, suspended_at'),
    supabase.from('projects').select('id, name, status').neq('status', 'archived').order('name'),
    supabase.from('project_memberships').select('project_id, profile_id, role, effective_until'),
    supabase
      .from('internal_permission_grants')
      .select('id, profile_id, action, resource_type, resource_id, effective_from, effective_until, revoked_at')
      .is('revoked_at', null),
    supabase
      .from('temporary_access_grants')
      .select('id, profile_id, action, resource_type, resource_id, effective_from, effective_until, revoked_at')
      .is('revoked_at', null),
    supabase.from('partner_organizations').select('id, display_name, status').order('display_name'),
    supabase
      .from('partner_memberships')
      .select('id, partner_organization_id, profile_id, role, effective_from, effective_until, suspended_at'),
    supabase.from('partner_assignments').select('partner_organization_id, status')
  ]);

  const profiles = (profileResult.data ?? []) as ProfileRow[];
  const units = ((unitResult.data ?? []) as UnitRow[]).filter((unit) => unit.status === 'active');
  const unitMemberships = ((unitMembershipResult.data ?? []) as UnitMembershipRow[]).filter((membership) =>
    activeWindow(membership.effective_from, membership.effective_until, membership.suspended_at)
  );
  const projects = (projectResult.data ?? []) as ProjectRow[];
  const projectMemberships = ((projectMembershipResult.data ?? []) as ProjectMembershipRow[]).filter((membership) =>
    activeWindow(null, membership.effective_until)
  );
  const internalGrants = ((internalGrantResult.data ?? []) as InternalGrantRow[]).filter((grant) =>
    !grant.revoked_at && activeWindow(grant.effective_from, grant.effective_until)
  );
  const temporaryGrants = ((temporaryGrantResult.data ?? []) as TemporaryGrantRow[]).filter((grant) =>
    !grant.revoked_at && activeWindow(grant.effective_from, grant.effective_until)
  );
  const partnerOrganizations = ((partnerOrganizationResult.data ?? []) as PartnerOrganizationRow[]).filter(
    (organization) => organization.status === 'active'
  );
  const partnerMemberships = (partnerMembershipResult.data ?? []) as PartnerMembershipRow[];
  const partnerAssignments = (partnerAssignmentResult.data ?? []) as PartnerAssignmentRow[];

  const profileById = new Map(profiles.map((profile) => [profile.id, profile]));
  const unitNameById = new Map(units.map((unit) => [unit.id, unit.name]));
  const projectNameById = new Map(projects.map((project) => [project.id, project.name]));
  const partnerNameById = new Map(partnerOrganizations.map((organization) => [organization.id, organization.display_name]));

  const internalByProfile = new Map(internalMembers.map((member) => [member.profileId, member]));
  const portalByProfile = new Map<string, ClientPortalAccessEntry[]>();
  for (const entry of portalEntries) {
    const list = portalByProfile.get(entry.profileId) ?? [];
    list.push(entry);
    portalByProfile.set(entry.profileId, list);
  }

  const allProfileIds = new Set<string>([
    ...internalMembers.map((member) => member.profileId),
    ...portalEntries.map((entry) => entry.profileId),
    ...partnerMemberships.map((membership) => membership.profile_id),
    ...internalGrants.map((grant) => grant.profile_id),
    ...temporaryGrants.map((grant) => grant.profile_id)
  ]);

  const people = [...allProfileIds].map((profileId): AccessDirectoryPerson => {
    const profile = profileById.get(profileId);
    const internal = internalByProfile.get(profileId);
    const portal = (portalByProfile.get(profileId) ?? []).sort((a, b) => a.clientName.localeCompare(b.clientName));
    const owner = Boolean(internal && OWNER_ROLES.has(internal.role) && !internal.suspended);

    const divisions = unitMemberships
      .filter((membership) => membership.profile_id === profileId)
      .map((membership) => ({
        businessUnitId: membership.business_unit_id,
        name: unitNameById.get(membership.business_unit_id) ?? 'Unknown division',
        accessLevel: membership.access_level
      }))
      .sort((a, b) => a.name.localeCompare(b.name));

    const projectAccess = projectMemberships
      .filter((membership) => membership.profile_id === profileId)
      .map((membership) => ({
        projectId: membership.project_id,
        name: projectNameById.get(membership.project_id) ?? 'Unknown project',
        role: membership.role
      }))
      .sort((a, b) => a.name.localeCompare(b.name));

    const permanentGrants = internalGrants
      .filter((grant) => grant.profile_id === profileId)
      .map((grant) => ({
        id: grant.id,
        action: grant.action,
        resourceType: grant.resource_type,
        resourceId: grant.resource_id,
        resourceName: resourceName(grant.resource_type, grant.resource_id, projectNameById),
        effectiveUntil: grant.effective_until
      }));

    const activeTemporaryGrants = temporaryGrants
      .filter((grant) => grant.profile_id === profileId)
      .map((grant) => ({
        id: grant.id,
        action: grant.action,
        resourceType: grant.resource_type,
        resourceId: grant.resource_id,
        resourceName: resourceName(grant.resource_type, grant.resource_id, projectNameById),
        effectiveFrom: grant.effective_from,
        effectiveUntil: grant.effective_until
      }));

    const network = partnerMemberships
      .filter((membership) => membership.profile_id === profileId)
      .map((membership) => {
        const assignments = partnerAssignments.filter(
          (assignment) => assignment.partner_organization_id === membership.partner_organization_id
        );
        return {
          membershipId: membership.id,
          partnerOrganizationId: membership.partner_organization_id,
          partnerOrganizationName: partnerNameById.get(membership.partner_organization_id) ?? 'Partner organization',
          role: membership.role,
          suspended: !activeWindow(membership.effective_from, membership.effective_until, membership.suspended_at),
          effectiveUntil: membership.effective_until,
          assignmentCount: assignments.length,
          openAssignmentCount: assignments.filter((assignment) => !['completed', 'cancelled', 'archived'].includes(assignment.status)).length
        };
      })
      .sort((a, b) => a.partnerOrganizationName.localeCompare(b.partnerOrganizationName));

    const accessReasons: string[] = [];
    if (owner) accessReasons.push(`KSP INC owner via ${internal?.role}`);
    if (internal && !internal.suspended) accessReasons.push(`Command via internal role ${internal.role}`);
    if (divisions.length > 0) accessReasons.push(`${divisions.length} explicit division scope${divisions.length === 1 ? '' : 's'}`);
    if (projectAccess.length > 0) accessReasons.push(`${projectAccess.length} internal project assignment${projectAccess.length === 1 ? '' : 's'}`);
    if (portal.length > 0) accessReasons.push(`Portal via ${portal.length} client membership${portal.length === 1 ? '' : 's'}`);
    if (network.some((membership) => !membership.suspended)) {
      accessReasons.push(`Network via ${network.filter((membership) => !membership.suspended).length} partner membership${network.filter((membership) => !membership.suspended).length === 1 ? '' : 's'}`);
    }
    if (permanentGrants.length > 0) accessReasons.push(`${permanentGrants.length} explicit permission grant${permanentGrants.length === 1 ? '' : 's'}`);
    if (activeTemporaryGrants.length > 0) accessReasons.push(`${activeTemporaryGrants.length} temporary grant${activeTemporaryGrants.length === 1 ? '' : 's'}`);
    if (accessReasons.length === 0) accessReasons.push('No active KSP access resolved');

    return {
      profileId,
      displayName: profile?.display_name || internal?.displayName || portal[0]?.displayName || 'Partner identity',
      email: profile?.email || internal?.email || portal[0]?.email || '',
      profileStatus: profile?.status ?? 'unknown',
      internalRole: internal?.role ?? null,
      internalSuspended: internal?.suspended ?? false,
      owner,
      surfaces: {
        inc: owner,
        command: Boolean(internal && !internal.suspended),
        portal: portal.length > 0,
        network: network.some((membership) => !membership.suspended)
      },
      divisions,
      projects: projectAccess,
      portal,
      network,
      permanentGrants,
      temporaryGrants: activeTemporaryGrants,
      accessReasons
    };
  });

  people.sort((a, b) => {
    if (a.owner !== b.owner) return a.owner ? -1 : 1;
    const aName = a.displayName || a.email || a.profileId;
    const bName = b.displayName || b.email || b.profileId;
    return aName.localeCompare(bName);
  });

  return {
    people,
    businessUnits: units.map((unit) => ({ id: unit.id, name: unit.name })),
    projects: projects.map((project) => ({ id: project.id, name: project.name })),
    partnerOrganizations: partnerOrganizations.map((organization) => ({ id: organization.id, name: organization.display_name })),
    // Staging currently grants ALL temporary_access_grants mutations to any
    // internal member. Until a reviewed migration narrows that RLS policy,
    // the owner plane exposes these grants as read-only evidence.
    temporaryGrantMutationBlocked: true
  };
}
