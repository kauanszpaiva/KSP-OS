# KSP OS Spec Baseline — 2026-08-25

Base audited: `main` at `32afbfb9aa4891e60419117cb599c60f207216be`.

This baseline converts the first KSP OS Spec audit into repository-native release gates. It does not mutate production data, production schema, external provider configuration, or GitHub repository settings.

## Baseline result

20 requirements reviewed:

- 11 `implemented`
- 8 `partial`
- 1 `undecidable`
- 0 `absent`
- 0 `contradicted`
- 0 Critical / 0 High findings

## Active gaps

### SPEC-GOV-001 — `main` branch protection

**Severity:** Medium  
**State:** blocked outside source code

GitHub reported `main` as unprotected at the audited commit. The repository process already says branch rules/tests must not be bypassed, so repository settings should enforce that rule rather than relying only on operator discipline.

**Required external action:** enable a GitHub ruleset/branch protection for `main` with the approved review and exact-head CI requirements.

**This PR:** cannot safely change repository settings through source files; the gap remains explicit and blocks any claim that branch governance is fully enforced.

### SPEC-UX-001 — shared stale/error state

**Severity:** Medium  
**State:** remediation in this PR

The rebuild Definition of Done requires happy, no-permission, empty, loading, stale/error, archived/immutable and accessibility states. Empty/loading/no-access foundations existed, but no route-group `error.tsx` was found for Command or Portal.

**This PR:** adds shared route-group error boundaries for Command and Portal with retry/home recovery, non-technical client-safe copy, visible focus inherited from global CSS, and unit rendering checks.

This closes the generic route-error fallback gap; module-specific stale/archived/immutable states still remain part of each module's own Spec matrix.

### SPEC-DOC-001 — KSP INC visual source conflict

**Severity:** Low  
**State:** documentation precedence resolved in this PR

The old rebuild plan says purple is primary. The current KSP INC operating-experience foundation declares Onyx / Paper / Signal Green as the visual source of truth for migrated surfaces.

**This PR:** `docs/spec/README.md` explicitly records current visual precedence instead of changing correct runtime styling to match the stale statement.

### SPEC-DOC-002 — stale rebuild trackers

**Severity:** Low  
**State:** open documentation debt

`docs/rebuild/STATUS.md` and `docs/rebuild/OUTSTANDING.md` predate substantial August implementation and should not be used alone as current runtime truth.

**Required follow-up:** reconcile those trackers against current `main` using Spec, preserving historical notes rather than overwriting evidence.

### SPEC-MODULE-001 — “fully functional” acceptance criteria

**Severity:** Medium  
**State:** framework remediation in this PR; module-by-module closure still required

The master requirement that every module be “fully functional” is not sufficiently measurable on its own. A module can have live navigation and still lack depth states/integrations.

**This PR:** adds `docs/spec/MODULE_MATRIX_TEMPLATE.md`, a mandatory baseline matrix covering happy path, data scope, authorization, validation, audit, empty/loading/error/no-permission/immutable states, accessibility/theme, cross-boundary isolation, lineage, exact-head CI, and rollback. Domain-specific requirements must be added per module.

**Remaining closure:** existing modules still need to be reconciled against this matrix before their historical “done” claims can be treated as current Spec evidence.

### SPEC-AUDIT-001 — Founder Vault audit exception

**Severity:** Low  
**State:** intentional behavior, documentation alignment needed

The generic rebuild DoD says server mutations record activity + audit events. Founder Vault deliberately avoids company activity/audit surfaces for privacy. The runtime behavior is intentional; the generic rule needs an explicit private-vault exception or a separately approved privacy-preserving audit design.

## Controls already evidenced

- Command and Portal are separate app surfaces.
- light/dark and responsive shell support exists in both.
- pre-paint theme initialization and reduced-motion support exist.
- alternative List/Board/Calendar/Timeline patterns are implemented and reused.
- Supabase reads are scoped by RLS; Portal adds explicit client scoping.
- Zod validation is centralized under `packages/validation`.
- server mutations re-authenticate and use role/permission guards.
- SQL authorization tests include allow/deny and cross-boundary cases.
- repository CI includes audit, e2e contract gate, format, lint, typecheck, unit, DB, RLS, migrations, lineage, parity, secret scan, and Command/Portal/Network builds.
- PR #135 recorded the full exact-head CI suite green before merge.

## Definition for the next Spec run

The next KSP OS Spec audit should use this baseline plus the current domain-specific source documents, then report a delta rather than resetting findings from scratch.

A closed item must include evidence that the correct layer changed:

- code/tests for behavioral gaps;
- documentation for drift;
- GitHub/provider settings for external configuration gaps;
- production rollout evidence only after a separately authorized release action.
