# ADR 0015 — First vertical slice scope

Status: **Proposed** (pilot project selection pending Kauan — `12_OPEN_QUESTIONS_AND_DECISIONS.md` D11)
Date: 2026-07-23

## Context

`09_IMPLEMENTATION_ROADMAP.md` specifies a first vertical slice to prove the full ingest→normalize→map→correlate→display→retry pipeline before committing to the full Phase 0–7 roadmap. This ADR records the scope boundary of that slice as an explicit architectural commitment, not just a roadmap suggestion.

## Decision

The first vertical slice covers **exactly one project, one GitHub repository, and one Vercel project**, using KSP's existing task/commitment data, and proves: GitHub webhook ingestion, signature verification, raw persistence, async normalization, project mapping, Level 1/2 correlation (task-ID-in-branch-name and commit-SHA matching), the normalized ledger, and the Activity screen rendering real events with evidence links and correct retry/dead-letter behavior on a simulated failure. It explicitly **excludes** Supabase-ops ingestion, AI-session ingestion, Vercel webhook/polling (deferred to confirm whether the slice needs it or GitHub alone proves the pipeline), and any Phase 4+ capability.

## Alternatives considered

- **A broader slice covering all four provider categories (GitHub, Vercel, Supabase, AI sessions) at once.** Rejected: would delay the first proof point substantially and conflate multiple provider-integration risks (GitHub App setup, Vercel plan-tier gate, Supabase audit-mechanism choice, AI-session-adapter structural differences) into one deliverable, making it harder to isolate which part of the pipeline broke if something doesn't work as planned.
- **A slice with no real provider at all (synthetic/fixture data only).** Rejected: would not actually validate signature verification, real payload shapes, or real rate-limit behavior — the exact risks `01_INTEGRATION_CAPABILITY_MATRIX.md`'s UNKNOWNs are most concerned with.

## Advantages

Narrow enough to deliver quickly and cheaply; broad enough (a real GitHub repo, real webhooks, real signature verification, real correlation, real UI) to genuinely retire the pipeline's biggest architectural risks before further investment.

## Disadvantages

Doesn't validate Vercel/Supabase/AI-session-specific integration code until later phases — a real gap, but a deliberate one, sequenced rather than skipped.

## Security impact

Validates the signature-verification and RLS-scoping model end-to-end on real (not synthetic) traffic before it's extended to additional providers.

## Operational impact

Small enough in scope that a failure in the slice is easy to diagnose against a single provider/pipeline path, rather than debugging four integration surfaces simultaneously.

## Cost impact

Minimal — no plan-tier upgrades required (GitHub webhooks have no plan gate).

## Reversibility

N/A as a "decision to reverse" — this is a scoping choice for a one-time proof-of-concept slice, not a standing architectural commitment; its outputs (the ingestion/normalization/correlation code) carry forward into Phase 1+ regardless.
