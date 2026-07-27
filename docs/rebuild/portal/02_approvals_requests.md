# Phase P2 — Approvals/Change Orders + Requests/Support

Group: Portal · Status: ✅ done & verified

---

## A confirmed, then fixed, RLS gap — the first task of this phase

`portal_home_projects.sql` (Phase P1) flagged, but didn't yet fix, a suspected bug: `change_order_versions_portal_read`/`change_order_items_portal_read` both gate through `exists(select 1 from change_orders co where ... and is_portal_member(co.client_organization_id))`, but `change_orders` itself had only `change_orders_internal` (internal-only) — no portal-select policy at all. Confirmed by direct inspection before writing any UI on top of it (`grep` across `202607150002_identity_portal_finance_security.sql`): the internal-only policy was the *only* policy on `change_orders`. Since Postgres re-evaluates a referenced table's own RLS for the querying role inside a policy subquery, this meant `change_order_versions_portal_read`/`change_order_items_portal_read` were dead code for real client sessions — a client could never actually see a published change order, no matter how correctly everything downstream was built. Fixed first, in `supabase/migrations/202607230008_portal_approvals_requests.sql`, with `change_orders_portal_read on change_orders for select using (is_portal_member(client_organization_id))` — the same scoping the row already carries, no new business rule invented.

## A second gap found while building the server action: RLS checks membership, not role

`packages/permissions` already defines `change_order.client_approve` restricted to `client_owner`/`client_project_approver` only (`canPerform`, in the existing client-membership branch) — but no RLS policy anywhere enforces `client_role`, only `is_portal_member()` (membership existence). The first draft of `recordChangeOrderDecision` relied on RLS alone and would have let any client role — including `client_viewer`/`client_collaborator` — accept or reject a change order, silently bypassing a permission rule that already existed in the codebase for exactly this purpose. Fixed before this phase's checks were run: the action now calls `getPortalAuthContext` (rather than a bare `supabase.auth.getUser()`) and gates on `canPerform(ctx.membership, 'change_order.client_approve', ...)` before inserting the decision. `submitClientRequest` was updated the same way for consistency, calling `canPerform(..., 'request.submit', ...)` (allowed for every client role, per the existing rule) rather than skipping the permission layer entirely.

## Mini-group P2.1 — Approvals & Change Orders

Purpose: versions awaiting client review, accept/reject, approval history.

| Task | Status | Detail |
|---|---|---|
| P2.1.1 Migration | ✅ | `202607230008_portal_approvals_requests.sql` — the `change_orders_portal_read` fix above. No other new RLS policies needed: `change_order_client_decisions` already has portal insert (`decided_by=auth.uid()` + `is_portal_member`) and read policies from the identity/portal migration. |
| P2.1.2 Types | ✅ | `packages/database/src/types.ts` — `ChangeOrder`, `ChangeOrderVersion`, `ChangeOrderItem`, `ChangeOrderClientDecision`. |
| P2.1.3 Validation | ✅ | `recordChangeOrderDecisionSchema` (`changeOrderVersionId: uuid`, `decision: 'accepted' \| 'rejected'`) in `packages/validation/src/schemas.ts`. |
| P2.1.4 Data layer | ✅ | `apps/portal/app/(portal)/data.ts` — `getChangeOrderVersions` (joins `change_orders!inner` for `project_id`, filtered to `state='published_to_client'`), `getChangeOrderItems`, `getChangeOrderDecisions`. |
| P2.1.5 Server action | ✅ | `apps/portal/app/actions.ts` — `recordChangeOrderDecision`. Re-reads `client_organization_id`/`organization_id` from the version's own parent `change_orders` row (now portal-readable) rather than trusting client input, and gates on `canPerform(ctx.membership, 'change_order.client_approve', ...)` — the role-restriction fix described above. |
| P2.1.6 UI | ✅ | `apps/portal/app/(portal)/approvals/page.tsx` — versions awaiting decision (with itemized breakdown and accept/reject buttons via `_components/decision-form.tsx`) and decided ones as history. The project-detail page's P1 placeholder "Approved changes" card is replaced with the real per-project change-order list, linking back to `/approvals` for undecided versions. |
| P2.1.7 Nav | ✅ | `Approvals` flipped `planned` → `live` in `apps/portal/lib/nav.ts`. |

## Mini-group P2.2 — Requests & Support

Purpose: submit and track `client_requests`, plus client-visible comments/status history.

