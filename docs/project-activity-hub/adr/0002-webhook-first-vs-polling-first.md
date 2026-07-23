# ADR 0002 — Webhook-first vs. polling-first ingestion strategy

Status: **Proposed**
Date: 2026-07-23

## Context

Each provider (GitHub, Vercel, Supabase) offers some mix of push-based webhooks and pull-based REST APIs (`01_INTEGRATION_CAPABILITY_MATRIX.md`). Webhooks give lower latency and lower outbound call volume; polling is universally available regardless of plan tier but adds latency and consumes rate-limit budget.

## Decision

**Webhook-first, per-provider, with a polling fallback where webhooks are unavailable or plan-gated.** Concretely: GitHub webhooks always (no plan gate); Vercel webhooks if the plan tier supports them (`12_OPEN_QUESTIONS_AND_DECISIONS.md` D3), else polling; Supabase via Database Webhooks (all tiers, `pg_net`-based) plus Auth Audit Logs, with Platform Audit Logs (Team+ tier) as an optional enhancement rather than a dependency.

## Alternatives considered

- **Polling-only for everything** — simpler (one code path), but discards GitHub's and (where available) Vercel's genuinely reliable low-latency webhook delivery for no benefit.
- **Webhook-only, no polling fallback** — would leave Vercel activity invisible entirely on plan tiers without webhook access, and would provide no backfill/reconciliation mechanism for missed deliveries.

## Advantages

Takes the best available mechanism per provider rather than forcing one uniform (and worse) mechanism across all three. Polling fallback also doubles as the backfill/reconciliation mechanism for webhook gaps (missed deliveries, outage recovery).

## Disadvantages

Two code paths (webhook handler + polling worker) to build and test per provider, rather than one. More surface area than a single uniform strategy.

## Security impact

Webhooks require signature verification (`06_SECURITY_PRIVACY_AND_TRUST.md`); polling requires securely stored API credentials with least-privilege scopes. Both paths are covered by the security test plan (`08_TEST_AND_VERIFICATION_PLAN.md`).

## Operational impact

Polling introduces rate-limit management (`05_SYSTEM_ARCHITECTURE.md`'s "respected on the outbound side too") that a pure webhook approach wouldn't need. Webhook paths introduce delivery-failure/redelivery handling (`10_OPERATIONS_AND_RUNBOOKS.md` R1) that pure polling wouldn't need.

## Cost impact

Polling adds outbound API call volume (counted against provider rate limits, not billed directly in most cases). Webhook plan-tier gates are covered in `11_COST_AND_PLAN_REQUIREMENTS.md`.

## Reversibility

Fully reversible per-provider — switching a given provider from polling to webhooks (once a plan upgrade lands) is an additive change, not a breaking one, since both paths feed the same `external_event_deliveries` table.
