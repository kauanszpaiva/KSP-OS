# KSP Dominion Command OS
## Requirements Traceability Matrix

**Version:** 1.0  
**Classification:** Confidential

This matrix links business requirements to product modules, controls, verification, and release phase. Detailed user stories and test cases must refine, not replace, these requirements.

Legend: P0-P6 refer to roadmap phases.

---

# 1. Executive and Accessibility Requirements

| ID | Requirement | Module/control | Verification | Phase |
|---|---|---|---|---|
| EXE-001 | Kauan and Vanessa shall have organization-wide executive visibility. | Executive roles + RLS + dashboards | Authorization and dashboard acceptance tests | P1/P2 |
| EXE-002 | Critical actions shall not permit self-approval when two-person control applies. | Approval engine | Negative workflow tests | P1 |
| EXE-003 | Executive dashboard shall show decisions, approvals, risk, cash, pipeline, portfolio, clients, obligations, and changes. | Executive Intelligence | UAT with source/freshness verification | P2/P3/P6 |
| EXE-004 | The system shall recommend no more than three primary daily priorities. | Priority engine/UI | UX test and explanation validation | P2/P6 |
| EXE-005 | The system shall offer one Do Next action with reason and alternatives. | Focus workflow | User acceptance, override history | P2/P6 |
| EXE-006 | Universal capture shall accept text, link, document, receipt, image, and voice-reference input. | Universal Inbox | E2E capture/triage tests | P1/P2 |
| EXE-007 | Low-energy and focus modes shall reduce visible complexity without changing authority. | UX shell | Accessibility/usability tests | P1/P2 |
| EXE-008 | Core workflows shall target WCAG 2.2 AA. | UI/testing policy | Automated + manual audit | All |
| EXE-009 | UI shall support EN-US and PT-BR. | Localization | Locale and formatting tests | P1 |
| EXE-010 | Notifications shall be batched by default except critical policy events. | Notification engine | Policy and delivery tests | P1/P2 |

---

# 2. Identity and Access Requirements

| ID | Requirement | Module/control | Verification | Phase |
|---|---|---|---|---|
| IAM-001 | Every human user shall have a unique identity. | Supabase Auth/membership | Shared-account policy/UAT | P1 |
| IAM-002 | Protected roles shall require MFA. | Auth + RLS/AAL checks | Low-assurance denial tests | P1 |
| IAM-003 | Access shall be deny-by-default. | RLS/application auth | Negative test suite | P1 |
| IAM-004 | Access shall combine role, scope, relationship, classification, state, and time. | Authorization kernel | Matrix/property tests | P1 |
| IAM-005 | Project access shall not imply access to client finance, people, or unrelated projects. | RLS policy patterns | Cross-scope tests | P1/P2 |
| IAM-006 | Temporary grants shall expire automatically. | Grant/cron workflow | Time/expiry tests | P1 |
| IAM-007 | Offboarding shall revoke sessions, grants, tokens, seats, and asset assignments through a checklist. | People/access workflow | E2E offboarding test | P1/P2/P4 |
| IAM-008 | Client users shall access only explicitly published records for their client account. | Portal publication/RLS | Cross-client ID/search/file tests | P2 |
| IAM-009 | Bulk export and Restricted export shall require separate permission/approval. | Export workflow | Negative/approval tests | P1/P2 |
| IAM-010 | System administrators shall not automatically receive Restricted business access. | Separated roles | RLS tests | P1 |
| IAM-011 | Audit records shall be append-only and non-editable by ordinary admins. | Audit store | DB permission tests | P1 |
| IAM-012 | Break-glass use shall alert executives, expire, rotate, and receive review. | Security workflow | Tabletop/live recovery test | P1 |

---

# 3. CRM and Client Requirements

