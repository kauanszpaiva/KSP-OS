# ADR 0005 — Canonical event taxonomy and normalization model

Status: **Proposed**
Date: 2026-07-23

## Context

Each provider emits events in its own shape (GitHub webhook payloads, Vercel deployment events, Supabase Database Webhooks, AI-agent session events). Without a shared vocabulary, the Activity screen (`07_UX_INFORMATION_ARCHITECTURE.md`) and reports (`07`'s report section) would need provider-specific rendering logic scattered everywhere.

## Decision

Adopt a single **canonical event taxonomy** (23 families, `03_CORRELATION_AND_PROVENANCE.md`) that every provider's raw payload is normalized into, stored as one `project_activity_events` row per canonical event, with the original raw payload preserved separately and unmodified in `external_event_deliveries` for provenance.

## Alternatives considered

- **No normalization — render each provider's raw shape directly in the UI.** Rejected: would require every downstream consumer (Activity screen, reports, correlation engine, notifications) to understand every provider's native schema, and would make cross-provider correlation and reporting substantially harder to reason about and test.
- **Per-provider canonical schemas (no shared taxonomy across providers).** Rejected: would still require a second unification layer wherever cross-provider views are needed (the Activity timeline's entire purpose), just deferred rather than avoided.

## Advantages

One stable shape for every downstream consumer; new providers/event types are additive (new taxonomy families), not a rewrite of existing consumers; the raw payload's independent preservation means normalization bugs are always correctable and replayable, never a permanent data-loss risk.

## Disadvantages

Normalization logic is a real, nontrivial layer of code per provider/event-type pair that must be built, tested, and kept in sync as providers evolve their payload shapes (mitigated by `redacted_payload` being schema-flexible `jsonb`, per `05_SYSTEM_ARCHITECTURE.md`'s "schema evolution" note).

## Security impact

Normalization is also the layer where redaction (`06_SECURITY_PRIVACY_AND_TRUST.md`) and mass-assignment prevention (`08_TEST_AND_VERIFICATION_PLAN.md`'s security tests) are enforced — a single, auditable chokepoint rather than scattered logic.

## Operational impact

Normalization failures are visible and retryable (`10_OPERATIONS_AND_RUNBOOKS.md` R6), not silent.

## Cost impact

None beyond ordinary development effort.

## Reversibility

The taxonomy is additive by design (`12_OPEN_QUESTIONS_AND_DECISIONS.md` D10) — existing families are never renamed or removed, only extended, so this decision does not need to be "reversed," only evolved.
