import { redirect } from 'next/navigation';
import { getPortalAuthContext, type PortalAuthContext } from '@ksp/auth';
import { getServerSupabase, isSupabaseConfigured } from './supabase';

export interface PortalSessionState {
  configured: boolean;
  context: PortalAuthContext | null;
}

export async function readPortalSession(): Promise<PortalSessionState> {
  if (!isSupabaseConfigured()) return { configured: false, context: null };
  const supabase = await getServerSupabase();
  if (!supabase) return { configured: false, context: null };
  const context = await getPortalAuthContext(supabase);
  return { configured: true, context };
}

export async function requirePortalSession(): Promise<PortalAuthContext> {
  const { configured, context } = await readPortalSession();
  if (!configured) redirect('/setup');
  if (!context) redirect('/login');
  return context;
}
