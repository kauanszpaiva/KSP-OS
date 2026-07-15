# KSP Dominion Command OS
## Domain, Data Model, and Workflow Blueprint

**Version:** 1.0  
**Classification:** Confidential

---

# 1. Purpose

This document turns the product vision into bounded business domains, authoritative entities, lifecycle rules, relationships, events, and reusable workflow controls.

It is a logical data blueprint, not a substitute for reviewed SQL migrations. Physical schema decisions must preserve the invariants defined here.

---

# 2. Shared Data Conventions

Every organization-owned business record should include, where applicable:

- `id` - UUID or approved sortable identifier.
- `organization_id`.
- `legal_entity_id` when ownership/finance/legal meaning applies.
- `record_number` or human-readable code where needed.
- `status` and state-transition metadata.
- `classification`.
- `owner_user_id` or ownership relationship.
- `created_at`, `created_by`.
- `updated_at`, `updated_by`.
- `version` for optimistic concurrency.
- `archived_at`, `archived_by`, `archive_reason`.
- `source_system`, `source_record_id`, `import_batch_id` for migration/integration.
- `correlation_id` for command/workflow traceability.

Important conventions:

- Money uses exact decimal or integer minor units plus currency.
- Dates and timestamps are different types and are not interchanged.
- External IDs have provider and environment context.
- Free-text status values are prohibited.
- Sensitive fields are separated or masked rather than mixed into broad tables.
- Posted, approved, signed, or accepted versions are immutable.
- Many-to-many relationships use explicit association records with role, effective dates, and provenance.

---

# 3. Identity and Organization Domain

## Core tables/entities

### `organizations`

KSP tenant record. Future tenant support does not imply external SaaS launch.

### `legal_entities`

Registered entities with legal name, jurisdiction, tax/currency settings, effective dates, and status.

### `business_units`, `departments`, `teams`, `locations`

Operational hierarchy. Relationships are effective-dated to preserve history.

### `profiles`

Application profile linked to Supabase Auth identity. Contains ordinary business identity fields only.

### `person_private_records`

Restricted people data separated from general profiles.

### `memberships`

A person's relationship to the organization, with engagement type, start/end date, status, manager, department, and worker classification metadata.

### `roles`

Reusable permission-role definitions.

### `permissions`

Named action/resource capabilities.

### `role_permissions`

Maps roles to permissions, including conditions.

### `role_assignments`

User, role, scope type, scope ID, effective period, grantor, approver, purpose, and status.

### `project_memberships`

User-to-project relationship with project role, work packages, visibility, start/end date, and allocation.

### `temporary_access_grants`

Explicit temporary access with approval and expiration.

### `access_reviews`, `access_review_items`

Periodic attestation records.

### `sessions_security_events`

Application-level security event references; sensitive provider logs may remain external.

## Membership states

`invited -> onboarding -> active -> suspended -> ended`

Reactivation creates a new approved lifecycle event rather than erasing prior history.

---

# 4. People and Capacity Domain

## Core entities

- `skills`.
- `person_skills` with proficiency and verification.
- `certifications` and expiration.
- `availability_calendars`.
- `work_schedules`.
- `time_off`.
- `capacity_periods`.
- `allocations` by project/work package and period.
- `rate_cards`.
- `compensation_records` under Restricted access.
- `contractor_agreements`.
- `onboarding_plans` and steps.
- `offboarding_plans` and steps.
- `policy_acknowledgements`.
- `asset_assignments`.

## Capacity calculation

```text
Available capacity
= scheduled working capacity
- approved time off
- non-project obligations
- committed project allocations
```

The system stores inputs and produces a forecast. It must not imply that recorded capacity equals actual productivity or performance.

---

# 5. CRM and Sales Domain

## Core entities

### `accounts`

Prospect, client, partner, vendor overlap, or other organization. Account type and relationship are explicit.

### `contacts`

