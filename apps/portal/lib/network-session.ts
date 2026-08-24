import { redirect } from 'next/navigation';
import { getPartnerAuthContext, getSessionUser, type PartnerAuthContext } from '@ksp/auth';
import { getServerSupabase, isSupabaseConfigured } from './supabase';

export async function readNetworkSession(): Promise<{ configured:boolean; context:PartnerAuthContext|null; signedIn:boolean }> {
  if (!isSupabaseConfigured()) return { configured:false, context:null, signedIn:false };
  const supabase=await getServerSupabase();
  if (!supabase) return { configured:false, context:null, signedIn:false };
  const context=await getPartnerAuthContext(supabase);
  const signedIn=context!==null ? true : (await getSessionUser(supabase))!==null;
  return { configured:true, context, signedIn };
}

export async function requireNetworkSession(): Promise<PartnerAuthContext> {
  const {configured,context,signedIn}=await readNetworkSession();
  if (!configured) redirect('/setup');
  if (!context) redirect(signedIn ? '/network/no-access' : '/network/login');
  return context;
}
