# KSP OS email template sources

These files are the versioned source for the Resend templates used by KSP OS authentication and client access.

## Aliases

- `ksp-auth-confirm-signup` -> `ksp-auth-confirm-signup.html`
- `ksp-portal-invitation` -> `ksp-portal-invitation.html`

## Brand contract

- KSP INC lockup: `https://kspdominionportal.com/ksp-inc-email-lockup.png`
- Carbon: `#0D0D0D`
- Paper: `#F2F2F2`
- Signal: `#A6C63A`
- Sora heading direction with Arial/Helvetica fallback
- Inter body direction with Arial/Helvetica fallback

## Release rule

Updating a template source or Resend draft is not authorization to publish it. Publish only after the portal asset is live, the exact application/database revision has passed CI, the template has been reviewed, and the signup/invitation smoke path is ready. Keep `ACTION_URL`, `INVITE_URL`, and the existing delivery/acceptance security contracts unchanged.
