# Phase C5 — Control Section: Finance, Software, Knowledge, Connections

Group: Command · Status: ⬜ not started

Goal: complete the Control group. **Finance is executive-only and requires
mandatory human finance-domain review before merge** — see
`reference/CLAUDE.md` "Finance-sensitive work" section; do not treat this
phase as routine feature work.

---

## Mini-group C5.1 — Finance (`/finance`)

Purpose: operational finance — cash, runway, AR/AP aging, subscriptions,
profitability. Reuse `chart_accounts`, `journal_entries`/`journal_lines`
(posting invariants already enforced in the DB — immutability trigger,
`journal_lines_exactly_one_positive_side` constraint, `post_journal_entry()`
SECURITY DEFINER function), `subscriptions`, and `packages/finance`.

**Before writing any code here**, explicitly document (per
`reference/CLAUDE.md`): accounts and posting effect; debit/credit invariant;
currency/date behavior; draft vs. posted state; reversal/correction behavior;
period/reconciliation impact; project/client/vendor dimensions. Do this in
this file, in a "Finance invariants for this slice" subsection, before C5.1.1
starts.

| Task | Status | Detail |
|---|---|---|
| C5.1.0 Invariant writeup | ⬜ | Required before any code — see above. |
| C5.1.1 Data layer | ⬜ | `getCashPosition`, `getArApAging`, `getSubscriptionBurn`, `getProjectProfitability` — all read-only aggregates over existing tables; **executive-only** (`canViewFinance` guard, already in `packages/auth/src/guards.ts`). |
| C5.1.2 Validation | ⬜ | Reuse `moneySchema` (`packages/validation/src/schemas.ts`); add schemas only for new read-side filters, not for posting (posting already goes through `post_journal_entry()`). |
| C5.1.3 Server actions | ⬜ | Thin wrappers around `post_journal_entry()` for the Transaction/Journal Workbench (draft/submit/approve/post/reverse) — never bypass it with direct inserts. |
| C5.1.4 UI — Finance Overview | ⬜ | Per `PRODUCT_INFORMATION_ARCHITECTURE.md §11`: cash by account + freshness, AR/AP aging, upcoming obligations, monthly income/expense, subscription burn, profitability risk, unreconciled items, close status. |
| C5.1.5 UI — Journal Workbench | ⬜ | Draft/submit/approve/post/reverse flow; immutable posted view (read-only render once `status='posted'`). |
| C5.1.6 UI — Subscription Console | ⬜ | Renewals by notice deadline, seat assignment/unused seats, renew/downgrade/cancel decision. |
| C5.1.7 Tests | ⬜ | Invariant + scenario tests (balance check, posted-immutability, period-lock rejection) — required, not optional, per repo rules. |
| C5.1.8 Human review | ⬜ | Mandatory finance-domain human review before merge — flag explicitly in the PR description; do not mark this task ✅ until that review has actually happened. |
| C5.1.9 Docs | ⬜ | Mark ✅ with PR + checks + reviewer name. |

## Mini-group C5.2 — Software (`/software`)

Purpose: department workspace for Software & Websites — dev queue with
PR/deploy links.

| Task | Status | Detail |
|---|---|---|
| C5.2.1 Data layer | ⬜ | Reuse `tasks`/`missions` filtered to the Software department; reuse `integration_connections` for GitHub/Vercel metadata once C5.4 lands (can stub with manual link fields first). |
| C5.2.2 UI — Dev queue | ⬜ | Sort by priority/due/blocked; PR/branch/deploy-preview links per item (manual URL field until C5.4 automates it). |
| C5.2.3 Docs | ⬜ | Mark ✅ with PR + checks. |

## Mini-group C5.3 — Knowledge (`/knowledge`)

Purpose: documents & knowledge hub. Reuse `documents` (foundation migration,
classification + RLS already defined).

| Task | Status | Detail |
|---|---|---|
| C5.3.1 Data layer | ⬜ | `getDocuments` scoped by RLS (`documents_member_read` — non-executives never see `classification = 'restricted'`). |
| C5.3.2 Validation | ⬜ | Zod schema for document metadata create/update (upload handling itself is out of scope for v1 — start with link/reference documents, add file upload as a follow-up task). |
| C5.3.3 Server actions | ⬜ | `createDocumentRecord`, `updateClassification` (executive-only), `linkDocumentToClientOrProject`. |
| C5.3.4 UI — Library | ⬜ | Searchable list, classification badges, client/project filters. |
| C5.3.5 Tests | ⬜ | RLS regression test confirming restricted docs stay hidden from non-executives. |
| C5.3.6 Docs | ⬜ | Mark ✅ with PR + checks. |

## Mini-group C5.4 — Connections (`/connections`)

Purpose: integrations — GitHub/Vercel/Gmail/Calendar/Drive foundation. Reuse
`integration_connections` (foundation migration).

| Task | Status | Detail |
|---|---|---|
| C5.4.1 Data layer | ⬜ | `getIntegrations` — executive/admin-only (`integrations_admin_read` policy already exists). |
| C5.4.2 UI — Connections list | ⬜ | Provider, scopes, status, token expiry warning; connect/disconnect actions (OAuth flow is out of scope for v1 — start with manual API-key connections, add OAuth as a follow-up once a provider is prioritized). |
| C5.4.3 Server actions | ⬜ | `createConnection`, `revokeConnection` — never store raw secrets in the row directly readable by non-admins; confirm storage approach before implementing (ask if unclear — this touches the "no unapproved secrets handling" rule). |
| C5.4.4 Tests | ⬜ | RLS test confirming only admins can read connection rows. |
| C5.4.5 Docs | ⬜ | Mark ✅ with PR + checks. |

## Sequencing note

C5.1 (Finance) is the highest-risk module in the entire rebuild — schedule it
last within this phase and do not rush the human-review step. C5.2/C5.3/C5.4
have no interdependencies and can run in parallel with each other.
