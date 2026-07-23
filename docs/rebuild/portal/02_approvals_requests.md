# Phase P2 — Approvals/Change Orders + Requests/Support

Group: Portal · Status: ⬜ not started (depends on Phase P0; P2.1 benefits from P1 existing but doesn't strictly require it)

---

## Mini-group P2.1 — Approvals & Change Orders

Purpose: versions awaiting client review, consolidated feedback, approval
history. Reuse `change_orders`/`change_order_versions`/`change_order_items`/
`change_order_client_decisions` (identity/portal migration) — the
internal-approval side (`change_order_internal_approvals`) stays in Command
(a natural fit for Phase C2.2's Decisions module — cross-reference it there
rather than re-implementing).

| Task | Status | Detail |
|---|---|---|
| P2.1.1 Data layer | ⬜ | `getChangeOrdersForClient(clientOrgId)` — only versions with `state = 'approved_for_client'` or later; never expose `internal_draft`/`internal_review`. |
| P2.1.2 Validation | ⬜ | Zod schema for the client's accept/reject decision + optional evidence. |
| P2.1.3 Server actions | ⬜ | `recordClientChangeOrderDecision` — authorization must check the acting profile's `client_role` is `client_owner` or `client_project_approver` (mirrors the existing `canPerform` rule for `change_order.client_approve`, already defined in `packages/permissions`). |
| P2.1.4 UI — Approval queue | ⬜ | Exact version, price, scope summary, consolidated feedback, accept/reject actions. |
| P2.1.5 UI — History | ⬜ | Past decisions with timestamps and decision-maker. |
| P2.1.6 Tests | ⬜ | Deny test: a `client_viewer`/`client_collaborator` role cannot approve (only `client_owner`/`client_project_approver` can, per the existing permission rule). |
| P2.1.7 Docs | ⬜ | Mark ✅ with PR + checks. |

## Mini-group P2.2 — Requests & Support

Purpose: submit/track client requests. Reuse `client_requests` +
`request_status_history` + `request_comments` (client-visible ones only) +
`request_attachments` (identity/portal migration). The full request-status
enum already exists (`client_request_status`, 13 states) — reuse it as-is,
don't invent a simplified version.

| Task | Status | Detail |
|---|---|---|
| P2.2.1 Data layer | ⬜ | `getClientRequests(clientOrgId)`, `getRequestDetail(id)` — comments filtered to `visibility = 'client'` only; status history filtered to `client_visible = true` rows only. |
| P2.2.2 Validation | ⬜ | Zod schema for request submission (title, body, project_id, evidence). |
| P2.2.3 Server actions | ⬜ | `submitClientRequest` (any client role, per the existing `request.submit` permission which allows even non-published-state resources — that's intentional, a client can always submit a new request), `addClientComment` (visibility always `'client'` when authored by a client). |
| P2.2.4 UI — Request list | ⬜ | Status badges using the 13-state enum; filter by open/closed. |
| P2.2.5 UI — Request detail | ⬜ | Timeline of client-visible status changes + comments; attachment list; submit-new-comment form. |
| P2.2.6 Tests | ⬜ | Confirm internal-only comments/status-history rows never render in the portal (the same class of leak risk as P1.1.3 — treat with equal seriousness). |
| P2.2.7 Docs | ⬜ | Mark ✅ with PR + checks. |

## Cross-reference

The internal side of this workflow (triage, internal priority/cost estimate
via `request_triage`, internal approval via `change_order_internal_approvals`)
belongs in Command, most naturally as part of Phase C2.2 (Decisions) or a
follow-up task there — don't build it here in Portal.
