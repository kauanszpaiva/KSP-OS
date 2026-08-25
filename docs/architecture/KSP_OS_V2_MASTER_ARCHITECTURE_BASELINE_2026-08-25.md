# KSP OS V2 — Master Architecture Baseline

**Date:** 2026-08-25  
**Status:** Owner-approved working product architecture baseline (`DEC-0056`)  
**Drive master:** https://docs.google.com/document/d/1iqtQsOvaibgICSkVsbAt79r21tBkHnJUYvf9ZzPyWe4/edit

> This document consolidates the KSP OS V2 product architecture. It does not silently change KSP CANON, legal/public company naming, production database state, production access, payment-provider configuration, or deployment topology. Open decisions remain explicitly open.

## 1. Architecture principle

KSP OS is one coherent operating platform centered on **KSP Inc**, with four primary product surfaces sharing canonical identity/data foundations:

1. **KSP Inc** — owner/root/governance plane.
2. **KSP Command** — internal KSP operations.
3. **KSP Portal** — prospects and clients.
4. **KSP Network** — vendors, subcontractors, freelancers and partners.

Business units/verticals are scopes and capability packages inside this operating architecture, not unrelated software forks.

Existing decisions preserved by this baseline include `DEC-0044`, `DEC-0047`, `DEC-0048`, `DEC-0053` and `DEC-0055`.

## 2. KSP Inc — owner/root plane

KSP Inc is the cross-platform control plane for the designated full-control owner tier. This is a product authorization model; it does not establish or alter legal ownership/equity.

KSP Inc must be able to control every relevant KSP OS surface and business unit, including:

- create/edit/assign/unassign;
- approve/reject;
- undo/cancel;
- suspend/reactivate;
- archive/restore;
- add/remove identities;
- grant/revoke permissions;
- block/unblock access;
- inspect audit history;
- review operational, financial, client, vendor and security health.

High-impact actions remain audited and gated according to security/release policy.

KSP Inc becomes the executive cockpit for business units, users, clients, partners, projects, CRM, commercial documents, AR/AP, files, automations, AI-agent governance, access, security, KPIs and system health.

## 3. KSP Command — internal operations

Command is for people working internally for KSP, but Command membership never implies broad company visibility.

Effective access should resolve from:

`identity -> profile -> organization membership -> surface -> business unit -> workspace/client/partner -> project/assignment -> resource -> action -> explicit deny/exception -> audit`

Example: a filmmaker assigned to an event may need date/time, address, parking, transportation notes, contact, creative brief, shot list, equipment, references, files, deadline, upload, comments and delivery status. That identity does not automatically need unrelated client data, owner controls, CRM, finance or other projects.

Command should support projects, tasks, commitments, comments, @mentions, files, evidence, approvals, meetings, notifications and multiple planning views without becoming visually overpacked.

## 4. KSP Portal — prospect + client experience

Portal exposes only client-safe/prospect-safe information explicitly published into the external context.

A lead may receive limited access before becoming a client:

`lead -> limited login -> proposal -> negotiation -> acceptance -> contract -> signature -> onboarding -> active client -> scoped workspace`

Portal capabilities may include:

- proposals and estimates;
- contracts/signatures;
- project status and milestones;
- approved strategy/plans;
- deliverables and managed downloads;
- media playback/download;
- client comments/revision requests/approvals;
- content calendar and schedule;
- meetings and meeting requests;
- invoices and receipts;
- payment action when Stripe/payment infrastructure is enabled;
- client-safe timeline/Gantt/calendar/roadmap/activity;
- notifications.

### Marketing/media workflow

The client should not need loose Drive links as the primary experience.

Target flow:

`KSP upload -> internal review -> client publication -> client review/comment -> revision or approval -> schedule -> publication -> final history/delivery`

Google Drive may remain a backing integration where useful, but KSP Portal owns the user experience, permission state and workflow.

## 5. KSP Network — external workforce

Network is a standalone product surface for subcontractors, vendors, freelancers and partners. It is neither a Client Portal variant nor an internal Command membership.

Network access is scoped by partner organization, agreement, eligibility, assignment/job, project/resource and action.

### 5.1 Contracted vendor model

Recurring vendors/contractors can have:

