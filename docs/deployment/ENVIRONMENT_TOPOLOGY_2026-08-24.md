# KSP OS Environment Topology — 2026-08-24

## Purpose

Capture the currently observable GitHub, Vercel, and Supabase environment topology during the P0 reconciliation. This document is evidence, not authorization to promote production database DDL.

## GitHub

- Repository: `kauanszpaiva/KSP-OS`
- Production branch: `main`
- Main commit observed after PR #127 merge: `cce20704218805429d2446af50ba0ff55157ded5`
- `main` is still unprotected. Issue #119 tracks required branch protection and required CI contexts.
- Feature/PR branches remain the source of Vercel Preview deployments; there is no dedicated Git `staging` branch.

## Vercel

The GitHub Vercel integration confirms three Preview deployment projects:

| Surface | Vercel project | Project ID | Root directory |
| --- | --- | --- | --- |
| Command | `ksp-os-command` | `prj_Ajm8CXfHQEdsC6LtMN6gayR9mi7r` | `apps/command` |
| Portal | `ksp-os-portal` | `prj_nn06qnwA5kFwq0y2UBF74xcdK2TP` | `apps/portal` |
| Network | `kspnetwork` | `prj_fJtKOFCzofQPvkop1QDGr8qiZyXq` | `apps/network` |

The connected Vercel team is `ksp-dominion-group` (`team_8ywOglpfLhAvtIzGNRmAAPhg`). Direct Vercel API access still cannot read Preview environment-variable values, so PR #128 removed that ambiguity in source: all three Next.js apps overwrite the public Supabase URL/key with the isolated staging project whenever `VERCEL_ENV=preview`. Vercel then built all three PR #128 Preview deployments successfully as `Ready`.

Preview-to-staging binding is therefore source-enforced for Command, Portal, and Network. Production behavior is unchanged.

## Supabase production

- Project: `appkspos`
- Project ref: `tqwnsxjrlomosfblleqy`
- Organization: `knbfinjubtemqhoiocvj`
- Status observed: `ACTIVE_HEALTHY`
- Production Business Units / Partner Operations DDL is still blocked.
- Seven July repository migrations whose live versions were recorded under August timestamps are classified as `normalized_sql_equivalent`; see `LIVE_MIGRATION_REMAPS_2026-08-24.json`.
- Four live-only Portfolio OS migrations are classified `live_only_legacy_preserve` because the isolated legacy subsystem has live rows and no current repository runtime references; see `LIVE_ONLY_LINEAGE_CLASSIFICATION_2026-08-24.json`.
- Both live `client_media_workspace` migration rows are preserved. They and the repository migration are punctuation-normalized SQL-equivalent; production migration history is not rewritten.
- Production authenticated `SECURITY DEFINER` functions are now caller-classified in `SECURITY_DEFINER_CLASSIFICATION_2026-08-24.json`. Trigger-only/anonymous-unnecessary grants remain production changes gated behind the remaining DDL release gates.

Production runtime hardening completed without database DDL:

- `ksp-provision-bruno-once` is inert, JWT-protected, and source-controlled.
- `ksp-portal-synthetic-setup` was a consumed BEZ TEAM one-time activation flow. The Portal activation route/UI was retired in PR #125 and production Edge Function version 3 returns HTTP 410 `activation_retired` with JWT verification enabled.

## Supabase staging

A paid Supabase Development Branch exists and is the isolated database rehearsal target:

- Staging project ref: `yszxtinabzamsayfkymq`
- Production data was not copied into the branch.
- Canonical repository replay is currently **partial**, not complete.
- Business Units foundation, Partner Operations foundation, Business Unit brand alignment, and function-security hardening were applied to staging only.
- Positive and negative behavioral checks passed for business-unit isolation, cross-unit denial, global executive access, future grants, revocation, cross-organization classification, partner isolation, cross-partner denial, cross-vertical denial, partner offboarding, and the approval-decision trigger after direct RPC revocation.

Do not merge the Supabase Development Branch into production. The branch is evidence/rehearsal infrastructure until the remaining release gates close.

## Promotion path

The intended promotion path is:

`Pull Request -> Vercel Preview -> isolated Supabase staging -> lineage/RLS/security evidence -> production approval -> production runtime/database`

The application Preview and isolated database staging layers now exist and are source-bound to one another for all three app surfaces.

## Remaining release gates

- Complete the canonical staging replay through the full repository migration chain or document an approved equivalent forward plan.
- Protect GitHub `main` and require the canonical CI contexts; issue #119 tracks this because the current connector has no branch-protection/ruleset mutation action.
- Enable leaked-password protection through Supabase Auth configuration when an authorized configuration path is available. This is a security hardening item but is not used to manufacture migration-lineage parity.
- Keep production Business Units, Partner Operations, and staged database-security DDL blocked until the two production DDL release gates above are closed.
