# KSP Dominion OS — Data Model

Migrations are in `supabase/migrations/`, applied in filename order.

## Pre-existing (audited, not authored here)

- `202607150001_foundation.sql` — tenancy (`organizations`, `profiles`, `memberships`), `audit_events`, CRM, projects/tasks, approvals, finance (chart/journal + immutability), documents, inbox, subscriptions, integrations, jobs, ai_actions. RLS enabled (mostly read policies).
- `202607150002_identity_portal_finance_security.sql` — identity split (`internal_role`), rename `clients`→`client_organizations` and `memberships`→`organization_memberships`, grants/delegations/temporary access, client requests + change orders + publications, accounting periods, `post_journal_entry()`, portal/admin write RLS.

## Added by the operational slice (`202607210001_operational_slice.sql`)

| Table | Purpose | Key invariants |
|---|---|---|
| `company_outcomes` | Org-level results (Focus Governor) | ≤ 3 active per org (trigger); progress 0–100 |
| `commitments` | Promised results | `owner_id NOT NULL`; active state needs due/next-action date; `requires_proof` |
| `commitment_assignments` | Accountable + contributor links | unique (commitment, profile) |
| `proofs` | Proof Chain evidence | `accepted_at`/`accepted_by` set only by executives |
| `activity_events` | Work-graph timeline | append-only under RLS |
| `founder_vault_entries` | Founder-only private data | founder + own-rows only |

### Triggers / functions

- `enforce_active_outcome_limit` — blocks a 4th active outcome.
- `enforce_commitment_completion` — completing requires executive acceptance and (if `requires_proof`) an accepted proof; stamps `completed_at`.
- `set_updated_at` — maintains `updated_at`.

### Repairs to prior migrations

- `current_org_ids()` and `is_executive()` re-pointed from the renamed `memberships` to `organization_memberships`.
- Membership helpers (`current_org_ids`, `is_executive`, `is_internal_member`, new `is_founder`) recreated as `SECURITY DEFINER` with fixed `search_path` to prevent RLS policy recursion.
- `audit_events` gained an append-only INSERT policy (org + self actor) so server actions can record audit events under RLS.

## Conventions

Tenant tables carry `organization_id`, timestamps, and (where relevant) `created_by`, `status`/`state`, and `classification`. Every tenant-owned table has RLS. Naming follows the existing repository style (snake_case, `_minor` money integers elsewhere).

## Not yet modeled (planned)

`signals`, `decisions`/`decision_options`, `missions`, `milestones`, `project_phases`, `dependencies`, `risks`, `opportunities`, `relationship_touchpoints`, `invoices`, `payments`, `product_bets`, `experiments`, `campaigns`, `content_assets`, `integration_events`, `sync_runs`. See the 30-day roadmap.
