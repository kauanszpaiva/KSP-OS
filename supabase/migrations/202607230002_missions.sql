-- Phase C3: Missions become a live module. `projects`/`project_memberships`/`tasks`
-- existed since the foundation migration with read-only RLS (no insert/update policy
-- anywhere) — the same gap Phase C2 found on inbox_items/approval_requests. This
-- migration closes it for the project family and adds the two new tables Missions
-- needs: milestones and cross-mission dependencies.

alter table projects enable row level security;
alter table project_memberships enable row level security;
alter table tasks enable row level security;

-- ---------------------------------------------------------------------------
-- projects (Missions), project_memberships, tasks (Workspace): write policies.
-- `projects` has no owner/created_by column, so insert is scoped to org
-- membership only; a project only becomes visible to its creator once a
-- project_memberships row exists for them, which the creating action must
-- insert in the same transaction (mirrors the commitments/commitment_assignments
-- pattern). Unlike commitment_assignments (executive-only insert),
-- project_memberships allows self-enrollment — otherwise a non-executive who
-- creates a mission could never see it again, which would make the module
-- unusable for the roles the permission model intends to let manage projects.
-- ---------------------------------------------------------------------------
create policy projects_insert on projects for insert
  with check (organization_id in (select current_org_ids()));

create policy projects_update on projects for update
  using (organization_id in (select current_org_ids()) and (is_executive(organization_id) or can_access_project(id)))
  with check (organization_id in (select current_org_ids()));

create policy project_memberships_insert on project_memberships for insert
  with check (
    organization_id in (select current_org_ids())
    and (is_executive(organization_id) or profile_id = auth.uid())
  );

create policy project_memberships_update on project_memberships for update
  using (is_executive(organization_id)) with check (is_executive(organization_id));

create policy project_memberships_delete on project_memberships for delete
  using (is_executive(organization_id));

create policy tasks_insert on tasks for insert
  with check (
    organization_id in (select current_org_ids())
    and (project_id is null or can_access_project(project_id) or is_executive(organization_id))
  );

create policy tasks_update on tasks for update
  using (
    organization_id in (select current_org_ids())
    and (is_executive(organization_id) or owner_id = auth.uid() or (project_id is not null and can_access_project(project_id)))
  )
  with check (organization_id in (select current_org_ids()));

-- ---------------------------------------------------------------------------
-- mission_milestones: dated checkpoints within a mission. `phase` is a free-text
-- label rather than a separate mission_phases table for this v1 — grouping by
-- phase in the UI needs no relational integrity beyond the label matching.
-- ---------------------------------------------------------------------------
create table mission_milestones (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id),
  project_id uuid not null references projects(id) on delete cascade,
  title text not null,
  phase text,
  due_date date,
  status text not null default 'pending' check (status in ('pending', 'in_progress', 'done', 'at_risk')),
  sort_order int not null default 0,
  created_by uuid references profiles(id),
  created_at timestamptz not null default now()
);
create index mission_milestones_project_idx on mission_milestones (project_id);

alter table mission_milestones enable row level security;
create policy mission_milestones_read on mission_milestones for select
  using (organization_id in (select current_org_ids()) and (is_executive(organization_id) or can_access_project(project_id)));
create policy mission_milestones_insert on mission_milestones for insert
  with check (organization_id in (select current_org_ids()) and (is_executive(organization_id) or can_access_project(project_id)));
create policy mission_milestones_update on mission_milestones for update
  using (organization_id in (select current_org_ids()) and (is_executive(organization_id) or can_access_project(project_id)))
  with check (organization_id in (select current_org_ids()));
create policy mission_milestones_delete on mission_milestones for delete
  using (is_executive(organization_id));

-- ---------------------------------------------------------------------------
-- mission_dependencies: cross-mission dependency edges (a directed "blocked by").
-- Read is granted to anyone who can access either side, so the blocked team can
-- see what they are waiting on even without membership on the upstream mission.
-- ---------------------------------------------------------------------------
create table mission_dependencies (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id),
  project_id uuid not null references projects(id) on delete cascade,
  depends_on_project_id uuid not null references projects(id) on delete cascade,
  note text,
  created_by uuid references profiles(id),
  created_at timestamptz not null default now(),
  check (project_id <> depends_on_project_id),
  unique (project_id, depends_on_project_id)
);
create index mission_dependencies_project_idx on mission_dependencies (project_id);

alter table mission_dependencies enable row level security;
create policy mission_dependencies_read on mission_dependencies for select
  using (
    organization_id in (select current_org_ids())
    and (is_executive(organization_id) or can_access_project(project_id) or can_access_project(depends_on_project_id))
  );
create policy mission_dependencies_insert on mission_dependencies for insert
  with check (organization_id in (select current_org_ids()) and (is_executive(organization_id) or can_access_project(project_id)));
create policy mission_dependencies_delete on mission_dependencies for delete
  using (organization_id in (select current_org_ids()) and (is_executive(organization_id) or can_access_project(project_id)));
