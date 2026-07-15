# KSP Dominion Command OS
## Engineering and AI-Assisted Delivery Playbook

**Version:** 1.0  
**Classification:** Confidential

---

# 1. Engineering Objective

Build and operate the Command OS through a repeatable, reviewable, secure software-delivery system in which Claude Code, Codex, and Jules accelerate work but never become unreviewed production authorities.

The existing KSP company repository is a static public-site codebase. The Command OS must be developed in a new private application repository so that website deployment, internal-system permissions, database migrations, and production secrets have separate ownership and release rules.

Recommended repository:

```text
ksp-dominion-group/ksp-command-os
```

Recommended GitHub ownership:

- GitHub Organization owned by Kauan and Vanessa.
- At least two recovery-capable Organization Owners.
- Ordinary development performed with lower-privilege member roles.
- No shared GitHub user account.
- Organization recovery, billing, and verified domains documented.

---

# 2. Engineering Principles

1. Requirements and acceptance criteria precede implementation.
2. Security, authorization, audit, and data integrity are features, not later hardening.
3. One change has one accountable owner.
4. Every change enters through a branch and pull request.
5. The protected default branch is always releasable.
6. Agents cannot merge their own work.
7. Production secrets and data are unavailable to routine agents and local development.
8. Database changes are migrations, not manual production edits.
9. RLS policies require automated negative tests.
10. A deployment is not complete until health and business controls pass.
11. A generated solution is untrusted until reviewed and tested.
12. AI instructions are versioned repository policy.
13. No tool may weaken controls to satisfy a task.
14. Use boring, supported technology over unnecessary novelty.
15. Optimize only after measurement.

---

# 3. Repository Layout and Ownership

```text
apps/web                         # Next.js application
packages/ui                      # accessible design system
packages/domain                  # domain logic and contracts
packages/config                  # shared configuration
packages/validation              # shared schemas
packages/observability           # logging/telemetry helpers
packages/testing                 # fixtures, builders, test utilities
supabase/migrations              # reviewed SQL migrations
supabase/functions               # Edge Functions/integration handlers
supabase/tests                   # pgTAP/RLS/database tests
supabase/seed                    # synthetic local/staging seed
scripts                          # controlled maintenance scripts
docs/adr                         # architecture decision records
docs/specs                       # product/technical specifications
docs/runbooks                    # operational response procedures
docs/policies                    # security, data, AI, release policies
docs/data-dictionary             # business/data definitions
.github/workflows                # CI/CD and scheduled workflows
.github/ISSUE_TEMPLATE           # structured change intake
.github/CODEOWNERS               # required domain reviewers
AGENTS.md                        # Codex/Jules-compatible repository policy
CLAUDE.md                        # Claude Code repository guidance
```

## CODEOWNERS minimum

- `/supabase/migrations/` - database owner + security reviewer.
- `/supabase/functions/` - backend/integration owner.
- `/packages/domain/finance/` - finance domain owner + technical owner.
- `/packages/domain/identity/` - security owner + technical owner.
- `/apps/web/app/client-portal/` - client portal owner + security reviewer.
- `/.github/workflows/` - technical owner + security reviewer.
- `/docs/policies/` - applicable executive/domain owner.
- `/AGENTS.md` and `/CLAUDE.md` - technical owner + AI policy owner.

---

# 4. Work Intake

## 4.1 Change types

- Product feature.
- Defect.
- Security issue.
- Data correction/migration.
- Operational incident action.
- Refactor/technical debt.
- Dependency/infrastructure change.
- Policy/documentation change.
- Experiment/prototype.

## 4.2 Issue requirements

Every implementation issue includes:

- problem statement;
- user/business outcome;
- owner and stakeholders;
- in scope and out of scope;
- business rules and invariants;
- data classification;
- permission model;
- migration/data impact;
- UX/accessibility requirements;
- acceptance criteria;
- testing requirements;
- observability/audit requirements;
- release/rollback notes;
- dependencies;
- risk class.

High-risk changes require an approved spec/ADR before coding.

## 4.3 Ready for development

An issue is Ready only when:

- outcome and acceptance criteria are testable;
- authoritative business owner is known;
- permissions and data classification are defined;
- unresolved executive/legal/finance decision is either completed or explicitly excluded;
- dependencies are understood;
- risk and release path are defined.

---

# 5. Branch and Worktree Strategy

