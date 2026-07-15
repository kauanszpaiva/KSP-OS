# KSP Dominion Command OS
## Complete Product, Operations, and Technical Blueprint

**Version:** 1.0  
**Date:** July 15, 2026  
**Status:** Executive review baseline  
**Audience:** Kauan Paiva, Vanessa Cardoso, Eric Lemus, Joshua Rodrigues, technical contributors, operations contributors, finance support, and approved contractors  
**Classification:** Confidential

---

# 1. Executive Mandate

KSP Dominion Group requires more than a task manager, CRM, finance spreadsheet, or collection of AI tools. It requires a governed company operating system that reduces executive cognitive load while preserving control, accountability, and data integrity across software development, websites, design, UI/UX, content creation, video production, filming, editing, marketing, sales, client operations, finance, people, documents, assets, and future business lines.

The proposed solution is the **KSP Dominion Command OS**.

The system has five simultaneous responsibilities:

1. **System of record** - maintain authoritative operational data for clients, work, money, people, documents, assets, decisions, and approvals.
2. **System of work** - give each person a role-specific workspace with the exact context, permissions, and actions required for their responsibilities.
3. **System of control** - enforce financial, security, approval, access, audit, and change-management rules.
4. **System of intelligence** - produce reliable executive summaries, forecasts, alerts, risk signals, and decision queues.
5. **System of governed execution** - allow AI and automation to perform bounded, reversible, observable work without becoming an uncontrolled authority.

The primary executive design objective is:

> KSP leadership manages decisions, exceptions, priorities, capital, risk, and direction. The system manages organization, continuity, evidence, routing, reminders, calculations, and controlled automation.

---

# 2. Core Product Split

The previous concept combined operational software and autonomous AI behavior too closely. This blueprint separates them.

## 2.1 KSP Dominion Command OS

The Command OS is the authoritative application. It owns:

- identity and access;
- organization and people;
- CRM and sales;
- clients and portals;
- projects, programs, milestones, tasks, risks, issues, and changes;
- software and website delivery records;
- creative production and media workflows;
- marketing and content operations;
- finance, procurement, subscriptions, and operational accounting;
- documents, knowledge, assets, equipment, and rights;
- approvals, decisions, notifications, and audit history;
- executive reporting and business intelligence.

## 2.2 Dominion Autopilot

Autopilot is a governed execution layer. It may:

- classify inbox items;
- summarize records and meetings;
- propose priorities;
- prepare drafts;
- generate checklists and project plans;
- detect anomalies and missing information;
- create low-risk records through approved APIs;
- schedule approved internal automation;
- prepare code changes in isolated branches;
- report outcomes and request approval.

Autopilot may not:

- use unrestricted database credentials;
- access production secrets directly;
- approve its own high-risk action;
- make or release payments;
- alter signed agreements;
- grant executive access;
- delete protected records;
- publish high-risk external content without approval;
- merge or deploy production code without required checks;
- make legal, tax, employment, or financial commitments;
- silently change business rules.

## 2.3 Mandatory control boundary

Every AI or automation action must pass through the same application services used by authorized humans. Those services enforce:

- authentication;
- authorization;
- validation;
- idempotency;
- approval requirements;
- audit logging;
- rate limits;
- data classification;
- environment boundaries;
- rollback or compensating-action rules.

---

# 3. Gap Audit of the Previous Concept

The earlier concept had a strong vision but remained vulnerable to operational, technical, financial, and governance failures. The following gaps are explicitly corrected.

## 3.1 Governance gaps

| Previous gap | Correction in this blueprint |
|---|---|
| Titles were treated as permissions. | Titles, organizational authority, application roles, project membership, resource scope, and approval authority are modeled separately. |
| Kauan and Vanessa were described as being at the top, but root ownership was ambiguous. | Both occupy Executive Command. Kauan is designated primary legal/system owner; Vanessa is executive co-authority and recovery owner. Critical actions use two-person control. |
| No separation between business ownership and system administration. | Executive authority, tenant ownership, security administration, finance authority, and technical administration are distinct permission domains. |
| No formal decision history. | A decision register records context, options, decision owner, approvers, effective date, consequences, and review date. |
| No policy lifecycle. | Policies are versioned, approved, acknowledged, reviewed, and retired with audit history. |

## 3.2 Access and security gaps

| Previous gap | Correction in this blueprint |
|---|---|
| A few broad access levels were described, but exceptions were not governed. | RBAC + ABAC + project membership + field-level restrictions + temporary grants + approval thresholds. |
| No protection against executive lockout or account compromise. | MFA, recovery owners, break-glass account, protected vendor ownership, session controls, and quarterly access reviews. |
| No distinction between view, edit, approve, export, administer, and delete. | Permission verbs and data scopes are explicit. Export and bulk actions are separately controlled. |
| No database enforcement model. | Every exposed Supabase table requires Row Level Security and test coverage. Service-role access is server-only and tightly scoped. |
| No data classification. | Public, Internal, Confidential, and Restricted classifications determine storage, sharing, export, retention, and logging behavior. |

## 3.3 Financial control gaps

| Previous gap | Correction in this blueprint |
|---|---|
| Finance was a collection of lists and totals. | Operational double-entry ledger, chart of accounts, journal entries, subledgers, AP, AR, invoices, bills, payments, credits, reconciliation, and closing periods. |
| Cash, expense, liability, and credit-card activity could be confused. | Transaction types and accounting lifecycle prevent duplicate recognition and preserve the distinction between incurred, paid, owed, and reconciled. |
| No immutable posting model. | Draft transactions can change; posted entries are immutable and corrected through reversal or adjustment entries. |
| No period close. | Monthly close checklist, lock date, reconciliation, approval, exception report, and reopening authority. |
| No tax or statutory boundary. | Command OS is the operational subledger; a CPA-approved accounting platform remains the statutory ledger unless formally replaced. |
| No data quality quarantine. | Invalid dates, amounts, duplicates, unknown accounts, and unmatched rows enter an import quarantine before posting. |
| No change orders or contract value controls. | Scope changes affect project budget and revenue only after approved change orders. |

## 3.4 Project and delivery gaps

| Previous gap | Correction in this blueprint |
|---|---|
| One generic project model was expected to cover every service. | A shared project kernel plus service-specific work packages and workflows. |
| Progress percentages could be subjective. | Weighted deliverables, milestone acceptance, evidence, and approved scope determine progress. |
| No baseline management. | Scope, schedule, budget, and deliverable baselines are versioned. Variances are reported against the approved baseline. |
| No change-control process. | Change request, impact analysis, approval, contract/change order, rebaseline, and client acknowledgement. |
| No dependency or capacity model. | Cross-project dependencies, skills, availability, allocation, and utilization are tracked. |
| No quality gates. | Department-specific definitions of ready/done and approval gates are mandatory. |
| No closeout or warranty process. | Project close, acceptance, handoff, warranty/support, archive, retrospective, and profitability review. |

## 3.5 Creative and media gaps

| Previous gap | Correction in this blueprint |
|---|---|
| Filming and editing workflows omitted rights and evidence. | Talent releases, location releases, music licenses, usage rights, client approvals, retention, and expiration dates. |
| No equipment management. | Equipment inventory, kits, custody, reservation, maintenance, damage, loss, insurance information, and check-in/out. |
| No media lifecycle. | Ingest, checksum, proxy, storage tier, backup, editing version, review, master, derivative, delivery, archive, and destruction. |
| No review-version discipline. | Every review references a specific immutable version and time-coded comments. |
| No publish authorization. | Brand, legal, client, channel, and executive approvals can be required before publication. |

## 3.6 Software delivery gaps

| Previous gap | Correction in this blueprint |
|---|---|
| Software projects were treated as task lists. | Requirements, architecture decisions, repositories, environments, PRs, tests, releases, deployments, incidents, vulnerabilities, and support obligations. |
| No environment separation. | Local, Preview, Staging, and Production environments with separate secrets and separate Supabase projects for staging and production. |
| No branch or review control. | Protected branches, CODEOWNERS, required checks, signed/verified changes where practical, and no direct production pushes. |
| Multiple AI coders could edit the same branch. | One issue, one owner, one branch/worktree, one defined scope. Agent outputs require PR review. |
| No rollback or incident process. | Release runbooks, health checks, rollback criteria, incident severity, communication, and post-incident review. |

## 3.7 AI governance gaps

| Previous gap | Correction in this blueprint |
|---|---|
| AI was described as a workforce without a complete authority model. | Action-risk levels, capability grants, tool allowlists, approvals, budgets, observability, evaluation, and kill switches. |
| No prompt/instruction governance. | Canonical AI development policy with versioned `AGENTS.md`, `CLAUDE.md`, task contracts, and policy tests. |
| No reliable action trace. | Every agent run records model/tool, actor, purpose, inputs, accessed records, proposed actions, approvals, outputs, cost, and outcome. |
| No protection from prompt injection in documents or web content. | Untrusted-content boundary, content labeling, tool isolation, least privilege, and confirmation before sensitive actions. |
| No AI quality threshold. | Evaluation sets, structured output validation, confidence rules, human review, and fallback behavior. |

## 3.8 Reliability and continuity gaps

| Previous gap | Correction in this blueprint |
|---|---|
| Backup was mentioned without restore requirements. | Defined RPO/RTO, database and object backup coverage, restore drills, runbooks, and evidence. |
| No observability. | Structured logs, traces/correlation IDs, error monitoring, uptime checks, business control alerts, and runbooks. |
| No data retention/destruction policy. | Retention schedules by record class, legal hold, archive, export, and approved destruction. |
| No migration plan from existing systems. | Inventory, mapping, cleansing, quarantine, reconciliation, parallel run, cutover, and read-only archive. |
| No formal acceptance traceability. | Business needs map to requirements, controls, tests, owners, and release gates. |

---

# 4. Vision, Outcomes, and Product Principles

## 4.1 Vision

Create a secure, understandable, and highly automated operating system that allows KSP Dominion Group to run multiple service lines from one controlled platform without forcing leadership to remember, search, or manually coordinate every operational detail.

## 4.2 Measurable business outcomes

The platform must enable KSP to:

- reduce uncaptured work and forgotten commitments;
- know the next action for every active client, opportunity, project, approval, and payable;
- obtain a reliable daily and weekly executive summary;
- calculate project revenue, direct cost, committed cost, contribution margin, and forecast;
- trace every client deliverable to approved scope and evidence;
- control access by function, project, sensitivity, and time;
- preserve an audit trail for critical actions;
- manage the complete lifecycle of software and creative production;
- detect stalled work, missing approvals, budget variance, and operational risk;
- onboard and offboard team members without losing organizational knowledge;
- safely use AI coding and operational agents without surrendering executive control.

## 4.3 Product principles

1. **One authoritative record per business concept.** Links may exist everywhere; authority must be explicit.
2. **The system must not depend on memory.** Every active record has an owner, state, next action, and review date where applicable.
3. **Show the minimum needed now.** Use progressive disclosure and role-specific dashboards.
4. **No important action without evidence.** Completion, approval, payment, delivery, and publication require evidence or an explicit exception.
5. **No silent automation.** Material automation is observable, reversible where possible, and auditable.
6. **No permission by job title alone.** Authority is explicitly granted and scoped.
7. **No production access for convenience.** Production access is least-privilege, time-bound where possible, and monitored.
8. **Financial truth is posted, reconciled, and locked.** Dashboards never become the ledger.
9. **Templates create consistency; exceptions remain possible.** Exceptions require reason and approval.
10. **AI proposes before it controls.** Autonomy expands only after measured reliability.
11. **Accessibility is a core requirement.** The system must reduce cognitive demand, not create another burden.
12. **Build a modular monolith first.** Separate business domains in code and data without premature distributed-system complexity.

