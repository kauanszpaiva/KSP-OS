# Portal Invitation — KSP INC release contract

Status: implementation branch only; production email/database changes remain gated.

## Outcome

The KSP OS Client Portal invitation journey must preserve the invitation through account creation and email confirmation, then allow the authenticated recipient to accept the same one-time invitation. The invitation surface and transactional email should use the KSP INC operating identity: Onyx `#0D0D0D`, Graphite `#1E1E1E`, Steel `#575757`, Paper `#F2F2F2`, Signal `#A6C63A`, Sora display direction, and Inter body direction.

## Security invariants

- The raw invitation token remains one-time and is only stored hashed in the database.
- Acceptance remains authoritative in `accept_portal_invitation`; UI preview is not an authorization gate.
- Email address matching remains enforced server-side against the authenticated profile.
- Revoked, expired, accepted, and mismatched-email invitations must fail closed.
- No service-role credential is exposed to the browser.

## Signup behavior

When a recipient creates an account from `/invite/[token]`, `signUp` receives an `emailRedirectTo` pointing to `/auth/callback?next=/invite/[token]`. With email confirmation enabled, Supabase returns no session until confirmation; the UI must show a confirmation state rather than implying the user is already signed in. The callback exchanges the PKCE code and returns the user to the same invitation.

## Production email behavior

Portal invitation delivery remains transactional and provider-backed. The production template must keep:

- dynamic recipient/workspace/role/expiry/project context;
- unique invitation URL;
- inviter name, title, reply-to address, and profile photo when configured;
- plain-text alternative;
- one-time/private security notice;
- idempotent provider request;
- KSP INC visual tokens and copy.

The standalone official KSP INC logo asset must be used without redrawing or approximating it. Until that asset is present in a public production-safe location, production email must not substitute an invented logo.

## Release gates

1. Portal typecheck/build and relevant tests pass on the exact branch head.
2. Preview invitation route renders on desktop and mobile.
3. Signup-confirmation callback returns to the original invitation path.
4. Auth confirmation template and portal invitation template are reviewed before publish.
5. Production Supabase migration/template publish requires explicit release approval for the exact revision and environment.
