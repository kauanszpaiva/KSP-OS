# Portal invitation acceptance criteria

- [ ] Signed-out invitation route renders the KSP INC operating identity without the legacy gradient/purple treatment.
- [ ] Existing client can sign in from the invitation and continue to acceptance.
- [ ] New client can create an account from the invitation with the exact invited email.
- [ ] If Supabase requires email confirmation, the UI shows a pending-confirmation state and the confirmation link returns through `/auth/callback` to the same invitation URL.
- [ ] After authentication, workspace, role, expiry, and status preview render without exposing invitation email or internal IDs.
- [ ] Acceptance still uses the server-side `accept_portal_invitation` gate and redirects to `/home` only after success.
- [ ] Revoked, expired, accepted, and email-mismatch invitations remain fail-closed.
- [ ] Transactional invitation and signup-confirmation emails use the KSP INC Onyx/Paper/Signal identity, inviter photo/signature where available, and an approved public official KSP INC logo asset.
- [ ] Resend/Supabase production changes remain versioned, reviewable, and explicitly approved before release.
