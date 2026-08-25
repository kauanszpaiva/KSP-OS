# Portal invitation release smoke check

Use this after a preview deployment and again after an approved production release.

1. Open a fresh invitation URL in a signed-out browser session.
2. Confirm the invitation page uses the KSP INC Onyx / Paper / Signal identity and remains usable at mobile width.
3. Choose **Create account**, enter the exact invited email and a valid password, and submit.
4. When email confirmation is required, confirm the page shows a "check your email" state and does not claim access is active yet.
5. Open the signup confirmation email. Confirm the action URL resolves through `/auth/callback` and returns to the same `/invite/<token>` path.
6. Confirm the authenticated invitation preview shows workspace, role, expiry, and status without exposing the invitation email or internal IDs.
7. Accept the invitation and confirm the user lands on `/home` with only authorized client access.
8. Re-open the same invitation and confirm it is blocked as already accepted.
9. Confirm an invitation opened while signed in with a different email fails on acceptance with the email-mismatch message.
10. Confirm expired and revoked invitations remain blocked.

## Email visual check

Confirm the transactional invitation and signup-confirmation emails use the KSP INC identity tokens, readable email-safe typography, a public approved KSP INC logo asset, the inviter profile photo/signature where available, reply-to, plain text, expiry, and the private one-time-link notice.
