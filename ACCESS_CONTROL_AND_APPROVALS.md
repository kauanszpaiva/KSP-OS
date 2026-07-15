# KSP Dominion Command OS
## Access Control, Authority, and Approval Blueprint

**Version:** 1.0  
**Classification:** Confidential

---

# 1. Objective

This document defines who can discover, view, create, edit, approve, execute, export, administer, or destroy information and actions in the KSP Dominion Command OS.

The core rule is:

> Organizational status informs access, but never replaces explicit permission, scope, purpose, assurance, and approval rules.

A title such as CEO, Project Manager, Designer, Editor, or Contractor is not itself a database policy. Access is calculated from several independent dimensions.

---

# 2. Authorization Model

An authorization decision evaluates:

```text
Authenticated identity
+ account status
+ MFA/assurance level
+ organization membership
+ role assignments
+ resource scope
+ project/client membership
+ relationship to the record
+ data classification
+ record state
+ requested action
+ monetary/risk threshold
+ effective dates
+ delegation/temporary grant
+ separation-of-duties policy
+ legal hold/retention restrictions
= allow or deny
```

The platform uses:

- **RBAC:** reusable permission roles.
- **ABAC:** attributes such as department, data classification, project, amount, environment, and risk.
- **Relationship-based access:** project member, record owner, manager, client approver, assigned editor, or assigned finance operator.
- **Field-level security:** mask or isolate sensitive fields inside otherwise visible records.
- **Approval-based authorization:** action becomes executable only after required approvals.
- **Time-bound access:** assignments expire automatically.
- **Database enforcement:** Supabase RLS and protected functions.
- **Application enforcement:** domain-command authorization, validation, and workflow policy.

UI visibility is a convenience, not a security boundary.

---

# 3. Authority Layers

## 3.1 Corporate authority

Defines who can make company decisions. Kauan and Vanessa are Executive Principals.

## 3.2 Legal and financial authority

Defines who can sign, commit, approve spend, release payment, change bank/payee information, reopen periods, or accept liability.

## 3.3 Operational authority

Defines who can manage clients, projects, teams, schedules, deliverables, campaigns, production, and processes.

## 3.4 Technical authority

Defines who can manage repositories, environments, deployments, database migrations, integrations, and security configuration.

## 3.5 Data stewardship authority

Defines who owns data definitions, quality, retention, classification, and correction.

## 3.6 System administration

Defines who can configure the platform. System administrators do not automatically receive business authority or unrestricted record visibility.

---

# 4. Permission Verbs

Permissions use explicit verbs:

- `discover` - know a record exists in search/navigation.
- `view` - read non-masked fields.
- `view_sensitive` - read protected fields.
- `create` - create a draft record.
- `edit` - change an editable record.
- `transition` - move a record between allowed states.
- `assign` - change owner or participant.
- `submit` - request approval or posting.
- `review` - record review findings.
- `approve` - authorize an exact version/action.
- `execute` - perform an approved action.
- `post` - make a financial record immutable.
- `reconcile` - match operational record to external evidence.
- `publish_internal` - release to internal audience.
- `publish_client` - release to client portal.
- `publish_external` - release publicly.
- `share` - grant another user access within policy.
- `export` - export selected records.
- `bulk_export` - export a broad dataset.
- `archive` - remove from active operation while retaining.
- `restore` - return an archived record.
- `destroy` - approved permanent deletion after retention checks.
- `configure` - change reference data or ordinary module settings.
- `administer` - manage privileged configuration/integration.
- `impersonate` - approved support access acting as another user.
- `override` - bypass an ordinary rule with reason and authority.

No broad `manage_all` permission should be used in production policies.

---

# 5. Scope Types

A role assignment must declare one or more scopes:

- Organization.
- Legal entity.
- Business unit.
- Department/team.
- Client account.
- Project/program.
- Work package.
- Campaign.
- Repository/application.
- Environment.
- Financial account.
- Document collection.
- Asset class/location.
- Specific record.

Scopes can be inherited only through an explicit hierarchy. For example, project access may include project tasks but does not automatically include client banking, executive notes, or all client projects.

---

# 6. Data Classification Overrides

