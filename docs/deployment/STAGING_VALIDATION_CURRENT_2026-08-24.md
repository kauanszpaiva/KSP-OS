# KSP OS Current Staging Validation — 2026-08-24

## Scope

This record captures the current isolated Supabase staging state after the P0 database/access-control remediation and the CI fixes merged through PR #132. No production DDL was applied.

- Production project: `appkspos` / `tqwnsxjrlomosfblleqy`
- Current staging branch: `ksp-os-staging`
- Current staging branch id: `3f5936f8-efe1-409a-8bfd-a86a977fb3ea`
- Current staging project ref: `qfnriufuahlcwbxgprmy`
- Staging production data copy: none
- Repository validation merge: PR #132 / `fdac5712ee776ba8251a450d4d37d8c71bf9dc9c`
- Production DDL gate: **BLOCKED**

The earlier staging record for `yszxtinabzamsayfkymq` is retained as historical evidence only. It is not the current staging target.

## Current staging forward replay

The current staging branch inherited the production migration ledger and then received only reviewed, source-controlled forward changes needed to exercise the target state. The following were applied to staging only:

1. `business_units_access_foundation`
2. `project_creator_membership`
3. `partner_operations_foundation`
4. `business_units_brand_alignment`
5. `security_function_hardening`

Current staging ledger entries for this replay are:

- `20260824233112 business_units_access_foundation`
- `20260824233122 project_creator_membership`
- `20260824233145 partner_operations_foundation`
- `20260824233158 business_units_brand_alignment`
- `20260824233208 security_function_hardening`

No production migration-history row was renamed, deleted, or marked applied to manufacture parity.

## Schema and access checks

Verified on current staging:

- `public.business_units`
- `public.business_unit_memberships`
- `public.partner_organizations`
- `public.partner_memberships`
- `public.partner_assignments`
- `business_unit_private.sync_project_creator_membership()`

A transaction-scoped non-production actor with an active internal organization role and Business Unit `admin` access successfully created a classified project. The creator-membership trigger created the project-level membership automatically, and `public.can_access_project(...)` remained true for the creator. The probe was rolled back after verification.

This closes the create-then-disappear defect for non-executive Business Unit administrators without widening the project SELECT policy.

## Function hardening checks

Verified on current staging after `security_function_hardening`:

- anonymous direct execution of `apply_approval_decision()` is denied;
- authenticated direct execution of `apply_approval_decision()` is denied;
- anonymous direct execution of `current_org_ids()` is denied;
- authenticated execution of `current_org_ids()` remains allowed for application/RLS use;
- anonymous direct execution of `is_founder(uuid)` is denied;
- authenticated execution of `is_founder(uuid)` remains allowed for application/RLS use.

Signed-in SECURITY DEFINER advisor warnings still exist for functions that require intentional caller classification. No blanket authenticated-function revocation was performed.

## Repository behavioral gate

PR #132 repaired stale test-fixture assumptions while preserving the stricter authorization model:

- client Portal fixtures now seed the explicit `project.read` grants created by the real invitation-acceptance path instead of weakening project RLS;
- invitation preview expectations match the current `ready` state;
- anonymous tests accept a fail-closed `insufficient_privilege` result when hardened RLS helpers are intentionally non-executable;
- the disaster-recovery rehearsal restores into a genuinely empty database rather than pre-seeding Supabase platform shims twice;
- the task-delivery regression matches the canonical `task_delivery_requirement_change_not_allowed` trigger error.

GitHub Actions run #447 passed the full current gate for the exact PR head before merge:

- dependency review
- audit / e2e contract / format / lint / typecheck / unit tests
- behavioral `test:db`
- `test:rls`
- migration checks
- lineage checks
- parity checks
- secret scan
- Command build
- Portal build
- Network build

PR #132 was then squash-merged to `main` as `fdac5712ee776ba8251a450d4d37d8c71bf9dc9c`.

## Preview binding

Source-level Preview binding is current in all three applications:

- `apps/command/next.config.ts`
- `apps/portal/next.config.ts`
- `apps/network/next.config.ts`

Each forces Vercel Preview builds to `https://qfnriufuahlcwbxgprmy.supabase.co` with the staging publishable key. Production builds continue to resolve production configuration separately.

The Vercel connector available to this remediation session does not enumerate the projects even though GitHub's Vercel integration reports deployments. Therefore the source-level binding is evidenced, but the exact environment variables/deployed revision should still be treated as a release preflight item rather than inferred from connector absence.

## Remaining production gates

Production remains blocked. Before any production DDL:

1. Protect `main` and require the canonical CI contexts; GitHub currently reports `main` as unprotected and the available connector cannot mutate branch-protection/ruleset settings.
2. Capture a fresh production preflight snapshot immediately before release (migration ledger, target schema/functions/policies, and runtime inventory).
3. Review the production forward package against the staging-proven target state and obtain explicit production-release authorization.
4. Reconfirm Preview/production deployment topology and environment binding for the exact release revision.
5. Treat remaining signed-in SECURITY DEFINER advisor findings individually; do not use blanket ACL revocation as a release shortcut.

Do not merge the Supabase development branch directly into production as a shortcut. Production promotion must use the reviewed repository-controlled forward plan.
