# KSP OS Authority Engine V4 — Spec Compliance Gate

Status: implementation branch / review-gated  
Date: 2026-08-25  
Scope: KSP Inc owner control plane + shared authorization package + auth context + additive Supabase policy records

## Authoritative inputs

- DEC-0044 — Kauan and Vanessa are the full-control owner tier; every other identity is deny-by-default and explicitly scoped.
- DEC-0053 — KSP Inc above Command, Portal and Network on one canonical identity/data platform.
- KSP OS V2 Master Architecture Baseline (2026-08-25), section 4 Identity + Permission Model.
- KSP OS Access Graph V3 — existing scoped access graph and exact-task resource windows.
- UPD-0051 — proposed implementation-grade authority refinement: generic supervisor/team asymmetry, explicit deny, finance isolation, delegation ceiling and auditable access decisions.

This file is an implementation contract. It does not promote UPD-0051 to Canon, authorize production migration, or waive release/review gates.

## Requirement matrix

| ID | Requirement | State in this branch | Evidence |
| --- | --- | --- | --- |
| AUTH-V4-001 | Deny by default | Implemented | `packages/permissions/src/index.ts` final `insufficient_scope` path |
| AUTH-V4-002 | Explicit deny wins over role/grant/relationship | Implemented | `ScopedPermissionDeny`, `explicit_deny` evaluation before allow paths, unit test |
| AUTH-V4-003 | Supervisor authority is directional and downward only | Implemented | `AuthorityRelationship(type=supervises)` + subordinate resource-owner match |
| AUTH-V4-004 | Supervision never inherits finance/admin authority | Implemented | `supervisorOperationalActions` allowlist + financial exclusion + unit test |
| AUTH-V4-005 | Finance is decomposed into separate capabilities | Implemented as capability model | additive `permission_action` labels for invoice/AP/AR/payment/payout/tax/margin/cash/reconciliation |
| AUTH-V4-006 | Scoped grants remain scoped in memory | Preserved | existing `ScopedPermissionGrant` behavior + `packages/auth/src/context.ts` |
| AUTH-V4-007 | Time-bounded denies/relationships | Implemented | effective windows in DB + policy engine |
| AUTH-V4-008 | Delegation cannot exceed delegator authority | Implemented in policy package | `canDelegate()` and tests |
| AUTH-V4-009 | Protected actions cannot be directly delegated | Implemented | `nonDelegableActions` + `delegation_requires_owner_workflow` |
| AUTH-V4-010 | Sensitive actions require MFA/AAL2 | Implemented/preserved | `sensitiveActions` + `getSessionAal()` + owner mutation gates |
| AUTH-V4-011 | Break-glass is owner-only, AAL2, scoped, short-lived, reasoned and audited | Implemented foundation | `access_break_glass_sessions`, RLS, max 30m check, KSP Inc action + audit event |
| AUTH-V4-012 | Break-glass only overrides an explicit deny in same action/scope | Implemented | `matchesBreakGlass()` + KSP Inc mutation precondition + test |
| AUTH-V4-013 | Policy changes preserve history rather than hard delete | Implemented | no DELETE grants; `revoked_at`; DB test |
| AUTH-V4-014 | Server/runtime loads denies + relationships | Implemented | `packages/auth/src/context.ts` |
| AUTH-V4-015 | Access decisions explain why | Implemented | `AuthorizationResult.trace` + reason/outcome |
| AUTH-V4-016 | Safe View As must not impersonate another session | Implemented for internal identities | owner-only read-only Access Decision Explorer evaluates stored policy without switching auth identity |
| AUTH-V4-017 | KSP Inc owners can create/revoke deny and relationship policy rows | Implemented in source | `apps/inc/app/access/authority-actions.ts` + RLS |
| AUTH-V4-018 | KSP Inc presents active policy evidence | Implemented | `authority-data.ts`, `authority-admin-panel.tsx` |
| AUTH-V4-019 | New policy tables use RLS and minimum grants | Implemented in migration source | explicit grants + authenticated policies; anon revoked |
| AUTH-V4-020 | Cross-user policy rows cannot be enumerated by non-executives | Implemented in migration source | self/source-only SELECT policies + SQL actor-matrix test |
| AUTH-V4-021 | Existing Access Graph V3 remains additive/compatible | Designed / pending CI proof | no destructive changes to V3 tables; new tables/actions only |
| AUTH-V4-022 | Configurable role-template registry | Partial | current internal/client roles remain default templates; generic data-driven template registry is not introduced in this slice |
| AUTH-V4-023 | Invite payload carries surface/org/role/scope/team/expiry | Implemented as a bounded V5 contract | shared `@ksp/validation` schema, Portal persistence/acceptance, MFA-gated Network issuance, Network signup/callback/acceptance, and negative SQL plan. Network project/team scopes fail closed until a dedicated ledger exists |
| AUTH-V4-024 | Finance endpoints enforce the new granular capability names | Partial | capability vocabulary exists; existing finance handlers still require a bounded migration from legacy `finance.*` checks |
| AUTH-V4-025 | Partner/Network runtime consumes relationship policy directly | Partial | shared package supports it; Network-specific subject-context loader is a separate follow-on integration |
| AUTH-V4-026 | Production schema/data unchanged by branch creation | Verified | only GitHub branch writes and read-only Supabase inspection were performed |

