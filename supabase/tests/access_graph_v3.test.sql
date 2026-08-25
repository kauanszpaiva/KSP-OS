-- Access Graph v3 executable actor matrix.
-- Proves that a cross-business-unit assignment or authorized @mention exposes
-- only the exact task resource, never the parent project, sibling tasks, or a
-- recursive fan-out to a third internal identity.

begin;

insert into public.organizations (id, name, slug)
values ('c0000000-0000-0000-0000-000000000001', 'Access Graph V3 CI', 'access-graph-v3-ci');

insert into auth.users (id, email) values
  ('c1000000-0000-0000-0000-000000000001', 'owner-v3-ci@test.invalid'),
  ('c1000000-0000-0000-0000-000000000002', 'dev-v3-ci@test.invalid'),
  ('c1000000-0000-0000-0000-000000000003', 'third-v3-ci@test.invalid');

insert into public.profiles (id, display_name, email) values
  ('c1000000-0000-0000-0000-000000000001', 'Owner V3 CI', 'owner-v3-ci@test.invalid'),
  ('c1000000-0000-0000-0000-000000000002', 'Dev V3 CI', 'dev-v3-ci@test.invalid'),
  ('c1000000-0000-0000-0000-000000000003', 'Third V3 CI', 'third-v3-ci@test.invalid');

insert into public.organization_memberships (
  organization_id,
  profile_id,
  role,
  internal_role,
  scope
) values
  ('c0000000-0000-0000-0000-000000000001', 'c1000000-0000-0000-0000-000000000001', 'founder_ceo', 'founder_ceo', 'all'),
  ('c0000000-0000-0000-0000-000000000001', 'c1000000-0000-0000-0000-000000000002', 'developer', 'developer', 'assigned'),
  ('c0000000-0000-0000-0000-000000000001', 'c1000000-0000-0000-0000-000000000003', 'designer', 'designer', 'assigned');

insert into public.business_units (id, organization_id, key, name, sort_order) values
  ('c2000000-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-000000000001', 'dev-v3-ci', 'KSP Dev V3 CI', 10),
  ('c2000000-0000-0000-0000-000000000002', 'c0000000-0000-0000-0000-000000000001', 'agency-v3-ci', 'KSP Agency V3 CI', 20);

insert into public.business_unit_memberships (
  organization_id,
  business_unit_id,
  profile_id,
  access_level,
  granted_by
) values (
  'c0000000-0000-0000-0000-000000000001',
  'c2000000-0000-0000-0000-000000000001',
  'c1000000-0000-0000-0000-000000000002',
  'member',
  'c1000000-0000-0000-0000-000000000001'
);

insert into public.projects (id, organization_id, name, project_type, business_unit_id) values
  ('c3000000-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-000000000001', 'Dev V3 CI Project', 'test', 'c2000000-0000-0000-0000-000000000001'),
  ('c3000000-0000-0000-0000-000000000002', 'c0000000-0000-0000-0000-000000000001', 'Agency V3 CI Project', 'test', 'c2000000-0000-0000-0000-000000000002');

insert into public.project_memberships (organization_id, project_id, profile_id, role) values (
  'c0000000-0000-0000-0000-000000000001',
  'c3000000-0000-0000-0000-000000000001',
  'c1000000-0000-0000-0000-000000000002',
  'developer'
);

insert into public.tasks (id, organization_id, project_id, owner_id, title) values
  ('c4000000-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-000000000001', 'c3000000-0000-0000-0000-000000000002', 'c1000000-0000-0000-0000-000000000002', 'Agency assigned exact task'),
  ('c4000000-0000-0000-0000-000000000002', 'c0000000-0000-0000-0000-000000000001', 'c3000000-0000-0000-0000-000000000002', 'c1000000-0000-0000-0000-000000000001', 'Agency mentioned exact task'),
  ('c4000000-0000-0000-0000-000000000003', 'c0000000-0000-0000-0000-000000000001', 'c3000000-0000-0000-0000-000000000002', 'c1000000-0000-0000-0000-000000000001', 'Agency sibling hidden task');

