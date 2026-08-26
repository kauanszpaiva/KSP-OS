-- Authority Engine V4 compatibility repair for nullable project scopes.
--
-- The restrictive project-deny bridge must only evaluate a project-level deny
-- when a row actually belongs to a project. Rows whose project_id is NULL are
-- still governed by their existing organization/client/resource policies.
-- Requiring project_action_not_denied(NULL, ...) incorrectly hides otherwise
-- authorized client-scoped resources such as projectless documents.
--
-- Production may intentionally lag the Authority Engine V4 source migration.
-- In that state this migration must be a no-op rather than silently forcing the
-- Authority Engine dependency into the AI Company release.

do $do$
declare
  r record;
  qtable text;
begin
  if to_regprocedure('authority_private.project_action_not_denied(uuid,public.permission_action)') is null then
    return;
  end if;

  for r in
    select c.table_schema, c.table_name
    from information_schema.columns c
    join pg_class pc on pc.relname = c.table_name
    join pg_namespace pn on pn.oid = pc.relnamespace and pn.nspname = c.table_schema
    where c.table_schema = 'public'
      and c.column_name = 'project_id'
      and c.udt_name = 'uuid'
      and c.is_nullable = 'YES'
      and pc.relkind in ('r','p')
      and pc.relrowsecurity
      and c.table_name <> 'projects'
    group by c.table_schema, c.table_name
    order by c.table_name
  loop
    qtable := format('%I.%I', r.table_schema, r.table_name);

    execute format('drop policy if exists authority_v4_project_read_deny on %s', qtable);
    execute format(
      'create policy authority_v4_project_read_deny on %s as restrictive for select to authenticated using (project_id is null or authority_private.project_action_not_denied(project_id, %L::public.permission_action))',
      qtable,
      'project.read'
    );

    execute format('drop policy if exists authority_v4_project_insert_deny on %s', qtable);
    execute format(
      'create policy authority_v4_project_insert_deny on %s as restrictive for insert to authenticated with check (project_id is null or authority_private.project_action_not_denied(project_id, %L::public.permission_action))',
      qtable,
      'project.manage'
    );

    execute format('drop policy if exists authority_v4_project_update_deny on %s', qtable);
    execute format(
      'create policy authority_v4_project_update_deny on %s as restrictive for update to authenticated using (project_id is null or authority_private.project_action_not_denied(project_id, %L::public.permission_action)) with check (project_id is null or authority_private.project_action_not_denied(project_id, %L::public.permission_action))',
      qtable,
      'project.manage',
      'project.manage'
    );

    execute format('drop policy if exists authority_v4_project_delete_deny on %s', qtable);
    execute format(
      'create policy authority_v4_project_delete_deny on %s as restrictive for delete to authenticated using (project_id is null or authority_private.project_action_not_denied(project_id, %L::public.permission_action))',
      qtable,
      'project.manage'
    );
  end loop;
end
$do$;
