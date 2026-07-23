# Phase P1 — Portal Home + Projects

Group: Portal · Status: ✅ done & verified

---

## Mini-group P1.1 — Home

Purpose: the client's landing view — project summary, what KSP needs from
them, upcoming dates, recent deliveries, invoice status
(`PRODUCT_INFORMATION_ARCHITECTURE.md §12`).

| Task | Status | Detail |
|---|---|---|
| P1.1.1 Data layer | ✅ | `apps/portal/app/(portal)/data.ts` — `getPublishedProjects`, `latestPerProject`, `getMilestonesForProjects`, `getClientRequests`, `requestsNeedingAction`, `getRecentUpdates`. **Simplification vs. the original plan:** no `change_order_versions` query on Home yet — change orders are P2 (Approvals) scope; "what KSP needs from you" this phase is driven entirely by `client_requests.status`. Invoice status is a static stub card, exactly as the plan itself anticipated ("stub with 'coming soon' card if P3 isn't done yet"). |
| P1.1.2 UI | ✅ | `apps/portal/app/(portal)/home/page.tsx` — cards for "what KSP needs from you", "your projects", "upcoming dates", "recent deliveries", and a static "Invoices" placeholder, built from `@ksp/ui`'s `Card`/`Badge`/`EmptyState`. Every query this page runs is RLS-gated to `state = 'published_to_client'` (publications) or the client's own membership (requests/updates) — no internal-draft data is ever fetched, let alone rendered. |
| P1.1.3 Tests | ✅ | `supabase/tests/portal_home_projects.sql` — the draft-leak assertion this task calls "the single most important test in the whole Portal group" is documented first, before any other assertion in the file. No unit test needed: this phase adds no new Zod schema or mutation, only read queries whose correctness rests entirely on RLS (already covered by the SQL regression plan) rather than application logic. |
| P1.1.4 Docs | ✅ | This row. |

## Mini-group P1.2 — Projects

Purpose: scope/approved changes, milestones/progress, client-visible
timeline.

| Task | Status | Detail |
|---|---|---|
| P1.2.1 Data layer | ⚠️ changed | **Deviates from the original plan on purpose:** does *not* read through `api_portal.published_project_updates`. That view has no `security_invoker` clause and no explicit grant/schema-exposure configured anywhere in this repo — its safety would rest entirely on its hardcoded `WHERE` clause rather than RLS re-evaluated for the querying role, and PostgREST wouldn't even expose it without additional config this repo doesn't have yet. Querying `client_publications` directly is safer (doubly RLS-enforced: `state='published_to_client' AND is_portal_member(...)`, both checked against the actual querying role) and needs no new grants. `getPublishedProjects`/`latestPerProject` in `data.ts` do this. **Recommendation for a future cleanup pass:** either fix the view (`security_invoker = true` + explicit grants + `api_portal` schema exposure in Supabase config) or remove it, since as shipped it's unused and its safety posture is unverified. |
| P1.2.1b New migration | ✅ | `202607230007_portal_home_projects.sql` — found a 7th instance of the "foundation table has no portal policy" pattern: `mission_milestones` (added in Phase C3) had full internal RLS but **zero portal-read policy**, so the original plan's assumption that the existing publication view alone covered "milestones/progress" was factually wrong — the view (and `client_publications` itself) never carried milestone data. Added `mission_milestones_portal_read`, scoped to "the project has at least one `published_to_client` publication for this client" — reusing the one client-visibility gate the schema already has, inventing no new business rule. |
| P1.2.2 UI — Project list | ✅ | `apps/portal/app/(portal)/projects/page.tsx` — cards with title/summary (from the project's latest publication) and a completion percentage derived from milestone status counts. Client-safe fields only — no internal `health`/`budget_minor`/margin data, none of which is even reachable (`projects` itself has no portal-read policy at all; see below). |
| P1.2.3 UI — Project detail | ✅ | `apps/portal/app/(portal)/projects/[projectId]/page.tsx` — milestone list with status badges and due dates, a merged activity timeline (publications + updates, sorted by date), and a placeholder "Approved changes" card explicitly deferring change orders to a later phase. An unauthorized `projectId` renders `notFound()` — no RLS policy needs to reject it since every underlying query already returns zero rows for a project the caller can't see. |
| P1.2.4 Tests | ✅* | *Changed from the original wording: `project_access_grants` is internal-only (no portal policy exists on it at all — confirmed by inspection), so it was never the actual enforcement mechanism for portal project visibility. The real gate is `client_publications.client_organization_id` + `state`, and that's what `supabase/tests/portal_home_projects.sql` documents assertions against instead. |
| P1.2.5 Docs | ✅ | This row. |

## A real modeling constraint surfaced by this phase

`projects` (the internal table — name, health, budget, status) has **no portal-read RLS policy anywhere in the schema** — a client-authenticated session querying it directly gets zero rows, always. This isn't a gap this phase introduces or needs to fix: it means a project's client-facing "identity" (what a client sees as its title/description) is *entirely* whatever KSP writes into a `client_publications.title`/`summary` row, never the internal project's own `name` field. This is a deliberate product boundary already built into the schema (internal project metadata like `health`/`budget_minor` should never be client-visible), and this phase's data layer respects it by construction — it was never tempted to join back to `projects` for "just the name," because there's no RLS path that would let it.

## Checks run for this phase

`pnpm typecheck && pnpm lint && pnpm format:check && pnpm test && pnpm test:db && pnpm test:rls && pnpm test:migrations && pnpm security:secrets && pnpm build:command && pnpm build:portal` — all green.

- `pnpm test`: 75/75 passing (unchanged count — this phase adds no new Zod schema/mutation).
- `pnpm test:db`: 9 SQL test files.
- `pnpm test:rls`: coverage present for 57 tables (unchanged — this phase's migration adds a policy to an existing table, not a new table).
- `pnpm test:migrations`: 10 migration files validated.
- `pnpm build:portal`: compiles clean with the two new routes (`/projects`, `/projects/[projectId]`).

Not verified here (requires live Supabase): applying `202607230007_portal_home_projects.sql` and exercising `mission_milestones_portal_read` end-to-end — verified by SQL review plus the Supabase preview-branch migration check on this phase's PR, same as every prior phase.

## What changed vs. the original plan

- Home's data layer doesn't query `change_order_versions` yet — that's P2 (Approvals) scope; "what KSP needs from you" is driven by `client_requests.status` only this phase.
- Projects reads `client_publications` directly, not the `api_portal.published_project_updates` view — the view's RLS/grant posture is unverified in this repo's current config, and the raw table has stronger, doubly-enforced RLS already. Flagged as a follow-up: fix or remove the view.
- A new migration (not originally anticipated by the P1 plan, which assumed the view alone would suffice) adds `mission_milestones_portal_read` — a real, necessary RLS gap closure, not scope creep.
- P1.2.4's test target changed from `project_access_grants` (which turns out to have no portal policy and was never the real gate) to `client_publications` (the table that actually enforces visibility).
- Flagged, not fixed, for Phase P2: `change_order_versions_portal_read`/`change_order_items_portal_read` gate through an `exists(...)` subquery against `change_orders`, which itself has no portal-read policy — this likely means those two policies never actually return true for a real client session. Needs verification before the Approvals/Change Orders UI is built on top of it.
