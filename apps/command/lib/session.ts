import { redirect } from 'next/navigation';
import { getAuthContext, type AuthContext } from '@ksp/auth';
import { getServerSupabase, isSupabaseConfigured } from './supabase';

export interface SessionState {
  configured: boolean;
  context: AuthContext | null;
}

/** Resolve the current session without redirecting. */
export async function readSession(): Promise<SessionState> {
  if (!isSupabaseConfigured()) return { configured: false, context: null };
  const supabase = await getServerSupabase();
  if (!supabase) return { configured: false, context: null };
  const context = await getAuthContext(supabase);
  return { configured: true, context };
}

/** Require an authenticated internal member; redirect to /login otherwise. */
export async function requireSession(): Promise<AuthContext> {
  const { configured, context } = await readSession();
  if (!configured) redirect('/setup');
  if (!context) redirect('/login');
  return context;
}