-- The global owner has canonical project authority and may intentionally mention
-- a Dev-only internal user into one Agency task.
set local role authenticated;
select set_config('request.jwt.claim.sub', 'c1000000-0000-0000-0000-000000000001', true);
insert into public.comments (
  organization_id,
  object_table,
  object_id,
  author_id,
  body,
  mentions
) values (
  'c0000000-0000-0000-0000-000000000001',
  'tasks',
  'c4000000-0000-0000-0000-000000000002',
  'c1000000-0000-0000-0000-000000000001',
  '@Dev V3 CI inspect this exact task',
  array['c1000000-0000-0000-0000-000000000002'::uuid]
);
reset role;

-- Dev-only user sees assigned + mentioned Agency tasks, but no Agency project or
-- sibling task. Mention access is comment-capable but cannot mutate the task.
set local role authenticated;
select set_config('request.jwt.claim.sub', 'c1000000-0000-0000-0000-000000000002', true);
do $$
declare
  c int;
begin
  if public.can_access_project('c3000000-0000-0000-0000-000000000002') then
    raise exception 'cross-project denial failed: Dev-only user gained Agency project access';
  end if;

  select count(*) into c
  from public.projects
  where id = 'c3000000-0000-0000-0000-000000000002';
  if c <> 0 then
    raise exception 'Agency project leaked through exact-task resource window: %', c;
  end if;

  select count(*) into c
  from public.tasks
  where project_id = 'c3000000-0000-0000-0000-000000000002';
  if c <> 2 then
    raise exception 'expected assigned + mentioned exact Agency tasks, got %', c;
  end if;

  select count(*) into c
  from public.tasks
  where id = 'c4000000-0000-0000-0000-000000000003';
  if c <> 0 then
    raise exception 'Agency sibling task leaked: %', c;
  end if;

  select count(*) into c
  from public.comments
  where object_table = 'tasks'
    and object_id = 'c4000000-0000-0000-0000-000000000002';
  if c <> 1 then
    raise exception 'mention recipient could not read exact task thread';
  end if;

  with changed as (
    update public.tasks
    set title = 'must not mutate via mention'
    where id = 'c4000000-0000-0000-0000-000000000002'
    returning 1
  )
  select count(*) into c from changed;
  if c <> 0 then
    raise exception 'mention-only recipient mutated exact task: %', c;
  end if;
end $$;

insert into public.comments (
  organization_id,
  object_table,
  object_id,
  author_id,
  body,
  mentions
) values (
  'c0000000-0000-0000-0000-000000000001',
  'tasks',
  'c4000000-0000-0000-0000-000000000002',
  'c1000000-0000-0000-0000-000000000002',
  '@Third V3 CI FYI',
  array['c1000000-0000-0000-0000-000000000003'::uuid]
);
reset role;

-- A user who only has the mention resource window cannot recursively share it.
set local role authenticated;
select set_config('request.jwt.claim.sub', 'c1000000-0000-0000-0000-000000000003', true);
do $$
declare c int;
begin
  select count(*) into c
  from public.tasks
  where id = 'c4000000-0000-0000-0000-000000000002';
  if c <> 0 then
    raise exception 'mention fan-out exposed exact task to third identity: %', c;
  end if;
end $$;
reset role;

-- Owner revocation removes the mention-only window but does not remove the direct
-- assignment window from the separate assigned Agency task.
set local role authenticated;
select set_config('request.jwt.claim.sub', 'c1000000-0000-0000-0000-000000000001', true);
update public.task_access_grants
set revoked_at = now(), updated_at = now()
where task_id = 'c4000000-0000-0000-0000-000000000002'
  and profile_id = 'c1000000-0000-0000-0000-000000000002'
  and reason = 'mention';
reset role;

set local role authenticated;
select set_config('request.jwt.claim.sub', 'c1000000-0000-0000-0000-000000000002', true);
do $$
declare c int;
begin
  select count(*) into c from public.tasks
  where id = 'c4000000-0000-0000-0000-000000000002';
  if c <> 0 then
    raise exception 'revoked mention still exposes task: %', c;
  end if;

  select count(*) into c from public.tasks
  where id = 'c4000000-0000-0000-0000-000000000001';
  if c <> 1 then
    raise exception 'direct cross-unit assignee lost exact task after mention revoke';
  end if;
end $$;
reset role;

rollback;
