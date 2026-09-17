# KSPCENTER promotion preflight — 2026-09-17

**Status:** PREPARED / DATABASE DDL BLOCKED  
**Application repository:** `kauanszpaiva/KSP-OS`  
**Candidate Supabase backend:** `KSPCENTER` / `rmaxqwbjizivkhurvuvx`  
**Observed candidate status:** `ACTIVE_HEALTHY`  
**Current repository lineage target:** legacy project `tqwnsxjrlomosfblleqy`

## Objective

Promote the existing Supabase project named **KSPCENTER** to the canonical backend for **KSP OS** without silently discarding current database objects, weakening RLS, or repointing production before the repository schema and runtime have been reconciled.

## Authoritative sources

1. `AGENTS.md`
2. `reference/AGENTS.md`
3. `docs/spec/README.md`
4. `docs/deployment/APPROVED_DATABASE_LINEAGE.json`
5. Repository migrations under `supabase/migrations/`
6. Live Supabase state captured in `docs/deployment/KSPCENTER_CURRENT_STATE_2026-09-17.json`

## Observed live candidate state

- KSPCENTER is reachable and healthy.
- No Supabase Auth users were observed at preflight time.
- Security Advisor returned no findings at preflight time.
- The project contains two distinct schema families:
  - a Lumendor/commerce lineage (`products`, `orders`, inventory, membership commerce, etc.);
  - a simplified KSP platform lineage (`ksp_profiles`, `ksp_organizations`, `ksp_inc_*`, `ksp_command_*`, `ksp_portal_*`, `ksp_network_*`).
- The repository KSP OS schema is a separate, substantially larger model built around `organizations`, `profiles`, `organization_memberships`, CRM, projects, approvals, finance, documents, operations, Portal, Network, Founder OS, and subsequent migrations.
- KSPCENTER currently has no Supabase development branches.
- `public.memberships`, `public.ksp_members`, and `auth.users` each had zero rows at the deeper read-only preflight; `ksp_modules` was the only observed non-empty public table with four rows.

## Confirmed compatibility blocker

`public.memberships` already exists in KSPCENTER as the commerce/membership table. KSP OS migration `202607150001_foundation.sql` also creates `memberships`, and migration `202607150002_identity_portal_finance_security.sql` then renames that table to `organization_memberships`.

Therefore the repository migration chain cannot be replayed safely against KSPCENTER in its current state. The live commerce `memberships` table had zero rows at preflight time and its only direct foreign-key dependency was `membership_events.membership_id`, which materially reduces rehearsal risk but does not remove the need for an isolated migration rehearsal.

## Runtime coupling found in the repository

The repository still contained source-level coupling to the legacy Supabase project, including:

- `.env.example`;
- `.github/workflows/setup-login.yml`;
- KSP INC auth routing;
- Founder AI OAuth issuer fallback;
- protected-resource metadata fallback.

The promotion-preflight branch removes those runtime hardcoded fallbacks and makes the selected Supabase environment explicit. It does **not** repoint production to KSPCENTER.

## Dependency security gate discovered during CI

The first exact-head CI attempt stopped at the production dependency audit before lint, typecheck, tests, or builds. The existing baseline included critical Next.js advisories plus vulnerable `fast-uri` and `sharp` resolutions.

The branch now applies patch-only remediation and regenerates the pnpm lockfile through pnpm itself:

- Next.js `15.5.23` -> `15.5.24` across Command, INC, Network, and Portal;
- `fast-uri` 3.x -> `3.1.8` through the existing root override mechanism;
- vulnerable `sharp` resolutions below `0.35.4` -> `0.35.4`.

The one-shot lockfile workflow ran `pnpm install --frozen-lockfile` and `pnpm audit --prod --audit-level high` successfully before committing the generated lockfile, then removed itself from the branch. Full canonical CI still has to pass on the resulting exact head.

## Promotion strategy

### Phase 0 — source decoupling

- Remove legacy Supabase project URL/key from active runtime code.
- Require environment-specific Supabase configuration.
- Fail closed when OAuth/Supabase runtime config is absent.
- Keep Preview and Production environment isolation intact.
- Repair any production dependency vulnerability that prevents the canonical CI gate from running.
- Run full repository CI on the exact PR head.

### Phase 1 — isolated database rehearsal

Create a Supabase development branch from KSPCENTER only after the platform-reported branch cost is explicitly confirmed.

On that isolated branch:

1. capture a schema/migration snapshot;
2. classify every existing object as `preserve`, `quarantine`, `supersede`, or `canonical`;
3. perform a complete collision scan against all repository migrations;
4. quarantine legacy commerce objects that collide with KSP OS, preserving data and dependency evidence;
5. replay the repository KSP OS migration chain;
6. generate TypeScript database types;
7. run Security and Performance Advisors;
8. run repository DB, RLS, migration, lineage, and parity tests against the rehearsal branch;
9. test cross-tenant denial, founder authorization, client portal isolation, and login/session resolution.

### Phase 2 — lineage reconciliation

If rehearsal passes:

- update `APPROVED_DATABASE_LINEAGE.json` to the KSPCENTER project ref;
- replace stale environment-topology evidence with fresh KSPCENTER evidence;
- record any preserved live-only objects with immutable version/hash evidence;
- bind Preview to a tested non-production branch/project;
- keep production DDL blocked until the exact-head release preflight is complete.

### Phase 3 — controlled production promotion

Only after explicit production-release authorization:

1. take a fresh KSPCENTER backup/preflight snapshot;
2. execute the reviewed promotion migration/package;
3. verify schema parity and migration history;
4. provision/verify required internal auth identities;
5. configure Vercel/GitHub environment variables to KSPCENTER;
6. smoke-test Command, INC, Portal, Network and Founder/MCP auth paths;
7. run Security and Performance Advisors again;
8. preserve rollback evidence and legacy schema until acceptance is complete.

## Explicit non-actions in this preflight

- No KSPCENTER tables were dropped, renamed, moved, or altered.
- No Supabase migration was applied to KSPCENTER.
- No Auth user was created.
- No production URL/key was changed.
- No legacy project was deleted or modified.
- No Supabase development branch was created because branch cost confirmation is a required gate.

## Acceptance criteria for KSPCENTER becoming canonical

KSPCENTER is not canonical merely because the app can connect to it. Promotion requires all of the following:

- repository migrations replay successfully in an isolated rehearsal;
- no unresolved table/type/function/policy collisions remain;
- Security Advisor has no blocking findings;
- RLS deny/allow tests pass for internal, client, project, finance, founder, and cross-tenant paths;
- generated TypeScript types match the promoted schema;
- production dependency audit passes;
- `test:db`, `test:rls`, `test:migrations`, `test:lineage`, and `test:parity` pass;
- Command, INC, Portal and Network build successfully;
- login/session resolution works against the target environment;
- runtime environment configuration contains no stale production project reference;
- exact-head CI and deployment preflight pass;
- production promotion is explicitly authorized and has rollback evidence.

## Current decision

Proceed with GitHub source decoupling and exact-head CI now. Keep KSPCENTER production DDL blocked until an isolated Supabase branch rehearsal is available and verified.
