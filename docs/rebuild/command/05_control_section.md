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
