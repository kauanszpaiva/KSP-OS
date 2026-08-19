create table service_templates (
    id uuid primary key default gen_random_uuid(),
    organization_id uuid not null references organizations(id),
    name text not null,
    service_family text not null,
    description text,
    version integer not null default 1,
    status record_status not null default 'active',
    created_at timestamptz not null default now()
);

create table work_packages (
    id uuid primary key default gen_random_uuid(),
    organization_id uuid not null references organizations(id),
    project_id uuid not null references projects(id) on delete cascade,
    service_template_id uuid references service_templates(id),
    name text not null,
    status record_status not null default 'active',
    start_date date,
    target_date date,
    created_at timestamptz not null default now(),
    created_by uuid references profiles(id)
);

alter table tasks add column work_package_id uuid references work_packages(id);

create table task_assignments (
    id uuid primary key default gen_random_uuid(),
    organization_id uuid not null references organizations(id),
    task_id uuid not null references tasks(id) on delete cascade,
    profile_id uuid not null references profiles(id),
    role text not null check (role in ('owner', 'contributor', 'reviewer', 'approver')),
    created_at timestamptz not null default now(),
    unique(task_id, profile_id, role)
);

alter table service_templates enable row level security;
alter table work_packages enable row level security;
alter table task_assignments enable row level security;

create policy "org_access" on service_templates for all using (organization_id in (select * from current_org_ids()));
create policy "org_access" on work_packages for all using (organization_id in (select * from current_org_ids()));
create policy "org_access" on task_assignments for all using (organization_id in (select * from current_org_ids()));
