# Phase C1 — Re-skin the 5 Live Modules

Group: Command · Status: ✅ done & verified (see checks log in `STATUS.md`)

Goal: bring Pulse, Focus, Outcomes, Commitments, and Founder Vault onto the
new design system (Phase C0) without changing their behavior — same data,
same permissions, same server actions — just the new visual language plus
entrance motion.

## Tasks

| Task | Status | What changed |
|---|---|---|
| C1.1 Pulse | ✅ | Narrative status line, attention ledger, flow figures, active outcomes, and activity feed now use `Reveal` for staggered entrance; attention-ledger rows get a hover background; empty state uses the `pulse` icon. No data/behavior change. |
| C1.2 Focus | ✅ | Each time band (Now/Next 2 days/This week/Later) reveals with an incremental delay; commitment cards get a hover elevation (`border`/`shadow` transition); empty state uses the `focus` icon. |
| C1.3 Outcomes | ✅ | The 3-slot governor lane and the open-slot placeholder both animate in with a per-index delay; card hover raises `border`/`shadow`; unchanged: the 3-active-outcome DB-enforced limit and executive-only mutation gating. |
| C1.4 Commitments | ✅ | In-review/Active/Closed groups reveal in sequence; the "New commitment" disclosure animates open; per-row hover background on the commitment `<details>`; empty state uses the `commitments` icon. |
| C1.5 Founder Vault | ✅ | Vault entries stagger in on load; empty state uses the `vault` icon; the save button now uses `bg-ink`/`text-canvas` (a theme-correct inverse pair) instead of a hardcoded `text-white`, so it stays legible in both themes. |
| Shared | ✅ | `apps/command/app/(app)/_components/ui.tsx` (`Panel`, `Rail`, `Ring`) updated: rounded to `rounded-xl` + `shadow-card`; `Rail` fill transitions on width change; `Ring` stroke uses semantic `stroke-brand`/`stroke-accent` (green once 100%) instead of a hardcoded hex, and animates its dash-offset. `_components/forms.tsx`, `vault-form.tsx`, `login/page.tsx`, `setup/page.tsx` updated for the new radii/tokens and press/focus micro-interactions. |

## What was intentionally NOT changed

- Server actions (`(app)/actions.ts`), data functions (`(app)/data.ts`), Zod
  schemas, RLS, and the 3-outcome / proof-acceptance / executive-only
  invariants — none of this is UI, so none of it changed here.
- No new routes, no new tables in this phase.

## Verification actually run

See `docs/rebuild/STATUS.md`. Manual: exercised the create-outcome,
create-commitment, submit-proof, and accept/reject-completion flows in the
dev server in both themes; confirmed the founder-only Vault redirect still
fires for non-founders; checked 375px width for horizontal-scroll regressions
on all 5 pages.

## Phase V5 addition (Command-wide visual redesign) — Pulse/Focus/Outcomes/Commitments/Founder Vault Timeline + Chart

Part of the multi-phase Asana/ClickUp-style visual redesign (`docs/rebuild/command/07_visual_redesign_v0_foundation.md`) — **this is the final phase (V0→V5) of that redesign**, closing it out across all 20 Command modules. The plan called for "Timeline (marker-based, no migration) + a Progress/dashboard chart tab" uniformly across these 5 modules. Two of them (Outcomes, Pulse) have no per-item date field to plot at all, so a literal Timeline would be empty by construction — both get a Chart tab only, with the omission explicitly called out here rather than shipping an empty tab.

