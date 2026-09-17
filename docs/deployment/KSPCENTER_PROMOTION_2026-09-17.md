# KSPCENTER promotion preflight — 2026-09-17

**Status:** CRITICAL REHEARSAL PASSED / FULL PRODUCTION PROMOTION BLOCKED  
**Application repository:** `kauanszpaiva/KSP-OS`  
**Candidate Supabase backend:** `KSPCENTER` / `rmaxqwbjizivkhurvuvx`  
**Observed candidate status:** `ACTIVE_HEALTHY`  
**Current repository lineage target:** legacy project `tqwnsxjrlomosfblleqy`

## Objective

Promote the existing Supabase project named **KSPCENTER** to the canonical backend for **KSP OS** without silently discarding existing objects, weakening RLS, or repointing production before schema, data, runtime, and lineage are reconciled.

## Authoritative sources

1. `AGENTS.md`
2. `reference/AGENTS.md`
3. `docs/spec/README.md`
4. `docs/deployment/APPROVED_DATABASE_LINEAGE.json`
5. Repository migrations under `supabase/migrations/`
6. Live Supabase state captured in `docs/deployment/KSPCENTER_CURRENT_STATE_2026-09-17.json`

## Production preflight observations

- KSPCENTER is reachable and healthy.
- No Supabase Auth users were observed at preflight time.
- Security Advisor returned no findings before any rehearsal DDL.
- The project contains two pre-existing schema families:
  - a Lumendor/commerce lineage (`products`, `orders`, inventory, membership commerce, etc.);
  - a simplified KSP platform lineage (`ksp_profiles`, `ksp_organizations`, `ksp_inc_*`, `ksp_command_*`, `ksp_portal_*`, `ksp_network_*`).
- The repository KSP OS schema is a separate, substantially larger model built around `organizations`, `profiles`, `organization_memberships`, CRM, projects, approvals, finance, documents, operations, Portal, Network, Founder OS, and later migrations.
- At the deeper read-only preflight, `public.memberships`, `public.ksp_members`, and `auth.users` each had zero rows; `ksp_modules` was the only observed non-empty public table with four rows.

## Confirmed compatibility blocker

`public.memberships` already exists in KSPCENTER as the commerce/membership table. KSP OS migration `202607150001_foundation.sql` also creates `memberships`, and migration `202607150002_identity_portal_finance_security.sql` then renames that canonical table to `organization_memberships`.

Direct migration replay against KSPCENTER production is therefore unsafe.

## GitHub source decoupling

The promotion-preflight branch removes active source-level coupling to the legacy Supabase project and requires environment-selected Supabase configuration. It does **not** repoint production.

The branch also repaired inherited production dependency audit blockers with patch-level updates. The exact pre-rehearsal head passed canonical CI, including dependency audit, lint, typecheck, unit/E2E, DB/RLS/migration/lineage/parity tests, secret scan, and builds for Command, Portal, Network, and INC.

## Isolated Supabase rehearsal — executed 2026-09-17

Supabase reported the development-branch price for the KSPCENTER organization as **US$0.01344/hour**. After explicit authorization, an isolated branch was created:

- branch name: `ksp-os-rehearsal-20260917`
- branch project ref: `wkmbibqyfmiykrftosvr`
- parent project ref: `rmaxqwbjizivkhurvuvx`
- `with_data=false`
- branch status reached `ACTIVE_HEALTHY`

No production data was copied into the branch.

### Existing-object classification tested on the branch

The rehearsal preserved both pre-existing schema families while clearing the canonical `public` namespace:

- Lumendor/commerce objects were moved to `legacy_lumendor`.
- Simplified KSPCENTER v1 objects were moved to `legacy_kspcenter_v1`.
- No legacy table was dropped.
- No production object was moved or altered.

Observed after quarantine and canonical replay prefix:

- `legacy_lumendor`: 20 tables preserved
- `legacy_kspcenter_v1`: 15 tables preserved
- `public`: 50 canonical KSP OS tables at the captured checkpoint
- `public.organization_memberships`: present
- `public.memberships`: absent
- `legacy_lumendor.memberships`: present
- `legacy_kspcenter_v1.ksp_members`: present
- all 50 captured canonical `public` tables had RLS enabled
- 81 `public` RLS policies were present at the captured checkpoint

### Canonical migration evidence

An exact migration bundle was generated from the PR branch by GitHub Actions:

- workflow run: `35260592420`
- source head: `9e6f3cbf10d6c26a8d32c39fbbff84862cd13007`
- migration files: 72
- artifact digest: `sha256:ba048bd01bbb6c385358ed6bdafacf18f196ad5bb9242fc58053100fb5173948`

The following canonical migration path was then executed successfully against the real Supabase development branch after legacy quarantine:

1. `202607150001_foundation.sql`
2. full `202607150002_identity_portal_finance_security.sql`, applied in statement-boundary-safe chunks
3. `202607210001_operational_slice.sql`
4. `202607230001_signals_decisions.sql`