People associated with accounts, with contact preferences, source, consent, language, and status.

### `leads`

Unqualified signals with source and triage state.

### `opportunities`

Qualified potential revenue. Key fields include owner, account, stage, forecast category, target close date, estimated value, currency, probability, service lines, next action, and risk.

### `opportunity_activities`

Calls, meetings, emails, notes, and follow-ups.

### `service_catalog_items`

Versioned offerings, pricing rules, included deliverables, assumptions, exclusions, and standard terms.

### `estimates`

Resource, direct-cost, schedule, margin, and risk estimate behind a commercial offer.

### `proposals` and `proposal_versions`

Proposal container and immutable versions.

### `pricing_approvals`, `discount_requests`, `term_exceptions`

Controlled commercial exceptions.

### `agreements`, `agreement_versions`, `signature_events`

Executed contractual evidence and status. Actual e-signature may be external.

### `sales_handoffs`

Checklist and acceptance between sales and delivery.

## Opportunity stages and exit criteria

1. **New** - owner assigned; initial response due.
2. **Discovery** - need, contact, and next meeting captured.
3. **Qualified** - fit, authority, timing, budget range, and problem confirmed.
4. **Solutioning** - service configuration and estimate in progress.
5. **Proposal Review** - approved proposal version prepared/sent.
6. **Negotiation** - active commercial/legal resolution.
7. **Commit** - client intent evidenced; remaining gates known.
8. **Won** - accepted agreement/commercial evidence.
9. **Lost** - reason and competitor/alternative recorded.
10. **Nurture** - not active; next review date required.

Stages are not moved backward to hide a lost opportunity. Reopened work creates a recorded transition or a new opportunity based on policy.

---

# 6. Client Domain

## Core entities

- `clients` - client-specific operational profile linked to an account.
- `client_contacts` - contact role and authority.
- `client_relationship_assignments`.
- `client_health_snapshots` and drivers.
- `client_communication_preferences`.
- `client_requests`.
- `client_feedback`.
- `client_complaints` and service recovery.
- `client_portal_memberships`.
- `portal_publications`.
- `client_renewals`.
- `client_offboarding_records`.

## Client health drivers

Recommended inputs:

- payment status;
- delivery status;
- unresolved issues;
- communication freshness;
- client inputs/approvals overdue;
- satisfaction/feedback;
- scope stability;
- relationship risk;
- renewal probability.

The score stores driver values, calculation version, explanation, and timestamp.

---

# 7. Portfolio and Project Domain

## Core entities

### `portfolios`, `programs`, `projects`

Project is the primary delivery container. A project may contain multiple work packages.

### `project_templates`, `template_versions`

Versioned template definitions. Existing projects retain the version used at creation unless explicitly upgraded.

### `work_packages`

Typed service work: software, website, design, filming, editing, content, marketing, consulting, or internal.

### `scope_items`

Approved included/excluded scope and source proposal/change order.

### `project_baselines`

Immutable approved snapshot of scope, schedule, revenue, budget, milestones, and staffing assumptions.

### `milestones`

Outcome gates with dates, criteria, weight, and acceptance.

### `work_items`

Unified task kernel with type, parent, owner, status, priority, estimate, due date, blocker, project, work package, and required evidence.

### `work_item_dependencies`

Finish-to-start and other supported relationships.

### `deliverables`, `deliverable_versions`

Deliverable definition and immutable version instances.

### `acceptance_criteria`, `verification_evidence`

Traceable expectations and proof.

### `risks`

Probability, impact, exposure, response, owner, trigger, review date, and status.

### `issues`

Active problem, impact, owner, response, target, and resolution evidence.

### `assumptions`, `constraints`

Reviewed and linked to changes/risks when invalidated.

### `decisions`

Context, options, decision, owner, approvers, consequences, review date, and supersession.

### `change_requests`, `change_impacts`, `change_orders`

Controlled scope/schedule/cost/revenue changes.

