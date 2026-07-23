# 03 — Correlation and Provenance

Status: **Complete** (planning-only) · 2026-07-23

This document designs the Project Activity Ledger's core data concepts and the correlation engine that connects events across providers. It reuses two patterns already established in KSP-OS rather than inventing new ones: the `organization_id`-scoped RLS model, and the `object_table`/`object_id` polymorphic-reference convention already used by `comments`, `notifications`, and `client_publications` (`00_CURRENT_SYSTEM_AUDIT.md` §11, §13).

## Raw delivery vs. normalized activity event

**Raw delivery** — the original provider event, preserved for debugging, exactly as received:
- Provider delivery identifier (e.g. GitHub's `X-GitHub-Delivery` GUID)
- Provider
- Event type
- Receipt time
- Signature-verification result
- Processing status
- Retry count
- Redacted payload (secrets/tokens stripped before storage — see `06_SECURITY_PRIVACY_AND_TRUST.md`)
- Payload hash (for integrity/dedupe verification independent of the stored redacted copy)
- Retention expiration
- Error information
- Project-mapping result

**Normalized activity event** — the product-facing representation, derived from one (or occasionally more) raw deliveries:
- Tenant/organization, project, source provider, event family, canonical event type, provider event type, event action
- Human-readable summary, structured details
- Actor, actor type, AI provider, AI agent/model (where available)
- Environment, repository, branch, commit, pull request, deployment, database project/branch, task, AI session, release, incident
- Event status, severity, occurrence time, receipt time, processing time
- Correlation ID, causation ID, provider delivery ID, dedupe key
- External URL, visibility, sensitivity classification, data-retention category

This split matters because a raw delivery is *never* trusted as-is — every field above it feeds into is derived only after signature verification, project mapping, actor resolution, and correlation have all run (see `05_SYSTEM_ARCHITECTURE.md`'s ingestion pipeline). The raw table is the audit trail for *how* a normalized event came to exist; the normalized table is what every UI screen actually queries.

**Reuse decision**: normalized activity events extend the existing `activity_events` table's shape (`organization_id`, `actor_id`, `verb`, `object_table`, `object_id`, `summary`, `metadata jsonb`) rather than inventing a parallel schema from scratch — see `04_DATA_MODEL.md` for the exact reuse-vs-extend design. `verb` becomes the canonical event type; `object_table`/`object_id` continues to point at whatever KSP-OS-native record the event concerns (a commitment, a task) where one exists, with new provider-sourced fields (repository, commit, deployment, etc.) added as columns or a `provenance_id` extension.

## Event relationships

A single event can relate to multiple entities — a task creates an AI session; the AI session modifies files; those files become a commit; the commit belongs to a PR; the PR triggers checks; the commit triggers a deployment; the deployment references a Supabase branch; a deployment is promoted to production; a release bundles several deployments and migrations; an incident is caused by or associated with a deployment; a rollback reverses a deployment.

Not every relationship fits into one activity-event row's foreign keys. A dedicated `activity_event_relationships` table (see `04_DATA_MODEL.md`) models the graph explicitly: `(from_event_id, to_event_id, relationship_type, confidence_level)`, where `relationship_type` is one of `caused_by`, `belongs_to`, `triggers`, `references`, `promotes`, `reverses`, `contains`, `resolves`. This lets the UI render "related task / related commit / related PR / related deployment / related migration / related AI session" (per `07_UX_INFORMATION_ARCHITECTURE.md`'s Activity screen spec) as actual graph edges, not string-matched guesses.

## Canonical event families

23 families, matching the PDF's minimum list, each with: canonical event types, expected sources, required/optional fields, sensitivity, default retention, whether it appears in the normal timeline, whether it triggers a notification, whether it can serve as completion evidence.

| Family | Canonical types (examples) | Sources | Sensitivity | Default retention | In timeline? | Notifies? | Completion evidence? |
|---|---|---|---|---|---|---|---|
| `project` | created, updated, archived | KSP OS | internal | indefinite (mirrors `activity_events` today) | Yes | No | No |
| `task` | created, assigned, status_changed, completed | KSP OS | internal | indefinite | Yes | Curated (assignment only, per existing 3-call-site precedent) | Yes (when evidence-gated) |
| `comment` | posted | KSP OS (`comments` table) | internal | indefinite | Yes | No | No |
| `approval` | requested, decided | KSP OS (`approval_requests`/`decisions`) | internal | indefinite | Yes | Curated | Yes |
| `source_control` | push, branch_created, branch_deleted | GitHub | internal | 1 year raw / indefinite normalized | Yes | No | No |
| `pull_request` | opened, updated, reviewed, merged, commented | GitHub | internal | 1 year raw / indefinite normalized | Yes | Curated (awaiting-review) | Yes (merged + reviewed) |
| `code_review` | approved, changes_requested, commented | GitHub | internal | 1 year raw / indefinite normalized | Yes | Curated | Yes (approved) |
| `ci` | check_started, check_passed, check_failed | GitHub | internal | 1 year raw / indefinite normalized | Yes | Curated (failure only) | Yes (passed) |
| `test` | test_run_reported, test_failed | GitHub (via CI) / KSP-reported | internal | 1 year raw / indefinite normalized | Yes | Curated (failure only) | Yes |
| `deployment` | created, succeeded, failed, canceled, promoted | Vercel | internal | 1 year raw / indefinite normalized | Yes | Curated (prod success/failure) | Yes (prod succeeded) |
| `release` | created | KSP OS (derived) | internal | indefinite | Yes | Curated | Yes |
| `rollback` | executed | KSP OS (derived) / Vercel | internal | indefinite | Yes | Curated | No (evidence *of* recovery, not completion) |
| `database` | branch_created, branch_deleted, action_run_completed | Supabase | internal | 90 days raw / indefinite normalized | Yes | Curated (failure only) | No |
| `database_migration` | applied, failed | Supabase | internal | 90 days raw / indefinite normalized | Yes | Curated (failure only) | Yes (applied clean) |
| `authentication` | login, logout, mfa_event | Supabase Auth Audit Logs | **confidential** | 90 days | No (security-only view, not the general timeline) | Curated (anomalies only) | No |
| `authorization` | permission_changed, access_granted/revoked | KSP OS (`internal_permission_grants` etc.) | **confidential** | indefinite | Security-only view | Curated | No |
| `ai_session` | started, tool_used, file_changed, completed, failed | Claude Code, Codex (managed sessions) | internal | 90 days raw / 1 year normalized summary | Yes | Curated (awaiting-approval, failed) | Yes (per evidence gate) |
| `ai_tool_action` | file_edit, command_run, mcp_tool_call | Claude Code, Codex, ChatGPT/MCP | internal | 90 days raw / summarized in `ai_session` | No (rolled up into ai_session) | No | No |
| `integration` | connected, disconnected, health_check_failed | KSP OS (`integration_connections`) | internal | indefinite | Yes | Curated (disconnected) | No |
| `security` | webhook_signature_failure, secret_leak_suspected | Ingestion pipeline itself | **restricted** | indefinite | Security-only view | Always | No |
| `incident` | opened, mitigated, resolved | KSP OS (new, Phase 6) | internal | indefinite | Yes | Curated | No |
| `notification` | sent, read | KSP OS (existing `notifications` table) | internal | 1 year | No (meta-level, not user-facing timeline content) | N/A | No |
| `manual_note` | added | KSP OS | internal | indefinite | Yes | No | Optional (human-asserted evidence) |

This is a stable, expandable taxonomy — not hundreds of ad hoc event types. New canonical types are added within an existing family (e.g., a new `deployment.rolled_back_to` type) rather than new families being invented casually.

## Project integration mapping

Each KSP OS project maps to zero-or-more external resources via a `project_integration_mappings` table (see `04_DATA_MODEL.md`), keyed on **stable external identifiers** (GitHub repository ID, Vercel project ID, Supabase project ref) — never display names, which can be renamed. Supported mappings per project: GitHub org(s) + repo(s) (with one marked default), Vercel team + project + environment set, Supabase org + project + branch set, Claude Code/Codex workspace-or-repo association, an MCP-accessible project flag, an AI cost-center label, default timezone, default/production branch, and a task-ID prefix convention (for Level-1 correlation, see below).

The mapping model explicitly supports: one project with multiple repos; one repo mapped to multiple projects **only when a human explicitly creates that mapping** (never inferred); multiple environments; preview branches; integration disconnection (soft-delete, preserving historical mappings for past events); resource replacement (e.g., a repo rename triggers a new mapping row, not an edit of the old one, so historical events keep pointing at what was true when they occurred); mapping validation (a health-check job flags mappings pointing at deleted/inaccessible resources); mapping conflicts (two projects both claiming the same repo as default — flagged, not silently resolved); unmapped events (see below); manual remapping with a reprocessing job that re-runs correlation for previously-unmapped raw deliveries once a mapping is fixed.

**Unmapped events**: any raw delivery that cannot be matched to a `project_integration_mappings` row is stored (raw table only) with `project_mapping_result = 'unmapped'` and surfaced on the command center's "Unmapped events" widget (`07_UX_INFORMATION_ARCHITECTURE.md`) — never silently dropped, never guessed into a project by fuzzy name matching.

## Actor identity resolution

An actor may be: a KSP OS user, a GitHub user, a Vercel user, a Supabase organization member, a Claude Code user, a Codex user, a ChatGPT user, a service account, a GitHub App (the KSP Activity Hub app itself, or another installed app), an automated workflow, an AI agent, or an unknown external actor.

The system displays, for every actor: human name (if resolved), provider username, provider, actor type, linked KSP OS identity (if verified), and a mapping-confidence flag — **verified**, **suggested**, or **unknown**. An `external_actor_identities` table (`04_DATA_MODEL.md`) holds these mappings.

**Identity merging is never automatic based on name similarity.** A mapping becomes "verified" only through one of: matching email address between the external account and a KSP `profiles` row, an OAuth identity link (the external account authenticated through a flow that ties it to a KSP session), or explicit administrator confirmation in an Integration Settings screen. Everything else stays "suggested" (shown with a confidence score, reviewable, never treated as ground truth) or "unknown" (no name match found at all — e.g., a GitHub username with no corresponding KSP profile).

## Correlation engine

Three levels, in decreasing confidence order — the exact hierarchy the PDF specifies:

**Level 1 — explicit correlation** (high confidence): a KSP task ID appears in a branch name (e.g. `task/PAH-004-something`), in a PR title/description, or is sent explicitly as provider metadata; an AI session is created *from inside* a KSP task and the task ID is stored on the session record at creation time; a deployment payload contains a commit SHA that matches a KSP-tracked commit; a Supabase branch name references a Git branch KSP already tracks; an MCP mutation returns a KSP-generated correlation ID that the caller must echo back; the KSP AI Launcher (Phase 4) creates a session and stores the task ID on it directly, at creation, with no inference involved.

**Level 2 — deterministic provider correlation** (also typically high confidence, when identifiers are exact matches): a pull request contains a specific commit SHA (GitHub's own data model, not inferred); a Vercel deployment's `meta.githubCommitSha` field (per `01_INTEGRATION_CAPABILITY_MATRIX.md` V9) matches a tracked commit; a GitHub check run references a commit SHA; a deployment-promotion event references a specific prior deployment ID; a rollback event references the deployment ID it reverses.

**Level 3 — inferred correlation** (never treated as proven): similar timestamps, same actor, similar titles, similar changed files, similar task description vs. PR description. Every Level 3 correlation **must**:
- be stored in a separate table/column from Level 1/2 relationships (never merged into the same "proven" edge type in `activity_event_relationships`);
- include a numeric confidence score and a short, specific explanation of what produced that score (not just "similar timestamp" but "task PAH-004 last touched 4 minutes before this commit, same actor");
- never be described in any UI copy as proven ("likely related," never "is related");
- require human review above a configurable risk threshold before being surfaced as anything other than a low-confidence suggestion;
- never trigger an external action automatically — Level 3 correlations are read-only signals, full stop, and this holds even after Phase 7's controlled action center ships (§ `06_SECURITY_PRIVACY_AND_TRUST.md`'s prompt-injection/untrusted-content controls apply doubly here, since Level 3 correlation often runs directly over untrusted external text like commit messages and PR descriptions).

Temporal proximity **alone** is never sufficient to assert causality — a same-actor, same-timestamp coincidence is exactly the kind of false-positive Level 3 correlation exists to flag as a *suggestion*, not to quietly promote to a "proven" relationship.