---

# 5. Scope and Explicit Non-Goals

## 5.1 In scope

- Executive command center and decision management.
- Organization, people, role, skill, capacity, contractor, and access management.
- CRM, pipeline, opportunity, proposal, agreement, onboarding, and client 360.
- Project portfolio and service-delivery management.
- Software, website, and digital product delivery operations.
- Creative production, filming, photography, editing, design, and content operations.
- Marketing campaign planning, execution, attribution, and reporting.
- Operational finance, procurement, subscriptions, project economics, AP, AR, and reconciliation.
- Documents, knowledge, meeting records, forms, files, media metadata, rights, and retention.
- Equipment, software licenses, physical asset, and custody management.
- Approval, workflow, notification, escalation, and universal-inbox capabilities.
- Client portal with controlled visibility and approvals.
- Executive analytics, health indicators, forecasts, and digests.
- AI-assisted operations and AI-assisted software delivery under governance.
- Integration with GitHub, Vercel, Supabase, and approved Google services.

## 5.2 Not in the first production release

- Replacing a licensed accounting system or CPA workflow as the statutory general ledger.
- Full payroll tax calculation and filing.
- Full human-resources benefits administration.
- Building a proprietary video editor, design canvas, source-control platform, deployment platform, email service, or cloud drive.
- Unrestricted autonomous sales outreach, legal negotiation, payment release, production deployment, or external publication.
- Microservices unless a measured scaling or isolation requirement justifies them.
- A multi-company commercial SaaS product for external sale; the architecture may remain tenant-aware, but KSP internal operations are the initial target.

## 5.3 Future-compatible boundaries

The data model should support multiple legal entities, brands, business units, currencies, and client portals, but these capabilities are activated only when governance, accounting, and operational requirements are approved.

---

# 6. Terminology

- **Organization:** KSP Dominion Group operating tenant.
- **Legal entity:** A registered company or entity that owns contracts, accounts, obligations, or employees.
- **Business unit:** An internal operating division such as Software, Creative Studio, or Growth.
- **Executive Principal:** Kauan or Vanessa within the top authority tier.
- **Resource:** Any protected record, file, project, client, financial object, system setting, or integration.
- **Role:** A reusable set of permissions; not equivalent to a job title.
- **Assignment:** A role granted to a user in a specific scope and period.
- **Project membership:** A separate relationship that grants access to a project and selected related resources.
- **Approval:** An explicit authorization event under a defined policy.
- **Evidence:** File, link, message, signature, test result, receipt, or other proof supporting a business event.
- **Posted:** Financial record made immutable and included in the operational ledger.
- **Baseline:** Approved scope, schedule, cost, or revenue plan used for variance analysis.
- **Work package:** Service-specific work within a project, such as software, website, filming, editing, or marketing.
- **System of record:** The authoritative system for a data class.
- **Autopilot run:** One traceable AI/automation execution with scope, inputs, tools, outputs, cost, and outcome.

---

# 7. Organizational Authority Model

## 7.1 Executive Command

Kauan Paiva and Vanessa Cardoso occupy the top organizational tier. The system must represent equality of executive visibility while preserving clear ownership of non-delegable responsibilities.

### Kauan Paiva

**Recommended operating title:** Founder, Chief Executive Officer, and Primary System Owner.

Primary authority domains:

- company strategy and product direction;
- final authority on technology architecture and product portfolio;
- primary ownership of vendor organizations and production systems;
- final escalation for executive deadlocks;
- approval authority for restricted technical, financial, and legal actions;
- emergency suspension of automations and production access.

### Vanessa Cardoso

**Recommended operating title:** Executive Operations and Chief of Staff.

Primary authority domains:

- company-wide operational organization;
- executive follow-through and decision preparation;
- portfolio coordination and cross-department visibility;
- client and internal communication governance;
- task, meeting, document, and follow-up integrity;
- executive reporting and exception management;
- backup ownership and business-continuity authority.

### Equality and separation of duties

Both executives receive full company visibility by default. This does not mean every critical action can be performed unilaterally. The following categories require two-person approval or one approver plus an emergency protocol:

- granting or removing Executive Principal access;
- changing bank, payment processor, payee, tax, or payout destination information;
- approving a payment above the configured threshold;
- changing production authentication, service-role, encryption, or recovery credentials;
- deleting an organization, legal entity, production project, or protected archive;
- changing retention rules for Restricted records;
- bulk exporting client, people, finance, or credential data;
- bypassing required production checks;
- reopening a closed financial period;
- disabling audit, backup, or security monitoring;
- increasing an AI agent's authority to a Restricted action class.

The system must prohibit self-approval when a policy requires two actors.

## 7.2 Management and functional leadership

### Eric Lemus

**Recommended operating title:** Head of Project Delivery / Project Manager.

Primary workspace:

- portfolio and project planning;
- work allocation and coordination;
- schedule, milestone, dependency, risk, and issue management;
- change-request preparation;
- client status preparation;
- team capacity and delivery quality;
- cross-functional handoffs;
- project closeout.

Eric may see commercial and budget information needed to manage assigned projects, but company-wide cash, payroll, executive compensation, banking credentials, ownership, and unrelated legal records remain outside his default scope.

### Joshua Rodrigues

**Recommended operating title:** Product Design and Front-End Lead.

Primary workspace:

- product discovery support;
- information architecture;
- UX and UI design;
- design systems;
- front-end architecture and implementation;
- accessibility review;
- prototype and design approval preparation;
- visual QA and browser/device QA;
- creative design when assigned.

Joshua receives access by project and work package. He may be a technical or design approver without receiving general finance or executive access.

## 7.3 Role templates for future contributors

The platform ships with templates, not hard-coded people:

- Software Engineering Lead.
- Back-End Engineer.
- Front-End Engineer.
- Mobile Engineer.
- QA Engineer.
- Product Designer.
- Graphic Designer.
- Creative Director.
- Producer.
- Capture Specialist / Videographer.
- Photographer.
- Editor / Motion Designer.
- Content Strategist.
- Copywriter.
- Social Media Manager.
- Marketing Manager.
- Paid Media Specialist.
- Sales Representative.
- Client Success Manager.
- Finance Operator.
- Bookkeeper / CPA Viewer.
- Legal Reviewer.
- Contractor / Freelancer.
- Intern / Assistant.
- Client Administrator.
- Client Contributor.
- Client Approver.

Each template defines a starting permission set. Actual access still requires scope, project membership, and effective dates.

## 7.4 Employment and compensation are separate from access

Equity, profit share, salary, contractor rate, employment status, and application access are independent records. Changing one must never silently change another. Compensation records are Restricted and accessible only through finance/people permissions.

---

# 8. User Experience Model

## 8.1 One platform, personalized operating surfaces

All users enter the same product, but navigation, dashboards, notifications, commands, fields, and records are determined by their role and assignments. The system does not create separate disconnected applications for each department.

## 8.2 Global shell

The global shell contains:

- universal search;
- universal inbox;
- command palette;
- notifications and approvals;
- current organization and workspace;
- personal focus state;
- quick capture;
- help and policy context;
- account/security controls.

## 8.3 Executive Command Center

The default executive view must answer the following without requiring navigation:

- What requires my decision today?
- What is financially due or at risk?
- Which client relationship requires attention?
- Which project is late, blocked, over budget, under-scoped, or unhealthy?
- Which department has capacity or delivery problems?
- Which sales opportunity is most valuable or most likely to stall?
- Which contract, proposal, invoice, change order, or approval is waiting?
- Which production, security, legal, or reputation risk requires escalation?
- What changed since the previous review?
- What is the single best next executive action?

### Executive widgets

- Decision queue.
- Approval queue.
- Three highest-impact priorities.
- Company health summary.
- Cash and liquidity snapshot.
- Accounts receivable and payable aging.
- Revenue, committed revenue, weighted pipeline, and forecast.
- Portfolio health and margin risk.
- Client health and communication gaps.
- Delivery capacity and overload.
- Critical incidents and security alerts.
- Upcoming obligations and renewals.
- Autopilot activity, cost, exceptions, and approval requests.
- Daily and weekly narrative digest.

### Executive health states

Health is calculated from evidence, not manually selected alone. Each health state includes the drivers.

- **Healthy:** within approved tolerance and no unaddressed critical risk.
- **Watch:** leading indicator is outside tolerance or information is stale.
- **At Risk:** a material objective is likely to fail without intervention.
- **Critical:** contractual, financial, security, delivery, or reputation impact is occurring or imminent.
- **Unknown:** required information is missing or stale; unknown is never treated as healthy.

## 8.4 Vanessa's Executive Operations Workspace

Vanessa receives the same company-level visibility as Kauan, with an operating emphasis on:

- unresolved executive follow-ups;
- records missing owner, next action, date, or evidence;
- projects without recent updates;
- client communications requiring preparation;
- meeting preparation and decision capture;
- documents requiring review, signature, classification, or filing;
- overdue approvals and escalations;
- subscription, contract, and renewal calendar;
- cross-department dependency resolution;
- daily brief preparation for Kauan;
- operational policy compliance.

The workspace should allow Vanessa to convert disorganized input into owned, dated, and traceable work without granting her unilateral ability to perform two-person critical actions.

## 8.5 Eric's Project Delivery Workspace

Eric's default view includes:

- active portfolio by health, due date, margin, and client;
- milestones at risk;
- blocked work and dependencies;
- tasks without owner or estimate;
- overdue client inputs and approvals;
- pending change requests;
- team allocation and capacity;
- delivery quality and rework;
- project budget and committed direct cost within authorized scope;
- project status-report preparation;
- launch, shoot, publication, and deployment calendars;
- closeout readiness.

## 8.6 Joshua's Product Design and Front-End Workspace

Joshua's default view includes:

- assigned projects and work packages;
- briefs, requirements, user flows, and acceptance criteria;
- design tasks and front-end implementation tasks;
- design-system components and status;
- review queues and feedback grouped by version;
- accessibility findings;
- linked Figma files, repositories, branches, PRs, and preview deployments;
- blockers and requested decisions;
- upcoming deliverables and quality gates.

## 8.7 Capture Workspace

The capture specialist receives a mobile-first, low-complexity view:

- call time, location, route, contact, and schedule;
- approved brief, script, shot list, and references;
- equipment kit and check-out status;
- releases and permits status;
- safety and location notes;
- capture checklist;
- incident/problem reporting;
- file-card and media-ingest instructions;
- completion confirmation and handoff.

## 8.8 Editing Workspace

The editor receives:

- prioritized edit queue;
- approved brief and story intent;
- source media, proxies, audio, graphics, brand kit, and license status;
- format, duration, aspect ratio, channel, caption, and export requirements;
- immutable review versions;
- time-coded feedback and conflict resolution;
- due date and reviewer chain;
- export, QC, delivery, and archive checklist.

## 8.9 Marketing and Content Workspace

The workspace includes:

