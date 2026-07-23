# Phase V0 — Command-wide visual redesign: foundation

Group: Command · Status: ✅ done & verified

---

## Context

Kauan asked, sending two Asana/ClickUp reference screenshots: *"go back to Command. Quero que trabalhe o visual de todas as abas, quero gráficos, timelines Gantt. Usa funções do ASANA e ClickUp como base para o visual, funcionalidade, animação etc para KSP OS. Quero que pense em tudo funcionando, mantendo nome e funções originais."* — rework the visual of every module, add charts and Gantt timelines, using Asana/ClickUp as the reference, while keeping every module's existing name and function.

A research pass confirmed all 20 Command modules (`apps/command/lib/nav.ts`) render as a plain or grouped list — no Board/kanban, no Calendar, no charts anywhere except Schedule's List↔Gantt toggle (Phase C3.6). No table had a start+end date pair (every date field was a single point-in-time), so Schedule's Gantt drew point markers, not duration bars. `packages/ui` had zero chart primitives beyond command-local single-value indicators (`Rail`/`Ring`/`SlotMeter`), and no charting library exists in any `package.json`.

Kauan resolved the two real forks in this design directly:
1. **Charts**: hand-rolled SVG, no new dependency.
2. **Duration bars**: yes, add `start_date` via migration to `mission_milestones` and `tasks`.

This is too large for one PR — 20 modules, several new shared components. Sequenced like every other group in this rebuild (C0→C6, P0→P3): this phase (V0) builds the shared, reusable pieces; V1–V5 apply them per nav section in their own PRs.

## What shipped

| Piece | Status | Detail |
|---|---|---|
| Migration | ✅ | `202607230009_timeline_start_dates.sql` — nullable `start_date` on `mission_milestones` and `tasks`, each paired with a `start_date <= due_date` check constraint (permits null on either side). No new RLS policy needed — both tables already have full read/write policies from C3.1. Scoped exactly to what was asked (Missions/Tasks); Commitments and other single-date tables were deliberately left alone. |
| Types/validation/actions/forms | ✅ | `MissionMilestone`/`Task` (`packages/database/src/types.ts`) gained `start_date`. `createMilestoneSchema`/`createTaskSchema` gained an optional `startDate` with a `superRefine` guard (start ≤ due) mirroring the DB constraint at the validation layer too. `createMilestone`/`createTask` actions thread it through. `MilestoneForm`/`TaskForm` gained a start-date input. |
| Timeline component | ✅ | `_components/schedule-view.tsx`'s `GanttView` generalized in place (renamed `ScheduleView`/`ScheduleItem` → `TimelineView`/`TimelineItem`, one caller updated): renders a real width bar when an item has both `start` and `end` (now true for missions/tasks with a start date), falls back to the original marker-dot rendering otherwise (still true for Commitments and anything else). Added optional row grouping and a "waits on: …" text annotation for dependency edges. **Schedule itself doesn't wire dependencies** — `mission_dependencies` is mission-level, and Schedule's rows are milestones/commitments, a finer granularity than the relationship maps to; dependency annotations land on Missions' own future Timeline instead, where rows are actually missions. |
| Board component | ✅ | New `_components/board-view.tsx` — a generic `Board<T>({columns, renderCard})`, purely presentational. **v1 movement is click/select-based** (mirrors `MilestoneStatusForm`/`TaskReassignForm`'s auto-submit pattern), not drag-and-drop — no new dependency, no custom HTML5 DnD wiring. Not yet consumed by any page — first real application lands in Phase V1 (Signals/Decisions). |
| Calendar component | ✅ | New `_components/calendar-view.tsx` — month grid, prev/next navigation, click a day to see its items, a small dot indicator on days with items. Not yet consumed by any page — first real application lands in Phase V2 (Workspace). |
| Chart primitives | ✅ | New additions to `packages/ui/src/primitives.tsx` alongside the existing `Badge`/`Dot`/`Avatar`: `BarChart` (horizontal grouped bars), `Donut` (multi-segment, generalizes the single-arc stroke-dasharray technique `Ring` already used, to N segments with a legend), `Sparkline` (SVG trend polyline). All hand-rolled SVG/CSS — zero new dependency. Not yet consumed by any page — first real application lands in Phase V2+ (dashboards). |
| Tests | ✅ | 5 new unit tests for `createMilestoneSchema`/`createTaskSchema`'s `startDate` refinement (93 tests total repo-wide). SQL regression plan in `supabase/tests/timeline_start_dates.sql`. |
| Docs | ✅ | This doc, plus `STATUS.md`. |

## What changed vs. the plan

- Board/Calendar/chart primitives ship in this phase with **zero real-page consumers yet** — a deliberate two-phase sequencing (foundation, then apply), the same pattern this rebuild already used for Phase C0 (which shipped the whole design system before any module besides the shell chrome itself used most of it) and Phase C1 (which then applied it). Not a silent gap — V1/V2 are the stated first consumers.
- Schedule's Gantt view is the one genuinely *visible* improvement this phase ships directly: missions/milestones with a `start_date` now render as real duration bars; everything else (commitments, milestones without a start date) keeps the marker-dot rendering from Phase C3.6, unchanged.
- Two fields (`organization_id`-shaped completeness checks) weren't needed here — this migration only adds nullable columns to already-covered tables, so no new authorization surface was introduced.

## Checks run for this phase

`pnpm typecheck && pnpm lint && pnpm format:check && pnpm test && pnpm test:db && pnpm test:rls && pnpm test:migrations && pnpm security:secrets && pnpm build:command && pnpm build:portal` — all green.

- `pnpm test`: 93/93 passing (5 new).
- `pnpm test:db`: 11 SQL test files (new: `supabase/tests/timeline_start_dates.sql`).
- `pnpm test:rls`: coverage present for 57 tables (unchanged — new columns on already-covered tables, not a new table).
- `pnpm test:migrations`: 12 migration files validated.
- `pnpm build:command`: compiles clean; `/schedule` reflects the generalized Timeline.
- Manual: `pnpm --filter @ksp/command dev` — confirmed `/schedule`, `/missions`, `/workspace` all still redirect to `/setup` when Supabase is unconfigured.

Not verified here (requires live Supabase): applying `202607230009_timeline_start_dates.sql` and confirming the check constraints actually reject a bad insert/update in a real Postgres instance — verified by SQL review plus the Supabase preview-branch migration check on this phase's PR, same as every prior phase.

## Next

Phase V1 (Signals, Decisions — Board view) is next, per the phase table in the session's working plan, applying `Board` and `stateToneDotClass`/status enums for the first time.
