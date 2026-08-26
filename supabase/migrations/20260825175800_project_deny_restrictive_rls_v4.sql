-- Authority Engine V4 — project deny bridge for legacy RLS.
--
-- Existing KSP OS tables use several historical allow policies. Postgres
-- permissive policies combine with OR, so adding another ordinary deny-aware
-- allow policy would not prevent a legacy allow from winning. RESTRICTIVE
-- policies combine with AND and therefore form the correct compatibility bridge.
--
-- This migration adds project.read/project.manage deny precedence to every
-- CURRENT public project-scoped table that already has RLS enabled. Fine-grained
-- resource/action denies continue to be enforced by action-specific V4 policies
-- and RPCs; this bridge guarantees the project-level boundary cannot be bypassed
-- by calling a legacy table directly.

create or replace function authority_private.project_action_not_denied(
  p_project_id uuid,
  p_action public.permission_action
)
returns boolean
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_org uuid;
begin
  if auth.uid() is null then return false; end if;

  select p.organization_id into v_org
  from public.projects p
  where p.id = p_project_id;

  if v_org is null then return false; end if;

  return not authority_private.has_active_explicit_deny(
    v_org,
    p_action,
    'project',
    p_project_id
  );
end;
$$;

revoke all on function authority_private.project_action_not_denied(uuid,public.permission_action) from public, anon;
grant execute on function authority_private.project_action_not_denied(uuid,public.permission_action) to authenticated;

-- Projects itself uses id rather than project_id.
drop policy if exists authority_v4_project_read_deny on public.projects;
create policy authority_v4_project_read_deny
on public.projects
as restrictive
for select
to authenticated
using (
  authority_private.project_action_not_denied(
    id,
    'project.read'::public.permission_action
  )
);

drop policy if exists authority_v4_project_update_deny on public.projects;
create policy authority_v4_project_update_deny
on public.projects
as restrictive
for update
to authenticated
using (
  authority_private.project_action_not_denied(
    id,
    'project.manage'::public.permission_action
  )
)
with check (
  authority_private.project_action_not_denied(
    id,
    'project.manage'::public.permission_action
  )
);

drop policy if exists authority_v4_project_delete_deny on public.projects;
create policy authority_v4_project_delete_deny
on public.projects
as restrictive
for delete
to authenticated
using (
  authority_private.project_action_not_denied(
    id,
    'project.manage'::public.permission_action
  )
);

-- Add compatibility guards to all other current RLS-enabled project tables.
do $do$
declare
  r record;
  qtable text;
begin
  for r in
    select c.table_schema, c.table_name
    from information_schema.columns c
    join pg_class pc on pc.relname = c.table_name
    join pg_namespace pn on pn.oid = pc.relnamespace and pn.nspname = c.table_schema
    where c.table_schema = 'public'
      and c.column_name = 'project_id'
      and c.udt_name = 'uuid'
      and pc.relkind in ('r','p')
      and pc.relrowsecurity
      and c.table_name <> 'projects'
    group by c.table_schema, c.table_name
    order by c.table_name
  loop
    qtable := format('%I.%I', r.table_schema, r.table_name);

    execute format('drop policy if exists authority_v4_project_read_deny on %s', qtable);
    execute format(
      'create policy authority_v4_project_read_deny on %s as restrictive for select to authenticated using (authority_private.project_action_not_denied(project_id, %L::public.permission_action))',
      qtable,
      'project.read'
    );

    execute format('drop policy if exists authority_v4_project_insert_deny on %s', qtable);
    execute format(
      'create policy authority_v4_project_insert_deny on %s as restrictive for insert to authenticated with check (authority_private.project_action_not_denied(project_id, %L::public.permission_action))',
      qtable,
      'project.manage'
    );

    execute format('drop policy if exists authority_v4_project_update_deny on %s', qtable);
    execute format(
      'create policy authority_v4_project_update_deny on %s as restrictive for update to authenticated using (authority_private.project_action_not_denied(project_id, %L::public.permission_action)) with check (authority_private.project_action_not_denied(project_id, %L::public.permission_action))',
      qtable,
      'project.manage',
      'project.manage'
    );

    execute format('drop policy if exists authority_v4_project_delete_deny on %s', qtable);
    execute format(
      'create policy authority_v4_project_delete_deny on %s as restrictive for delete to authenticated using (authority_private.project_action_not_denied(project_id, %L::public.permission_action))',
      qtable,
      'project.manage'
    );
  end loop;
end
$do$;

comment on function authority_private.project_action_not_denied(uuid,public.permission_action) is
  'Compatibility bridge used by restrictive RLS: an active project-scoped explicit deny blocks legacy permissive project policies.';