- campaign and content objectives;
- audience, message, offer, channel, and budget;
- content calendar;
- production dependencies;
- approval and publishing states;
- UTM and attribution configuration;
- leads, conversion, spend, and outcome reporting;
- brand and legal constraints;
- experiment hypotheses and decision rules.

## 8.10 Client Portal

The client portal is a separate security surface and never exposes internal routes through UI hiding alone. It contains only explicitly published or client-visible records:

- contracted scope and approved changes;
- progress and milestone summary;
- client tasks and requested inputs;
- scheduled meetings;
- deliverables and versioned approvals;
- invoices, payment status, and receipts;
- documents shared with the client;
- support requests and agreed service levels;
- communication history selected for client visibility.

Internal comments, costs, margin, team performance, risks marked internal, other clients, and private decision records remain hidden.

---

# 9. Cognitive Accessibility and Simplicity Requirements

The product is specifically designed to reduce executive-function load.

## 9.1 Universal inbox

Any authorized user can quickly capture:

- a thought;
- voice note;
- message;
- document;
- receipt;
- link;
- lead;
- client request;
- task;
- risk;
- decision;
- expense;
- meeting note;
- image or media file.

Capture does not require immediate classification. The triage process proposes type, owner, related records, urgency, and next action. Low-confidence classifications remain in triage.

## 9.2 Do Next

The system must produce one recommended next action based on:

- urgency;
- impact;
- dependency relief;
- executive authority requirement;
- due date;
- effort estimate;
- energy or focus mode;
- current context;
- blocked/unblocked state.

The recommendation explains why it is first and can be accepted, deferred, delegated, split, or rejected.

## 9.3 Three-priority limit

The daily executive surface shows no more than three primary priorities. Additional work remains accessible but does not compete visually.

## 9.4 Focus mode

Focus mode shows:

- one outcome;
- one next action;
- reason and deadline;
- required context and files;
- a small checklist;
- timer or session control if desired;
- pause, note blocker, ask for help, or complete actions.

## 9.5 Low-energy mode

Low-energy mode filters for short, low-cognitive-load, unblocked actions that still create progress. It must never label or shame the user.

## 9.6 Notification discipline

- Batch non-urgent notifications.
- Do not notify a user for actions they cannot perform.
- Escalate by policy, not by repeated noise.
- Allow quiet hours and role-specific channels.
- Use an exception digest rather than continuous alerts for normal activity.
- Critical security and financial alerts bypass batching according to policy.

## 9.7 Interaction standards

- WCAG 2.2 AA target.
- Keyboard-accessible workflows.
- Visible focus states.
- Screen-reader labels and semantic structure.
- Reduced motion option.
- Plain-language status names.
- No color-only meaning.
- Confirmation for destructive or irreversible actions.
- Undo or compensating action where possible.
- Consistent date, currency, timezone, and number formatting.
- English and Brazilian Portuguese interface support, with business records retaining their original language.

---

# 10. Functional Architecture

The product is a modular monolith with explicit domain boundaries. Modules share identity, audit, workflow, search, files, and notification services but own their business rules.

## 10.1 Identity, Organization, and Access

### Purpose

Establish who a user is, which organization and legal entity they belong to, what authority they have, where that authority applies, and when it begins or ends.

### Core capabilities

- Invitation, activation, suspension, recovery, and offboarding.
- MFA enrollment and assurance-level enforcement.
- Organization, legal entity, business unit, department, team, and location hierarchy.
- Job titles separated from permission roles.
- Role assignments with resource scope and effective dates.
- Project membership and client-portal membership.
- Temporary and emergency access.
- Delegation with non-delegable permissions.
- Access-review campaigns and attestations.
- Session/device visibility and revocation.
- Impersonation only for approved support scenarios, with banners and audit.

### Key rules

- Deny by default.
- Every active human account must map to a real person.
- Shared human accounts are prohibited.
- Suspended users lose active sessions and integration tokens.
- Offboarding must transfer record ownership before access ends.
- Executive, finance, security, and production privileges require MFA.
- No user may approve their own elevation to a protected role.

## 10.2 People, Capacity, and Contractor Operations

### Purpose

Manage the operational relationship between KSP and employees, executives, contractors, freelancers, advisors, and vendors without conflating access, employment, compensation, or ownership.

### Core capabilities

- Person profile and contact data.
- Engagement type and status.
- Skills, proficiency, certifications, languages, and equipment qualifications.
- Availability, work schedule, time off, and capacity.
- Project allocation and workload forecast.
- Rate cards and internal cost rates with restricted access.
- Contractor agreement, insurance, tax-form, and expiration tracking.
- Onboarding and offboarding checklists.
- Performance notes and formal reviews with strict privacy.
- Emergency contact and sensitive records in Restricted storage.

### Key rules

- Capacity is planned using availability minus approved allocations and absence.
- Utilization metrics must distinguish billable, non-billable, internal, and unavailable time.
- The system must not infer employment status from role or hours.
- Sensitive people records are isolated from ordinary project access.

## 10.3 CRM, Sales, and Revenue Pipeline

### Purpose

Track relationships and revenue opportunities from first signal through qualification, proposal, agreement, win/loss, and client onboarding.

### Core entities

Account, contact, lead, opportunity, activity, qualification, need, service interest, estimate, proposal, quote, pricing version, discount request, agreement, signature status, forecast category, competitor, loss reason, referral source, and next action.

### Core capabilities

- Unified account/contact history.
- Duplicate detection and merge review.
- Lead source and consent tracking.
- Qualification framework.
- Opportunity stage with exit criteria.
- Service configuration and pricing version.
- Proposal generation and approval.
- Discount and non-standard-term approval.
- Expected revenue, probability, close date, and forecast category.
- Follow-up automation with human review for external messages.
- Win/loss analysis.
- Handoff checklist from sales to delivery.

### Key rules

- Every active opportunity requires an owner, next action, and next-action date.
- Opportunity probability is stage-based by default; manual overrides require a reason.
- A proposal references an immutable pricing and scope version.
- A won opportunity cannot create an active project until required agreement and deposit gates are satisfied or an executive exception is recorded.
- External outreach must honor consent, channel, and do-not-contact rules.

## 10.4 Client 360 and Client Success

### Purpose

Provide one controlled view of the complete client relationship.

### Core capabilities

- Client profile, legal name, billing data, contacts, addresses, language, and preferences.
- Relationship owner and delivery owner.
- Active and historical opportunities, agreements, projects, invoices, payments, meetings, support cases, feedback, and documents.
- Client health and risk drivers.
- Communication cadence and last meaningful contact.
- Satisfaction, NPS/CSAT where appropriate, complaints, and service recovery.
- Client portal user and access management.
- Renewal, upsell, cross-sell, and offboarding workflows.

### Key rules

- Client health must expose the factors behind the score.
- Client-visible information is published explicitly; internal information is never client-visible by default.
- Material complaints create an issue, owner, response deadline, and resolution evidence.

## 10.5 Portfolio, Programs, and Projects

### Purpose

Control all client and internal initiatives through a common project kernel and service-specific work packages.

### Project kernel

- Project code and name.
- Client or internal sponsor.
- project owner and project manager.
- service lines and work packages.
- approved scope baseline.
- schedule baseline and milestones.
- budget and revenue baseline.
- team and capacity plan.
- dependencies.
- assumptions and constraints.
- risks, issues, decisions, and changes.
- deliverables and acceptance criteria.
- communication plan.
- health, confidence, and forecast.
- closure and support state.

### Core capabilities

- Project templates and template versioning.
- Stage gates and definition of ready/done.
- Work breakdown, milestones, tasks, subtasks, and checklists.
- Kanban, list, calendar, timeline, workload, and dependency views.
- Time estimates and optional time tracking.
- Baseline versus current forecast.
- Risk and issue registers.
- Decision and assumption logs.
- Change requests and rebaseline.
- Deliverable versions and approvals.
- Status reports generated from authoritative records.
- Retrospective, lessons learned, and closeout.

### Key rules

- Every active project requires a project owner, manager, contract/sponsor, next milestone, and current health explanation.
- Progress is derived from weighted accepted deliverables or milestones; manual progress overrides are labeled and justified.
- A task cannot be completed without required evidence when the template specifies evidence.
- A blocked task records blocker owner and expected resolution date.
- Scope additions do not enter active delivery until a change request is approved.
- Closed projects are read-only except for authorized corrections or support records.

## 10.6 Software, Website, and Digital Product Delivery

### Purpose

Connect product and software work to the business project while preserving engineering discipline.

### Core entities

Product, application, repository, requirement, user story, acceptance criterion, architecture decision, design artifact, environment, branch, pull request, build, test run, release, deployment, feature flag, defect, vulnerability, incident, service-level objective, support obligation, and technical debt item.

### Core capabilities

- Discovery and requirements traceability.
- Architecture Decision Records.
- Design and prototype linkage.
- GitHub repository, issue, branch, PR, and commit linkage.
- Vercel project, environment, deployment, domain, and health linkage.
- Test plans and evidence.
- Release notes and approval.
- Production deployment and rollback record.
- Defect, incident, vulnerability, and technical debt management.
- Warranty and maintenance period tracking.
- Credential reference metadata without storing plaintext secrets.

### Key rules

- A requirement must map to acceptance criteria and verification evidence.
- Production deployment requires required checks, approved reviewers, release record, rollback plan, and environment authorization.
- AI-authored code follows the same standards as human-authored code.
- Secrets are referenced by provider and key name; secret values never enter ordinary application records, prompts, tickets, or logs.
- Incidents preserve an immutable timeline and receive a post-incident review at the required severity.

## 10.7 Creative Studio and Media Production

### Purpose

Manage content, design, filming, photography, audio, editing, motion, review, delivery, and media rights from brief through archive.

### Core entities

Creative brief, concept, script, storyboard, shot list, call sheet, schedule, location, participant, release, permit, production task, equipment kit, capture card, media asset, ingest batch, checksum, proxy, edit project, edit version, time-coded comment, music/license, graphic, caption, QC result, master, derivative, delivery, publication authorization, archive package, and retention rule.

### Core capabilities

- Brief and concept approval.
- Script, storyboard, shot-list, and call-sheet workflow.
- Talent, location, music, stock, and usage-rights management.
- Crew scheduling and role assignment.
- Equipment reservation and check-out/in.
- Capture-day mobile checklist and incident reporting.
- Media ingest with file manifest and checksum.
- Proxy and edit-handoff management.
- Versioned review and time-coded feedback.
- Technical QC and content QC.
- Master and derivative exports by channel specification.
- Delivery evidence and client approval.
- Archive, storage tier, legal hold, and destruction scheduling.

### Key rules

- Capture cannot be marked ready when required release, location, safety, or equipment gates are incomplete unless an authorized exception is recorded.
- Source media is immutable after ingest; edits create new versions or derivatives.
- Every client review points to a specific version.
- Publication requires valid rights for the intended channel, geography, duration, and use.
- Media deletion follows retention, contract, legal hold, and backup policy.

## 10.8 Marketing, Content, and Growth

### Purpose

Connect strategy, production, publication, spend, leads, conversions, and revenue evidence.

### Core entities

Campaign, objective, audience, offer, message, channel, content item, content calendar, creative, copy, approval, publication, UTM definition, landing page, form, experiment, budget, spend, metric snapshot, lead attribution, conversion, and report.

