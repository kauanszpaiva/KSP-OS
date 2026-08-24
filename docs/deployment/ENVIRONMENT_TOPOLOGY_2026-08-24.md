# KSP OS Environment Topology — 2026-08-24

## Purpose

Capture the currently observable GitHub, Vercel, and Supabase environment topology before any staging database creation or production DDL.

## GitHub

- Repository: `kauanszpaiva/KSP-OS`
- Production branch: `main`
- Main commit observed after PR #118 merge: `2041aae67e946bd3c266df72bc2754fad523ddbf`
- Active lineage branch: `fix/p0-lineage-classification`
- No branch named `staging` was found.
- No branch named `develop` was found.
- No branch named `preview` was found.

GitHub feature/PR branches are therefore the current source of Vercel Preview deployments; there is no dedicated Git staging branch.

## Vercel

The GitHub Vercel bot for PR #120 confirms three active Preview deployments, all reported Ready:

| Surface | Vercel project | Project ID | Root directory | PR #120 Preview |
| --- | --- | --- | --- | --- |
| Command | `ksp-os-command` | `prj_Ajm8CXfHQEdsC6LtMN6gayR9mi7r` | `apps/command` | `https://ksp-os-command-git-fix-p0-lineage-cla-bd8ce5-ksp-dominion-group.vercel.app` |
| Portal | `ksp-os-portal` | `prj_nn06qnwA5kFwq0y2UBF74xcdK2TP` | `apps/portal` | `https://ksp-os-portal-git-fix-p0-lineage-clas-a6d562-ksp-dominion-group.vercel.app` |
| Network | `kspnetwork` | `prj_fJtKOFCzofQPvkop1QDGr8qiZyXq` | `apps/network` | `https://kspnetwork-git-fix-p0-lineage-classification-ksp-dominion-group.vercel.app` |

The connected Vercel team is `ksp-dominion-group` (`team_8ywOglpfLhAvtIzGNRmAAPhg`). The direct Vercel connector currently cannot enumerate these projects: team project listing returns no projects, direct project lookup returns 404 for known IDs, and deployment listing returns 403. This is a connector/API permission mismatch, not evidence that the projects are absent, because the GitHub Vercel integration is actively deploying them.

The repository's older Vercel documentation is stale: it describes two projects named `ksp-command-os` and `ksp-client-portal`, while current deployment evidence shows three projects named `ksp-os-command`, `ksp-os-portal`, and `kspnetwork`.

## Supabase

- Production project: `appkspos`
- Project ref: `tqwnsxjrlomosfblleqy`
- Organization: `knbfinjubtemqhoiocvj`
- Current branch inventory: only the default branch `main`.
- No non-default Supabase Development Branch / staging database is currently present.

## Critical interpretation

A Vercel Preview already exists for every KSP OS surface, but that is not the same as a complete staging environment. The repository's intended promotion path is:

`Pull Request -> Vercel Preview -> Staging Supabase -> Production approval -> Production Supabase`

At the time of this capture, the Vercel Preview layer exists and the Staging Supabase layer does not.

The available Vercel access does not expose Preview environment-variable values, so the exact `NEXT_PUBLIC_SUPABASE_URL` target used by these previews is not yet proven. Do not assume the previews are safely isolated from production until that target is verified.

## Release gate

- Do not apply Business Units or Partner Operations DDL to production.
- Do not treat a Vercel Preview as database staging.
- Before database rollout, verify Preview environment variables point to a non-production Supabase target, replay canonical migrations in an isolated Supabase Development Branch, and execute positive/negative RLS persona tests there.
