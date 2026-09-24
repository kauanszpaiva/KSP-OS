-- Personal wall-clock planning is not a task deadline or a time/payroll record.
-- Additive, reviewed deployment required; this migration does not reset any data.
create schema if not exists extensions;
create extension if not exists btree_gist with schema extensions;

create table public.task_day_schedule (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id),
  profile_id uuid not null references public.profiles(id),
  task_id uuid not null references public.tasks(id) on delete cascade,
  work_date date not null,
  timezone text not null default 'America/New_York' check (timezone = 'America/New_York'),
  start_minute integer not null,
  end_minute integer not null,
  revision integer not null default 1 check (revision > 0),
  updated_at timestamptz not null default now(),
  constraint task_day_schedule_valid_range check (
    start_minute >= 0 and end_minute <= 1440 and end_minute > start_minute
    and start_minute % 15 = 0 and end_minute % 15 = 0
  ),
  constraint task_day_schedule_no_overlap exclude using gist (
    profile_id with =, work_date with =, int4range(start_minute, end_minute, '[)') with &&
  )
);
create index task_day_schedule_owner_day_idx on public.task_day_schedule(profile_id, work_date);
create index task_day_schedule_task_idx on public.task_day_schedule(task_id);
alter table public.task_day_schedule enable row level security;
revoke all on public.task_day_schedule from public, anon;
grant select, insert, update, delete on public.task_day_schedule to authenticated;

-- Task RLS remains the source of resource visibility, including explicit denies.
create policy task_day_schedule_read on public.task_day_schedule for select to authenticated
using (profile_id = (select auth.uid()) and public.is_internal_member(organization_id)
  and exists (select 1 from public.tasks t where t.id = task_id and t.organization_id = task_day_schedule.organization_id));
create policy task_day_schedule_insert on public.task_day_schedule for insert to authenticated
with check (profile_id = (select auth.uid()) and public.is_internal_member(organization_id)
  and exists (select 1 from public.tasks t where t.id = task_id and t.organization_id = task_day_schedule.organization_id
    and t.status in ('draft', 'active', 'pending_approval', 'approved')));
create policy task_day_schedule_update on public.task_day_schedule for update to authenticated
using (profile_id = (select auth.uid()) and public.is_internal_member(organization_id)
  and exists (select 1 from public.tasks t where t.id = task_id and t.organization_id = task_day_schedule.organization_id))
with check (profile_id = (select auth.uid()) and public.is_internal_member(organization_id)
  and exists (select 1 from public.tasks t where t.id = task_id and t.organization_id = task_day_schedule.organization_id
    and t.status in ('draft', 'active', 'pending_approval', 'approved')));
create policy task_day_schedule_delete on public.task_day_schedule for delete to authenticated
using (profile_id = (select auth.uid()) and public.is_internal_member(organization_id)
  and exists (select 1 from public.tasks t where t.id = task_id and t.organization_id = task_day_schedule.organization_id));

create function public.guard_task_day_schedule() returns trigger
language plpgsql set search_path = '' as $$
begin
  if TG_OP = 'UPDATE' then
    if new.id <> old.id or new.profile_id <> old.profile_id or new.organization_id <> old.organization_id
      or new.task_id <> old.task_id or new.work_date <> old.work_date or new.timezone <> old.timezone then
      raise exception 'schedule_scope_immutable' using errcode = '23514';
    end if;
    new.revision := old.revision + 1;
  else
    new.revision := 1;
  end if;
  new.updated_at := now();
  return new;
end;
$$;
revoke all on function public.guard_task_day_schedule() from public, anon, authenticated;
create trigger task_day_schedule_guard before insert or update on public.task_day_schedule
for each row execute function public.guard_task_day_schedule();

create function public.audit_task_day_schedule() returns trigger
language plpgsql security definer set search_path = '' as $$
declare row_data public.task_day_schedule;
begin
  if TG_OP = 'DELETE' then row_data := old; else row_data := new; end if;
  insert into public.audit_events(organization_id, actor_id, action, target_table, target_id, classification, metadata)
  values (row_data.organization_id, auth.uid(),
    case TG_OP when 'INSERT' then 'task.day_scheduled' when 'UPDATE' then 'task.day_rescheduled' else 'task.day_unscheduled' end,
    'task_day_schedule', row_data.id, 'internal',
    jsonb_build_object('task_id', row_data.task_id, 'profile_id', row_data.profile_id,
      'work_date', row_data.work_date, 'start_minute', row_data.start_minute,
      'end_minute', row_data.end_minute, 'revision', row_data.revision));
  return row_data;
end;
$$;
revoke all on function public.audit_task_day_schedule() from public, anon, authenticated;
create trigger task_day_schedule_audit after insert or update or delete on public.task_day_schedule
for each row execute function public.audit_task_day_schedule();

-- SECURITY INVOKER: these helpers must not bypass any task or schedule RLS.
create function public.save_task_day_slot(
  p_id uuid, p_task_id uuid, p_date date, p_start_minute integer,
  p_end_minute integer, p_expected_revision integer
) returns jsonb language plpgsql security invoker set search_path = '' as $$
declare v_org uuid; v_slot public.task_day_schedule;
begin
  if auth.uid() is null then raise exception 'schedule_access_denied' using errcode = '42501'; end if;
  if p_expected_revision is null or p_expected_revision < 0 then
    raise exception 'schedule_invalid_revision' using errcode = '23514';
  end if;
  select t.organization_id into v_org from public.tasks t
  where t.id = p_task_id and t.status in ('draft', 'active', 'pending_approval', 'approved');
  if not found or not public.is_internal_member(v_org) then
    raise exception 'schedule_access_denied' using errcode = '42501';
  end if;
  if p_expected_revision = 0 then
    insert into public.task_day_schedule(id, organization_id, profile_id, task_id, work_date, start_minute, end_minute)
    values (p_id, v_org, auth.uid(), p_task_id, p_date, p_start_minute, p_end_minute) returning * into v_slot;
  else
    update public.task_day_schedule set start_minute = p_start_minute, end_minute = p_end_minute
    where id = p_id and profile_id = auth.uid() and organization_id = v_org
      and task_id = p_task_id and work_date = p_date and revision = p_expected_revision
    returning * into v_slot;
    if not found then raise exception 'schedule_conflict' using errcode = '40001'; end if;
  end if;
  return jsonb_build_object('id', v_slot.id, 'taskId', v_slot.task_id, 'date', v_slot.work_date,
    'startMinute', v_slot.start_minute, 'endMinute', v_slot.end_minute, 'revision', v_slot.revision);
end;
$$;
revoke all on function public.save_task_day_slot(uuid,uuid,date,integer,integer,integer) from public, anon;
grant execute on function public.save_task_day_slot(uuid,uuid,date,integer,integer,integer) to authenticated;

create function public.remove_task_day_slot(p_id uuid, p_expected_revision integer)
returns boolean language plpgsql security invoker set search_path = '' as $$
begin
  if auth.uid() is null then raise exception 'schedule_access_denied' using errcode = '42501'; end if;
  delete from public.task_day_schedule where id = p_id and profile_id = auth.uid() and revision = p_expected_revision;
  if not found then raise exception 'schedule_conflict' using errcode = '40001'; end if;
  return true;
end;
$$;
revoke all on function public.remove_task_day_slot(uuid,integer) from public, anon;
grant execute on function public.remove_task_day_slot(uuid,integer) to authenticated;
