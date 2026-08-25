# Spec Module Matrix Template

Use this template for every material KSP OS module/epic before declaring it complete.

## Scope

- Module / route:
- App: Command / Portal / Network / KSP INC
- Branch / PR:
- Authoritative source documents:
- Actors:
- Data classification:
- Production/external dependencies:

## Requirements

| ID | Requirement | Evidence to prove it | Verdict | Severity / gate |
|---|---|---|---|---|
| MOD-01 | Primary happy path works end-to-end | route + action/service + test + preview | | |
| MOD-02 | Reads are correctly scoped | RLS/policy + application scope + deny test | | |
| MOD-03 | Writes re-authenticate and authorize | server guard + RLS/constraint + deny test | | |
| MOD-04 | Input is validated | Zod/domain validation + invalid-input test | | |
| MOD-05 | Audit/activity behavior matches the domain | event/policy evidence or documented approved exception | | |
| MOD-06 | Empty state is useful | UI evidence/test | | |
| MOD-07 | Loading state exists | route/component evidence | | |
| MOD-08 | Error/stale state is recoverable | error boundary/module state + test | | |
| MOD-09 | No-permission state fails closed | route/guard + deny test | | |
| MOD-10 | Archived/immutable behavior is correct where applicable | state-machine/constraint/UI evidence | | |
| MOD-11 | Responsive + keyboard/focus + screen-reader labels | component/CSS/manual evidence | | |
| MOD-12 | Light/dark + reduced-motion behavior remains valid | theme/CSS/manual evidence | | |
| MOD-13 | Cross-client/project/org isolation is tested where applicable | executable allow/deny SQL or integration test | | |
| MOD-14 | Migrations are replayable and lineage-safe where applicable | migration/lineage/parity evidence | | |
| MOD-15 | Exact-head CI/builds pass | run + SHA | | |
| MOD-16 | Release/rollback is explicit | PR/runbook evidence | | |

Add domain-specific requirements below these baseline rows. Delete only rows that are genuinely not applicable, and state why.

## Searches performed

Record the actual searches used to establish presence/absence. For example:

- `<policy/function/route>` -> N relevant hits
- `<permission action>` -> allow/deny paths
- `<table/column>` -> migration + RLS + callers
- `<error/state name>` -> UI/test coverage

## Open questions / undecidable items

List source conflicts or ambiguous requirements. Do not silently invent behavior to close them.

## Ready-for-review rule

- no unresolved Critical/High divergence;
- Medium items fixed or explicitly retained as named review/release gates;
- exact-head CI green;
- production/provider changes remain separate when required by repository policy.
