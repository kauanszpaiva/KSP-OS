# KSP Dominion Command OS
## Integration Catalog and Control Contracts

**Version:** 1.0  
**Classification:** Confidential

---

# 1. Integration Standard

Every integration must define:

- owner and business purpose;
- provider and environment;
- authentication method and scopes;
- allowed data classifications;
- authoritative direction;
- objects/field mapping;
- webhook/poll schedule;
- idempotency and replay behavior;
- error, retry, dead-letter, and reconciliation behavior;
- rate limits and quota response;
- monitoring and alerting;
- secret rotation and revocation;
- retention/deletion behavior;
- offboarding/exit plan;
- cost attribution;
- test/sandbox strategy.

An integration is not complete merely because the happy-path API call works.

---

# 2. Supabase

## Purpose

Authoritative application identity, database, application-managed storage, edge functions, scheduled jobs, queues, and selected realtime behavior.

## Authority

- Supabase Auth: identity/session authority.
- Postgres: Command OS operational-record authority.
- Storage: application-managed file-byte authority where selected.

## Controls

- Separate Local, Staging, and Production projects.
- RLS on all exposed tables.
- Service-role server-only.
- MFA assurance for protected actions.
- Database migrations in Git.
- PITR/backups according to approved plan.
- Separate object backup/versioning.
- Function secrets separated by environment.
- Queue retry/dead-letter monitoring.

## Reconciliation

- Schema/migration state checked in CI and release.
- Auth profile/membership consistency job.
- Storage object versus metadata orphan checks.
- Queue/outbox backlog checks.
- Backup/restore evidence.

---

# 3. Vercel

## Purpose

Host Next.js application, Preview/Staging/Production deployments, environment variables, domains, runtime logs, performance/analytics, and controlled releases.

## Authority

Vercel is authoritative for deployment/runtime status. Command OS stores release and deployment references, approvals, health, and incident history.

## Data flow

Inbound to Command OS:

- project/environment identifiers;
- deployment ID/URL/status;
- commit/branch reference;
- start/end time;
- domain and health status;
- selected spend/usage metrics.

Outbound from Command OS:

- approved release metadata or deployment trigger only through protected CI path;
- no direct unreviewed agent deployment.

## Controls

- Preview on PRs.
- Persistent Staging/custom environment if plan supports it.
- Production from protected branch/path.
- Environment-specific secrets.
- Preview protection for internal application.
- no Production Supabase variables in Preview.
- deployment checks and smoke tests.
- domain/DNS change approval.

## Reconciliation

Scheduled check verifies that Command OS release records match Vercel deployments and current production commit.

---

# 4. GitHub

## Purpose

Authoritative source code, commits, branches, issues, pull requests, Actions, reviews, security findings, and release references.

## Authority

GitHub is authoritative for source-control artifacts. Command OS owns business requirements, release authorization, project context, and cross-domain traceability.

## Inbound events

- issue created/updated/closed where linked;
- PR opened/updated/reviewed/merged/closed;
- check/workflow status;
- commit and branch reference;
- security finding reference;
- release/tag event.

## Outbound actions

Initial scope:

- create/link issue only after explicit user action or approved A2 automation;
- post structured status/comment through approved integration;
- request review;
- no autonomous merge, branch protection change, secret change, or production release.

## Controls

- GitHub Organization with two executive owners.
- least-privilege GitHub App/OAuth scopes.
- webhook signature and replay protection.
- idempotent event processing.
- CODEOWNERS, rulesets, required checks.
- Actions permissions minimized.
- installed apps reviewed quarterly.

## Reconciliation

- periodic sync of open linked PRs/issues/deployments.
- detect missing/stale webhook events.
- compare current Production release commit.
- preserve GitHub URL/ID and last synchronized timestamp.

---

# 5. Claude Code

## Purpose

Interactive local/repository implementation, code exploration, tests, migrations, documentation, and debugging.

Claude Code is a development tool, not a direct production runtime integration in the initial Command OS.

## Access

- local clone/worktree;
- approved repository permissions;
- non-production development configuration;
- no standing Production secrets or service-role credentials.

## Control contract

- reads `CLAUDE.md` and linked issue/spec;
- one branch/worktree per task;
- no direct protected merge;
- required tests and handoff;
- human review for high-risk paths;
- agent use disclosed in PR.

## Metrics

- tasks/PRs assisted;
- acceptance/rework;
- defects found after merge;
- tests added;
- cost by project;
- security/policy exceptions.

---

# 6. Codex

## Purpose

Independent implementation, review, testing, security/RLS analysis, CI review, and bounded automation through official CLI/IDE/cloud/GitHub Action workflows.

## Access

- repository/branch scope;
- sandbox and approval controls retained;
- least network/tool access;
- no Production secrets.

## Control contract

- reads layered `AGENTS.md`.
- reviews business invariants and authorization, not just style.
- outputs findings with severity/evidence.
- cannot merge protected work.
- GitHub Action has minimal token permissions.
- high-risk findings require human validation.

## Reconciliation

Codex review status is recorded as advisory evidence attached to PR/release. It never replaces required accountable human approval.

---

# 7. Jules

## Purpose

Bounded long-running GitHub repository tasks in an isolated VM, after review of its plan.

## Access

- selected repository and branch.
- allowed path/task contract.
- test/non-production configuration.
- no Production data/secrets.

## Control contract

