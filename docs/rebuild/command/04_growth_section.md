# Phase C4 — Growth Section: Revenue, Clients, Products, Content

Group: Command · Status: ✅ done & verified (see checks log in `STATUS.md`)

Goal: complete the Growth group — the revenue engine, internal client rooms,
product catalog, and content/campaign calendar.

**Found and fixed a third time:** `leads`, `contacts`, `client_organizations`,
and `client_internal_notes` had the same read-only-since-foundation RLS gap
already found and fixed in Phase C2 (`inbox_items`/`approval_requests`) and
Phase C3 (`projects`/`project_memberships`/`tasks`). This is now a confirmed
pattern across every foundation-migration table nobody had built on yet — if
Phase C5 (Control) reuses `documents`/`subscriptions`/`integration_connections`,
check their write policies before assuming they exist.

**Also found and fixed a real bug in this phase's own new code**, not a
pre-existing one: `z.coerce.boolean()` on a `"true"`/`"false"` form-field
string is a footgun — JS's `Boolean("false")` is `true` (any non-empty string
is truthy), so the schema silently accepted the literal string `"false"` as
`true`. This would have broken every blocked/active toggle in this phase (and
was already latent in Phase C3's `updateTaskStatusSchema`, which uses the
same pattern). Caught by its own unit test, not by inspection — a good
argument for writing the coercion tests before wiring the UI, not after.
Fixed with a shared `booleanString` schema (`z.enum(['true','false']).transform(...)`)
in `packages/validation/src/schemas.ts`, applied to both `toggleProductActiveSchema`
and the pre-existing `updateTaskStatusSchema`.

---

## Mini-group C4.1 — Revenue (`/revenue`)

