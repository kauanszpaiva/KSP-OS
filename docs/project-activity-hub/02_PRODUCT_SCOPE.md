# 02 — Product Scope

Status: **Complete** (planning-only) · 2026-07-23

## Product definition

The KSP Project Activity Hub is a **project operations and provenance system** — not a log viewer, not a dashboard of vanity metrics. Its job is to answer, for any KSP project, "what happened, who (or what) did it, and can we prove it?" by connecting activity from 12 sources into one normalized, per-project timeline:

1. KSP OS internal actions (already flowing into `activity_events`/`audit_events` — see `00_CURRENT_SYSTEM_AUDIT.md` §13)
2. Source control (GitHub)
3. Pull requests and code reviews
4. CI and automated tests
5. Deployments (Vercel)
6. Database operations (Supabase)
7. AI coding sessions (Claude Code, Codex)
8. AI assistant actions (Claude API, used as an in-app assistant — distinct from Claude Code)
9. Releases
10. Incidents and rollbacks
11. Human approvals
12. Project tasks and deliverables (already modeled: `tasks`, `mission_milestones`, `commitments`)

This is an **internal Command-app module** — see the Non-goals section below for why it is explicitly not exposed through the Portal.

## Primary users

Mapped to the actual `InternalRole` enum (`packages/permissions/src/index.ts` — see `00_CURRENT_SYSTEM_AUDIT.md` §10), not an invented role model:

- **`founder_ceo`** (Kauan) — cross-project command center: production releases, failed deployments, unreviewed AI sessions, integration health, AI cost by project. The one role that needs the *global* command-center screen (§ below), not just per-project views.
- **`executive_operations`** — same command-center visibility as `founder_ceo` per the existing `is_executive()` RLS pattern (both roles already share executive-scope authorization throughout the schema — no new distinction needed).
- **`project_manager`** (Eric) — per-project Activity/Deployments/Releases/Incidents screens; the role most likely to answer "what changed in this project this week" for a client-facing status update.
- **`developer`, `designer`** (Joshua and similar roles) — the AI Sessions and Database screens are built primarily *for* these roles: reviewing what Claude Code/Codex did, whether tests passed, what got deployed.

## Secondary users

- **`department_lead`** — same visibility as `project_manager` scoped to their department's projects.
- **`capture_specialist`, `videographer`, `photographer`, `editor`, `content_specialist`, `marketing_specialist`, `sales_specialist`** — see the Activity screen for tasks/deliverables on projects they're assigned to; almost never touch AI Sessions/Deployments/Database (those screens are dev-provenance-specific, not generally useful to non-technical roles). Nav visibility for these screens should follow the existing `canPerform`/role-gating pattern, not a blanket "show everyone everything."
- **`contractor`, `freelancer`, `intern`** — same as above, scoped further by whatever `project_memberships`/`project_access_grants` rows already govern their existing task access (`00_CURRENT_SYSTEM_AUDIT.md` §8).

## User permissions

No new permission model is invented. The Activity Hub's screens map onto the *existing* `PermissionAction` enum and `canPerform()` logic:
- Viewing a project's Activity/Deployments/Database/Releases: gated the same way `project.read` already gates Missions/Workspace visibility today — assigned-project internal scope (via `project_memberships`) or executive scope.
- AI Sessions specifically may warrant a narrower view: only the initiating user, the project's assigned team, and executives — since a session's file-change/tool-use detail is a step more granular than a simple activity summary. This is flagged as an **open decision** in `12_OPEN_QUESTIONS_AND_DECISIONS.md` rather than assumed.
- Cost/estimated-spend figures (per `11_COST_AND_PLAN_REQUIREMENTS.md`) are **executive-only**, mirroring the existing `finance.read` executive gate — cost data is financially sensitive in the same way Finance-module data already is.

## User journeys

1. **Eric starts his Monday**: opens a project's Activity screen, filters to "since Friday," sees a Vercel production deployment succeeded, a Supabase migration ran clean, and one AI session (Claude Code) touched 4 files and opened a PR that's still awaiting review — he clicks through to the PR.
2. **Kauan checks the command center**: sees 2 projects have no activity in 14 days (a health signal), one production deployment failed overnight with a linked incident, and this month's estimated AI spend across projects.
3. **Joshua reviews an AI session**: after Claude Code finishes a task, he opens the AI Sessions screen, sees which files changed, that tests passed, and the commit/PR it produced — decides whether to approve the PR himself or hand it back.
4. **A production incident happens**: someone opens an incident record, links the failing deployment and the commit that triggered it; the Activity Hub's own timeline is used to reconstruct exactly what led up to it (§ Incident and rollback mode, deferred to Phase 6 per the roadmap).
5. **Weekly report**: a project manager generates an evidence-grounded weekly summary for internal review — deterministic metrics plus an AI narrative that links every claim back to a source event, never asserting "completed" without the configured evidence gates being satisfied.

