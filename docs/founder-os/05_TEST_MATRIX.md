# 05 — Founder OS Test Matrix

**Status:** P0 executed (green)
**Date:** 2026-08-13

## Actors

| Actor | Identity | Role |
| --- | --- | --- |
| A — Founder | founder principal | `founder_ceo` (KSP org) |
| B — Team member | normal internal user | `developer` (KSP org) |
| C — Unauthenticated | no session | `anon` |
| D — Other authed | unrelated internal user | `sales_specialist` (KSP org) |
| E — Other-org founder | founder of a different org | `founder_ceo` (Other org) |

## Authorization matrix (per founder-private resource)

Resources: `founder_inbox_items`, `founder_tasks`, `founder_promotions`.

| Operation | A Founder | B Member | C Anon | D Other authed | E Other-org founder |
| --- | --- | --- | --- | --- | --- |
| SELECT | ✅ own rows | ✅ 0 rows | ✅ denied/0 | ✅ 0 rows | ✅ 0 rows |
| INSERT (own owner_id) | ✅ allowed | ✅ denied | ✅ denied | ✅ denied | ✅ denied |
| INSERT (impersonate founder owner) | n/a | ✅ denied | ✅ denied | ✅ denied | ✅ denied |
| UPDATE founder row | ✅ own | ✅ 0 affected | ✅ denied | ✅ 0 affected | ✅ 0 affected |
| DELETE founder row | ✅ own | ✅ 0 affected | ✅ denied | ✅ 0 affected | ✅ 0 affected |

All cells verified against real PostgreSQL RLS (not by reading policy text). Executable form + captured output in `06_RELEASE_EVIDENCE.md`.

## Constraint / invariant matrix

| Check | Expectation | Result |
| --- | --- | --- |
| `founder_tasks` status=`waiting` with null `waiting_on` | rejected (`founder_tasks_waiting_has_context`) | ✅ |
| `founder_inbox_items.item_type` not in allowed set | rejected (check constraint) | ✅ |
| Duplicate promotion `(source_table, source_id, target_table)` | rejected (`founder_promotions_unique`) | ✅ |
| `founder_inbox_items` target pair | `target_table` and `target_id` both null or both set | enforced by `founder_inbox_target_pair` |

## App-layer matrix (unit — `apps/command/lib/founder-nav.test.tsx`)

| Assertion | Result |
| --- | --- |
| `isFounder` true only for `founder_ceo` | ✅ |
| `canViewFounderVault` denies every non-founder archetype | ✅ |
| "Founder OS" nav entry is `founderOnly` and → `/founder` | ✅ |
| Non-founder sidebar excludes the Founder OS entry (and any `founderOnly`) | ✅ |
| Founder sidebar includes the Founder OS entry | ✅ |
| All `FOUNDER_NAV` routes are under `/founder/` | ✅ |

## Isolation / leakage matrix

| Surface | Founder-private data present? | Basis |
| --- | --- | --- |
| Navigation (non-founder) | No | Layer 1 filter (tested) |
| Direct route (non-founder) | No — redirected | Layer 2 gate |
| Server actions (non-founder) | No — rejected | Layer 3 `founderGate` |
| RLS (any non-founder) | No — 0 rows / denied | Layer 4 (tested) |
| Company search (`searchAll`) | No | `founder_*` not in any shared query |
| Company analytics/reporting | No | company reads only company tables |
| Global autocomplete | No | same as search |
| Exports | No | export paths read company tables only |
| Team AI context | No (structural) | tables outside shared surfaces; no provider configured |

## Promotion matrix

| Assertion | Mechanism | Result |
| --- | --- | --- |
| Private idea stays private before promotion | `triage_status <> 'promoted'` until explicit action | ✅ (by design) |
| Promotion requires founder | `founderGate()` | ✅ |
| Non-founder cannot call promotion | Layer 3 + Layer 4 | ✅ |
| Only title + outcome statement cross | action copies only those fields | ✅ |
| Private source preserved | source row updated, not deleted | ✅ |
| Audit event exists | `activity_events` + `audit_events` + `founder_promotions` | ✅ |
| Later private edit does not rewrite company record | separate records post-promotion | ✅ (by design) |
| Duplicate promotion prevented | app pre-check + `founder_promotions_unique` | ✅ |

## Financial isolation (P1 boundary — documented, not yet built)

Personal Money is deferred to P1. The boundary rule (PERSONAL MONEY ≠ KSP MONEY) is fixed in `02`/`04`: personal ledgers will be founder-private tables, never mixed into `chart_accounts`/`journal_*`. No personal-finance code ships in P0, so there is nothing to leak yet; the isolation tests attach when Money is built.

## Not covered in P0 (honest gaps)

- Browser (Playwright) evidence: the repo's e2e harness requires CI browser setup; the pre-existing `check-e2e-placeholders` guard already fails on `main` for an unrelated missing `executive/page.tsx`. Founder OS routes build and render server-side (verified via `next build`); full browser capture is deferred to CI.
- PG version: local behavioral rehearsal ran on PostgreSQL 16; CI runs the same matrix on 17.6. SQL used is version-agnostic.