| ID | Requirement | Module/control | Verification | Phase |
|---|---|---|---|---|
| CRM-001 | Every active lead/opportunity shall have owner and next action/date. | CRM validation | Constraint/exception report | P2 |
| CRM-002 | Duplicate contacts/accounts shall be detected and merged only through review. | Data quality | Duplicate/merge tests | P2 |
| CRM-003 | Opportunity stages shall have exit criteria. | Workflow/state machine | Transition tests | P2 |
| CRM-004 | Proposal and pricing versions shall be immutable after approval/sending. | Version model | Mutation-denial tests | P2 |
| CRM-005 | Discounts and non-standard terms shall follow threshold approvals. | Approval policy | Scenario tests | P2 |
| CRM-006 | Won opportunities shall not activate delivery before agreement/deposit gates or approved exception. | Lead-to-cash workflow | E2E transition tests | P2/P3 |
| CLI-001 | Client 360 shall aggregate authorized projects, finance, contacts, documents, meetings, support, and feedback. | Client domain | UAT and permission tests | P2/P3 |
| CLI-002 | Client health shall expose driver values and freshness. | Health engine | Recalculation test | P2/P6 |
| CLI-003 | Complaints shall create owned response deadlines and resolution evidence. | Issue/service recovery | E2E complaint test | P2 |
| CLI-004 | Portal approval shall bind to an immutable deliverable version. | Portal/approval | Version mismatch tests | P2 |

---

# 4. Project and Delivery Requirements

| ID | Requirement | Module/control | Verification | Phase |
|---|---|---|---|---|
| PM-001 | Every active project shall have owner, PM, baseline, next milestone, and health explanation. | Project kernel | Completeness control | P2 |
| PM-002 | Scope, schedule, budget, and team baselines shall be versioned. | Baseline model | History/rebaseline tests | P2 |
| PM-003 | Progress shall derive from weighted accepted deliverables/milestones unless labeled override. | Progress calculation | Unit/reproducibility tests | P2 |
| PM-004 | Work completion shall require configured definition-of-done evidence. | Work item workflow | Transition tests | P2 |
| PM-005 | Blocked work shall record blocker owner and review date. | Work item validation | Completeness/alert tests | P2 |
| PM-006 | Scope changes shall use impact analysis and approval before rebaseline. | Change control | E2E change test | P2 |
| PM-007 | Status reports shall cite authoritative records and data freshness. | Reporting | Source-link tests | P2/P6 |
| PM-008 | Closed projects shall enter controlled read-only/archive state. | State/RLS | Mutation-denial tests | P2 |
| PM-009 | Project close shall include acceptance, financial review, handoff, archive, and retrospective. | Closure workflow | E2E closeout test | P2/P3/P4 |
| PM-010 | Capacity shall account for schedule, time off, obligations, and allocations. | People/capacity | Calculation tests | P2 |

---

# 5. Software and Website Requirements

| ID | Requirement | Module/control | Verification | Phase |
|---|---|---|---|---|
| SW-001 | Requirements shall map to acceptance criteria and verification evidence. | Requirements traceability | Trace completeness test | P4 |
| SW-002 | Architecture decisions shall be versioned ADRs. | ADR process | PR/release review | P1/P4 |
| SW-003 | Code changes shall enter through protected PRs and required checks. | GitHub rules | Branch protection test | P1 |
| SW-004 | AI-authored code shall receive the same tests and review as human code. | AI engineering policy | PR policy check | P1 |
| SW-005 | Preview, Staging, and Production shall be isolated. | Vercel/Supabase topology | Environment identifier test | P1 |
| SW-006 | Production deployment shall link release, commit, approvals, health checks, and rollback. | Release/deployment domain | E2E release test | P4 |
| SW-007 | Production secrets shall not be available to browser or routine AI agents. | Secret policy | Bundle/CI/access tests | P1 |
| SW-008 | Incidents shall preserve timeline and corrective actions. | Incident workflow | Incident drill | P1/P4 |
| WEB-001 | Website launch shall verify content, SEO, analytics/consent, performance, accessibility, forms, security, DNS, and rollback. | Website template | Launch checklist/UAT | P4 |

---