### Core capabilities

- Campaign brief and success criteria.
- Editorial and content calendars.
- Cross-channel content adaptation.
- Production dependency tracking.
- Brand, legal, client, and executive approval.
- Publication scheduling and evidence.
- UTM governance and link registry.
- Spend and budget control.
- Lead-source and opportunity attribution.
- Experiment hypothesis, variant, stop rule, and outcome.
- Performance reporting with data-source freshness.

### Key rules

- A campaign cannot be called successful without a predeclared objective and measurement window.
- Published content retains the approved version and publication evidence.
- Paid spend above threshold requires approval before commitment.
- Attribution reports disclose model, data source, and known limitations.
- AI-generated public content requires the review level assigned to its risk class.

## 10.9 Finance, Procurement, and Subscriptions

### Purpose

Provide a reliable operational financial control layer while integrating with the future statutory accounting system.

### Core financial domains

- Chart of accounts.
- Operational general journal.
- Bank, cash, card, processor, and wallet accounts.
- Accounts receivable.
- Accounts payable.
- Customer invoices and credit notes.
- Vendor bills and vendor credits.
- Payments, receipts, refunds, and deposits.
- Purchase requests and purchase orders.
- Expenses and reimbursements.
- Subscriptions and software seats.
- Project budgets, committed cost, actual cost, and forecast.
- Revenue recognition support metadata.
- Tax category and jurisdiction metadata.
- Bank and processor reconciliation.
- Monthly close and lock.
- Cash forecast and scenario planning.

### Core rules

- Monetary amounts use integer minor units or exact decimal types; never floating point.
- Currency is required on every monetary transaction.
- Financial dates use validated date/time types and explicit timezone rules.
- Drafts may be edited; posted entries are immutable.
- Corrections use reversal and replacement entries.
- Journal entries must balance before posting.
- Every posting records source, actor, timestamp, period, and evidence.
- Card purchases create a liability and expense; paying the card settles the liability and does not duplicate the expense.
- Reconciled entries cannot be altered without authorized unreconciliation and audit.
- Closed periods reject ordinary postings.
- Vendor bank-detail changes require independent verification and protected approval.
- Dashboard totals must reconcile to posted records and disclose freshness.
- Operational and statutory ledger synchronization must preserve external IDs and reconciliation status.

### Subscription controls

Each subscription records vendor, product, plan, seats, assigned users, billing cycle, currency, amount, tax, payment account, department, project allocation, contract, renewal date, notice period, auto-renewal, cancellation link/process, owner, business justification, usage signal, and approval status.

The system produces renewal, unused-seat, price-increase, duplicate-tool, and unallocated-cost exceptions.

## 10.10 Vendors, Procurement, and External Parties

### Purpose

Control spending and delivery dependencies involving software providers, contractors, studios, consultants, suppliers, and other external parties.

### Core capabilities

- Vendor profile, contacts, category, status, risk, and ownership.
- Tax and payment records under Restricted access.
- Due diligence and conflict-of-interest declaration.
- Agreement, statement of work, insurance, and expiration.
- Purchase request, quote comparison, approval, PO, receipt, bill, and payment matching.
- Performance, issue, and renewal history.
- Contractor access linked to active agreements and project assignments.

### Key rules

- A vendor cannot receive payment until required identity, tax, approval, and payment-verification controls are satisfied.
- Vendor access expires automatically at the end of the approved engagement unless renewed.
- Material conflicts of interest must be disclosed and approved.

## 10.11 Documents, Files, Knowledge, and Records

### Purpose

Provide discoverability, provenance, access control, version history, and retention without pretending the application must physically store every file.

### Core entities

Document record, file object, external-file reference, version, folder/collection, document type, classification, owner, client/project link, approval, signature, retention class, legal hold, archive status, access grant, and knowledge article.

### Core capabilities

- Upload or link from approved external storage.
- Metadata, full-text search, tags, and relationships.
- Version control and approved version.
- Templates and controlled generation.
- Signature-state tracking.
- Knowledge articles, SOPs, policies, FAQs, and lessons learned.
- Retention, legal hold, archive, export, and destruction workflow.
- Virus/malware scan and file-type controls.
- Signed, expiring file access for private objects.

### Key rules

- The system stores metadata and authority even when bytes live in Google Drive or another approved media store.
- Restricted files require stronger access and export controls.
- Deleting a link must not delete an external authoritative file unless a separate approved deletion workflow exists.
- Approved documents are immutable versions; revisions create new versions.

## 10.12 Equipment, Licenses, and Asset Management

### Purpose

Track physical equipment, software licenses, domains, credentials references, and other controlled assets.

### Core capabilities

- Asset register and unique asset ID.
- Purchase, warranty, depreciation metadata, location, custodian, and status.
- Equipment kits and included components.
- Reservation, check-out, transfer, check-in, inspection, damage, loss, and maintenance.
- Domain registry and renewal.
- Software-seat assignment and reclaim.
- Credential-vault reference, owner, rotation date, and recovery status.
- Disposal or sale approval and evidence.

### Key rules

- Restricted secret values are never stored in this module.
- Asset custody history is append-only.
- Lost, stolen, or compromised assets trigger an incident and access-revocation workflow.
- A contributor cannot be fully offboarded while assets or licenses remain assigned without an approved exception.

## 10.13 Meetings, Communications, and Universal Inbox

### Purpose

Convert communication into durable, actionable, and searchable operational records.

### Core capabilities

- Calendar event linkage.
- Meeting agenda, attendees, notes, transcript reference, decisions, actions, and follow-ups.
- Email/message reference with privacy controls.
- Universal capture and triage.
- AI-assisted classification and extraction.
- Communication templates and approval.
- Client communication log.
- Shared mailbox or channel integration in future phases.

### Key rules

- Extracted tasks, decisions, dates, or amounts are proposals until confirmed when confidence or risk requires it.
- Private communication is not automatically exposed to all project members.
- A meeting is not complete until decisions and actions have owners and due dates or are explicitly marked as none.

## 10.14 Workflow, Approvals, and Automation

### Purpose

Provide a reusable control plane for state transitions, approvals, timers, escalations, integrations, and AI actions.

### Core capabilities

- Versioned workflow definitions.
- Workflow instances and step state.
- Sequential, parallel, conditional, threshold, and two-person approvals.
- Delegation and substitute approvers.
- Due dates, reminders, escalation, expiry, and cancellation.
- Rules based on amount, classification, project, client, department, risk, or environment.
- Durable queues, retry, idempotency, and dead-letter handling.
- Outbox events for reliable integration.
- Manual override with reason and authority.

### Key rules

- A workflow instance retains the definition version with which it started.
- A rejected action cannot silently continue through another path.
- Approval records include the object version approved.
- Automation must be idempotent and safe to retry.
- Failed actions surface to an exception queue; they are never silently discarded.

## 10.15 Notifications, Escalations, and Digests

### Purpose

Deliver the right information through the right channel without creating alert fatigue.

### Core capabilities

- In-app notification center.
- Email and future approved channel delivery.
- User preferences and quiet hours.
- Severity and urgency.
- Batched digests.
- Escalation policies.
- Delivery, open, acknowledgement, and resolution status.
- Notification templates with localization.

### Key rules

- Critical alerts require acknowledgement.
- Routine status changes are summarized rather than individually pushed.
- Notification links respect permissions at click time.
- Sensitive content is minimized in external notification bodies.

## 10.16 Executive Intelligence and Reporting

### Purpose

Turn authoritative records into explainable executive information.

### Core capabilities

- Daily executive brief.
- Weekly operating review.
- Monthly business review.
- Portfolio, client, sales, finance, capacity, marketing, and quality dashboards.
- Forecasts and scenario comparisons.
- Exception and anomaly reporting.
- KPI definitions, owners, thresholds, source, freshness, and calculation versions.
- Narrative summaries with citations to underlying records.
- Decision queue and business review packs.

### Key rules

- Every metric displays definition, source, time range, last refresh, and exclusions.
- AI narratives link to underlying records and distinguish facts from recommendations.
- Unknown or stale data is visibly labeled.
- Executive summaries must never replace the ability to inspect evidence.

## 10.17 AI and Autopilot Governance

### Purpose

Safely apply AI to operations and development.

### Core capabilities

- Agent registry and purpose.
- Capability and tool grants.
- Action-risk levels.
- Prompt/instruction versions.
- Model and provider configuration.
- Budget and rate limits.
- Run history, accessed resources, outputs, approvals, and cost.
- Evaluation datasets and quality metrics.
- Human feedback and incident reporting.
- Kill switch by agent, capability, integration, or organization.

### Action classes

- **A0 - Read and summarize:** no external side effect; access remains permission-scoped.
- **A1 - Draft:** creates a private draft or recommendation.
- **A2 - Low-risk internal write:** creates or updates reversible internal records within a narrow scope.
- **A3 - Controlled external or material action:** requires explicit human approval before execution.
- **A4 - Restricted action:** payments, legal commitments, executive access, production secrets, destructive actions, or high-risk publication; AI execution is prohibited or requires a separately approved supervised procedure.

### Key rules

- Agents receive short-lived, least-privilege credentials.
- Untrusted document, email, issue, or web content cannot override system policy.
- Agent output must pass schema and policy validation.
- High-risk or low-confidence output is routed to review.
- Agent costs are attributable to project, department, or company overhead.

## 10.18 Administration, Audit, and Configuration

### Purpose

Operate the platform without compromising business evidence.

### Core capabilities

- Feature flags and rollout controls.
- Reference data and status configuration.
- Workflow and approval policy administration.
- Integration and webhook administration.
- Data import/export jobs.
- Audit search and protected export.
- Retention and legal-hold administration.
- Health, job, queue, and integration monitoring.
- Support tooling and diagnostic bundles.

### Key rules

- Business audit records cannot be edited by administrators.
- Configuration changes are versioned and audited.
- Production configuration follows change-control policy.
- Support impersonation is time-limited, visible, approved where required, and logged.

---

# 11. End-to-End Operating Workflows

Each workflow is implemented through versioned state machines, approval policies, events, evidence, and exception handling. Detailed entity and state definitions appear in `DOMAIN_DATA_AND_WORKFLOWS.md`.

## 11.1 Lead to Cash

1. Capture or import lead.
2. Validate identity, source, consent, and duplicates.
3. Assign owner and qualification deadline.
4. Qualify need, authority, timing, fit, budget, and risk.
5. Create opportunity and service configuration.
6. Estimate scope, schedule, resources, direct cost, margin, and risks.
7. Review pricing and non-standard terms.
8. Generate versioned proposal.
9. Obtain internal approval.
10. Send and track client response.
11. Negotiate through controlled revisions.
12. Mark won only with accepted commercial evidence.
13. Execute agreement/signature workflow.
14. Issue deposit invoice where required.
15. Confirm payment or approved exception.
16. Create client/project records from the accepted version.
17. Complete sales-to-delivery handoff.
18. Deliver, invoice milestones, collect, reconcile, and close.

Exceptions include duplicate lead, rejected pricing, expired proposal, non-standard legal term, payment failure, scope mismatch, client inactivity, and no-deposit executive exception.

## 11.2 Client Onboarding

