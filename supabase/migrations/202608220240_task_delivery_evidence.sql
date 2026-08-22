-- Standard task delivery evidence: private file uploads and external delivery links.
-- Adds completion provenance so the task creator can be notified when work is delivered.

alter table public.tasks
  add column if not exists created_by uuid references public.profiles(id),
  add column if not exists requires_delivery boolean not null default false,
  add column if not exists completed_at timestamptz;

-- Recover the creator for legacy tasks from the existing audit trail. If no
-- audit event survives, ownership is the least-surprising fallback.
update public.tasks t
set created_by = coalesce(
  (
    select ae.actor_id
    from public.audit_events ae
    where ae.target_table = 'tasks'
      and ae.target_id = t.id
      and ae.action = 'task.created'
      and ae.actor_id is not null
    order by ae.created_at asc
    limit 1
  ),
  t.owner_id
)
where t.created_by is null;

-- Existing tasks that already carry an explicit delivery brief become delivery
-- tasks without any hard-coded IDs. This includes the BEZ / The Throne King task.
update public.tasks t
set requires_delivery = true
where not t.requires_delivery
  and exists (
    select 1
    from public.comments c
    where c.object_table = 'tasks'
      and c.object_id = t.id
      and c.body ilike '%DELIVERY REQUIRED%'
  );

create table if not exists public.task_delivery_evidence (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id),
  task_id uuid not null references public.tasks(id) on delete cascade,
  submitted_by uuid not null references public.profiles(id),
  kind text not null check (kind in ('file', 'external_url')),
  status text not null default 'pending' check (status in ('pending', 'ready', 'failed')),
  storage_path text,
  external_url text,
  original_filename text,
  mime_type text,
  size_bytes bigint,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (size_bytes is null or (size_bytes > 0 and size_bytes <= 104857600)),
  check (
    (kind = 'file' and storage_path is not null and external_url is null and original_filename is not null and mime_type is not null and size_bytes is not null)
    or
    (kind = 'external_url' and external_url ~ '^https://' and storage_path is null)
  )
);

create index if not exists task_delivery_evidence_task_idx
  on public.task_delivery_evidence (task_id, created_at desc);

alter table public.task_delivery_evidence enable row level security;

drop policy if exists task_delivery_evidence_read on public.task_delivery_evidence;
create policy task_delivery_evidence_read on public.task_delivery_evidence
for select
to authenticated
using (
  organization_id in (select public.current_org_ids())
  and exists (
    select 1
    from public.tasks t
    where t.id = task_delivery_evidence.task_id
      and t.organization_id = task_delivery_evidence.organization_id
      and (
        public.is_executive(t.organization_id)
        or t.owner_id = auth.uid()
        or t.project_id is null
        or public.can_access_project(t.project_id)
      )
  )
);

drop policy if exists task_delivery_evidence_insert on public.task_delivery_evidence;
create policy task_delivery_evidence_insert on public.task_delivery_evidence
for insert
to authenticated
with check (
  submitted_by = auth.uid()
  and organization_id in (select public.current_org_ids())
  and exists (
    select 1
    from public.tasks t
    where t.id = task_delivery_evidence.task_id
      and t.organization_id = task_delivery_evidence.organization_id
      and (
        public.is_executive(t.organization_id)
        or t.owner_id = auth.uid()
        or (t.project_id is not null and public.can_access_project(t.project_id))
      )
  )
);

drop policy if exists task_delivery_evidence_update_pending on public.task_delivery_evidence;
create policy task_delivery_evidence_update_pending on public.task_delivery_evidence
for update
to authenticated
using (
  submitted_by = auth.uid()
  and status = 'pending'
  and organization_id in (select public.current_org_ids())
)
with check (
  submitted_by = auth.uid()
  and status in ('ready', 'failed')
  and organization_id in (select public.current_org_ids())
);

revoke all on public.task_delivery_evidence from anon;
grant select, insert, update on public.task_delivery_evidence to authenticated;

create or replace function public.enforce_task_delivery_evidence_transition()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
begin
  if old.status <> 'pending' then
    raise exception 'task_delivery_evidence_immutable';
  end if;

  if new.status not in ('ready', 'failed') then
    raise exception 'task_delivery_evidence_invalid_transition';
  end if;

  if new.organization_id is distinct from old.organization_id
     or new.task_id is distinct from old.task_id
     or new.submitted_by is distinct from old.submitted_by
     or new.kind is distinct from old.kind
     or new.storage_path is distinct from old.storage_path
     or new.external_url is distinct from old.external_url
     or new.original_filename is distinct from old.original_filename
     or new.mime_type is distinct from old.mime_type
     or new.size_bytes is distinct from old.size_bytes
     or new.created_at is distinct from old.created_at then
    raise exception 'task_delivery_evidence_immutable_fields';
  end if;

  new.updated_at := now();
  return new;
