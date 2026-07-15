# KSP Dominion Command OS
## Executive Decision Register

**Version:** 1.0  
**Classification:** Confidential

This register distinguishes decisions adopted by the blueprint from business/legal choices that must be confirmed before implementation. A decision is not final until the named authority records approval.

---

# 1. Adopted Architecture Decisions

| ID | Decision | Rationale | Status/authority |
|---|---|---|---|
| ADR-001 | Build a new private `ksp-command-os` repository; do not convert the existing static website repository. | Separates public website release/security from internal system, data, migrations, and secrets. | Recommended; Kauan/Vanessa confirm in Phase 0. |
| ADR-002 | Use a modular monolith first. | Strong consistency, lower operational burden, easier audit and authorization; preserves future extraction boundaries. | Adopted blueprint default. |
| ADR-003 | Use Next.js/TypeScript on Vercel and Supabase Postgres/Auth/Storage/Functions/Cron/Queues. | Matches approved stack and supports controlled full-stack delivery. | Adopted, subject to version/plan ADR. |
| ADR-004 | Separate Local, Preview, Staging, and Production. | Prevents test/agent activity from touching Production and enables release acceptance. | Mandatory. |
| ADR-005 | Use separate Supabase projects for Staging and Production. | Strong data/secret isolation. | Mandatory. |
| ADR-006 | Use GitHub PRs, CODEOWNERS, required checks, and protected main. | Review, traceability, and release control. | Mandatory. |
| ADR-007 | Treat Command OS as system of record and Dominion Autopilot as governed actor. | Prevents AI from becoming uncontrolled authority. | Mandatory. |
| ADR-008 | Apply RBAC + ABAC + relationship/project scope + field security + approval policies. | Job titles and broad roles alone cannot safely represent KSP. | Mandatory. |
| ADR-009 | Enforce RLS on every exposed table. | Database-level protection against UI/API mistakes. | Mandatory. |
| ADR-010 | Implement an operational double-entry ledger; retain a statutory accounting boundary. | Financial integrity without prematurely replacing a licensed accounting/CPA process. | Mandatory architecture; platform choice open. |
| ADR-011 | Posted financial entries are immutable; corrections use reversal/adjustment. | Auditability and reconciliation. | Mandatory. |
| ADR-012 | Use explicit client-portal publication records. | Prevents internal data from becoming visible through generic project access. | Mandatory. |
| ADR-013 | Store large original media through an approved media lifecycle/provider; Command OS owns metadata and control. | File size, cost, backup, rights, and editor workflows differ from ordinary documents. | Mandatory boundary; provider open. |
| ADR-014 | Use transactional outbox and durable queues for asynchronous integrations. | Reliable retry, idempotency, and exception handling. | Mandatory for material async actions. |
| ADR-015 | Use one issue/branch/worktree/primary owner for agent tasks. | Prevents collisions and unaccountable generated changes. | Mandatory. |
| ADR-016 | Claude Code implements interactively; Codex independently reviews/tests; Jules handles bounded VM tasks after plan review. | Uses each tool's operating strengths while preserving separation. | Adopted development model. |
| ADR-017 | Keep AI agents away from standing Production secrets/service-role credentials. | Limits blast radius. | Mandatory. |
| ADR-018 | Accessibility and cognitive-load reduction are core acceptance requirements. | The system must support, not burden, its primary executive user. | Mandatory. |
| ADR-019 | Use English and PT-BR interface localization from the foundation. | KSP team/client language needs and user request. | Adopted. |
| ADR-020 | Use archive/retention rather than ordinary hard deletion for business records. | Audit, legal, financial, and continuity requirements. | Mandatory. |

---

# 2. Executive Governance Decisions

| ID | Decision required | Recommended default | Owner/approvers | Required by | Consequence if deferred |
|---|---|---|---|---|---|
| GOV-001 | Final legal names/entities and ownership. | One primary operating entity at launch; model additional entities but keep inactive. | Kauan + Vanessa + qualified advisor | End Phase 0 | Finance/contracts cannot be authoritative. |
| GOV-002 | Executive titles and authority. | Kauan: Founder/CEO/Primary System Owner. Vanessa: Executive Operations/Chief of Staff/Executive Co-Authority. | Kauan + Vanessa | End Phase 0 | Approval and escalation rules remain ambiguous. |
| GOV-003 | Executive deadlock resolution. | Attempt joint resolution; legal/system ownership matters escalate to Kauan; protected unilateral action remains restricted and logged. | Kauan + Vanessa + advisor as needed | End Phase 0 | Critical decisions can stall. |
| GOV-004 | Two-person critical-action list. | Adopt matrix in access blueprint. | Kauan + Vanessa | End Phase 0 | Fraud/lockout/integrity risk. |
| GOV-005 | Monetary approval thresholds. | Configure tiers by legal entity and action; no hard-coded values until cash/authority review. | Kauan + Vanessa + finance advisor | Before Phase 3 | Payment/procurement workflow incomplete. |
| GOV-006 | Break-glass custody. | Independent recovery method controlled by both executives; no shared daily account. | Kauan + Vanessa + security owner | Phase 1 | Account lockout/continuity risk. |
| GOV-007 | Initial pilot client/project. | Friendly low-risk project spanning website/software plus small creative work. | Kauan + Vanessa + Eric | Before Phase 2 pilot | Acceptance remains theoretical. |

