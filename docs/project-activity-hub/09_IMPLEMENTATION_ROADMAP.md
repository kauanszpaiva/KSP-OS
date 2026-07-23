# 09 — Implementation Roadmap

Status: **Complete** (planning-only) · 2026-07-23

## First vertical slice

**Recommended target**: one KSP OS project connected to one GitHub repository and one Vercel project, plus existing KSP tasks and internal activity events.

The slice proves: a KSP task exists → a branch references the task (Level 1 correlation) → a commit is pushed → a pull request is opened → a Vercel preview deployment is created → the deployment succeeds or fails → KSP OS receives and signature-verifies both providers' events → events are deduplicated → events are normalized → events are mapped to the correct project → events are correlated to the task → the project's Activity screen shows the timeline → an event-details view shows evidence → a weekly summary uses only captured evidence → cross-tenant access is denied → failed processing can be retried.

**Why this is the right slice**: it exercises *every* architectural concern from `05_SYSTEM_ARCHITECTURE.md` (signature verification, raw persistence, async normalization, project mapping, actor resolution, dedup, both correlation levels that matter most in practice, RLS, retry/dead-letter) using only the two *most mature* provider integrations (`01_INTEGRATION_CAPABILITY_MATRIX.md`: GitHub is the highest-confidence, best-documented integration; Vercel is the most directly-correlatable via `meta.githubCommitSha`). It deliberately excludes Supabase-operations ingestion and the AI-session model — both of which are real, separate architectural surfaces (Supabase's own multi-surface complexity per `01_INTEGRATION_CAPABILITY_MATRIX.md` S1–S12; the AI-session model's provider-neutral design per `04_DATA_MODEL.md` §04.6/04.7) that would double the slice's scope without adding confidence in the *pipeline* itself, which is the actual thing being proven first.

**Explicitly excluded from the first vertical slice**: automated production deployment, automated merge, automated rollback, arbitrary external actions, full Claude consumer-chat capture, full Codex consumer-chat capture, unlimited log ingestion, organization-wide employee scoring, automatic task completion without evidence rules, automatic inferred (Level 3) correlation presented as fact.

## Phased roadmap

### Phase 0 — Foundations and decisions

- **Objective**: convert this planning package into approved, actionable decisions.
- **User-visible outcome**: none yet — this is a decision-making phase.
- **Backend/Frontend/Integration/Database work**: none — audit confirmation, event-taxonomy sign-off, project-mapping design sign-off, security-model sign-off, retention sign-off, provider-capability-validation sign-off (re-verify the Medium/Low-confidence findings in `01_INTEGRATION_CAPABILITY_MATRIX.md` directly against live dashboards), UX approval, ADR review (`adr/*.md`, all currently `Proposed`).
- **Security controls**: N/A yet.
- **Testing/Observability**: N/A yet.
- **Dependencies**: Kauan's review of this entire planning package.
- **Risks**: proceeding to Phase 1 without resolving the open decisions in `12_OPEN_QUESTIONS_AND_DECISIONS.md` (e.g., queue choice, AI-session visibility scope) risks rework later.
- **Exit criteria**: every ADR is either `Accepted` or `Rejected` (no longer `Proposed`); every item in `12_OPEN_QUESTIONS_AND_DECISIONS.md`'s decision register has an owner and either a decision or an explicit "deferred, revisit at Phase N."
- **Rollback**: N/A (no code exists).
- **Complexity**: S.

### Phase 1 — Native KSP ledger

- **Objective**: extend the existing `activity_events` table (per `04_DATA_MODEL.md` §04.3) and ship the first real Activity screen, using only data KSP OS already generates internally — no external provider yet.
- **User-visible outcome**: a project's Activity screen exists and shows real KSP-native events (task/comment/approval activity) with filtering, day-grouping, and evidence links to existing KSP records.
- **Backend**: extend `activity_events` with the new nullable columns; backfill `event_family`/`canonical_event_type` for existing rows via a one-time script (not a runtime migration).
- **Frontend**: the Activity screen itself (`07_UX_INFORMATION_ARCHITECTURE.md`), plus the new Mission-detail page shell it lives on (a real, net-new page — Missions is list-only today).
- **Integration work**: none yet.
- **Database work**: one migration extending `activity_events`, shipping its own RLS confirmation alongside (per the 7-times-repeated-bug lesson — nothing new to weaken here since the table already has policies, but any *new* filtered view/index must be checked against the existing policy, not assumed safe).
- **Security controls**: no new attack surface (no external input yet) — this phase is the safest place to build and test the UI shell.
- **Testing**: unit tests for the extended-schema mapping; e2e test for "task → activity event → visible on Activity screen."
- **Observability**: basic — this phase has no pipeline yet to instrument.
- **Dependencies**: Phase 0 decisions.
- **Risks**: building the Mission-detail-page shell here means later phases (2+) must slot their own tabs into an already-shipped page — sequencing risk if the shell's tab architecture doesn't anticipate Activity/Deployments/Database/AI Sessions/Releases/Incidents all needing to coexist. Mitigate by designing the tab shell generically in this phase even though only one tab has content yet.
- **Exit criteria**: a real project shows a real, RLS-correct Activity timeline sourced entirely from existing KSP-native mutations.
- **Rollback**: revert the migration (additive-only, no data loss) and hide the new nav entries.
- **Complexity**: M.

### Phase 2 — GitHub integration