### `status_reports`

Versioned generated or authored reports with snapshot sources.

### `project_closures`, `retrospectives`, `support_handoffs`

Closeout evidence and transition.

## Work item status

Recommended common lifecycle:

`inbox -> ready -> in_progress -> blocked -> in_review -> done -> canceled`

Rules:

- `ready` requires definition-of-ready fields.
- `blocked` requires blocker description, owner, and review date.
- `done` requires definition-of-done and evidence.
- Reopening from `done` records reason and history.

## Project lifecycle

`proposed -> onboarding -> planning -> active -> on_hold -> closing -> closed -> canceled`

A project state is independent from health. An active project can be Critical; an on-hold project can be controlled.

---

# 8. Software Delivery Domain

## Core entities

- `products`.
- `applications`.
- `repositories`.
- `requirements`.
- `user_stories`.
- `acceptance_criteria`.
- `architecture_decisions`.
- `technical_designs`.
- `environments`.
- `external_branches` references.
- `pull_requests` references.
- `builds`.
- `test_plans` and `test_runs`.
- `releases` and `release_items`.
- `deployments`.
- `feature_flags`.
- `defects`.
- `vulnerabilities`.
- `incidents` and timeline entries.
- `service_objectives`.
- `support_obligations`.
- `technical_debt_items`.

## Requirement status

`draft -> reviewed -> approved -> implemented -> verified -> released -> retired`

Implementation is not verification. Release is not acceptance unless defined by the project.

## Release status

`draft -> candidate -> staging -> approved -> deploying -> live -> rolled_back -> superseded`

## Deployment record minimum

- application and environment;
- repository, commit, PR, and release;
- initiator and approver;
- start/end time;
- migration references;
- configuration/feature flags;
- health checks;
- monitoring window;
- outcome;
- rollback reference;
- incidents.

---

# 9. Creative and Media Domain

## Core entities

- `creative_briefs`.
- `concepts`.
- `scripts` and versions.
- `storyboards`.
- `shot_lists` and shots.
- `call_sheets`.
- `production_days`.
- `locations`.
- `participants`.
- `releases`.
- `permits`.
- `usage_rights`.
- `music_licenses` and `stock_licenses`.
- `equipment_reservations`.
- `capture_sessions`.
- `media_ingest_batches`.
- `media_assets`.
- `media_files`.
- `file_checksums`.
- `proxies`.
- `edit_projects`.
- `edit_versions`.
- `review_sessions`.
- `timecoded_comments`.
- `qc_checks`.
- `masters`.
- `derivatives`.
- `deliveries`.
- `publication_authorizations`.
- `archive_packages`.

## Media asset lifecycle

`expected -> captured -> ingesting -> ingested -> verified -> active -> mastered -> archived -> destruction_due -> destroyed`

Original files never become edited in place. `media_files` identifies original, proxy, project, master, and derivative relationships.

## Rights model

Rights must capture:

- asset/person/location/source;
- right type;
- owner/licensor;
- granted uses;
- channels/media;
- geography;
- start/end date;
- exclusivity;
- attribution requirement;
- compensation;
- restrictions;
- evidence document;
- status and renewal/expiry.

A publication query checks all linked rights against the intended use.

## Review model

- Review session references one immutable version.
- Comment has author, timestamp/timecode, category, text, status, assignee, and resolution.
- Conflicting feedback is escalated to the designated approver.
- A new version does not erase prior comments or approvals.

---

# 10. Marketing and Content Domain

## Core entities

- `campaigns`.
- `campaign_objectives`.
- `audiences`.
- `offers`.
- `messages`.
- `channels`.
- `content_items`.
- `content_variants`.
- `editorial_calendar_entries`.
- `publication_records`.
- `utm_definitions`.
- `tracked_links`.
- `landing_pages` references.
- `forms` references.
- `experiments`, `experiment_variants`, `stop_rules`.
- `campaign_budgets`.
- `marketing_spend`.
- `metric_snapshots`.
- `attribution_records`.
- `campaign_reports`.

