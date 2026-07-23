# ADR 0014 — Report-generation architecture

Status: **Proposed**
Date: 2026-07-23

## Context

`07_UX_INFORMATION_ARCHITECTURE.md` specifies AI-generated weekly/release/incident reports that must separate facts, calculated values, inferences, and unknowns, and must cite `source_event_ids` for every claim (04.14, and the "summary grounding" test in `08_TEST_AND_VERIFICATION_PLAN.md`). Report generation over a large event set risks timing out a synchronous Vercel function.

## Decision

Report generation is an **asynchronous, queued job** (using the same worker mechanism as ADR 0004, not a new one): a request enqueues a report-generation task, the worker queries normalized events (RLS-scoped, same permission filters as live queries), computes deterministic metrics, generates the AI narrative with mandatory `source_event_ids` grounding, and writes a draft report row for human review before publish — never a synchronous request/response cycle for anything beyond a trivially small date range/project.

## Alternatives considered

- **Synchronous generation on request.** Rejected: risks Vercel function timeouts at any meaningful event volume (`08`'s "weekly summary over a large event set" performance test exists specifically to catch this), and provides no natural place to insert the mandatory human-review step before publish.
- **A dedicated report-generation microservice.** Rejected: a new service with no documented need beyond what the existing async-worker pattern already provides — same "no new service" governance rule as ADR 0004.

## Advantages

Reuses existing infrastructure (ADR 0004's worker mechanism); naturally accommodates the human-review-before-publish workflow step `07` requires; avoids timeout risk entirely by design rather than by tuning.

## Disadvantages

Reports are not instant — a user requests a report and receives it shortly after, not synchronously. Acceptable given reports are a periodic/retrospective artifact, not a live-interaction feature.

## Security impact

Report generation respects the same RLS/permission scoping as live queries (`08`'s "unauthorized data export" security test) — no export bypass introduced by moving generation off the request path.

## Operational impact

Adds report-generation jobs to the same backlog/dead-letter monitoring as event normalization (`10_OPERATIONS_AND_RUNBOOKS.md`) — no separate monitoring surface.

## Cost impact

None beyond the compute cost of the AI narrative generation itself (an LLM call), which is inherent to the feature regardless of synchronous-vs-async architecture.

## Reversibility

Reversible — the async job could later be given its own dedicated worker path distinct from event normalization if load patterns ever justify separating them, without changing the report schema or the review-before-publish workflow.
