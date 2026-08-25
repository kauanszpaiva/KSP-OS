# Portal invitation findings — 2026-08-24

Observed against the live KSP OS Supabase project and canonical portal domain.

## Working

- `https://kspdominionportal.com` responds successfully.
- `/invite/<token>` route exists and responds successfully.
- Resend credentials for invitation delivery are configured in Vault.
- The live invitation trigger generates a unique raw token, stores only its SHA-256 hash, sends through Resend, validates provider response, and persists the provider message ID.
- `preview_portal_invitation` is authenticated-only and returns client-safe preview data.
- `accept_portal_invitation` accepts legacy and email-delivery token hashes and enforces revoked, already-accepted, expired, and authenticated-email mismatch checks.

## Defects / gaps

1. Signup from the invitation page did not provide `emailRedirectTo`, so with Supabase email confirmation enabled the user could confirm the account without being returned to the original invitation.
2. The invitation page still used the pre-KSP-INC visual treatment.
3. The production invitation email function still uses the pre-KSP-INC purple/green email design.
4. The published Supabase Auth confirmation template still uses KSP Dominion Group / purple styling.
5. The repository does not currently contain a standalone approved public KSP INC logo asset suitable for transactional email; the brand boards are the visual source of truth but must not be substituted for a production logo file.

## Branch remediation

`fix/portal-invite-ksp-inc` fixes #1 and #2 in application code and documents the gated production email work for #3–#5.
