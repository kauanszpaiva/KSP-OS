# Phase C5 — Control Section: Finance, Software, Knowledge, Connections

Group: Command · Status: ✅ done & verified for Software/Knowledge/Connections; Finance shipped **read-only only** — posting/reconciliation writes deliberately deferred pending mandatory human finance review (see checks log in `STATUS.md`)

Goal: complete the Control group. Software, Knowledge, and Connections
followed the now-standard pattern. **Finance is different by design** — see
the invariant writeup below, required by `reference/CLAUDE.md` before any
finance-sensitive code is written.

**Found and fixed a fourth time:** `documents`, `subscriptions`, and
`integration_connections` had the same read-only-since-foundation gap found
in C2, C3, and C4. Fourth confirmation this is a systemic property of the
foundation migration, not a one-off — every table it created got a read
policy and nothing else, because nothing had built on any of them yet.

---

## Finance invariants for this slice (required before any code, per `reference/CLAUDE.md`)

- **Accounts and posting effect:** `chart_accounts` defines the ledger;
  `journal_entries`/`journal_lines` record movements. This phase adds **no**
  new account or posting effect — it only reads existing rows.
- **Debit/credit invariant:** enforced entirely in the DB already
  (`journal_lines_exactly_one_positive_side` CHECK, `post_journal_entry()`'s
  balance check) — untouched by this phase.
- **Currency/date behavior:** untouched — no new currency or date handling
  introduced.
- **Draft vs. posted state:** this phase reads `journal_entries.status` to
  show counts only; it does not write to it.
- **Reversal/correction behavior:** untouched — `reversed_entry_id` and the
  immutability trigger are unchanged.
- **Period/reconciliation impact:** untouched — `accounting_periods` is not
  read or written by this phase.
- **Project/client/vendor dimensions:** `journal_lines.project_id`/`client_id`
  exist but are not surfaced in this phase's read-only overview (a
  reasonable v2 addition once the workbench itself is built).
- **CPA/statutory sync impact:** none — no external sync exists yet.

**Conclusion:** this phase ships a **read-only Finance Overview only** —
chart of accounts list, draft/posted entry counts, and subscription monthly
burn — using the existing executive-gated SELECT policies with zero new
writes and zero new invariants. The **Transaction/Journal Workbench**
(draft/submit/approve/post/reverse UI) and the **Subscription Console**
(renew/downgrade/cancel decisions) from the original plan are **explicitly
not built**. Building them means adding INSERT/UPDATE policies to
`chart_accounts`/`journal_entries`/`journal_lines` and wiring UI around
`post_journal_entry()` — real finance-sensitive work that needs a human with
finance-domain authority to review before merge, which has not happened.
This is not a scope cut hiding a gap; it's the correct stopping point per
the repo's own non-negotiable controls.

---

## Mini-group C5.1 — Finance (`/finance`)

| Task | Status | Detail |
|---|---|---|
| C5.1.0 Invariant writeup | ✅ | Above. |
| C5.1.1 Data layer | ✅ | `getFinanceOverview` — read-only aggregate (draft/posted entry counts, monthly subscription burn, chart of accounts) over existing executive-gated tables. Executive-only via the page's `canViewFinance` guard, not a new RLS policy. |
| C5.1.2 Validation | — | None needed — no write path. |
| C5.1.3 Server actions | ⛔ | **Not built, on purpose.** No `post_journal_entry()` wrapper, no journal draft/submit action. Blocked on human finance review per the invariant writeup above. |
| C5.1.4 UI — Finance Overview | ✅ | `apps/command/app/(app)/finance/page.tsx` — chart of accounts, entry counts, subscription burn figure. States the deferral explicitly in the page description, not just in this doc. |
| C5.1.5 UI — Journal Workbench | ⛔ | Not built — see above. |
| C5.1.6 UI — Subscription Console | ⛔ | Not built — `subscriptions` write policies were added (executive-only, matching its existing executive-only read) so a future Subscription Console can be built without another migration, but the UI itself (renew/downgrade/cancel decisions) is out of scope for this phase. |
| C5.1.7 Tests | — | No invariant tests needed — no invariant was touched. |
| C5.1.8 Human review | ⛔ | **Required before the Journal Workbench/Subscription Console are built** — not before this phase's read-only overview, which touches no invariant. Flag explicitly in any future PR that adds finance writes. |
| C5.1.9 Docs | ✅ | This row. |

