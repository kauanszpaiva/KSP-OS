'use server';

import { createHash } from 'node:crypto';
import { revalidatePath } from 'next/cache';
import { getPortalAuthContext } from '@ksp/auth';
import { canPerform } from '@ksp/permissions';
import { acceptPortalInvitationSchema, recordChangeOrderDecisionSchema, submitClientRequestSchema } from '@ksp/validation';
import { getServerSupabase } from '../lib/supabase';
import { isPortalViewAsActive } from '../lib/view-as';
import { sendNewClientRequestEmail, sendApprovalCompletedEmail } from '@ksp/notifications';

export interface ActionResult {
  ok: boolean;
  error?: string;
}

const VIEW_AS_READ_ONLY_ERROR = 'View As is read-only. Exit View As before making changes.';

async function rejectViewAsMutation(supabase: NonNullable<Awaited<ReturnType<typeof getServerSupabase>>>): Promise<ActionResult | null> {
  return (await isPortalViewAsActive(supabase)) ? { ok: false, error: VIEW_AS_READ_ONLY_ERROR } : null;
}

const ERROR_MESSAGES: Record<string, string> = {
  invitation_not_found: 'This invitation link is invalid.',
  invitation_revoked: 'This invitation has been revoked.',
  invitation_already_accepted: 'This invitation has already been accepted.',
  invitation_expired: 'This invitation has expired. Ask KSP to send a new one.',
  invitation_email_mismatch: 'This invitation was sent to a different email address. Sign in with that email and try again.'
};

export async function acceptPortalInvitation(_prev: ActionResult, form: FormData): Promise<ActionResult> {
  const supabase = await getServerSupabase();
  if (!supabase) return { ok: false, error: 'Supabase is not configured in this environment.' };
  const viewAsBlock = await rejectViewAsMutation(supabase);
  if (viewAsBlock) return viewAsBlock;

  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError || !userData.user) return { ok: false, error: 'Sign in first, then open the invitation link again.' };
  const parsed = acceptPortalInvitationSchema.safeParse({ token: form.get('token') });
  if (!parsed.success) return { ok: false, error: 'Invalid invitation link.' };
  const tokenHash = createHash('sha256').update(parsed.data.token).digest('hex');
  const { error } = await supabase.rpc('accept_portal_invitation', { p_token_hash: tokenHash });
  if (error) return { ok: false, error: ERROR_MESSAGES[error.message] ?? 'Could not accept this invitation. Contact KSP if this continues.' };
  return { ok: true };
}

export async function recordChangeOrderDecision(_prev: ActionResult, form: FormData): Promise<ActionResult> {
  const supabase = await getServerSupabase();
  if (!supabase) return { ok: false, error: 'Supabase is not configured in this environment.' };
  const viewAsBlock = await rejectViewAsMutation(supabase);
  if (viewAsBlock) return viewAsBlock;

  const ctx = await getPortalAuthContext(supabase);
  if (!ctx) return { ok: false, error: 'Sign in first, then try again.' };
  const parsed = recordChangeOrderDecisionSchema.safeParse({ changeOrderVersionId: form.get('changeOrderVersionId'), decision: form.get('decision') });
  if (!parsed.success) return { ok: false, error: 'Invalid decision.' };
  const { data: version, error: versionError } = await supabase
    .from('change_order_versions')
    .select('id, version_number, change_orders!inner(organization_id, client_organization_id)')
    .eq('id', parsed.data.changeOrderVersionId)
    .eq('state', 'published_to_client')
    .maybeSingle<{ id: string; version_number: number; change_orders: { organization_id: string; client_organization_id: string } }>();
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
  void sendApprovalCompletedEmail('team@ksp.example.com', `Change Order v${version.version_number ?? ''}`, `${process.env.NEXT_PUBLIC_BASE_URL ?? ''}/approvals`);
  revalidatePath('/approvals');
  return { ok: true };
}

export async function submitClientRequest(_prev: ActionResult, form: FormData): Promise<ActionResult> {
  const supabase = await getServerSupabase();
  if (!supabase) return { ok: false, error: 'Supabase is not configured in this environment.' };
  const viewAsBlock = await rejectViewAsMutation(supabase);
  if (viewAsBlock) return viewAsBlock;

  const ctx = await getPortalAuthContext(supabase);
  if (!ctx || ctx.memberships.length === 0) return { ok: false, error: 'No active client membership found.' };
  const clientOrganizationId = ctx.memberships[0].clientOrganizationId;
  const rawProjectId = form.get('projectId');
  const parsed = submitClientRequestSchema.safeParse({ title: form.get('title'), body: form.get('body'), projectId: rawProjectId ? rawProjectId : '' });
  if (!parsed.success) return { ok: false, error: 'Please provide a title and description.' };
  const decision = canPerform(ctx.membership, 'request.submit', { organizationId: ctx.organizationId, clientOrganizationId, classification: 'public' });
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
  void sendNewClientRequestEmail('team@ksp.example.com', parsed.data.title, `${process.env.NEXT_PUBLIC_BASE_URL ?? ''}/requests`);
  revalidatePath('/requests');
  return { ok: true };
}

export async function postComment(_prev: ActionResult, form: FormData): Promise<ActionResult> {
  const supabase = await getServerSupabase();
  if (!supabase) return { ok: false, error: 'Supabase is not configured in this environment.' };
  const viewAsBlock = await rejectViewAsMutation(supabase);
  if (viewAsBlock) return viewAsBlock;
  const ctx = await getPortalAuthContext(supabase);
  if (!ctx || ctx.memberships.length === 0) return { ok: false, error: 'No active client membership found.' };
  const objectTable = form.get('objectTable');
  const objectId = form.get('objectId');
  const body = form.get('body');
  if (!objectTable || !objectId || !body || typeof body !== 'string') return { ok: false, error: 'Missing required fields.' };
  const { error } = await supabase.from('comments').insert({ organization_id: ctx.organizationId, object_table: objectTable.toString(), object_id: objectId.toString(), author_id: ctx.user.id, body: body.toString(), visibility: 'client' });
  if (error) return { ok: false, error: 'Could not post comment. Contact KSP if this continues.' };
  return { ok: true };
}

export async function recordDeliverableDecision(_prev: ActionResult, form: FormData): Promise<ActionResult> {
  const supabase = await getServerSupabase();
  if (!supabase) return { ok: false, error: 'Supabase is not configured in this environment.' };
  const viewAsBlock = await rejectViewAsMutation(supabase);
  if (viewAsBlock) return viewAsBlock;
  const ctx = await getPortalAuthContext(supabase);
  if (!ctx || ctx.memberships.length === 0) return { ok: false, error: 'No active client membership found.' };
  const approvalRequestId = form.get('approvalRequestId');
  const decision = form.get('decision');
  if (!approvalRequestId || !decision || typeof decision !== 'string') return { ok: false, error: 'Missing required fields.' };
  const { error } = await supabase.from('approval_decisions').insert({ organization_id: ctx.organizationId, approval_request_id: approvalRequestId.toString(), approver_id: ctx.user.id, decision: decision.toString() });
  if (error) return { ok: false, error: 'Could not record decision. Contact KSP if this continues.' };
  return { ok: true };
}

export async function markNotificationRead(id: string) {
  const supabase = await getServerSupabase();
  if (!supabase || await isPortalViewAsActive(supabase)) return;
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;
  await supabase.from('notifications').update({ read_at: new Date().toISOString() }).eq('id', id).eq('recipient_id', user.id);
}
