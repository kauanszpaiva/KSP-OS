# KSP Dominion Command OS
## Product Information Architecture and Screen Blueprint

**Version:** 1.0  
**Classification:** Confidential

---

# 1. Navigation Model

Navigation is permission-generated and role-prioritized. Users do not see empty modules or links they cannot use.

## Global navigation

```text
Home
Inbox
My Work
Approvals
Calendar
Search

Relationships
  Leads
  Opportunities
  Clients
  Contacts

Delivery
  Portfolio
  Projects
  Deliverables
  Risks & Issues
  Decisions & Changes

Departments
  Software & Websites
  Creative Studio
  Marketing & Content

Money
  Overview
  Receivables
  Payables
  Transactions & Journal
  Reconciliation
  Budgets & Profitability
  Subscriptions & Seats
  Procurement & Vendors

Company
  People & Capacity
  Documents & Knowledge
  Assets & Equipment
  Policies

Executive
  Command Center
  Company Health
  Forecasts
  Operating Reviews
  Strategy & Decisions

Administration
  Organization & Access
  Workflows & Approvals
  Integrations
  AI & Autopilot
  Audit
  Data Imports
  System Health
```

A contributor may see only Home, Inbox, My Work, Calendar, assigned projects, and relevant department workspace. A client sees an entirely separate portal navigation.

---

# 2. Global Shell

## Header

- Organization/workspace indicator.
- Universal search.
- Quick capture.
- Current focus action.
- Approvals.
- Notifications.
- User/security menu.

## Left navigation

- Role-generated module groups.
- Collapsible.
- Keyboard accessible.
- Current context and favorites.
- No decorative counts that create noise; counts appear only for actionable exceptions.

## Command palette

Examples:

- Create lead.
- Create task.
- Record expense.
- Upload receipt.
- Start decision.
- Search client.
- Open project.
- Capture voice note.
- Request approval.
- Switch focus mode.
- Report incident.

Commands are permission-filtered.

## Context panel

An optional right-side panel provides related records, activity, help, policy, and AI assistance without losing the main page.

---

# 3. Shared Page Patterns

## List page

- Saved views.
- Filter/sort/group.
- Search.
- Column preferences.
- Bulk actions only when separately permitted.
- Data freshness and total definition.
- Empty state with next action.
- Export permission and evidence.

## Record page

```text
Header: title, code, status, owner, health, primary action
Summary: key facts and next action
Tabs:
  Overview
  Work / Related records
  Files
  Activity
  Decisions / Approvals
  Finance (when allowed)
  Audit (when allowed)
```

The page exposes missing required information and why it matters.

## Work queue

- Prioritized items.
- Reason for priority.
- Due date and impact.
- Quick complete/defer/delegate/block.
- Batch operations only for low-risk actions.

## Approval page

- Exact object and version.
- Requester and reason.
- Required evidence.
- Financial/risk impact.
- Prior approvals and conflicts.
- Approve, reject, request changes, or abstain.
- Policy and separation check.

## Timeline/activity

- Human, integration, workflow, and AI events.
- Material changes only by default.
- Filterable and permission-aware.
- Before/after or source evidence for authorized users.

## File picker

- Upload/link/search.
- Classification.
- Client/project relation.
- Version and retention.
- Scan/upload state.
- No public sharing by default.

---

# 4. Executive Command Center Screens

## 4.1 Today

Sections:

1. **Do Next** - one recommended executive action and reason.
2. **Top Three** - no more than three priorities.
3. **Decisions Waiting** - age, impact, deadline, prepared recommendation.
4. **Approvals Waiting** - amount/risk, requester, required co-approver.
5. **At Risk** - projects, clients, cash, incidents, and obligations.
6. **Today and Next 7 Days** - meetings, payments, renewals, deliveries, launches, shoots.
7. **What Changed** - meaningful changes since last review.
8. **Autopilot** - completed work, requested approvals, exceptions, cost.