## Content lifecycle

`idea -> brief -> planned -> creating -> internal_review -> client_review -> approved -> scheduled -> published -> measured -> archived`

Not every internal content item needs client review. Workflow policy determines required gates.

## Attribution rules

Every report stores:

- attribution model;
- source system;
- lookback window;
- matching method;
- confidence/limitations;
- last synchronization;
- excluded data.

---

# 11. Finance Domain

## 11.1 Core ledger entities

### `chart_of_accounts`

Account code, name, type, subtype, normal balance, currency behavior, legal entity, active dates, and external accounting mapping.

### `fiscal_periods`

Open, soft-close, closed, or reopened states.

### `journal_entries`

Header with legal entity, period, transaction date, posting date, source, description, status, evidence, and reversal relationship.

### `journal_lines`

Account, debit, credit, currency, base amount, project, client, vendor, department, tax category, and dimensions.

Constraint: total debits equal total credits by currency/base rules before posting.

### `financial_accounts`

Bank, cash, card, processor, wallet, clearing, or loan account. Sensitive identifiers are isolated.

### `statement_imports`, `statement_lines`, `reconciliation_matches`

External statement evidence and matching.

## 11.2 Accounts receivable

- `customer_invoices`.
- `invoice_lines`.
- `invoice_schedules`.
- `credit_notes`.
- `customer_payments`.
- `payment_allocations`.
- `refunds`.
- `receivable_adjustments`.
- `collection_actions`.

Invoice states:

`draft -> approved -> issued -> partially_paid -> paid -> overdue -> disputed -> voided -> written_off`

A status may be computed from due/payment/dispute state rather than manually assigned.

## 11.3 Accounts payable

- `vendor_bills`.
- `bill_lines`.
- `vendor_credits`.
- `payment_requests`.
- `payment_batches`.
- `vendor_payments`.
- `payable_adjustments`.

Bill states:

`draft -> under_review -> approved -> scheduled -> partially_paid -> paid -> overdue -> disputed -> voided`

## 11.4 Procurement

- `purchase_requests`.
- `vendor_quotes`.
- `purchase_orders`.
- `goods_service_receipts`.
- `matching_exceptions`.

Policy selects two-way (PO/bill) or three-way (PO/receipt/bill) matching.

## 11.5 Expenses and reimbursements

- `expense_reports`.
- `expense_items`.
- `receipts`.
- `policy_exceptions`.
- `reimbursements`.

## 11.6 Subscription domain

- `subscriptions`.
- `subscription_terms`.
- `subscription_charges`.
- `software_products`.
- `software_seats`.
- `seat_assignments`.
- `subscription_reviews`.

## 11.7 Project economics

- `project_budgets` and versions.
- `budget_lines`.
- `cost_commitments`.
- `project_cost_allocations`.
- `revenue_schedules` metadata.
- `margin_forecasts`.
- `profitability_snapshots`.

Recommended calculations:

```text
Contracted revenue
+ approved change-order revenue
= current contract value

Actual direct cost
+ committed direct cost
+ estimate to complete
= forecast direct cost

Current contract value
- forecast direct cost
= forecast contribution

Forecast contribution / current contract value
= forecast contribution margin
```

Internal labor costing requires approved cost-rate policy and is separate from payroll.

## 11.8 Posting lifecycle

`draft -> submitted -> approved -> posted -> reversed`

- Only balanced, validated entries can be posted.
- Posted entries cannot be edited/deleted.
- Reversal creates a new linked entry.
- Source document corrections flow through controlled adjustments.

## 11.9 Monthly close

- bank/card/processor reconciliation;
- AR/AP review;
- unmatched/uncategorized transaction review;
- subscription and accrual review;
- project cost/revenue review;
- opening/closing balance checks;
- inter-account transfer clearing;
- exception report;
- CPA/statutory sync status;
- executive approval;
- period lock.