- reads root `AGENTS.md`.
- plan before material edits.
- one branch/PR.
- no direct merge/deployment.
- unsuitable for ambiguous, financial, executive-access, secret, incident, or destructive tasks.

---

# 8. Google Workspace

## Services

- Google Drive/Shared Drives.
- Gmail.
- Calendar.
- Contacts.
- Docs/Sheets/Slides references.

## Initial strategy

Use read/link/reference-first integration. Add write automation only when purpose, user consent, scopes, reconciliation, and failure behavior are approved.

## Drive

Possible data:

- file/folder ID and URL;
- title, MIME type, owner/location;
- version/modified time;
- classification and Command OS relationships;
- authoritative external-file location.

Rules:

- Shared Drive preferred for company-owned records.
- Do not delete external files when deleting a Command OS link.
- Access mismatch and orphan references enter exception review.
- Large media strategy is separately approved.

## Gmail

Possible initial use:

- link selected messages/threads to client/project;
- user-confirmed extraction of actions, dates, decisions, and documents;
- draft preparation under A1.

Outbound email send automation is a later A3 capability requiring approval, consent/channel rules, and delivery logging.

## Calendar

- link meetings to client/project;
- prepare agenda and follow-ups;
- read availability under approved scope;
- event creation/update only through explicit user action or approved workflow.

## Security

- least OAuth scopes;
- per-user or delegated access policy;
- revocation/offboarding;
- token encryption;
- webhook/poll reconciliation;
- no unrestricted domain-wide delegation without executive/security review.

---

# 9. Figma

## Purpose

Authoritative design source and collaboration environment. Command OS owns design requirements, submitted versions, approval, handoff, and traceability.

## Initial integration

- store file/project/node URLs and IDs;
- link design artifact to project/deliverable/version;
- record approved version/reference manually or through controlled API;
- link implementation issue/PR/Preview.

## Later options

- file/version metadata sync;
- design-system component references;
- comments/approval mapping only if identity and version semantics are reliable.

## Controls

- do not assume latest Figma state equals approved deliverable;
- snapshot/export or immutable reference for approval evidence;
- project access reviewed during onboarding/offboarding;
- client sharing separated from KSP internal design access.

---

# 10. Statutory Accounting Platform

Provider is an executive/CPA decision.

## Purpose

Official books, tax/accounting workflows, and advisor collaboration. Command OS remains the operational subledger and project/control system.

## Data direction

Potential outbound:

- approved customers/vendors;
- invoices/credits/payments;
- bills/expenses/payments;
- summarized or detailed journal entries;
- dimensions/classes/projects as supported.

Inbound:

- external IDs/status;
- account mappings;
- payment/reconciliation status;
- close status/adjustments where approved.

## Controls

- mapping/version table;
- idempotency and duplicate prevention;
- closed-period rules;
- exception/reconciliation queue;
- no silent overwrite of locally posted data;
- CPA review of sync model;
- staged sandbox tests.

---

# 11. Payment Processors and Banking

Examples may include Square, Stripe, PayPal, Relay, or other approved services. Exact providers and APIs require separate decision.

## Initial scope

Read/import transaction, payout, fee, invoice, and balance evidence where available. Record and reconcile payments. Do not autonomously move money.

## Controls

- read-only or minimum scope where possible;
- webhook signature/replay protection;
- gross, fee, net, payout, refund, dispute, and transfer distinction;
- account and currency mapping;
- payout-to-bank reconciliation;
- no client-facing paid status until authoritative evidence is processed;
- payment failures/disputes enter owned workflow.

---

# 12. Media Storage and Review Provider

Provider is open pending ADR.

## Required capabilities

- large/resumable upload;
- checksum/manifest;
- source/proxy/master separation;
- access control and expiring sharing;
- versioning and backup/replication;
- lifecycle/tiering/archive;
- editor workflow and egress viability;
- regional/client constraints;
- deletion/legal hold behavior;
- audit and export/exit path.

Command OS stores authoritative media metadata, rights, project relationships, and lifecycle state. It does not assume the external provider's folder layout is sufficient metadata.

---

# 13. Webhook Processing Pattern

```text
Receive request
  -> verify provider signature and timestamp
  -> reject replay/invalid source
  -> store raw protected event metadata
  -> acquire idempotency key
  -> acknowledge quickly
  -> queue processing
  -> map external object
  -> execute authorized domain command
  -> record audit/outbox
  -> mark processed
  -> retry or dead-letter on failure
```

Raw payload retention is minimized and classified. Sensitive content is protected.

---

# 14. Integration Health Model

Each integration reports:

- connected/disconnected/degraded;
- authentication expiry;
- last successful inbound/outbound event;
- last reconciliation;
- queue backlog and oldest age;
- rate-limit/quota state;
- mapping exceptions;
- data freshness;
- owner and runbook;
- provider incident reference;
- cost/usage threshold.

Unknown freshness is displayed as Unknown, not Healthy.

---

# 15. Integration Release Gate

Before Production:

- least scopes approved;
- test/sandbox behavior verified;
- signatures/idempotency/replay tested;
- mapping and source-of-truth direction approved;
- error/retry/dead-letter implemented;
- reconciliation implemented;
- monitoring and owner/runbook assigned;
- secret rotation/revocation tested;
- privacy/retention reviewed;
- exit/export behavior documented;
- cost threshold configured.