| Classification | Default handling | AI eligibility | Export |
|---|---|---|---|
| Public | Authenticated or approved public visibility. | Allowed under approved provider policy. | Ordinary export. |
| Internal | KSP members with business need. | Allowed for approved internal use. | Controlled ordinary export. |
| Confidential | Explicit role/scope and business need. | Only approved providers/configurations; run logged. | Explicit export permission. |
| Restricted | Purpose-limited named roles, stronger assurance, enhanced audit. | Denied by default; specific approved use only. | Separate protected approval; bulk export generally prohibited. |

Restricted field examples:

- bank routing/account numbers;
- payment destination details;
- tax identifiers;
- compensation and payroll;
- government IDs;
- disability or medical documentation;
- authentication recovery data;
- service-role and secret material;
- high-severity security findings;
- legal hold content.

---

# 7. Role Catalog

## 7.1 Executive Principal - Kauan

Default scopes: organization-wide.

Capabilities:

- View all business domains and classifications, subject to purpose and legal restrictions.
- Create, manage, review, and approve company strategy, portfolio, clients, projects, finance, people, policies, and technology.
- Administer executive and technical ownership.
- Stop any automation, integration, release, or workflow.
- Approve Restricted actions within policy.
- Act as final escalation when a policy names the CEO.

Limitations:

- Cannot self-approve actions requiring two people.
- Cannot erase audit history.
- Cannot bypass legal hold or retention destruction rules alone.
- Cannot expose secrets to browser, prompts, or ordinary records.

## 7.2 Executive Principal - Vanessa

Default scopes: organization-wide.

Capabilities:

- Same company-level visibility as Kauan.
- Manage cross-company operations, records, follow-ups, portfolios, clients, documents, meetings, approvals, and reporting.
- Prepare and approve operational actions within policy.
- Serve as executive recovery and continuity owner.
- Administer ordinary role/project assignments excluding protected executive elevation unless independently approved.
- Stop unsafe automation or access pending review.

Limitations:

- Same separation-of-duties limits as Kauan.
- Technical/financial execution rights are granted explicitly, not inferred from visibility.

## 7.3 Head of Project Delivery / Project Manager - Eric

Default scopes: assigned portfolio, programs, projects, clients, and teams.

Capabilities:

- Create and manage projects from approved commercial records.
- Build schedules, milestones, work, dependencies, risks, issues, decisions, changes, and status reports.
- Assign work to authorized project members.
- View project revenue, approved budget, committed direct cost, actual direct cost, and margin forecast when granted.
- Prepare change orders and client updates.
- Publish approved project information to client portal.
- Approve operational completion where designated.
- Escalate budget, scope, client, capacity, and quality risk.

Default exclusions:

- Company-wide banking and cash details.
- Payroll, compensation, equity, tax IDs, and unrelated legal records.
- Unrelated projects/clients.
- Production secrets and unrestricted database access.
- Final approval of non-standard contracts, large spend, or executive policy.

## 7.4 Product Design and Front-End Lead - Joshua

Default scopes: assigned projects, work packages, design systems, repositories, and preview/staging environments.

Capabilities:

- Manage UX/UI requirements, flows, prototypes, visual design, design systems, and front-end work.
- Review and approve design/frontend quality when designated.
- Access approved project briefs, content, brand assets, client feedback, and technical requirements.
- Link Figma, GitHub PRs, and Preview deployments.
- Contribute to accessibility and release evidence.

Default exclusions:

- Company-wide finance and people records.
- Production secrets.
- Client records unrelated to assigned work.
- Contract values or margin unless explicitly needed and granted.
- Final production deployment authority unless separately assigned.

## 7.5 Capture Specialist / Videographer

Default scopes: assigned production days and work packages.

Capabilities:

- View approved brief, script, call sheet, shot list, location, contacts, schedule, safety notes, and equipment assignment.
- Check equipment out/in.
- Confirm capture status and scene completion.
- Report incidents and technical problems.
- Upload or register source media and manifest evidence.

Default exclusions:

- Client financials and internal margin.
- Unrelated projects or media.
- Contract, people, or executive records.
- Publication approval.

## 7.6 Editor / Motion Designer

Default scopes: assigned edit work packages and media collections.

Capabilities:

- Access source/proxy media, briefs, brand assets, licensed assets, and feedback for assigned work.
- Create edit versions and export candidates.
- Resolve time-coded feedback.
- Record QC status and handoff.

Default exclusions:

- Modify source media manifest.
- Approve their own final client acceptance when independent review is required.
- Publish externally unless separately granted.
- Access unrelated client or financial data.

## 7.7 Marketing Manager / Content Lead

Default scopes: assigned campaigns, clients, channels, and budgets.

