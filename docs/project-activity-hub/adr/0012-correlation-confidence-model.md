# ADR 0012 — Correlation confidence model

Status: **Proposed** (`12_OPEN_QUESTIONS_AND_DECISIONS.md` D8)
Date: 2026-07-23

## Context

`03_CORRELATION_AND_PROVENANCE.md` defines three correlation levels: Level 1 (explicit — a task ID or session ID directly present), Level 2 (deterministic — exact commit SHA or provider-ID match), Level 3 (inferred — timestamp/actor/title/file similarity, scored and explained, never auto-promoted). The question this ADR settles is how that model is represented and enforced at the data layer.

## Decision

Level 1 and Level 2 relationships are stored as plain facts in `activity_event_relationships` with no confidence score field populated (they are not inferences — they either match or they don't). Level 3 relationships require a non-null confidence score **and** a non-null human-readable explanation, enforced by a database check constraint (`04_DATA_MODEL.md`) — the schema itself makes it impossible to store an unexplained inference. Level 3 relationships are never auto-promoted to Level 1/2 status regardless of how high their confidence score is, and are never used as sole evidence for task-completion gating (`07_UX_INFORMATION_ARCHITECTURE.md`'s evidence model).

## Alternatives considered

- **A single unified confidence score for all levels (including 1 and 2).** Rejected: would blur the meaningful distinction between "this is a fact" and "this is a guess," undermining the entire point of the 3-level model, which exists specifically so a Level 3 suggestion is never mistaken for a proven fact.
- **No database-level enforcement of the explanation requirement (rely on application code only).** Rejected: application-level-only enforcement is exactly the kind of guarantee that erodes over time as new code paths are added — a check constraint makes the invariant structurally impossible to violate, not just conventionally followed.

## Advantages

The database schema itself is the source of truth for "was this explained," not a code convention that could silently lapse.

## Disadvantages

The exact numeric threshold for *surfacing* a Level 3 suggestion in the UI (as opposed to storing it) is left to implementation-time tuning (D8) rather than fixed here — a deliberate scope boundary between "how correlation is modeled" (this ADR) and "how aggressively it's shown" (a UX tuning parameter).

## Security impact

Prevents a specific failure mode from `06_SECURITY_PRIVACY_AND_TRUST.md`'s threat table: an unexplained, overconfident inference being mistaken for verified fact in a report or evidence gate.

## Operational impact

None beyond normal schema maintenance.

## Cost impact

None.

## Reversibility

The check constraint could be relaxed later via a migration if the model proves too strict in practice, but loosening a safety constraint of this kind should itself require the same scrutiny as any other RLS/invariant change per `reference/AGENTS.md`.
