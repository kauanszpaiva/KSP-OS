# 02 — Founder OS Architecture Decision

**Status:** Accepted (P0)
**Date:** 2026-08-13
**Supersedes:** none — first Founder OS ADR.

---

## Context

KSP Command needs a founder-only private operating layer ("Founder OS") inside the same product, auth system, repository, and database — strongly isolated from every non-founder. Kauan-Home is a read-only feature donor. See `01_BROWNFIELD_AUDIT.md` for the verified facts.

## Decision

**Add a `/founder` operating context inside the existing `apps/command` Next.js app** — a distinct shell and navigation rendered by a new route subtree, gated to the founder at every layer, backed by owner-isolated founder-private tables in the KSP Command Supabase database, reusing the existing `is_founder()` / `isFounder()` authorization primitives.

### Target architecture

```
apps/command  (one Next.js app, one auth, one DB)
├── app/(app)/*          Company OS — unchanged (Pulse, Focus, Commitments, …)
│     └── layout.tsx      company shell; founder-only nav item "Founder OS" → /founder
└── app/founder/*        Founder OS — NEW private context
      ├── layout.tsx      founder gate (isFounder → else redirect /pulse) + FounderShell
      ├── home/           private executive home (aggregate of real rows)
      ├── inbox/          universal private capture
      ├── work/           private tasks + read-only company commitments the founder owns
      └── vault/          existing founder_vault_entries, in the Founder OS shell
```

- **One SPA, one auth.** No second Next.js app, no iframe, no embedded Kauan-Home, no second Supabase project, no imported RBAC. The founder switches *context*, not application.
- **Context switch.** Company sidebar shows a founder-only "Founder OS" entry (`/founder`); the Founder shell shows a persistent "KSP Command" / "Company OS" switch back. Same design tokens (`@ksp/ui`), a distinct but sibling identity ("Private · Founder OS").
- **Data.** Two new owner-isolated tables (`founder_inbox_items`, `founder_tasks`) + an append-only promotion ledger (`founder_promotions`), plus reuse of `founder_vault_entries`. Company work is **referenced read-only** from `commitments`, never copied.

## Privacy boundary

The boundary is the pair **`owner_id = auth.uid()` AND `is_founder(organization_id)`**, enforced at four independent layers (navigation, routing, server action, RLS) — identical to the proven `founder_vault_entries` model. Founder-private tables are referenced by no other policy, so they are invisible to every company/client/team/search/analytics/AI surface by construction. See `04_SECURITY_MODEL.md`.

## Data ownership

- Founder-private rows are owned by the founder principal (`owner_id`) within the KSP org (`organization_id`). They are personal data held in the company DB under founder-only RLS.
- Company records (`commitments`, etc.) remain company-owned. The **only** bridge is explicit, audited, one-way **promotion** (private → company); after promotion the two records are independent.

## Authorization strategy

Reuse, do not rebuild:
- DB: `is_founder(org)` (SECURITY DEFINER, fixed search_path) + `owner_id = auth.uid()`.
- App: `@ksp/auth` `isFounder(ctx)` / `canViewFounderVault(ctx)`; `getAuthContext` resolves roles from `organization_memberships`.
- No email/UUID authorization anywhere. Deterministic UUIDs appear only in test fixtures.

## Migration strategy

Additive only. One new migration (`202608130002_founder_os_foundation.sql`) creating three tables + RLS. No existing table dropped, renamed, or altered. Verified by: static guards (`check-migrations`, `check-rls`, `check-secrets`), an ephemeral PG16 cluster (RLS matrix), and the full 19-migration chain applied on real Postgres with the seeded actor matrix. See `06_RELEASE_EVIDENCE.md`.

## Rollback strategy

The change is isolated to a new route subtree, one nav entry, one migration, and additive tests. Rollback = revert the branch (app) and `drop table founder_promotions, founder_tasks, founder_inbox_items` (DB). `founder_vault_entries` is untouched, so no data loss on rollback. Full procedure in `03_DATA_MIGRATION_PLAN.md`.

## Rejected alternatives

| Alternative | Why rejected |
| --- | --- |
| Embed Kauan-Home wholesale (second SPA / iframe) | Two auth systems, two DBs, brand fork — explicitly out of scope; violates "one product experience." |
| Point Founder OS at the Kauan-Home Supabase as its backend | Second company DB; founder runtime data must live in KSP Command DB. |
| Import Kauan-Home `principal`/`access_grant`/`step_up_pin` RBAC | KSP auth + `organization_memberships` is authoritative; a second RBAC is fragile and forbidden. |
| Reuse company `inbox_items` / `tasks` for founder-private data | Those are internal-member-readable → would leak founder-private content. Owner-isolated tables required. |
| Email/UUID gate (`if user == kauan`) | Brittle, forbidden; `is_founder` role capability is the correct primitive. |
| Auto-promote captures into company records | Violates the explicit one-way promotion rule; private data must never auto-cross the boundary. |
| Build Money/Assets/Network/etc. now | Cannot be done correctly without more evidence (finance isolation, ownership evidence status); deferred to P1–P3 and labeled honestly. |

## Consequences

- P0 ships a real, isolation-proven vertical slice (Home, Inbox, My Work, Vault) with promotion scaffolding.
- Later domains attach to the same shell + RLS pattern without re-litigating auth.
- The founder gains a private context; the team's experience is unchanged.
