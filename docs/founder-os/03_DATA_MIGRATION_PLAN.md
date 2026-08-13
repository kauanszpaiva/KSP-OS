# 03 — Founder OS Data & Migration Plan

**Status:** P0 migration authored + rehearsed
**Date:** 2026-08-13

## Scope

This document covers (a) the additive schema migration shipped in P0, and (b) the **deferred** cross-project donor migration (Kauan-Home → KSP Command), which is **NOT performed in this task**.

## P0 migration (shipped)

**File:** `supabase/migrations/202608130002_founder_os_foundation.sql` — additive only.

### New tables

| Table | Purpose | Key columns | RLS |
| --- | --- | --- | --- |
| `founder_inbox_items` | Universal private capture | `owner_id`, `item_type` (11-value check), `title`, `body`, `triage_status`, `target_table`/`target_id`, `metadata` | owner-bound + founder-gated, full CRUD |
| `founder_tasks` | Private personal work | `owner_id`, `title`, `notes`, `status`, `priority`, `due_date`, `waiting_on`, `source_inbox_id` | owner-bound + founder-gated, full CRUD |
| `founder_promotions` | Append-only private→company promotion ledger | `owner_id`, `source_table`, `source_id`, `target_table`, `target_id`, `fields` (company-visible snapshot only) | owner-bound + founder-gated; SELECT/INSERT only (immutable) |

### Reused (unchanged)

- `founder_vault_entries` — surfaced in the Founder OS shell; **no schema change, existing rows preserved.**
- `is_founder(org)`, `set_updated_at()` — reused verbatim.
- `commitments` — referenced read-only for "My Work" company section; promotion target.
- `activity_events`, `audit_events` — company-side promotion audit.

### Constraints / indexes / triggers

- Checks: `item_type` enum-set, `triage_status` enum-set, `status`/`priority` enum-sets, `founder_tasks_waiting_has_context`, `founder_inbox_target_pair`, title-length bounds.
- Unique: `founder_promotions_unique (source_table, source_id, target_table)` (idempotency).
- Indexes: `(owner_id, triage_status, created_at desc)`, `(owner_id, status, due_date)`, `(owner_id, source_table, source_id)` — driven by the actual Home/Inbox/Work queries.
- Triggers: `set_updated_at()` on both mutable tables.

### Verification performed

1. Static: `check-migrations` (19 files), `check-rls` (61 tables), `check-secrets` (clean).
2. Ephemeral PG16 cluster: 24/24 RLS + constraint assertions pass.
3. Full 19-migration chain applied on real Postgres + seeded actor matrix: founder isolation green.

(Full outputs in `06_RELEASE_EVIDENCE.md`.)

## Rollback

**App:** revert the branch (removes `/founder` subtree, the nav entry change, tests).

**Database:**
```sql
drop table if exists founder_promotions;
drop table if exists founder_tasks;      -- references founder_inbox_items(id) ON DELETE SET NULL
drop table if exists founder_inbox_items;
```
`founder_vault_entries` and all company tables are untouched, so rollback loses only founder-private inbox/task/promotion data created after deploy. No company data, no auth, no RLS on other tables is affected. Order matters only for the FK (`founder_tasks.source_inbox_id` → drop `founder_tasks` before `founder_inbox_items`, or use `cascade`).

Down-migration is intentionally not auto-run (the repo uses forward-only migrations); rollback is a deliberate operator action.

## Deferred — cross-project donor migration (NOT in this task)

Migrating real Kauan-Home production data (finance, ownership, people, knowledge) into KSP Command is **explicitly out of scope** and requires separate, explicit authorization. When approved, the plan will be:

1. Per-domain mapping (Kauan-Home table → KSP founder-private table) with data classification.
2. Export from the Kauan-Home Supabase (read-only; donor is never mutated/decommissioned here).
3. Transform to KSP conventions (`organization_id` + `owner_id`, enum normalization).
4. Load into KSP founder-private tables under RLS, in a rehearsal DB first.
5. Reconciliation + row-count/όintegrity checks before any production load.
6. No personal financial records moved without finance-domain review and explicit approval.

Until that decision, Kauan-Home stays live, read-only, and unchanged. No personal production data is copied in P0.
