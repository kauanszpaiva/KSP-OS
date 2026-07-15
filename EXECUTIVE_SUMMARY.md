# KSP Dominion Command OS
## Executive Summary

**Version:** 1.0  
**Date:** July 15, 2026  
**Classification:** Confidential

## The solution

Build one internal platform that becomes KSP Dominion Group's authoritative operating system across:

- executive decisions and approvals;
- sales, leads, clients, proposals, and agreements;
- projects, people, capacity, risks, changes, and deliverables;
- software, websites, GitHub work, releases, deployments, and incidents;
- filming, photography, equipment, media ingest, editing, versions, rights, and delivery;
- marketing, content, campaigns, publishing, spend, and attribution;
- operational finance, invoices, bills, payments, expenses, subscriptions, procurement, and project profitability;
- documents, knowledge, assets, access, audit, notifications, and automation.

## The two-system rule

### KSP Dominion Command OS

The system of record and control. It owns business state, permissions, financial controls, workflows, evidence, and audit.

### Dominion Autopilot

A governed AI execution layer. It may read, summarize, draft, classify, recommend, and later perform narrow reversible internal actions. It never receives unrestricted Production access and never bypasses validation, approval, audit, or human authority.

## Executive hierarchy

### Kauan Paiva

Founder, CEO, and Primary System Owner.

### Vanessa Cardoso

Executive Operations, Chief of Staff, and Executive Co-Authority.

Both have full company visibility. Critical actions use separation of duties and, where required, two-person approval. Kauan retains primary legal/system ownership; Vanessa is executive continuity and recovery authority.

### Eric Lemus

Head of Project Delivery / Project Manager with assigned portfolio, project, client, budget, capacity, change, and status authority.

### Joshua Rodrigues

Product Design and Front-End Lead with assigned product, UX/UI, design-system, front-end, accessibility, review, repository, and Preview/Staging context.

Capture, editing, marketing, finance, contractor, and client roles are reusable templates with project-specific and time-bound access.

## Technology architecture

- Next.js and TypeScript.
- Vercel for Preview, Staging, Production, hosting, deployment, and runtime operations.
- Supabase Postgres, Auth, RLS, Storage, Edge Functions, Cron, and durable queues.
- GitHub private organization repository, pull requests, CODEOWNERS, required checks, and Actions.
- Claude Code as primary interactive builder.
- Codex as independent builder/reviewer/test/security agent.
- Jules for bounded isolated GitHub tasks after plan review.

Create a new private repository, `ksp-command-os`. Keep the existing static company website repository separate.

## Environment rule

```text
Local -> Pull Request -> Vercel Preview -> Staging -> Production Approval -> Production
```

Staging and Production use separate Supabase projects. Preview never points to Production. AI coding agents do not receive standing Production secrets or service-role credentials.

## Access rule

Access is calculated from:

```text
identity + MFA + role + scope + project/client relationship
+ data classification + record state + action + threshold
+ effective dates + approval/separation policy
```

UI hiding is never considered security. Supabase RLS enforces access at the data layer.

## Finance rule

The platform uses an operational double-entry ledger:

- exact money/currency types;
- balanced journal entries;
- immutable posting;
- reversal/adjustment corrections;
- AP, AR, invoices, bills, payments, credits, expenses, reimbursements, and subscriptions;
- bank/card/processor reconciliation;
- monthly close and locked periods;
- project budget, committed cost, actual cost, estimate to complete, and margin.

Command OS is the operational subledger. A CPA-approved accounting platform remains the statutory ledger unless KSP formally decides otherwise.

## Creative rule

Original media receives a manifest and checksum. Source media is immutable after ingest. Reviews reference exact versions. Publication checks releases, location rights, music/stock licenses, usage scope, and approval. Equipment has reservation, custody, return, damage, and maintenance history.

Large original video is stored through an approved media lifecycle/provider rather than being assumed to fit ordinary application storage. Command OS owns the metadata, rights, relationships, and controls.

## Executive experience

Kauan and Vanessa open the platform and see:

1. One Do Next action.
2. No more than three priorities.
3. Decisions and approvals waiting.
4. Clients/projects/money/security at risk.
5. Today's and next-seven-day obligations.
6. What changed.
7. What Autopilot completed or needs permission to do.

The system also provides focus mode, low-energy mode, universal capture, notification batching, English/PT-BR localization, and a WCAG 2.2 AA target.

## Build sequence

1. Governance and decisions.
2. Security, identity, access, audit, workflow, environments, CI/CD, and recovery.
3. CRM, client, project, deliverable, and executive core.
4. Finance, procurement, subscriptions, and reconciliation.
5. Software, websites, creative, media, marketing, equipment, and department workspaces.
6. Migration, client portal, training, and cutover.
7. Executive intelligence and controlled Autopilot.
8. Optimization only from measured need.

## Non-negotiable release gates

A capability does not release until:

- requirements and acceptance criteria are approved;
- permissions and negative RLS tests pass;
- data validation/migration behavior is defined;
- audit and observability work;
- accessibility and security checks pass;
- runbook and rollback exist;
- Staging acceptance passes;
- required humans approve;
- post-release health and business controls pass.

## How the blueprint prevents hidden gaps

The package does not pretend that unknown legal, tax, accounting, media, or vendor decisions are already facts. It closes those gaps through:

- explicit architecture decisions;
- a formal decision register with owners and deadlines;
- a requirements traceability matrix;
- a role/approval matrix;
- migration validation and reconciliation;
- release gates and definitions of done;
- threat, backup, recovery, and incident controls;
- AI capability limits and kill switches.

The immediate next action is Phase 0 approval by Kauan and Vanessa, followed by creation of the new GitHub organization/repository and the Platform/Security Foundation.
