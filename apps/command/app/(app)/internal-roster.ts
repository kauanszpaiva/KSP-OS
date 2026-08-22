import type { SupabaseClient } from '@ksp/database';
import { getTeamLoad, type MemberRef, type TeamLoadView } from './data';

interface InternalMembershipRow {
  profile_id: string;
  internal_role: string | null;
  suspended_at: string | null;
  effective_until: string | null;
}

async function getActiveInternalProfileIds(supabase: SupabaseClient): Promise<Set<string>> {
  const { data } = await supabase
    .from('organization_memberships')
    .select('profile_id, internal_role, suspended_at, effective_until')
    .not('internal_role', 'is', null);

  const now = Date.now();
  const ids = new Set<string>();
  for (const membership of (data ?? []) as InternalMembershipRow[]) {
    if (!membership.internal_role || membership.suspended_at) continue;
    if (membership.effective_until) {
      const expiresAt = Date.parse(membership.effective_until);
      if (!Number.isFinite(expiresAt) || expiresAt <= now) continue;
    }
    ids.add(membership.profile_id);
  }
  return ids;
}

/**
 * Canonical internal KSP roster for assignment pickers.
 * Client identities can also be readable to executives through Portal-support RLS,
 * so selecting directly from `profiles` is not a safe definition of "KSP team".
 */
export async function getInternalMembers(supabase: SupabaseClient): Promise<MemberRef[]> {
  const profileIds = await getActiveInternalProfileIds(supabase);
  if (profileIds.size === 0) return [];

  const { data } = await supabase
    .from('profiles')
    .select('id, display_name, status')
    .in('id', [...profileIds])
    .eq('status', 'active')
    .order('display_name');

  return ((data ?? []) as Array<{ id: string; display_name: string }>).map((profile) => ({
    id: profile.id,
    displayName: profile.display_name
  }));
}

/**
 * Capacity/load view limited to active internal KSP members only.
 * BEZ/other client identities belong in the client/Portal model, never Team.
 */
export async function getInternalTeamLoad(supabase: SupabaseClient): Promise<TeamLoadView[]> {
  const [profileIds, load] = await Promise.all([
    getActiveInternalProfileIds(supabase),
    getTeamLoad(supabase)
  ]);
  return load.filter((member) => profileIds.has(member.profileId));
}
