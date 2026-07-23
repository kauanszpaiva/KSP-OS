'use server';

import { createHash } from 'node:crypto';
import { acceptPortalInvitationSchema } from '@ksp/validation';
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
