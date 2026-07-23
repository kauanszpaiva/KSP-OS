# Phase P3 — Portal Files + Billing

Group: Portal · Status: ⬜ not started (depends on Phase P0)

---

## Mini-group P3.1 — Files

Purpose: documents/deliverables explicitly shared with the client. Reuse
`documents` (foundation migration — already has `client_visible` and
`classification`).

| Task | Status | Detail |
|---|---|---|
| P3.1.1 Data layer | ⬜ | `getClientDocuments(clientOrgId)` — filter to `client_visible = true` **and** `classification = 'public'` (do not relax to `'internal'` for the portal path — the existing RLS/classification model treats `'internal'` as staff-only by convention even when `client_visible` is set; confirm this reading against `docs/architecture/KSP_OS_AUTHORIZATION_MODEL.md` before writing the query, and document the decision here). |
| P3.1.2 UI — File list | ⬜ | Grouped by project; download action (no public sharing link generation — per the existing portal placeholder's stated non-goal). |
| P3.1.3 Tests | ⬜ | Confirm a `classification != 'public'` document never appears even if `client_visible = true` (guards against a future data-entry mistake becoming a leak). |
| P3.1.4 Docs | ⬜ | Mark ✅ with PR + checks. |

## Mini-group P3.2 — Billing / Invoices

Purpose: issued invoices, payment state, receipts. This is the Portal
module most coupled to Finance (Command Phase C5.1) — sequence it after
C5.1 has at least an invoice/AR data model, or build the minimal invoice
projection needed here first and have C5.1 build on top of it (decide and
record the choice before starting).

| Task | Status | Detail |
|---|---|---|
| P3.2.0 Sequencing decision | ⬜ | Record here whether this phase precedes or follows Command C5.1, and why. |
| P3.2.1 Data layer | ⬜ | `getClientInvoices(clientOrgId)` — read-only projection of whatever invoice/AR structure exists once decided above. |
| P3.2.2 UI — Invoice list | ⬜ | Issued invoices with payment state; receipt download once available. |
| P3.2.3 Hosted payment (future) | ⬜ | Explicitly out of scope for the initial slice — do not wire a real payment processor without a separate, explicit go-ahead (this touches money movement and needs its own authorization/compliance pass per `reference/CLAUDE.md`'s finance rules). Leave this task ⛔ blocked-by-design until that go-ahead exists; don't build it opportunistically. |
| P3.2.4 Tests | ⬜ | Confirm a client only ever sees their own organization's invoices. |
| P3.2.5 Docs | ⬜ | Mark ✅ (P3.2.1–P3.2.2) or ⛔ (P3.2.3, intentionally) with PR + checks. |
