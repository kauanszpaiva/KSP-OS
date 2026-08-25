# KSP OS Spec Protocol

`Spec` is the mandatory KSP-OS plan-to-code compliance gate.

It exists to prevent a plan, screenshot, issue, architectural document, or AI-generated blueprint from being treated as complete merely because code was written or a UI rendered. Every material change must be traced from stated intent to implementation evidence.

## 1. Scope

Use Spec for:

- product plans and blueprints;
- new modules and vertical slices;
- authorization/RLS changes;
- migrations and data-model changes;
- finance and billing changes;
- Portal/Network/client-visible journeys;
- visual-system migrations that claim parity with a reference;
- remediation/audit work;
- PR readiness and release readiness.

Small typo-only/document-format changes may state that no behavioral requirement changed instead of producing a large matrix.

## 2. Required workflow

### Before editing

1. Declare the repository branch/base and the exact scope.
2. Name the authoritative source documents.
3. Convert the affected scope into explicit, testable requirements.
4. Identify actors, resources, classifications, permissions, record states, migrations, production risk, and external dependencies.
5. Record material conflicts before choosing an implementation direction.

### During implementation

For every affected requirement, inspect as applicable:

- UI and routes;
- server actions/application services;
- validation;
- auth/RBAC/ABAC;
- RLS/database constraints/functions;
- storage and external providers;
- allow/deny and cross-tenant/cross-client/cross-project tests;
- CI/build gates;
- release documentation and rollback.

Do not weaken an invariant, test, approval, RLS policy, audit trail, or production control to make the matrix green.

### Before Ready for review

Classify each requirement:

- `implemented` — evidence shows the requirement holds on the relevant paths;
- `partial` — some required paths/states are implemented but a real gap remains;
- `absent` — exhaustive searches found no implementation for the requirement;
- `contradicted` — implementation behavior conflicts with the authoritative requirement;
- `undecidable` — the source documents are too vague or contradictory to establish the correct behavior.

For divergences, assign consequence-based severity:

- **Critical** — an untrusted actor can cause value/control movement that the spec rules out;
- **High** — similar consequence but gated by privilege/state/precondition;
- **Medium** — a real gap whose consequence depends on an unstated/reachable condition or a material ambiguity;
- **Low** — documentation drift, stronger-than-spec behavior, or another gap with no current behavioral consequence.

State where the fix belongs: code, tests, configuration, documentation, or an external release gate.

## 3. Evidence standard

A compliance conclusion must name concrete evidence. Examples:

- file/function/route;
- policy or database constraint;
- search term and hit result;
- allow/deny test path;
- exact CI run/head SHA;
- preview/manual journey;
- production-safe release gate.

For `absent`, record the searches that make the conclusion exhaustive enough to trust. “I looked and found nothing” is not evidence.

## 4. Source precedence and conflicts

Use the most specific current approved source for the behavior being changed. General precedence:

1. current security/finance/legal invariant and explicit approved release gate;
2. current domain-specific architecture/implementation spec;
3. current product/rebuild plan;
4. older roadmap/blueprint/reference documents.

A newer document does not silently supersede a security, finance, legal, or data-isolation invariant.

When two sources conflict, classify the requirement `undecidable` until the conflict is explicitly resolved or one source is marked superseded.

### Current KSP INC visual precedence

For the KSP OS operating visual identity, `docs/implementation/KSP_INC_OPERATING_EXPERIENCE_FOUNDATION.md` is the current visual source of truth. Its Onyx / Paper / Signal Green system supersedes the older purple-primary visual direction in `docs/rebuild/00_MASTER_PLAN.md` for surfaces already migrated to the KSP INC operating experience. This precedence does not authorize legal/public renames or weaken functional semantic colors.

## 5. Release gate

A PR is not Spec-complete merely because CI is green.

Before merge:

- Critical/High divergences must be fixed or the PR remains blocked;
- Medium divergences must be fixed or explicitly retained as documented release/review gates with a named owner/decision path;
- Low/documentation drift should be repaired in the same change when safe, or tracked explicitly;
- required CI must pass on the exact head;
- production migrations/provider publishes/deployments remain separate controlled steps where the repository rules require them.

## 6. Repository governance limitation

Spec can document and test branch rules, but source code cannot enforce GitHub repository settings by itself. `main` branch protection/rulesets must be configured in GitHub. If GitHub reports `main` unprotected, that is a live Spec governance gap even when individual PRs follow the process voluntarily.

## 7. Required PR handoff

Every material PR should state:

1. authoritative spec/source;
2. requirements affected;
3. verdict/evidence delta;
4. data/migration impact;
5. permission/security/audit impact;
6. tests and exact results;
7. manual/preview verification;
8. rollback/release considerations;
9. unresolved Spec gates.

The PR template mirrors this protocol.
