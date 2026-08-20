create table social_content_items (
    id uuid primary key default gen_random_uuid(),
    organization_id uuid not null references organizations(id),
    work_package_id uuid not null references work_packages(id) on delete cascade,
    task_id uuid references tasks(id),
    title text not null,
    concept text,
    platform text,
    format text,
    content_pillar text,
    status text not null default 'idea',
    brief text,
    script text,
    caption text,
    target_publish_date timestamptz,
    actual_publish_date timestamptz,
    publication_url text,
    created_at timestamptz not null default now()
);

alter table social_content_items enable row level security;

create policy "org_access" on social_content_items for all using (organization_id in (select * from current_org_ids()));
