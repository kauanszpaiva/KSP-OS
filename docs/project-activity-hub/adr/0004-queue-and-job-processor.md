# ADR 0004 — Queue and job-processor architecture

Status: **Proposed** (`12_OPEN_QUESTIONS_AND_DECISIONS.md` D1)
Date: 2026-07-23

## Context

No queue or background-job infrastructure exists in this repo today (`00_CURRENT_SYSTEM_AUDIT.md` §16; `background_jobs` table exists but is unused). The ingestion pipeline (`05_SYSTEM_ARCHITECTURE.md`) needs an asynchronous normalization step decoupled from the fast-ack webhook handler, with retry/backoff and dead-lettering.

## Decision

Start with a **plain polling table** approach: a Vercel Cron-triggered worker selects pending rows from `external_event_deliveries` with `for update skip locked`, processes them, and updates `processing_status`/`retry_count` directly on the table — no new Postgres extension, no new service. Revisit `pgmq` (a Postgres-native queue extension available on Supabase) if/when event volume outgrows the polling approach's simplicity, per the "Medium: up to 100 active projects" scale scenario in `11_COST_AND_PLAN_REQUIREMENTS.md`.

## Alternatives considered

- **`pgmq` from day one** — richer visibility-timeout/retry semantics, but a new dependency (requires the extension to be enabled on KSP's Supabase plan, unconfirmed) that isn't needed at KSP's current ("Small") scale.
- **An external queue service** (e.g., a managed message broker) — explicitly rejected: introduces a new vendor/service with its own connection string, monitoring surface, and cost, in direct conflict with `reference/AGENTS.md`'s "no new service without documented need."

## Advantages

Zero new dependencies for Phase 0–3; `for update skip locked` still provides safe concurrent processing across multiple worker invocations, so this is a genuine production-safe fallback, not a toy shortcut.

## Disadvantages

Cruder retry/backoff semantics than a purpose-built queue (manual `retry_count`/`next_retry_at` columns rather than native visibility-timeout); polling interval (bounded by Vercel Cron's minimum granularity) introduces slightly higher latency than a push-driven queue would.

## Security impact

None beyond the ingestion pipeline's existing RLS/permission model — the polling table is just another RLS-scoped table.

## Operational impact

One new scheduled job to monitor (`10_OPERATIONS_AND_RUNBOOKS.md` R5); no new service to monitor for uptime/health beyond what Vercel/Supabase already provide.

## Cost impact

None — uses infrastructure KSP already pays for.

## Reversibility

Fully reversible and additive — migrating to `pgmq` later means adding new queue-management code alongside the existing table-based worker, then cutting over; the underlying `external_event_deliveries` table remains the durable source of truth throughout either approach.
