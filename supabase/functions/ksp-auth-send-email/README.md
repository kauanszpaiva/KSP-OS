# KSP OS Auth Email Hook

This Edge Function routes Supabase Auth email events through the KSP Dominion Group Resend identity.

## Scope

Supported authentication emails:

- Confirm sign up -> `ksp-auth-confirm-signup`
- Invite user -> `ksp-auth-invite`
- Magic link / email OTP -> `ksp-auth-magic-link`
- Reset password -> `ksp-auth-password-recovery`
- Change email address -> `ksp-auth-email-change`
- Reauthentication -> `ksp-auth-reauthentication`

Supported security notifications:

- Password changed -> `ksp-auth-password-changed`
- Email changed -> `ksp-auth-email-changed`
- Phone changed -> `ksp-auth-phone-changed`
- Sign-in method linked -> `ksp-auth-identity-linked`
- Sign-in method removed -> `ksp-auth-identity-unlinked`
- Verification method added -> `ksp-auth-mfa-enrolled`
- Verification method removed -> `ksp-auth-mfa-unenrolled`

All aliases above must be published in the KSP Resend account before the hook is enabled.

## Sender identity

- Account/Auth: `KSP OS <notifications@mail.kspdominion.group>`
- Security: `KSP OS Security <notifications@mail.kspdominion.group>`
- Reply-To: `kauan@kspdominion.group`

`mail.kspdominion.group` must remain verified for sending. Email open/click tracking should remain disabled for Auth emails so verification links are not rewritten.

## Required Supabase secrets

Configure these as Supabase Edge Function secrets. Never commit their values.

- `RESEND_API_KEY`
- `SEND_EMAIL_HOOK_SECRET`

`SUPABASE_URL` is provided by the Supabase runtime.

## Auth Hook

After the secrets are configured, enable a Supabase **Send Email** Auth Hook that points to:

`https://tqwnsxjrlomosfblleqy.supabase.co/functions/v1/ksp-auth-send-email`

The function intentionally has platform JWT verification disabled because Supabase Auth authenticates the hook request with a Standard Webhooks signature using `SEND_EMAIL_HOOK_SECRET`. Requests with invalid signatures are rejected.

## Security notifications

Supabase security notification emails are only generated when their corresponding project-level notification flags are enabled. Enable all seven KSP-supported notification types after review:

- password changed
- email changed
- phone changed
- MFA factor enrolled
- MFA factor unenrolled
- identity linked
- identity unlinked

## Secure email change

When Supabase Secure Email Change is enabled, the hook sends two confirmation emails. Supabase uses counterintuitive backwards-compatible hash names:

- `token_hash_new` -> current email
- `token_hash` -> new email

Do not swap these mappings.

## Release verification

Before calling this production-ready:

1. Verify both required Edge Function secrets are configured without exposing their values.
2. Verify the Send Email Auth Hook is enabled and points to the exact production function URL.
3. Verify all seven security notifications are enabled if KSP intends to send them.
4. Trigger password recovery only on an authorized controlled test account.
5. Confirm the Supabase Auth log no longer sends recovery mail from `noreply@mail.app.supabase.io`.
6. Confirm Resend records the message as sent/delivered from the KSP sender identity.
7. Open the recovery link and verify the KSP OS callback/update-password journey succeeds.
8. Verify invite/magic-link and secure-email-change paths with controlled accounts.

Do not use real client identities for release smoke tests unless explicitly authorized.
