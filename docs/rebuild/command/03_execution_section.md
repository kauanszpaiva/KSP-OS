# Phase C3 — Execution Section: Missions, Schedule, Horizon, Team, Workspace

Group: Command · Status: ⬜ not started

Goal: complete the Execution group. `Outcomes` and `Commitments` are already
live; this phase adds the five remaining modules that give commitments a
project container, a timeline, a forward-looking view, a capacity view, and a
general task hub.

---

## Mini-group C3.1 — Missions (`/missions`)

Purpose: the project/engagement/product/campaign object that commitments
ladder up to (the "Mission" core object from the product model).

| Task | Status | Detail |
|---|---|---|
| C3.1.1 Migration | ⬜ | Reuse `projects` (foundation migration) as the Mission table (rename via a view or a thin wrapper — do not rename the underlying table if other code depends on `projects`; confirm first). Add `mission_milestones`, `mission_phases`, `mission_dependencies` tables with RLS mirroring `project_memberships` access. |
| C3.1.2 Data layer | ⬜ | `getMissions`, `getMission(id)` (with milestones/phases/dependencies/linked commitments). |
| C3.1.3 Validation | ⬜ | Zod schemas for mission create/update, milestone create/update, dependency create. |
| C3.1.4 Server actions | ⬜ | `createMission`, `updateMissionHealth`, `addMilestone`, `linkCommitmentToMission`, `addDependency` — authorization via `project.manage`; audit on all mutations. |
| C3.1.5 UI — List/Board | ⬜ | Portfolio-style board (group by health/client/manager/milestone) per `PRODUCT_INFORMATION_ARCHITECTURE.md §6`; List view alternative via `Segmented`. |
| C3.1.6 UI — Mission detail | ⬜ | Outcome/scope, milestone timeline, linked commitments board, dependencies, RAID notes (can stub RAID as a simple notes field until a dedicated module exists). |
| C3.1.7 Tests | ⬜ | Unit tests for mission health rules (if any); RLS tests for the two new tables. |
| C3.1.8 Docs | ⬜ | Mark ✅ with PR + checks. |

## Mini-group C3.2 — Schedule (`/schedule`)

Purpose: Gantt/timeline over missions and commitments; foundation for a
critical-path view later.

| Task | Status | Detail |
|---|---|---|
| C3.2.1 Data layer | ⬜ | Aggregate `commitments.due_date`/`next_action_date` + `mission_milestones` dates into a timeline-shaped dataset. |
| C3.2.2 UI — Timeline | ⬜ | Horizontal timeline (custom-built, no charting dependency unless justified and documented) with drag-free MVP first (read-only), then inline date edits via existing `updateProgress`-style actions. |
| C3.2.3 Tests | ⬜ | Unit tests for date-aggregation helpers. |
| C3.2.4 Docs | ⬜ | Mark ✅ with PR + checks. |

## Mini-group C3.3 — Horizon (`/horizon`)

Purpose: 7/30/90-day forward view.

| Task | Status | Detail |
|---|---|---|
| C3.3.1 Data layer | ⬜ | Reuse `getCommitments`/mission milestones; bucket by day-distance (reuse `daysUntil` from `apps/command/lib/format.ts`). |
| C3.3.2 UI | ⬜ | Segmented 7/30/90 view; reuse the Focus page's "band" pattern (`apps/command/app/(app)/focus/page.tsx`) as a starting point rather than re-inventing it. |
| C3.3.3 Docs | ⬜ | Mark ✅ with PR + checks. |

## Mini-group C3.4 — Team (`/team`)

Purpose: capacity/allocation by person/week.

| Task | Status | Detail |
|---|---|---|
| C3.4.1 Data layer | ⬜ | Join `profiles`, `organization_memberships`, `commitment_assignments`, `project_memberships` to compute a simple load count per person (v1: count of open commitments/assigned missions, not full hour-based capacity). |
| C3.4.2 UI | ⬜ | Per-person row with avatar, role, open-work count, and an overload indicator (`Badge tone="warn"`/`"risk"` past a threshold). |
| C3.4.3 Docs | ⬜ | Mark ✅ with PR + checks. |

## Mini-group C3.5 — Workspace (`/workspace`)

Purpose: general team task hub — the module Kauan saw in the screenshot that
doesn't exist in the current `nav.ts` yet (added as `planned` in Phase C0).
Reuses the `tasks` table already defined in the foundation migration.

| Task | Status | Detail |
|---|---|---|
| C3.5.1 Data layer | ⬜ | `getTasks` — read `tasks` scoped by RLS (`tasks_project_read`), joined to project/mission name and owner. |
| C3.5.2 Validation | ⬜ | Zod schema for task create/update (title, project_id, owner_id, due_date, blocked, classification). |
| C3.5.3 Server actions | ⬜ | `createTask`, `updateTask`, `toggleBlocked` — authorization via `project.manage`/assigned-project scope. |
| C3.5.4 UI — Board/List | ⬜ | Kanban board (group by status) + list view via `Segmented`; group-by project/owner/status toggle. |
| C3.5.5 Tests | ⬜ | Unit tests for task validation; RLS smoke test (table already has policies — confirm they still apply as expected, don't re-derive them). |
| C3.5.6 Docs | ⬜ | Mark ✅ with PR + checks. Also flip `Workspace`'s `status` in `apps/command/lib/nav.ts` from `'planned'` to `'live'` once shipped. |

## Sequencing note

Missions (C3.1) is the foundation the rest of this phase leans on (Schedule
and Horizon both read mission milestones). Build in this order: C3.1 → C3.5
(Workspace has no mission dependency, can run in parallel) → C3.2 → C3.3 →
C3.4.
