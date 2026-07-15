# KSP Dominion Command OS
## Implementation Roadmap, Epics, Dependencies, and Release Gates

**Version:** 1.0  
**Classification:** Confidential

---

# 1. Delivery Method

Build thin end-to-end capabilities in a modular monolith. Do not build every database table before users can complete a real workflow. Every phase must produce an operationally testable result with security, audit, migration, and recovery behavior.

Recommended delivery rhythm:

- Two-week development increments.
- Weekly executive operating review.
- Continuous Preview deployment.
- Staging release candidate at least once per increment.
- Production release only after applicable gates.
- Monthly architecture, access, cost, and risk review.

Time estimates are intentionally not promised by this blueprint. Team capacity, decision speed, data quality, vendor plans, and required legal/finance review determine schedule. Dependencies and acceptance criteria are authoritative.

---

# 2. Phase 0 - Governance and Discovery

## Objective

Resolve decisions that would otherwise be hard-coded incorrectly and establish ownership, scope, evidence, and architecture.

| Epic | Deliverable | Dependencies | Exit evidence |
|---|---|---|---|
| P0-01 Executive charter | Product mandate, Kauan/Vanessa authority, escalation and deadlock rules. | None | Signed charter. |
| P0-02 Legal/entity map | Legal entities, contract ownership, banking/payment ownership, default currency. | Advisor input | Approved entity matrix. |
| P0-03 Organization/role catalog | Titles, role templates, scope model, initial users. | P0-01 | Approved role catalog. |
| P0-04 Access/approval policy | Critical actions, thresholds, separation of duties, break-glass. | P0-01, P0-03 | Approved policy and test scenarios. |
| P0-05 Data inventory/classification | Source inventory, data classes, owners, retention assumptions. | Internal sources | Data register. |
| P0-06 Finance boundary | Operational ledger, statutory platform, CPA workflow, opening-balance plan. | P0-02 | Finance ADR. |
| P0-07 Media storage ADR | Original/proxy/master storage, backup, rights, retention, cost. | Creative requirements | Approved ADR. |
| P0-08 Integration inventory | Google, GitHub, Vercel, Supabase, Figma, accounting/payment needs. | P0-05 | Integration register. |
| P0-09 Threat model | Identity, portal, finance, files/media, integrations, AI. | P0-04, P0-05 | Threat model and controls. |
| P0-10 Migration assessment | Tracker/Sheets/Drive/ClickUp/repositories and data quality. | P0-05 | Mapping and reconciliation plan. |
| P0-11 UX/workflow discovery | Executive and role-specific critical journeys. | User interviews | Approved wireflow/spec. |
| P0-12 Release scope | Define internal pilot, first client/project, and phase boundaries. | All P0 | Signed release baseline. |

### Phase 0 gate

Kauan and Vanessa approve authority, system boundaries, source-of-truth decisions, finance boundary, media architecture, and pilot scope.

---

# 3. Phase 1 - Platform and Security Foundation

## Objective

Create a production-capable foundation that no later module bypasses.

| Epic | Deliverable | Dependencies | Acceptance summary |
|---|---|---|---|
| P1-01 GitHub organization/repo | New private monorepo, two owners, teams, CODEOWNERS. | P0 | Protected main; recovery tested. |
| P1-02 Project scaffold | Next.js/TypeScript workspace, UI/domain/config/testing packages. | P1-01 | Local build/test succeeds. |
| P1-03 Supabase local/staging/prod | Separate projects and local CLI workflow. | P1-02 | Environment isolation test passes. |
| P1-04 Vercel environments | Preview, persistent Staging, Production, protected secrets. | P1-02, P1-03 | Preview cannot access Production. |
| P1-05 CI/CD | Lint/type/test/build/security/migration/RLS/Preview jobs. | P1-01..04 | Required checks protect main. |
| P1-06 Identity/MFA | Invitation, profile, MFA, suspension, session revoke. | P1-03 | Protected-role MFA tests pass. |
| P1-07 Organization hierarchy | Entity/unit/department/team/membership model. | P0-02, P0-03 | History/effective dates verified. |
| P1-08 Authorization kernel | Roles, scopes, assignments, project membership, temporary grants. | P0-04, P1-06 | Matrix tests pass. |
| P1-09 RLS baseline | Organization, project, portal, restricted, append-only policy patterns. | P1-08 | Negative tests pass. |
| P1-10 Audit kernel | Command/audit events, correlation IDs, protected search. | P1-08 | Material actions traceable. |
| P1-11 Workflow/approval kernel | Versioned workflow, approvals, timers, escalation. | P0-04, P1-10 | Two-person/no-self-approval tested. |
| P1-12 Queue/outbox/jobs | Durable event/outbox, retry, dead-letter, cron run records. | P1-03 | Duplicate/retry tests pass. |
| P1-13 File foundation | Private upload, metadata, checksum, scan hook, signed access. | P0-05, P1-09 | Unauthorized/cross-client file access denied. |
| P1-14 Global UX shell | Navigation, search shell, inbox, notifications, focus/low-energy modes. | P0-11 | Keyboard/accessibility acceptance. |
| P1-15 Localization | EN-US/PT-BR framework, date/currency/timezone standards. | P1-14 | Locale tests pass. |
| P1-16 Observability | Structured logs, errors, health, uptime, queue/integration monitoring. | P1-05 | Alert/runbook exercise. |
| P1-17 Backup/recovery | DB/file strategy, logical export, restore procedure. | P1-03, P1-13 | Staging restore demonstrated. |
| P1-18 Admin/config foundation | Reference data, feature flags, integration registry, support controls. | P1-10 | Config changes audited. |

