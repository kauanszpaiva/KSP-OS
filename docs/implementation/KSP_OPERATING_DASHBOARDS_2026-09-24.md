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
| R10 | The module surfaces carry the same board vocabulary. | implemented | `VizBoard` wraps each board; `/finance`, `/revenue`, `/team`, `/clients` gained four panels each, all from records the page already loaded (no new query). |
| R11 | Category sums never cross currencies. | implemented | `groupSums()` returns `mixedCurrency: true` and no items when a caller supplies a currency accessor and the rows span more than one; the finance and revenue boards then render an explicit refusal instead of a total. Four tests cover it. |
| R12 | The INC-local model cannot silently drift from the shared one. | implemented | `apps/inc/lib/visual-data.parity.test.tsx` (9 tests) compares both implementations across distribution, buckets, geometry, tones, past-due, facets, formatting, currency safety and stagger. It caught three real divergences on first run (see below). |

## Evidence

- Guards: `lint` and `format:check` pass for `@ksp/ui`, `@ksp/command`, `@ksp/portal`, `@ksp/network`, `@ksp/inc`.
- Types: `typecheck` passes for `@ksp/ui`, `@ksp/command`, `@ksp/portal`, `@ksp/network`.
- Tests: `pnpm test` → 352 passed / 47 files (includes the 4 grouped-sum tests and the 9 parity tests).
- Builds: `@ksp/command`, `@ksp/network`, `@ksp/portal` compile for production; the emitted stylesheet still contains `animate-grow-x`, `animate-ring-draw` and the tone utilities after the content globs were narrowed to `packages/ui/src/**`.
- INC build gate: with the teammate's *uncommitted* blueprint UI temporarily set aside (then restored), `@ksp/inc` builds from the committed state — `✓ Compiled successfully in 8.9s`. Clean checkouts and CI therefore build INC; only this shared working tree is red while that work is unfinished.
- Visual review: a temporary local route rendered the board wrapper, the donut/bars/meter set, the money-formatted bars and the mixed-currency refusal at 1280×900 in both light and dark themes (light body verified as `rgb(242,242,242)`). The route was deleted before commit and the stale generated types cleared. Tone probe: `paid=good open=warn overdue=risk draft=warn mystery=neutral` — no brand colour is ever returned for a status.
- INC route compilation: all 12 changed owner routes compiled under `next dev` (HTTP 307 from the owner guard, no compile error).

### Divergences the parity contract caught

1. `accepted` was a positive state in the shared model but neutral in the INC model.
2. `delivered` closed a task in the shared model but not in the INC model, so it counted as past due there.
3. `off_track` mapped to risk in the shared model but neutral in the INC model.

All three were real, user-visible inconsistencies between two surfaces. Both models now carry identical token lists, and the parity test fails if either side drifts again.

## Release gates and known gaps

1. **Authenticated visual review (open, owns the human reviewer).** None of the four home boards, the executive board or the four module boards was opened with a live owner/partner session: this environment has no session and the configured Supabase project is production, which the repository rules forbid me to authenticate against. The composition and data rules are covered by the parity/aggregation tests and the fixture visual review above, but the rendered result with real data still needs one pass on a preview. Checklist: load `inc /`, `inc /blueprints`, `command /home` per cockpit, `command /executive /finance /revenue /team /clients`, `portal /home`, `network /` on desktop and mobile; confirm no empty chart renders as zero, that money shows one currency, and that no status pill uses the brand green.
2. **Teammate work in progress (not a repository gate).** `apps/inc/app/blueprints/**` is uncommitted work by another agent in this shared working tree. It fails locally on two unresolved imports, so a local `tsc`/`next build` for INC is red until those land. The two fixes are his: `../blueprints-actions` should be `../../blueprints-actions` (the action file sits at `app/blueprints-actions.ts`), and `packages/ui/src/blueprint-canvas.tsx` must exist for the `./blueprint-canvas` subpath export he already added. I deliberately did not write that component for him.
3. **Duplication is now contract-locked, not removed.** `apps/inc/lib/visual-data.ts` and `@ksp/ui/src/data-viz-model.ts` remain separate implementations, which is deliberate: INC is a plain-CSS app with no `@ksp/ui` dependency. Behavioural drift is now impossible without a failing test. Removing the duplication itself would require giving INC the Tailwind build (or a CSS bridge) and is tracked as follow-up, not silently done.
4. **Tailwind content globs (resolved).** The three app configs and the root config matched `packages/ui/**/*.{js,...}`, which Tailwind flagged as accidentally scanning `node_modules`. They now match `packages/ui/src/**/*.{ts,tsx}`; the warning is gone and the shared utilities are still emitted.
5. **One pre-existing repository issue, out of scope.** Running the source guard from the repository root on Windows produces false positives for `scripts/*.mjs` because the walk returns ``.\scripts\…`. CI runs it per package, where it passes.