---

# 12. Vendors, Assets, and Documents

## Vendor entities

- `vendors`.
- `vendor_contacts`.
- `vendor_due_diligence`.
- `vendor_payment_profiles` under Restricted access.
- `vendor_agreements`.
- `vendor_insurance`.
- `vendor_performance_reviews`.
- `vendor_access_links`.

## Asset entities

- `assets`.
- `asset_categories`.
- `asset_kits` and components.
- `asset_reservations`.
- `asset_custody_events`.
- `asset_inspections`.
- `maintenance_records`.
- `damage_loss_incidents`.
- `asset_disposals`.
- `domains`.
- `credential_references`.

## Document entities

- `documents`.
- `document_versions`.
- `file_objects`.
- `external_file_references`.
- `document_relationships`.
- `document_approvals`.
- `signature_references`.
- `retention_classes`.
- `retention_assignments`.
- `legal_holds`.
- `destruction_requests`.
- `knowledge_articles`.
- `policy_documents`.

---

# 13. Workflow and Approval Domain

## Core entities

### `workflow_definitions`

Name, version, trigger, applicable record types, active dates, and definition JSON/normalized steps.

### `workflow_steps`

Step type: task, approval, condition, wait, timer, integration, notification, AI draft, manual verification, or terminal.

### `workflow_instances`

Links definition version to business record and current state.

### `workflow_step_instances`

Assignee/approver, state, due date, input, output, and attempt history.

### `approval_policies`

Conditions, approver selectors, thresholds, separation, expiry, and evidence requirements.

### `approval_requests`, `approval_decisions`

Exact object version, requester, approvers, decision, comment, and timestamp.

### `automation_rules`

Low-risk event-condition-action rules under version control.

### `outbox_events`

Transactional event records.

### `queue_messages`, `dead_letter_items`

Durable asynchronous execution and exceptions.

### `idempotency_keys`

Prevents duplicate command/integration execution.

## Workflow states

`pending -> running -> waiting -> completed -> failed -> canceled -> superseded`

Step states include `pending`, `ready`, `claimed`, `in_progress`, `waiting`, `approved`, `rejected`, `completed`, `failed`, `skipped`, and `expired` as appropriate.

## Workflow guarantees

- Version is frozen at start.
- Every transition is validated and audited.
- Timers and retries are durable.
- Manual overrides do not delete original failure/rejection.
- Compensating actions are explicit.
- Workflow and business state remain consistent within defined transaction boundaries.

---

# 14. Notification and Communication Domain

## Core entities

- `notification_templates`.
- `notification_events`.
- `notification_deliveries`.
- `notification_preferences`.
- `escalation_policies`.
- `digest_runs`.
- `communication_records`.
- `meeting_records`.
- `meeting_actions`.
- `meeting_decisions`.
- `inbox_items`.
- `triage_proposals`.

Notification delivery is not business completion. For example, sending an approval email does not mean the approval was received.

---

# 15. Executive Intelligence Domain

## Core entities

- `metric_definitions`.
- `metric_thresholds`.
- `metric_snapshots`.
- `health_models` and versions.
- `health_snapshots`.
- `forecast_models` and snapshots.
- `executive_briefs`.
- `operating_review_packs`.
- `exceptions`.
- `recommendations`.
- `recommendation_actions`.

Every generated statement links to source records or metric snapshots. Recommendation and fact are stored/displayed separately.

---

# 16. AI Governance Domain

## Core entities

- `ai_agents`.
- `ai_capabilities`.
- `ai_agent_capability_grants`.
- `ai_tools`.
- `ai_instruction_versions`.
- `ai_provider_configs`.
- `ai_run_requests`.
- `ai_runs`.
- `ai_run_resources`.
- `ai_run_tool_calls`.
- `ai_proposed_actions`.
- `ai_action_approvals`.
- `ai_evaluations`.
- `ai_feedback`.
- `ai_incidents`.
- `ai_budgets`.
- `ai_kill_switches`.

