create table workflows (
    id uuid primary key default gen_random_uuid(),
    organization_id uuid not null references organizations(id),
    work_package_id uuid references work_packages(id) on delete cascade,
    name text not null,
    status record_status not null default 'active',
    created_at timestamptz not null default now()
);

create table workflow_nodes (
    id uuid primary key default gen_random_uuid(),
    organization_id uuid not null references organizations(id),
    workflow_id uuid not null references workflows(id) on delete cascade,
    name text not null,
    node_type text not null,
    status text not null default 'pending',
    sequence_order integer not null,
    created_at timestamptz not null default now()
);

create table deliverables (
    id uuid primary key default gen_random_uuid(),
    organization_id uuid not null references organizations(id),
    work_package_id uuid not null references work_packages(id) on delete cascade,
    task_id uuid references tasks(id),
    name text not null,
    description text,
    status text not null default 'draft',
    client_visible boolean not null default false,
    created_at timestamptz not null default now()
);

create table deliverable_versions (
    id uuid primary key default gen_random_uuid(),
    organization_id uuid not null references organizations(id),
    deliverable_id uuid not null references deliverables(id) on delete cascade,
    version_number integer not null,
    file_reference text,
    status text not null default 'pending_review',
    created_at timestamptz not null default now(),
    unique(deliverable_id, version_number)
);

alter table approval_requests add column deliverable_version_id uuid references deliverable_versions(id);

alter table workflows enable row level security;
alter table workflow_nodes enable row level security;
alter table deliverables enable row level security;
alter table deliverable_versions enable row level security;

create policy "org_access" on workflows for all using (organization_id in (select * from current_org_ids()));
create policy "org_access" on workflow_nodes for all using (organization_id in (select * from current_org_ids()));
create policy "org_access" on deliverables for all using (organization_id in (select * from current_org_ids()));
create policy "org_access" on deliverable_versions for all using (organization_id in (select * from current_org_ids()));
