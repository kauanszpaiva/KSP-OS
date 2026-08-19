create table releases (
    id uuid primary key default gen_random_uuid(),
    organization_id uuid not null references organizations(id),
    project_id uuid not null references projects(id) on delete cascade,
    name text not null,
    summary text,
    status text not null default 'draft',
    created_by uuid references profiles(id),
    created_at timestamptz not null default now()
);

create table release_items (
    id uuid primary key default gen_random_uuid(),
    organization_id uuid not null references organizations(id),
    release_id uuid not null references releases(id) on delete cascade,
    deliverable_version_id uuid references deliverable_versions(id),
    social_content_item_id uuid references social_content_items(id),
    notes text,
    created_at timestamptz not null default now()
);

alter table releases enable row level security;
alter table release_items enable row level security;

create policy "org_access" on releases for all using (organization_id in (select * from current_org_ids()));
create policy "org_access" on release_items for all using (organization_id in (select * from current_org_ids()));