---

# 3. Finance Decisions

| ID | Decision required | Recommended default | Owner/approvers | Required by | Consequence if deferred |
|---|---|---|---|---|---|
| FIN-001 | Statutory accounting platform. | Select CPA-supported QuickBooks Online, Xero, or equivalent after advisor review; Command OS remains operational subledger. | Executives + CPA/bookkeeper | End Phase 0 / before P3 adapter | No official sync/reconciliation target. |
| FIN-002 | Accounting basis and fiscal calendar. | Use advisor-approved basis and calendar; do not encode assumptions. | Executives + CPA | Before Phase 3 | Close/report logic uncertain. |
| FIN-003 | Base/reporting currency and multi-currency launch scope. | USD base; store original currency; enable conversion/reporting only with approved rate source. | Executives + CPA | Before P3-01 | Amount/report inconsistency. |
| FIN-004 | Chart of accounts. | CPA-reviewed KSP chart with project/client/department dimensions. | Finance owner + CPA | P3-01 | Posting cannot begin. |
| FIN-005 | Opening balances/cutover date. | Set after source reconciliation and signed migration. | Kauan + Vanessa + finance/CPA | P3-13 | Dashboards unreliable. |
| FIN-006 | Revenue recognition metadata. | Track billing/contract milestones operationally; statutory recognition remains accounting-system/CPA authority. | CPA + finance owner | Phase 3 | Margin/revenue reports may misstate timing. |
| FIN-007 | Internal labor costing. | Use approved internal cost rates for project economics, separate from payroll. | Executives + finance advisor | P3-09 | Margin excludes labor or exposes compensation. |
| FIN-008 | Time tracking requirement. | Track estimates and allocation first; require actual time only where billing/margin/control justifies it. | Kauan + Vanessa + Eric | Before P2/P3 final design | Usability versus costing tradeoff unresolved. |
| FIN-009 | Payment execution integration. | Initial release records/prepares controls but does not move money automatically. | Kauan + Vanessa + finance/security | Phase 3 | Prevents unsafe early automation. |
| FIN-010 | Retention for financial/tax records. | Advisor-defined by entity/jurisdiction; legal hold overrides. | CPA/legal + executives | Before Production financial data | Destruction/retention risk. |

---

# 4. People, Privacy, and Legal Decisions

| ID | Decision required | Recommended default | Owner/approvers | Required by | Consequence if deferred |
|---|---|---|---|---|---|
| PPL-001 | Worker classifications and agreement templates. | Record actual approved classification; no inference from role. | Executives + legal/HR advisor | Before people module production | Employment/tax risk. |
| PPL-002 | Compensation/equity/profit-share records. | Isolate as Restricted and separate from permissions. | Executives + legal/finance | Before migration | Privacy/conflict risk. |
| PPL-003 | Disability/medical/accommodation records. | Minimal Restricted records, named viewers, no performance use, operational preferences separated. | Kauan + Vanessa + qualified advisor | Phase 1 | Sensitive-data exposure. |
| PPL-004 | Privacy notice and data-subject process. | Create KSP-specific notice, request intake, verification, export/correction/deletion workflow. | Privacy/legal owner | Before client portal/public forms | Compliance/client trust risk. |
| PPL-005 | Contract/signature provider. | Start with external signature evidence/link; select provider after volume/security review. | Executives + legal | Phase 2 | Manual evidence may remain. |
| PPL-006 | Client portal terms and authorization. | Client admin and approver roles, explicit publication, contractual responsibility. | Executives + legal | Before portal pilot | Portal legal/security ambiguity. |
| PPL-007 | Marketing outreach consent rules. | Store source/preferences/do-not-contact; approve rules by channel/jurisdiction. | Marketing + legal | Before automated outreach | Reputation/compliance risk. |

---

# 5. Media and Creative Decisions

