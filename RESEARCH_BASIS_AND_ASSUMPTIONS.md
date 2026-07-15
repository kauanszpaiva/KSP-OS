# KSP Dominion Command OS
## Research Basis, Existing Assets, and Assumptions

**Version:** 1.0  
**Date reviewed:** July 15, 2026  
**Classification:** Confidential

---

# 1. Internal KSP Assets Reviewed

## KSP Operations and Finance Tracker

The existing tracker already recognizes important distinctions among:

- cash position;
- money already paid;
- amounts still owed;
- transactions;
- bank/accounts;
- payables and debts;
- projects;
- subscriptions;
- seats and licenses;
- monthly burn;
- team, compensation, and personal expenses.

This is useful migration input and shows that KSP has begun defining operational finance. It is not a production ledger because it relies on manual spreadsheet inputs/formulas and includes data-quality issues such as an impossible date. The blueprint therefore preserves the concepts but introduces typed validation, quarantine, double-entry posting, immutable corrections, reconciliation, and period close.

## KSP Structure Meeting Notes

The notes establish that KSP has discussed:

- centralized subscriptions and company accounts;
- expense and payment tracking;
- ownership versus profit share;
- founder majority control;
- role clarification;
- five-day work rhythm;
- project/task tools and spreadsheets;
- legal/entity and disclaimer needs;
- client payment methods;
- compensation assumptions;
- recurring team collaboration.

These items are treated as historical inputs rather than final legal or financial decisions. The user's current instruction that Kauan and Vanessa occupy the top hierarchy supersedes older role descriptions for system design.

## KSP Dominion Autopilot Blueprint

The existing Autopilot concept proposes an autonomous revenue operation with opportunity, product, builder, content, sales, CRM/finance, risk/QA, and vertical agents. This blueprint retains the useful agent concepts but places them behind Command OS permissions, action classes, budgets, approvals, audit, evaluation, and kill switches.

## Existing GitHub repository

The existing `KSPDominionGroup` repository is a private static company-site repository with Vercel analytics/deployment guidance. It is not a Next.js internal application foundation. The blueprint recommends preserving it as the company website and creating a separate private `ksp-command-os` repository, ideally in a KSP-owned GitHub Organization with both executive principals as recovery-capable owners.

---

# 2. Official Platform Capabilities Used by the Blueprint

## Claude Code

The blueprint assumes Claude Code can inspect a codebase, edit multiple files, run commands, work with Git workflows, use repository instructions, and support agent/tool integrations. It is assigned the role of primary interactive implementation agent, not Production authority.

## Codex

The blueprint assumes Codex can operate through CLI/IDE/cloud workflows, read layered `AGENTS.md` instructions, work within sandbox/approval controls, perform code review and implementation, and participate in GitHub Action workflows. It is assigned independent review, testing, security/RLS analysis, and bounded implementation roles.

## Jules

The blueprint assumes Jules connects to selected GitHub repositories, runs work in an isolated VM, prepares a plan, modifies code, runs tests, and returns changes through GitHub. It is assigned only bounded tasks with explicit allowed paths and acceptance criteria.

## Vercel

The blueprint uses Vercel's Local/Preview/Production environment model and a persistent Staging/custom environment when the selected plan supports it. Preview deployments are associated with branches/pull requests. Environment-specific variables and production protection are mandatory.

## GitHub

The blueprint uses private repositories, organizations/teams, pull requests, CODEOWNERS, branch protection/rulesets, required checks, GitHub Actions, environment protection, and security features according to the selected plan.

## Supabase

The blueprint uses Postgres, Auth, Row Level Security, Storage, Edge Functions, Cron, durable Postgres-backed queues, CLI/local development, database backups, and optional PITR according to the selected plan. It explicitly recognizes that database backups do not by themselves restore Storage objects, so file backup is designed separately.

---

# 3. Assumptions Adopted for Blueprint Completeness

These are design assumptions, not final business facts:

- KSP initially operates as one internal tenant.
- The data model remains capable of multiple legal entities and currencies.
- USD is the likely initial reporting currency, subject to finance confirmation.
- KSP will use a CPA/bookkeeper-approved statutory accounting platform rather than treating Command OS as tax-filing software.
- Google Workspace remains an important document/calendar/email environment.
- Figma or an equivalent specialist design tool remains the design-source environment.
- Large original video requires a dedicated media storage/lifecycle decision.
- Payment execution remains outside autonomous Command OS behavior in the initial release.
- Client portal data is explicitly published, not inherited from internal project visibility.
- Autopilot begins with read, summary, and draft authority and earns additional bounded authority through evaluation.
- The application is built as a modular monolith until measured need justifies service extraction.
- English and PT-BR are supported from the foundation.

---

# 4. Assumptions That Must Not Be Hard-Coded

- Legal entity names, jurisdictions, and ownership.
- Worker classification.
- Equity, profit share, salary, and compensation formulas.
- Tax treatment and record-retention periods.
- Payment authority thresholds.
- Revenue-recognition rules.
- Media-license language and retention.
- Client privacy/security obligations.
- AI provider eligibility for Confidential or Restricted data.
- Provider pricing, plan limits, quotas, or availability.

These live in configuration, policy, and the decision register after qualified approval.

---

# 5. Verification Rule

Because vendor capabilities and plan limits change, implementation must verify current official documentation and subscribed-plan capability before:

- selecting versions;
- purchasing plans;
- defining custom environments;
- relying on backup/PITR targets;
- enabling GitHub security/organization controls;
- sending sensitive data to AI providers;
- committing to file/media capacity or egress assumptions.
