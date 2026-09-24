# Projects and client invitation repair - 2026-09-23

## Scope and authority

Source: Kauan's request to repair KSP OS Projects and the client Portal invitation. Base commit: eb94660b4d101ad47c30d66a34d7ec4f10a0f596. Implementation is isolated in PR #181; this document is not production deployment approval. Follow AGENTS.md, reference/AGENTS.md and docs/spec/README.md.

No business records, identities, memberships, permissions or audit history are changed by this patch. It does not implement the earlier workspace-reset or Eric/Bruno account requests, and does not touch NextLevel.

## Reproduced defects

- Non-active projects were all rendered as archives, preventing draft search/editing. Only status=archived now belongs to Archives; status is shown separately from health.
- Desktop project selection reused uncontrolled form state. Project detail is now keyed by project ID, so another project's unsaved values cannot carry over.
- Invitation signup showed the same account/password advice for a missing service and an invalid invitation. Errors are now mapped to safe, actionable messages without provider details.
- The form now unlocks after thrown failures, locks fields/mode during a request, validates boolean success and applies new-password constraints only to signup.

## Evidence and limitations

GitHub Actions run 35938527951 executed the unchanged production implementation with the new regression tests after aligning the test JSX runtime to Next.js. Result: 10 behavioral failures and 1 passing control test. Examples: draft directory empty, draft search empty, first project's unsaved text carried to second project, login incorrectly constrained to 8 characters. This is the red baseline, not a release result. The PR records subsequent green evidence on its exact commit.

The component tests mock provider/network and child forms. They are not evidence of real email delivery, membership isolation, a published function, mobile visual quality or a complete production customer journey.

## Unresolved production dependency: signup Edge Function

Live KSPCENTER inventory inspected on 2026-09-23 did not contain `ksp-portal-invite-signup`. The Portal form invokes that exact name, and its source already exists at `supabase/functions/ksp-portal-invite-signup/index.ts`. A frontend deployment alone CANNOT restore new-customer signup while this dependency is missing. Initial invitation delivery and post-signup email confirmation are separate stages; neither is proven by these component tests.

Mapped production targets (revalidate before release):
- Repository: kauanszpaiva/KSP-OS.
- Supabase KSPCENTER: rmaxqwbjizivkhurvuvx.
- Portal: https://kspdominionportal.com, Vercel ksp-os-portal.
- Internal Command: https://www.appkspdominion.com, Vercel ksp-os-command.

## Controlled release checklist

Owner: Kauan or a separately approved release operator, with independent review.

1. Review PR #181 and the existing signup function; require full CI on the reviewed head. Keep production secrets outside GitHub/source/browser. Do not retrieve or copy service-role keys into this packet.
2. Test the function in a non-production environment with a controlled mailbox. Verify token hashing, exact invitation/email match, expiry, revocation, accepted-state rejection and confirmed-email requirements. Review the existing permissive Vercel preview-origin allowance and provider-call rate limiting before public production publication.
3. Verify the Resend template `ksp-auth-confirm-signup` is published, its `ACTION_URL` variable matches the function, and the sending domain/credential belongs to the mapped environment. Verify the existing server-only `ksp_get_resend_api_key` RPC privileges without exposing its return value.
4. After explicit production release approval, publish the reviewed `ksp-portal-invite-signup` function to the mapped KSPCENTER project using the public invite-token-gated configuration required by a not-yet-authenticated customer. This must not weaken other functions' JWT verification, RLS, email confirmation or invitation checks.
5. Deploy the reviewed Command/Portal changes to the mapped Vercel apps. Verify the deployed commit and Supabase binding, not merely a successful build.
6. Use an authorized controlled invitation to test: invitation email receipt -> correct /invite route -> new-account creation -> confirmation email -> return to same invitation -> acceptance -> only the intended client's resources. Also test existing-account login and wrong-email/expired/revoked/used tokens. Record redacted message IDs and outcomes, never bearer links or passwords.
7. Verify Projects on desktop and mobile: drafts visible, search works, switching selected projects resets edit values, explicit archives remain separate. Verify no data was recreated/deleted or status auto-promoted.

## Rollback

This PR has no schema/data migration. Revert the reviewed application commit or restore the previous verified Vercel deployment if necessary. Function publication is a distinct release; record its prior version/configuration before changes and restore that version if validation fails. Do not delete client accounts or history as a rollback shortcut.

## Completion gate

Code tests passing is not `Portal invitations fixed in production`. Keep the incident open until the missing runtime is deployed under approval and the controlled full invitation journey, access boundaries and delivery evidence are verified.