| Task | Status | Detail |
|---|---|---|
| C4.1.1 Migration | ✅ | Reused `leads` as-is (already had `expected_value_minor`, `probability`, `target_close_date`, `status` — no `opportunities`/touchpoints table added; not enough usage yet to justify the extra structure over what `leads` already provides). Added the missing insert/update policies. |
| C4.1.2 Data layer | ✅ | `getLeads` — computes `weightedValueMinor = expected_value_minor * probability / 100` per lead. |
| C4.1.3 Validation | ✅ | `createLeadSchema` (requires `nextAction`, mirroring the DB's `status <> 'active' or next_action is not null` constraint), `updateLeadStatusSchema`. |
| C4.1.4 Server actions | ✅ | `createLead` (owner is always the creator — the RLS policy requires `owner_id = auth.uid()` on insert, no executive override), `updateLeadStatus`. |
| C4.1.5 UI — Pipeline | ✅ | `apps/command/app/(app)/revenue/page.tsx` — active/closed split with pipeline total + weighted total figures up top. **Simplification:** a list, not a Kanban board by stage — `leads.status` is binary (active/archived) in this schema, so there's no "stage" dimension to board against yet; would need a real stage/pipeline-position column to do that properly. |
| C4.1.6 Relationship view | ⬜ | **Not built.** Touchpoint history was in the original plan; skipped since `leads` has no touchpoints table and adding one felt premature without a concrete need driving its shape. |
| C4.1.7 Tests | ✅ | 3 unit tests in `packages/validation/src/growth.test.ts`. |
| C4.1.8 Docs | ✅ | This row. |

## Mini-group C4.2 — Clients (`/clients`)

| Task | Status | Detail |
|---|---|---|
| C4.2.1 Migration | ✅ | Reused `client_organizations`, `contacts`, `client_internal_notes` (all from the identity/portal migration). Added the missing insert/update policies — org-scoped for the first two (neither has an owner column), creator-scoped insert-only for notes (append-only; a correction is a new note, not an edit). |
| C4.2.2 Data layer | ✅ | `getClients` — joins contacts and internal notes per client. |
| C4.2.3 Validation | ✅ | `createClientSchema`, `updateClientHealthSchema`, `createContactSchema`, `addClientNoteSchema`. |
| C4.2.4 Server actions | ✅ | `createClient`, `updateClientHealth`, `createContact`, `addClientNote`. |
| C4.2.5 UI — Client room | ✅ | `apps/command/app/(app)/clients/page.tsx` — each client card inlines contacts + notes + health selector, active/archived split. Same "card, not separate detail route" pattern as Missions (C3.1.6) — same reasoning: not enough going on per client yet to need a dedicated page. |
| C4.2.6 Tests | ✅ | 2 unit tests. RLS: internal-note protection documented in `supabase/tests/growth.sql` — a portal (client-side) user cannot read `client_organizations` or `client_internal_notes` through these policies at all; portal access goes through the separate `api_portal`/`client_publications` path from migration 2, which is untouched. |
| C4.2.7 Docs | ✅ | This row. |

## Mini-group C4.3 — Products (`/products`)

| Task | Status | Detail |
|---|---|---|
| C4.3.1 Migration | ✅ | New `products` table — org-scoped RLS, executive-only delete (non-executives archive via `active = false` instead of hard-deleting). |
| C4.3.2 Data layer | ✅ | `getProducts`. |
| C4.3.3 Validation | ✅ | `createProductSchema`, `toggleProductActiveSchema`. |
| C4.3.4 Server actions | ✅ | `createProduct`, `toggleProductActive`. |
| C4.3.5 UI — Catalog | ✅ | `apps/command/app/(app)/products/page.tsx` — card grid for active, compact list for archived. |
| C4.3.6 Tests | ✅ | 2 unit tests (including the `booleanString` coercion fix). |
| C4.3.7 Docs | ✅ | This row. |

## Mini-group C4.4 — Content (`/content`)

| Task | Status | Detail |
|---|---|---|
| C4.4.1 Migration | ✅ | New `campaigns` and `content_items` tables, both org-scoped RLS with executive-only delete. `content_items.status` uses the 7-state enum from the original plan (idea → drafting → internal_review → client_review → approved → scheduled → published) as a CHECK constraint, not a free-text field. |
| C4.4.2 Data layer | ✅ | `getCampaigns`, `getContentItems` (joined to campaign name). |
| C4.4.3 Validation | ✅ | `createCampaignSchema`, `createContentItemSchema`, `updateContentStatusSchema`. |
| C4.4.4 Server actions | ✅ | `createCampaign`, `createContentItem`, `updateContentStatus`. |
| C4.4.5 UI — Calendar | ✅ | `apps/command/app/(app)/content/page.tsx` — a single chronological list (by `publish_date`) rather than a month/week grid; readiness shown as 4 small dots (brief/asset/rights/caption) per the original plan's "readiness indicators" idea, just rendered compactly instead of as a full grid layout. |
| C4.4.6 Campaign Control Room | ⬜ | **Not built as a separate view.** Objective/audience/budget fields exist on `campaigns` and are settable at creation, but there's no dedicated spend/outcomes dashboard — that needs Finance (C5.1) to have real spend data to show, so it's a natural C5 or later follow-up rather than something to fake here. |
| C4.4.7 Tests | ✅ | 3 unit tests. |
| C4.4.8 Docs | ✅ | This row. |

## What changed vs. the original plan

- Every migration-side "reuse the existing table" assumption in the plan held (no table needed renaming or restructuring), but every one of them needed new write policies — third phase in a row to find this, so treat it as a standing checklist item, not a surprise, going forward.
- Skipped: Revenue's relationship-touchpoint view, a Kanban-by-stage pipeline board (leads has no stage column), and a full Campaign Control Room dashboard — each has a stated reason above, not a silent cut.
- Found and fixed a real coercion bug in this phase's own new validation code (see the callout above) before it shipped, because the test suite caught it.

## Phase V3 addition (Command-wide visual redesign) — Revenue Board/Chart, Content Board/Calendar, Clients/Products charts

Part of the multi-phase Asana/ClickUp-style visual redesign (`docs/rebuild/command/07_visual_redesign_v0_foundation.md`). Applies V0's `Board`/`CalendarView`/chart primitives to the Growth section — this is also where C4.1.5's stated "no stage column, no Kanban board" gap gets closed, with an honest substitution rather than a new migration.

| Task | Status | Detail |
|---|---|---|
| V3.1 Revenue — Board | ✅ | `apps/command/app/(app)/_components/revenue-view.tsx` (new) — `List` / `Board` / `Chart` toggle. **`leads.status` is still binary (active/archived) — no stage column was added.** Rather than fabricate a stage field nothing else reads or writes, Board buckets *active* leads by `probability` into four bands (Early <25% / Developing 25–50% / Strong 51–75% / Committed 76%+), plus a fifth "Closed" column for archived leads. This is a deliberate stand-in for "pipeline Board by lead status" as the plan phrased it — `probability` is a real, already-captured field that behaves like a stage progression, unlike `status` which doesn't have pipeline stages. Cards reuse the exact same `LeadStatusForm` "Close" button the List view already used; no generic move-to-column control exists since the buckets are computed, not a settable field. |
| V3.2 Revenue — Chart | ✅ | Chart tab: `BarChart` of pipeline value by probability band (the "funnel/bar dashboard" from the plan), `Donut` of active-vs-closed lead count. |
| V3.3 Content — Board | ✅ | `apps/command/app/(app)/_components/content-view.tsx` (new) — `List` / `Board` / `Calendar` toggle. Board columns are the real 7-stage `ContentStatus` enum (idea → drafting → internal_review → client_review → approved → scheduled → published) — unlike Revenue, this data model genuinely has a stage column. `ContentStatusForm` was already a free any-to-any select in the List view (no governance restriction on content-stage transitions), so the Board embeds the exact same form per card — same reasoning as Signals' Board in V1. |
| V3.4 Content — Calendar | ✅ | Calendar places items on `publish_date`; items with no publish date are omitted from Calendar (still visible in List/Board). |
| V3.5 Clients — Chart | ✅ | `apps/command/app/(app)/_components/clients-view.tsx` (new) — `Cards` / `Chart` toggle. Chart tab: a `Donut` of `relationship_health` distribution across active clients (healthy/watch/at_risk/unknown), a second `Donut` of active-vs-archived client count. |
| V3.6 Products — Chart | ✅ | `apps/command/app/(app)/_components/products-view.tsx` (new) — `Grid` / `Chart` toggle. Chart tab: a `BarChart` of catalog count by `category` (free-text field; items with no category group under "Uncategorized"), a `Donut` of active-vs-archived product count. |
| V3.7 Tests | — | No new Zod schema/mutation this phase — all four views read existing data shapes (`LeadView`, `ContentItemView`, `ClientView`, `Product`) and reuse existing actions/forms (`LeadStatusForm`, `ContentStatusForm`, `ClientHealthForm`, `ProductActiveForm`) as-is. No new unit tests needed; full suite (93 tests) still green. |
| V3.8 Docs | ✅ | This section. |

**What changed vs. the V3 plan**: Revenue's Board is a probability-bucket substitute for "by lead status," not a literal read of a status enum that doesn't have pipeline stages — called out here rather than silently building a 2-column (Active/Closed) board that wouldn't have matched the Asana/ClickUp pipeline-board reference at all. Everything else (Content Board/Calendar, Clients/Products charts) matches the plan as written, since those modules' underlying data already supported it.