This proves the KSPCENTER-specific `memberships` collision can be neutralized without deleting the legacy commerce membership model, and that the critical canonical identity/RBAC transition to `organization_memberships` succeeds on a real Supabase branch.

## Advisor result at the intermediate checkpoint

The branch was intentionally inspected before the later hardening migrations in the 72-file chain.

Security Advisor reported warnings including mutable function `search_path` and externally executable `SECURITY DEFINER` functions. Performance Advisor reported intermediate-state optimization findings such as unindexed foreign keys, auth-RLS init-plan opportunities, and multiple permissive policies.

These findings mean this **intermediate checkpoint is not production-promotable**. Later repository migrations include dedicated security/function/policy hardening, so final production approval still requires full-chain replay followed by fresh Advisors on the final branch state.

Reference remediation documentation returned by Supabase includes:

- function search path: https://supabase.com/docs/guides/database/database-linter?lint=0011_function_search_path_mutable
- anonymous SECURITY DEFINER execution: https://supabase.com/docs/guides/database/database-linter?lint=0028_anon_security_definer_function_executable
- authenticated SECURITY DEFINER execution: https://supabase.com/docs/guides/database/database-linter?lint=0029_authenticated_security_definer_function_executable
- unindexed foreign keys: https://supabase.com/docs/guides/database/database-linter?lint=0001_unindexed_foreign_keys
- auth RLS init-plan: https://supabase.com/docs/guides/database/database-linter?lint=0003_auth_rls_initplan
- multiple permissive policies: https://supabase.com/docs/guides/database/database-linter?lint=0006_multiple_permissive_policies

## Promotion strategy

### Phase 0 — source decoupling

- Remove legacy Supabase project URL/key from active runtime code.
- Require environment-specific Supabase configuration.
- Fail closed when OAuth/Supabase runtime config is absent.
- Keep Preview and Production environment isolation intact.
- Keep exact-head CI green.

### Phase 1 — isolated database rehearsal

Completed for the critical collision and identity/RBAC prefix. Remaining work before production:

1. replay all remaining canonical repository migrations in order on a fresh isolated KSPCENTER branch;
2. generate TypeScript database types from the final branch state;
3. run Security and Performance Advisors after all hardening migrations;
4. run cross-tenant denial, founder authorization, client Portal isolation, finance and login/session checks against the final branch state;
5. preserve immutable evidence of all legacy objects and the final schema.

### Phase 2 — data migration and lineage reconciliation

Schema promotion alone is insufficient because the historical `appkspos` environment contains prior KSP OS application state while KSPCENTER is currently nearly empty.

Before cutover:

1. inventory old `appkspos` production rows, Auth identities, Storage objects, and required runtime metadata;
2. define table-by-table and identity-by-identity data mapping into the final KSPCENTER schema;
3. rehearse the data migration in isolation;
4. verify row counts, hashes/spot checks, foreign keys, Auth linkage, RLS and tenant boundaries;
5. only then update `APPROVED_DATABASE_LINEAGE.json` and environment-topology evidence to KSPCENTER.

### Phase 3 — controlled production promotion

Only after explicit production-release authorization:

1. take a fresh KSPCENTER backup/preflight snapshot;
2. execute the reviewed schema/data promotion package;
3. verify schema and data parity;
4. provision/verify required internal Auth identities;
5. configure Vercel/GitHub environment variables to KSPCENTER;
6. smoke-test Command, INC, Portal, Network and Founder/MCP auth paths;
7. run Security and Performance Advisors again;
8. preserve rollback evidence and legacy schemas until acceptance is complete.

## Explicit production non-actions

- No KSPCENTER production table was dropped, renamed, moved, or altered.
- No canonical KSP OS migration was applied to KSPCENTER production.
- No production Auth user was created.
- No production URL/key was changed.
- No legacy Supabase project was deleted or modified.
- No production lineage manifest was changed to KSPCENTER.
- No GitHub PR was merged.

## Acceptance criteria for KSPCENTER becoming canonical

KSPCENTER is not canonical merely because the app can connect to it. Promotion requires all of the following:

- full repository migration chain replays successfully in isolated KSPCENTER rehearsal;
- no unresolved table/type/function/policy collisions remain;
- Security Advisor has no unresolved blocking findings after final hardening;
- RLS deny/allow tests pass for internal, client, project, finance, founder, and cross-tenant paths;
- generated TypeScript types match the promoted schema;
- old `appkspos` state that must survive cutover has a verified data-migration path;
- production dependency audit and canonical repository test suites pass;
- Command, INC, Portal and Network build successfully;
- login/session resolution works against the target environment;
- runtime environment configuration contains no stale production project reference;
- exact-head CI and deployment preflight pass;
- production promotion is explicitly authorized and has rollback evidence.

## Current decision

**KEEP PRODUCTION BLOCKED.** The KSPCENTER-specific schema collision is technically solvable and the critical canonical identity/RBAC prefix has passed on a real isolated Supabase branch. The next promotion gate is full-chain isolated replay plus final Advisor validation and a separate rehearsed migration of historical `appkspos` data into KSPCENTER.