- vendor/company profile;
- country and legal/business details;
- agreement/contract status;
- recurring capacity/allocation;
- jobs/deliverables against capacity;
- usage/remaining allowance;
- invoice submission to KSP;
- supporting documents;
- payment status;
- restricted tax/payment details;
- renewal/expiration;
- performance/delivery history.

Working design example: a Brazil-based contracted editor such as Sr. Lony can have an agreement for 15 videos/month and submit the vendor company's invoice through Network in BRL.

### 5.2 Open freelance / first-accept model

KSP may publish a scoped opportunity to eligible freelancers with scope, deliverable, compensation/budget, deadline, requirements and relevant context.

Eligible people can accept/decline. When **first-accept** mode is enabled, the first eligible person who atomically claims the single-capacity opportunity becomes assigned. Protected project files/details are unlocked only after assignment.

The claim operation must be concurrency-safe so two users cannot both win one slot.

### 5.3 Network job experience

A Network job may include:

- title and scope;
- partner-safe project context;
- date/time/location;
- address, parking and transportation notes;
- contact instructions;
- equipment/software requirements;
- deadline/turnaround;
- references/specifications;
- protected files;
- accept/decline/claim;
- scoped chat/comments;
- upload/delivery;
- review/revision state;
- compensation and currency;
- payment state.

### 5.4 AP vs AR boundary

- **Network = Accounts Payable:** KSP pays a vendor/freelancer/subcontractor.
- **Portal = Accounts Receivable:** a client pays KSP.

These financial directions must remain distinct in permissions, UX, ledger semantics and reporting.

### 5.5 Multi-currency

Multi-currency is first-class. Agreements, jobs, invoices, payments and reports preserve original ISO currency (USD, BRL, etc.). Any FX view is dated/derived metadata and never overwrites the original amount/currency.

## 6. Business-unit / vertical model

KSP Inc is the parent operating plane. Active/future verticals use the same underlying product architecture and can specialize through:

- capability sets;
- workflow templates;
- catalogs/services;
- business-unit membership;
- permissions;
- branding/document presentation;
- reporting dimensions.

The exact universal commercial-document branding rule remains open: KSP Inc masterbrand with involved verticals highlighted vs. a vertical issuer presentation for single-vertical work.

## 7. Authorization requirements

The target system is deny-by-default and least-privilege.

Required properties:

- authentication and authorization remain separate concerns;
- server/API/database/RLS enforcement independent of hidden UI;
- role templates are defaults, not the whole permission model;
- scoped grants and explicit deny overrides;
- time-bounded access where needed;
- fast revocation/offboarding;
- owner Access Control Center;
- audit trail for grant/revoke changes;
- client and partner isolation;
- negative/cross-tenant tests;
- unauthorized UI omitted while direct URL/API access also fails securely.

## 8. Shared domain model

Core shared concepts include:

- User/Profile
- Organization
- Business Unit/Vertical
- Workspace
- Membership
- Role
- Permission/Grant
- Client
- Prospect/Lead
- Partner/Vendor
- Agreement/Contract
- Project
- Assignment/Job
- Task
- Milestone
- Commitment
- Proposal
- Estimate
- Contract Document
- Invoice / Invoice Line
- Receipt
- Payment
- Expense / Payable
- Content Item
- Media Asset
- Deliverable
- Approval
- Comment/Message
- Notification
- Event/Meeting
- File/Version
- Strategy/Plan
- Automation
- Audit Event
- Security Event

Reuse shared objects across surfaces; control exposure through authorization/publication state rather than disconnected data copies.

## 9. CRM + commercial engine

Target lifecycle:

`lead -> opportunity -> discovery -> proposal/estimate -> negotiation -> acceptance -> contract -> onboarding -> delivery -> invoice -> payment -> client success -> renewal/expansion/offboarding`

CRM should own organizations, contacts, sources, activity history, next actions, pipeline stage, owner, meetings, proposals and relationship context.

## 10. Operations engine

Unified capability includes:

- projects/workspaces;
- tasks/subtasks/checklists;
- milestones/dependencies;
- Board/List/Calendar/Timeline/Gantt;
- comments/@mentions;
- assignments;
- approvals;
- attachments/versions;
- evidence of completion;
- deadlines/reminders;
- meeting records;
- client-safe publication;
- partner-safe assignment;
- full audit history.

## 11. Communication OS

