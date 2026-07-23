# 07 — UX and Information Architecture

Status: **Complete** (planning-only) · 2026-07-23

## Adapting the PDF's suggested nav to KSP OS's actual navigation

The PDF suggests a per-project nav of Overview/Tasks/Roadmap/Files/Activity/Deployments/Database/AI Sessions/Releases/Incidents/Integrations/Settings. KSP OS does **not** have a per-project shell today — it has a top-level sidebar (`NAV_GROUPS` in `apps/command/lib/nav.ts`) with a flat Missions **list**, no Mission **detail** page with its own sub-navigation. Four of the PDF's suggested items already exist as separate top-level modules and must **not** be duplicated:

- **Tasks** → already `Workspace` (Execution group).
- **Roadmap** → already covered by `Schedule`/`Horizon` (Execution group).
- **Files** → already `Knowledge` (Control group).
- **Overview/Settings** → already the Mission's own list-row detail (once a detail page exists) / existing account settings pattern.

The genuinely new screens are **Activity, Deployments, Database, AI Sessions, Releases, Incidents, Integrations** — none of which exist today. The cleanest fit, reusing rather than duplicating: add these as **tabs on a new Mission detail page** (`apps/command/app/(app)/missions/[missionId]/page.tsx` — this page doesn't exist yet; Missions is currently list-only, per `00_CURRENT_SYSTEM_AUDIT.md` §24). This is itself a real architectural addition worth flagging, not an assumed given — see `12_OPEN_QUESTIONS_AND_DECISIONS.md`.

The **Global command center** is the one genuinely new *top-level* nav item, since nothing in Command today serves its specific cross-project ops-health purpose (Pulse is company-outcomes-and-commitments-focused, not dev/deployment-health-focused). Proposed: a new item in the **Command** nav group, tagged `status: 'planned'` in `nav.ts` following the exact existing `NavItem` convention until built.

## Navigation map

```
Command (existing nav group)
  Pulse (existing)
  Focus (existing)
  Signals (existing)
  Decisions (existing)
  Ops Center  <- NEW top-level item (the "global command center")

Execution (existing nav group)
  Missions (existing, list view)
    -> Mission detail page  <- NEW (doesn't exist today)
         Overview (existing list-row summary, promoted to a tab)
         Activity      <- NEW
         Deployments   <- NEW
         Database      <- NEW
         AI Sessions   <- NEW
         Releases      <- NEW
         Incidents     <- NEW
  Workspace (existing — serves the "Tasks" role, not duplicated)
  Schedule / Horizon (existing — serve the "Roadmap" role, not duplicated)
  Team (existing)

Control (existing nav group)
  Knowledge (existing — serves the "Files" role, not duplicated)
  Connections (existing) -> extended with Integrations settings for GitHub/Vercel/Supabase (see below)
```

## Component reuse (no new primitives invented)

Every screen below is built from `packages/ui`'s existing primitives (`Card`, `Badge`, `Dot`, `Avatar`, `EmptyState`, `Skeleton`, `Reveal`) plus the existing app-local `_components/ui.tsx` conventions (`PageHeader`, `SectionLabel`, `Panel`, `StatePill`) already used by every Command module. The one genuinely missing shared piece is a reusable **ActivityTimeline** component — `docs/rebuild/command/06_cross_cutting.md` already flags this exact gap ("A reusable `ActivityTimeline` component was explicitly not extracted... left as a real follow-up"). Building it is this module's natural contribution back to the shared component set, not a one-off.

## Activity screen

**Purpose**: the unified per-project timeline — the module's centerpiece.

- **Layout**: day-grouped list (mirrors Pulse's existing "Since you were away" day-grouping pattern), each row showing: source icon (provider), actor (name + human/AI badge), environment label (production/preview/n/a), event status/severity dot, compact one-line summary, expandable detail panel.
- **Expandable detail**: evidence links (external URL to GitHub/Vercel/Supabase), related task/commit/PR/deployment/migration/AI session (rendered from `activity_event_relationships` edges), correlation confidence (only shown for Level 3 — Level 1/2 relationships render as plain facts, no confidence badge needed since they're not inferred), verification status (for evidence-linked items).
- **Filters**: All / KSP OS / GitHub / Vercel / Supabase / Claude Code / Codex / Claude / ChatGPT / Human / AI / Production / Preview / Success / Failure / Security / Task / Branch / Pull request / Deployment / Date range / Actor — a `Segmented` control (existing primitive) for the top-level source filter, a filter-chip row for the rest.
- **States**: empty (no activity yet — `EmptyState` with an icon, matching every other module's empty-state convention), loading (`Skeleton` rows), partial-data (some sources connected, others not — an inline notice, not a full-page block), integration-disconnected (a specific notice distinct from generic empty state), processing (a delivery is queued but not yet normalized — shown as a subtly different row state, not hidden), failed-ingestion (visible, not swept under the rug — links to the dead-letter detail for an executive).
- **Search**: reuses the existing command-palette infrastructure's search pattern (`apps/command/app/(app)/_components/command-palette.tsx`) rather than a new search box.
- **Mobile**: same responsive collapse pattern as every other Command list view (cards stack, no horizontal scroll of the page body).
- **Accessibility**: keyboard-navigable rows, visible focus rings (existing theme convention), screen-reader labels on source/status icons (not color-alone signaling).

## AI Sessions screen

List view: provider, agent, model (or "—" if unavailable), objective, initiating user, task link, repository, branch, status, duration, files-changed count, test result, commit, PR, deployment, usage (token counts), estimated cost (**executive-only** column, mirroring Finance's existing `canViewFinance` gate), approval status, evidence links. Detail view (click-through): the full `ai_agent_session_events` stream, rendered as a compact timeline, plus the `sanitized_summary`.

## Deployments screen

List view: environment, provider, status (`StatePill`), branch, commit, PR, created-by actor, linked AI session (if Level 1/2 correlated), start/completion time, duration, preview URL, production URL, failure summary (never a raw log dump), rollback indicator, linked release.

## Database screen

List view: Supabase project, environment, branch, migration reference, migration source (file path), git commit, PR, linked deployment, status, failure summary, rollback instructions (text, human-authored — not automated), platform actions (branch created/deleted), security-relevant changes (flagged distinctly, e.g. an RLS policy change — pulled from Auth Audit Logs / Platform Audit Logs per `01_INTEGRATION_CAPABILITY_MATRIX.md` S3/S4).

## Releases screen

Release name, environment, time, bundled commits/PRs/deployments/migrations/tasks/AI-sessions (all via the `release_deployments`/`release_database_changes` join tables from `04_DATA_MODEL.md`), approvers, known issues, rollback target, evidence links.

## Global command center

Cross-project screen (the one new top-level "Ops Center" item): recent production releases, failed deployments, unreviewed AI sessions, unmapped events, processing failures, integration health (per-connection status from `integration_connections`), open incidents, upcoming deliverables (reuses existing Horizon data), projects with no recent activity (a staleness signal — flags exactly the kind of "quiet project" that's easy to lose track of), projects with unresolved production errors.

## Evidence and completion model

Activity becomes task-completion evidence only through **configurable evidence gates**, never by a single weak signal. Evidence types: commit, pull request, approved review, passing CI, preview deployment, production deployment, migration, test report, screenshot, AI session result, manual approval, client approval, release record. A task is never auto-marked complete because a commit merely exists.

Example gates (configurable per task type, not hardcoded):
- A **development task** might require: PR merged + required checks passed + preview-or-production deployment succeeded + human approval recorded.
- A **documentation task** might require: file changed + review completed + approval recorded.

Evidence-verification status: `missing` → `collected` → `partially_verified` → `verified` → `rejected` → `superseded`. This status lives on the task's existing evidence-tracking surface (extending, not replacing, whatever `commitments`/`proofs` already do for KSP-native completion evidence — `00_CURRENT_SYSTEM_AUDIT.md` §11's `proofs` table is the existing precedent for exactly this kind of gated-evidence model, and should be evaluated for direct reuse/extension before inventing a parallel concept).

## Weekly reports and summaries

Report types: daily activity, weekly project, release summary, AI utilization, deployment reliability, incident summary, database-change, team contribution (evidence-based, never a ranking — per `02_PRODUCT_SCOPE.md`'s non-goals), unfinished-work, client-safe progress (a distinct, separately-scoped future concept per the Non-goals section — not built in this plan).

Reports must separate **facts** (raw counts from the ledger), **calculated values** (deterministic derivations, e.g. "80% of deployments succeeded"), **inferences** (Level 3 correlations, always labeled as such), and **unknowns/missing data** (explicitly stated, not silently omitted). Workflow: select project + date range → query normalized events → apply permission filters (same RLS the rest of the system already enforces) → calculate deterministic metrics → generate an evidence-grounded AI narrative → attach `source_event_ids` (04.14) → human review → publish/export. The system must never say "completed" unless the task's configured evidence gate was actually satisfied.

## Metrics and operational intelligence

Deployment success rate, deployment lead time, task-start-to-merged-PR time, merge-to-production time, failed-build recovery time, rollback frequency, open-PR age, unmapped-event count, event-processing latency, dead-letter count, duplicate-delivery count, AI sessions by project, AI sessions producing verified evidence, AI session failure rate, human approval rate, estimated AI cost by project, production changes without linked tasks, tasks marked complete without sufficient evidence, database changes without linked migrations, deployments without linked commits. **No team-performance scores or employee ranking** — commit count is explicitly never used as a productivity proxy, per `02_PRODUCT_SCOPE.md`'s non-goals and the PDF's own explicit instruction.

## Cost attribution

Per-project cost attribution for Claude API, Claude Code (where cost data is available — see `01_INTEGRATION_CAPABILITY_MATRIX.md` C6/C11), OpenAI API, Codex (where available, X7/X8), Vercel/Supabase usage (where accessible), plus the Hub's own infra (event storage, queue processing, log querying, report generation). Every figure is labeled: provider-reported, deterministically-calculated estimate, approximate estimate, or unknown — **never presented as an invoiced amount**. Cost data is executive-only, mirroring the existing Finance module's `canViewFinance` gate.

## Notifications and alerts

Configurable, curated (never "notify on every event" — directly following the established precedent from `docs/rebuild/command/06_cross_cutting.md`'s "3 curated call sites, a deliberate signal-to-noise choice"): production deployment succeeded/failed, preview deployment ready, PR awaiting review, required checks failed, migration failed, rollback executed, integration disconnected, webhook signature failure, excessive webhook failure rate, dead-letter event, AI session awaiting approval, AI session failed, AI usage budget threshold, production change without a linked task, security-sensitive action, incident opened/resolved. Digest/priority/escalation behavior (e.g. batching non-urgent notifications) is designed at implementation time, not hardcoded here — the principle is: never notify on every activity event.

## Incident and rollback mode (Phase 6)

An incident links to a deployment, commit, PR, migration, AI session, user action, or "external provider outage" (a category with no internal link, for when the root cause is genuinely outside KSP's own systems). Fields: severity, timeline (reconstructed from the Activity ledger itself — this is the concrete payoff of building the ledger first), owner, affected project/environment, detection source, related events, mitigation, rollback, resolution, post-incident review, evidence, follow-up tasks. **No automated rollback in the initial version** — this is a record-keeping and timeline-reconstruction tool first, an action-taking tool only in Phase 7 and even then gated by human authorization.

## Integration settings UX

**Organization-level** (extends the existing Connections module, `apps/command/app/(app)/connections/page.tsx`): provider, connection status, connected account, granted permissions/scopes, installation scope, last successful event, last failed event, token expiration, reconnect/disconnect, secret rotation, health check, projects using the connection.

**Project-level** (new, lives on the Mission detail page's own settings area): connected repositories, default repository, production branch, Vercel project, Supabase project, environments, AI-session defaults, task-ID convention, event-retention policy override, notification policy, mapping health, unmapped resources.