### Phase 1 gate

Security, recovery, audit, environment isolation, protected branch, and authorization controls are demonstrated before real business data enters Production.

---

# 4. Phase 2 - CRM, Client, and Project Core

| Epic | Deliverable | Dependencies | Acceptance summary |
|---|---|---|---|
| P2-01 Accounts/contacts | Account/contact records, duplicate review, consent/preferences. | P1 | Merge/provenance and access tests. |
| P2-02 Leads/opportunities | Qualification, stages, next actions, activities, forecast. | P2-01 | No active opportunity without owner/action. |
| P2-03 Service catalog/estimate | Versioned services, assumptions, exclusions, cost/margin estimate. | P0-06, P2-02 | Version and approval preserved. |
| P2-04 Proposal/agreement | Proposal versions, approvals, signature references, exceptions. | P2-03, P1-11 | Approved exact versions immutable. |
| P2-05 Client 360 | Client profile, contacts, health, relationship, history. | P2-01..04 | Unified timeline and scoped access. |
| P2-06 Project templates | Shared kernel plus service work-package templates. | P0-11 | Template version fixed on project. |
| P2-07 Project baseline | Scope, schedule, milestones, budget, team, risks, approval. | P2-04, P2-06 | Project cannot activate without gates. |
| P2-08 Work management | Work items, dependencies, evidence, views, blocked state. | P2-07 | DoR/DoD and blocker rules pass. |
| P2-09 RAID/decision registers | Risks, assumptions, issues, decisions and review dates. | P2-07 | Stale/critical escalation works. |
| P2-10 Deliverables/review | Versioned deliverables, acceptance criteria, approvals. | P2-07, P1-13 | Approval tied to immutable version. |
| P2-11 Change control | Impact, approvals, change orders, rebaseline. | P2-07, P2-04 | Unapproved scope excluded from baseline. |
| P2-12 Status/reporting | Explainable health, status report, executive brief inputs. | P2-07..11 | Sources and freshness shown. |
| P2-13 Executive dashboard v1 | Decisions, approvals, pre-finance summary indicators, portfolio, clients, three priorities. | P2-05, P2-12 | Kauan/Vanessa acceptance. |
| P2-14 Vanessa workspace | Follow-up, completeness, meeting/docs, cross-team exceptions. | P2 core | Operational pilot accepted. |
| P2-15 Eric workspace | Portfolio, schedule, capacity, risks, changes, client status. | P2 core | Project pilot accepted. |
| P2-16 Joshua workspace | Briefs, design/front-end work, versions, feedback, links. | P2 core | Design/front-end pilot accepted. |
| P2-17 Portal foundation | Client memberships, explicit publications, approvals. | P1-09, P2-05, P2-10 | Cross-client negative tests. |

### Phase 2 gate

One low-risk live project is operated end-to-end with authoritative status, approvals, and portal isolation.

---

# 5. Phase 3 - Finance, Procurement, and Subscriptions

