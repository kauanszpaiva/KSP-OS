# ADR 0008 — AI session prompt/transcript retention

Status: **Proposed** (`12_OPEN_QUESTIONS_AND_DECISIONS.md` D6)
Date: 2026-07-23

## Context

A Claude Code or Codex session's full transcript may contain client-sensitive content (pasted client data, internal business logic, credentials accidentally included in a prompt despite the repo's no-secrets rule). Retaining it indefinitely maximizes debugging/audit value but maximizes exposure; discarding it immediately loses the ability to investigate an incorrect-summary or stuck-session incident (`10_OPERATIONS_AND_RUNBOOKS.md` R7/R9).

## Decision

Retain the full raw transcript (`ai_agent_session_events`, ADR 0007) for a short, bounded window (recommended default: 30 days — shorter than the general raw-event window in ADR 0003, given the higher sensitivity of prompt content), after which only the `sanitized_summary` and outcome metadata (cost, status, linked commit/PR) persist long-term/indefinitely.

## Alternatives considered

- **Indefinite full-transcript retention.** Rejected as a default: unnecessarily widens the blast radius of any future data-leak incident (`10`'s R10 runbook) for content that is, by nature, some of the most sensitive material the Hub ever touches.
- **No transcript retention at all, summary-only from the start.** Rejected: removes the ability to investigate exactly the kind of dispute (R9, incorrect summary) the retention window exists to support — a summary that's wrong is hard to diagnose without the source transcript.

## Advantages

Bounded exposure window while preserving investigative value during the period it's most likely to be needed (shortly after the session, while an issue is still fresh).

## Disadvantages

Older incidents (beyond the retention window) cannot be re-investigated against the original transcript — only the summary remains.

## Security impact

Directly reduces standing exposure of the most sensitive category of content this system stores. Feeds the redaction and retention-classification tests in `08_TEST_AND_VERIFICATION_PLAN.md`.

## Operational impact

Requires the same purge-job pattern as ADR 0003, applied to a different table/window.

## Cost impact

Reduces long-term storage cost for what would otherwise be the largest and most sensitive payloads in the system.

## Reversibility

The window is configurable; once a transcript is purged it cannot be recovered, by design — this mirrors ADR 0003's reversibility profile.
