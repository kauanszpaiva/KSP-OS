# ADR 0009 — Dual-write to domain audit tables vs. Hub-ledger-only

Status: **Proposed** (`12_OPEN_QUESTIONS_AND_DECISIONS.md` D9)
Date: 2026-07-23

## Context

KSP OS already has a working domain-level audit pattern: every mutation in `apps/command/app/(app)/actions.ts` dual-writes to `activity_events`/`audit_events` via a shared `record()` helper (`00_CURRENT_SYSTEM_AUDIT.md` §11). The Activity Hub introduces its own high-volume ledger (`project_activity_events`) for *external* provider events. The question is whether Hub-side actions taken by a KSP user (connecting an integration, creating a project mapping, resolving a dead-lettered event) should also dual-write to the existing domain audit tables, and whether external provider events themselves should.

## Decision

**Dual-write for human-initiated Hub actions; single-write (Hub ledger only) for high-volume external provider events.** A KSP user connecting/disconnecting an integration, editing a mapping, or manually reprocessing a dead-lettered event is exactly the kind of discrete, human-attributable action the existing `record()` pattern already exists for — reuse it. A GitHub push webhook is not a KSP-user action and doesn't belong in `activity_events`/`audit_events`, whose entire existing usage pattern is "a KSP user did X" — it belongs solely in the Hub's own ledger.

## Alternatives considered

- **Dual-write everything, including every external event.** Rejected: would bloat the existing domain-audit tables with high-volume, non-user-attributable rows, diluting their existing signal (every prior Command module's use of `activity_events` assumes "a person took a governed action").
- **Dual-write nothing — keep the Hub ledger fully separate even for human Hub actions.** Rejected: would create a second, inconsistent audit story for human actions specifically, undermining the "one place to look for what a person did" property the existing pattern provides.

## Advantages

Preserves the existing audit tables' meaning (human, governed actions) while giving the Hub its own fit-for-purpose high-volume ledger for external activity — the right tool for each kind of event.

## Disadvantages

Requires care at implementation time to correctly classify which Hub actions are "human enough" to dual-write — a boundary that could be drawn inconsistently without a clear rule (this ADR's rule: if a KSP user's own session/identity initiated it, dual-write; if a provider webhook initiated it, don't).

## Security impact

Keeps the existing audit-integrity guarantees (append-only, no update/delete path, per `00`'s findings) intact and undiluted.

## Operational impact

None beyond reusing an existing, already-tested pattern.

## Cost impact

None.

## Reversibility

Fully reversible — which event types dual-write is a code-level classification, not a schema commitment.