| Epic | Deliverable | Dependencies | Acceptance summary |
|---|---|---|---|
| P3-01 Finance master data | Chart, periods, currencies, accounts, dimensions, mappings. | P0-06, P1 | CPA/finance review. |
| P3-02 Journal/posting | Balanced draft/approve/post/reverse, immutable posted entries. | P3-01 | Invariant/property tests pass. |
| P3-03 Bank/statement reconciliation | Imports, matching, transfers, exceptions, close. | P3-02 | Statement balance reproduced. |
| P3-04 AR/invoices | Schedules, invoices, credits, payments, allocation, aging. | P3-02, P2-05 | Client balance reconciles. |
| P3-05 AP/bills | Bills, credits, approvals, payment records, aging. | P3-02 | Liability/payment lifecycle correct. |
| P3-06 Expenses/reimbursements | Receipt, duplicate/policy checks, posting, settlement. | P3-02 | No double-counting; evidence complete. |
| P3-07 Vendors/procurement | Vendor controls, request, quote, PO, receipt, match. | P3-05, P0-04 | Payee change/two-person controls. |
| P3-08 Subscriptions/seats | Terms, renewal, seats, usage, allocation, alerts. | P3-05, P1-07 | Burn and seat totals reconcile. |
| P3-09 Project economics | Revenue/budget/commitment/actual/ETC/margin. | P2-07, P3-02 | Trace to posted/source records. |
| P3-10 Cash/forecast | AP/AR and scenario-based 13-week forecast. | P3-03..09 | Assumptions and freshness visible. |
| P3-11 Monthly close | Checklist, exceptions, review, lock/reopen control. | P3 core | Full close rehearsal passes. |
| P3-12 Accounting adapter | Chosen statutory platform mapping/sync/reconcile. | P0-06, P3 core | External IDs and reconciliation work. |
| P3-13 Legacy finance migration | Tracker import, quarantine, opening balances, reconciliation. | P0-10, P3 core | Signed migration report. |

### Phase 3 gate

Opening balances and one complete monthly close reconcile to bank/processor/vendor/client evidence and the selected statutory accounting process.

---

# 6. Phase 4 - Department Workspaces

## Software and websites

| Epic | Deliverable | Dependencies | Acceptance summary |
|---|---|---|---|
| P4-S01 Product/requirements | Requirements, stories, acceptance, ADRs, traceability. | P2 | Requirement-to-evidence trace. |
| P4-S02 GitHub integration | Repo/issues/PR/commit/build references and webhooks. | P1, P4-S01 | Signature/replay/idempotency tests. |
| P4-S03 Vercel integration | Projects/environments/deployments/domains/health. | P1, P4-S02 | Release record matches deployment. |
| P4-S04 Releases/incidents | Release, deployment, rollback, defect, incident, support. | P4-S02..03 | Staging-to-prod rehearsal. |
| P4-S05 Website template | IA/design/content/SEO/privacy/accessibility/launch workflow. | P2, P4-S01 | Representative site launch passes. |

## Creative and media

| Epic | Deliverable | Dependencies | Acceptance summary |
|---|---|---|---|
| P4-C01 Creative briefs/scripts | Brief, concept, script, storyboard, approvals. | P2 | Version and approval preserved. |
| P4-C02 Production planning | Shot list, call sheet, crew, location, safety, releases. | P4-C01 | Readiness gate enforced. |
| P4-C03 Equipment | Assets, kits, reservations, custody, maintenance, incidents. | P1, P4-C02 | Check-out/in history complete. |
| P4-C04 Media ingest | Manifest, checksum, proxy, storage references, backup state. | P0-07, P1-13 | Source integrity verified. |
| P4-C05 Edit/review | Edit versions, time-coded comments, QC, approvals. | P4-C04 | Feedback/version isolation passes. |
| P4-C06 Rights/publication | Releases/licenses/usage checks, master, derivatives, publish authority. | P4-C01..05 | Publication denied on invalid rights. |

## Marketing and content

| Epic | Deliverable | Dependencies | Acceptance summary |
|---|---|---|---|
| P4-M01 Campaigns | Objective, audience, offer, channel, budget, approval. | P2, P3 | Spend/approval enforced. |
| P4-M02 Content calendar | Content lifecycle, dependencies, approvals, publish evidence. | P4-C, P4-M01 | Full content workflow passes. |
| P4-M03 Tracking/attribution | UTMs, links, forms, leads, metric snapshots, limitations. | P2, P4-M01 | Source/freshness/model visible. |
| P4-M04 Experiments/reports | Hypothesis, variants, stop rules, decision report. | P4-M03 | Outcome follows declared criteria. |

### Phase 4 gate

One software/website engagement and one creative/marketing engagement complete their representative workflows with rights, quality, release, cost, and evidence controls.

---

# 7. Phase 5 - Migration, Portal, and Operational Adoption

