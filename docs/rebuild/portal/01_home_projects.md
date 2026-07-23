# Phase P1 — Portal Home + Projects

Group: Portal · Status: ⬜ not started (depends on Phase P0)

---

## Mini-group P1.1 — Home

Purpose: the client's landing view — project summary, what KSP needs from
them, upcoming dates, recent deliveries, invoice status
(`PRODUCT_INFORMATION_ARCHITECTURE.md §12`).

| Task | Status | Detail |
|---|---|---|
| P1.1.1 Data layer | ⬜ | `getPortalHome(clientOrgId)` — aggregates from `client_publications` (published project updates), `client_requests` (open items needing client input), `change_order_versions` awaiting client decision, and invoice status once available (Phase P3 dependency — stub with "coming soon" card if P3 isn't done yet, don't block P1 on it). |
| P1.1.2 UI | ⬜ | Summary cards using the shared `packages/ui` primitives (Card, Badge, EmptyState) — must show only `publication_state = 'published_to_client'` records, never internal drafts. |
| P1.1.3 Tests | ⬜ | RLS regression: confirm an `internal_draft`/`internal_review` publication never appears here (this is the single most important test in the whole Portal group — a leak here is a real client-facing incident). |
| P1.1.4 Docs | ⬜ | Mark ✅ with PR + checks. |

## Mini-group P1.2 — Projects

Purpose: scope/approved changes, milestones/progress, client-visible
timeline. Reuse `client_publications`/`api_portal.published_project_updates`
(the view already defined in the identity/portal migration).

| Task | Status | Detail |
|---|---|---|
| P1.2.1 Data layer | ⬜ | `getPortalProjects(clientOrgId)` reading through `api_portal.published_project_updates` — **use this view, don't re-query `projects`/`client_publications` directly**, since the view is the intended client-safe boundary. |
| P1.2.2 UI — Project list | ⬜ | List of the client's projects with health/progress summary (client-safe fields only — no internal margin/risk data, per the portal's stated non-goals). |
| P1.2.3 UI — Project detail | ⬜ | Scope + approved changes, milestone/progress timeline, client-visible activity (published updates only). |
| P1.2.4 Tests | ⬜ | Confirm a project the client has no `project_access_grants` row for never appears. |
| P1.2.5 Docs | ⬜ | Mark ✅ with PR + checks. |