- **Objective**: the first external provider, and the harder half of the first vertical slice.
- **User-visible outcome**: pushes, PRs, reviews, checks, and releases from a connected GitHub repo appear on the Activity screen, correctly attributed and correlated to KSP tasks where a Level-1 task-ID convention is followed.
- **Backend**: GitHub App registration (per `01_INTEGRATION_CAPABILITY_MATRIX.md` G1/G2 — org-owned, read-only permission set), webhook ingest endpoint (`external_event_deliveries` write path), signature verification, the async normalization worker (first real use of the `05_SYSTEM_ARCHITECTURE.md` queue/polling decision), project-mapping resolution against `project_integration_mappings`, actor resolution against `external_actor_identities`.
- **Frontend**: Activity screen's GitHub-sourced rows (icons, evidence links); Integration Settings screen additions for GitHub connection status.
- **Integration work**: the GitHub App itself — installation flow, webhook subscription (the 16 events from G8), backfill job for historical PRs/commits at connection time.
- **Database work**: `project_integration_mappings`, `external_event_deliveries`, `external_actor_identities`, `activity_event_relationships` — all shipped with write policies in the same migration.
- **Security controls**: signature verification (G4), payload redaction, rate-limit-aware backfill, the full GitHub-specific threat-table rows from `06_SECURITY_PRIVACY_AND_TRUST.md`.
- **Testing**: the GitHub-specific integration/security tests from `08_TEST_AND_VERIFICATION_PLAN.md`.
- **Observability**: webhook ack latency, signature-failure rate, normalization latency, unmapped-event count (the first real data for these metrics).
- **Dependencies**: Phase 1's Activity screen and Mission-detail shell; Phase 0's GitHub-App-ownership decision (`adr/0001`).
- **Risks**: GitHub App review/approval friction if any client org restricts app installation (per `01_INTEGRATION_CAPABILITY_MATRIX.md` G1's install-permission nuance) — mitigate by documenting the minimal read-only permission ask clearly for client-side approval.
- **Exit criteria**: a real GitHub repo's push/PR/check/release activity appears correctly, correlated, deduplicated, and retry-safe.
- **Rollback**: disconnect the GitHub App installation; existing ledger data is untouched (additive only).
- **Complexity**: L.

### Phase 3 — Vercel integration

- **Objective**: complete the first vertical slice.
- **User-visible outcome**: deployment lifecycle (preview + production, success/failure, promotion) appears on the Activity and new Deployments screens, correlated to the GitHub commit that triggered it.
- **Backend**: Vercel webhook ingest (or the Hobby-tier polling fallback per `01_INTEGRATION_CAPABILITY_MATRIX.md` V1), `deployment_records` (04.8) population.
- **Frontend**: the Deployments screen (`07_UX_INFORMATION_ARCHITECTURE.md`).
- **Integration work**: Vercel team webhook configuration + API token storage (`integration_connections` extension); the `meta.githubCommitSha` join logic against Phase 2's GitHub commit data.
- **Database work**: `deployment_records` migration.
- **Security controls**: SHA-1 signature verification + the IP-allowlist defense-in-depth recommendation (V6); token storage discipline for the longer-lived Vercel API token (no OAuth-app model built yet — flagged as a residual risk in the security doc).
- **Testing**: the Vercel-specific integration/security tests; the "commit → PR → preview deployment" e2e test — this completes the first vertical slice's full proof.
- **Observability**: deployment-specific metrics (success rate, lead time — early instances of the Phase-6 metrics).
- **Dependencies**: Phase 2 (correlation depends on GitHub commit data already flowing).
- **Risks**: Vercel's weaker documented reliability guarantees (no confirmed rate limits, no confirmed native retry) mean this phase's own reconciliation/backfill logic carries more weight than GitHub's did — budget for it.
- **Exit criteria**: **the full first vertical slice's 16-point proof list (above) is satisfied end to end, on a real project.**
- **Rollback**: disconnect the Vercel webhook/token; existing data untouched.
- **Complexity**: M.

### Phase 4 — AI development sessions

- **Objective**: the provider-neutral AI session model, starting with Claude Code (the more mature integration per `01_INTEGRATION_CAPABILITY_MATRIX.md`).
- **User-visible outcome**: the AI Sessions screen shows real Claude Code sessions (and Codex, if the KSP AI Launcher covers both from day one) with files touched, tests run, commits/PRs produced, cost, and approval status.
- **Backend**: the KSP AI Launcher (built on the Claude Code Agent SDK per C3), `ai_agent_sessions`/`ai_agent_session_events` tables, hook-based real-time event capture (C2), session-to-task linkage at creation time (Level 1 correlation, the cleanest correlation case in the whole system since the task ID is known *before* the session starts).
- **Frontend**: AI Sessions screen; "Start AI Development Session" entry point on a KSP task.
- **Integration work**: Claude Code Agent SDK integration; Codex SDK integration if included in this phase (recommend deferring Codex to a Phase 4b given its documented structural differences from Claude Code, `01_INTEGRATION_CAPABILITY_MATRIX.md`'s cross-cutting notes — see Risks).
- **Database work**: `ai_agent_sessions`, `ai_agent_session_events`; formal deprecation of the unused `ai_actions` table (`04_DATA_MODEL.md`'s reuse decision).
- **Security controls**: workspace isolation/sandboxing per client project (C7); the prompt/transcript never-store-in-full principle enforced at the adapter layer, not just documented; human-approval gate before any session-produced PR auto-merges (it doesn't, in this phase — merge stays manual).
- **Testing**: the AI-session-specific unit/integration tests; a dedicated test that `sanitized_summary` never contains a full prompt or full response (a content-shape assertion, not just a schema assertion).
- **Observability**: AI session success/failure rate, per-session cost (estimate-vs-authoritative distinction from `01_INTEGRATION_CAPABILITY_MATRIX.md` C6/C11).
- **Dependencies**: Phase 2/3's commit/PR/deployment correlation infrastructure (a session's `commit_shas` needs somewhere real to correlate against).
- **Risks**: Codex's structural differences (no hook/interception mechanism, TypeScript-only SDK, cloud-tasks-as-a-distinct-adapter-category per `01_INTEGRATION_CAPABILITY_MATRIX.md`'s cross-cutting notes) mean building "one AI session model" for both providers in a single phase risks the abstraction being wrong for one of them. **Recommend splitting this into Phase 4 (Claude Code only) and Phase 4b (Codex, once the Claude-Code-shaped model has been validated against a real provider and its actual edge cases are known).**
- **Exit criteria**: a real Claude Code session, started from a KSP task, shows up correctly on the AI Sessions screen with accurate cost/evidence, correlated to its resulting commit/PR.
- **Rollback**: the AI Launcher is additive — disabling it doesn't affect Phases 1–3's data.
- **Complexity**: L (Claude Code only) / XL (both providers in one phase — not recommended, per Risks).

### Phase 5 — Supabase operations

- **Objective**: bring database/migration/branch activity into the ledger.
- **User-visible outcome**: the Database screen shows real migration/branch history for a connected Supabase project, correlated to the GitHub commit/PR that introduced the migration file.
- **Backend**: Supabase branch webhook ingest (`run.completed`, per `01_INTEGRATION_CAPABILITY_MATRIX.md` S5 — **verify preview-branch coverage directly before relying on it**, per that finding's Medium-confidence flag), Auth Audit Logs query integration (S4, the highest-confidence/lowest-friction Supabase source), selective Database Webhooks (S7) for KSP-domain table changes if useful beyond what `activity_events` already captures natively.
- **Frontend**: the Database screen.
- **Integration work**: Supabase Management API PAT/OAuth setup; branch `--notify-url` configuration.
- **Database work**: `database_change_records` (04.9).
- **Security controls**: the Supabase-specific threat-table rows; Management API token storage discipline.
- **Testing**: the Supabase-specific integration tests, including the explicit "preview branch webhook coverage" verification this phase must do as its first task, not an assumption.
- **Observability**: migration success/failure rate.
- **Dependencies**: Phase 2 (commit correlation), Phase 0's decision on whether KSP upgrades to Supabase Team tier for Platform Audit Logs (S3) — a real cost/decision gate, not just an engineering task.
- **Risks**: Platform Audit Logs (org/project-level activity) requires a plan upgrade with no lower-tier substitute (`01_INTEGRATION_CAPABILITY_MATRIX.md` S3/S12) — if that upgrade isn't approved, this phase ships without org-level Supabase activity, using only Auth Audit Logs + Database Webhooks + targeted pgaudit, and that gap should be stated in the UI (an honest "not covered" note), not silently absent.
- **Exit criteria**: real migration/branch activity shows up correctly, correlated where possible.
- **Rollback**: disconnect the branch webhook/Management API token.
- **Complexity**: M.

### Phase 6 — Releases, incidents, and intelligence

- **Objective**: the synthesis layer — releases, incidents, weekly reports, operational metrics.
- **User-visible outcome**: the Releases and Incidents screens; the weekly-report workflow; the metrics from `07_UX_INFORMATION_ARCHITECTURE.md`.
- **Backend**: `release_records`, `incident_records`, `activity_summary_reports` (04.10/04.11/04.14); the report-generation workflow (query → permission-filter → deterministic metrics → AI narrative → source-citation → human review → publish).
- **Frontend**: Releases, Incidents, and Reports screens.
- **Integration work**: none new — this phase synthesizes data Phases 1–5 already produced.
- **Database work**: the three tables above, plus their join tables.
- **Security controls**: the report-generation-specific prompt-injection controls (a summarizer reading months of commit messages/PR descriptions is a larger attack surface than a single-event summary — test accordingly).
- **Testing**: the report/evidence-grounding tests from `08_TEST_AND_VERIFICATION_PLAN.md`; performance tests for "weekly summary over a large event set."
- **Observability**: report-generation failure rate, dead-letter/reconciliation health metrics maturing from "early instances" (Phase 2/3) into the full `10_OPERATIONS_AND_RUNBOOKS.md` metric set.
- **Dependencies**: Phases 1–5 (this phase has nothing to synthesize without them).
- **Risks**: AI-narrative quality/trustworthiness is the main risk — mitigated by the mandatory human-review-before-publish step, never skipped even for "obviously fine" reports.
- **Exit criteria**: a real weekly report is generated for a real project, every claim in it traces to a real source event, and a human reviewed it before publish.
- **Rollback**: reports are additive/read-only; no rollback risk beyond disabling report generation itself.
- **Complexity**: L.

### Phase 7 — Controlled action center

- **Objective**: *only after the history system is trusted* — the one phase that takes real actions, not just observes.
- **User-visible outcome**: create branch, start AI session (formalizing what Phase 4's launcher already does ad hoc), request preview deployment, request migration review, create incident, generate release, request rollback — each from directly within KSP OS.
- **Backend/Frontend/Integration/Database work**: not designed in this document — deliberately deferred, since the PDF's own instruction is explicit that this phase only gets scoped once the observation system has proven trustworthy in production use.
- **Security controls**: **every single action in this phase requires explicit human authorization** — no exceptions, no "AI decided this was safe." This is the phase where `06_SECURITY_PRIVACY_AND_TRUST.md`'s "AI tools taking actions based on untrusted webhook content" threat row stops being a low-likelihood future risk and becomes a live, must-be-mitigated concern from day one of design.
- **Testing/Observability**: not designed yet.
- **Dependencies**: Phases 1–6, and a **separate**, explicit approval gate from Kauan before any design work on this phase begins — not implied by finishing Phase 6.
- **Risks**: this is the highest-risk phase in the whole roadmap by a wide margin (real production actions vs. pure observation) — treat every design decision here with the same scrutiny as the repo's existing finance-write-path governance (`reference/CLAUDE.md`'s mandatory human finance-domain review is the closest existing precedent for the level of caution this phase needs).
- **Exit criteria**: not defined in this document — Phase 7 needs its own dedicated planning pass, not an extension of this one.
- **Rollback**: N/A — not designed.
- **Complexity**: XL.

---

## Implementation backlog (PAH-001 through PAH-020)

Each epic: user outcome, scope, non-scope, dependencies, acceptance criteria, security requirements, test requirements, observability requirements, documentation requirements, complexity, phase, blocking decisions, evidence required for completion.

### PAH-001: Activity Ledger Foundation
- **User outcome**: a project's Activity screen shows real KSP-native events, extending the existing `activity_events` table.
- **Scope**: schema extension (`04_DATA_MODEL.md` §04.3), Mission-detail page shell + Activity tab, day-grouped timeline UI.
- **Non-scope**: any external provider ingestion.
- **Dependencies**: none (Phase 1, first epic).
- **Acceptance criteria**: a real project's existing `activity_events` rows render correctly on a new Activity screen, RLS-scoped, with filters and evidence links to existing KSP records.
- **Security requirements**: no new attack surface; confirm the schema extension doesn't require any RLS policy change (additive columns only).
- **Test requirements**: unit tests for the schema extension; e2e test task→event→screen.
- **Observability requirements**: none new yet.
- **Documentation requirements**: update `docs/rebuild/command/*` with the new Mission-detail page, following the existing phase-doc convention.
- **Complexity**: M. **Phase**: 1.
- **Blocking decisions**: Mission-detail page's tab architecture (must anticipate future tabs — see Phase 1's Risks).
- **Evidence required for completion**: full check suite green + manual verification screenshot, per the repo's existing "never report done what wasn't verified" discipline.

### PAH-002: Project Integration Mapping
- **User outcome**: a project can be mapped to a GitHub repo, a Vercel project, and (later) a Supabase project via stable external IDs.
- **Scope**: `project_integration_mappings` table + Integration Settings project-level UI (`07_UX_INFORMATION_ARCHITECTURE.md`).
- **Non-scope**: the actual provider connections themselves (PAH-005/006/007).
- **Dependencies**: PAH-001.
- **Acceptance criteria**: an executive/project-manager can create, view, and soft-disconnect a mapping; mapping conflicts are flagged, not silently resolved; disconnected mappings are preserved for historical event resolution.
- **Security requirements**: insert/update restricted to executive/project-manager roles; RLS scoped per `04_DATA_MODEL.md` §04.1.
- **Test requirements**: unit tests for mapping-conflict detection; RLS test for write-role restriction.
- **Observability requirements**: mapping-health check job (surfaces broken/inaccessible mappings).
- **Documentation requirements**: SQL regression-plan doc under `supabase/tests/`.
- **Complexity**: S. **Phase**: 2 (built alongside GitHub integration, since it's needed first).
- **Blocking decisions**: the exact `PermissionAction` value for mapping write access (new enum value — needs an explicit decision, not silent reuse of an unrelated action).
- **Evidence required for completion**: RLS tests passing + manual verification that a non-executive cannot create a mapping.

### PAH-003: Actor Identity Resolution
- **User outcome**: activity events show a resolved human name where possible, with clear confidence labeling.
- **Scope**: `external_actor_identities` table, resolution logic (email/OAuth/admin-confirmed), the "suggested mapping" review UI.
- **Non-scope**: automatic merging on name similarity — explicitly excluded, not deferred.
- **Dependencies**: PAH-001.
- **Acceptance criteria**: two different external accounts sharing a display name are never auto-merged; an admin can confirm a "suggested" mapping; unresolved actors render as their raw provider identity, never a guessed name.
- **Security requirements**: identity-merge audit trail (who confirmed which mapping, when).
- **Test requirements**: the "never merge on name similarity" unit test from `08_TEST_AND_VERIFICATION_PLAN.md`.
- **Observability requirements**: count of unresolved/suggested-but-unconfirmed actors, surfaced somewhere reviewable.
- **Documentation requirements**: none beyond this plan and inline code comments explaining the non-obvious "never auto-merge" constraint.
- **Complexity**: M. **Phase**: 2.
- **Blocking decisions**: none.
- **Evidence required for completion**: unit tests passing + a manual walkthrough of the admin-confirmation flow.

### PAH-004: Event Ingestion Pipeline
- **User outcome**: the underlying webhook→raw→ack→async-normalize→correlate→ledger pipeline exists and is provider-agnostic (providers plug into it, not the reverse).
- **Scope**: `external_event_deliveries`, the normalization worker, the queue/polling mechanism decided in `adr/0004`, retry/backoff/dead-letter logic.
- **Non-scope**: any specific provider's webhook handler (those are PAH-005/006/007) — this epic is the generic pipeline they all plug into.
- **Dependencies**: PAH-001, `adr/0004` decided.
- **Acceptance criteria**: a synthetic test event can be pushed through the full pipeline (raw insert → ack → normalize → correlate → ledger) and appears correctly; a synthetic failure correctly dead-letters after the configured retry ceiling.
- **Security requirements**: the raw-body-preservation requirement (signature validation must happen on unparsed bytes); size-cap enforcement.
- **Test requirements**: the full integration-test suite from `08_TEST_AND_VERIFICATION_PLAN.md`'s "Integration tests" section (provider-agnostic parts).
- **Observability requirements**: the full metric set from `10_OPERATIONS_AND_RUNBOOKS.md`.
- **Documentation requirements**: the retry/dead-letter runbook.
- **Complexity**: L. **Phase**: 2 (built alongside the first real provider, since a pipeline with no provider plugged in can't be meaningfully tested).
- **Blocking decisions**: `adr/0004` (queue vs. polling fallback).
- **Evidence required for completion**: integration tests passing against a real (not just synthetic) GitHub webhook in a test/staging setup.

### PAH-005: GitHub App Integration
- **User outcome**: real GitHub activity (pushes, PRs, reviews, checks, releases) appears on the Activity screen.
- **Scope**: GitHub App registration + installation flow, webhook subscription (the 16-event set), signature verification, historical backfill at connection time.
- **Non-scope**: any write access to GitHub (read-only permission set only, per `01_INTEGRATION_CAPABILITY_MATRIX.md` G2).
- **Dependencies**: PAH-002, PAH-003, PAH-004.
- **Acceptance criteria**: connecting a real repo shows its push/PR/check/release history (backfilled) and live activity (webhook-driven) correctly on the Activity screen, correlated where a task-ID convention is followed.
- **Security requirements**: the full GitHub-specific threat-table rows (`06_SECURITY_PRIVACY_AND_TRUST.md`).
- **Test requirements**: the GitHub-specific tests from `08_TEST_AND_VERIFICATION_PLAN.md`.
- **Observability requirements**: webhook ack latency, signature-failure rate.
- **Documentation requirements**: the GitHub-connection runbook (`10_OPERATIONS_AND_RUNBOOKS.md`).
- **Complexity**: L. **Phase**: 2.
- **Blocking decisions**: `adr/0001` (GitHub App vs. PAT — already effectively decided in favor of the App per the capability research, but needs formal sign-off).
- **Evidence required for completion**: a real connected repo's activity verified end-to-end, including a deliberately-forced signature-failure test.

### PAH-006: Vercel Integration
- **User outcome**: real Vercel deployment activity appears on the Activity and Deployments screens, correlated to GitHub commits.
- **Scope**: webhook or polling ingestion (per plan tier), `deployment_records`, the `meta.githubCommitSha` correlation join.
- **Non-scope**: automated deployment/promotion/rollback actions (Phase 7 only).
- **Dependencies**: PAH-002, PAH-004, PAH-005 (correlation needs GitHub commit data).
- **Acceptance criteria**: a real Vercel project's deployment lifecycle (preview + production, success/failure/promotion) appears correctly and correlates to its triggering commit.
- **Security requirements**: SHA-1 verification + IP-allowlist recommendation; token-storage discipline for the longer-lived Vercel token.
- **Test requirements**: the Vercel-specific tests.
- **Observability requirements**: deployment success rate, lead time (first real instances of these metrics).
- **Documentation requirements**: the Vercel-connection runbook, explicitly noting the Hobby-tier polling fallback path.
- **Complexity**: M. **Phase**: 3.
- **Blocking decisions**: confirm each onboarded client's actual Vercel plan tier before assuming webhook availability.
- **Evidence required for completion**: **this epic's completion is also the first vertical slice's completion** — the full 16-point proof list in this document's "First vertical slice" section must pass.

### PAH-007: Supabase Operational Integration
- **User outcome**: real Supabase migration/branch/auth activity appears on the Database screen.
- **Scope**: branch webhook ingestion, Auth Audit Log querying, `database_change_records`.
- **Non-scope**: Platform Audit Logs (Team-tier gated — only in scope if the plan-upgrade decision in `12_OPEN_QUESTIONS_AND_DECISIONS.md` is approved); broad pgaudit logging (object-mode only, narrowly scoped, and only if a specific need is identified — never global).
- **Dependencies**: PAH-005 (commit correlation), Phase 0's Supabase-tier decision.
- **Acceptance criteria**: real migration/branch history appears correctly; the "does the branch webhook fire for preview branches" open question (`01_INTEGRATION_CAPABILITY_MATRIX.md` S5) is directly verified as this epic's first task, not assumed.
- **Security requirements**: Management API token discipline; the Supabase-specific threat-table rows.
- **Test requirements**: the Supabase-specific integration tests, including the preview-branch-webhook verification.
- **Observability requirements**: migration success/failure rate.
- **Documentation requirements**: the Supabase-connection runbook, with the Team-tier-gated Platform Audit Logs gap stated explicitly if not upgraded.
- **Complexity**: M. **Phase**: 5.
- **Blocking decisions**: Supabase plan-tier upgrade decision (cost-gated, needs Kauan's sign-off).
- **Evidence required for completion**: real migration/branch activity verified end-to-end on a real project.

### PAH-008: AI Session Framework
- **User outcome**: the provider-neutral `ai_agent_sessions`/`ai_agent_session_events` model exists and is populated by at least one real provider adapter.
- **Scope**: the schema (04.6/04.7), the "Start AI Development Session" entry point on a KSP task, the KSP AI Launcher's core (provider-agnostic) shell.
- **Non-scope**: the actual Claude Code/Codex adapters (PAH-009/010) — this epic is the framework they plug into.
- **Dependencies**: PAH-001, PAH-005 (commit correlation).
- **Acceptance criteria**: a session can be created from a task with the task ID stored at creation time (Level 1 correlation, guaranteed); session state transitions (`running`→`completed`/`failed`/`canceled`) work correctly; cost fields are nullable and correctly labeled by `cost_confidence`.
- **Security requirements**: the never-store-full-prompt/response principle enforced at the framework layer (a shared helper every adapter must use, not each adapter reinventing redaction).
- **Test requirements**: the "sanitized_summary never contains a full prompt" content-shape test.
- **Observability requirements**: session status distribution.
- **Documentation requirements**: the AI-session data model's reuse/deprecation note for `ai_actions` (`04_DATA_MODEL.md`).
- **Complexity**: M. **Phase**: 4.
- **Blocking decisions**: AI-session visibility scope (`02_PRODUCT_SCOPE.md`'s open question — narrower than general project activity, or not).
- **Evidence required for completion**: framework-level tests passing; formally deprecate `ai_actions` in the same migration that ships this framework's tables (not left dangling).

### PAH-009: Claude Code Adapter
- **User outcome**: real Claude Code sessions (via the Agent SDK) populate the AI Sessions screen.
- **Scope**: Agent SDK integration, hook-based event capture, per-client sandboxing (`01_INTEGRATION_CAPABILITY_MATRIX.md` C7), session-to-task linkage.
- **Non-scope**: Codex (PAH-010, deliberately separate per Phase 4's risk note).
- **Dependencies**: PAH-008.
- **Acceptance criteria**: a real Claude Code session started from a KSP task shows correct files-touched/tests/commits/cost/evidence on the AI Sessions screen.
- **Security requirements**: workspace isolation configured per client project; the git-commit-author-identity question (`01_INTEGRATION_CAPABILITY_MATRIX.md` C10, currently Unknown) resolved by direct testing before this epic ships, not left ambiguous.
- **Test requirements**: the AI-session-specific tests; a direct test of C10's git-identity behavior.
- **Observability requirements**: per-session cost (estimate) + reconciliation against the Anthropic Admin Usage API (C11) on a schedule.
- **Documentation requirements**: the AI-session runbook ("AI session stuck," per `10_OPERATIONS_AND_RUNBOOKS.md`).
- **Complexity**: L. **Phase**: 4.
- **Blocking decisions**: none beyond PAH-008's.
- **Evidence required for completion**: a real session verified end-to-end, cost figures reconciled against the Admin API at least once.

### PAH-010: Codex Adapter
- **User outcome**: real Codex sessions populate the AI Sessions screen, using an adapter shaped for Codex's actual capabilities (not a forced copy of the Claude Code adapter).
- **Scope**: Codex SDK/CLI integration (`codex exec --json` or the TypeScript SDK), cloud-task polling (since no webhook/REST push exists per `01_INTEGRATION_CAPABILITY_MATRIX.md` X3), GitHub-PR-based downstream ingestion as the primary evidence source for cloud tasks.
- **Non-scope**: any assumption that Codex has a hook/interception mechanism equivalent to Claude Code's — it doesn't.
- **Dependencies**: PAH-008, PAH-009 (validate the framework against a real provider first).
- **Acceptance criteria**: a real Codex session (local `exec` or cloud task) shows correctly on the AI Sessions screen, with cloud tasks explicitly labeled as downstream-observed (via their resulting GitHub PR) rather than directly instrumented.
- **Security requirements**: same never-store-full-prompt principle; schema-validation guard against Codex's own event-schema versioning risk (`01_INTEGRATION_CAPABILITY_MATRIX.md` X4).
- **Test requirements**: Codex-specific adapter tests, explicitly covering the "cloud task has no confirmed REST API" downstream-only path.
- **Observability requirements**: same as PAH-009, plus a distinct metric for "Codex cloud tasks observed via GitHub PR only" (a data-quality signal, not an error).
- **Documentation requirements**: explicit documentation of the Codex-vs-Claude-Code structural differences, so future maintainers don't assume parity.
- **Complexity**: L. **Phase**: 4b (deliberately after 4/PAH-009, per the roadmap's risk note).
- **Blocking decisions**: whether Codex cloud tasks are in scope at all for v1, or deferred entirely to a later pass given the "no REST API" gap.
- **Evidence required for completion**: a real Codex session (at minimum, local `exec` mode) verified end-to-end.

### PAH-011: ChatGPT and MCP Activity
- **User outcome**: MCP tool calls (from ChatGPT or Claude, via a KSP-built MCP server) generate activity events.
- **Scope**: the KSP MCP server itself (OAuth 2.1 resource-server pattern per `01_INTEGRATION_CAPABILITY_MATRIX.md` X11), per-tool-call activity-event emission with actor identity from the server's own OAuth token issuance (X12).
- **Non-scope**: storing full ChatGPT/Claude conversation content — only the operation and its evidence.
- **Dependencies**: PAH-001, PAH-003 (actor resolution — the MCP server's own token-issuance design is what makes actor resolution possible here, per X12's finding).
- **Acceptance criteria**: a tool call through the MCP server produces a correctly-attributed activity event (`integration` or `ai_tool_action` family) with the calling human's identity resolved via the server's own auth, not guessed.
- **Security requirements**: the full MCP-specific design from X11/X12 — a standards-compliant OAuth 2.1 resource server, no reliance on the client (ChatGPT/Claude) to hand over trustworthy identity data unprompted.
- **Test requirements**: MCP-specific auth tests (token validation, scope enforcement, actor-identity correctness).
- **Observability requirements**: per-tool-call latency/error rate.
- **Documentation requirements**: the MCP server's own auth-architecture doc, since this is genuinely new infrastructure, not a reuse of an existing pattern.
- **Complexity**: L. **Phase**: not assigned to 0–7 above — this depends on the separately-planned KSP OS MCP integration referenced in the original PDF ("being planned separately"); sequence relative to that project, not strictly after Phase 6.
- **Blocking decisions**: the MCP server's own architecture is out of this document's scope (owned by the separate MCP planning effort) — this epic only covers how its actions *enter the ledger*.
- **Evidence required for completion**: a real tool call, from a real registered MCP client, correctly logged with resolved actor identity.

### PAH-012: Project Activity UX
- **User outcome**: the Activity screen (the module's centerpiece) is fully built per `07_UX_INFORMATION_ARCHITECTURE.md`.
- **Scope**: filters, day-grouping, expandable detail, all documented states (empty/loading/partial-data/disconnected/processing/failed-ingestion), the shared `ActivityTimeline` component.
- **Non-scope**: any screen other than Activity itself.
- **Dependencies**: PAH-001 (minimum), enriched incrementally as PAH-005/006/007/009/010 land more data sources.
- **Acceptance criteria**: every state listed in `07_UX_INFORMATION_ARCHITECTURE.md` renders correctly and is manually verified (screenshot-checked), not just implemented.
- **Security requirements**: no `dangerouslySetInnerHTML` on any provider-sourced string.
- **Test requirements**: the stored-XSS security test.
- **Observability requirements**: none beyond the pipeline's own.
- **Documentation requirements**: contribute `ActivityTimeline` back to `packages/ui` with the same reuse discipline as every other Command-app shared component.
- **Complexity**: M. **Phase**: 1 (initial), extended across 2–5.
- **Blocking decisions**: none.
- **Evidence required for completion**: manual verification across light/dark/mobile, per the repo's own established UI-phase verification pattern.

### PAH-013: Deployment and Database UX
- **User outcome**: the Deployments and Database screens per `07_UX_INFORMATION_ARCHITECTURE.md`.
- **Scope**: both screens' full field sets and states.
- **Non-scope**: Releases/Incidents (PAH-014).
- **Dependencies**: PAH-006 (Deployments), PAH-007 (Database).
- **Acceptance criteria**: manual verification against real connected-provider data.
- **Security requirements**: failure summaries never render a raw log dump.
- **Test requirements**: standard UI-state tests.
- **Observability requirements**: none new.
- **Documentation requirements**: standard phase-doc convention.
- **Complexity**: M. **Phase**: 3/5.
- **Blocking decisions**: none.
- **Evidence required for completion**: manual verification, per the repo's convention.

### PAH-014: Releases and Incidents
- **User outcome**: the Releases and Incidents screens + underlying tables.
- **Scope**: `release_records`, `incident_records`, their join tables, both screens.
- **Non-scope**: automated rollback (Phase 7 only).
- **Dependencies**: PAH-006, PAH-007 (a release bundles deployments and migrations, which must already exist).
- **Acceptance criteria**: a manually-created incident correctly reconstructs its timeline from real Activity-ledger events.
- **Security requirements**: incident records are internal-scope, executives always included.
- **Test requirements**: the "failed deployment → incident" e2e test.
- **Observability requirements**: none new.
- **Documentation requirements**: the incident-response runbook.
- **Complexity**: M. **Phase**: 6.
- **Blocking decisions**: incident severity model (`12_OPEN_QUESTIONS_AND_DECISIONS.md`).
- **Evidence required for completion**: a real (or realistic drill) incident reconstructed end-to-end from ledger data.

### PAH-015: Reports and Summaries
- **User outcome**: the weekly-report workflow, evidence-grounded and human-reviewed before publish.
- **Scope**: `activity_summary_reports`, the report-generation pipeline, the fact/calculated/inference/unknown separation in report UI.
- **Non-scope**: client-safe progress reports (explicitly a future, separately-scoped concept per `02_PRODUCT_SCOPE.md`'s Non-goals).
- **Dependencies**: PAH-001 through PAH-010 (a report needs real data to summarize).
- **Acceptance criteria**: a generated report's every claim resolves to a real `source_event_id`; the report cannot be published without the human-review step.
- **Security requirements**: the report-generation-specific prompt-injection tests (a larger attack surface than single-event summaries).
- **Test requirements**: the "summary grounding" unit test + the "weekly report → evidence" e2e test.
- **Observability requirements**: report-generation failure rate.
- **Documentation requirements**: the report-generation runbook.
- **Complexity**: L. **Phase**: 6.
- **Blocking decisions**: none beyond what's already in `12_OPEN_QUESTIONS_AND_DECISIONS.md`.
- **Evidence required for completion**: a real weekly report generated, reviewed, and published for a real project.

### PAH-016: Security and Privacy
- **User outcome**: the full security/retention model from `06_SECURITY_PRIVACY_AND_TRUST.md` is actually implemented, not just documented.
- **Scope**: payload redaction, retention-expiry enforcement (scheduled purge jobs), the append-only/no-update-policy design on `external_event_deliveries`/`project_activity_events`, the identity-verification discipline.
- **Non-scope**: nothing — this epic is cross-cutting and touches every other epic's output.
- **Dependencies**: runs alongside every phase, not after them — security is not a phase-6 bolt-on.
- **Acceptance criteria**: every security test in `08_TEST_AND_VERIFICATION_PLAN.md` passes.
- **Security requirements**: (this epic *is* the security requirements).
- **Test requirements**: the full security-test section.
- **Observability requirements**: security-event alerting (signature failures, secret-pattern matches).
- **Documentation requirements**: the security-incident-response runbook.
- **Complexity**: L (spread across all phases). **Phase**: 0 (design) through 6 (final verification).
- **Blocking decisions**: several — see `12_OPEN_QUESTIONS_AND_DECISIONS.md`.
- **Evidence required for completion**: the full security test suite green, plus a manual review of the threat table against actual implemented controls (not just the plan).

### PAH-017: Observability and Operations
- **User outcome**: the metrics and runbooks from `10_OPERATIONS_AND_RUNBOOKS.md` actually exist and are used.
- **Scope**: structured logging, the metric set, the runbooks.
- **Non-scope**: a new observability *vendor* — reuses whatever logging KSP OS already has (currently none, per `00_CURRENT_SYSTEM_AUDIT.md` §21 — this may itself require its own small decision/ADR if a proper observability tool is introduced).
- **Dependencies**: PAH-004 (the pipeline this observes).
- **Acceptance criteria**: every metric in `10_OPERATIONS_AND_RUNBOOKS.md` is actually queryable; every runbook has been dry-run at least once.
- **Security requirements**: never log secrets or full tokens.
- **Test requirements**: none beyond confirming metrics are emitted correctly.
- **Observability requirements**: (this epic *is* the observability requirements).
- **Documentation requirements**: the runbooks themselves.
- **Complexity**: M. **Phase**: 2 onward (grows with each new provider integration).
- **Blocking decisions**: whether KSP adopts an observability tool at all (`packages/observability` is currently an empty stub, `00_CURRENT_SYSTEM_AUDIT.md` §21) — a real open decision, not assumed.
- **Evidence required for completion**: a dry run of at least the "GitHub events not arriving" and "dead-letter recovery" runbooks against a real (or staged) failure.

### PAH-018: Backfill and Reconciliation
- **User outcome**: connecting a new project to an existing GitHub/Vercel/Supabase resource backfills its recent history, not just future events.
- **Scope**: the backfill jobs referenced in PAH-005/006/007 ("historical backfill at connection time"), plus the ongoing reconciliation jobs that catch anything a webhook missed.
- **Non-scope**: unlimited historical backfill — scope to a reasonable window (e.g. 90 days) by default, configurable.
- **Dependencies**: PAH-005/006/007 (this epic is their shared backfill mechanism, factored out rather than duplicated three times).
- **Acceptance criteria**: connecting a repo with pre-existing history shows that history correctly, respecting each provider's rate limits.
- **Security requirements**: same signature/auth discipline as live ingestion — a backfill job authenticates the same way, it doesn't get a shortcut.
- **Test requirements**: the "large timeline"/rate-limit performance tests.
- **Observability requirements**: backfill job progress/completion tracking.
- **Documentation requirements**: the backfill runbook.
- **Complexity**: M. **Phase**: 2 onward.
- **Blocking decisions**: default backfill window length.
- **Evidence required for completion**: a real project with pre-existing GitHub history backfilled correctly end-to-end.

### PAH-019: Testing and Verification
- **User outcome**: `08_TEST_AND_VERIFICATION_PLAN.md` is actually executed, not just written.
- **Scope**: implementing every test category in that document.
- **Non-scope**: nothing — cross-cutting, like PAH-016.
- **Dependencies**: runs alongside every other epic.
- **Acceptance criteria**: CI runs the full test suite (extending the existing `pnpm test`/`test:db`/`test:rls`/`test:migrations` pattern) and it's green.
- **Security requirements**: N/A (this epic verifies others' security requirements).
- **Test requirements**: (this epic *is* the test requirements).
- **Observability requirements**: test-coverage visibility.
- **Documentation requirements**: none beyond the tests themselves.
- **Complexity**: L (spread across all phases). **Phase**: 1 through 6.
- **Blocking decisions**: none.
- **Evidence required for completion**: real, executed, green test runs — never a claim of "tests would pass."

### PAH-020: Controlled Action Center
- **User outcome**: Phase 7's action-taking capabilities.
- **Scope/Non-scope/Dependencies/Acceptance criteria/etc.**: **deliberately not specified in this document** — per Phase 7's own entry above, this epic needs its own dedicated planning pass with Kauan's explicit, separate approval before any design work begins.
- **Complexity**: XL. **Phase**: 7.
- **Blocking decisions**: whether this phase is ever built at all, and if so, under what governance model (the existing finance-write-path human-review precedent is the closest analogue).
- **Evidence required for completion**: N/A — not scoped yet.