| Epic | Deliverable | Dependencies | Acceptance summary |
|---|---|---|---|
| P5-01 Remaining source inventory | Final legacy sources and owners. | P0-10 | Signed scope. |
| P5-02 Import framework | Mapping, validation, quarantine, provenance, reports. | P1, P3 | Rerunnable/idempotent. |
| P5-03 CRM/project migration | Active/history records and files. | P2, P5-02 | Owner sample/reconciliation. |
| P5-04 Documents/knowledge migration | Drive links/files, policies, meeting knowledge. | P1-13, P5-02 | Classification/access review. |
| P5-05 Media/assets migration | Metadata, storage refs, rights, equipment. | P4-C, P5-02 | Manifest/sample integrity. |
| P5-06 Client portal expansion | Inputs, deliverables, documents, invoices, support. | P2-17, P3, P4 | Client pilot acceptance. |
| P5-07 Training/SOPs | Role-based training and support. | All modules | Completion and usability feedback. |
| P5-08 Parallel run/cutover | Reconcile, freeze, archive, fallback. | P5-03..07 | Kauan/Vanessa cutover signoff. |
| P5-09 Access review | Full user/client/integration/seat attestation. | P5-08 | No unowned/stale protected access. |

---

# 8. Phase 6 - Executive Intelligence and Autopilot

| Epic | Deliverable | Dependencies | Acceptance summary |
|---|---|---|---|
| P6-01 KPI dictionary | Definitions, owners, sources, thresholds, freshness. | P2-P5 | Executive approval. |
| P6-02 Health/exception engine | Explainable project/client/company health and alerts. | P6-01 | Drivers reproducible. |
| P6-03 Daily/weekly/monthly briefs | Narrative with source links, decisions, priorities. | P6-02 | Accuracy/usefulness review. |
| P6-04 AI registry/policy | Agents, capabilities, tools, risk classes, budgets, kill switches. | P1, security | Policy tests and kill-switch demo. |
| P6-05 A0 summaries/search | Read/summarize with permissions and citations. | P6-04 | Leakage/injection evaluation. |
| P6-06 A1 drafts | Draft reports, plans, follow-ups, content, status updates. | P6-05 | Human acceptance/correction metrics. |
| P6-07 A2 internal actions | Bounded record creation/update with validation/undo. | P6-06 | Canary, audit, low error threshold. |
| P6-08 A3 approval executor | Proposed controlled actions, explicit human approval. | P6-07, workflow | No execution without approval. |
| P6-09 AI evaluation/operations | Test sets, feedback, cost, incidents, model change review. | P6-04..08 | Review cadence active. |
| P6-10 Development agent integration | Claude/Codex/Jules metrics and policy automation. | Engineering playbook | PR controls and review evidence. |

Autonomy must not expand because of enthusiasm. It expands only after measured quality, safety, cost, and reversibility pass approved thresholds.

---

# 9. Prioritization Method

Use weighted scoring:

```text
Priority score
= business impact
+ risk reduction
+ dependency unlock
+ frequency
+ cognitive-load reduction
+ revenue/cash effect
- implementation complexity
- migration uncertainty
- compliance uncertainty
```

A score never overrides executive strategy or a critical control issue. Security, data integrity, legal, and financial blockers can be mandatory regardless of score.

---

# 10. Pilot Selection Criteria

Select a pilot that is:

- real enough to expose workflow gaps;
- low enough risk to avoid major client impact;
- representative of several modules;
- owned by an engaged internal leader;
- supported by clean enough data;
- reversible to the prior process;
- measurable through explicit success criteria.

Recommended first pilot:

- one internal or friendly-client website/software project with a small creative/content component;
- no Restricted client data;
- straightforward invoicing;
- Kauan/Vanessa executive visibility;
- Eric project ownership;
- Joshua design/front-end contribution.

---

# 11. Adoption and Operating Readiness

Before cutover:

- role-based training completed;
- every active record has owner/next action;
- data exceptions assigned;
- access reviewed;
- SOPs/runbooks published;
- support and escalation active;
- dashboard definitions approved;
- legacy write freeze communicated;
- continuity exports available;
- executive daily/weekly review cadence scheduled.

Adoption metrics:

- active users by role;
- capture-to-triage time;
- records missing owner/action/date;
- overdue approval age;
- project update freshness;
- legacy-system writes after cutover;
- user-reported friction;
- time to find required information;
- executive brief usefulness.

---

# 12. Backlog Change Control

A new request is not inserted informally. It receives:

- problem/outcome;
- domain owner;
- urgency and impact;
- dependency/risk;
- phase fit;
- acceptance criteria;
- decision whether it replaces, delays, or follows existing scope.

Scope changes to a release baseline require explicit owner approval and updated risk/release plan.