## 4.2 Company Health

- Revenue and cash.
- AR/AP aging.
- Pipeline and forecast.
- Portfolio health.
- Client health.
- Capacity and overload.
- Quality/rework.
- Marketing outcomes.
- Subscription and cloud burn.
- Security, data quality, and operational controls.

Every card opens the driver records and calculation definition.

## 4.3 Decision Center

Views:

- Needs preparation.
- Ready for decision.
- Waiting for co-approval.
- Decided, actions open.
- Review due.
- Superseded.

Decision packet displays context, options, evidence, risks, recommendation, dissent, and consequences.

## 4.4 Forecast and Scenarios

- 13-week cash.
- Revenue and pipeline scenarios.
- Hiring/contractor/subscription scenarios.
- Project margin risks.
- Assumptions and confidence.
- Save/compare approved scenarios without altering actual records.

---

# 5. Vanessa Executive Operations Screens

## Operations Control

- Projects without update.
- Records missing owner/next action/date/evidence.
- Overdue follow-ups.
- Client communication gaps.
- Meetings needing agenda or actions.
- Documents needing filing, signature, approval, or classification.
- Renewal and obligation calendar.
- Cross-team dependency queue.
- Pending tasks that require Kauan specifically.

## CEO Brief Builder

The system prepopulates:

- decisions;
- risks;
- approvals;
- financial exceptions;
- client exceptions;
- schedule;
- recommended priorities.

Vanessa can verify, annotate, and publish an internal executive brief. The source links remain attached.

## Completeness Review

A queue for active records violating operational rules. Each item supports fix, assign, request, defer with date, or approved exception.

---

# 6. Eric Project Delivery Screens

## Portfolio Board

Group by health, client, service, manager, milestone, or due period. Cards show:

- current stage;
- next milestone;
- health and drivers;
- scope/schedule/budget variance;
- blocked work;
- client inputs/approvals;
- team capacity risk;
- last update.

## Project Control Room

- outcome and scope.
- baseline/current forecast.
- milestone timeline.
- work board.
- dependencies.
- RAID and decisions.
- change requests.
- deliverables/acceptance.
- project economics as permitted.
- client status/reporting.
- closeout readiness.

## Resource and Dependency View

- team allocation by week.
- overload/under-allocation.
- required skills.
- cross-project dependencies.
- unresolved external/client dependencies.

---

# 7. Joshua Design and Front-End Screens

## Product/Design Queue

- briefs ready for discovery.
- flows/wireframes/designs in progress.
- internal reviews.
- client reviews.
- front-end implementation.
- accessibility findings.
- visual QA.

## Design Deliverable

- requirements and user outcomes.
- design source/reference.
- immutable submitted versions.
- feedback grouped by version and screen/component.
- approval chain.
- handoff checklist.
- implementation links: issue, branch, PR, Preview.

## Design System

- components, variants, status, owner, usage, accessibility, implementation link, change history, and deprecation.

---

# 8. Capture Specialist Mobile Screens

## My Production Day

- call time and countdown.
- map/address/contact.
- schedule and scenes.
- safety/location notes.
- required releases/permits indicator.
- assigned equipment kit.
- offline-accessible call-sheet snapshot where feasible.

## Equipment Check-Out/In

- scan/select asset or kit.
- verify components/condition.
- accept custody.
- return and report condition/damage/loss.

## Capture Checklist

- arrival.
- setup.
- audio/video tests.
- shot completion.
- card/file count.
- incident/problem.
- ingest/handoff destination.
- completion signature/evidence.

---

# 9. Editor Screens

## Edit Queue

Sort by priority, due date, review stage, and blocked state. Shows source readiness, brief status, feedback count, and required export formats.

## Edit Workspace Record

- brief and narrative goal.
- source/proxy locations.
- approved brand/license assets.
- edit versions.
- time-coded comments.
- feedback conflicts.
- QC checklist.
- export specifications.
- delivery/approval status.