Capabilities:

- Plan campaigns and content calendars.
- Request/coordinate production.
- Manage copy, creatives, UTM definitions, publication schedule, and performance records.
- Approve internal marketing content when designated.
- View spend and outcome for assigned campaigns.

Default exclusions:

- Commit spend above threshold.
- Access unrelated finance/clients.
- Publish high-risk content without required approval.

## 7.8 Finance Operator

Default scopes: approved legal entities, accounts, periods, vendors, clients, and finance modules.

Capabilities:

- Prepare invoices, bills, expenses, reimbursements, journal drafts, and reconciliations.
- Import statements and resolve matching exceptions.
- Manage subscriptions and AP/AR operations.
- Prepare payment batches outside direct payment execution.
- Produce close and exception reports.

Default exclusions:

- Approve their own prepared payment or journal when separation is required.
- Change bank/payee details and approve the resulting payment alone.
- Reopen periods or destroy financial records without protected approval.

## 7.9 Bookkeeper / CPA Viewer

Capabilities are configured by agreement:

- Read/export approved finance records.
- Reconcile or post selected entries.
- View supporting evidence.
- Record review findings.
- Synchronize statutory accounting identifiers.

The role does not receive ordinary project, creative, people, or executive access.

## 7.10 System Administrator

Capabilities:

- Configure application settings, integrations, feature flags, and diagnostics.
- Manage non-executive account lifecycle under policy.
- View technical logs with sensitive-data minimization.
- Run approved migrations and operational procedures.

Default exclusions:

- Business authority.
- Unrestricted viewing of Confidential/Restricted business content.
- Audit editing.
- Self-granted executive/finance rights.

## 7.11 Security Administrator

Capabilities:

- Review security events, access grants, sessions, vulnerabilities, and policy status.
- Revoke sessions and suspend risky access.
- Coordinate incidents.
- Review privileged changes.

Default exclusions:

- Ordinary business content unless required for an approved investigation.
- Business/financial approval.

## 7.12 Contractor / Freelancer

- Access is project/work-package-specific.
- Start and end dates are mandatory.
- External sharing/export is denied by default.
- Access automatically expires.
- Only assigned files, tasks, comments, and deliverables are visible.
- Required agreement and onboarding gates must be satisfied before activation.

## 7.13 Client Administrator

- Manages client-side portal users for their own client account if enabled.
- Views explicitly published client records.
- Submits requested inputs and approvals.
- Views invoices/payments if granted.
- Cannot see internal notes, costs, margin, other clients, or internal permissions.

## 7.14 Client Approver

- Views exact deliverable versions published for approval.
- Approves, rejects, or comments within deadline.
- Cannot alter internal project state directly.

---

# 8. High-Level Access Matrix

Legend:

- **O** - organization/domain ownership or administration.
- **A** - approve.
- **M** - manage/edit.
- **C** - contribute.
- **V** - view.
- **P** - explicit client-published view/action.
- **-** - no default access.

Actual access remains scope- and policy-dependent.

| Domain | Kauan | Vanessa | Eric | Joshua | Capture | Editor | Marketing | Finance | Contractor | Client |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| Executive strategy/decisions | O/A | O/A | V as invited | V as invited | - | - | V as invited | V as invited | - | - |
| Organization and roles | O/A | O/A | V team scope | V own/team scope | V own | V own | V own/team | V own/team | V own | - |
| CRM and pipeline | O/A | O/A/M | M assigned | V assigned | - | - | C/M assigned | V finance-related | C assigned | - |
| Client 360 | O/A | O/A/M | M assigned | V/C assigned | V limited | V limited | M assigned | V/M billing | V limited | P |
| Project portfolio | O/A | O/A/M | M/A assigned | C/M assigned | C assigned | C assigned | C/M assigned | V cost scope | C assigned | P |
| Project budget/margin | O/A | O/A | M/V assigned | V only if granted | - | - | V campaign scope | M/A | - | - |
| Software delivery | O/A | V/M ops | M delivery | M/A design/front-end | - | - | V dependencies | V cost only | C assigned | P release info |
| Creative production | O/A | M/A ops | M delivery | M/A design | C/M capture | C/M edit | M/A campaign | V cost | C assigned | P review |
| Marketing/content | O/A | M/A | M delivery | C design | C assigned | C assigned | M/A | V spend | C assigned | P if client work |
| Finance ledger/AP/AR | O/A | O/A or V by policy | V project scope | - | - | - | V campaign scope | M/A | - | P own invoices |
| Banking/payee details | A/V restricted | A/V restricted | - | - | - | - | - | M restricted | - | - |
| Compensation/equity | O/A restricted | O/A restricted | - | - | - | - | - | M restricted if assigned | V own agreement only | - |
| Documents/knowledge | O/A | O/A/M | M scope | C/M scope | C limited | C limited | C/M scope | M finance scope | C limited | P |
| Equipment/assets | O/A | M/A | M project | C assigned | M custody | C assigned | C assigned | V cost | C assigned | - |
| Client portal publishing | A/M | A/M | M/A assigned | C submit | C submit | C submit | M/A assigned | M invoice docs | C submit | P |
| Production deployment | A/execute if assigned | A ops if assigned | review/request | review/execute if assigned | - | - | - | - | - | - |
| Security/admin | O/A | O/A continuity | - | - | - | - | - | - | - | - |
| Audit search | O/V | O/V | V scope | V own changes | V own | V own | V own/scope | V finance scope | V own | V portal actions |
| Bulk export | A | A | by separate approval | by separate approval | - | - | by separate approval | by separate approval | - | own portal export only |

