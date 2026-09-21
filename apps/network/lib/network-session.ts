import { redirect } from 'next/navigation';
import { getSessionUser, type PartnerAuthContext } from '@ksp/auth';
import { getServerSupabase, isSupabaseConfigured } from './supabase';
import {
  getEffectiveNetworkSession,
  type EffectiveNetworkSession
} from './view-as';

export async function readNetworkSession(): Promise<{
  configured: boolean;
  context: PartnerAuthContext | null;
  effective: EffectiveNetworkSession | null;
  signedIn: boolean;
}> {
  if (!isSupabaseConfigured()) {
    return {
      configured: false,
      context: null,
      effective: null,
      signedIn: false
    };
  }

  const supabase = await getServerSupabase();
  if (!supabase) {
    return {
      configured: false,
      context: null,
      effective: null,
      signedIn: false
    };
  }

  const effective = await getEffectiveNetworkSession(supabase);
  const signedIn =
    effective !== null ? true : (await getSessionUser(supabase)) !== null;

  return {
    configured: true,
    context: effective?.context ?? null,
    effective,
    signedIn
  };
}

export async function requireEffectiveNetworkSession(): Promise<EffectiveNetworkSession> {
  const { configured, effective, signedIn } = await readNetworkSession();

  if (!configured) redirect('/setup');
  if (!effective) redirect(signedIn ? '/no-access' : '/login');

  return effective;
}

export async function requireNetworkSession(): Promise<PartnerAuthContext> {
  const effective = await requireEffectiveNetworkSession();

  if (!effective.context) {
    redirect(effective.owner ? '/view-as' : '/no-access');
  }

  return effective.context;
}