The Command OS coordinates work and evidence; the actual timeline editing remains in specialist software.

---

# 10. Marketing and Content Screens

## Campaign Control Room

- objective and success criteria.
- audience/offer/message.
- channel and budget.
- content dependencies/calendar.
- approvals.
- tracking readiness.
- spend/outcomes.
- risks and next decision.

## Content Calendar

Views by channel, client, campaign, production state, approver, and publish date. Content cards expose whether brief, asset, rights, caption, link, and approval are ready.

## Experiment Review

- hypothesis.
- variants.
- sample/window.
- stop rule.
- outcome metrics.
- limitations.
- decision: scale, revise, repeat, stop.

---

# 11. Finance Screens

## Finance Overview

- cash by account and freshness.
- AR/AP aging.
- upcoming obligations.
- monthly income/expense and operating result.
- subscription burn.
- project profitability risk.
- unreconciled/unmatched items.
- monthly close status.

## Transaction/Journal Workbench

- draft/submit/approve/post/reverse.
- debit/credit lines.
- source evidence.
- dimensions.
- validation and balance indicator.
- immutable posted view.

## Reconciliation Workbench

- statement lines.
- suggested matches.
- transfer detection.
- split match.
- difference.
- unresolved exceptions.
- reconciliation completion and review.

## Subscription Console

- renewals by notice deadline.
- seat assignments and unused seats.
- price changes.
- duplicate capabilities.
- allocation and owner.
- renew/downgrade/cancel decision.

## Project Economics

- current contract value.
- billed/received/outstanding.
- actual and committed cost.
- estimate to complete.
- forecast contribution/margin.
- variance and change history.

---

# 12. Client Portal Screens

```text
Home
  Project summary
  What KSP needs from you
  Upcoming dates
  Recent deliveries
  Invoice/payment status

Projects
  Scope and approved changes
  Milestones/progress
  Client-visible timeline

Approvals
  Exact versions awaiting review
  Consolidated feedback
  Approval history

Files
  Explicitly shared documents/deliverables

Invoices
  Issued invoices, payment state, receipts

Meetings & Requests
  Schedule, inputs, support/request history
```

The portal never exposes internal navigation, APIs, comments, risk/margin, or other client records.

---

# 13. Search

Search supports:

- exact names, codes, email, phone, invoice/project IDs;
- full-text authorized content;
- filters by module, client, project, owner, status, date, classification;
- recent and pinned records;
- permission-aware suggestions;
- result freshness/source.

Restricted records may be omitted entirely rather than shown as locked, depending on policy. Semantic search is a later gated capability.

---

# 14. Forms and Validation

- Inline and submission validation.
- Required-field explanation.
- Save draft where appropriate.
- Unsaved-change protection.
- Exact date/currency/timezone behavior.
- Duplicate warning before creation.
- Controlled reference data.
- Evidence upload/link requirements.
- Optimistic-concurrency conflict resolution.
- No silent field truncation or coercion.

Financial import errors, including impossible dates, enter quarantine rather than being coerced.

---

# 15. Mobile and Offline Position

The web application is responsive and installable as a PWA. Initial offline support is deliberately narrow:

- view a previously prepared capture call-sheet snapshot;
- draft notes/checklist state locally;
- queue quick capture for later synchronization;
- display clear unsynced state and conflict handling.

Finance posting, access administration, approval of critical actions, and destructive operations require online authoritative validation.

---

# 16. UI Acceptance Checklist

Every screen includes:

- authorized happy path;
- no-permission state;
- empty state;
- loading state;
- stale/sync-failed state;
- validation/error state;
- archived/immutable state;
- mobile behavior where relevant;
- keyboard navigation;
- visible focus;
- screen-reader labels;
- reduced motion;
- localized text and values;
- audit/source access where permitted.