end;
$$;

revoke all on function public.enforce_task_delivery_evidence_transition() from public;

drop trigger if exists task_delivery_evidence_transition on public.task_delivery_evidence;
create trigger task_delivery_evidence_transition
before update on public.task_delivery_evidence
for each row execute function public.enforce_task_delivery_evidence_transition();


create or replace function public.normalize_task_delivery_fields_on_insert()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
begin
  if auth.uid() is not null then
    if new.created_by is null then
      new.created_by := auth.uid();
    elsif new.created_by is distinct from auth.uid() and not public.is_executive(new.organization_id) then
      raise exception 'task_creator_must_be_actor';
    end if;
  end if;
  return new;
end;
$$;

revoke all on function public.normalize_task_delivery_fields_on_insert() from public;

drop trigger if exists tasks_normalize_delivery_fields_on_insert on public.tasks;
create trigger tasks_normalize_delivery_fields_on_insert
before insert on public.tasks
for each row execute function public.normalize_task_delivery_fields_on_insert();

create or replace function public.enforce_task_delivery_before_completion()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
begin
  if new.created_by is distinct from old.created_by then
    raise exception 'task_creator_immutable';
  end if;

  if new.requires_delivery is distinct from old.requires_delivery
     and not public.is_executive(old.organization_id)
     and old.created_by is distinct from auth.uid() then
    raise exception 'task_delivery_requirement_change_not_allowed';
  end if;

  if new.status = 'archived' and old.status is distinct from 'archived' then
    if (old.requires_delivery or new.requires_delivery) and not exists (
      select 1
      from public.task_delivery_evidence e
      where e.task_id = new.id
        and e.organization_id = new.organization_id
        and e.status = 'ready'
    ) then
      raise exception 'task_delivery_required';
    end if;
    new.completed_at := now();
  elsif new.status = 'active' and old.status is distinct from 'active' then
    new.completed_at := null;
  end if;
  return new;
end;
$$;

revoke all on function public.enforce_task_delivery_before_completion() from public;

drop trigger if exists tasks_require_delivery_before_completion on public.tasks;
create trigger tasks_require_delivery_before_completion
before update on public.tasks
for each row execute function public.enforce_task_delivery_before_completion();

-- Private review-copy storage. Large masters can remain in Drive and be attached
-- as external URLs. Direct KSP OS upload is intentionally capped at 100 MB.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'task-deliveries',
  'task-deliveries',
  false,
  104857600,
  array['video/mp4', 'video/quicktime', 'video/webm', 'video/x-m4v', 'video/mpeg']::text[]
)
on conflict (id) do update
set name = excluded.name,
    public = false,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

-- Object paths are generated server-side as:
-- <organization_id>/<task_id>/<evidence_id>/<sanitized_filename>
drop policy if exists task_deliveries_upload on storage.objects;
create policy task_deliveries_upload
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'task-deliveries'
  and exists (
    select 1
    from public.task_delivery_evidence e
    where e.kind = 'file'
      and e.status = 'pending'
      and e.submitted_by = auth.uid()
      and e.storage_path = name
      and split_part(name, '/', 1) = e.organization_id::text
      and split_part(name, '/', 2) = e.task_id::text
      and split_part(name, '/', 3) = e.id::text
  )
);

drop policy if exists task_deliveries_read on storage.objects;
create policy task_deliveries_read
on storage.objects
for select
to authenticated
using (
  bucket_id = 'task-deliveries'
  and exists (
    select 1
    from public.task_delivery_evidence e
    where e.kind = 'file'
      and e.storage_path = name
      and (e.status = 'ready' or e.submitted_by = auth.uid())
      and exists (
        select 1
        from public.tasks t
        where t.id = e.task_id
          and t.organization_id = e.organization_id
          and (
            public.is_executive(t.organization_id)
            or t.owner_id = auth.uid()
            or t.project_id is null
            or public.can_access_project(t.project_id)
          )
      )
  )
);

-- No UPDATE/DELETE storage policies: uploaded originals are append-only.