# 6. Creative and Marketing Requirements

| ID | Requirement | Module/control | Verification | Phase |
|---|---|---|---|---|
| CRE-001 | Capture readiness shall validate brief, call sheet, releases, location, safety, crew, and equipment. | Creative workflow | Readiness transition tests | P4 |
| CRE-002 | Source media shall have manifest and checksum and be immutable after ingest. | Media ingest | Integrity tests | P4 |
| CRE-003 | Source-card deletion policy shall require verified backup evidence. | Media workflow | Procedure/drill | P4 |
| CRE-004 | Reviews shall reference exact immutable versions and time-coded comments. | Review model | Version isolation tests | P4 |
| CRE-005 | Publication shall validate talent/location/music/stock usage rights. | Rights engine | Expired/restricted-rights tests | P4 |
| CRE-006 | Equipment custody shall be append-only from reservation through return/incident. | Asset domain | Custody lifecycle tests | P4 |
| CRE-007 | Master, derivative, delivery, publication, archive, and destruction states shall be traceable. | Media lifecycle | E2E media test | P4 |
| MKT-001 | Campaigns shall declare objective, audience, offer, budget, window, and success criteria before launch. | Campaign workflow | Readiness tests | P4 |
| MKT-002 | Paid spend shall require threshold approval before commitment. | Finance/approval | Scenario tests | P3/P4 |
| MKT-003 | Published content shall retain approved version and evidence. | Content/publication | Version/evidence test | P4 |
| MKT-004 | Attribution reports shall disclose model, source, window, freshness, and limitations. | Analytics | Report contract test | P4 |
| MKT-005 | Experiments shall define hypothesis, variants, stop rule, and decision. | Experiment workflow | Lifecycle test | P4 |

---

# 7. Finance and Procurement Requirements

| ID | Requirement | Module/control | Verification | Phase |
|---|---|---|---|---|
| FIN-001 | Monetary data shall use exact types and explicit currency. | DB/domain types | Schema/property tests | P3 |
| FIN-002 | Financial imports shall validate dates/amounts and quarantine invalid rows. | Import framework | Invalid-data tests | P3/P5 |
| FIN-003 | Journal entries shall balance before posting. | Ledger constraints | Property/DB tests | P3 |
| FIN-004 | Posted entries shall be immutable and corrected by reversal/adjustment. | Ledger lifecycle | Mutation/reversal tests | P3 |
| FIN-005 | Credit-card purchase and card payment shall not duplicate expense. | Accounting rules | Scenario tests | P3 |
| FIN-006 | Bank/card/processor accounts shall reconcile to external statements. | Reconciliation | Full-period test | P3 |
| FIN-007 | Closed periods shall reject ordinary postings. | Period lock | Negative tests | P3 |
| FIN-008 | Payee/bank-detail changes shall require independent verification and approval. | Vendor/payment controls | Workflow tests | P3 |
| FIN-009 | Payment preparation, approval, execution, and reconciliation shall be separable. | Payment workflow | Separation tests | P3 |
| FIN-010 | Dashboard totals shall reconcile to posted ledger and show freshness. | Finance reporting | Reconciliation test | P3/P6 |
| FIN-011 | Project economics shall include contracted revenue, approved changes, actual, commitment, ETC, and margin. | Project finance | Calculation tests | P3 |
| FIN-012 | Subscription records shall include billing, seats, owner, renewal, notice, allocation, usage, and cancellation. | Subscription domain | Completeness/alert tests | P3 |
| FIN-013 | Monthly close shall produce exception report and locked period. | Close workflow | Full close rehearsal | P3 |
| FIN-014 | Operational ledger shall reconcile to chosen statutory accounting system. | Accounting adapter | Sync/reconciliation tests | P3 |

---

# 8. Documents, Assets, and Knowledge Requirements

