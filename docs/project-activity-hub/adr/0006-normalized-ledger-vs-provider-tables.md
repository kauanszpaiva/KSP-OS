# ADR 0006 — Single normalized ledger vs. provider-specific tables

Status: **Proposed**
Date: 2026-07-23

## Context

The data model (`04_DATA_MODEL.md`) needs to decide whether GitHub events, Vercel events, Supabase events, and AI-session events each get their own dedicated table, or whether all providers write into one shared, normalized `project_activity_events` table.

## Decision

A **single normalized `project_activity_events` table**, using the canonical taxonomy (ADR 0005) and reusing the repo's existing `object_table`/`object_id` polymorphic-reference pattern (already used by `comments`/`notifications`/`client_publications`, per `00_CURRENT_SYSTEM_AUDIT.md`) for linking back to provider-specific detail where needed. Provider-specific structured detail that doesn't fit the canonical shape stays in the event's `metadata` jsonb column rather than a separate table.

## Alternatives considered

- **One table per provider** (`github_events`, `vercel_events`, `supabase_events`, `ai_session_events`). Rejected as the primary ledger: the Activity screen's entire purpose is a *unified* cross-provider timeline — a per-provider-table design would require a union query (or a view) to reconstruct that timeline anyway, so the "simplicity" of separate tables is illusory once the actual product requirement (unified timeline) is accounted for. It also multiplies the RLS-policy surface (one set of project-scoped policies per table instead of one).
- **A fully generic EAV (entity-attribute-value) event store with no fixed columns at all.** Rejected: loses queryability/indexability for the fields that matter most (project, actor, timestamp, event family) for no benefit over a normalized table with a flexible `metadata` column.

## Advantages

One table to secure with RLS, one table to index for the Activity screen's filters (`07`'s filter list), one place the correlation engine reads from and writes relationships against.

## Disadvantages

A single wide table needs careful indexing (`04`'s indexing strategy) to keep the "large timeline" and "complex filters" performance tests (`08`) passing as volume grows; provider-specific fields that don't map cleanly to the canonical shape live in `metadata` jsonb, which is less strongly typed than a dedicated column would be.

## Security impact

Simpler RLS surface (one policy set, well-tested, rather than N policy sets that could each independently develop the "RLS enabled, no policy" gap this rebuild has already found 7 times elsewhere in the repo).

## Operational impact

None beyond normal table growth management (retention policy, ADR 0003).

## Cost impact

None.

## Reversibility

Moderately reversible — splitting the table later (if a specific provider's volume or query pattern genuinely demands it) is a data migration, not a full redesign, since the canonical shape and RLS model would carry over unchanged.