## 5.1 Branch naming

```text
feat/KSP-123-short-description
fix/KSP-456-short-description
security/KSP-789-short-description
chore/KSP-234-short-description
```

## 5.2 Agent isolation

- Claude Code, Codex, and Jules each work in a separate branch/worktree.
- Two agents never share a writable worktree.
- An agent may review another agent's PR from a clean checkout.
- Concurrent tasks may proceed only when file/domain overlap is understood.
- A branch must be refreshed before final review if the base changed materially.

## 5.3 Default branch

- `main` is protected.
- Direct push is prohibited.
- Force push is prohibited.
- Required status checks cannot be bypassed in ordinary flow.
- Required CODEOWNERS approval applies to protected paths.
- Conversation resolution is required.
- Stale approval dismissal is enabled when code changes after approval.

---

# 6. Pull Request Standard

A PR contains:

- linked issue/requirement;
- concise outcome summary;
- screenshots/video for UI where relevant;
- data model and migration impact;
- permission/RLS impact;
- financial/security impact;
- tests run and evidence;
- accessibility review;
- observability/audit changes;
- deployment and rollback notes;
- known limitations;
- agent disclosure when AI materially authored the change.

PR size should remain reviewable. Large changes are split by vertical capability, not by arbitrary layer where doing so creates incomplete unsafe states.

---

# 7. CI Pipeline

The required pipeline should include these jobs, adjusted by path/risk:

1. Repository policy validation.
2. Dependency lockfile integrity.
3. Formatting.
4. Linting.
5. Type checking.
6. Unit tests.
7. Component tests.
8. Database migration validation.
9. Database constraint and pgTAP tests.
10. RLS positive and negative tests.
11. Integration/contract tests.
12. End-to-end critical-flow tests.
13. Accessibility automated checks.
14. Build.
15. Secret scanning.
16. Dependency/vulnerability scanning.
17. Static/security analysis.
18. License-policy check where required.
19. Preview deployment.
20. Preview smoke tests.

High-risk paths may add:

- finance invariants and reconciliation tests;
- authorization matrix tests;
- migration rehearsal from sanitized snapshot;
- performance/load test;
- file-upload malicious-content tests;
- client cross-tenant isolation tests;
- AI prompt-injection/evaluation tests.

CI must fail closed for required checks.

---

# 8. Test Strategy

## 8.1 Unit tests

Validate domain calculations, state transitions, validators, formatters, prioritization logic, and policy selectors.

## 8.2 Database tests

Validate:

- constraints;
- functions;
- triggers;
- posting balance;
- immutable records;
- uniqueness;
- RLS allow and deny cases;
- client isolation;
- temporary access expiry;
- protected functions and assurance rules.

## 8.3 Integration tests

Validate adapters with provider test/sandbox environments and deterministic fixtures. Webhook replay and duplicate delivery are mandatory cases.

## 8.4 End-to-end tests

Critical flows:

- invite, MFA, and role assignment;
- lead to proposal;
- project activation and change request;
- deliverable client approval;
- invoice/payment/reconciliation;
- expense/reimbursement;
- creative capture-to-delivery;
- software PR-to-release;
- contractor expiration/offboarding;
- portal cross-client isolation;
- AI action approval and denial.

## 8.5 Accessibility tests

Automated scanning plus keyboard and screen-reader manual testing for critical flows. Automated tools alone do not establish WCAG conformance.

## 8.6 Security tests

- broken object-level authorization;
- cross-organization/client access;
- privilege escalation;
- session and MFA bypass;
- malicious file upload;
- webhook forgery/replay;
- injection;
- server-side request forgery in integrations;
- secret leakage;
- rate-limit abuse;
- audit bypass;
- prompt injection/tool misuse for AI features.

## 8.7 Migration tests

- empty database application;
- upgrade from prior release;
- rollback/forward-fix rehearsal;
- data backfill idempotency;
- large-batch performance;
- validation/quarantine;
- financial/control reconciliation.

---

# 9. Environment Rules

## Local

- Supabase CLI local stack.
- Synthetic or approved sanitized data.
- Local email/payment/publish sinks.
- No Production credentials.

## Preview

- One deployment per PR.
- Isolated non-production backend strategy.
- No real external publication or payment action.
- Preview URLs may require Vercel protection for Confidential features.

## Staging