| Task | Status | Detail |
|---|---|---|
| P2.2.1 Validation | ✅ | `submitClientRequestSchema` (`title`, `body`, optional `projectId`) in `packages/validation/src/schemas.ts`. |
| P2.2.2 Server action | ✅ | `apps/portal/app/actions.ts` — `submitClientRequest`. Reads `organization_id`/`client_organization_id` from `getPortalAuthContext` rather than a raw `client_memberships` query, and calls `canPerform(..., 'request.submit', ...)` for consistency with `recordChangeOrderDecision` (every client role is allowed, per the existing rule — this is a consistency fix, not a new restriction). |
| P2.2.3 Data layer | ✅ | Reuses P1's `getClientRequests`; adds `getRequestComments(requestId)` (`request_comments` where `visibility='client'`) and `getRequestStatusHistory(requestId)` (`request_status_history` where `client_visible=true`) — both pre-existing RLS-scoped policies from the identity/portal migration, exercised by the app for the first time this phase. |
| P2.2.4 UI | ✅ | `apps/portal/app/(portal)/requests/page.tsx` — a new-request form (`_components/new-request-form.tsx`, with an optional project picker sourced from the client's own published projects) and the client's request list with an expandable per-request status-history + comment thread (`_components/request-row.tsx`). |
| P2.2.5 Nav | ✅ | `Meetings & Requests` flipped `planned` → `live` in `nav.ts`. |
| P2.2.6 Meetings (Schedule) | ✅ | **Built (follow-up).** The "Schedule" half of the screen (previously only Requests existed). New `client_meetings` table + migration `202607270012` with a `client_meetings_internal` (staff full access) and `client_meetings_portal_read` (client read-only, `is_portal_member`) policy. Staff schedule/complete/cancel via the executive-gated Meetings section on the Command Clients card (`createClientMeeting`/`updateMeetingStatus` + `MeetingForm`); the client sees their schedule read-only atop `/requests`. **Deliberately minimal per the spec's one word "Schedule":** no client-side booking, availability, or calendar-sync — those aren't specified and would be invention. `createClientMeetingSchema`/`updateMeetingStatusSchema` with 8 unit tests; `supabase/tests/portal_meetings.sql` regression plan. |

## What changed vs. the original plan

- Both mutating actions now call `canPerform` via `getPortalAuthContext`, not a bare `supabase.auth.getUser()` — the original plan's wording for P2.1 anticipated this ("authorization must check the acting profile's `client_role`") but P2.2's wording didn't mention it for request submission; added for consistency once the gap was found on the approvals side.
- `recordChangeOrderDecision` and `submitClientRequest` both supply `organization_id` — a NOT NULL column on `change_order_client_decisions`/`client_requests` that the original plan's field lists didn't mention (the existing RLS insert policies check `client_organization_id`/`submitted_by`/`status`, but not `organization_id`).
- No `formatMoney` helper existed anywhere in the repo (`packages/finance` covers posting invariants, not display formatting) — added a small one to `apps/portal/lib/format.ts` rather than duplicating `Intl.NumberFormat` calls across the Approvals UI.
- Request attachments (`request_attachments`, already RLS-scoped) are not surfaced in this phase's request detail view — kept out of scope to match the plan's own field list, which didn't mention them; a natural, low-risk follow-up for a later phase since the read policy already exists.

## Checks run for this phase

`pnpm typecheck && pnpm lint && pnpm format:check && pnpm test && pnpm test:db && pnpm test:rls && pnpm test:migrations && pnpm security:secrets && pnpm build:command && pnpm build:portal` — all green.

- `pnpm test`: 86/86 passing (11 new, in `packages/validation/src/portal-approvals-requests.test.ts`).
- `pnpm test:db`: 10 SQL test files (new: `supabase/tests/portal_approvals_requests.sql`, which documents the role-restricted-approval assertion above alongside the standard cross-client/cross-org denial checks).
- `pnpm test:rls`: coverage present for 57 tables (unchanged — this phase's migration adds a policy to an already-covered table, not a new table).
- `pnpm test:migrations`: 11 migration files validated.
- `pnpm build:portal`: compiles clean with the two new routes (`/approvals`, `/requests`).
- Manual: started `pnpm --filter @ksp/portal dev` and confirmed `/approvals` and `/requests` both redirect to `/setup` when Supabase is unconfigured, same as every existing authenticated route (`/home`, `/projects`) — this sandbox has no live Supabase credentials, so this is as far as manual verification goes here.

Not verified here (requires live Supabase): applying `202607230008_portal_approvals_requests.sql` and confirming `change_orders_portal_read` actually resolves the flagged bug end-to-end (a client session can now read a published change order through the join), and confirming `canPerform`'s role restriction actually blocks a `client_viewer`/`client_collaborator` session in practice, not just in the unit-tested function itself — both verified by SQL/code review plus the Supabase preview-branch migration check on this phase's PR, same as every prior phase.