| ID | Requirement | Module/control | Verification | Phase |
|---|---|---|---|---|
| DOC-001 | Every controlled document/file shall have owner, classification, relationships, version, and retention. | Document domain | Completeness tests | P1/P5 |
| DOC-002 | Private files shall use authorized short-lived access links. | Storage service | Expiry/authorization tests | P1 |
| DOC-003 | Uploads shall be validated, quarantined/scanned, checksummed, and audited. | Upload pipeline | Malicious/type tests | P1 |
| DOC-004 | Approved documents shall be immutable versions. | Version model | Mutation tests | P1/P2 |
| DOC-005 | Legal hold shall block destruction. | Retention workflow | Negative destruction test | P1/P5 |
| AST-001 | Assets shall track acquisition, custodian, location, status, and lifecycle. | Asset domain | Lifecycle tests | P4 |
| AST-002 | Offboarding shall not close with outstanding asset/seat assignment absent approved exception. | Offboarding workflow | E2E test | P4/P5 |
| KNO-001 | Policies/SOPs shall be versioned, approved, acknowledged, reviewed, and retired. | Knowledge/policy | Lifecycle tests | P1/P5 |

---

# 9. Workflow, Reliability, and AI Requirements

| ID | Requirement | Module/control | Verification | Phase |
|---|---|---|---|---|
| WFA-001 | Workflow instances shall retain definition version. | Workflow engine | Version-change tests | P1 |
| WFA-002 | Material async actions shall be idempotent, retryable, and dead-lettered. | Outbox/queue | Duplicate/failure tests | P1 |
| WFA-003 | Failed automation shall surface as owned exception and never disappear silently. | Exception queue | Failure-path test | P1 |
| REL-001 | Database and file backups shall be separately covered. | Backup architecture | Restore drill | P1 |
| REL-002 | Production recovery objectives shall be documented and tested. | DR plan | Quarterly evidence | P1/ongoing |
| REL-003 | Logs shall be structured/correlated and exclude secrets/Restricted content. | Observability | Log review/automated checks | P1 |
| REL-004 | Core integration health and reconciliation shall be monitored. | Integration registry | Failure alert/replay test | P1/P5 |
| AI-001 | Command OS shall remain authoritative; AI shall act through approved APIs/workflows. | AI governance | Architecture/policy tests | P1/P6 |
| AI-002 | Every AI run shall record agent, instruction, scope, resources, tools, output, cost, and outcome. | AI run ledger | Run-record tests | P6 |
| AI-003 | A3 actions shall require explicit human approval; A4 shall be prohibited or separately supervised. | Action policy | Negative/approval tests | P6 |
| AI-004 | AI shall not receive standing Production service-role/secrets. | Credential policy | Access review | P1/P6 |
| AI-005 | Untrusted content shall not override system/repository policy. | Prompt-injection controls | Adversarial evaluation | P6 |
| AI-006 | Agent outputs shall pass schema/policy validation and confidence/review rules. | AI application service | Invalid/low-confidence tests | P6 |
| AI-007 | Kill switch shall disable agent/tool/capability execution. | AI governance | Live controlled test | P6 |
| AI-008 | Agent autonomy shall expand only after evaluation and executive/domain approval. | Release gate | Evaluation record | P6 |

---

# 10. Migration Requirements

| ID | Requirement | Module/control | Verification | Phase |
|---|---|---|---|---|
| MIG-001 | Every imported record shall retain source system/record/batch provenance. | Import framework | Trace test | P3/P5 |
| MIG-002 | Invalid/ambiguous/duplicate records shall enter quarantine and not affect totals. | Quarantine | Negative aggregate tests | P3/P5 |
| MIG-003 | Financial opening balances shall be reconciled and approved. | Migration/ledger | Signed reconciliation | P3 |
| MIG-004 | Active project owners shall confirm migrated state and next action. | Migration workflow | Attestation report | P5 |
| MIG-005 | Legacy sources shall become read-only after accepted cutover. | Cutover policy | Access/process verification | P5 |
| MIG-006 | Migration shall have fallback and archive evidence. | Cutover plan | Rehearsal/signoff | P5 |
