# Phase P3 — Portal Files + Billing

Group: Portal · Status: 🟨 P3.1 (Files) done & verified; P3.2 (Billing) still ⬜

---

## Mini-group P3.1 — Files ✅

Purpose: documents/deliverables explicitly shared with the client. Reuse
`documents` (foundation migration — already has `client_visible` and
`classification`).

| Task | Status | Detail |
|---|---|---|
| P3.1.1 Data layer | ✅ | `getClientDocuments(supabase)` in `apps/portal/app/(portal)/data.ts` — filters to `client_visible = true` **and** `classification = 'public'` **and** `status = 'active'`. The **hard gate is RLS**, not the query: new policy `documents_portal_read` (migration `202607270011`) allows a portal read only when the row is client_visible + `public` + active + `is_portal_member(client_id)`. **Decision recorded:** `'internal'`/`'confidential'`/`'restricted'` are never exposed to the portal even if a staffer flips `client_visible` — classification is the leaving-the-building gate, matching the authorization model's convention (only `public` is client-facing). Postgres OR-combines permissive SELECT policies, so the staff `documents_member_read` (202607150001) is untouched. |
| P3.1.2 UI — File list | ✅ | `apps/portal/app/(portal)/files/page.tsx` — documents grouped by project (titles resolved from the client's own `client_publications` feed, so no `projects`-table read is needed), documents with no/unknown project under "General". Each document links to its `storage_path` in a new tab, matching the Command Knowledge module's existing link/reference convention (this repo stores document references, not uploaded blobs — no Supabase Storage bucket or signed-URL generation exists yet, and none is fabricated). `Files` flipped `live` in `nav.ts`. |
| P3.1.3 Tests | ✅ | `supabase/tests/portal_files.sql` — documented regression plan: happy path, the classification hard gate (one assertion per non-public value), the `client_visible = false` and non-`active` gates, cross-client denial via `is_portal_member`, null-`client_id` denial, and staff-policy-unchanged. |
| P3.1.4 Docs | ✅ | This row. |

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