1. Confirm legal and billing identity.
2. Confirm client contacts and portal roles.
3. Record communication preferences, language, and meeting cadence.
4. Validate agreement, scope, deposit, data-processing, and confidentiality requirements.
5. Collect brand, technical, account, content, access, and asset inputs through controlled requests.
6. Create project and work-package baselines.
7. Assign team and capacity.
8. Hold kickoff and record decisions/actions.
9. Publish approved client-visible plan.
10. Mark onboarding complete only when required gates pass.

## 11.3 Project Initiation and Baseline

1. Select project and work-package templates.
2. Populate scope from accepted proposal/change order.
3. Define deliverables and acceptance criteria.
4. Define milestones, dependencies, schedule, budget, and resource plan.
5. Identify assumptions, risks, constraints, client responsibilities, and required approvals.
6. Conduct readiness review.
7. Approve baseline.
8. Activate project and notify participants.

## 11.4 Project Change Control

1. Capture change request from client, team, risk, defect, or dependency.
2. Prevent unapproved work from being represented as committed scope.
3. Analyze impact on outcome, deliverables, schedule, cost, revenue, margin, staffing, rights, and risk.
4. Select internal approval path.
5. Generate client change order when commercial impact exists.
6. Receive client acceptance and payment/deposit if required.
7. Version and approve new baseline.
8. Communicate changes and update delivery plan.
9. Preserve prior baseline and variance history.

## 11.5 Software Delivery

1. Confirm discovery and requirements readiness.
2. Approve architecture and security decisions proportionate to risk.
3. Link requirement to issue/task and acceptance criteria.
4. Create scoped branch/worktree.
5. Implement with human or AI assistance.
6. Run formatting, lint, type, unit, integration, RLS, security, accessibility, and build checks as applicable.
7. Open PR with evidence and risk notes.
8. Obtain CODEOWNERS and domain review.
9. Deploy Preview and perform QA.
10. Merge to protected branch after checks.
11. Deploy to Staging and execute release acceptance.
12. Approve production release.
13. Deploy, run health checks, and monitor.
14. Roll back if release criteria fail.
15. Publish release notes and close traceability.

## 11.6 Website Delivery

1. Discovery and objective confirmation.
2. Content and asset inventory.
3. Sitemap and information architecture.
4. Wireframes and client/internal approval.
5. Visual design and accessibility review.
6. Content creation and legal/brand review.
7. Implementation and CMS/integration configuration.
8. SEO, analytics, consent, performance, accessibility, browser, device, form, and security QA.
9. Client acceptance.
10. Domain/DNS readiness and launch plan.
11. Production launch and monitoring.
12. Handoff, training, warranty, and maintenance transition.

## 11.7 Creative Content Production

1. Campaign/content request or idea capture.
2. Brief, objective, audience, format, channel, budget, and rights requirements.
3. Concept and script development.
4. Internal/client concept approval.
5. Shot list, storyboard, call sheet, crew, location, releases, permits, equipment, and safety readiness.
6. Capture-day check-in and evidence.
7. Media ingest, checksum, manifest, proxy, backup, and handoff.
8. Edit version creation.
9. Internal review and QC.
10. Client review of immutable version.
11. Controlled feedback resolution.
12. Final QC, captions, rights validation, and export.
13. Delivery or publication approval.
14. Publish/deliver with evidence.
15. Archive source, project, master, derivative, release, and license records.
16. Measure performance where applicable.

## 11.8 Marketing Campaign

1. Define business objective and measurable success criteria.
2. Define audience, offer, message, channels, budget, time window, and attribution plan.
3. Approve campaign and spend.
4. Create content and landing experiences through production workflows.
5. Validate tracking, forms, consent, UTMs, routing, and CRM ownership.
6. Launch with evidence.
7. Monitor spend, delivery, leads, conversion, and anomalies.
8. Apply preapproved optimization rules or request approval.
9. End experiment/campaign by declared stop rule.
10. Reconcile spend and attribution.
11. Produce outcome report and decision: scale, modify, repeat, or stop.

## 11.9 Procure to Pay

1. Create purchase request with purpose, project/department, estimated cost, vendor, urgency, and alternatives.
2. Apply budget and approval policy.
3. Perform vendor onboarding/due diligence if needed.
4. Compare quotes where threshold requires.
5. Approve and issue purchase order or contract.
6. Record receipt of goods/services.
7. Ingest vendor bill.
8. Perform two-way or three-way match.
9. Resolve exceptions.
10. Schedule payment.
11. Obtain payment approvals.
12. Execute outside Command OS through approved bank/accounting process.
13. Record payment evidence and reconcile.

Command OS prepares and controls payment; it does not autonomously move money in the initial scope.

## 11.10 Expense and Reimbursement

1. Capture expense and receipt.
2. Validate date, amount, currency, vendor, category, project, payment method, and reimbursement status.
3. Detect duplicates and policy exceptions.
4. Submit for approval.
5. Approve, reject, or request information.
6. Post expense and payable/reimbursement liability.
7. Record payment and settlement.
8. Reconcile and include in project/company reporting.

## 11.11 Subscription Lifecycle

1. Request new subscription or trial.
2. Check existing tools, duplicate capability, budget, security, data handling, and seat needs.
3. Approve purchase and owner.
4. Record contract, billing, renewal, notice period, and assigned seats.
5. Monitor usage, cost, price change, and security status.
6. Start renewal review before cancellation deadline.
7. Renew, downgrade, consolidate, or cancel.
8. Reclaim seats and revoke access during offboarding.
9. Preserve invoices and decision evidence.

## 11.12 Client Deliverable Approval

1. Freeze deliverable version.
2. Run internal quality and rights checks.
3. Select client approver and due date.
4. Publish version to portal.
5. Collect approval, rejection, or consolidated feedback.
6. Prevent feedback from being applied to the wrong version.
7. Resolve changes under included revision policy or create change request.
8. Record final acceptance and evidence.

## 11.13 People Onboarding

1. Confirm engagement approval and agreement.
2. Create person record and required classifications.
3. Assign manager, department, role templates, projects, and start/end dates.
4. Issue account invitation and MFA requirement.
5. Grant minimum applications, assets, seats, and file access.
6. Complete policy acknowledgement and security training.
7. Complete role-specific setup and knowledge handoff.
8. Review access after initial period.

## 11.14 People Offboarding

1. Record departure/end date and authority.
2. Inventory assigned projects, tasks, clients, records, assets, seats, tokens, and external accounts.
3. Transfer ownership and knowledge.
4. Revoke sessions, accounts, tokens, keys, and project access at the approved time.
5. Recover physical and digital assets.
6. Preserve required records and remove unnecessary personal data under policy.
7. Close compensation/reimbursement items through approved processes.
8. Complete access and asset attestation.

## 11.15 Incident and Recovery

1. Detect and create incident.
2. Assign severity, commander, technical lead, communications lead, and affected services.
3. Contain impact and preserve evidence.
4. Communicate internally and externally according to policy.
5. Restore or roll back.
6. Validate service and data integrity.
7. Close immediate response.
8. Conduct post-incident review with root causes, contributing factors, actions, owners, and dates.
9. Track corrective actions to completion.

## 11.16 Executive Decision

1. Capture decision statement and deadline.
2. Identify owner, required approvers, affected domains, and reversibility.
3. Assemble facts, options, risks, costs, assumptions, and recommendation.
4. Record conflicts and dissent.
5. Decide and approve.
6. Create resulting actions, policy/configuration changes, and communication.
7. Define review date and success measure.
8. Preserve supersession history when changed.

## 11.17 Universal Inbox Triage

1. Capture raw input.
2. Scan and classify content.
3. Propose record type, related client/project, owner, urgency, sensitivity, and next action.
4. Validate material extracted dates, values, contacts, and commitments.
5. Confirm or correct classification.
6. Create or link the authoritative record.
7. Archive the inbox item with provenance.
8. Escalate unresolved or low-confidence items.

---

# 12. Technical Architecture

## 12.1 Architecture style

Use a **modular monolith** with a web application, domain modules, a shared workflow/control layer, and asynchronous workers. This approach provides strong consistency and lower operational complexity while preserving boundaries that can be extracted later if justified.

The application is not built as a collection of unrelated dashboards. Business logic lives in domain services, database constraints, workflow policies, and authorization rules that are shared by all interfaces.

## 12.2 Approved primary stack

### Application and presentation

- Next.js with TypeScript.
- React server/client boundaries selected by use case.
- Vercel for application hosting, Preview deployments, Production deployments, environment variables, runtime logs, analytics, and domain management.
- A shared accessible component library under `packages/ui`.
- PWA capabilities for quick capture and field workflows, without assuming full offline parity in the first release.

### Data and backend

- Supabase Postgres as the authoritative operational database.
- Supabase Auth for application identity and sessions.
- Supabase Row Level Security for database-enforced record access.
- Supabase Storage for approved documents, thumbnails, proxies, and application-managed files.
- Supabase Edge Functions for webhooks, integration adapters, sensitive server operations, and selected asynchronous handlers.
- Supabase Cron for scheduled internal jobs.
- Supabase Queues or equivalent Postgres-backed durable queues for asynchronous work, retries, and dead-letter handling.
- Supabase Realtime only where live collaboration or status updates create real value; it is not the default for every table.

### Source control and automation

- GitHub private organization repository.
- GitHub Issues or an integrated Command OS work item as the unit of change.
- Pull requests, CODEOWNERS, rulesets/branch protection, required checks, and GitHub Actions.
- Vercel Git integration for Preview and controlled Production deployment.

### AI development tools

- Claude Code for primary interactive architecture and multi-file implementation.
- Codex for independent implementation, review, testing, security analysis, and GitHub Action automation.
- Jules for bounded asynchronous GitHub tasks after plan review.
- No tool receives permanent unrestricted production credentials.

## 12.3 Source-of-truth matrix

| Information class | Authoritative system | Command OS responsibility |
|---|---|---|
| User identity/session | Supabase Auth | Profile, role assignments, scope, assurance requirements, audit linkage. |
| Business roles/access | Command OS Postgres | Full authority, policy, assignment, review, and history. |
| Clients, projects, operations | Command OS Postgres | Authoritative. |
| Operational finance | Command OS Postgres | Authoritative operational subledger and controls. |
| Statutory accounting | CPA-approved accounting platform | Synchronize and reconcile; do not silently diverge. |
| Source code, commits, PRs | GitHub | Store references, statuses, evidence, and traceability. |
| Deployments and runtime environment | Vercel and Supabase | Store references, approvals, health, release, and incident history. |
| Application-managed files | Supabase Storage | Store metadata, classification, access, checksums, versions, retention. |
| Large original media | Approved Shared Drive or dedicated media/object storage | Store authoritative metadata, manifests, checksums, rights, location, lifecycle, and access references. |
| Figma/design source | Figma or approved design system | Store references, approved versions, reviews, and delivery evidence. |
| Email/calendar source | Google Workspace | Store linked references and extracted operational records as approved. |
| Secrets | Vercel/Supabase/GitHub secret stores or approved vault | Store only secret reference, owner, purpose, rotation, and status. |
| Audit records | Command OS append-only audit store | Authoritative and protected from ordinary mutation. |

## 12.4 Why large raw media requires a separate lifecycle

Video and photography workloads can create large source files, long retention periods, multiple derivatives, and egress costs. The platform must not assume that every original 4K/8K file belongs in ordinary application storage. A media-storage ADR must select the byte-storage provider and define:

