import { redirect } from 'next/navigation';
import { getPortalAuthContext, getSessionUser, type PortalAuthContext } from '@ksp/auth';
import { getServerSupabase, isSupabaseConfigured } from './supabase';

export interface PortalSessionState {
  configured: boolean;
  context: PortalAuthContext | null;
  /**
   * True when a valid Supabase session exists but resolves to no active client
   * membership (none, expired, or suspended) — as opposed to no session at all.
   * Lets callers route to a "no access" explanation instead of sign-in.
   */
  signedIn: boolean;
}

export async function readPortalSession(): Promise<PortalSessionState> {
  if (!isSupabaseConfigured()) return { configured: false, context: null, signedIn: false };
  const supabase = await getServerSupabase();
  if (!supabase) return { configured: false, context: null, signedIn: false };
  const context = await getPortalAuthContext(supabase);
  // Only pay for the extra lookup when the context is null and we need to tell
  // "no session" apart from "signed in but no active client membership".
  const signedIn = context !== null ? true : (await getSessionUser(supabase)) !== null;
  return { configured: true, context, signedIn };
}

export async function requirePortalSession(): Promise<PortalAuthContext> {
  const { configured, context, signedIn } = await readPortalSession();
  if (!configured) redirect('/setup');
  if (!context) redirect(signedIn ? '/no-access' : '/login');
  return context;
}
