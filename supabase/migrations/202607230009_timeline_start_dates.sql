-- Phase V0 (Command-wide visual redesign, foundation).
--
-- Kauan asked for real Asana/ClickUp-style Gantt duration bars, not the
-- marker-only date-axis timeline shipped in Phase C3.6. Every date field in
-- the schema up to now is a single point in time (due_date/next_action_date/
-- publish_date/renewal_date) — there is no start+end pair anywhere to draw a
-- bar's width from. Confirmed by inspection before writing this migration:
-- no table has a "start_date"-shaped column at all.
--
-- Scoped exactly to what was asked (Missions/Tasks), not every dated table:
-- mission_milestones and tasks each get a nullable start_date pairing with
-- their existing due_date. Commitments and other single-date modules are
-- deliberately left alone — their Timeline rendering falls back to the
-- existing marker behavior (see the generalized Timeline component).
--
-- No new RLS policy needed: both tables already have full read/write
-- policies from the C3.1/C3.5 migrations (202607230002_missions.sql adds
-- write policies for the project family; the same migration covers tasks)
-- — a new column on an already-policy-covered table needs no new policy.
-- Re-asserting enable row level security below is a harmless no-op (already
-- enabled), matching the established convention for column-only migrations.
alter table mission_milestones enable row level security;
alter table tasks enable row level security;

alter table mission_milestones add column start_date date;
alter table tasks add column start_date date;

-- A milestone/task's start_date, when present, must not be after its
-- due_date — a real data-integrity guard a nullable column alone wouldn't
-- enforce, and the kind of check this repo's own governance rule
-- ("no weakening of invariants") argues for adding proactively rather than
-- discovering the gap later.
alter table mission_milestones add constraint mission_milestones_start_before_due
  check (start_date is null or due_date is null or start_date <= due_date);
alter table tasks add constraint tasks_start_before_due
  check (start_date is null or due_date is null or start_date <= due_date);