## Agent run lifecycle

`requested -> policy_check -> queued -> running -> awaiting_review -> approved_for_action -> executing -> completed`

Alternative terminal states: `rejected`, `failed`, `canceled`, `blocked`, `expired`.

## Run record minimum

- agent and instruction version;
- initiating human/system event;
- purpose and risk class;
- model/provider/version where available;
- authorized scope;
- resources accessed;
- tool calls and outcomes;
- input/output hashes or protected references;
- token/compute/cost estimate;
- validation result;
- proposed actions;
- human decisions;
- execution result;
- corrections and feedback;
- incident linkage.

---

# 17. Audit Domain

## Core entities

- `audit_events`.
- `audit_change_sets`.
- `audit_export_requests`.
- `impersonation_sessions`.
- `data_access_events` for protected operations.
- `configuration_changes`.

Audit storage may be partitioned and archived but not altered by business users. Sensitive before/after values may be hashed, encrypted, or represented through protected references to avoid creating a second uncontrolled data copy.

---

# 18. Import and Data Quality Domain

## Core entities

- `source_systems`.
- `import_jobs`.
- `import_batches`.
- `import_source_rows`.
- `import_mappings`.
- `validation_results`.
- `quarantine_items`.
- `duplicate_candidates`.
- `reconciliation_controls`.
- `migration_approvals`.

## Data-quality dimensions

- completeness;
- validity;
- uniqueness;
- consistency;
- accuracy against evidence;
- timeliness/freshness;
- referential integrity;
- classification and ownership completeness.

## Quarantine behavior

A quarantined row:

- is not authoritative;
- does not affect financial or operational totals;
- retains original value and source;
- receives reason codes;
- can be corrected, matched, excluded, or escalated;
- records reviewer and resolution.

---

# 19. Core Relationship Map

```text
Organization
  -> Legal Entity
  -> Business Unit / Department / Team
  -> Membership -> Profile/Auth User
  -> Role Assignment -> Scope

Account
  -> Contact
  -> Lead / Opportunity
  -> Proposal Version
  -> Agreement
  -> Client
  -> Project
  -> Work Package
  -> Milestone / Work Item / Deliverable Version

Project
  -> Baseline
  -> Team Allocation
  -> Risk / Issue / Decision / Change Request
  -> Revenue / Budget / Cost / Invoice / Payment
  -> Software Delivery records
  -> Creative/Media records
  -> Marketing Campaign records
  -> Documents / Assets / Meetings

Business Record Version
  -> Workflow Instance
  -> Approval Request
  -> Approval Decisions
  -> Audit Events
  -> Notifications
  -> AI Run / Proposed Action
```

---

# 20. Deletion, Archive, and Retention Rules

- Drafts without business effect may be deleted under policy.
- Active or historical business records are archived, not ordinarily deleted.
- Posted financial records are retained and corrected through entries.
- Signed agreements and approved versions remain immutable.
- Audit events are never edited or ordinarily deleted.
- Client/project closure triggers retention assignment, not immediate destruction.
- Legal hold overrides ordinary destruction schedules.
- Object-storage deletion must account for versions, replicas, backups, and external-file authority.
- Destruction creates an evidence record without retaining the destroyed sensitive content.

---

# 21. Data Model Review Gates

Before a domain schema is approved:

- business owner confirms definitions;
- data steward confirms ownership and quality rules;
- security confirms classification and RLS pattern;
- finance/CPA reviews accounting-related entities;
- legal/privacy reviews sensitive or contractual records;
- engineering validates constraints, indexes, migrations, and scale;
- QA defines positive/negative/transition tests;
- migration owner maps legacy sources;
- audit and retention behavior is defined.
