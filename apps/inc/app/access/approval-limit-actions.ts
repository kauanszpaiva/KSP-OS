'use server';

import { revalidatePath } from 'next/cache';
import { getAuthContext, isKspIncOwner } from '@ksp/auth';
import { approvalBoundActions, type PermissionAction } from '@ksp/permissions';
import { getServerSupabase } from '../../lib/supabase';

export interface ApprovalLimitActionResult {
  ok: boolean;
  error?: string;
}

function asUuid(value: FormDataEntryValue | null): string | null {
  const text = String(value ?? '').trim();
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(text)
    ? text
    : null;
}

function asAction(value: FormDataEntryValue | null): PermissionAction | null {
  const action = String(value ?? '').trim() as PermissionAction;
  return approvalBoundActions.includes(action) ? action : null;
}

async function ownerGate() {
  const supabase = await getServerSupabase();
  if (!supabase) return { error: 'not_configured' } as const;
  const ctx = await getAuthContext(supabase);
  if (!ctx || !isKspIncOwner(ctx)) return { error: 'owner_access_required' } as const;
  if (!ctx.mfa) return { error: 'Step-up MFA is required for approval-limit changes.' } as const;
  return { supabase, ctx } as const;
}

function refresh() {
  revalidatePath('/access');
  revalidatePath('/finance');
  revalidatePath('/people');
}

export async function createApprovalLimit(
  _prev: ApprovalLimitActionResult,
  form: FormData
): Promise<ApprovalLimitActionResult> {
  const gate = await ownerGate();
  if ('error' in gate) return { ok: false, error: gate.error };
  const { supabase, ctx } = gate;

  const profileId = asUuid(form.get('profileId'));
  const action = asAction(form.get('action'));
  const projectId = asUuid(form.get('projectId'));
  const currency = String(form.get('currency') ?? '').trim().toUpperCase();
  const maxAmountMinor = Number(form.get('maxAmountMinor'));
  const hours = Number(form.get('hours') ?? 0);

  if (!profileId || !action || !/^[A-Z]{3}$/.test(currency)) {
    return { ok: false, error: 'Choose an active identity, bounded action and ISO currency.' };
  }
  if (!Number.isSafeInteger(maxAmountMinor) || maxAmountMinor < 0) {
    return { ok: false, error: 'Maximum amount must be a non-negative integer in minor currency units.' };
  }
  if (!Number.isFinite(hours) || hours < 0 || hours > 24 * 90) {
    return { ok: false, error: 'Limit duration must be permanent or between 1 hour and 90 days.' };
  }

  const now = new Date();
  const [memberResult, projectResult] = await Promise.all([
    supabase
      .from('organization_memberships')
      .select('profile_id')
      .eq('organization_id', ctx.organizationId)
      .eq('profile_id', profileId)
      .not('internal_role', 'is', null)
      .is('suspended_at', null)
      .lte('effective_from', now.toISOString())
      .or(`effective_until.is.null,effective_until.gt.${now.toISOString()}`)
      .limit(1)
      .maybeSingle(),
    projectId
      ? supabase
          .from('projects')
          .select('id')
          .eq('organization_id', ctx.organizationId)
          .eq('id', projectId)
          .neq('status', 'archived')
          .maybeSingle()
      : Promise.resolve({ data: { id: null }, error: null })
  ]);
  if (!memberResult.data) return { ok: false, error: 'Approval limits require an active internal identity.' };
  if (projectId && !projectResult.data) return { ok: false, error: 'Project scope was not found.' };

  const effectiveUntil = hours > 0 ? new Date(now.getTime() + hours * 60 * 60 * 1000).toISOString() : null;
  const { data, error } = await supabase
    .from('authority_approval_limits')
    .insert({
      organization_id: ctx.organizationId,
      profile_id: profileId,
      action,
      max_amount_minor: maxAmountMinor,
      currency,
      resource_type: projectId ? 'project' : null,
      resource_id: projectId,
      effective_from: now.toISOString(),
      effective_until: effectiveUntil,
      granted_by: ctx.user.id
    })
    .select('id')
    .single();
  if (error || !data) return { ok: false, error: 'Could not create approval limit.' };

  await Promise.all([
    supabase.from('activity_events').insert({
      organization_id: ctx.organizationId,
      actor_id: ctx.user.id,
      verb: 'access.approval_limit.created',
      object_table: 'authority_approval_limits',
      object_id: data.id,
      summary: `Set ${action} ceiling ${maxAmountMinor} ${currency} minor units for ${profileId}`,
      metadata: { profileId, action, maxAmountMinor, currency, projectId, effectiveUntil }
    }),
    supabase.from('audit_events').insert({
      organization_id: ctx.organizationId,
      actor_id: ctx.user.id,
      action: 'access.approval_limit.created',
      target_table: 'authority_approval_limits',
      target_id: data.id,
      classification: 'restricted',
      metadata: { profileId, action, maxAmountMinor, currency, projectId, effectiveUntil }
    })
  ]);

  refresh();
  return { ok: true };
}

export async function revokeApprovalLimit(
  _prev: ApprovalLimitActionResult,
  form: FormData
): Promise<ApprovalLimitActionResult> {
  const gate = await ownerGate();
  if ('error' in gate) return { ok: false, error: gate.error };
  const { supabase, ctx } = gate;
  const limitId = asUuid(form.get('limitId'));
  if (!limitId) return { ok: false, error: 'Invalid approval limit.' };

  const { data: limit } = await supabase
    .from('authority_approval_limits')
    .select('id,profile_id,action,max_amount_minor,currency')
    .eq('organization_id', ctx.organizationId)
    .eq('id', limitId)
    .is('revoked_at', null)
    .maybeSingle();
  if (!limit) return { ok: false, error: 'Approval limit is no longer active.' };

  const revokedAt = new Date().toISOString();
  const { error } = await supabase
    .from('authority_approval_limits')
    .update({ revoked_at: revokedAt, updated_at: revokedAt })
    .eq('organization_id', ctx.organizationId)
    .eq('id', limitId)
    .is('revoked_at', null);
  if (error) return { ok: false, error: 'Could not revoke approval limit.' };

  await supabase.from('audit_events').insert({
    organization_id: ctx.organizationId,
    actor_id: ctx.user.id,
    action: 'access.approval_limit.revoked',
    target_table: 'authority_approval_limits',
    target_id: limitId,
    classification: 'restricted',
    metadata: { profileId: limit.profile_id, action: limit.action, maxAmountMinor: limit.max_amount_minor, currency: limit.currency, revokedAt }
  });

  refresh();
  return { ok: true };
}
