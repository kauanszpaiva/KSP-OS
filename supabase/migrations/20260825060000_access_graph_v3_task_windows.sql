-- KSP OS Access Graph v3: narrow cross-business-unit task collaboration.
--
-- Goals:
-- - a task assignee can read the exact task even when the parent project belongs
--   to another business unit;
-- - an authorized @mention can grant view/comment access to the exact task only;
-- - mention access does not grant project/business-unit membership or task mutation;
-- - task comments stop being organization-wide readable when attached to tasks;
-- - all grants remain explicit, auditable and revocable.
--
-- This migration does not relax project/business-unit access. It adds a resource
-- layer below project scope and leaves task UPDATE authority unchanged.

create schema if not exists access_graph_private;
revoke all on schema access_graph_private from public;
revoke all on schema access_graph_private from anon;
grant usage on schema access_graph_private to authenticated;

create table if not exists public.task_access_grants (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  task_id uuid not null references public.tasks(id) on delete cascade,
  profile_id uuid not null references public.profiles(id) on delete cascade,
  reason text not null check (reason in ('mention', 'manual')),
  effective_from timestamptz not null default now(),
  effective_until timestamptz,
  revoked_at timestamptz,
  granted_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (task_id, profile_id, reason),
  check (effective_until is null or effective_until > effective_from)
);

create index if not exists task_access_grants_profile_idx
  on public.task_access_grants (profile_id, task_id)
  where revoked_at is null;

create index if not exists task_access_grants_task_idx
  on public.task_access_grants (task_id, profile_id)
  where revoked_at is null;

alter table public.task_access_grants enable row level security;
revoke all on public.task_access_grants from anon;
grant select, insert, update on public.task_access_grants to authenticated;

-- A task resource window is useful only to an active internal identity in the
-- same organization. Client/partner identities do not become Command users by
-- being named in a comment.
create or replace function access_graph_private.is_active_internal_profile(
  target_organization_id uuid,
  target_profile_id uuid
)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.organization_memberships om
    where om.organization_id = target_organization_id
      and om.profile_id = target_profile_id
      and om.internal_role is not null
      and om.suspended_at is null
      and om.effective_from <= now()
      and (om.effective_until is null or om.effective_until > now())
  );
$$;

-- Only a global owner or someone with canonical access to the parent project may
-- intentionally expand a task thread to another internal person. A recipient who
-- has only a mention window cannot recursively fan that access out.
create or replace function access_graph_private.can_share_task_access(target_task_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.tasks t
    where t.id = target_task_id
      and t.organization_id in (select public.current_org_ids())
      and (
        public.is_executive(t.organization_id)
        or (t.project_id is not null and public.can_access_project(t.project_id))
      )
  );
$$;

-- Central task visibility helper. Assignment is represented by tasks.owner_id;
-- mentions/manual windows are represented by task_access_grants. Project access
-- remains unchanged and is still required for project/sibling resources.
create or replace function public.can_view_task(target_task_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.tasks t
    where t.id = target_task_id
      and t.organization_id in (select public.current_org_ids())
      and (
        public.is_executive(t.organization_id)
        or t.owner_id = auth.uid()
        or t.project_id is null
        or (t.project_id is not null and public.can_access_project(t.project_id))
        or exists (
          select 1
          from public.task_access_grants tag
          where tag.organization_id = t.organization_id
            and tag.task_id = t.id
            and tag.profile_id = auth.uid()
            and tag.revoked_at is null
            and tag.effective_from <= now()
            and (tag.effective_until is null or tag.effective_until > now())
        )
      )
  );
$$;

revoke all on function access_graph_private.is_active_internal_profile(uuid, uuid) from public;
revoke all on function access_graph_private.is_active_internal_profile(uuid, uuid) from anon;
grant execute on function access_graph_private.is_active_internal_profile(uuid, uuid) to authenticated;

revoke all on function access_graph_private.can_share_task_access(uuid) from public;
revoke all on function access_graph_private.can_share_task_access(uuid) from anon;
grant execute on function access_graph_private.can_share_task_access(uuid) to authenticated;

revoke all on function public.can_view_task(uuid) from public;
revoke all on function public.can_view_task(uuid) from anon;
grant execute on function public.can_view_task(uuid) to authenticated;
grant execute on function public.can_view_task(uuid) to service_role;

