import { getAuthContext, getSessionUser, isKspIncOwner, type AuthContext } from '@ksp/auth';
import { redirect } from 'next/navigation';
import { getServerSupabase } from './supabase';

/** Fail closed unless the caller is a signed-in global KSP INC owner. */
export async function requireIncOwner(): Promise<AuthContext> {
  const supabase = await getServerSupabase();
  if (!supabase) redirect('/setup');

  const user = await getSessionUser(supabase);
  if (!user) redirect('/login');

  const context = await getAuthContext(supabase);
  if (!context || !isKspIncOwner(context)) redirect('/no-access');

  return context;
}
