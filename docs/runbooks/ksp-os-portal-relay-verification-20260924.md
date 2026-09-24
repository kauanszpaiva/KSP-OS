# Portal invitation relay continuation

## Scope and authority

Continuation of Kauan's request to finish KSP OS Projects, daily scheduling and client invitation repair. Base: 8bf21f0e4a80cff090477ca729cf6d6e958ebbc9, PR #181. Authoritative sources: AGENTS.md, reference/AGENTS.md, docs/spec/README.md, the existing invitation/email-confirmation contract, docs/specs/2026-09-23-project-day-scheduling.md and docs/runbooks/ksp-os-20260924-release-followup.md.

This bounded change repairs the ordinary client signup relay. It is not an alternate mechanism for the previously blocked bulk task deletion, Eric account transfer or Bruno production provisioning. No production operation is authorized or executed by this document.

## Requirement matrix

| Requirement | Prior source | Repair / verification | Residual boundary |
| --- | --- | --- | --- |
| Invalid JSON shapes cannot crash signup | Contradicted: null dereference | Typed object/string validation, controlled 400 | Runtime probe on exact deployed version |
| Credential inputs remain strings | Contradicted: numeric password coerced | Reject non-string inputs before querying providers | No password value logged |
| Payload handling bounded before privileged calls | Absent | Actual streamed byte limit 8192; controlled 413 | Platform overall limits remain separate |
| Provider failures are controlled and do not expose private error text | Partial: rejected promises escape; raw rollback message logged | Safe 503 paths; IDs-only rollback diagnostic | Delivery outage still blocks signup, intentionally |
| Existing accounts cannot be overwritten or deleted by a repeated signup | Implemented; preserve | Existing-account regression; zero link/delete/send calls following conflict | Does not validate real provider behavior end-to-end |
| Token, email, expiry and revocation bind signup | Implemented; preserve | Missing, wrong-email, expired, accepted and revoked invitation tests | Actual invite hash remains secret |
| Email verification remains required | Implemented; preserve | email_confirm:false, signup confirmation link, no session returned | Authorized-mailbox end-to-end test still required |

## Evidence

Original relay blob c964a3000be29e02275e3c829bb5d05468a9ff4e: local execution of the actual transpiled handler with synthetic adapters yielded 24 passing controls and 10 failures. Final relay blob e767af4a873e5ccde6e9b36c0a88b1dbea3e60b0: 34/34 passed. Adapters model PostgREST PromiseLike rather than incorrectly assuming query builders provide catch. Tests execute without network, real credentials, user accounts or email sends.

The test is scripts/check-portal-invite-relay.mjs and is wired into projects-portal-regression. It is not a Deno deployment/typecheck or real provider integration test. Runtime publication and final CI evidence must be read back and appended to the PR separately.

Local static evidence: node syntax check, git diff --check, configured secret scan, RLS coverage for 113 tables, migration checks for 75 files. Full locked dependencies could not be installed locally because network name resolution was unavailable; do not claim a local full build or suite. GitHub CI remains the authoritative full-suite gate.

## Previously completed hosted rehearsal

Existing branch afxqdoocjfuuieozfepz (parent production rmaxqwbjizivkhurvuvx): personal_task_day_schedule_rehearsal migration 20260924021646 applied. Four schedule RLS policies present; anonymous table read and save denied, authenticated save exposed under RLS. Transactional actor tests passed (save/move, overlap rejection, stale revision, peer and foreign-tenant denial, immutable scope, audit count, unschedule preserving task). All synthetic rows rolled back: zero users/projects/tasks/slots afterward. This is hosted database evidence, not a logged-in frontend journey.

Security advisor still reports warnings on pre-existing SECURITY DEFINER entry points; no new scheduling routine was in the finding list. Do not describe the whole database as warning-free.

## Controlled next step and release blockers

Publish this exact ordinary relay to the existing rehearsal branch only after source checks, then perform negative HTTP probes and verify zero account/invitation/email side effects. Keep the existing token-based authentication contract for pre-login callers; do not enable unguarded privileged actions. No new hosted project, secrets export or email send is required by negative probes.

Production remains a separate gate: independent review of the final candidate, approved migration/runtime mapping, controlled invitation/confirmation/login tests and authorized rollout. The earlier deletion/provisioning safety stops remain unresolved and must not be bypassed. Bruno has been contacted for independent review; a request is not a completed review. The connected Resend confirmation template exists and is published, which does not itself prove mail delivery.

Rollback before rollout: withhold the feature branch. Rehearsal function is isolated from production; stop rehearsal calls if probes fail and repair source before another publication. Do not restore/remove production records, modify unrelated functions, or weaken RLS/MFA/confirmation to achieve a green result.
