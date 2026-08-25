# Portal invitation email - production update plan

This plan stages the production-side changes required to align portal invitation delivery with the KSP INC operating identity. It does not authorize or execute production changes.

## Current production facts observed 2026-08-24

- Portal base URL: `https://kspdominionportal.com`.
- Resend provider key is configured in Supabase Vault.
- The invitation route responds successfully.
- Recent invitations created after the invitation-email trigger rollout are provider-backed and store a provider message ID.
- Earlier invitation rows without `email_token_hash` predate that trigger path and remain `not_sent`.
- `accept_portal_invitation` accepts either the legacy token hash or email-delivery token hash and enforces revoked / accepted / expired / authenticated-email checks.
- Production invitation HTML still uses the pre-KSP-INC identity until the forward migration is applied.

## KSP INC release asset

- Release path: `apps/portal/public/ksp-inc-email-lockup.png`.
- The release asset is a lossless crop/downscale of the approved KSP INC primary lockup shown in the KSP Brand Identity System source; it is not redrawn, recolored, or re-typeset.
- It is a delivery derivative for email/web use, not a replacement for the original brand master.
- Canonical runtime URL after application deployment: `https://kspdominionportal.com/ksp-inc-email-lockup.png`.

## Approved visual contract

- Carbon `#0D0D0D`
- Graphite `#1E1E1E`
- Steel `#575757`
- Paper `#F2F2F2`
- Signal `#A6C63A`
- Sora direction for headings with email-safe fallbacks
- Inter direction for body copy with email-safe fallbacks
- Inviter profile photo, name, title, signature, and reply-to when available

## Versioned changes

- The forward migration replaces only `public.ksp_portal_invitation_email_before_insert()` presentation/default branding while preserving secure token generation and SHA-256 hashing, Vault-backed Resend credential lookup, canonical portal base URL lookup, workspace / role / expiry / project context, HTML escaping, Resend idempotency, provider status validation, message-id persistence, invitation acceptance behavior, and ACLs.
- Versioned Resend source lives under `supabase/email-templates/` for `ksp-auth-confirm-signup` and `ksp-portal-invitation`.
- The signup-confirmation template keeps `ACTION_URL` unchanged so the existing PKCE callback can return a newly confirmed client to the exact invitation route.

## Required release order

1. Merge/deploy the portal application revision so the KSP INC lockup URL is live.
2. Verify the logo URL and `/invite/[token]` preview on desktop/mobile.
3. Apply the forward Supabase migration through the normal migration deployment path; do not patch the production function manually.
4. Publish the reviewed Resend template revisions.
5. Run one synthetic invitation through signup confirmation and acceptance.
6. Perform the production smoke check and record evidence.

## Rollback

- Application: revert the portal invitation/asset commits.
- Resend: republish the previously published template revision.
- Database: apply a forward-fix migration restoring the previous invitation-email function body; do not rewrite migration history.

## Required release evidence

- exact Git commit SHA;
- successful repository checks/CI;
- preview rendering of `/invite/[token]` desktop + mobile;
- live KSP INC logo URL;
- email template review;
- one synthetic invitation through signup confirmation and acceptance;
- production smoke check after release.
