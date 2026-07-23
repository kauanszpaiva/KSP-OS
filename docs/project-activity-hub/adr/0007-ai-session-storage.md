# ADR 0007 — AI agent session storage model

Status: **Proposed**
Date: 2026-07-23

## Context

Claude Code, Codex, and (indirectly, via MCP) ChatGPT sessions generate a stream of events (tool calls, file changes, commits) plus a final outcome (cost, result, linked commit/PR). `01_INTEGRATION_CAPABILITY_MATRIX.md` documents structural differences between Claude Code (hooks, resumable sessions, per-session cost) and Codex (CLI JSON stream, TypeScript-only SDK, no hook/interception mechanism) that the storage model must accommodate without forcing a false uniformity.

## Decision

A dedicated `ai_agent_sessions` table (session-level: provider, agent, model, objective, initiating user, task link, status, cost, `sanitized_summary`) plus a dedicated `ai_agent_session_events` table (event-level stream within a session), separate from — but feeding into — the shared `project_activity_events` ledger via summary events (`ai_session.completed`, etc., per the canonical taxonomy). This is distinct from ADR 0006's "no provider-specific tables" for *raw provider webhook data* specifically because AI sessions have a genuinely different shape (a session *and* its internal event stream, not a single discrete webhook payload) that warrants its own two-table structure, feeding the shared ledger rather than living entirely inside it.

## Alternatives considered

- **Force AI session events directly into `project_activity_events` as individual rows.** Rejected: a single session can contain many fine-grained internal events (tool calls, file edits) that are useful for the AI Sessions detail view (`07`) but would be excessive noise on the main cross-provider Activity timeline if each one became its own ledger row.
- **Store nothing but the final outcome, discard the event stream entirely.** Rejected: loses the detail-view timeline `07` specifies, and loses debugging value for R7 (stuck-session runbook, `10_OPERATIONS_AND_RUNBOOKS.md`).

## Advantages

Matches the actual shape of the data (session + stream) without distorting the shared ledger's granularity; keeps the Claude-Code-vs-Codex structural differences contained to this table pair rather than leaking into the canonical taxonomy.

## Disadvantages

Two additional tables (plus their RLS policies) beyond the shared ledger — more schema surface than a single-table approach, justified by the genuine shape mismatch.

## Security impact

Session/event content may include client-sensitive material pasted into prompts — governed by ADR 0008 (transcript retention) and the executive-only cost-visibility gate (`07`'s cost-attribution section).

## Operational impact

Feeds R7 (stuck-session recovery) and the AI-session metrics in `10`.

## Cost impact

Storage cost proportional to AI usage volume, which KSP already incurs independent of the Hub — the Hub only adds the marginal cost of recording it.

## Reversibility

Reversible — the two-table structure could be collapsed or restructured later without affecting the shared ledger's own schema, since the connection is a summary-event feed, not a foreign-key dependency in the other direction.