## Invitation context V5

The invitation is a server-authored context envelope, not a client-supplied permission claim. It is persisted with `surface`, `context_version`, `organization_id`, surface-specific tenant scope, optional `team_key`, explicit `projectIds`, expiry and a one-time token hash.

- Portal issuance is executive-gated and rejects a client organization outside the current KSP organization. Client owners receive the bounded list of current non-archived project ids; other roles begin with an empty project list and require later explicit grants.
- Network issuance is owner-only with AAL2. It creates a `partner_invitations` row and returns a one-time link; it does not create membership before acceptance.
- Portal and Network preview functions expose only workspace/partner name, role, expiry and derived status. They never expose email, ids or token material to the browser.
- Acceptance revalidates the token hash, status, expiry, profile email, surface and tenant scope inside a `SECURITY DEFINER` transaction. Duplicate acceptance and membership collisions fail closed and are audited.
- Network project/team scopes are rejected until the runtime has a dedicated scope ledger; carrying an unsupported scope can never silently widen partner visibility.
- The real provider email, callback, owner session and cross-tenant E2E proof remain release gates; this branch does not publish a migration or send an invitation.


## Policy order

For a protected request, the shared engine evaluates:

1. active identity / suspension;
2. organization boundary;
3. active explicit deny;
4. valid owner break-glass override for the same denied action/resource;
5. MFA requirement for sensitive action;
6. immutable/posted record-state guard;
7. organization or scoped explicit grants;
8. directional authority relationship;
9. executive owner fallback with approval requirement for high-risk/restricted work;
10. assigned-project internal defaults;
11. Portal publication, classification and project isolation;
12. final deny.

A UI-hidden control is never considered authorization evidence.

## Supervisor invariant

`SUPERVISES(A, B)` is not a role inheritance relationship.

A may receive only the bounded operational actions in the shared allowlist when the protected work is owned by or assigned to B and the relationship scope matches. The edge does not grant invoice, AP/AR, payment, payout, tax, margin, cash, reconciliation, access-control or production-deploy authority. B receives nothing merely because A supervises B.

## Financial isolation

Authority Engine V4 introduces separate policy capabilities for:

- invoice read/create/submit/approve/pay;
- payment status/schedule/mark-paid/refund;
- AR and AP management;
- payout method and tax profile management;
- internal pricing, margin and cash read;
- reconciliation management;
- legacy `finance.read/post/reconcile` compatibility.

The enum additions are additive. Existing finance behavior is not silently changed until individual handlers are migrated and tested.

## Break-glass invariant

Break-glass is not a permanent God Mode.

- KSP Inc owner only;
- application owner gate + AAL2;
- DB policy also requires executive membership + JWT `aal2`;
- concrete resource scope;
- 5–30 minute application window, DB hard maximum 30 minutes;
- minimum reason length;
- only useful when a matching explicit deny exists;
- creates activity + audit events;
- can be revoked early;
- history cannot be hard-deleted by authenticated users.

## Database source change

Migration source:

- `supabase/migrations/20260825150000_authority_engine_v4.sql` — authority policy, relationships and break-glass primitives.
- `supabase/migrations/20260825152000_portal_invitation_context_v4.sql` — Portal invitation scope persistence, project validation and acceptance.
- `supabase/migrations/20260825173000_invitation_context_v5.sql` — Network invitation primitives, preview/accept RPCs and shared context checks.
- `supabase/migrations/20260825174000_invitation_context_v5_hardening.sql` — final Network/Portal acceptance hardening, RLS and fail-closed scope rules.
- `supabase/tests/invitation_context_v5.test.sql` — negative actor/RLS/concurrency-oriented SQL test plan.

The normal Supabase CLI migration-name generator was unavailable in the execution environment, so the repository's timestamp naming convention was used manually. This is a source-only change until a separate authorized non-production migration run proves it.

New tables:

- `internal_permission_denies`
- `authority_relationships`
- `access_break_glass_sessions`
- `partner_invitations`

No existing user, membership, grant, invoice, payment, project or production data is modified by the migration body.

## Verification required before review-ready

Automated:

- permission package unit tests;
- TypeScript typecheck;
- lint/format;
- database reset/migration replay;
- `supabase/tests/authority_engine_v4.test.sql`;
- existing Access Graph V3 negative tests;
- repository integration tests/builds.

Security review:

- explicit-deny precedence cannot be bypassed through direct API/SQL;
- subordinate cannot enumerate supervisor authority rows;
- non-owner cannot create/revoke authority policy;
- AAL1 owner cannot mint break-glass;
- authenticated DELETE on policy history fails;
- cross-organization attempts remain denied;
- existing Portal and Network isolation tests remain green.

## Rollback

Before production promotion, rollback is simply branch/PR closure.

After a future approved migration promotion, do not drop policy-history tables as the first rollback step. Disable new UI/runtime consumption first, preserve audit rows, and use a reviewed forward migration for schema changes. Enum labels are additive and should be treated as non-destructive compatibility surface.

## Current release state

**NOT PRODUCTION-READY.**

The source implementation is intentionally review-gated. Production migration, permission mutations, external invitations, money movement and merge remain outside this branch action until exact-head CI, database replay, security review and owner/reviewer release gates pass.
