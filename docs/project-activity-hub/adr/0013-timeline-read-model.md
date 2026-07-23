# ADR 0013 — Timeline query and read model

Status: **Proposed**
Date: 2026-07-23

## Context

The Activity screen (`07_UX_INFORMATION_ARCHITECTURE.md`) needs to render a potentially large, filterable, day-grouped timeline per project, scoped by RLS, with acceptable performance (`08_TEST_AND_VERIFICATION_PLAN.md`'s "large timeline" and "complex filters" performance tests).

## Decision

Query `project_activity_events` directly from Next.js Server Components with RLS doing the access-filtering (per the existing repo-wide convention — no app-level re-filtering, per `05_SYSTEM_ARCHITECTURE.md`'s "user-facing timeline query" diagram), using pagination/virtualization at the UI layer and the indexing strategy specified in `04_DATA_MODEL.md` (project + timestamp, project + event family, project + actor). No separate materialized read-model/projection table is introduced at this stage.

## Alternatives considered

- **A separate pre-aggregated/materialized read-model table, refreshed on write.** Rejected for the initial phases: adds write-path complexity (every ledger write would need to also update a projection) and a second table to keep RLS-consistent with the source table, for a performance benefit not yet proven necessary at KSP's current ("Small") scale (`11_COST_AND_PLAN_REQUIREMENTS.md`). Revisit if the "Medium" scale scenario's performance tests reveal the direct-query approach is insufficient.
- **Client-side filtering (fetch everything, filter in the browser).** Rejected: doesn't scale past a small event count, and would require sending potentially sensitive data to the client that RLS-scoped server-side filtering would otherwise keep server-side until needed.

## Advantages

Simplest correct approach; reuses the existing repo-wide RLS-scoped-server-component pattern with no new architectural concept.

## Disadvantages

At high event volume/complex filter combinations, direct queries may need query-plan tuning or, eventually, the materialized read-model alternative — deferred, not solved, by this ADR.

## Security impact

RLS remains the single source of truth for access control, with no parallel access-control logic to keep in sync (a materialized projection would need its own RLS or equivalent filtering, doubling the surface for the "RLS gap" failure mode this repo has repeatedly found).

## Operational impact

None beyond normal query performance monitoring.

## Cost impact

None additional — no new table/storage.

## Reversibility

Fully reversible — introducing a materialized read-model later is additive, not a breaking change to this decision.
