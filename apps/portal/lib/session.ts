import { redirect } from 'next/navigation';
import { getSessionUser, type PortalAuthContext } from '@ksp/auth';
import { getServerSupabase, isSupabaseConfigured } from './supabase';
import { getEffectivePortalSession, type EffectivePortalSession } from './view-as';

export interface PortalSessionState {
  configured: boolean;
  context: PortalAuthContext | null;
  effective: EffectivePortalSession | null;
  /** True when a valid Supabase session exists, even if it has no client membership. */
  signedIn: boolean;
}

export async function readPortalSession(): Promise<PortalSessionState> {
  if (!isSupabaseConfigured()) return { configured: false, context: null, effective: null, signedIn: false };
  const supabase = await getServerSupabase();
  if (!supabase) return { configured: false, context: null, effective: null, signedIn: false };
  const effective = await getEffectivePortalSession(supabase);
  const context = effective?.context ?? null;
  const signedIn = effective !== null ? true : (await getSessionUser(supabase)) !== null;
  return { configured: true, context, effective, signedIn };
}

export async function requireEffectivePortalSession(): Promise<EffectivePortalSession> {
  const { configured, effective, signedIn } = await readPortalSession();
  if (!configured) redirect('/setup');
  if (!effective) redirect(signedIn ? '/no-access' : '/login');
  return effective;
}

export async function requirePortalSession(): Promise<PortalAuthContext> {
  return (await requireEffectivePortalSession()).context;
}
