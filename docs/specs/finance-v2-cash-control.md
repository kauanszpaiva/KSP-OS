# Finance V2 — Cash Control vertical slice

Issue: #73

## Outcome

This slice turns Finance from an accounting/subscription console into the beginning of a founder cash-control system. It adds financial accounts, exact cash activity, statement reconciliation, truth-state UX, executive-only RLS, and immutability after reconciliation.

It does **not** connect to banks, initiate payments, infer missing balances, replace bookkeeping/tax software, or claim production schema parity.

## Truth rules

- Unknown is not zero. An account without a verified opening balance renders `Needs reconciliation`.
- Monetary values are stored as integer minor units plus explicit ISO-4217 currency.
- Cash transactions are positive magnitudes with an explicit `inflow` or `outflow` direction.
- A statement reconciles only if `opening balance + all activity through statement end date = statement ending balance` exactly.
- Once reconciled, cash transactions and statements are immutable.
- After a reconciliation exists, an account's opening-balance basis and currency cannot be changed.
- Client/project links are tenant-checked in the database.

## Security boundary

Tables `financial_accounts`, `cash_transactions`, and `reconciliation_statements` have RLS enabled. Only `is_executive(organization_id)` can select, insert, or update them. No hard-delete policy is granted.

`reconcile_cash_statement(uuid, uuid)` is `SECURITY DEFINER` only to perform an atomic reconciliation. It validates `auth.uid()`, actor identity, executive access, account/currency scope, opening-balance presence, and exact statement equality. Execute is revoked from `public` and `anon` and granted only to `authenticated`.

Restricted finance audit inserts are limited to authenticated executives, the active actor, and the explicit finance target tables used by this slice.

## UI

Finance now lands on **Cash** instead of the chart of accounts. It exposes:

- cash truth state;
- per-account book balance or `Needs reconciliation`;
- unreconciled transaction count;
- account creation with optional verified opening balance;
- manual inflow/outflow capture with evidence reference;
- statement capture and reconciliation queue;
- recent cash activity;
- existing receivables/subscriptions/accounting consoles as separate views.

The header labels recurring spend as **Tracked subscriptions**, not total company burn.

## Invoice safety correction

The existing invoice UI previously called a legacy action that could send to the placeholder address `client@example.com`. The UI is now wired to executive-gated finance actions that always set and filter by the active `organization_id`, write restricted audit events, and **do not send external email without a verified billing recipient**.

The legacy exported action remains in the older monolithic actions module for compatibility but is no longer wired to the Finance UI. It should be removed when invoice workflows are migrated fully into the Finance module.

## Verification

Automated coverage added:

- finance package tests for positive exact minor units, signed directions, unknown opening balance, book balance, and exact reconciliation;
- SQL finance cash-control test plan for executive/non-executive RLS, currency scope, mismatch rejection, successful reconciliation, and immutability;
- existing repo migration/RLS/secret/type/build checks remain required before merge.

## Migration / production gate

Migrations:

- `202608210002_finance_cash_control.sql` — cash-control schema, RLS, scope guards, immutability and reconciliation RPC;
- `202608210003_finance_cash_audit_policy.sql` — restricted executive audit-write policy for finance actions.

The migrations are additive in the repository. Because `CONFLICT-0013` (repository/runtime/database lineage mismatch) remains open, merging this code does **not** authorize blindly applying them to the live Supabase project. Production application requires lineage reconciliation, a reviewed forward plan, and a compensating/rollback procedure.

## Recovery / rollback

Before production application:

1. confirm the live migration ledger and existence/shape of referenced tables/functions;
2. rehearse the migrations against a production-like schema snapshot;
3. snapshot/backup the database;
4. apply forward only after the release gate is approved.

If code must be rolled back before the DB migrations are applied, revert the merge commit. If the additive DB migrations have already been applied, prefer a compensating migration that disables new UI/use while preserving finance history; do not drop reconciled finance records as a casual rollback.

## Follow-ups from #73

Next vertical slices should add AR/payment allocation and aging, AP/bills, expenses/evidence, project economics, then the 13-week cash forecast. Bank/processor integrations should come only after the manual reconciliation truth model is proven.
