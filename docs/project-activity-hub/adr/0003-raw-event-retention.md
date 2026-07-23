# ADR 0003 — Raw-delivery payload retention policy

Status: **Proposed** (exact durations pending Kauan's decision — `12_OPEN_QUESTIONS_AND_DECISIONS.md` D5)
Date: 2026-07-23

## Context

`external_event_deliveries` stores a redacted raw payload (`04_DATA_MODEL.md` 04.2) for every ingested delivery. Keeping it indefinitely maximizes forensic/debugging value but grows storage and expands the data-minimization surface (`06_SECURITY_PRIVACY_AND_TRUST.md`). Deleting it immediately after normalization loses the ability to re-normalize (e.g., after a normalization-logic bug fix) or investigate a dispute.

## Decision

Retain redacted raw payloads for a bounded window (recommended default: 90 days), after which a scheduled job purges the raw payload column while leaving the normalized `project_activity_events` row (which has its own, longer/indefinite retention, since it's the append-only ledger the whole product is built around) untouched. The exact window is Kauan's call, not fixed by this ADR.

## Alternatives considered

- **Indefinite raw retention** — maximizes debugging value, at odds with data-minimization and with `06`'s retention-matrix principle that raw provider payloads shouldn't outlive their operational usefulness.
- **Immediate deletion after normalization** — minimizes storage/exposure, but forecloses re-normalization after a bug fix and removes forensic value during exactly the kind of incident (`10_OPERATIONS_AND_RUNBOOKS.md` R9/R10) where the raw payload matters most.

## Advantages

Bounded window balances both concerns; the purge job itself becomes a testable, observable process (`10`'s "retention cleanup" performance test and metric).

## Disadvantages

Requires a scheduled job and its own failure-handling (a failed purge run shouldn't silently never retry, nor should it block live ingestion — `08`'s performance test explicitly covers this).

## Security impact

Directly reduces the amount of raw third-party content (which may include client-sensitive commit messages, PR descriptions, etc.) sitting in storage at any given time — a core mitigation in `06`'s threat table.

## Operational impact

One new scheduled job (reuses the same Vercel Cron mechanism as the normalization worker, no new infrastructure).

## Cost impact

Reduces long-term storage cost relative to indefinite retention; negligible compute cost for the purge job itself.

## Reversibility

The retention window is a configuration value, trivially adjustable. Not reversible in one specific sense: once a raw payload is purged, it cannot be recovered — this is why the *normalized* event (the ledger's actual source of truth) is retained separately and indefinitely.