- Persistent, production-like environment.
- Separate Supabase project.
- Used for release acceptance, training, migrations, and restore drills.
- Test accounts and explicitly approved sample data.

## Production

- Separate Supabase and Vercel Production resources.
- Protected owner accounts and MFA.
- Manual or policy-controlled production release approval.
- Strongest logging, backup, and monitoring.
- Emergency access only through runbook.

A CI test must assert that Preview/Staging configuration cannot resolve to Production project identifiers.

---

# 10. Database Change Process

1. Define data/business rule and migration impact.
2. Write migration and tests locally.
3. Apply from clean local database.
4. Test upgrade from representative prior state.
5. Review RLS and grants.
6. Review query/index impact.
7. Rehearse in Staging.
8. Confirm backup/PITR and release window.
9. Deploy through approved pipeline.
10. Verify schema, data controls, and application health.
11. Record migration outcome.

## Destructive changes

Use expand/migrate/contract:

- add new nullable/compatible structure;
- deploy dual-read/write or backfill behavior;
- backfill with idempotent job;
- verify and reconcile;
- switch reads;
- remove old structure in later approved release.

Never rely on an untested down migration as the only production recovery plan.

---

# 11. Supabase Engineering Rules

- Enable RLS on all exposed schema tables.
- Use authenticated JWT claims only for stable authorization inputs; mutable authorization lives in database tables.
- Never expose service-role keys to client code.
- Edge Functions validate authentication, authorization, input schema, signature, and idempotency.
- Keep functions short-lived and idempotent; queue long or retryable work.
- Cron jobs invoke versioned functions/procedures and emit run records.
- Queue consumers use visibility timeout, retry policy, and dead-letter path.
- Private Storage buckets by default.
- File access uses database authorization and signed URLs.
- Database indexes support RLS predicates and common filters.
- Pin CLI/dependency versions in CI and review upgrades.
- Treat provider dashboard manual changes as exceptional and reconcile them into code/configuration.

---

# 12. Vercel Engineering Rules

- Git-connected Preview for PRs.
- Production deployment only from protected path.
- Separate environment variables for Preview, Staging/custom environment, and Production.
- Preview must not use Production Supabase credentials.
- Protect internal Preview deployments.
- Use deployment checks and post-deploy smoke tests.
- Record deployment URL/ID in Command OS release records.
- Monitor runtime errors, performance, and spend.
- Domains and DNS changes follow approval and rollback procedure.
- Production logs must avoid sensitive data.

---

# 13. GitHub Engineering Rules

- Use a private organization repository.
- Require MFA/strong account security for organization members.
- Use teams for CODEOWNERS and permissions.
- Use rulesets/branch protection.
- Restrict GitHub Actions permissions to the minimum required.
- Pin third-party Actions to reviewed immutable references where policy requires.
- Store secrets in GitHub environment/repository secrets; do not print them.
- Protect Production environment with required reviewers.
- Enable secret scanning and dependency alerts as available.
- Review installed GitHub Apps and OAuth grants quarterly.
- Archive rather than delete repositories without executive approval.

---

# 14. Claude Code Protocol

Before work:

- read `CLAUDE.md`, relevant ADRs/spec, and target files;
- confirm branch/worktree;
- restate assumptions and risk;
- inspect tests and patterns;
- do not modify unrelated areas.

During work:

- implement the smallest complete vertical change;
- preserve domain boundaries;
- add/update tests with behavior;
- run local checks progressively;
- record any deviation from the task contract;
- do not insert secrets or production data;
- request human decision when policy/requirements conflict.

After work:

- run required command set;
- summarize files and behavior;
- identify migration, security, permission, and operational impact;
- provide manual verification and rollback notes;
- prepare PR; do not self-merge protected work.

---

# 15. Codex Protocol

Primary uses:

- independent PR review;
- test and edge-case generation;
- security/RLS review;
- bounded implementation;
- CI review via GitHub Action;
- release-readiness inspection.

Rules:

- obey closest applicable `AGENTS.md`.
- retain sandbox and approval controls.
- use least access and no Production secrets.
- review business invariants, not only style.
- report confidence and unresolved uncertainty.
- do not approve merely because checks pass.
- findings include severity, affected behavior, reproduction/evidence, and recommended fix.

Codex review checklist:

- requirement satisfied;
- no out-of-scope behavior;
- authorization correct;
- data integrity preserved;
- RLS tested;
- audit emitted;
- retries/idempotency correct;
- errors handled safely;
- accessibility preserved;
- migration and rollback safe;
- no secret or data exposure;
- tests meaningful and not weakened.

---

# 16. Jules Protocol

Jules receives a bounded task contract with:

- repository and base branch;
- allowed paths;
- forbidden paths;
- desired behavior;
- acceptance tests;
- commands;
- time/risk boundaries;
- plan-review requirement.

Jules must:

1. Read root `AGENTS.md` and applicable nested policy.
2. Produce a plan before code.
3. Wait for plan approval for material work.
4. Work in its isolated VM/branch.
5. Run required tests.
6. Produce a PR and handoff report.

Do not assign Jules:

- ambiguous product decisions;
- unreviewed financial logic;
- executive access changes;
- production incident actions;
- secret rotation;
- broad cross-domain refactors without an ADR;
- direct Production deployment.

---

# 17. Cross-Agent Review Patterns

Recommended patterns:

### Claude implements, Codex reviews

Use for most medium/high-risk application features.

### Human specifies, Jules performs bounded refactor, Claude/Codex review

Use for repetitive or long-running maintenance.

### Codex identifies issue, Claude implements, human validates

Use for security/testing findings.

### Human pair review

Mandatory for executive access, finance posting, payment, secrets, authentication, destructive migration, or high-risk client portal changes regardless of agent involvement.

An agent's approval is advisory unless policy explicitly recognizes it as an additional check. It does not replace accountable human approval.

---

# 18. Release Management

## Release package

- release identifier and scope;
- included issues/PRs;
- database migrations;
- environment/config changes;
- feature flags;
- test/QA evidence;
- security and accessibility status;
- known limitations;
- monitoring plan;
- rollback/forward-fix plan;
- approvers;
- communication plan.

## Production deployment

1. Confirm approved release candidate in Staging.
2. Confirm no blocking incident/change conflict.
3. Confirm backups/PITR and migration readiness.
4. Obtain production approval.
5. Deploy through protected Vercel/GitHub path.
6. Apply controlled migrations.
7. Run technical health checks.
8. Run business control checks.
9. Monitor release window.
10. Complete or roll back.
11. Record result and close release.

## Rollback decision

Rollback when:

- authentication/authorization fails;
- data integrity is uncertain;
- financial controls fail;
- critical workflow is unavailable;
- error/performance threshold is exceeded;
- client data exposure is suspected;
- post-deploy migration verification fails.

If rollback cannot safely reverse data changes, use a prepared forward fix and disable affected feature through flag.

---

# 19. Observability in Code

Every request/job should support a correlation ID. Structured events include:

- service/module;
- environment;
- actor type and protected actor ID;
- command/event;
- resource type/ID where safe;
- outcome and latency;
- error class;
- retry/attempt;
- integration/provider;
- release/deployment version.

Do not log:

- passwords, tokens, service keys;
- full bank/tax identifiers;
- disability/medical content;
- complete Confidential documents;
- raw AI prompts containing sensitive data when protected references suffice.

---

# 20. Documentation Requirements

A material feature updates:

- product specification;
- ADR if architecture changes;
- data dictionary;
- permissions matrix;
- runbook if operational behavior changes;
- migration documentation;
- user/SOP documentation;
- API/integration contract;
- `AGENTS.md`/`CLAUDE.md` only if repository-wide agent rules change.

Documentation is reviewed in the same PR when possible so it cannot drift silently.

---

# 21. Engineering Metrics

Use metrics to improve flow, not punish individuals:

- lead time from Ready to Production;
- review wait time;
- change failure rate;
- rollback rate;
- escaped defects;
- security finding age;
- flaky test rate;
- migration failure rate;
- mean time to restore;
- accessibility regression count;
- agent-authored PR acceptance/rework rate;
- AI review true-positive/false-positive feedback;
- cloud/AI cost by environment/project.

---

# 22. Engineering Definition of Done

A change is done when:

- accepted business behavior is implemented;
- authorization and data rules are tested;
- migrations are safe and reviewed;
- audit and observability exist;
- accessibility is verified;
- CI and required manual tests pass;
- Preview/Staging evidence exists;
- docs and runbooks are updated;
- release/rollback path is known;
- required humans approve;
- post-production verification passes.