Long-term KSP-native communication can include:

- direct internal messaging;
- project/job threads;
- group channels;
- comments/mentions;
- notification center;
- email notification delivery;
- preferences/escalation;
- later bounded voice/video/screen-share capabilities;
- retention/security controls.

## 12. Knowledge + SOP OS

Governed internal knowledge should cover SOPs, playbooks, onboarding, policies, templates, training, service standards, searchable decisions, ownership, versions and review dates.

## 13. Media + File Vault OS

Files are managed resources, not merely URLs.

Target capabilities include private storage, permissions, versioning, large-video handling, previews, signed downloads, upload progress/resumability, metadata, checksums where useful, asset relationships, approvals, delivery packages, retention/archive and optional Drive synchronization.

## 14. Finance + Admin OS

Target coverage includes:

- AR;
- AP;
- invoices/receipts;
- expenses;
- subscriptions;
- budgets;
- reconciled cash evidence;
- project/service margin;
- vendor invoices;
- multi-currency;
- collection/payment status;
- reporting/close support;
- restricted finance permissions.

Unknown financial values must remain unknown rather than fabricated as zero.

## 15. Workflow automation

Progressive governed automation model:

`trigger -> conditions -> scoped action -> approval gate if required -> execution -> evidence -> retry/error handling -> audit`

Examples include proposal acceptance, Network job publication, content approval, overdue invoices, deliverable upload, meeting request, expiring access and contract-capacity alerts.

## 16. AI / Copilot layer

AI is an auditable capability layer, not opaque product logic.

Potential uses:

- natural-language command/search;
- operational summaries;
- task/proposal/brief drafting;
- risk/overdue detection;
- forecasts/scenarios;
- next-action recommendations;
- meeting prep;
- classification/triage;
- QA assistance;
- invoking approved workflows/tools.

High-impact actions remain permission- and approval-gated.

## 17. Agents, subagents, MCPs and Skills

### 17.1 Orchestration

Use a central architecture/orchestration agent plus specialists instead of one unconstrained agent.

Specialist domains include architecture/program, identity/access, Postgres/Supabase/RLS, backend, frontend, UX, visual/anti-AI-originality, GitHub/release, Vercel/DevOps, files/media, CRM/commercial, finance, Network, Portal, QA, security/red team, performance/observability, accessibility and documentation/governance.

### 17.2 Tool/MCP layer

Core tools can include GitHub, Supabase, Vercel, Google Drive, Resend and later Stripe, communications, Meta/social and a purpose-built KSP OS MCP/API. Minimum necessary scopes apply.

### 17.3 Skills library

Reusable workflows should cover architecture, repository inspection, auth/RBAC/RLS, schema/migrations, releases, client onboarding, proposals, invoices, media delivery, CRM follow-up, partner assignment, security, observability, incident response and documentation.

### 17.4 Agent safety

Prefer read-only by default where practical. High-impact operations such as protected merges, production schema/data changes, secrets/env changes, access changes, destructive deletes, money movement, external sends/publication and legal acceptance remain explicitly governed.

### 17.5 Context

Agents query governed business context and approved decisions rather than treating free-form chat memory as authoritative. KSP AI Command Center remains the durable operating record.

### 17.6 Maturity

`manual SOP -> AI-assisted -> semi-automated -> approved automation -> monitored optimization`

## 18. The 17 cross-cutting quality blocks

Every module/surface is reviewed through all applicable blocks:

1. **Backend Core** — domain boundaries, APIs, transactions, validation, concurrency, idempotency, resilient errors.
2. **Security & Permissions** — authn/authz, RLS, least privilege, tenant isolation, secrets, audit.
3. **Frontend Architecture** — routes/layouts/components/state/forms/responsiveness.
4. **Interaction & Microinteraction Polish** — hover/pointer/focus/pressed/loading/empty/error/success/drag/transitions.
5. **Design System / Anti-AI-Slop** — authored KSP identity, typography, spacing, composition, iconography and non-generic patterns.
6. **Functional Completeness** — primary, secondary, edge and reverse actions including create/edit/cancel/undo/revoke/archive/restore.
7. **Agents / MCPs / Skills** — governed AI/tool architecture.
8. **QA & Reliability** — unit, integration, contract, E2E, permission, concurrency, network/failure and regression tests.
9. **DevOps & Release** — environments, CI/CD, migrations, deploy evidence, secrets and rollback.
10. **Authorized Cyber Testing** — legal/scoped red-team/blue-team testing in approved targets; test common and uncommon AI/human security failures. Never claim impossible 100% security.
11. **Data Privacy & Confidentiality** — classification, minimization, restricted data, retention and export boundaries.
12. **Observability & Alerts** — logs, metrics, traces, audit events, anomalies and actionable alerts.
13. **Incident Response & Recovery** — detect, contain, investigate, recover, communicate, restore and learn; tested backups/rollback.
14. **Performance & Scalability** — mobile/web speed, DB performance, caching, media pipelines, queues and scale budgets.
15. **Compliance & Legal Guardrails** — lawful testing, data/retention/consent, commercial controls, vendor risk and legal review where needed.
16. **Documentation, SOPs & Training** — architecture, runbooks, onboarding, owner/admin/user documentation.
17. **Product Governance & Continuous Improvement** — definition of done, release gates, originality/accessibility/security review, KPIs and continuous improvement.

## 19. Notifications

In-app notifications are a core product function. Email is a parallel event-delivery channel, not a blanket copy of every event.

Event families include assignments, mentions, comments, approvals, revision requests, due/overdue work, meetings, deliverables, proposals/contracts, invoices/payments, Network opportunities, assignment wins/losses, vendor invoices, access changes and security events.

## 20. UX principles

- simple at first glance; powerful on demand;
- progressive disclosure;
- details/description on demand rather than constant density;
- clear hierarchy and fewer repetitive cards;
- mobile-native behavior rather than squeezed desktop UI;
- keyboard/focus/touch excellence;
- meaningful interaction states;
- animation only when it improves orientation/feedback;
- reduced-motion/accessibility support;
- no generic AI-generated aesthetic;
- approved KSP brand assets/tokens only.

## 21. Future mobile / field direction

A future mobile application reuses the same identity, domain and permission model rather than creating a separate data silo.

Potential mobile capabilities include push notifications, camera/media upload, offline/poor-network resilience, signatures/approvals, field logistics and location only where justified/consented.

## 22. External-dependency principle

The long-term product direction is to make KSP OS capable of operating KSP without forcing core workflows through a patchwork of external SaaS user interfaces.

This does **not** mean rebuilding commodity infrastructure recklessly. External providers can remain infrastructure layers when they provide better reliability/security/economics; KSP OS owns the workflow, authorization model, operating data model and end-user experience.

## 23. Implementation sequence

1. Reconcile repository/database/deployment truth.
2. Finalize identity + permission graph.
3. Stabilize shared domain/data contracts.
4. Finalize four-surface routing + authorization.
5. Complete Network operating model.
6. Complete Command internal workflows.
7. Complete Portal prospect/client workflows.
8. Complete KSP Inc owner control plane.
9. Complete files/media + notifications.
10. Integrate commercial/finance/CRM.
11. Add governed automation + AI command layer.
12. Run security hardening + authorized red-team cycle.
13. Close performance/accessibility/observability gates.
14. Release through phased migrations and exact evidence gates.

Existing working capabilities should be preserved or deliberately superseded through migration rather than deleted casually.

## 24. Explicit open decisions

Do not silently assume:

- final legal/public KSP Inc naming or Canon promotion;
- dedicated KSP Inc production domain/hosting/callback topology;
- final universal commercial-document branding rule;
- exact Stripe/payment merchant/legal architecture;
- realtime chat/call/screenshare provider architecture;
- exact Drive replace-vs-integrate boundaries;
- country-specific vendor/client tax/compliance fields;
- final production role templates and permission matrix;
- mobile app release scope/timing.

## 25. Next architecture work

Define each product surface deeply, starting with **Network**, then **Command**, **Portal**, and **KSP Inc**.

For each surface define:

- personas;
- entry/onboarding;
- navigation;
- objects;
- actions and reverse actions;
- permissions;
- notifications;
- workflow/state machines;
- financial direction;
- files;
- edge cases;
- audit evidence;
- mobile behavior;
- authorized security tests;
- acceptance criteria.

---

**Governance:** This baseline is an architecture document. Production implementation, migrations, permissions, domains, payments, external sends and releases remain subject to their specific gates.