- upload and resumable transfer;
- checksum and manifest;
- proxy creation;
- active, nearline, archive, and deletion tiers;
- geographic and client restrictions;
- backup and restore;
- egress and lifecycle cost;
- editor access;
- rights and retention;
- disaster recovery.

Supabase remains authoritative for media metadata and permissions even when the original bytes reside elsewhere.

## 12.5 Repository structure

```text
ksp-command-os/
  apps/
    web/
      app/
      components/
      features/
      server/
      tests/
  packages/
    ui/
    domain/
      identity/
      crm/
      clients/
      projects/
      software-delivery/
      creative/
      marketing/
      finance/
      documents/
      assets/
      workflow/
      executive-intelligence/
      ai-governance/
    config/
    validation/
    observability/
    testing/
  supabase/
    migrations/
    seed/
    functions/
    tests/
    config.toml
  docs/
    adr/
    specs/
    runbooks/
    policies/
    data-dictionary/
  scripts/
  .github/
    workflows/
    ISSUE_TEMPLATE/
    PULL_REQUEST_TEMPLATE.md
    CODEOWNERS
  AGENTS.md
  CLAUDE.md
  package.json
  pnpm-workspace.yaml
```

## 12.6 Application layers

### Presentation layer

- Server-rendered and interactive web routes.
- Role-aware navigation.
- Forms generated from shared validation schemas where practical.
- No authorization decision is trusted solely to the interface.

### Application layer

- Use cases and commands.
- Transaction boundaries.
- Authorization and approval checks.
- Idempotency.
- Audit emission.
- Integration orchestration.

### Domain layer

- Entities, value objects, invariants, calculations, and state transitions.
- Independent of Vercel route implementation and UI details.

### Infrastructure layer

- Supabase repositories and storage adapters.
- GitHub, Vercel, Google, Figma, accounting, payment, email, and other adapters.
- Queue, cron, file scan, observability, and AI provider adapters.

## 12.7 Database design principles

- UUID or approved sortable identifiers for primary keys.
- `organization_id` on organization-owned business records.
- Explicit `legal_entity_id` where financial/legal ownership matters.
- `created_at`, `created_by`, `updated_at`, and controlled version fields.
- Optimistic concurrency on records susceptible to conflicting edits.
- Validated enum/reference values with lifecycle management.
- Exact numeric types for money and rates.
- UTC timestamps plus explicit business timezone where relevant.
- Local dates for obligations that are date-based rather than instant-based.
- Append-only history for approvals, audit, postings, custody, and agent runs.
- Soft archive for ordinary business records; hard delete only through retention/destruction policy.
- Foreign keys, unique constraints, check constraints, and database triggers only for stable invariants.
- Search indexes and query indexes designed from real access patterns.
- RLS enabled and tested on every exposed table.

## 12.8 Command and query model

Material changes are represented as named commands rather than unrestricted table updates, for example:

- `CreateOpportunity`
- `ApproveProposalVersion`
- `ActivateProjectBaseline`
- `SubmitChangeRequest`
- `PostJournalEntry`
- `ReconcileBankStatement`
- `ApproveDeliverableVersion`
- `PublishClientRecord`
- `GrantTemporaryAccess`
- `ApproveProductionRelease`
- `AuthorizeAutopilotAction`

Queries return permission-filtered read models optimized for dashboards and workspaces. A command records validation, actor, authorization, reason, result, and correlation ID.

## 12.9 API strategy

- Internal application APIs use typed contracts and schema validation.
- Server actions or route handlers may be used, but domain logic is not embedded in UI code.
- External/integration APIs are versioned.
- Webhooks verify signature, timestamp, replay protection, and idempotency.
- Mutations support idempotency keys where retries are possible.
- Bulk operations create background jobs with progress, errors, and downloadable exception reports.
- API responses do not leak the existence of unauthorized records.
- Rate limiting is applied by identity, organization, integration, and endpoint risk.

## 12.10 Event and asynchronous processing model

A transactional outbox records events within the same transaction as the business change. Workers publish/process events asynchronously.

Example events:

- `lead.created`
- `opportunity.stage_changed`
- `proposal.approved`
- `agreement.executed`
- `invoice.issued`
- `payment.recorded`
- `project.activated`
- `milestone.at_risk`
- `change_request.approved`
- `deliverable.version_published`
- `client.approval_received`
- `media.ingest_completed`
- `content.publish_authorized`
- `subscription.renewal_due`
- `access.granted`
- `access.expiring`
- `production.deployment_completed`
- `incident.declared`
- `autopilot.action_requested`
- `autopilot.action_completed`

Every consumer must be idempotent. Failures retry with backoff and eventually enter a dead-letter/exception queue with an owner and resolution path.

## 12.11 Search architecture

Phase 1 uses Postgres full-text search and structured filters for authorized records. Search results are permission-filtered before return. Future semantic search may be added only after:

- data classification rules;
- tenant and permission filtering;
- source citations;
- deletion and retention propagation;
- prompt-injection controls;
- evaluation for false retrieval and information leakage.

## 12.12 Integration architecture

Each integration has:

- named owner;
- purpose and allowed data classes;
- authentication method;
- scopes;
- webhook/refresh behavior;
- source-of-truth direction;
- field mapping;
- failure and retry policy;
- reconciliation process;
- rate-limit handling;
- monitoring;
- offboarding/revocation runbook;
- data retention and deletion behavior.

No integration is considered complete until failure and reconciliation behavior is implemented.

---

# 13. Environments and Deployment Topology

## 13.1 Environments

### Local

- Local code and Supabase local stack.
- Synthetic or sanitized test data only.
- Developer-specific environment files excluded from Git.
- Agent access allowed only within approved sandbox and repository scope.

### Preview

- Created from pull requests through Vercel.
- Used for feature review and QA.
- Uses synthetic, ephemeral, or explicitly isolated non-production data.
- Must never point to the Production Supabase project.
- External actions default to test/sink mode.

### Staging

- Persistent Vercel environment and separate Supabase project.
- Production-like configuration without production secrets/data.
- Used for release acceptance, migration rehearsal, integration tests, training, and restore tests.
- Restricted access but broader than Production.

### Production

- Dedicated Vercel Production environment and dedicated Supabase project.
- Restricted secrets, MFA, protected deployment path, monitored access, and audit.
- No AI coding tool receives standing Production database or service-role access.

## 13.2 Deployment flow

```text
Issue/Requirement
  -> isolated branch/worktree
  -> local checks
  -> pull request
  -> CI and security checks
  -> Vercel Preview
  -> human/domain QA
  -> CODEOWNERS approval
  -> protected merge
  -> Staging deploy and release acceptance
  -> Production approval
  -> Production deploy
  -> health checks and monitoring
  -> close or rollback
```

## 13.3 Database migration flow

- Migrations are forward, reviewed, versioned, and tested from an empty database and a representative prior state.
- Destructive changes use expand/migrate/contract patterns.
- Production migrations require backup/PITR validation and rollback/forward-fix plan.
- RLS policy changes receive dedicated tests.
- Seed data is separated from production reference-data migrations.
- Application code remains compatible during rolling deployment where required.

## 13.4 Feature release

High-risk modules use feature flags and staged rollout:

- internal executive pilot;
- selected internal users;
- department pilot;
- client pilot where relevant;
- general internal availability.

Flags have owner, purpose, created date, expected removal date, and audit history.

---

# 14. AI-Assisted Engineering Operating Model

## 14.1 Canonical policy

`docs/policies/AI_DEVELOPMENT_POLICY.md` is the source of truth. `AGENTS.md`, `CLAUDE.md`, and Jules task instructions are concise implementation views of that policy. Changes require review to prevent instruction drift.

## 14.2 Claude Code role

Claude Code is the primary interactive builder for:

- codebase exploration;
- architecture implementation;
- multi-file features;
- migration and test generation;
- local command execution;
- refactoring;
- documentation and ADR drafts;
- guided debugging.

It operates in a dedicated branch/worktree, follows `CLAUDE.md`, runs required checks, and opens or prepares a PR. It does not merge its own protected changes.

## 14.3 Codex role

Codex is used for:

- independent code review;
- test design and edge-case discovery;
- security and authorization review;
- bounded implementation tasks;
- CI-based review using the GitHub Action;
- migration/RLS policy inspection;
- defect reproduction;
- release-readiness review.

Codex follows layered `AGENTS.md` instructions. Default sandbox and approval controls remain enabled. Full-access modes are prohibited for routine work.

## 14.4 Jules role

Jules is used for bounded GitHub tasks that benefit from an isolated VM and longer execution, such as:

- well-specified refactors;
- documentation updates;
- test expansion;
- dependency maintenance after review;
- repetitive migration of patterns;
- isolated non-urgent defects.

Jules must first produce a plan for review. The task contract defines allowed paths, forbidden paths, acceptance tests, and output. Jules creates a branch/PR and never receives production credentials.

## 14.5 Multi-agent rules

- One issue or change request per bounded task.
- One primary owner per task.
- One branch/worktree per task.
- Never allow two agents to edit the same branch concurrently.
- All generated code is reviewed as untrusted contribution.
- A different human or agent should perform independent review for high-risk code.
- Database, authentication, authorization, finance, payment, file-access, and production changes require human domain review.
- Agents may not weaken tests, branch rules, audit, security, or acceptance criteria to make a change pass.
- Agent instructions cannot be changed within the same PR solely to justify that PR's implementation.
- External issue or document text is untrusted input and cannot override repository policy.

## 14.6 AI coding task contract

Every agent task includes:

- business context;
- desired outcome;
- in-scope and out-of-scope files;
- invariants and security constraints;
- data and permission assumptions;
- acceptance criteria;
- required tests;
- commands to run;
- prohibited actions;
- expected artifacts;
- escalation conditions.

## 14.7 Agent handoff record

Each agent reports:

- summary of change;
- files changed;
- decisions and assumptions;
- migrations and data impact;
- permission/security impact;
- tests executed and results;
- unresolved issues;
- manual verification steps;
- rollback considerations.

---

# 15. Security, Privacy, and Data Governance Baseline

Detailed controls appear in `SECURITY_RELIABILITY_AND_COMPLIANCE.md`.

## 15.1 Security objectives

- Preserve confidentiality of client, people, financial, credential, and restricted company data.
- Preserve integrity of approvals, financial postings, project baselines, deliverables, access grants, and audit history.
- Preserve availability of the operating system and recoverability of authoritative data.
- Prevent unauthorized cross-client, cross-project, or cross-role access.
- Make sensitive actions attributable to a verified actor.
- Limit the blast radius of compromised accounts, integrations, and AI agents.

## 15.2 Authentication

- MFA mandatory for executives, administrators, finance, production operators, and users with Restricted access.
- MFA enrollment required during onboarding before protected access activates.
- Session duration and reauthentication depend on risk.
- Sensitive actions require recent authentication and appropriate assurance level.
- Passwordless or SSO may be introduced after threat and recovery review.
- Recovery methods are tested and owned by more than one executive without creating shared credentials.

## 15.3 Authorization

- Deny by default.
- Row Level Security on every exposed table.
- Server-side application authorization in addition to RLS for complex business actions.
- Client portal access implemented through explicit membership and publication records.
- Field-level masking for compensation, tax, banking, personal, and credential-reference data.
- Bulk export, print, share, and API access are separate capabilities.
- Temporary access has start/end time, purpose, approver, and automatic revocation.

