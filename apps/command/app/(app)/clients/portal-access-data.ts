import type { SupabaseClient } from '@ksp/database';
import type { ClientPortalAccessEntry } from '../_components/client-portal-access-panel';

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

  const [{ data: profiles }, { data: clients }] = await Promise.all([
    supabase.from('profiles').select('id, display_name, email, status').in('id', profileIds),
    supabase.from('client_organizations').select('id, display_name, status, archived_at').in('id', clientIds)
  ]);

  const profileById = new Map(((profiles ?? []) as ProfileRow[]).map((profile) => [profile.id, profile]));
  const clientById = new Map(((clients ?? []) as ClientRow[]).map((client) => [client.id, client]));

  return activeMemberships.flatMap((membership): ClientPortalAccessEntry[] => {
    const profile = profileById.get(membership.profile_id);
    const client = clientById.get(membership.client_organization_id);
    if (!profile || !client) return [];
    if (profile.status !== 'active' || client.status !== 'active' || client.archived_at) return [];
    if (!profile.email) return [];

    return [{
      clientId: client.id,
      clientName: client.display_name,
      profileId: profile.id,
      displayName: profile.display_name,
      email: profile.email,
      role: membership.role
    }];
  }).sort((a, b) => a.clientName.localeCompare(b.clientName) || a.email.localeCompare(b.email));
}