---

# 9. Approval Policy Model

An approval policy contains:

- policy name and version;
- protected action;
- triggering conditions;
- required approver role/relationship;
- number and sequence of approvals;
- self-approval prohibition;
- monetary/risk thresholds;
- required evidence;
- approval expiry;
- delegation rules;
- emergency override rules;
- execution actor;
- post-execution verification;
- audit and notification behavior.

Approval is bound to an object version and action. Any material change invalidates prior approval.

---

# 10. Critical Action Matrix

Threshold values are configuration decisions; the control shape is mandatory.

| Action | Preparer | Required approval | Executor | Independent verification |
|---|---|---|---|---|
| Grant Executive Principal role | Existing Executive Principal or security owner | Both executive principals or documented recovery procedure | Security/system admin | Access review notification and session check |
| Remove/suspend Executive Principal | Security owner | Other executive plus recovery authority | Security admin | Recovery access confirmed first |
| Change vendor bank/payee details | Finance operator | Executive/finance approver not involved in change | Finance operator | Out-of-band vendor verification |
| Release payment above threshold | Finance operator | Two approved authorities per threshold | Authorized bank user outside OS | Bank confirmation and ledger reconciliation |
| Reopen closed period | Finance operator/CPA | Executive finance authority plus second approver | Finance admin | Re-close report and exception log |
| Write off receivable above threshold | Finance operator/project owner | Executive finance authority | Finance operator | Client/account evidence |
| Approve non-standard contract term | Sales/project owner | Executive plus legal reviewer where required | Authorized signer | Executed version retained |
| Approve large discount | Opportunity owner | Executive according to margin threshold | Sales operator | Final proposal version check |
| Approve project change | PM | Client approver plus internal commercial authority when material | PM | Baseline version and change-order evidence |
| Publish high-risk public content | Marketing/creative | Brand/client/legal/executive chain by risk | Authorized publisher | Published URL/screenshot and version evidence |
| Production database migration | Engineer/agent | Technical CODEOWNER plus release approver | Authorized CI/deployer | Migration/health/reconciliation checks |
| Production deployment | Engineer/agent | Required reviewers plus production approver | CI/Vercel authorized path | Health checks and monitoring |
| Change authentication/RLS policy | Engineer/security | Security reviewer plus technical owner | CI/migration path | Negative authorization tests |
| Rotate production service secret | Security/technical owner | One executive or security policy approver | Authorized owner | Dependent services verified and old key revoked |
| Bulk export Restricted data | Authorized requester | Executive plus data/privacy owner | Controlled export job | Export manifest, expiry, and deletion confirmation |
| Destroy protected records | Data owner | Retention/legal authority plus executive if Restricted | Records admin | Destruction certificate; backup behavior documented |
| Increase Autopilot to A3 capability | Agent owner | Executive plus security/domain owner | AI administrator | Evaluation, canary, logging, and kill-switch test |
| Disable audit/backups/security checks | No ordinary workflow | Prohibited; emergency vendor procedure only | Authorized infrastructure owner | Immediate incident and post-action review |

---

# 11. Delegation and Substitution

