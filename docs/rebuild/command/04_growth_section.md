# Phase C4 — Growth Section: Revenue, Clients, Products, Content

Group: Command · Status: ⬜ not started

Goal: complete the Growth group — the revenue engine, internal client rooms,
product catalog, and content/campaign calendar.

---

## Mini-group C4.1 — Revenue (`/revenue`)

Purpose: revenue engine — opportunities, relationship touchpoints, weighted
pipeline. Reuse `leads` (foundation migration) + `leadSchema`
(`packages/validation/src/schemas.ts`).

| Task | Status | Detail |
|---|---|---|
| C4.1.1 Migration | ⬜ | Add `opportunities` (if `leads` isn't sufficient — check first: `leads` already has `expected_value_minor`, `probability`, `target_close_date`, `status`; likely reusable as-is) and `relationship_touchpoints` (contact/lead/client + type + date + note). |
| C4.1.2 Data layer | ⬜ | `getPipeline` — leads grouped by stage, weighted value = `expected_value_minor * probability`. |
| C4.1.3 Validation | ⬜ | Confirm/extend `leadSchema`; add touchpoint schema. |
| C4.1.4 Server actions | ⬜ | `createLead`, `updateLeadStage`, `logTouchpoint`, `convertLeadToClient` (bridges into C4.2). |
| C4.1.5 UI — Pipeline board | ⬜ | Kanban by stage with weighted-value footer per column; list view alternative. |
| C4.1.6 UI — Relationship view | ⬜ | Touchpoint timeline per lead/contact. |
| C4.1.7 Tests | ⬜ | Unit tests for weighted-value calculation. |
| C4.1.8 Docs | ⬜ | Mark ✅ with PR + checks. |

## Mini-group C4.2 — Clients (`/clients`)

Purpose: internal "client rooms" — not a separate CRM; BEZ (or any source) is
just a segment/tag. Reuse `client_organizations`, `contacts`,
`client_internal_notes` (identity/portal migration).

| Task | Status | Detail |
|---|---|---|
| C4.2.1 Data layer | ⬜ | `getClients`, `getClient(id)` (contacts, internal notes, linked missions once C3.1 exists, relationship health). |
| C4.2.2 Validation | ⬜ | Zod schema for client create/update and internal-note create. |
| C4.2.3 Server actions | ⬜ | `createClient`, `updateClientHealth`, `addInternalNote`, `convertOpportunityToClient` (from C4.1). |
| C4.2.4 UI — Client room | ⬜ | Header (health, status), contacts, internal notes (classification-gated), linked missions/commitments. |
| C4.2.5 UI — List | ⬜ | List/grid of client rooms with health badges. |
| C4.2.6 Tests | ⬜ | RLS check: internal notes never leak to portal-scoped queries (regression test against the existing `client_internal_notes` policy). |
| C4.2.7 Docs | ⬜ | Mark ✅ with PR + checks. |

## Mini-group C4.3 — Products (`/products`)

Purpose: product/offer catalog feeding pricing and proposals.

| Task | Status | Detail |
|---|---|---|
| C4.3.1 Migration | ⬜ | New `products` table (name, description, price_minor, currency, active, category) with standard org-scoped RLS. |
| C4.3.2 Data layer | ⬜ | `getProducts`. |
| C4.3.3 Validation | ⬜ | Zod schema for product create/update. |
| C4.3.4 Server actions | ⬜ | `createProduct`, `updateProduct`, `archiveProduct`. |
| C4.3.5 UI — Catalog | ⬜ | Card grid or list; active/archived segmented filter. |
| C4.3.6 Tests | ⬜ | RLS allow/deny test for the new table. |
| C4.3.7 Docs | ⬜ | Mark ✅ with PR + checks. |

## Mini-group C4.4 — Content (`/content`)

Purpose: content/campaign calendar (Campaign Control Room + Content Calendar
per `PRODUCT_INFORMATION_ARCHITECTURE.md §10`).

| Task | Status | Detail |
|---|---|---|
| C4.4.1 Migration | ⬜ | New `content_items` (title, channel, client_id, campaign_id nullable, publish_date, status, brief/asset/rights/caption/link readiness flags, approval status) and `campaigns` (objective, audience, channel, budget_minor). |
| C4.4.2 Data layer | ⬜ | `getContentCalendar`, `getCampaigns`. |
| C4.4.3 Validation | ⬜ | Zod schemas for content item and campaign create/update. |
| C4.4.4 Server actions | ⬜ | `createContentItem`, `updateContentStatus`, `createCampaign`. |
| C4.4.5 UI — Calendar view | ⬜ | Month/week grid grouped by channel/client/campaign; readiness indicators per card (brief/asset/rights/caption/link/approval). |
| C4.4.6 UI — Campaign Control Room | ⬜ | Objective, audience/offer/message, budget, content dependencies, approvals, spend/outcomes (spend/outcomes can stub to manual entry until Finance/C5.1 is live). |
| C4.4.7 Tests | ⬜ | RLS allow/deny tests for both new tables. |
| C4.4.8 Docs | ⬜ | Mark ✅ with PR + checks. |

## Sequencing note

C4.1 → C4.2 (opportunity-to-client conversion needs both); C4.3 and C4.4 have
no dependency on C4.1/C4.2 and can run in parallel.
