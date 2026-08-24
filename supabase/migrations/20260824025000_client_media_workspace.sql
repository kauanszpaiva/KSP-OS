-- KSP Agency client media workspace.
-- Adds versioned private video delivery, client-visible posting schedule rows,
-- and tenant-aware Storage policies. Media bytes stay in Storage; relational
-- metadata and publication state stay in Postgres.

alter table public.content_items
  add column if not exists project_id uuid references public.projects(id) on delete set null,
  add column if not exists client_visible boolean not null default false;

create index if not exists content_items_project_idx
  on public.content_items (project_id, publish_date);
create index if not exists content_items_client_schedule_idx
  on public.content_items (client_id, client_visible, publish_date);

alter table public.deliverables
  add column if not exists content_item_id uuid references public.content_items(id) on delete set null;

create index if not exists deliverables_content_item_idx
  on public.deliverables (content_item_id);

alter table public.deliverable_versions
  add column if not exists storage_bucket text,
  add column if not exists storage_path text,
  add column if not exists file_name text,
  add column if not exists mime_type text,
  add column if not exists file_size_bytes bigint,
  add column if not exists upload_state text not null default 'ready',
  add column if not exists client_visible boolean not null default false,
  add column if not exists published_at timestamptz;

alter table public.deliverable_versions
  drop constraint if exists deliverable_versions_upload_state_check;
alter table public.deliverable_versions
  add constraint deliverable_versions_upload_state_check
  check (upload_state in ('pending', 'ready', 'failed'));

alter table public.deliverable_versions
  drop constraint if exists deliverable_versions_media_size_check;
alter table public.deliverable_versions
  add constraint deliverable_versions_media_size_check
  check (file_size_bytes is null or (file_size_bytes > 0 and file_size_bytes <= 2147483648));

alter table public.deliverable_versions
  drop constraint if exists deliverable_versions_managed_media_shape_check;
alter table public.deliverable_versions
  add constraint deliverable_versions_managed_media_shape_check
  check (
    (storage_path is null and storage_bucket is null)
    or
    (
      storage_path is not null
      and storage_bucket = 'client-media'
      and file_name is not null
      and mime_type is not null
      and file_size_bytes is not null
    )
  );

create index if not exists deliverable_versions_client_media_idx
  on public.deliverable_versions (client_visible, upload_state, created_at desc)
  where storage_path is not null;

-- Client schedule rows are opt-in. Internal content_items_read remains intact;
-- this policy adds the portal path without widening internal access.
drop policy if exists content_items_portal_read on public.content_items;
create policy content_items_portal_read
on public.content_items
for select
to authenticated
using (
  client_visible = true
  and client_id is not null
  and public.is_portal_member(client_id)
);

-- Version-level publication is explicit. Parent deliverable visibility alone is
-- not sufficient for managed media, preventing draft V2 from appearing merely
-- because V1 was shared earlier.
drop policy if exists deliverable_versions_portal_read on public.deliverable_versions;
create policy deliverable_versions_portal_read
on public.deliverable_versions
for select
to authenticated
using (
  (
    storage_path is null
    and exists (
      select 1
      from public.deliverables d
      join public.work_packages wp on wp.id = d.work_package_id
      join public.projects p on p.id = wp.project_id
      where d.id = deliverable_id
        and d.client_visible = true
        and public.is_portal_member(p.client_id)
    )
  )
  or
  (
    storage_path is not null
    and client_visible = true
    and upload_state = 'ready'
    and exists (
      select 1
      from public.deliverables d
      join public.work_packages wp on wp.id = d.work_package_id
      join public.projects p on p.id = wp.project_id
      where d.id = deliverable_id
        and d.client_visible = true
        and public.is_portal_member(p.client_id)
    )
  )
);

-- Private client-ready media. Paths are generated server-side as:
-- <organization_id>/<project_id>/<deliverable_id>/<version_id>/<filename>
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'client-media',
  'client-media',
  false,
  2147483648,
  array['video/mp4', 'video/quicktime', 'video/webm', 'video/x-m4v', 'video/mpeg']::text[]
)
on conflict (id) do update
set name = excluded.name,
    public = false,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

-- Only the internal user who prepared a pending version can create exactly the
-- corresponding object path. The relational version row is the authorization
-- source of truth, not user-supplied path text alone.
drop policy if exists client_media_internal_upload on storage.objects;
create policy client_media_internal_upload
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'client-media'
  and exists (
    select 1
    from public.deliverable_versions v
    join public.deliverables d on d.id = v.deliverable_id
    join public.work_packages wp on wp.id = d.work_package_id
    join public.projects p on p.id = wp.project_id
    where v.storage_path = name
      and v.storage_bucket = 'client-media'
      and v.upload_state = 'pending'
      and v.organization_id in (select public.current_org_ids())
      and p.organization_id = v.organization_id
      and split_part(name, '/', 1) = v.organization_id::text
      and split_part(name, '/', 2) = p.id::text
      and split_part(name, '/', 3) = d.id::text
      and split_part(name, '/', 4) = v.id::text
  )
);

-- Internal reads support verification, review and signed URL creation.
drop policy if exists client_media_internal_read on storage.objects;
create policy client_media_internal_read
on storage.objects
for select
to authenticated
using (
  bucket_id = 'client-media'
  and exists (
    select 1
    from public.deliverable_versions v
    join public.deliverables d on d.id = v.deliverable_id
    join public.work_packages wp on wp.id = d.work_package_id
    join public.projects p on p.id = wp.project_id
    where v.storage_path = name
      and v.storage_bucket = 'client-media'
      and v.organization_id in (select public.current_org_ids())
      and p.organization_id = v.organization_id
  )
);

-- Portal reads are narrower: ready version + explicit version publication +
-- explicit parent deliverable publication + active client membership.
drop policy if exists client_media_portal_read on storage.objects;
create policy client_media_portal_read
on storage.objects
for select
to authenticated
using (
  bucket_id = 'client-media'
  and exists (
    select 1
    from public.deliverable_versions v
    join public.deliverables d on d.id = v.deliverable_id
    join public.work_packages wp on wp.id = d.work_package_id
    join public.projects p on p.id = wp.project_id
    where v.storage_path = name
      and v.storage_bucket = 'client-media'
      and v.upload_state = 'ready'
      and v.client_visible = true
      and d.client_visible = true
      and public.is_portal_member(p.client_id)
  )
);

-- No UPDATE or DELETE policy is granted for client-media objects. A replacement
-- is a new deliverable version so review history remains auditable and CDN
-- caches cannot accidentally serve an overwritten version.