## Mini-group C5.2 — Software (`/software`)

| Task | Status | Detail |
|---|---|---|
| C5.2.1 Data layer | ✅ | `getSoftwareTasks` — currently an alias over `getTasks` (C3's Workspace data function). **Simplification:** no department dimension exists on `projects`/`tasks`, so "Software" tasks aren't actually filtered from the general task pool yet — documented in the function's own comment, not hidden. |
| C5.2.2 UI — Dev queue | ✅ | `apps/command/app/(app)/software/page.tsx` — Blocked / In flight split (same shape as Workspace), with a PR/deploy-link field per task backed by the new `tasks.link` column. |
| C5.2.3 Docs | ✅ | This row. |

## Mini-group C5.3 — Knowledge (`/knowledge`)

| Task | Status | Detail |
|---|---|---|
| C5.3.1 Data layer | ✅ | `getDocuments` — joins project/client name; `documents_member_read` (migration 1, unchanged) already hides `classification = 'restricted'` rows from non-executives. |
| C5.3.2 Validation | ✅ | `createDocumentSchema`, `updateDocumentClassificationSchema`. |
| C5.3.3 Server actions | ✅ | `createDocumentRecord` (any internal member), `updateDocumentClassification` (executive-only, app-level check backed by the executive-only RLS update policy). **Simplification:** metadata/link only — no file upload in v1, per the original plan's own stated scope ("start with link/reference documents, add file upload as a follow-up task"). |
| C5.3.4 UI — Library | ✅ | `apps/command/app/(app)/knowledge/page.tsx` — list with classification badge, executive-only reclassify control. |
| C5.3.5 Tests | ✅ | 2 unit tests. |
| C5.3.6 Docs | ✅ | This row. |

## Mini-group C5.4 — Connections (`/connections`)

| Task | Status | Detail |
|---|---|---|
| C5.4.1 Data layer | ✅ | `getIntegrationConnections` — executive-only via existing `integrations_admin_read` RLS. |
| C5.4.2 UI — Connections list | ✅ | `apps/command/app/(app)/connections/page.tsx` — provider/scopes/expiry, revoke action; non-executives see an explicit access-restricted empty state rather than a blank/broken page. **Simplification, per the original plan's own scope:** manual connection recording only — no OAuth flow. |
| C5.4.3 Server actions | ✅ | `createConnection`, `revokeConnection` (soft-revoke via `status = 'archived'`, not a delete). No secret/token value is ever stored or displayed — only `provider`/`scopes`/`token_expires_at`, matching the existing table shape from migration 1. |
| C5.4.4 Tests | ✅ | 2 unit tests. |
| C5.4.5 Docs | ✅ | This row. |

## What changed vs. the original plan

- Finance is the one module in the entire rebuild so far that intentionally ships **less** than its nav entry implies — a real overview, but with hard stops clearly marked `⛔` rather than silently omitted. This is the correct outcome given the repo's finance-sensitive-work rule, not a shortfall to apologize for.
- Everything else in this phase followed the by-now-familiar shape: reuse an existing foundation table, discover it has no write policy, add one, ship the UI.

## Phase V4 addition (Command-wide visual redesign) — Finance renewals/chart, Software Board/Calendar, Knowledge Board, Connections calendar/chart

Part of the multi-phase Asana/ClickUp-style visual redesign (`docs/rebuild/command/07_visual_redesign_v0_foundation.md`). Applies V0's `Board`/`CalendarView`/chart primitives to the Control section. **Two of the V4 plan's field/enum names didn't match the real schema — both corrected here rather than built against fields that don't exist, same posture as V3's Revenue correction.**

| Task | Status | Detail |
|---|---|---|
| V4.1 Finance — Renewals + Chart | ✅ | `apps/command/app/(app)/_components/finance-view.tsx` (new) — `List` / `Renewals` / `Chart` toggle. The plan called for "cash/runway trend, AR/AP bars," but this schema has no AR/AP or cash-runway table (Journal Workbench is deliberately unbuilt — see C5.1 above); building that chart would mean inventing numbers. Instead: a `Renewals` Calendar surfaces `subscriptions.renewal_date` — a real field that `getSubscriptions` already read but that had **no page ever called it** (an orphaned data-layer function from C5.1, now given its first consumer), and a `Chart` tab shows `BarChart` of monthly burn by vendor plus a `Donut` of draft-vs-posted journal entries. Both subscriptions and journal entries are read through their existing executive-only RLS; no new query bypasses `canViewFinance`. |
| V4.2 Software — Board + Calendar | ✅ | `apps/command/app/(app)/_components/software-view.tsx` (new) — `List` / `Board` / `Calendar` toggle. Built as a thin wrapper directly over the shared `Board`/`CalendarView` primitives — **not** a reuse of `WorkspaceView` itself, since Software has no reassignment or comments UI and shouldn't gain that scope just because it shares `TaskView`. Board columns: Blocked / In flight / Done, cards reuse the exact same `TaskLinkForm` the List view already used. |
| V4.3 Knowledge — Board | ✅ | `apps/command/app/(app)/_components/knowledge-view.tsx` (new) — `List` / `Board` toggle. **The plan said "Board by 6-stage `PublicationState`" — that enum belongs to the unrelated `client_publications`/`change_order_versions` tables (the Portal-publishing gate already used in Portal P1/P2), not to `documents`.** `documents` has no `PublicationState` column at all. The real, existing tiering field on `documents` is `classification` (public/internal/confidential/restricted, 4 values), so the Board groups by that instead. Cards reuse the exact same executive-gated `DocumentClassificationForm` the List view already used (only rendered when `exec` is true, matching the List view's existing gate). |
| V4.4 Connections — Calendar + Chart | ✅ | `apps/command/app/(app)/_components/connections-view.tsx` (new) — `List` / `Calendar` / `Chart` toggle. **The plan said "Calendar (`renewal_date`)" — `integration_connections` has no `renewal_date` column; that field belongs to `subscriptions` (now surfaced on Finance's own Renewals tab above).** The real, existing expiry field here is `token_expires_at`, so Calendar places connections on that field instead. Chart tab: `BarChart` of connection count by provider, `Donut` of active-vs-revoked count. |
| V4.5 Tests | — | No new Zod schema/mutation this phase — all four views read existing data shapes (`ChartAccount`, `Subscription`, `TaskView`, `DocumentView`, `IntegrationConnection`) and reuse existing actions/forms (`TaskLinkForm`, `DocumentClassificationForm`, `RevokeConnectionForm`) as-is. `getSubscriptions` gained its first real caller but its own signature/query was untouched. No new unit tests needed; full suite (93 tests) still green. |
| V4.6 Docs | ✅ | This section. |

**What changed vs. the V4 plan**: two of the four modules' plan descriptions used field/enum names that don't exist on the tables they were describing (`PublicationState` on `documents`; `renewal_date` on `integration_connections`). Both were traced to their real owning tables (`client_publications` and `subscriptions` respectively) and the substitute used the real, existing field on the actual target table instead — called out here rather than silently building against a fabricated schema. Software and Finance matched the plan's intent as written, once "reuse Workspace's Board+Calendar" was read as "reuse the pattern," not "reuse the component" (Software has no reassignment/comments surface to inherit).
