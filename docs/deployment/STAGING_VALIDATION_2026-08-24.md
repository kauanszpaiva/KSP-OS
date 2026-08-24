# KSP OS Staging Validation — 2026-08-24

## Scope

This record captures the first isolated Supabase staging rehearsal for the KSP OS P0 lineage and access-control remediation. No production DDL was applied.

- Production project: `appkspos` / `tqwnsxjrlomosfblleqy`
- Staging branch: `staging`
- Staging branch id: `dd5f688b-820f-4d98-92cc-0b7a8927e84e`
- Staging project ref: `yszxtinabzamsayfkymq`
- Production DDL gate: **BLOCKED**

## Lineage rehearsal

The newly-created Supabase development branch did not initially provide a clean replayable repository baseline. Its first production rebase failed while applying the live `growth` migration because `client_organizations` was missing. That failure is evidence that the live migration registry cannot be treated as a self-sufficient canonical rebuild sequence.

The staging branch was repaired without changing production history:

1. Reset only the staging `public` schema.
2. Replayed the canonical repository foundation/identity/operational prerequisites.
3. Replayed the repository Signals/Decisions and Missions prerequisites.
4. Re-ran the Supabase production rebase; it then completed successfully.
5. Applied source-only Business Units, Partner Operations, and Business Unit brand-alignment migrations to staging only.

This supports the existing rule: do not repair production lineage by renaming migrations or marking historical migrations as applied.

## Schema checks

Verified present on staging:

- `public.business_units`
- `public.business_unit_memberships`
- `public.projects.business_unit_id`
- `public.partner_organizations`
- `public.partner_memberships`
- `public.partner_assignments`
- `public.partner_activity_events`
- `client-media` Storage bucket and media-workspace columns already represented by the rebased live state

## Behavioral authorization checks

Seeded non-production actors and exercised the same authorization boundaries described by `supabase/tests/business_units_access.test.sql`.

Observed results:

- Future-dated organization membership did not activate early.
- Future-dated project grant did not activate early.
- Ordinary Business Unit member could not gain project-create authority from unit visibility alone.
- Viewer `can_create_project_in_business_unit` returned `false`.
- Unit admin returned `true` for project creation in its own Business Unit and `false` for another unit; an actual own-unit project insert succeeded under the authenticated role.
- Ordinary member saw exactly one Business Unit in the test tenant.
- Dominion project access: `true`.
- KSP Dev project access from a Dominion-only actor: `false`.
- Legacy unclassified project compatibility before classification: `true`.
- Child-task visibility across Dominion/KSP Dev test projects: exactly one visible row.
- Founder saw all three tenant Business Units.
- `executive_operations` saw all three tenant Business Units.
- Suspending the Business Unit membership reduced project access to `false` and child-task visibility to zero.
- Cross-organization project classification was rejected by `projects_business_unit_org_fkey` (`23503`).
- Classifying the legacy project into Dominion reactivated the inherited Business Unit membership exactly once.
- Partner A saw exactly one partner organization and one assignment.
- Partner assignment response returned `accepted` for the assigned partner.
- Cross-partner assignment response was rejected with `assignment_access_denied`.
- Cross-vertical partner assignment was rejected with `partner_assignment_scope_mismatch`.
- Suspending the partner membership reduced visible assignments to zero.

## Function hardening rehearsal

Applied the source-controlled migration `20260824150500_security_function_hardening.sql` to staging.

Changes:

- pinned `search_path` for:
  - `prevent_posted_journal_update()`
  - `prevent_posted_journal_line_update()`
  - `set_updated_at()`
  - `enforce_active_outcome_limit()`
  - `enforce_commitment_completion()`
- removed public/anonymous direct execution from `current_org_ids()` and `is_founder(uuid)` while retaining explicit authenticated/service-role execution;
- removed public/anonymous/authenticated direct execution from trigger-only `apply_approval_decision()`.

Post-hardening privilege checks:

- anonymous `apply_approval_decision`: denied
- authenticated `apply_approval_decision`: denied
- anonymous `current_org_ids`: denied
- authenticated `current_org_ids`: allowed
- anonymous `is_founder`: denied
- authenticated `is_founder`: allowed

An authenticated approval request followed by an executive approval decision still transitioned the request to `approved`, proving the trigger remained operational after direct RPC execution was removed.

## Security advisor delta

After hardening:

- the five mutable-`search_path` warnings cleared;
- anonymous SECURITY DEFINER execution warnings for `apply_approval_decision`, `current_org_ids`, and `is_founder` cleared;
- signed-in SECURITY DEFINER warnings remain for functions that require caller-by-caller classification, including intentional application RPCs and RLS helpers;
- leaked-password protection remains disabled at the Supabase Auth configuration layer and requires Auth configuration rather than database DDL.

No blanket authenticated-function revocation was performed because several flagged functions are deliberate application RPCs or RLS helpers.

## Remaining release gates

Production remains blocked until all of the following are true:

1. Repository/live remap candidates receive final semantic classification (`exact`, `equivalent`, `partial`, or `not applied`).
2. A production forward plan is generated from the staging-proven end state without falsifying historical migration rows.
3. Staging/Preview environment variables are confirmed to point at the staging Supabase project rather than production.
4. Remaining SECURITY DEFINER functions are classified by intended caller and regression-tested before any ACL reduction.
5. `main` branch protection is enabled so CI cannot be bypassed; GitHub currently reports `main` as unprotected.
6. CI passes for the exact hardening commit.

Do not merge the Supabase staging branch into production as a shortcut. Production promotion must use the reviewed repository migration plan after these gates are closed.
