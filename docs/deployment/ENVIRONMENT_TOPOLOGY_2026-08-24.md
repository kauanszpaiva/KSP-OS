# KSP OS Environment Topology — 2026-08-24

## Purpose

Capture the currently observable GitHub, Vercel, and Supabase environment topology during the P0 reconciliation. This document is evidence, not authorization to promote production database DDL.

## GitHub

- Repository: `kauanszpaiva/KSP-OS`
- Production branch: `main`
- Main commit observed after PR #125 merge: `588b360637e7e1d5103bf17ba072772edb882928`
- `main` is still unprotected. Issue #119 tracks required branch protection and required CI contexts.
- Feature/PR branches remain the source of Vercel Preview deployments; there is no dedicated Git `staging` branch.

## Vercel

The GitHub Vercel integration confirms three Preview deployment projects:

| Surface | Vercel project | Project ID | Root directory |
| --- | --- | --- | --- |
| Command | `ksp-os-command` | `prj_Ajm8CXfHQEdsC6LtMN6gayR9mi7r` | `apps/command` |
| Portal | `ksp-os-portal` | `prj_nn06qnwA5kFwq0y2UBF74xcdK2TP` | `apps/portal` |
| Network | `kspnetwork` | `prj_fJtKOFCzofQPvkop1QDGr8qiZyXq` | `apps/network` |

The connected Vercel team is `ksp-dominion-group` (`team_8ywOglpfLhAvtIzGNRmAAPhg`). Direct Vercel API access available to this audit still cannot read the Preview environment-variable values. Therefore the exact `NEXT_PUBLIC_SUPABASE_URL` used by each Preview is not yet proven.

A Vercel Preview must not be treated as an isolated staging environment until its Supabase binding is verified.

## Supabase production

- Project: `appkspos`
- Project ref: `tqwnsxjrlomosfblleqy`
- Organization: `knbfinjubtemqhoiocvj`
- Status observed: `ACTIVE_HEALTHY`
- Production Business Units / Partner Operations DDL is still blocked.
- Seven July repository migrations whose live versions were recorded under August timestamps have now been classified as `normalized_sql_equivalent`; see `LIVE_MIGRATION_REMAPS_2026-08-24.json`.
- Four acknowledged live-only Portfolio OS migrations and the duplicate `client_media_workspace` history remain part of the unresolved lineage classification.

Production runtime hardening completed without database DDL:

- `ksp-provision-bruno-once` is inert, JWT-protected, and now source-controlled.
- `ksp-portal-synthetic-setup` was a consumed BEZ TEAM one-time activation flow. The Portal activation route/UI was retired in PR #125 and production Edge Function version 3 now returns HTTP 410 `activation_retired` with JWT verification enabled.

## Supabase staging

A paid Supabase Development Branch now exists and is the isolated database rehearsal target:

- Staging project ref: `yszxtinabzamsayfkymq`
- Production data was not copied into the branch.
- Canonical repository replay is currently **partial**, not complete.
- Business Units foundation, Partner Operations foundation, Business Unit brand alignment, and function-security hardening were applied to staging only.
- Positive and negative behavioral checks passed for business-unit isolation, cross-unit denial, global executive access, future grants, revocation, cross-organization classification, partner isolation, cross-partner denial, cross-vertical denial, partner offboarding, and the approval-decision trigger after direct RPC revocation.

Do not merge the Supabase Development Branch into production. The branch is evidence/rehearsal infrastructure until the remaining lineage and environment gates close.

## Promotion path

The intended promotion path is:

`Pull Request -> Vercel Preview -> isolated Supabase staging -> lineage/RLS/security evidence -> production approval -> production runtime/database`

The application Preview and isolated database staging layers both exist now, but their binding to one another is not yet proven through the available Vercel API access.

## Remaining release gates

- Classify the four acknowledged live-only Portfolio OS migrations and the duplicate `client_media_workspace` lineage anomaly.
- Verify Vercel Preview environment variables target the staging Supabase project before using Preview as a full-stack rehearsal.
- Complete the canonical staging replay through the full repository migration chain or document an approved equivalent forward plan.
- Classify remaining authenticated `SECURITY DEFINER` functions before changing execution grants.
- Enable leaked-password protection through Supabase Auth configuration when an authorized configuration path is available.
- Protect GitHub `main` and require the canonical CI contexts; issue #119 tracks this because the current connector has no branch-protection/ruleset mutation action.
- Keep production Business Units, Partner Operations, and staging security-hardening DDL blocked until these gates are closed.
