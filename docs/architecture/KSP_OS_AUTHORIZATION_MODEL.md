# KSP Dominion OS — Authorization Model

Authorization is enforced in depth. No single layer is trusted alone.

## Layers

1. **Authentication** — Supabase Auth session, resolved server-side via `getAuthContext` (`@ksp/auth`). No valid session → redirect to `/login`.
2. **Application authorization** — server actions call `@ksp/auth` guards and the `@ksp/permissions` `canPerform` engine before any write.
3. **Row Level Security** — every tenant table has RLS; user/anon keys can only touch rows their policies permit. This is the real backstop even if the app layer had a bug.
4. **Database invariants** — triggers/constraints enforce business rules independent of the caller (outcome cap, proof-gated completion, posted-record immutability).

## Key policy decisions (slice)

- **Tenant isolation**: helpers `current_org_ids()` / `is_internal_member()` scope reads to the caller's active organizations. Cross-org access is denied.
- **Outcomes**: internal members read; only executives insert/update/delete (`is_executive`).
- **Commitments**: internal members read (restricted rows hidden from non-exec, non-owner); creators insert as themselves; owner/assignee/executive update; executive delete.
- **Proofs**: members read; submitter inserts own; only executives accept (`accepted_*`) or delete.
- **Activity/audit**: append-only (no update/delete policy). Members append as themselves for their org.
- **Founder Vault**: `owner_id = auth.uid() AND is_founder(org)` on every command. No other policy references the table, so it is invisible to all other users and excluded from company/team/client surfaces.

## Sensitive-action gating

`@ksp/permissions` requires MFA for `finance.post`, `finance.reconcile`, `access.grant/revoke`, `production.deploy`, `payment.refund`, marks executive high-value/restricted actions as `approvalRequired`, and denies mutation of `posted` records. Dual-control / no-self-approval is enforced by the pre-existing `no_self_approval_insert` policy and `canApprove`.

## AI boundary

AI may draft/summarize/classify/recommend. It may not autonomously approve payments, grant permissions, publish client records, deploy to production, or delete critical data. No autonomous AI write path exists; `ai_actions` rows remain `draft`/`pending_review` until a human accepts.

## Recursion safety

Membership helper functions are `SECURITY DEFINER` with a pinned `search_path`, so evaluating a policy that reads `organization_memberships` cannot recurse into that table's own policy. This was a latent defect in prior migrations, fixed in `202607210001`.
