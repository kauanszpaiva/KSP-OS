# Portal invitation email — production update plan

This plan stages the production-side changes required to align portal invitation delivery with the KSP INC operating identity. It does not authorize or execute production changes.

## Current production facts observed 2026-08-24

- Portal base URL: `https://kspdominionportal.com`.
- Resend provider key is configured in Supabase Vault.
- The invitation route responds successfully.
- Recent invitations created after the invitation-email trigger rollout are provider-backed and store a provider message ID.
- Earlier invitation rows without `email_token_hash` predate that trigger path and remain `not_sent`.
- `accept_portal_invitation` accepts either the legacy token hash or email-delivery token hash and enforces revoked / accepted / expired / authenticated-email checks.
- Production invitation HTML still uses the pre-KSP-INC purple/green identity.

## Approved visual contract to implement

- Onyx `#0D0D0D`
- Graphite `#1E1E1E`
- Steel `#575757`
- Paper `#F2F2F2`
- Signal `#A6C63A`
- Sora direction for headings with email-safe fallbacks
- Inter direction for body copy with email-safe fallbacks
- Inviter profile photo, name, title, signature, and reply-to when available
- Approved public KSP INC logo asset only; do not redraw or approximate the official logo

## Production change

Replace only the HTML/text composition inside `public.ksp_portal_invitation_email_before_insert()` while preserving:

- secure random token generation and SHA-256 hashing;
- Vault-backed Resend credential lookup;
- canonical portal base URL lookup;
- workspace / role / expiry / project context;
- HTML escaping;
- Resend idempotency key;
- provider status validation and message-id persistence;
- invitation acceptance / preview behavior and ACLs.

The Supabase Auth signup-confirmation Resend template must be updated to the same KSP INC identity and published only after preview/review. Its `ACTION_URL` behavior must remain unchanged.

## Rollback

- Application: revert the portal invitation UI commits.
- Resend: republish the previously published auth template revision.
- Database: apply a forward-fix migration restoring the previous invitation-email function body; do not rewrite migration history.

## Required release evidence

- exact Git commit SHA;
- successful repository checks/CI;
- preview rendering of `/invite/[token]` desktop + mobile;
- approved public KSP INC logo URL;
- email template review;
- one synthetic invitation through signup confirmation and acceptance;
- production smoke check after release.
