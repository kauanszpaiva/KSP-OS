# 11 — Cost and Plan Requirements

Status: **Complete** (planning-only) · 2026-07-23

This document exists because the Activity Hub's *feasible* capability set is gated by which paid plan tiers KSP holds on each provider — several capabilities documented as "available" in `01_INTEGRATION_CAPABILITY_MATRIX.md` are plan-dependent, not universal. Every gate below gets a plain yes/no decision from Kauan in `12_OPEN_QUESTIONS_AND_DECISIONS.md`; this document only lays out what each choice costs and unlocks. No purchasing, upgrading, or provisioning happens as part of this planning pass.

## Plan-tier gates (from `01_INTEGRATION_CAPABILITY_MATRIX.md`, consolidated)

| Provider | Capability | Required tier | What's lost without it |
|---|---|---|---|
| Supabase | Platform Audit Logs (project-level admin actions: config changes, member changes) | Team tier and above | No visibility into non-database admin actions on the Supabase project itself — Auth Audit Logs (all tiers) still cover authentication events, and Database Webhooks/pgaudit (all tiers) still cover data-level and schema-level changes, so this gap is narrower than it first sounds (see `01` S3/S4) |
| Vercel | Webhooks (deployment/build events pushed to KSP rather than polled) | Pro or Enterprise (confirm exact gate at implementation time — `01` V2 marks this "plan-dependent, verify at build time") | Falls back to polling the Deployments API on a schedule — works, but with polling latency and higher outbound API call volume against Vercel's rate limits |
| Anthropic | Admin Usage/Cost API (organization-wide Claude API + Claude Code usage and spend, for cross-project cost attribution) | Requires an organization admin API key (a distinct credential from a regular API key, scoped to admin endpoints) | Falls back to per-session `total_cost_usd` figures only (available today, per-session, no admin key needed) — org-wide rollups and cross-project attribution require the admin key |
| OpenAI | Usage/Costs Admin API (same purpose, for Codex/ChatGPT-side spend) | Requires an organization admin API key | Same fallback shape as Anthropic — per-session/per-task cost where the Codex tooling exposes it, no org-wide rollup without the admin key |
| GitHub | GitHub App with organization-wide installation (vs. a personal PAT) | No paid tier requirement, but requires an org-owner action to install the App | A PAT works for a single user's repos but doesn't scale cleanly across KSP's client repos, doesn't give per-installation permission scoping, and ties the integration's identity to one person's account rather than an app identity — `01` G1 recommends the App approach specifically to avoid this |

None of these gates block the first vertical slice (`09_IMPLEMENTATION_ROADMAP.md`) — GitHub webhooks, Vercel polling-fallback, and per-session AI cost figures all work on KSP's presumed-current tiers. They gate specific **later-phase** capabilities (org-wide cost rollups, Supabase platform-level audit, real-time Vercel events instead of polling).

## Cost attribution model

Every cost figure the Hub displays is labeled with exactly one of these four provenances — never presented as an invoiced amount, per `07_UX_INFORMATION_ARCHITECTURE.md`:

1. **Provider-reported** — a number the provider's own API returned directly (e.g., a Claude Code session's `total_cost_usd`).
2. **Deterministically-calculated estimate** — computed from provider-reported unit data using a known, documented formula (e.g., token counts × published per-token pricing) but not returned as a single field by the provider itself.
3. **Approximate estimate** — a best-effort figure where the underlying unit data itself is incomplete or the pricing model has known uncertainty (e.g., prompt-caching discounts that are hard to reconstruct after the fact).
4. **Unknown** — the Hub explicitly has no cost data for this session/resource, shown as "—" or "cost data unavailable," never as `$0.00` (which would misrepresent a real, unmeasured cost as a zero one).

Cost figures cover: Claude API calls, Claude Code sessions, OpenAI API calls, Codex sessions (where exposed), Vercel usage (build minutes, bandwidth, function invocations — where accessible via API), Supabase usage (database size, egress — where accessible), and the Hub's own infrastructure cost (additional Postgres storage for the ledger, additional Vercel function invocations for ingestion/normalization/reporting, additional egress for polling calls). Cost visibility is **executive-only**, mirroring the existing Finance module's `canViewFinance` permission gate (`00_CURRENT_SYSTEM_AUDIT.md` §12) — no new permission concept invented.

## Scale scenarios

These size the operational and cost profile at three points, so Phase 0's architecture choices (queue vs. polling fallback, retention windows) can be made against KSP's actual current scale rather than a guess at eventual scale.

### Small — up to 10 active projects (KSP's current approximate scale)

- Estimated event volume: low tens of webhook events/day per active project during normal development, spiking during active sprints.
- Queue architecture: the plain polling-table fallback (`05_SYSTEM_ARCHITECTURE.md`) is sufficient — no `pgmq` needed yet.
- Supabase cost impact: additional table storage for `external_event_deliveries`/`project_activity_events`/etc. is negligible against a typical Supabase plan's included storage.
- Vercel cost impact: additional function invocations (ingest handler + Cron worker, e.g. once per minute) are well within typical plan invocation allowances.
- AI-session ingestion cost: dependent on actual Claude Code/Codex usage volume, which KSP already incurs independent of the Hub — the Hub only adds the marginal cost of *recording* sessions, not running them.
- Recommendation: this is the scenario to build Phase 0–3 against. Revisit before Phase 4/4b if project count meaningfully grows.

### Medium — up to 100 active projects

- Estimated event volume: high enough that polling-table contention (`for update skip locked`) starts to matter more, and the `pgmq` upgrade path (`adr/0004-queue-and-job-processor.md`) becomes worth revisiting.
- Vercel Cron frequency may need tightening (sub-1-minute polling isn't available on Cron alone at every plan tier — verify at that point) or a move to true webhook-driven processing wherever the plan tier allows it (reducing reliance on polling for Vercel/Supabase specifically).
- Report-generation load (weekly summaries across 100 projects) likely needs to move off a single synchronous request path, consistent with `05`'s async-processing principle — this should already be true by Phase 5 for the "large event set" performance case in `08_TEST_AND_VERIFICATION_PLAN.md`.
- Org-wide AI cost rollups (the Anthropic/OpenAI admin-key capability) become materially more valuable at this scale than at Small scale, where per-session figures are still easy to eyeball manually.

### Large — 100+ active projects / multi-tenant growth beyond KSP's own client base

- Out of scope for this planning pass's concrete recommendations — flagged only so the architecture doesn't foreclose it. The `pgmq`-or-external-queue decision, the normalized-ledger schema (`04_DATA_MODEL.md`), and the RLS-scoped-by-project data model all remain valid at this scale in principle; what would need fresh planning is retention-tier automation, cross-project reporting performance, and possibly a dedicated read-replica for reporting queries so they don't compete with ingestion writes. Not designed further here — a future planning pass, not a Phase 0–7 concern.

## What this document does not decide

Whether KSP upgrades any provider plan tier, purchases an Anthropic/OpenAI admin key, or installs a GitHub App organization-wide are all decisions for Kauan, carried into `12_OPEN_QUESTIONS_AND_DECISIONS.md`'s decision register with cost context attached. This document supplies the cost/capability trade-off; it does not make the call.