- Delegation is explicit, time-bound, scoped, and revocable.
- Non-delegable actions include executive elevation, selected financial approvals, retention destruction, and security recovery unless policy explicitly permits.
- An approver cannot delegate to the action preparer when separation is required.
- Vacation substitutes are preconfigured and visible.
- Expired delegation cannot be used to complete a pending action.
- The audit record shows original authority, delegate, purpose, and period.

---

# 12. Temporary and Emergency Access

## 12.1 Temporary access

Requires:

- requester;
- purpose;
- requested resources and actions;
- start/end time;
- approver;
- MFA level;
- automatic revocation;
- post-access review for protected scopes.

## 12.2 Break-glass access

Used only when normal executive/security recovery is unavailable.

Controls:

- separately secured account or credential;
- no routine use;
- strong MFA and recovery custody;
- immediate alerts to both executive principals;
- mandatory reason;
- session recording/logging where supported;
- automatic expiration;
- post-use credential rotation;
- incident/post-event review.

---

# 13. Client Portal Security Model

Client access is not merely internal access with a hidden menu.

Required controls:

- explicit `client_portal_membership`.
- explicit `portal_publication` record linking an internal object/version to the client account.
- RLS policy requiring matching client account and active membership.
- separate client role and action set.
- no direct access to internal comments or internal file collections.
- signed/private file delivery.
- approval action validates exact published version.
- portal search limited to published resources.
- negative tests for cross-client identifiers and guessed URLs.
- client-user offboarding controlled by KSP and optionally client administrator under policy.

---

# 14. RLS Policy Architecture

Every exposed table is classified into one of these patterns:

## 14.1 Organization-global controlled

Examples: reference data, ordinary internal policies.

Access requires active organization membership plus role permission.

## 14.2 Project-scoped

Examples: tasks, milestones, risks, deliverables.

Access requires active project membership or an organization role with portfolio scope. Sensitive project fields use additional checks.

## 14.3 Client-scoped internal

Examples: client contacts, account activity.

Access requires assigned client relationship or broader approved role.

## 14.4 Client-published

Examples: portal deliverable, invoice, shared document.

Access requires portal publication plus active portal membership.

## 14.5 Restricted isolated

Examples: banking, compensation, medical/disability documents, secrets metadata.

Access uses named protected roles, higher assurance, purpose, and enhanced audit. These records should not be reachable by generic project-membership policies.

## 14.6 Actor-owned

Examples: personal notification preferences or private drafts.

Access requires actor identity except explicit sharing.

## 14.7 Append-only

Examples: audit, approvals, posted journal lines, custody events, agent runs.

Ordinary users may insert only through protected functions and cannot update/delete.

---

# 15. Required Authorization Tests

Every module must include positive and negative tests.

Minimum scenarios:

- unauthenticated user denied;
- suspended user denied;
- active user from another organization denied;
- internal user without project membership denied;
- project member can see allowed record but not Restricted fields;
- contractor loses access after expiry;
- client A cannot access client B by ID, search, file URL, or export;
- client cannot access internal comments on published deliverable;
- PM can edit assigned project but not unrelated project;
- designer can access brief but not company cash/payroll;
- finance operator can prepare but cannot self-approve protected payment;
- system admin cannot read Restricted business data without separate role;
- old approval invalid after material version change;
- low-MFA session denied for protected action;
- temporary grant expires automatically;
- AI agent denied action outside capability/scope;
- service-role key is never present in browser bundle;
- archived/closed/posted record rejects ordinary edits;
- legal hold prevents destruction.

---

# 16. Access Review Cadence

- Executive/owner access: monthly verification.
- Finance, security, production, Restricted access: quarterly attestation or more frequently after change.
- Project membership: reviewed at project phase change and close.
- Contractor access: reviewed at least monthly and automatically at end date.
- Client portal access: reviewed at project close, contract change, and client request.
- Integration scopes and tokens: quarterly.
- Break-glass readiness: quarterly.
- Software seats/licenses: monthly cost and assignment review.

Review campaigns record reviewer, result, changes, exceptions, and completion date.

---

# 17. Offboarding Completion Criteria

A person is not fully offboarded until:

- sessions and application access are revoked;
- external vendor access and tokens are revoked;
- project/client ownership is transferred;
- pending approvals are reassigned;
- files and knowledge are handed over;
- assigned equipment is returned or exception approved;
- software seats are reclaimed;
- shared links are reviewed;
- personal data handling is completed under policy;
- final access report is approved;
- audit evidence is retained.
