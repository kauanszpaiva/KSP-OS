# KSP Operating Dashboards — Command / Portal / Network / INC

Status: implementation record for the four-surface visual-data slice. This document does not change Canon, legal identity, domains, email senders, payment providers, Auth, RBAC, RLS, database state or production deployment.

## Authoritative sources

| Source | Role |
| --- | --- |
| `docs/implementation/KSP_INC_OPERATING_EXPERIENCE_FOUNDATION.md` | Current visual source of truth (Onyx / Paper / Signal Green, Sora + Inter, operating rail). |
| `docs/implementation/KSP_INC_FRONTEND_VISUAL_UPGRADE.md` | The INC owner-plane upgrade this slice builds on. |
| `docs/spec/README.md` | Spec protocol, precedence and release gate. |
| `apps/*/app/**/data.ts`, `apps/inc/lib/*-data.ts` | Canonical reads. Dashboards may only render rows a page already loads (or a limit already declared). |
| `apps/command/app/ksp-inc.css`, `apps/portal/app/ksp-inc.css` | The established KSP identity override for the Tailwind surfaces. |

## Decisions recorded

1. **Network identity migration.** `apps/network` still shipped the legacy purple-primary palette while Command and Portal already imported `ksp-inc.css`. The foundation document's precedence clause only covers surfaces already migrated, so this was a material conflict rather than a silent fix. Because the owner had already selected the KSP operating identity for INC and asked for one coherent visual pass across the four surfaces, Network now imports the same identity override and uses Sora for display type. Functional good/warn/risk tokens are untouched.
2. **Work isolation.** The owner's own INC commit was cherry-picked into the isolated branch `feat/visual-dashboards-4apps`; a teammate's in-flight Blueprints work was left uncommitted and his pending one-line navigation edit was preserved and re-expressed inside the new INC navigation (with a dedicated blueprint icon) instead of being discarded.
3. **No new chart dependency.** Command, Portal and Network had no chart library. The slice extends `@ksp/ui` with hand-rolled SVG/CSS primitives, matching the existing `BarChart`/`Donut`/`Sparkline` approach and keeping the CSP unchanged.

## Requirements and verdicts

| # | Requirement | Verdict | Evidence |
| --- | --- | --- | --- |
| R1 | Every surface exposes the same visual-data vocabulary. | implemented | `packages/ui/src/data-viz.tsx` (`StatGrid`, `StatCard`, `VizPanel`, `VisualGrid`, `DistributionBars`, `DonutChart`, `TrendSparkline`, `ActivityStrip`, `Meter`, `TrendBadge`, `StatusPill`, `DataUnavailable`, `VisualEmpty`), re-exported from `packages/ui/src/index.tsx`. |
| R2 | Aggregation rules are shared and tested once. | implemented | `packages/ui/src/data-viz-model.ts` + `data-viz-model.test.ts` (22 tests): distribution, day buckets, sparkline baseline, ring geometry, tone mapping, past-due rule, facets, formatting, currency safety, stagger clamp. |
| R3 | No fabricated metric: an unanswered source is never a zero. | implemented | `formatCount(null)` renders `—`; `StatCard` withholds a null value; `DataUnavailable` is used for empty windows (Network, Platform, INC). All charts consume rows already loaded by the page. |
| R4 | Brand colour never encodes status. | implemented | `statusTone()` returns only `good`/`warn`/`risk`/`neutral`, exact-match-first so `at_risk` resolves to warn instead of matching the `risk` substring; categorical series use `scaleOpacity()` (single-hue intensity). Asserted in tests. |
| R5 | Money is never totalled across currencies. | implemented | `singleCurrencyTotal()`; the INC and Portal surfaces show a row count with an explicit note when a mix is present. |
| R6 | Animation is CSS-only and reduced-motion safe. | implemented | `grow-x` / `ring-draw` keyframes added to `tailwind.config.ts`; every animated element carries `motion-reduce:animate-none`; `CountUp` checks `matchMedia('(prefers-reduced-motion: reduce)')`. |
| R7 | Incumbent behaviour is preserved. | implemented | Navigation, filters, server actions, forms and `requireSession`/`requireEffectiveNetworkSession`/`requireIncOwner` guards are unchanged. Network keep-apart: the View-As read-only branch still suppresses response forms. |
| R8 | No Auth, RBAC, ABAC, RLS, migration or query-shape change. | implemented | Diff is presentation-only: `apps/*/app/**` view files, `apps/inc/lib/visual-data.ts` tone mapping, `packages/ui/src/*`, `tailwind.config.ts` and one stylesheet. The only new read is INC's Overview reusing the existing `getFinanceRows` (limit 30) that the Finance page already used. |
| R9 | Command home and executive boards stay role-aware. | implemented | `apps/command/app/(app)/home/page.tsx` keeps its six cockpits; the board swaps the fourth panel to Team load only for `founder`. `executive/page.tsx` adds four panels from records it already loads. |

## Evidence

- Guards: `lint` and `format:check` pass for `@ksp/ui`, `@ksp/command`, `@ksp/portal`, `@ksp/network`, `@ksp/inc`.
- Types: `typecheck` passes for `@ksp/ui`, `@ksp/command`, `@ksp/portal`, `@ksp/network`.
- Tests: `pnpm test` → 339 passed / 46 files.
- Builds: `@ksp/network`, `@ksp/portal`, `@ksp/command` compile for production; the emitted stylesheet contains `animate-grow-x`, `animate-ring-draw` and the tone utilities.
- Visual review: a temporary local route rendered every new primitive at 1440×1000 in both light and dark themes (Onyx/Paper tokens verified: light body `rgb(242,242,242)`); the route was deleted before commit and the stale generated types cleared. Status pills resolved to good/warn/risk/neutral tints, and no brand colour was used for a status.
- INC route compilation: all 12 changed owner routes compiled under `next dev` (HTTP 307 from the owner guard, no compile error).

## Release gates and known gaps

1. **INC build blocked by concurrent work.** `apps/inc` fails `next build` and `tsc` on a teammate's in-flight files (`app/blueprints/_components/*` importing `@ksp/ui/blueprint-canvas` and `../blueprints-actions`). The upstream subpath export has landed (`chore(ui): expose @ksp/ui/blueprint-canvas subpath export`) but the module and action file themselves are not in this tree yet. Nothing in this change set produces an INC error — verified by compiling all 12 changed INC routes under `next dev` — so the app-level gate is red only until that work lands. This is a coordination gate, not a regression.
2. **Authenticated review.** The four home boards and the executive board were not opened with a live owner/partner session in this environment; representative desktop/mobile review on a preview remains required before the migration is called complete.
3. **Duplication to reconcile.** `apps/inc/lib/visual-data.ts` and `@ksp/ui/src/data-viz-model.ts` now hold equivalent aggregation rules, because `apps/inc` is a plain-CSS app that does not depend on `@ksp/ui`. Unifying them requires adding Tailwind or a CSS-in-JS bridge to INC; it is deliberately out of scope here and tracked as follow-up.
4. **Pre-existing Tailwind warning.** Network, Command and Portal share the content glob `../../packages/ui/**/*.{js,...}`, which Tailwind flags as matching `node_modules`. It predates this change; the emitted CSS is correct.