## Business outcomes

- Faster, evidence-backed answers to "what happened" — replacing manual cross-referencing of GitHub, Vercel, and Slack.
- Confidence that AI-agent activity (Claude Code, Codex) is visible and reviewable, not a black box — directly supporting KSP's own governance rule that "material mutations must emit audit records" (`reference/AGENTS.md`), extended to AI-driven mutations.
- A defensible trail for client-facing status reporting, without exposing internal operational detail to clients (see Non-goals).
- Early warning on stale/unhealthy projects and unreviewed AI activity, surfaced on the command center rather than discovered late.

## Non-goals

- **Not exposed to the Portal or clients, in any form, in this scope.** Git commit history, deployment internals, AI costs, and database migration detail are internal operational data — exposing any of it to a client would violate the Portal's own already-established design intent ("must never render any internal Command navigation or module," `docs/rebuild/portal/00_foundation.md`). If a client-safe *subset* is ever wanted (e.g., "your project has X open items"), that is a distinct, future, separately-scoped decision — not part of this plan.
- Not an employee productivity-scoring or ranking system. Per the PDF's own instruction and consistent with KSP's values, commit count/session count are explicitly not used to rank people.
- Not a replacement for GitHub/Vercel/Supabase's own dashboards — the Hub aggregates and correlates, it does not aim to be a full-featured replacement UI for any single provider.
- Not a general-purpose SIEM or full-log warehouse — see `06_SECURITY_PRIVACY_AND_TRUST.md`'s retention principles (summaries and references, not unlimited log copies).
- Not an automation/action platform in its first phases — no automated merges, deployments, or rollbacks until Phase 7 ("Controlled action center"), and even then every critical action requires explicit human authorization.

## MVP boundaries

The MVP is the **first vertical slice** defined in `09_IMPLEMENTATION_ROADMAP.md`: one KSP OS project, one GitHub repo, one Vercel project, existing KSP tasks, and native KSP activity — proving the full ingest→normalize→map→correlate→display→retry pipeline end to end, before Supabase-operations or AI-session ingestion are added.

## Future boundaries

Supabase operational ingestion, the unified AI-session model (Claude Code + Codex + Claude API + ChatGPT/MCP), releases/incidents, weekly reports, and the controlled action center are all explicitly **future phases**, not MVP — see the phased roadmap.

## Success criteria

- Every one of the 20 questions in the PDF's "Primary outcome" section (e.g., "what changed in this project today," "which AI session modified a particular file," "why did a deployment fail") is answerable from captured events or clearly-labeled inferences, never invented relationships.
- Zero cross-tenant/cross-project event leakage (verified by the security test plan in `08_TEST_AND_VERIFICATION_PLAN.md`).
- No secret, token, or full AI transcript ever lands in the ledger (verified by the retention/redaction rules in `06_SECURITY_PRIVACY_AND_TRUST.md`).

## Failure conditions

- Any inferred (Level 3) correlation displayed or treated as proven fact.
- Any webhook signature bypass, replay, or forged actor identity going undetected.
- A task marked "complete" without its configured evidence gate being satisfied.
- Any provider outage or processing failure causing silent data loss rather than a visible, retryable dead-letter state.

## Trust requirements

- Every event in the normalized ledger must be traceable back to either a raw provider delivery or an internal KSP OS mutation — no event may exist without a verifiable origin.
- Correlation confidence must always be visible alongside the correlation itself (see `03_CORRELATION_AND_PROVENANCE.md`).
- AI-generated summaries (weekly reports, etc.) must cite the specific source events they're derived from.

## Evidence requirements

See `07_UX_INFORMATION_ARCHITECTURE.md`'s Evidence and completion model — commit/PR/review/CI/deployment/migration/test-report/screenshot/AI-session-result/manual-approval/client-approval/release-record, each configurable per task type, never assumed from a single weak signal (e.g., a commit existing does not alone mean a task is done).

## Privacy expectations

- No secrets, `.env` contents, access/refresh tokens, or complete AI transcripts are ever stored in the ledger (this repo's own `scripts/check-secrets.mjs` governance already establishes the "no secrets anywhere" bar; the Hub must not become the exception).
- Retention defaults favor summaries, hashes, and provider links over raw payload/log copies — detailed in `06_SECURITY_PRIVACY_AND_TRUST.md`.
- Visibility is scoped by role/project exactly as every other KSP OS module already is — no new, parallel visibility model.