-- Users may inspect only their own resource windows; executives may inspect all
-- windows for owner governance. Direct insertion/update is executive-only. Normal
-- mention grants are created by the controlled comment trigger below.
drop policy if exists task_access_grants_read on public.task_access_grants;
create policy task_access_grants_read on public.task_access_grants
for select to authenticated
using (
  profile_id = auth.uid()
  or public.is_executive(organization_id)
);

drop policy if exists task_access_grants_insert on public.task_access_grants;
create policy task_access_grants_insert on public.task_access_grants
for insert to authenticated
with check (
  public.is_executive(organization_id)
  and access_graph_private.is_active_internal_profile(organization_id, profile_id)
  and exists (
    select 1 from public.tasks t
    where t.id = task_id and t.organization_id = task_access_grants.organization_id
  )
);

drop policy if exists task_access_grants_update on public.task_access_grants;
create policy task_access_grants_update on public.task_access_grants
for update to authenticated
using (public.is_executive(organization_id))
with check (
  public.is_executive(organization_id)
  and access_graph_private.is_active_internal_profile(organization_id, profile_id)
);

-- Rebuild task SELECT around the resource-aware helper. UPDATE is deliberately
-- left untouched, so a mention-only grant cannot change status/assignee/data.
drop policy if exists tasks_project_read on public.tasks;
create policy tasks_project_read on public.tasks
for select to authenticated
using (public.can_view_task(id));

-- Task comments now follow task visibility instead of organization-wide comment
-- visibility. Other commentable resource types retain the legacy org-member rule
-- until their own resource-aware policies are migrated in later Spec slices.
drop policy if exists comments_read on public.comments;
create policy comments_read on public.comments
for select to authenticated
using (
  organization_id in (select public.current_org_ids())
  and (
    (object_table = 'tasks' and public.can_view_task(object_id))
    or object_table <> 'tasks'
  )
);

drop policy if exists comments_insert on public.comments;
create policy comments_insert on public.comments
for insert to authenticated
with check (
  organization_id in (select public.current_org_ids())
  and author_id = auth.uid()
  and (
    (object_table = 'tasks' and public.can_view_task(object_id))
    or object_table <> 'tasks'
  )
);

-- Convert task @mentions into explicit resource windows only when the comment
-- author already has authority to share the task. This prevents a mention-only
-- recipient from recursively granting additional people access.
create or replace function access_graph_private.sync_task_mention_access()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  mentioned_profile_id uuid;
begin
  if new.object_table <> 'tasks' or cardinality(new.mentions) = 0 then
    return new;
  end if;

  if not access_graph_private.can_share_task_access(new.object_id) then
    return new;
  end if;

  for mentioned_profile_id in select distinct unnest(new.mentions)
  loop
    if mentioned_profile_id = new.author_id then
      continue;
    end if;

    if not access_graph_private.is_active_internal_profile(new.organization_id, mentioned_profile_id) then
      continue;
    end if;

    insert into public.task_access_grants (
      organization_id,
      task_id,
      profile_id,
      reason,
      effective_from,
      effective_until,
      revoked_at,
      granted_by,
      updated_at
    ) values (
      new.organization_id,
      new.object_id,
      mentioned_profile_id,
      'mention',
      now(),
      null,
      null,
      new.author_id,
      now()
    )
    on conflict (task_id, profile_id, reason) do update
      set effective_from = now(),
          effective_until = null,
          revoked_at = null,
          granted_by = excluded.granted_by,
          updated_at = now();
  end loop;

  return new;
end;
$$;

revoke all on function access_graph_private.sync_task_mention_access() from public;
revoke all on function access_graph_private.sync_task_mention_access() from anon;

-- AFTER INSERT means the comment must first pass comments_insert RLS. The trigger
-- cannot be used to bootstrap access to a task the actor could not comment on.
drop trigger if exists comments_task_mention_access on public.comments;
create trigger comments_task_mention_access
after insert on public.comments
for each row execute function access_graph_private.sync_task_mention_access();

-- Keep access-window history on task deletion through FK cascade; explicit grant
-- revocation is a timestamped update, never a destructive delete in normal flow.