| ID | Decision required | Recommended default | Owner/approvers | Required by | Consequence if deferred |
|---|---|---|---|---|---|
| MED-001 | Original media storage provider. | Choose after capacity, editor workflow, egress, archive, backup, and rights review; do not assume ordinary app storage. | Kauan + creative/technical owner | End Phase 0 / before P4-C04 | Cost/loss/workflow risk. |
| MED-002 | Source/proxy/master retention. | Per project/contract and media tier; defaults approved by legal/creative leadership. | Creative owner + legal/executives | Before creative production data | Unbounded cost or premature deletion. |
| MED-003 | Backup rule before source-card deletion. | Two verified copies, at least one independent, plus checksum/manifest. | Creative + technical owner | Before capture pilot | Irrecoverable media loss. |
| MED-004 | Release/license templates. | Legal-reviewed talent, location, music, stock, and usage rights records. | Legal + creative owner | Before public/client production | Rights infringement risk. |
| MED-005 | Review platform strategy. | Command OS owns versions/approval; may link to specialist review tool if needed. | Creative + technical owner | P4-C05 | Duplicate feedback/version drift. |
| MED-006 | Equipment insurance/custody policy. | Asset IDs, check-out/in, incident/damage process, insurance references. | Executives + creative ops | P4-C03 | Loss and accountability risk. |

---

# 6. Technology and Vendor Decisions

| ID | Decision required | Recommended default | Owner/approvers | Required by | Consequence if deferred |
|---|---|---|---|---|---|
| TEC-001 | GitHub Organization creation/name. | `ksp-dominion-group` or approved corporate name, owned by Kauan and Vanessa. | Kauan + Vanessa | P1-01 | Repo remains single-user continuity risk. |
| TEC-002 | Package manager/runtime/version policy. | Pin approved Node and package manager versions; automate controlled updates. | Technical owner | P1-02 | Non-reproducible builds. |
| TEC-003 | Vercel plan/environment capability. | Plan that supports required protected/custom Staging and team controls. | Executives + technical owner | P1-04 | Environment design may need adjustment. |
| TEC-004 | Supabase plan/PITR/backups. | Plan supporting Production recovery objective and required logs/security. | Executives + technical/security | P1-03/P1-17 | RPO/RTO cannot be met. |
| TEC-005 | Error monitoring provider. | Use Sentry or approved equivalent if native telemetry is insufficient. | Technical owner | P1-16 | Slow incident detection. |
| TEC-006 | File malware scanning provider. | Select server-side scanning/quarantine implementation before external uploads. | Security/technical owner | P1-13 | Malicious-file risk. |
| TEC-007 | Google integration scope. | Read/link first; write automation only per capability and consent. | Executives + data/security | Phase 2/5 | Overbroad Workspace access. |
| TEC-008 | Figma integration. | Link/reference first; automate only after ownership/version behavior is defined. | Joshua + technical owner | Phase 4 | Design source drift. |
| TEC-009 | Production support model. | Named on-call/escalation for working hours initially; expand from client SLA. | Executives + technical owner | Before Production | Unowned incidents. |

---

# 7. AI Decisions

| ID | Decision required | Recommended default | Owner/approvers | Required by | Consequence if deferred |
|---|---|---|---|---|---|
| AI-001 | Approved providers by data class. | Public/Internal broadly; Confidential only approved enterprise/privacy configuration; Restricted denied by default. | Executives + security/privacy | Before AI Production use | Data leakage/vendor risk. |
| AI-002 | Agent action authority. | Start A0/A1; introduce narrow A2 after evaluation; A3 requires human approval; A4 prohibited. | Kauan + Vanessa + domain/security | Phase 6 | Unsafe autonomy. |
| AI-003 | Agent budget. | Cost cap by provider, environment, agent, project, and period with alerts/kill. | Executives + finance/technical | Before Phase 6 | Uncontrolled spend. |
| AI-004 | Evaluation thresholds. | Domain-specific accuracy, correction, leakage, and action success thresholds; no universal number. | Domain owners + security | Before each autonomy expansion | Subjective approval. |
| AI-005 | Prompt/run retention. | Store protected references/minimum necessary content; define provider and internal retention. | Privacy/security | Before AI logging | Privacy/storage risk. |
| AI-006 | Agent incident process. | AI incidents enter normal incident system plus model/instruction/tool analysis. | Security + AI owner | P6-04 | Repeated unsafe behavior. |
| AI-007 | Development-agent merge authority. | None; protected PR/human review required. | Technical owner + executives | P1-05 | Supply-chain risk. |

---

# 8. Decision Record Template

```text
Decision ID:
Title:
Date:
Owner:
Required approvers:
Context:
Problem:
Options considered:
Evidence:
Risks and assumptions:
Decision:
Rationale:
Consequences:
Actions:
Effective date:
Review date:
Supersedes / superseded by:
```

A decision that changes data, permission, financial, security, or workflow behavior must link to the implementation issue/ADR and affected policies/tests.