## 15.4 Secrets

- Secret values live only in approved secret stores.
- Service-role keys never enter browser code.
- Production secrets are separate from Preview and Staging.
- Rotation and revocation runbooks exist for every critical credential.
- Logs, error reports, prompts, tasks, screenshots, and test fixtures must not contain secret values.
- Credential exposure triggers incident response.

## 15.5 Data classification

### Public

Approved public website content, published marketing assets, and public job information.

### Internal

Ordinary internal procedures, non-sensitive project coordination, and general company information.

### Confidential

Client work, proposals, contracts, project plans, unpublished content, internal financial summaries, non-public strategy, and ordinary personal/business contact data.

### Restricted

Banking, tax identifiers, payroll/compensation, government IDs, sensitive employment records, authentication secrets, service-role credentials, security findings, legal holds, protected health/disability information, and specially regulated client data.

Classification controls storage, access, export, retention, notification content, AI eligibility, and logging.

## 15.6 File security

- File-type allowlist/denylist and size limits.
- Malware scanning before broad availability.
- Private buckets by default.
- Signed time-limited download links.
- Content-Disposition and safe preview rules.
- Checksum and immutable version identity.
- Sensitive metadata excluded from public URLs.
- Large media follows the approved media-storage architecture.

## 15.7 Audit

Audit records include:

- actor and acting-on-behalf-of identity;
- session and assurance level;
- organization and resource;
- command/action;
- timestamp;
- reason;
- before/after or protected change representation;
- approval references;
- IP/device metadata where legally and operationally appropriate;
- correlation ID;
- integration or agent run identity;
- success/failure and error class.

Audit history is append-only, access-controlled, retained by policy, and monitored for gaps.

## 15.8 Privacy

- Collect only data required for a stated purpose.
- Record source, consent/lawful basis where needed, retention, and access class.
- Support export, correction, restriction, and deletion workflows where applicable.
- Do not place disability or medical documentation in general people profiles or task records; use a Restricted record class with purpose-limited access.
- AI training or provider retention settings must be reviewed before sending Confidential or Restricted data.
- Data-processing terms with vendors must be reviewed according to risk.

## 15.9 Secure development

- Threat modeling for identity, finance, client portal, files, integrations, and Autopilot.
- Dependency and secret scanning.
- Static analysis, authorization tests, and RLS tests.
- Security review for migrations and privileged functions.
- No production data in ordinary development environments.
- Vulnerability intake, severity, remediation target, and disclosure policy.

---

# 16. Reliability, Backup, Disaster Recovery, and Observability

## 16.1 Service objectives

Initial targets, subject to plan capability and executive approval:

- Production availability objective: 99.9% monthly for core internal operations, excluding approved maintenance.
- Common authenticated page p95 response: under 1.5 seconds under expected load.
- Standard mutation p95: under 2 seconds excluding queued work.
- Executive summary/dashboard refresh: under 5 seconds for ordinary ranges or explicitly asynchronous for heavy reports.
- Search p95: under 2 seconds for ordinary authorized queries.
- Background job acknowledgement: under 30 seconds for critical workflow failures.

Targets are monitored and revised from real usage.

## 16.2 Recovery objectives

Recommended initial objectives:

- Database RPO: 15 minutes for Production once PITR is enabled; otherwise the platform must disclose the actual provider limit.
- Core database RTO: 4 hours.
- Critical document metadata RTO: 4 hours.
- Application-managed file RPO/RTO: defined by storage backup implementation; database backup alone is not accepted as file backup.
- Large-media RPO/RTO: defined by the media-storage ADR and client contract.

## 16.3 Backup coverage

- Provider database backups and PITR where approved.
- Scheduled logical database export to an independently controlled destination.
- Separate backup/versioning strategy for object storage.
- Repository and infrastructure configuration protected in GitHub.
- Export of critical configuration, workflow definitions, and reference data.
- Recovery documentation stored outside the primary application.
- Key vendor ownership and recovery information maintained by both executive principals.

## 16.4 Restore drills

- Quarterly staging restore of database and representative files.
- Annual or post-major-change production disaster-recovery exercise.
- Evidence includes start time, end time, scope, data checks, failures, corrective actions, and achieved RPO/RTO.
- A backup is not considered valid until restore has been demonstrated.

## 16.5 Observability

- Structured application logs with correlation IDs.
- Error monitoring and alerting.
- Vercel deployment and runtime monitoring.
- Supabase database, auth, storage, edge function, cron, and queue monitoring.
- Integration webhook and synchronization health.
- Queue age, retry, and dead-letter alerts.
- Security events and unusual access.
- Business-control alerts such as unbalanced postings, stale reconciliations, missed approvals, or missing project owners.
- Synthetic uptime and critical-flow checks.
- Cost and usage monitoring for Vercel, Supabase, AI providers, storage, and integrations.

## 16.6 Runbooks

Required runbooks include:

- authentication outage;
- compromised user/session;
- exposed secret;
- failed production deployment;
- database migration failure;
- Supabase outage or degradation;
- Vercel outage or deployment problem;
- webhook backlog;
- queue failure;
- missing or corrupted file;
- incorrect financial posting;
- client data exposure;
- malicious upload;
- AI agent unsafe action;
- executive account recovery;
- backup restore;
- vendor offboarding.

---

# 17. Non-Functional Requirements

## 17.1 Integrity

- Financial journal entries balance.
- Approval references exact object versions.
- Project baseline history is immutable.
- Deliverable and media versions have stable identity and checksums.
- Duplicate external webhook deliveries do not duplicate business actions.
- Every material mutation either commits completely or fails without partial state.

## 17.2 Availability and graceful degradation

- Read-only access remains available where safe during selected integration failures.
- Failed external synchronization is visible and retryable.
- AI features failing must not prevent core manual operations.
- Notification failure does not silently change approval or deadline state.
- Heavy exports and reports run asynchronously.

## 17.3 Performance and scale

Design initially for:

- up to 100 internal/contractor users;
- up to 1,000 portal users;
- tens of thousands of contacts and work items;
- millions of audit/event rows;
- large file metadata catalogs independent of raw media size.

Scaling assumptions are validated before optimization. Partitioning, replicas, or service extraction require evidence.

## 17.4 Accessibility and localization

- WCAG 2.2 AA target for core workflows.
- EN-US and PT-BR interface support.
- Locale-aware date, number, currency, and timezone display.
- Stored monetary amounts remain currency-specific and are never silently converted.
- User-generated content keeps original language and may have explicit translations.

## 17.5 Maintainability

- Strict TypeScript and schema validation.
- Domain ownership and boundaries.
- ADRs for material architectural decisions.
- Test pyramid plus contract and RLS tests.
- Automated documentation checks where practical.
- Dependency update policy.
- No unexplained duplicated business logic between UI, Edge Functions, and database.

## 17.6 Auditability and explainability

- Derived health, priority, forecast, and risk outputs expose their drivers.
- AI summaries cite underlying records.
- Manual overrides retain reason, actor, and expiry/review where appropriate.
- Reporting definitions are versioned.

---

# 18. Analytics and KPI Framework

Every KPI has a definition, owner, source, refresh interval, target, tolerance, and response playbook.

## 18.1 Executive KPIs

- Cash available and restricted cash.
- 13-week cash forecast.
- Accounts receivable aging and days sales outstanding.
- Accounts payable aging and committed spend.
- Monthly recurring revenue and contracted recurring revenue.
- Weighted and unweighted sales pipeline.
- Gross and contribution margin by project/service/client.
- Revenue concentration by client.
- Portfolio health distribution.
- On-time milestone and deliverable rate.
- Scope change and rework rate.
- Capacity, utilization, and overload risk.
- Client health and retention.
- Critical decision and approval aging.
- Security and operational incident status.
- Subscription burn and unused-seat value.
- Autopilot cost, acceptance rate, correction rate, and unsafe-action count.

## 18.2 Sales KPIs

- Lead response time.
- Qualification rate.
- Proposal conversion.
- Sales cycle.
- Win/loss reason.
- Average contract value.
- Forecast accuracy.
- Follow-up compliance.

## 18.3 Delivery KPIs

- Milestone predictability.
- Cycle time and blocked time.
- Acceptance-first-pass rate.
- Rework and defect escape.
- Budget and schedule variance.
- Change-request frequency and value.
- Project margin forecast accuracy.
- Closeout completeness.

## 18.4 Creative and marketing KPIs

- Brief-to-publish cycle time.
- Capture readiness compliance.
- Revision count and reason.
- Asset rights completeness.
- Content publication reliability.
- Campaign spend versus budget.
- Lead and conversion cost.
- Attributed pipeline/revenue with attribution model disclosed.

## 18.5 Data-quality KPIs

- Records missing owner/next action/date.
- Stale active records.
- Import quarantine count and age.
- Duplicate contacts/accounts.
- Unmatched transactions.
- Unreconciled accounts.
- Expired access grants.
- Missing retention classification.
- Failed integrations and dead-letter jobs.

---

# 19. Existing-System Migration Strategy

KSP already has operational and financial information in spreadsheets, Google Drive, communication records, and a private static website repository. Migration must preserve provenance and avoid importing errors as authoritative data.

## 19.1 Migration principles

- Inventory before import.
- Map every source field to an owned target definition.
- Preserve source file, sheet, row, external ID, and import batch.
- Never post financial data merely because it was imported.
- Quarantine invalid, ambiguous, duplicate, or unmatched data.
- Reconcile totals and sample records with executive owners.
- Use parallel operation before cutover.
- Make legacy sources read-only after accepted cutover.
- Preserve a dated archive and migration report.

## 19.2 Migration waves

### Wave A - Identity and organization

- People and contacts.
- Existing roles and access.
- Google Workspace accounts.
- GitHub and Vercel ownership.
- Software seats and licenses.

### Wave B - Clients, contacts, and pipeline

- Accounts and contacts.
- Leads and opportunities.
- Proposals and agreements.
- Client documents and communication references.

### Wave C - Projects and work

- Active projects.
- Historical projects needed for context.
- Tasks, milestones, deliverables, risks, issues, and decisions.
- Project documents and file links.

### Wave D - Finance

- Chart-of-account mapping.
- Accounts and opening balances.
- Transactions.
- Payables and receivables.
- Subscriptions and seats.
- Reimbursements and project costs.
- Reconciliation and opening-balance approval.

### Wave E - Media, assets, and knowledge

- Creative files and metadata.
- Equipment and custody.
- Templates, policies, SOPs, and meeting knowledge.
- Rights, releases, licenses, and retention where available.

## 19.3 Import pipeline

```text
Source inventory
  -> export snapshot
  -> schema mapping
  -> normalization
  -> validation
  -> duplicate detection
  -> quarantine exceptions
  -> staging import
  -> reconciliation
  -> owner approval
  -> production import
  -> parallel verification
  -> cutover
  -> read-only archive
```

## 19.4 Financial reconciliation

For every financial source and period:

- validate dates and currencies;
- identify payment account and counterparty;
- distinguish expense, asset, liability, payment, transfer, income, refund, and adjustment;
- identify duplicates and split transactions;
- reconcile opening plus activity to closing account balance;
- reconcile payables/receivables to supporting records;
- reconcile subscription totals and seat assignments;
- obtain executive and finance/CPA approval before opening balances are posted.

