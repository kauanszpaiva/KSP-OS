# KSP INC Operating Frontend — Upgrade Record

Status: implementation record for the KSP INC owner-plane presentation upgrade. This document does not change Canon, legal identity, domains, email senders, payment providers, Auth, RBAC, RLS, database state or production deployment.

## Authoritative sources

| Source | Role |
| --- | --- |
| `docs/implementation/KSP_INC_OPERATING_EXPERIENCE_FOUNDATION.md` | Current visual source of truth (Onyx / Paper / Signal Green, Sora + Inter, operating rail). |
| `docs/spec/README.md` | Spec protocol, precedence and release gate. |
| `apps/inc/lib/inc-data.ts`, `apps/inc/lib/omnichannel.ts`, `apps/inc/lib/ai-company.ts` | Canonical owner-plane reads. Dashboards may only render rows these functions already return. |
| `apps/inc/lib/owner-access-v3.test.ts`, `apps/inc/lib/ai-company.test.tsx` | Existing owner-surface contracts (route literals, AAL2 boundary, canonical dashboard wiring). |

### Declared decision

`apps/inc` still used the pre-migration palette (`--accent: #6d1f2a`, warm paper) while `apps/command` and `apps/portal` already consumed the operating identity. The visual foundation's precedence clause only covers surfaces already migrated, so this was recorded as a material conflict instead of being resolved silently. The owner explicitly selected the **KSP operating identity** for `apps/inc`, which is what this change implements.

## Requirements and verdicts

| # | Requirement | Verdict | Evidence |
| --- | --- | --- | --- |
| R1 | INC presents the operating identity: Onyx rail, Paper surfaces, Signal Green for selection/primary actions only. | implemented | `apps/inc/app/globals.css` (identity tokens), `apps/inc/app/operating.css` (`.rail`, `.railLinkActive::before`, `.primaryButton`). Verified computed styles: rail `#0D0D0D`, paper `#F2F2F2`, signal `#A6C63A`. |
| R2 | Signal Green never encodes status; success/warning/risk keep separate meaning. | implemented | `statusTone()` in `apps/inc/lib/visual-data.ts` returns only `ok`/`warning`/`risk`/`neutral`; tone classes are element-scoped in `operating.css`. Verified: legend swatches resolve to `rgb(31,122,76)`, `rgb(138,90,18)`, `rgb(165,37,28)`. |
| R3 | Every owner surface is reachable with an icon and the current route is marked. | implemented | `apps/inc/components/inc-nav.tsx` (`resolveActiveHref`, `useActiveHref`), `apps/inc/components/icons.tsx`. Verified `aria-current="page"` on rail and mobile nav for a real pathname. |
| R4 | Dashboards are driven by canonical rows only; no fabricated metric. | implemented | Aggregation lives in `apps/inc/lib/visual-data.ts` and is fed from `getOwnerMetrics`, `getWorkRows`, `getAuditRows`, `getFinanceRows`, `getAccessRows`, `getClientRows`, `getNetworkRows`, `getPlatformMetrics`, `getWhatsAppDashboard`, `getAiCompanyDashboard`. No new data source, table or seed was introduced. |
| R5 | An unanswered table is never rendered as zero. | implemented | `MetricGrid`/`StatCard` render `—` with an attention tone for `value == null`; `DataUnavailable` lists the tables that did not answer (`apps/inc/app/platform/page.tsx`). |
| R6 | Money is never summed across currencies. | implemented | `singleCurrencyTotal()` returns `mixed: true` and the pages show a row count with an explicit note instead of a total. |
| R7 | Interactivity is progressive disclosure, not lazy data loading. | implemented | `tabs.tsx`, `stream-list.tsx` (facet + search + expand) receive already-fetched rows. Filtering/search never grants or removes access. |
| R8 | Animation is CSS-only, transform/opacity, and respects reduced motion. | implemented | `@keyframes` in `operating.css`; `prefers-reduced-motion` block disables every new animation and hover transform; `CountUp` checks `matchMedia('(prefers-reduced-motion: reduce)')`. |
| R9 | No Auth, RBAC, ABAC, RLS, migration, provider or query-shape change. | implemented | Diff is confined to `apps/inc/app`, `apps/inc/components` and `apps/inc/lib` presentation code plus one new document. `ListRow` gained optional presentation fields (`group`, `status`, `at`, `amountMinor`, `currency`) that are filled from columns the existing selects already returned. |
| R10 | UI visibility is never authorization. | implemented | Every INC route still calls `requireIncOwner()`; the shell change adds no bypass. The temporary design-check route used during visual review was deleted before commit. |
| R11 | Existing owner-surface contracts stay intact. | implemented | Navigation remains `[label, href]` tuples with icons mapped by href, so `apps/inc/lib/owner-access-v3.test.ts` and `apps/inc/lib/ai-company.test.tsx` literal assertions still hold. |

## Evidence

- `apps/inc/lib/visual-data.test.tsx` — 20 tests covering distribution, day bucketing, sparkline baseline, ring geometry, status semantics, past-due rule, facet building, formatting and currency safety.
- Repository guards: `pnpm --filter @ksp/inc lint` → passed; `pnpm --filter @ksp/inc format:check` → passed; `pnpm --filter @ksp/inc typecheck` → passed.
- `pnpm test` → 317 passed, 1 failed. The single failure is `packages/validation/src/blueprints.test.ts` ("accepts projectId null as an explicit unlink"), an untracked file authored outside this change that imports only `./blueprints`. It is unrelated to `apps/inc` and is not part of this change set.
- `pnpm --filter @ksp/inc build` → compiled; all 20 routes generated.
- Visual review performed against a local dev server at 1440×1000 and 390×844: Onyx rail (264px) with grouped navigation, active marker, KPI cards, donut/legend, sparkline, bar, activity strip and meter all render; mobile switches to the Onyx bottom navigation with no horizontal overflow.

## Release gates and known gaps

1. **Authenticated visual review.** The owner dashboards were reviewed through a temporary local fixture route; the authenticated pages were not opened with a live owner session in this environment. Representative desktop/mobile review against a preview with a real owner session remains required before the visual migration is considered complete (mirrors the foundation document's acceptance gate).
2. **Unrelated in-flight work.** `apps/inc/package.json`, `packages/ui/*`, `packages/database/src/types.ts`, `packages/validation/*` and `supabase/migrations/20260924010000_blueprints.sql` carry concurrent work from another workstream in the same working tree. It is excluded from this change set and is not described by this record.
3. **Palette rollout.** Only `apps/inc` is migrated here. Command, Portal, commercial documents, finance print, payments and email keep their own migration status per the foundation sequence.
