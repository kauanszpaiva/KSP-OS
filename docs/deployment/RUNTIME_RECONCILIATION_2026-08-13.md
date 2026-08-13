# KSP OS Runtime Reconciliation — 2026-08-13

**Status:** REVIEW REQUIRED  
**Repository baseline:** `kauanszpaiva/KSP-OS` / `main` / `ca52c706eb36d0746a90094c667eebffefb1a233`  
**Release candidate:** PR #46 / `ecb6d0a6ccd5635e64a09d1f0011cd5e82b4d6cd`  
**Connected Supabase project:** `appkspos` (`tqwnsxjrlomosfblleqy`)  
**Connected Vercel team:** `ksp-dominion-group` (`team_8ywOglpfLhAvtIzGNRmAAPhg`)

## Executive finding

`CONFLICT-0013` is still valid, but its original database description is stale. The connected `appkspos` database is no longer at foundation-only state: the core Command/Portal schema migrations are present. The remaining issue is mixed database drift plus incomplete database release evidence, not absence of the application schema.

Do not treat this document as authorization to deploy or mutate Production.

## Verified database state

The Supabase migration registry contains the foundation/identity/operational migrations plus later migrations named:

- `signals_decisions`
- `missions`
- `growth`
- `control`
- `cross_cutting`
- `portal_foundation`
- `portal_home_projects`
- four `portfolio_os_*` migrations

Direct schema inspection also confirmed that the core tables for campaigns, content, projects, tasks, clients, finance/control, portal, and the Portfolio OS tables exist.

## Verified gaps against repository intent

The following repository-defined capabilities are not fully reflected in the connected database:

- `change_orders_portal_read` policy is absent.
- `mission_milestones.start_date` is absent.
- `tasks.start_date` is absent.
- `organization_memberships_executive_update` policy is absent.
- `prevent_last_founder_downgrade()` and its trigger are absent.
- Executive DELETE policies introduced by the repository's deletion-policy migration are absent on the audited operational tables.
- `preview_portal_invitation(text)` is absent.
- `documents_portal_read` is absent.
- `client_meetings` is absent.

A forward reconciliation migration was added in this branch as `supabase/migrations/202608130001_runtime_reconciliation.sql`. It expresses the intended final state without inserting fake historical migration rows or blindly replaying partially reflected historical migrations.

## Reverse drift: database changes not represented in this repository

The connected database also contains four applied migrations named:

- `portfolio_os_foundation`
- `portfolio_os_function_hardening`
- `portfolio_os_function_execute_scope`
- `portfolio_os_user_profiles`

Their resulting `portfolio_*` schema exists in the database, but the canonical KSP-OS repository currently has no matching migration files or application references. This must be classified before cleanup: retain and import to source control if it is legitimate KSP-OS state, or isolate/remove it through a separately reviewed migration if it belongs to another experiment/product. No destructive action is authorized by this reconciliation.

## Verified Vercel Preview mapping

GitHub/Vercel checks for PR #46 map the exact release candidate to both expected application projects:

- Command project: `ksp-os-command` (`prj_Ajm8CXfHQEdsC6LtMN6gayR9mi7r`), root `apps/command`.
- Portal project: `ksp-os-portal` (`prj_nn06qnwA5kFwq0y2UBF74xcdK2TP`), root `apps/portal`.

Both Vercel checks reported **Ready** for commit `ecb6d0a6ccd5635e64a09d1f0011cd5e82b4d6cd`.

Preview URLs reported by the Vercel bot:

- Command: `https://ksp-os-command-git-feat-delivery-foun-a58ea5-ksp-dominion-group.vercel.app`
- Portal: `https://ksp-os-portal-git-feat-delivery-found-0170de-ksp-dominion-group.vercel.app`

The Vercel connector can identify the KSP team but currently cannot enumerate those projects/deployments directly, so GitHub's Vercel check and bot report are the available deployment evidence for this release candidate. Authenticated browser verification of the Preview route remains unavailable through the connector.

## CI evidence

GitHub Actions run `31715909231` passed the full repository CI pipeline for the release candidate, including:

- dependency review
- frozen dependency installation
- format check
- lint
- TypeScript typecheck
- unit tests
- DB test-plan guard
- RLS coverage guard
- migration guard
- secret scan
- Command build
- Portal build

The DB/RLS guards are repository/static checks; they do not replace executing the reconciliation migration and actor-level authorization tests against a non-Production database.

## Release gate

Current gate: **NOT READY for Production database migration**.

Remaining blocking evidence gaps:

1. The forward reconciliation migration has not been executed in a non-Production Supabase branch/environment.
2. Backup/restore evidence and a migration rollback/forward-fix test are not available for the target database environment.
3. RLS behavior has not yet been exercised with positive and negative actor tests against the reconciliation migration.
4. The untracked `portfolio_os_*` database lineage is unresolved.
5. The Delivery route is built and Preview-deployed, but the central sidebar navigation edit remains unapplied because the connector blocked modification of the authorization/visibility-sensitive navigation file.
6. Exact one-use human approval is still required for the final commit, environment, migration plan, and Production promotion.

## Safe next sequence

1. Classify the untracked `portfolio_os_*` schema lineage.
2. Test the reconciliation migration in a non-Production Supabase branch/environment.
3. Run RLS tests for internal member, executive, client portal member, cross-tenant user, and anonymous access.
4. Capture backup/restore and rollback/forward-fix evidence.
5. Re-audit the exact release commit and wire the Delivery navigation through an approved code path.
6. Request one-use human approval for the exact commit, environment, migration plan, and deployment target before Production promotion.

## Production actions intentionally not performed

- No migration was applied to the connected `appkspos` database.
- No Auth/RLS policy was changed in the connected database.
- No untracked Portfolio OS tables were deleted or altered.
- PR #46 has not been merged to `main`.
- No Production deployment was triggered by this work.
