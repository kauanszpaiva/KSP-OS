# 10 — Operations and Runbooks

Status: **Complete** (planning-only) · 2026-07-23

This document is planning only. No dashboards, alerts, or log pipelines exist yet — it specifies what must be built when `05_SYSTEM_ARCHITECTURE.md`'s pipeline is implemented, and gives the on-call runbook text in advance so Phase 0 ships observability alongside ingestion rather than bolting it on later (a repeated lesson from this rebuild: instrumentation added after the fact is instrumentation that's missing exactly when the first incident happens).

## Observability principles

- **No new observability vendor.** `00_CURRENT_SYSTEM_AUDIT.md` §20 found zero APM/log-aggregation/error-tracking infra in the repo today (`packages/observability` is an empty `export {}` stub). This plan does **not** propose adding one — it proposes structured `console.log`/`console.error` JSON lines (Vercel's own log capture already ingests these) plus SQL-queryable status columns on the Hub's own tables, consistent with "no new service without documented need" (`reference/AGENTS.md`). If KSP later adopts a log-aggregation vendor for the whole platform, the Hub's structured fields (below) are already shaped to feed one — that's a separate future ADR, not a Hub-specific decision.
- **The ledger is its own dashboard.** Because `project_activity_events`, `external_event_deliveries`, and `dead_letter_events` are just Postgres tables, most "metrics" below are SQL queries against them, run either as saved views (Command's Ops Center screen, `07_UX_INFORMATION_ARCHITECTURE.md`) or ad hoc — not a separate metrics store.
- **Every runbook ends in a decision, not just a diagnosis.** Each one below states what a human does next, not only how to look.

## Metrics (queryable from existing/proposed tables — no new metrics infrastructure)

| Metric | Source | Why it matters |
|---|---|---|
| Ingestion ack latency (p50/p95/p99) | Vercel function duration logs on the ingest route | Validates the "sub-second ack" design goal (`05_SYSTEM_ARCHITECTURE.md`) |
| Deliveries by `processing_status` (pending/normalized/dead_lettered) | `external_event_deliveries` | Backlog visibility |
| Normalization latency (received_at → normalized_at) | `external_event_deliveries` | End-to-end freshness |
| Unmapped-event count and age | `external_event_deliveries where project_mapping_result = 'unmapped'` | Silent-drop prevention (`05` explicitly never drops unmapped events) |
| Dead-letter count and age | `dead_letter_events` | Recovery backlog |
| Duplicate/redelivery count | `external_event_deliveries` conflict-on-insert counter (`05`'s `redelivery_count`) | Provider redelivery-storm detection |
| Signature-failure count by provider | Security-event log (rejected before persistence, per `06_SECURITY_PRIVACY_AND_TRUST.md`) | Forged-webhook / misconfigured-secret detection |
| Correlation-level distribution (L1/L2/L3 share of new events) | `activity_event_relationships` | Health check on the correlation engine — a sudden drop in L1/L2 share signals a broken explicit-ID convention (e.g., a repo stopped putting task IDs in branch names) |
| Integration connection health | `integration_connections` (per `01_INTEGRATION_CAPABILITY_MATRIX.md`'s per-provider health fields) | Surfaces on Connections + Ops Center |
| AI session count / failure rate / awaiting-approval count | `ai_agent_sessions` | Phase 4/4b health |
| Cost-attribution completeness (% of sessions with a cost figure vs. unknown) | `ai_agent_sessions` | Flags provider cost-API gaps early rather than silently under-reporting |
| Queue/polling backlog depth and oldest-pending-age | `external_event_deliveries` (or `pgmq` metrics if adopted later) | Worker-health signal |
| Retention-purge job success/failure and rows purged | Scheduled job's own log line | Confirms `06`'s retention matrix is actually enforced, not just documented |

## Structured log fields (every ingestion/normalization/worker log line)

`timestamp`, `provider`, `event_type`, `external_event_delivery_id` (once known), `project_id` (once mapped, else `null`), `processing_status`, `retry_count`, `duration_ms`, `outcome` (`ok`/`rejected`/`error`/`dead_lettered`), `error_class` (never a raw stack trace with payload contents inline — per `06`'s redaction rule, log lines are subject to the same secret-shaped-pattern scrubbing as stored payloads). No payload body, no signature/secret value, no token value ever appears in a log line — this is a hard rule, testable via the `08_TEST_AND_VERIFICATION_PLAN.md` "log injection" and "provider-token leakage" security tests.

## Runbooks

Each runbook: **Symptom → Likely causes → Diagnosis steps → Resolution → Escalation**.

### R1 — GitHub/Vercel/Supabase events not arriving

- **Symptom**: no new rows in `external_event_deliveries` for a provider/project pair that should be active.
- **Likely causes**: webhook subscription removed/disabled at the provider; GitHub App uninstalled or permissions revoked; Vercel plan downgraded below the webhook-eligible tier (`01_INTEGRATION_CAPABILITY_MATRIX.md` V-series plan gate); DNS/deployment issue on the ingest endpoint itself; provider-side outage.
- **Diagnosis**: check `integration_connections.status` for the provider; check the provider's own webhook-delivery log (GitHub: repo Settings → Webhooks → Recent Deliveries; Vercel: project Settings → Webhooks) for delivery attempts and their response codes; check the ingest endpoint's own uptime/error rate.
- **Resolution**: reconnect/reinstall the integration if revoked; upgrade plan tier if gated (flag to Kauan — a cost decision, not an automatic action, per `11_COST_AND_PLAN_REQUIREMENTS.md`); redeploy the ingest endpoint if it's down; for a confirmed provider outage, no action — wait, and rely on GitHub's 3-day redelivery window (Vercel's redelivery guarantee is undocumented, treat as unreliable per `01`).
- **Escalation**: if the ingest endpoint itself is down, this is a KSP OS production incident (not Hub-specific) — follow whatever incident process the wider platform already uses, since no Hub-specific escalation exists.

### R2 — Invalid signature errors

- **Symptom**: a spike in signature-failure log entries for a provider.
- **Likely causes**: webhook secret rotated at the provider but not updated in KSP OS's environment variables (or vice versa); a genuine forged/malicious request; a proxy or CDN altering the raw request body before it reaches the handler (breaks signature verification even for legitimate traffic).
- **Diagnosis**: confirm whether the failures correlate with a known secret-rotation event; check whether failures are from the provider's known IP ranges (GitHub publishes theirs) or unexpected origins; confirm the raw body is reaching the handler unmodified (per `05`'s raw-body-preservation requirement).
- **Resolution**: if secret drift, resync the secret and confirm the next delivery verifies; if forged traffic, no data was persisted (by design — rejection happens before any write) and no further action is required beyond confirming that; if a proxy/CDN issue, fix the raw-body pass-through.
- **Escalation**: a sustained spike from unexpected origins with no secret-rotation explanation is a security event — treat as a suspected attack, notify Kauan, do not disable signature verification as a workaround under any circumstance.

### R3 — Duplicate events

- **Symptom**: the same logical event appears more than once on a project's Activity screen.
- **Likely causes**: the `unique(provider, provider_delivery_id)` constraint didn't fire because two different `provider_delivery_id` values were issued by the provider for what a human considers "the same" event (this is a provider-behavior question, not a bug in KSP's dedupe logic — some providers redeliver with a new ID rather than the same one under certain retry conditions); a genuine dedupe-logic defect.
- **Diagnosis**: check whether the two rows in `external_event_deliveries` have the same or different `provider_delivery_id`; if different, this is provider behavior, not a KSP defect.
- **Resolution**: if a real defect, fix and backfill (mark the duplicate normalized event as superseded, don't delete — append-only ledger); if provider behavior with genuinely distinct delivery IDs for a re-sent event, evaluate a provider-specific secondary dedupe key (e.g., GitHub's own event `id` field inside the payload, if distinct from the delivery ID) as a future refinement — document as a new open question rather than silently patching.
- **Escalation**: none — this is a normal data-quality fix, not a security or availability incident.

### R4 — Wrong-project mapping

- **Symptom**: events from a repository/Vercel project/Supabase project appear under the wrong KSP project, or a mapped project's events stop appearing.
- **Likely causes**: a `project_integration_mappings` row was misconfigured; a repository was renamed/transferred at the provider without the mapping being updated; two projects were both mapped to the same external resource (ambiguous mapping).
- **Diagnosis**: query `project_integration_mappings` for the external identifier in question; check for renames via the provider's own history/audit if available.
- **Resolution**: correct the mapping (an executive/project-manager-role action per `06`'s permission model); for historical events already normalized under the wrong project, this requires a manual data-correction pass — evaluated case by case, never an automated bulk-reassignment given the audit-integrity implications of moving events between RLS-scoped projects.
- **Escalation**: if the misassignment exposed one client's activity data to another client's project view, this is a data-isolation incident — see R9 (data-leak suspicion) immediately, don't treat it as a routine mapping fix.

### R5 — Queue/backlog growth

- **Symptom**: `external_event_deliveries` pending count and oldest-pending-age both climbing.
- **Likely causes**: the Vercel Cron worker isn't running (misconfigured schedule, or disabled); a downstream dependency (project-mapping lookup, actor-resolution lookup) is slow or erroring on every attempt; a genuine volume spike beyond current capacity.
- **Diagnosis**: confirm the Cron job's own execution history; check `retry_count` distribution — uniformly high retry counts across many rows points to a systemic worker failure, not volume.
- **Resolution**: fix/re-enable the Cron trigger; fix the failing downstream dependency; if genuine volume growth, this is the trigger point for revisiting the `pgmq` upgrade path documented in `05_SYSTEM_ARCHITECTURE.md` and `adr/0004-queue-and-job-processor.md`.
- **Escalation**: sustained backlog growth with no clear cause within [operational SLA to be set by Kauan — see `12_OPEN_QUESTIONS_AND_DECISIONS.md`] escalates as a KSP OS availability concern.

### R6 — Dead-letter recovery

- **Symptom**: rows accumulate in `dead_letter_events`.
- **Likely causes**: any of R1–R5's root causes left unresolved long enough to exhaust the retry ceiling; a genuinely malformed payload the normalization logic can't handle.
- **Diagnosis**: read the dead-letter row's recorded failure reason; check whether it's a class of failure already covered by R1–R5 (fix at the root, then reprocess) or a new failure mode (needs a normalization-logic fix).
- **Resolution**: fix the root cause, then manually reprocess (reset `processing_status` to `pending`, re-enters the same pipeline per `05`'s reprocessing design — never a special-cased recovery path). Reprocessing is idempotent by design, so a mistaken double-reprocess is safe.
- **Escalation**: a dead-letter row whose payload appears to contain a genuine business event that will never successfully normalize (e.g., a provider payload shape KSP's normalization was never built to handle) should be flagged for a normalization-logic backlog item, not left dead-lettered indefinitely.

### R7 — AI session stuck / not completing

- **Symptom**: an `ai_agent_sessions` row stays in an in-progress status well past the provider's expected session duration.
- **Likely causes**: the underlying Claude Code/Codex process crashed or was killed without emitting a completion event; a hook/webhook that would mark completion didn't fire; the session is genuinely still running (long-running task, not actually stuck).
- **Diagnosis**: check the session's last recorded event timestamp in `ai_agent_session_events`; check the underlying provider's own session-status query (Claude Code: session resume/status; Codex: cloud-task status query, per `01`'s X-series findings) if available.
- **Resolution**: if genuinely crashed, mark the session as `failed` with a clear reason (never silently left in a false "in progress" state indefinitely); if a hook/webhook gap, this is a normalization-logic fix (ensure a timeout-based fallback marks sessions stale after a bounded window, since AI-session completion signals are less standardized/reliable than GitHub/Vercel webhooks per `01`'s C-series/X-series confidence ratings).
- **Escalation**: none typically — this is routine cleanup, unless a stuck session pattern suggests a broader provider-side reliability issue worth flagging to Kauan.

### R8 — Provider or database outage

- **Symptom**: elevated error rates across all ingestion for one provider (provider outage) or across the whole Hub (KSP database outage).
- **Likely causes**: see symptom.
- **Diagnosis**: check the provider's own status page for a provider-side outage; check KSP OS's own database/Vercel status for a KSP-side outage.
- **Resolution**: for a provider outage, no Hub-side action — webhook handlers fail fast (per `05`'s design), the provider's own redelivery mechanism is the safety net, and the command center's "no recent activity" staleness signal will flag affected projects until it resolves. For a KSP database outage, this is a platform-wide incident outside the Hub's own scope — the Hub's only outage-specific property is that its handlers are designed to fail fast and cheaply rather than compounding the outage with slow retries.
- **Escalation**: KSP-side database outage escalates immediately as a platform incident, independent of the Hub.

### R9 — Incorrect AI-generated summary / report

- **Symptom**: a generated report or summary states something that didn't happen, misattributes an action, or otherwise doesn't match the underlying events.
- **Likely causes**: a grounding failure in the summary-generation prompt/logic (the exact failure mode `07_UX_INFORMATION_ARCHITECTURE.md`'s "summary grounding" test and `08`'s dedicated unit test target); a correlation error upstream (a Level 3 inference was wrong and the summary repeated it without labeling it as inferred); a prompt-injection attempt from ingested content (per `06`'s threat table) that succeeded.
- **Diagnosis**: pull the report's `source_event_ids` and manually verify each cited event actually supports the claim; check whether the disputed claim traces to a Level 3 (inferred) relationship that should have been labeled as such but wasn't.
- **Resolution**: correct/retract the report (reports are drafts pending human review per `07`'s workflow — this is exactly why that review step exists, not a bypassable formality); if a grounding-logic defect, fix and add a regression test for the specific failure pattern; if a successful prompt-injection, treat as a security incident (see `06`'s injection-control section) — audit what else that ingested content could have influenced.
- **Escalation**: a confirmed prompt-injection success escalates as a security incident, not a routine correction.

### R10 — Suspected data leak / cross-tenant exposure

- **Symptom**: any indication that one organization's/client's activity data was visible to a user who shouldn't have access — a misfiled bug report, an unexpected row in a query result during debugging, a mapping error per R4.
- **Likely causes**: an RLS policy gap (the repeated pattern this rebuild has already found 7 times elsewhere in the repo — a table with RLS enabled but a missing or incorrect policy); a project-mapping error (R4) that put another tenant's events under the wrong project; an application-layer bypass (e.g., an accidental `createServiceClient()` call from user-facing code, which `08`'s security-test suite specifically checks for).
- **Diagnosis**: immediately identify the exact rows/users exposed; check the relevant RLS policy definitions for the affected table(s); check for any service-role-client usage in the code path involved.
- **Resolution**: fix the RLS policy or mapping error immediately (does not wait for a scheduled release cycle — this is a stop-the-line issue); assess exact scope of exposure (which rows, which users, how long); this is the class of incident that requires direct, prompt disclosure to Kauan regardless of scope, given the repo's own non-negotiable RLS-integrity rule.
- **Escalation**: always escalates to Kauan immediately. No autonomous resolution-without-disclosure path exists for this runbook, by design.

### R11 — Integration disconnected

- **Symptom**: `integration_connections.status` shows disconnected/revoked, or the provider reports the KSP App/OAuth grant was removed.
- **Likely causes**: a KSP admin intentionally disconnected it; the provider-side admin (e.g., a client's own GitHub org admin, if applicable) revoked access; a token naturally expired without rotation.
- **Diagnosis**: check `integration_connections` history for who/when it was last modified; check the provider's own audit trail if accessible.
- **Resolution**: if intentional, no action beyond confirming affected projects show a clear "integration disconnected" state (per `07`'s UX spec, not a silent gap); if unintentional, reconnect through the standard OAuth/App flow.
- **Escalation**: none, unless the disconnection was unexpected and unexplained, which may warrant a security review (was the credential compromised and revoked by the provider's own abuse detection?).

### R12 — Credential rotation

- **Symptom**: scheduled or emergency rotation of a webhook secret, PAT, OAuth token, or service-role key touching the Hub.
- **Likely causes**: routine scheduled rotation (a policy to be set — see `06`'s recommendation and `12`'s open question on rotation cadence); emergency rotation following a suspected compromise.
- **Diagnosis**: n/a — this is a planned procedure, not a diagnosis.
- **Resolution**: rotate at the provider first, update KSP OS's stored secret (via whatever secret-storage mechanism `adr/0011-secret-storage.md` settles on) second, confirm the next delivery/call succeeds with the new credential, then invalidate the old credential at the provider. Never invalidate the old credential before confirming the new one works — this avoids a self-inflicted R1 (events stop arriving) during rotation.
- **Escalation**: an emergency rotation following a suspected compromise escalates immediately to Kauan as a security incident, with the credential invalidated at the provider as the first step (reversing the normal order — availability is secondary to containment in a compromise scenario).

## What this document does not cover

On-call staffing/paging policy, SLA targets, and the log-retention/query-tool a human would actually use to run these runbooks in practice are all **organizational decisions for Kauan**, not architectural ones — flagged as open questions in `12_OPEN_QUESTIONS_AND_DECISIONS.md` rather than assumed here.
