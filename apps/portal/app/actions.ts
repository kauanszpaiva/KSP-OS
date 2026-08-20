'use server';

import { createHash } from 'node:crypto';
import { revalidatePath } from 'next/cache';
import { getPortalAuthContext } from '@ksp/auth';
import { canPerform } from '@ksp/permissions';
import { acceptPortalInvitationSchema, recordChangeOrderDecisionSchema, submitClientRequestSchema } from '@ksp/validation';
import { getServerSupabase } from '../lib/supabase';

export interface ActionResult {
  ok: boolean;
  error?: string;
}

const ERROR_MESSAGES: Record<string, string> = {
  invitation_not_found: 'This invitation link is invalid.',
  invitation_revoked: 'This invitation has been revoked.',
  invitation_already_accepted: 'This invitation has already been accepted.',
  invitation_expired: 'This invitation has expired. Ask KSP to send a new one.',
  invitation_email_mismatch: 'This invitation was sent to a different email address. Sign in with that email and try again.'
};

/**
 * Accepts a portal invitation for the currently signed-in user. All the
 * actual validation (revoked/accepted/expired/email match) and the
 * membership+invitation writes happen atomically inside the
 * accept_portal_invitation SECURITY DEFINER function (see migration
 * 202607230006) — this action just hashes the token, calls it, and maps
 * the raised exception to a plain message.
 */
export async function acceptPortalInvitation(_prev: ActionResult, form: FormData): Promise<ActionResult> {
  const supabase = await getServerSupabase();
  if (!supabase) return { ok: false, error: 'Supabase is not configured in this environment.' };

  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError || !userData.user) return { ok: false, error: 'Sign in first, then open the invitation link again.' };

  const parsed = acceptPortalInvitationSchema.safeParse({ token: form.get('token') });
  if (!parsed.success) return { ok: false, error: 'Invalid invitation link.' };

  const tokenHash = createHash('sha256').update(parsed.data.token).digest('hex');

  const { error } = await supabase.rpc('accept_portal_invitation', { p_token_hash: tokenHash });
  if (error) {
    return { ok: false, error: ERROR_MESSAGES[error.message] ?? 'Could not accept this invitation. Contact KSP if this continues.' };
  }

  return { ok: true };
}

/**
 * Records a client's accept/reject decision on a published change-order
 * version. change_order_client_decisions_portal_insert already enforces
 * decided_by=auth.uid() and is_portal_member(client_organization_id)
 * (202607150002) — this action supplies client_organization_id from the
 * version's own parent change_orders row (now portal-readable per
 * 202607230008) rather than trusting a client-submitted value.
 *
 * RLS alone only checks membership, not role — packages/permissions
 * already defines change_order.client_approve as client_owner /
 * client_project_approver only, so canPerform is the actual gate that
 * keeps a client_viewer or client_collaborator from recording a decision.
 */
export async function recordChangeOrderDecision(_prev: ActionResult, form: FormData): Promise<ActionResult> {
  const supabase = await getServerSupabase();
  if (!supabase) return { ok: false, error: 'Supabase is not configured in this environment.' };

  const ctx = await getPortalAuthContext(supabase);
  if (!ctx) return { ok: false, error: 'Sign in first, then try again.' };

  const parsed = recordChangeOrderDecisionSchema.safeParse({
    changeOrderVersionId: form.get('changeOrderVersionId'),
    decision: form.get('decision')
  });
  if (!parsed.success) return { ok: false, error: 'Invalid decision.' };

  const { data: version, error: versionError } = await supabase
    .from('change_order_versions')
    .select('id, change_orders!inner(organization_id, client_organization_id)')
    .eq('id', parsed.data.changeOrderVersionId)
    .eq('state', 'published_to_client')
    .maybeSingle<{ id: string; change_orders: { organization_id: string; client_organization_id: string } }>();
  if (versionError || !version) return { ok: false, error: 'This change order version is not available for decision.' };

  const decision = canPerform(ctx.membership, 'change_order.client_approve', {
    organizationId: version.change_orders.organization_id,
    clientOrganizationId: version.change_orders.client_organization_id,
    classification: 'public',
    publicationState: 'published_to_client'
  });
  if (!decision.allowed) return { ok: false, error: 'Only a workspace owner or project approver can record this decision.' };

  const { error } = await supabase.from('change_order_client_decisions').insert({
    organization_id: version.change_orders.organization_id,
    change_order_version_id: parsed.data.changeOrderVersionId,
    client_organization_id: version.change_orders.client_organization_id,
    decided_by: ctx.user.id,
    decision: parsed.data.decision
  });
  if (error) return { ok: false, error: 'Could not record your decision. Contact KSP if this continues.' };

  revalidatePath('/approvals');
  return { ok: true };
}

/**
 * client_requests_portal_insert already enforces submitted_by=auth.uid()
 * and status='submitted' (202607150002) — this action supplies both, plus
 * organization_id (NOT NULL but not checked by that policy), from the
 * session rather than trusting client-submitted values. request.submit is
 * allowed for every client role (per packages/permissions) — canPerform
 * is still called for consistency with recordChangeOrderDecision and to
 * enforce the same suspended/expired-membership checks RLS already applies.
 */
export async function submitClientRequest(_prev: ActionResult, form: FormData): Promise<ActionResult> {
  const supabase = await getServerSupabase();
  if (!supabase) return { ok: false, error: 'Supabase is not configured in this environment.' };

  const ctx = await getPortalAuthContext(supabase);
  if (!ctx || ctx.memberships.length === 0) return { ok: false, error: 'No active client membership found.' };
  const clientOrganizationId = ctx.memberships[0].clientOrganizationId;

  const rawProjectId = form.get('projectId');
  const parsed = submitClientRequestSchema.safeParse({
    title: form.get('title'),
    body: form.get('body'),
    projectId: rawProjectId ? rawProjectId : ''
  });
  if (!parsed.success) return { ok: false, error: 'Please provide a title and description.' };

  const decision = canPerform(ctx.membership, 'request.submit', {
    organizationId: ctx.organizationId,
    clientOrganizationId,
    classification: 'public'
  });
  if (!decision.allowed) return { ok: false, error: 'You are not permitted to submit a request.' };

  const { error } = await supabase.from('client_requests').insert({
    organization_id: ctx.organizationId,
    client_organization_id: clientOrganizationId,
    project_id: parsed.data.projectId || null,
    submitted_by: ctx.user.id,
    title: parsed.data.title,
    body: parsed.data.body,
    status: 'submitted'
  });
  if (error) return { ok: false, error: 'Could not submit your request. Contact KSP if this continues.' };

  revalidatePath('/requests');
  return { ok: true };
}
