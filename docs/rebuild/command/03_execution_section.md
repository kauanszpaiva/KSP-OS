# Phase C3 — Execution Section: Missions, Schedule, Horizon, Team, Workspace

Group: Command · Status: ✅ done & verified (see checks log in `STATUS.md`)

Goal: complete the Execution group. `Outcomes` and `Commitments` were already
live; this phase added the five remaining modules that give commitments a
project container, a timeline, a forward-looking view, a capacity view, and a
general task hub.

**Found and fixed along the way:** `projects`, `project_memberships`, and
`tasks` had the exact same latent gap Phase C2 found on `inbox_items`/
`approval_requests` — read-only RLS since the foundation migration, no
insert/update policy at all. This is now the second time this pattern has
shown up; later phases reusing an "existing" foundation table should check
for write policies before assuming they're there. Migration
`202607230002_missions.sql` closes it for the project family and adds
`mission_milestones`/`mission_dependencies`.

**Also found and fixed:** a real, unrelated pre-existing bug in migration
`202607150002` (rename `clients`→`client_organizations` left a stale policy
referencing a soon-to-be-dropped column, which failed on any fresh Postgres).
This had apparently never been caught because these migrations were never
run against a live database before — the Supabase preview-branch check on
PR #16 caught it immediately. Fixed in a standalone commit; see
`supabase/migrations/202607150002_identity_portal_finance_security.sql`.

---

## Mini-group C3.1 — Missions (`/missions`)

| Task | Status | Detail |
|---|---|---|
| C3.1.1 Migration | ✅ | Reused `projects` as the Mission table (no rename — too many existing references). Added `mission_milestones` and `mission_dependencies`, plus the missing write policies on `projects`/`project_memberships`/`tasks`. **Simplification:** `mission_phases` was not built as its own table — `phase` is a free-text column on `mission_milestones` instead, since v1 needs no relational integrity beyond a matching label. |
| C3.1.2 Data layer | ✅ | `getMissions`, `getMissionMembers` in `apps/command/app/(app)/data.ts` — join milestones, dependencies, and member ids per mission. |
| C3.1.3 Validation | ✅ | `createMissionSchema`, `updateMissionHealthSchema`, `createMilestoneSchema`, `updateMilestoneStatusSchema`, `addDependencySchema` (with a same-mission-dependency guard). |
| C3.1.4 Server actions | ✅ | `createMission` (also self-enrolls the creator via `project_memberships`, or the mission would be invisible to them next load), `updateMissionHealth`, `createMilestone`, `updateMilestoneStatus`, `addMissionDependency`. |
| C3.1.5 UI — List/Board | ✅ | `apps/command/app/(app)/missions/page.tsx` — active/archived split; **simplification:** a card grid, not the health/client/manager/milestone group-by board from the original plan — v1 ships one grouping (active vs. archived) since there aren't yet enough missions in any real org to need more. |
| C3.1.6 UI — Mission detail | ⬜ | **Not a separate route.** Each mission card inlines milestones + dependencies + health, which covers v1; a dedicated detail page with RAID/decisions is worth building once Missions have enough going on to outgrow a card. |
| C3.1.7 Tests | ✅ | SQL regression plan documented (not live-run) in `supabase/tests/missions.sql`. |
| C3.1.8 Docs | ✅ | This row. |

## Mini-group C3.2 — Schedule (`/schedule`)

| Task | Status | Detail |
|---|---|---|
| C3.2.1 Data layer | ✅ | Aggregates dated, open commitments + open mission milestones inline in the page (no new data.ts function — the aggregation is page-specific enough not to warrant one yet). |
| C3.2.2 UI — Timeline | ✅ | **Simplification:** a chronological list grouped by month with a vertical spine (matching Focus's visual language), not a Gantt chart — no charting dependency was added, consistent with the plan's "no unapproved dependency" default. A real Gantt/critical-path view is still open for later once there's drag-to-reschedule demand. |
| C3.2.3 Tests | — | No new pure logic worth a unit test beyond what `createMilestoneSchema`/commitment schemas already cover. |
| C3.2.4 Docs | ✅ | This row. |

## Mini-group C3.3 — Horizon (`/horizon`)

| Task | Status | Detail |
|---|---|---|
| C3.3.1 Data layer | ✅ | Reuses `getCommitments`/`getMissions`; buckets by `daysUntil` from `apps/command/lib/format.ts`. |
| C3.3.2 UI | ✅ | `apps/command/app/(app)/horizon/page.tsx` + `_components/horizon-range.tsx` (client `Segmented` control driving a `?range=` query param) — 7/30/90-day toggle as planned. |
| C3.3.3 Docs | ✅ | This row. |

## Mini-group C3.4 — Team (`/team`)

| Task | Status | Detail |
|---|---|---|
| C3.4.1 Data layer | ✅ | `getTeamLoad` — per-person open-commitment count + open-task count + mission count. **Simplification, stated in the plan itself:** this is an open-item count, not hour-based capacity — no table tracks planned hours yet. An "Overloaded" badge fires past a hardcoded threshold (5 open items); tune or replace once real usage data exists. |
| C3.4.2 UI | ✅ | `apps/command/app/(app)/team/page.tsx` — simple per-person row with avatar, counts, overload badge. |
| C3.4.3 Docs | ✅ | This row. |

## Mini-group C3.5 — Workspace (`/workspace`)

| Task | Status | Detail |
|---|---|---|
| C3.5.1 Data layer | ✅ | `getTasks` — reads `tasks` joined to owner and project name. |
| C3.5.2 Validation | ✅ | `createTaskSchema`, `updateTaskStatusSchema`. |
| C3.5.3 Server actions | ✅ | `createTask`, `updateTaskStatus` (used for both the blocked toggle and marking done via `status: 'archived'`). |
| C3.5.4 UI — Board/List | ✅ | `apps/command/app/(app)/workspace/page.tsx` — Blocked / Open / Done sections. **Simplification:** a grouped list, not a full Kanban drag-and-drop board — matches the density of every other list view shipped so far; revisit if the team actually wants to drag cards between columns. |
| C3.5.5 Tests | ✅ | Unit tests for `createTaskSchema`/`updateTaskStatusSchema` in `packages/validation/src/missions-workspace.test.ts` (11 tests total for this phase). SQL regression plan in `supabase/tests/missions.sql`. |
| C3.5.6 Docs | ✅ | This row. `Workspace` flipped from `planned` to `live` in `apps/command/lib/nav.ts`. |

## What changed vs. the original plan

- Sequencing followed the plan (Missions → Workspace → Schedule → Horizon → Team), and it held up — Schedule and Horizon really did read cleanly off Missions' milestones once those existed.
- Every module shipped a flatter v1 than the aspirational blueprint description (no Gantt, no RAID, no hour-based capacity, no phases-as-a-table) — each simplification is called out above with a reason, not silently dropped.
- Two real, previously-undetected bugs were found and fixed in the course of this phase (see the callouts above) — worth noting for whoever plans Phase C4/C5: check write-side RLS on any "existing" foundation table before assuming it's ready to build on.
