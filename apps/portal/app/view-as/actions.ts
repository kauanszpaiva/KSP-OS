'use server';

import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { getAuthContext, isKspIncOwner } from '@ksp/auth';
import { getServerSupabase } from '../../lib/supabase';
import {
  encodePortalViewAsCookie,
  listPortalViewAsTargets,
  PORTAL_VIEW_AS_COOKIE,
  PORTAL_VIEW_AS_TTL_SECONDS,
  readPortalViewAsCookie
} from '../../lib/view-as';

async function requireOwner() {
  const supabase = await getServerSupabase();
  if (!supabase) throw new Error('Portal is not configured.');
  const ctx = await getAuthContext(supabase);
  if (!ctx || !isKspIncOwner(ctx)) throw new Error('KSP INC owner access required.');
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

export async function startPortalViewAs(formData: FormData) {
  const { supabase, ctx } = await requireOwner();
  const targetKey = String(formData.get('target') ?? '').trim();
  const reason = String(formData.get('reason') ?? '').trim();
  if (!reason || reason.length < 4 || reason.length > 240) throw new Error('Provide a short reason for View As.');

  const targets = await listPortalViewAsTargets(supabase);
  const target = targets.find((candidate) => `${candidate.profileId}:${candidate.clientOrganizationId}` === targetKey);
  if (!target) throw new Error('That client identity is not currently eligible for View As.');

  const startedAt = new Date();
  const expiresAt = new Date(startedAt.getTime() + PORTAL_VIEW_AS_TTL_SECONDS * 1000);
  const payload = {
    profileId: target.profileId,
    clientOrganizationId: target.clientOrganizationId,
    reason,
    startedAt: startedAt.toISOString(),
    expiresAt: expiresAt.toISOString()
  };

  const store = await cookies();
  store.set(PORTAL_VIEW_AS_COOKIE, encodePortalViewAsCookie(payload), {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: PORTAL_VIEW_AS_TTL_SECONDS
  });

  await audit(supabase, ctx.organizationId, ctx.user.id, 'portal.view_as_started', target.profileId, {
    client_organization_id: target.clientOrganizationId,
    target_email: target.email,
    target_role: target.role,
    reason,
    expires_at: payload.expiresAt
  });

  redirect('/home');
}

export async function stopPortalViewAs() {
  const { supabase, ctx } = await requireOwner();
  const payload = await readPortalViewAsCookie();
  const store = await cookies();
  store.delete(PORTAL_VIEW_AS_COOKIE);

  if (payload) {
    await audit(supabase, ctx.organizationId, ctx.user.id, 'portal.view_as_stopped', payload.profileId, {
      client_organization_id: payload.clientOrganizationId,
      reason: payload.reason,
      started_at: payload.startedAt,
      scheduled_expiry: payload.expiresAt
    });
  }

  redirect('/view-as');
}
