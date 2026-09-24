const unavailable = 'Account activation is temporarily unavailable. Please contact KSP and ask them to check the invitation service.';
const fallback = 'We could not complete account activation. Please try again or contact KSP; if you already have an account, use Sign in.';

function asRecord(value: unknown): Record<string, unknown> | null {
  return typeof value === 'object' && value !== null ? value as Record<string, unknown> : null;
}

/** Map only known service codes; never expose raw provider responses or tokens. */
export async function describeInviteSignupError(data: unknown, error: unknown): Promise<string> {
  let payload = asRecord(data);
  let status: number | undefined;
  const context = asRecord(error)?.context;
  if (typeof Response !== 'undefined' && context instanceof Response) {
    status = context.status;
    try {
      payload = asRecord(await context.clone().json()) ?? payload;
    } catch {
      // A proxy may return HTML or an empty body; the status still helps.
    }
  }

  const code = typeof payload?.error === 'string' ? payload.error : '';
  if (status === 404 || status === 503 || [
    'signup_relay_unavailable', 'confirmation_link_unavailable', 'confirmation_email_unavailable'
  ].includes(code)) return unavailable;
  if (status === 429) return 'Too many attempts. Please wait a moment before trying again.';
  if (code === 'invitation_not_available') {
    return 'This invitation has expired or is no longer available, or the email does not match. Use the exact email that received it, or ask KSP for a new invitation.';
  }
  if (code === 'invalid_request') {
    return 'Check the invitation link, your email address and a password of 8 to 128 characters.';
  }
  if (status === 409 || code === 'account_could_not_be_created') {
    return 'We could not create this account. If you already registered, confirm your email and use Sign in, or reset your password.';
  }
  return fallback;
}
