'use server';

import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { getAuthContext, isKspIncOwner } from '@ksp/auth';
import { getServerSupabase } from '../../lib/supabase';
import {
  encodeNetworkViewAsCookie,
  listNetworkViewAsTargets,
  NETWORK_VIEW_AS_COOKIE,
  NETWORK_VIEW_AS_TTL_SECONDS,
  readNetworkViewAsCookie
} from '../../lib/view-as';

async function requireOwner() {
  const supabase = await getServerSupabase();
  if (!supabase) throw new Error('KSP Network is not configured.');
  const ctx = await getAuthContext(supabase);
  if (!ctx || !isKspIncOwner(ctx)) {
    throw new Error('KSP INC owner access required.');
  }
  return { supabase, ctx };
}

async function audit(
  supabase: Awaited<ReturnType<typeof getServerSupabase>>,
  organizationId: string,
  actorId: string,
  action: string,
  targetId: string,
  metadata: Record<string, unknown>
) {
  if (!supabase) return;
  await supabase.from('audit_events').insert({
    organization_id: organizationId,
    actor_id: actorId,
    action,
    target_table: 'profiles',
    target_id: targetId,
    classification: 'restricted',
    metadata
  });
}

export async function startNetworkViewAs(formData: FormData) {
  const { supabase, ctx } = await requireOwner();
  const targetKey = String(formData.get('target') ?? '').trim();
  const reason = String(formData.get('reason') ?? '').trim();

  if (!reason || reason.length < 4 || reason.length > 240) {
    throw new Error('Provide a short reason for View As.');
  }

  const targets = await listNetworkViewAsTargets(supabase);
  const target = targets.find(
    (candidate) =>
      `${candidate.profileId}:${candidate.partnerOrganizationId}` === targetKey
  );
  if (!target) {
    throw new Error('That partner identity is not currently eligible for View As.');
  }

  const startedAt = new Date();
  const expiresAt = new Date(
    startedAt.getTime() + NETWORK_VIEW_AS_TTL_SECONDS * 1000
  );
  const payload = {
    profileId: target.profileId,
    partnerOrganizationId: target.partnerOrganizationId,
    reason,
    startedAt: startedAt.toISOString(),
    expiresAt: expiresAt.toISOString()
  };

  const store = await cookies();
  store.set(NETWORK_VIEW_AS_COOKIE, encodeNetworkViewAsCookie(payload), {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: NETWORK_VIEW_AS_TTL_SECONDS
  });

  await audit(
    supabase,
    ctx.organizationId,
    ctx.user.id,
    'network.view_as_started',
    target.profileId,
    {
      partner_organization_id: target.partnerOrganizationId,
      target_email: target.email,
      target_role: target.role,
      reason,
      expires_at: payload.expiresAt
    }
  );

  redirect('/');
}

export async function stopNetworkViewAs() {
  const { supabase, ctx } = await requireOwner();
  const payload = await readNetworkViewAsCookie();
  const store = await cookies();
  store.delete(NETWORK_VIEW_AS_COOKIE);

  if (payload) {
    await audit(
      supabase,
      ctx.organizationId,
      ctx.user.id,
      'network.view_as_stopped',
      payload.profileId,
      {
        partner_organization_id: payload.partnerOrganizationId,
        reason: payload.reason,
        started_at: payload.startedAt,
        scheduled_expiry: payload.expiresAt
      }
    );
  }

  redirect('/view-as');
}
