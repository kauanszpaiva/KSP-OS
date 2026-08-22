import type { SupabaseClient } from '@ksp/database';

export interface ClientPortalProjectAccess {
  projectId: string;
  name: string;
  status: string;
  enabled: boolean;
}

export interface ClientPortalAccessEntry {
  clientId: string;
  clientName: string;
  profileId: string;
  displayName: string;
  email: string;
  role: string;
  projects: ClientPortalProjectAccess[];
}

export interface PendingPortalInvitation {
  invitationId: string;
  clientId: string;
  clientName: string;
  email: string;
  role: string;
  expiresAt: string;
  deliveryStatus: string;
  emailSentAt: string | null;
  emailLastError: string | null;
}

interface MembershipRow {
  client_organization_id: string;
  profile_id: string;
  role: string;
  effective_until: string | null;
  suspended_at: string | null;
}

interface ProfileRow {
  id: string;
  display_name: string;
  email: string;
  status: string;
}

interface ClientRow {
  id: string;
  display_name: string;
  status: string;
  archived_at: string | null;
}

interface ProjectRow {
  id: string;
  client_id: string | null;
  name: string;
  status: string;
}

interface GrantRow {
  project_id: string;
  client_organization_id: string | null;
  profile_id: string | null;
  action: string;
  effective_from: string;
  effective_until: string | null;
  revoked_at: string | null;
}

interface InvitationRow {
  id: string;
  client_organization_id: string;
  email: string;
  initial_role: string;
  expires_at: string;
  accepted_at: string | null;
  revoked_at: string | null;
  email_delivery_status: string | null;
  email_sent_at: string | null;
  email_last_error: string | null;
}

export async function getClientPortalAccessEntries(supabase: SupabaseClient): Promise<ClientPortalAccessEntry[]> {
  const { data: memberships } = await supabase
    .from('client_memberships')
    .select('client_organization_id, profile_id, role, effective_until, suspended_at')
    .is('suspended_at', null);

  const now = Date.now();
  const activeMemberships = ((memberships ?? []) as MembershipRow[]).filter((membership) => {
    if (!membership.effective_until) return true;
    const expiresAt = Date.parse(membership.effective_until);
    return Number.isFinite(expiresAt) && expiresAt > now;
  });

  if (activeMemberships.length === 0) return [];

  const profileIds = [...new Set(activeMemberships.map((membership) => membership.profile_id))];
  const clientIds = [...new Set(activeMemberships.map((membership) => membership.client_organization_id))];

  const [{ data: profiles }, { data: clients }, { data: projects }, { data: grants }] = await Promise.all([
    supabase.from('profiles').select('id, display_name, email, status').in('id', profileIds),
    supabase.from('client_organizations').select('id, display_name, status, archived_at').in('id', clientIds),
    supabase.from('projects').select('id, client_id, name, status').in('client_id', clientIds).neq('status', 'archived').order('name'),
    supabase
      .from('project_access_grants')
      .select('project_id, client_organization_id, profile_id, action, effective_from, effective_until, revoked_at')
      .in('client_organization_id', clientIds)
      .eq('action', 'project.read')
      .is('revoked_at', null)
  ]);

  const profileById = new Map(((profiles ?? []) as ProfileRow[]).map((profile) => [profile.id, profile]));
  const clientById = new Map(((clients ?? []) as ClientRow[]).map((client) => [client.id, client]));
  const projectsByClient = new Map<string, ProjectRow[]>();
  for (const project of (projects ?? []) as ProjectRow[]) {
    if (!project.client_id) continue;
    const list = projectsByClient.get(project.client_id) ?? [];
    list.push(project);
    projectsByClient.set(project.client_id, list);
  }

  const activeGrants = ((grants ?? []) as GrantRow[]).filter((grant) => {
    const startsAt = Date.parse(grant.effective_from);
    if (Number.isFinite(startsAt) && startsAt > now) return false;
    if (!grant.effective_until) return true;
    const expiresAt = Date.parse(grant.effective_until);
    return Number.isFinite(expiresAt) && expiresAt > now;
  });

  return activeMemberships.flatMap((membership): ClientPortalAccessEntry[] => {
    const profile = profileById.get(membership.profile_id);
    const client = clientById.get(membership.client_organization_id);
    if (!profile || !client) return [];
    if (profile.status !== 'active' || client.status !== 'active' || client.archived_at) return [];
    if (!profile.email) return [];

    const projectAccess = (projectsByClient.get(client.id) ?? []).map((project) => ({
      projectId: project.id,
      name: project.name,
      status: project.status,
      enabled: activeGrants.some((grant) =>
        grant.project_id === project.id &&
        grant.client_organization_id === client.id &&
        (grant.profile_id === profile.id || grant.profile_id === null)
      )
    }));

    return [{
      clientId: client.id,
      clientName: client.display_name,
      profileId: profile.id,
      displayName: profile.display_name,
      email: profile.email,
      role: membership.role,
      projects: projectAccess
    }];
  }).sort((a, b) => a.clientName.localeCompare(b.clientName) || a.email.localeCompare(b.email));
}

export async function getPendingPortalInvitations(supabase: SupabaseClient): Promise<PendingPortalInvitation[]> {
  const now = Date.now();
  const { data: invitations } = await supabase
    .from('portal_invitations')
    .select('id, client_organization_id, email, initial_role, expires_at, accepted_at, revoked_at, email_delivery_status, email_sent_at, email_last_error')
    .is('accepted_at', null)
    .is('revoked_at', null)
    .order('created_at', { ascending: false });

  const activeInvitations = ((invitations ?? []) as InvitationRow[]).filter((invitation) => {
    const expiresAt = Date.parse(invitation.expires_at);
    return Number.isFinite(expiresAt) && expiresAt > now;
  });
  if (activeInvitations.length === 0) return [];

  const clientIds = [...new Set(activeInvitations.map((invitation) => invitation.client_organization_id))];
  const { data: clients } = await supabase
    .from('client_organizations')
    .select('id, display_name, status, archived_at')
    .in('id', clientIds);
  const clientById = new Map(((clients ?? []) as ClientRow[]).map((client) => [client.id, client]));

  return activeInvitations.flatMap((invitation): PendingPortalInvitation[] => {
    const client = clientById.get(invitation.client_organization_id);
    if (!client || client.status !== 'active' || client.archived_at) return [];
    return [{
      invitationId: invitation.id,
      clientId: client.id,
      clientName: client.display_name,
      email: invitation.email,
      role: invitation.initial_role,
      expiresAt: invitation.expires_at,
      deliveryStatus: invitation.email_delivery_status || 'not_sent',
      emailSentAt: invitation.email_sent_at,
      emailLastError: invitation.email_last_error
    }];
  });
}
