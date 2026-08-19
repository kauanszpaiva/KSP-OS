import type { SupabaseClient } from '@ksp/database';
import type { InternalRole, MembershipContext } from '@ksp/permissions';

export interface SessionUser {
  id: string;
  email: string;
  displayName: string;
}

export interface AuthContext {
  user: SessionUser;
  organizationId: string;
  internalRoles: InternalRole[];
  mfa: boolean;
  membership: MembershipContext;
}

/** Resolve the signed-in user, or null when there is no valid session. */
export async function getSessionUser(supabase: SupabaseClient): Promise<SessionUser | null> {
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) return null;
  const { data: profile } = await supabase
    .from('profiles')
    .select('display_name, email')
    .eq('id', data.user.id)
    .maybeSingle();
  return {
    id: data.user.id,
    email: profile?.email ?? data.user.email ?? '',
    displayName: profile?.display_name ?? data.user.email ?? 'Member'
  };
}

/**
 * Whether the current session has actually completed step-up (MFA)
 * verification, per Supabase's Authenticator Assurance Level — NOT whether
 * the account has a factor enrolled. `currentLevel === 'aal2'` means the
 * session itself presented a second factor; `aal1` means it did not, even if
 * `nextLevel` reports a factor is available. Callers gating sensitive
 * actions must check `currentLevel`, never assume assurance from session
 * presence alone.
 */
export async function getSessionAal(supabase: SupabaseClient): Promise<boolean> {
  const { data, error } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
  if (error || !data) return false;
  return data.currentLevel === 'aal2';
}

/**
 * Build the full authorization context for the signed-in user: their org,
 * internal roles, MFA state, and a MembershipContext consumable by the
 * @ksp/permissions engine. Returns null when unauthenticated or without an
 * active internal membership.
 */
export async function getAuthContext(supabase: SupabaseClient): Promise<AuthContext | null> {
  const user = await getSessionUser(supabase);
  if (!user) return null;

  const { data: memberships } = await supabase
    .from('organization_memberships')
    .select('organization_id, internal_role, effective_until, suspended_at')
    .eq('profile_id', user.id);

  const active = (memberships ?? []).filter(
    (m: { internal_role: string | null; suspended_at: string | null; effective_until: string | null }) =>
      m.internal_role && !m.suspended_at && (!m.effective_until || new Date(m.effective_until) > new Date())
  );
  if (active.length === 0) return null;

  const organizationId = active[0].organization_id as string;
  const internalRoles = [
    ...new Set(active.filter((m: any) => m.organization_id === organizationId).map((m: any) => m.internal_role as InternalRole))
  ];

  const { data: projectRows } = await supabase.from('project_memberships').select('project_id').eq('profile_id', user.id);
  const projectIds = (projectRows ?? []).map((r: { project_id: string }) => r.project_id);

  const mfa = await getSessionAal(supabase);

  const membership: MembershipContext = {
    organizationId,
    internalRoles,
    clientMemberships: [],
    projectIds,
    explicitGrants: [],
    mfa
  };

  return { user, organizationId, internalRoles, mfa, membership };
}
