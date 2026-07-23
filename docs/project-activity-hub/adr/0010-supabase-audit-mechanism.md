# ADR 0010 — Supabase audit mechanism selection

Status: **Proposed** (`12_OPEN_QUESTIONS_AND_DECISIONS.md` D4)
Date: 2026-07-23

## Context

Supabase offers several overlapping mechanisms for observing database/project activity (`01_INTEGRATION_CAPABILITY_MATRIX.md` S3–S12): Auth Audit Logs (all tiers, Postgres-native), Database Webhooks (all tiers, `pg_net`-based), pgaudit (all tiers, object-mode recommended over global), Platform Audit Logs (Team tier and above), and Log Drains (paid add-on, currently unsigned payloads).

## Decision

Start with **Auth Audit Logs + Database Webhooks + object-mode pgaudit**, all available on KSP's current tier with no upgrade required. Treat **Platform Audit Logs** (Team-tier gated) as an optional future enhancement for project-admin-level visibility (config/member changes) rather than a Phase 3 dependency. Do not adopt Log Drains at this time, given the unsigned-payload gap noted in `01`.

## Alternatives considered

- **Wait for Platform Audit Logs (upgrade to Team tier first).** Rejected as the Phase 3 baseline: would gate the entire Database screen (`07_UX_INFORMATION_ARCHITECTURE.md`) on a plan upgrade decision that hasn't been made, when Auth Audit Logs + Database Webhooks + pgaudit already cover the data-level and auth-level events that matter most for the first vertical slice and beyond.
- **Adopt Log Drains for a unified log stream.** Rejected for now: the unsigned-payload characteristic means an extra verification burden (or accepted risk) this plan isn't prepared to take on without a clearer need.

## Advantages

Zero plan-tier cost to start; covers the two event categories (auth events, data/schema changes) most directly relevant to the Database screen and to correlating migrations with deployments.

## Disadvantages

Genuine gap: project-admin-level actions (e.g., a Supabase project setting changed outside of a migration) aren't visible without Platform Audit Logs. This gap is disclosed, not hidden, in `01`'s S3/S4 rows and `11_COST_AND_PLAN_REQUIREMENTS.md`.

## Security impact

Object-mode pgaudit (rather than global) keeps audit-log volume focused on the tables that matter, avoiding an unmanageable log volume that would itself become a monitoring burden.

## Operational impact

Feeds the Database screen (`07`) and the Migration→Deployment correlation e2e test (`08_TEST_AND_VERIFICATION_PLAN.md`).

## Cost impact

None at this tier; upgrading to Team tier later for Platform Audit Logs is a recurring cost decision for Kauan (`11`).

## Reversibility

Fully reversible/additive — adopting Platform Audit Logs later supplements rather than replaces this mechanism.