| Task | Status | Detail |
|---|---|---|
| V5.1 Pulse — Chart | ✅ | `apps/command/app/(app)/_components/pulse-view.tsx` (new) — `Dashboard` (the existing narrative view, unchanged) / `Chart` toggle. **No Timeline**: Pulse aggregates five different data sources (outcomes, commitments, activity, signals, decisions) into one narrative — there is no single dated-entity collection to place on a Timeline. Chart tab: `BarChart` of active-outcome progress, a 5-segment `Donut` of on-track/awaiting-review/overdue/signals-to-triage/decisions-pending. |
| V5.2 Focus — Timeline + Chart | ✅ | `apps/command/app/(app)/_components/focus-view.tsx` (new) — `Runway` (the existing band-grouped view, unchanged, still the default) / `Timeline` / `Chart` toggle. Focus's Runway view was already a hand-rolled, band-grouped timeline before this phase — the new Timeline tab is the shared-`TimelineView` version (markers only, grouped by the same Now/Next 2 days/This week/Later bands), added for cross-module consistency, not because Focus lacked timeline-style rendering. Chart tab: `BarChart` of commitment count per band, `Donut` of on-track/in-review/overdue. |
| V5.3 Outcomes — Chart | ✅ | `apps/command/app/(app)/_components/outcomes-view.tsx` (new) — `Cards` (existing 3-slot governor + paused/closed list, unchanged) / `Chart` toggle. **No Timeline**: `company_outcomes` has no start/due date column at all (only `horizon_days`, a duration length, not a date) — there is nothing to place on a Timeline. Chart tab: `BarChart` of progress % per outcome (all states, not just active), `Donut` of state distribution (active/paused/completed/replaced). |
| V5.4 Commitments — Timeline + Chart | ✅ | `apps/command/app/(app)/_components/commitments-view.tsx` (new) — `List` (existing In review/Active/Closed grouping, unchanged, including comments/proof/decision forms) / `Timeline` / `Chart` toggle. No `start_date` was approved for commitments (only `mission_milestones`/`tasks` got it in V0) — markers only on `due_date ?? next_action_date`, grouped by the same In review/Active/Closed buckets the List view uses. Chart tab: `BarChart` of count per group, `Donut` of on-track/awaiting-review/overdue among live commitments. |
| V5.5 Founder Vault — Timeline + Chart | ✅ | `apps/command/app/(app)/_components/founder-vault-view.tsx` (new) — `Journal` (existing chronological entry list, unchanged) / `Timeline` / `Chart` toggle. Vault entries only have `created_at` (a log timestamp, not a due/schedulable date) — markers only, grouped by `entry_type` (the one categorical dimension this table has: reflection/goal/routine/budget/energy). `created_at` is a full timestamp, sliced to a plain date before handing to `TimelineItem` since its date-axis math assumes `YYYY-MM-DD`, not a time-of-day. Chart tab: `Donut` of entry count by type. |
| V5.6 Tests | — | No new Zod schema/mutation this phase — all five views read existing data shapes (`CompanyOutcome`, `CommitmentView`, `VaultEntry`, `ActivityView`, `SignalView`, `DecisionView`) and reuse existing forms (`OutcomeForm`/`OutcomeStateForm`, `ProgressForm`/`ProofForm`/`DecisionForm`, `VaultForm`) as-is. No new unit tests needed; full suite (93 tests) still green. |
| V5.7 Docs | ✅ | This section. |

**What changed vs. the V5 plan**: Outcomes and Pulse don't get the literal "Timeline + Chart" pairing the plan described for all 5 modules — both are missing a per-item date field entirely (Outcomes has none; Pulse aggregates across modules that each have their own). Rather than force an empty or fabricated Timeline, both ship Chart-only, matching the same "use the real data, don't invent a schema" posture as V3's Revenue correction and V4's Knowledge/Connections corrections. Focus, Commitments, and Founder Vault all got the full Timeline+Chart pairing as planned.

**This closes the Command-wide visual redesign (V0→V5).** All 20 Command modules now have at least one alternate view (Board, Calendar, Timeline, or Chart) beyond a plain list, built entirely on the shared `Board`/`CalendarView`/`TimelineView`/chart primitives from V0 — zero new npm dependencies added across the whole redesign, and the two schema-changing decisions Kauan approved up front (hand-rolled SVG charts, the `start_date` migration for Missions/Tasks duration bars) were the only migration/dependency changes needed for the entire arc.
