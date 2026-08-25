'use server';

import { createHash } from 'node:crypto';
import { revalidatePath } from 'next/cache';
import { acceptPartnerInvitationSchema } from '@ksp/validation';
import { getServerSupabase } from '../lib/supabase';
import { requireNetworkSession } from '../lib/network-session';

export interface NetworkInviteActionResult {
  ok: boolean;
  error?: string;
}

const INVITATION_ERRORS: Record<string, string> = {
  invitation_not_found: 'This invitation link is invalid.',
  invitation_revoked: 'This invitation has been revoked.',
  invitation_already_accepted: 'This invitation has already been accepted.',
  invitation_expired: 'This invitation has expired. Ask KSP to send a new one.',
  invitation_email_mismatch: 'This invitation was sent to a different email address.',
  partner_organization_inactive: 'This partner organization is not accepting invitations.',
  partner_membership_exists: 'This account already has Network access for this partner.',
  invitation_context_invalid: 'This invitation context is invalid.',
  partner_invitation_scope_not_supported: 'This invitation has a scope that Network cannot safely activate yet.',
  partner_invitation_team_scope_not_supported: 'This invitation has a team scope that Network cannot safely activate yet.'
};

export async function acceptPartnerInvitation(
  _prev: NetworkInviteActionResult,
  form: FormData
): Promise<NetworkInviteActionResult> {
  const supabase = await getServerSupabase();
  if (!supabase) return { ok: false, error: 'KSP Network is not configured in this environment.' };

  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError || !userData.user) return { ok: false, error: 'Sign in first, then open the invitation link again.' };

  const parsed = acceptPartnerInvitationSchema.safeParse({ token: form.get('token') });
  if (!parsed.success) return { ok: false, error: 'Invalid invitation link.' };

  const tokenHash = createHash('sha256').update(parsed.data.token).digest('hex');
  const { error } = await supabase.rpc('accept_partner_invitation', { p_token_hash: tokenHash });
  if (error) {
    const key = error.message.split(':')[0] ?? error.message;
    return { ok: false, error: INVITATION_ERRORS[key] ?? 'Could not accept this invitation. Contact KSP if this continues.' };
  }

  return { ok: true };
}

export async function respondToAssignment(form: FormData): Promise<void> {
  await requireNetworkSession();

  const assignmentId = String(form.get('assignmentId') ?? '').trim();
  const response = String(form.get('response') ?? '').trim();
  const note = String(form.get('note') ?? '').trim();

  if (!/^[0-9a-f-]{36}$/i.test(assignmentId)) return;
  if (!['accepted', 'declined', 'clarification_requested'].includes(response)) return;

  const supabase = await getServerSupabase();
  if (!supabase) return;

  const { error } = await supabase.rpc('respond_partner_assignment', {
    p_assignment_id: assignmentId,
    p_response: response,
    p_note: note || null
  });
  if (error) return;

  revalidatePath('/');
}