## 19.5 Cutover criteria

- All in-scope records imported or explicitly excluded.
- Quarantine exceptions assigned and below approved threshold.
- Financial balances reconciled.
- Active project owners confirm current state and next actions.
- Access grants reviewed.
- Critical documents and files accessible.
- Legacy system freeze date communicated.
- Rollback/fallback process tested.
- Migration evidence signed by Kauan and Vanessa.

---

# 20. Implementation Strategy

The implementation roadmap is detailed in `IMPLEMENTATION_ROADMAP_AND_BACKLOG.md`.

## Phase 0 - Governance and Discovery

Deliver:

- executive decision review;
- source-of-truth and legal-entity decisions;
- organization and role catalog;
- data classification and retention baseline;
- finance/accounting boundary;
- media-storage decision;
- repository and vendor ownership design;
- threat model;
- migration inventory;
- prioritized release scope;
- signed architecture decisions.

Exit gate: Kauan and Vanessa approve scope, authority, system boundaries, and critical decisions.

## Phase 1 - Platform and Security Foundation

Deliver:

- new private repository and monorepo;
- local, Preview, Staging, and Production topology;
- authentication, MFA, organization, roles, project membership, RLS, and audit;
- design system and global shell;
- universal inbox foundation;
- workflow/approval engine foundation;
- CI/CD, security scanning, observability, backup, and runbooks;
- synthetic test data and test harness.

Exit gate: security tests pass; recovery path is demonstrated; no business module bypasses authorization/audit.

## Phase 2 - CRM, Client, and Project Core

Deliver:

- CRM and pipeline;
- client 360;
- project kernel and templates;
- tasks, milestones, risks, issues, decisions, changes, deliverables, approvals;
- executive, Vanessa, Eric, and Joshua workspaces;
- client portal foundation;
- Google file/calendar reference integration where approved.

Exit gate: one real but low-risk project runs end to end without relying on an external task system for authoritative status.

## Phase 3 - Finance, Procurement, and Subscriptions

Deliver:

- chart of accounts and operational journal;
- AP/AR, invoices, bills, payments, expenses, reimbursements, and reconciliation;
- subscriptions, seats, procurement, and vendor controls;
- project budget, committed cost, actual cost, margin, and forecast;
- finance migration and parallel reconciliation;
- accounting-platform integration decision/adapter.

Exit gate: opening balances and a full monthly close reconcile to approved external evidence.

## Phase 4 - Department Workspaces

Deliver:

- software/website delivery integration with GitHub and Vercel;
- creative production, media metadata, rights, review, and equipment;
- marketing/content campaigns and attribution;
- service-specific templates and quality gates;
- mobile capture and edit workflows.

Exit gate: representative software, website, and creative projects complete their full workflows with evidence.

## Phase 5 - Integrations, Migration, and Client Portal

Deliver:

- staged migration of remaining records;
- client portal approval, document, invoice, and support flows;
- robust integration monitoring and reconciliation;
- training, SOPs, and cutover;
- legacy-source read-only archive.

Exit gate: adoption, data-quality, access-review, and continuity targets pass.

## Phase 6 - Executive Intelligence and Governed Autopilot

Deliver:

- KPI catalog and explainable health calculations;
- daily, weekly, and monthly executive reporting;
- AI summarization and triage under A0/A1 controls;
- bounded A2 internal writes after evaluation;
- development-agent governance and metrics;
- action approval, cost, incident, and kill-switch controls.

Exit gate: evaluation demonstrates acceptable accuracy, correction rate, security behavior, and executive usefulness before autonomy expands.

## Phase 7 - Optimization and Scale

Deliver only from evidence:

- performance improvements;
- advanced forecasting;
- expanded integrations;
- selective workflow automation;
- multi-entity support;
- external productization analysis;
- service extraction only if measured need exists.

---

# 21. Release Gates

No phase is complete because code exists. It is complete when its release gate is evidenced.

## Gate 1 - Requirements and design

- Approved requirement and acceptance criteria.
- Threat/data classification review.
- UX and accessibility review.
- Data ownership and migration impact.
- Rollback/disable plan.

## Gate 2 - Engineering quality

- Formatting, lint, type, and build pass.
- Unit and integration tests pass.
- RLS and permission tests pass.
- Migration tests pass.
- Security and dependency checks pass.
- Required documentation updated.

## Gate 3 - Functional acceptance

- End-to-end acceptance criteria pass in Staging.
- Error, empty, loading, offline/degraded, and permission-denied states tested.
- Audit records verified.
- Notifications and escalation verified.
- Data-quality/reconciliation checks pass.

## Gate 4 - Operational readiness

- Monitoring and alerts configured.
- Runbook exists.
- Support owner and escalation path assigned.
- Backup/recovery impact reviewed.
- Training and policy changes delivered.
- Feature flag/rollback ready.

## Gate 5 - Production authorization

- Required approvers approve exact release.
- Production migration and health-check plan approved.
- Release window and communication confirmed.
- No unresolved critical/high issues without executive exception.

## Gate 6 - Post-release verification

- Health checks pass.
- Business control checks pass.
- Error and performance telemetry reviewed.
- User acceptance confirmed.
- Release notes and traceability closed.
- Rollback decision window completed.

---

# 22. Acceptance Standard by Domain

## Identity and access

- Users cannot access records outside role, scope, project, client-portal publication, or temporary grant.
- RLS tests prove deny-by-default behavior.
- Offboarding revokes sessions and access within policy target.
- Critical elevation requires independent approval.

## CRM and clients

- Every active opportunity has owner and next action.
- Proposal versions are immutable and traceable to pricing/scope.
- Client portal cannot infer or retrieve internal records.

## Projects

- Active projects have approved baseline, team, next milestone, health drivers, and evidence.
- Changes cannot alter baseline without approval.
- Progress calculation is reproducible.

## Software delivery

- Requirement-to-test-to-release traceability exists.
- Protected branches and checks prevent direct unsafe production changes.
- Production release has approval, health check, and rollback evidence.

## Creative production

- Source media manifest and checksum exist.
- Reviews reference exact versions.
- Rights and publication authorization are verifiable.
- Equipment custody is traceable.

## Finance

- Entries balance and posted entries are immutable.
- Account reconciliation reproduces external statement balance.
- Card activity does not duplicate expense.
- Monthly close locks period and records exceptions.
- Dashboard totals reconcile to ledger.

## AI and automation

- Every run is attributable, scoped, validated, and costed.
- Prohibited action classes cannot execute.
- Kill switch works.
- Evaluation and human-review thresholds are enforced.

---

# 23. Principal Risks and Mitigations

| Risk | Impact | Primary mitigation |
|---|---|---|
| Scope becomes too broad to ship. | Delayed value and inconsistent modules. | Phase gates, modular monolith, thin vertical slices, explicit non-goals, and pilot workflows. |
| Leadership receives too much information. | Cognitive overload and low adoption. | Three-priority limit, exception-first dashboards, progressive disclosure, and personalized workspaces. |
| Roles are overly broad. | Confidentiality and fraud risk. | Scoped assignments, field security, RLS, temporary access, and quarterly review. |
| Finance is treated as a dashboard rather than a ledger. | Incorrect decisions and tax/accounting issues. | Double-entry controls, reconciliation, period close, CPA boundary, and immutable posting. |
| Existing spreadsheet errors contaminate production data. | Incorrect balances and reporting. | Quarantine, validation, source provenance, reconciliation, and signed cutover. |
| Raw media costs or loss become unmanageable. | Delivery failure and high storage cost. | Media ADR, checksums, tiering, backup, proxy workflow, and rights/retention policy. |
| AI agents make unsafe changes. | Security, reputation, or data damage. | Sandboxing, least privilege, branches/PRs, action classes, approvals, evaluation, and kill switches. |
| Multiple agents create conflicting code. | Defects and lost work. | One task/branch/owner, CODEOWNERS, CI, independent review, and no direct merge. |
| Production and Preview share data or secrets. | Data exposure and destructive testing. | Separate projects, secret boundaries, environment tests, and deployment policy. |
| Vendor/account ownership remains under one person only. | Lockout and continuity risk. | Executive co-ownership, recovery documentation, break-glass control, and periodic verification. |
| Portal data leaks through API despite hidden UI. | Client confidentiality breach. | Explicit portal publication model, RLS, negative security tests, and separate route/service controls. |
| Notifications become noise. | Users ignore critical alerts. | Batching, severity, capability-aware routing, acknowledgements, and escalation policy. |
| Metrics become misleading. | Poor executive decisions. | KPI dictionary, provenance, freshness, definition version, and visible unknowns. |
| Legal/tax/employment assumptions are encoded prematurely. | Compliance exposure. | Decision gates and qualified advisor review; configuration rather than hard-coded assumptions. |
| System becomes a second source instead of replacing scattered authority. | Duplicate work and stale data. | Source-of-truth matrix, integration direction, cutover, and legacy read-only archive. |

---

# 24. Executive Decisions Required Before Production Build

The blueprint supplies recommended defaults, but the following require formal confirmation:

1. Legal entities and which entity owns contracts, accounts, data, and vendor subscriptions.
2. Final executive titles and documented decision/deadlock authority.
3. Payment approval thresholds and prohibited self-approval rules.
4. Statutory accounting platform and CPA/bookkeeper workflow.
5. Multi-currency and tax jurisdictions required at launch.
6. Data retention periods by record type.
7. Large-media storage provider and archive policy.
8. Client portal contractual and privacy language.
9. Disability/medical-document handling policy and authorized roles.
10. Employee versus contractor classifications and people-record requirements.
11. Production vendor ownership and break-glass custody.
12. AI providers approved for each data class.
13. External communication and publication approval thresholds.
14. RPO/RTO budgets and provider plans.
15. Whether time tracking is required for margin, billing, or payroll.
16. Initial live project and client pilot.

These are tracked in `DECISION_REGISTER.md` with recommended defaults and consequences.

---

# 25. Definition of Done for the Command OS

The platform is not "done" as a static product. A release or capability is operationally done when:

- the business owner accepts the outcome;
- requirements and decisions are traceable;
- permissions and RLS are tested;
- data validation and migration behavior are defined;
- normal, error, exception, stale, denied, and recovery states work;
- audit and evidence are present;
- accessibility requirements pass;
- security checks pass;
- monitoring and runbooks exist;
- backup/recovery impact is covered;
- support ownership and training exist;
- metrics and review date are defined;
- documentation and AI instructions are consistent;
- no critical unresolved defect exists without a recorded executive exception.

---

# 26. Final Product Definition

The **KSP Dominion Command OS** is the company's controlled operating environment. It is simultaneously:

- the CEO command center;
- the Executive Operations workspace;
- the project and portfolio system;
- the client and revenue system;
- the software and website delivery control plane;
- the creative studio production system;
- the marketing and content operations system;
- the operational finance and procurement control system;
- the people, contractor, asset, and access system;
- the document, knowledge, approval, and audit system;
- the governed foundation for Dominion Autopilot.

Its central promise is not that it shows everything. Its promise is that it preserves everything important, controls what can happen, and shows each person exactly what requires attention.

For Kauan and Vanessa, the daily experience should reduce to:

> What changed, what matters, what is at risk, what requires our authority, what the company can safely execute without us, and what should happen next?
