'use server';

import { revalidatePath } from 'next/cache';
import { getAuthContext, isKspIncOwner } from '@ksp/auth';
import type { SupabaseClient } from '@ksp/database';
import { getServerSupabase } from '../../lib/supabase';

export interface NetworkMembershipActionResult {
  ok: boolean;
  error?: string;
}

const roles = new Set(['partner_owner', 'partner_coordinator', 'billing', 'editor', 'uploader', 'viewer']);

function asUuid(value: FormDataEntryValue | null): string | null {
  const text = String(value ?? '').trim();
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(text)
    ? text
    : null;
}

async function record(
  supabase: SupabaseClient,
  organizationId: string,
  actorId: string,
  targetId: string,
  summary: string
) {
  await Promise.all([
    supabase.from('activity_events').insert({
      organization_id: organizationId,
      actor_id: actorId,
      verb: 'network.membership.granted',
      object_table: 'partner_memberships',
      object_id: targetId,
      summary
    }),
    supabase.from('audit_events').insert({
      organization_id: organizationId,
      actor_id: actorId,
      action: 'network.membership.granted',
      target_table: 'partner_memberships',
      target_id: targetId,
      classification: 'internal',
      metadata: { summary }
    })
  ]);
}

export async function setPartnerMembershipV4(
  _prev: NetworkMembershipActionResult,
  form: FormData
): Promise<NetworkMembershipActionResult> {
  const supabase = await getServerSupabase();
  if (!supabase) return { ok: false, error: 'not_configured' };
  const ctx = await getAuthContext(supabase);
  if (!ctx || !isKspIncOwner(ctx)) return { ok: false, error: 'owner_access_required' };
  if (!ctx.mfa) return { ok: false, error: 'Step-up MFA is required for Network access changes.' };

  const profileId = asUuid(form.get('profileId'));
  const partnerOrganizationId = asUuid(form.get('partnerOrganizationId'));
  const role = String(form.get('role') ?? 'viewer');
  if (!profileId || !partnerOrganizationId || !roles.has(role)) {
    return { ok: false, error: 'Choose a valid identity, partner organization and Network role.' };
  }

  const now = new Date().toISOString();
  const [{ data: partner }, { data: profile }] = await Promise.all([
    supabase
      .from('partner_organizations')
      .select('id,display_name')
      .eq('id', partnerOrganizationId)
      .eq('organization_id', ctx.organizationId)
      .eq('status', 'active')
      .maybeSingle(),
    supabase.from('profiles').select('id,display_name').eq('id', profileId).maybeSingle()
  ]);
  if (!partner || !profile) return { ok: false, error: 'Partner organization or identity was not found.' };

  const { data: existing } = await supabase
    .from('partner_memberships')
    .select('id')
    .eq('organization_id', ctx.organizationId)
    .eq('partner_organization_id', partnerOrganizationId)
    .eq('profile_id', profileId)
    .limit(1)
    .maybeSingle();

  let membershipId = existing?.id as string | undefined;
  if (membershipId) {
    const { error } = await supabase
      .from('partner_memberships')
      .update({
        role,
        suspended_at: null,
        effective_from: now,
        effective_until: null,
        created_by: ctx.user.id
      })
      .eq('id', membershipId)
      .eq('organization_id', ctx.organizationId);
    if (error) return { ok: false, error: 'Could not update Network membership.' };
  } else {
    const { data, error } = await supabase
      .from('partner_memberships')
      .insert({
        organization_id: ctx.organizationId,
        partner_organization_id: partnerOrganizationId,
        profile_id: profileId,
        role,
        effective_from: now,
        created_by: ctx.user.id
      })
      .select('id')
      .single();
    if (error || !data) return { ok: false, error: 'Could not create Network membership.' };
    membershipId = String(data.id);
  }

  await record(
    supabase,
    ctx.organizationId,
    ctx.user.id,
    membershipId,
    `Set ${profile.display_name ?? profileId} as ${role} for ${partner.display_name ?? partnerOrganizationId}`
  );
  revalidatePath('/access');
  revalidatePath('/network');
  revalidatePath('/people');
  return { ok: true };
}
