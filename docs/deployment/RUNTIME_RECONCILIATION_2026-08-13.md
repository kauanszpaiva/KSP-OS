# KSP OS Runtime Reconciliation — 2026-08-13

**Status:** REVIEW REQUIRED  
**Repository baseline:** `kauanszpaiva/KSP-OS` / `main` / `ca52c706eb36d0746a90094c667eebffefb1a233`  
**Connected Supabase project:** `appkspos` (`tqwnsxjrlomosfblleqy`)  
**Connected Vercel team:** `kspdgroup` (`team_8ywOglpfLhAvtIzGNRmAAPhg`)

## Executive finding

`CONFLICT-0013` is still valid, but its original database description is stale. The connected `appkspos` database is no longer at foundation-only state: the core Command/Portal schema migrations are present. The remaining issue is a mixed drift state plus unresolved deployment mapping.

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

## Deployment mapping blocker

Repository deployment docs define two intended Vercel projects:

- `ksp-command-os` with root `apps/command`
- `ksp-client-portal` with root `apps/portal`

The connected Vercel team `kspdgroup` currently returns zero projects. Therefore the exact commit → Vercel project → deployment → domain mapping cannot be verified from the connected control plane.

The documented domains `app.kspdominion.com` and `portal.kspdominion.com` are recommendations in repository documentation, not verified live targets in this audit.

## Release gate

Current gate: **NOT READY for Production**.

Blocking evidence gaps:

1. Exact Vercel projects/deployments are not visible in the connected KSP team.
2. No verified Preview deployment is mapped to the release commit.
3. The forward reconciliation migration has not been executed in a staging branch/environment.
4. Backup/restore evidence and a migration rollback/forward-fix test are not available for the target environment.
5. RLS behavior has not yet been exercised with positive and negative actor tests against the reconciliation migration.
6. The untracked `portfolio_os_*` database lineage is unresolved.

## Safe next sequence

1. Run CI on the implementation PR.
2. Identify or reconnect the two intended Vercel projects and verify Preview mapping.
3. Test the reconciliation migration in a non-Production Supabase branch/environment.
4. Run RLS tests for internal member, executive, client portal member, cross-tenant user, and anonymous access.
5. Capture backup/restore and rollback/forward-fix evidence.
6. Re-audit the exact release commit.
7. Request one-use human approval for the exact commit, environment, migration plan, and deployment target before Production promotion.

## Production actions intentionally not performed

- No migration was applied to the connected `appkspos` database.
- No Auth/RLS policy was changed in the connected database.
- No Vercel project was created or modified.
- No Production deploy was triggered.
- No untracked Portfolio OS tables were deleted or altered.
