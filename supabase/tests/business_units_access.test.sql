-- Executable business-unit RLS regression. The Docker DB harness applies the
-- full migration chain and seeds the shared actor fixtures before running this.

insert into public.business_units (id, organization_id, key, name, sort_order) values
  ('60000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', 'dominion-test', 'Dominion Test', 10),
  ('60000000-0000-0000-0000-000000000002', '10000000-0000-0000-0000-000000000001', 'agency-test', 'Agency Test', 20),
  ('60000000-0000-0000-0000-000000000003', '10000000-0000-0000-0000-000000000002', 'other-test', 'Other Test', 10);

insert into public.projects (id, organization_id, name, project_type, business_unit_id) values
  ('70000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', 'Dominion Classified', 'test', '60000000-0000-0000-0000-000000000001'),
  ('70000000-0000-0000-0000-000000000002', '10000000-0000-0000-0000-000000000001', 'Agency Classified', 'test', '60000000-0000-0000-0000-000000000002'),
  ('70000000-0000-0000-0000-000000000003', '10000000-0000-0000-0000-000000000001', 'Legacy Unclassified', 'test', null);

insert into public.project_memberships (organization_id, project_id, profile_id, role) values
  ('10000000-0000-0000-0000-000000000001', '70000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000002', 'developer'),
  ('10000000-0000-0000-0000-000000000001', '70000000-0000-0000-0000-000000000002', '20000000-0000-0000-0000-000000000002', 'developer'),
  ('10000000-0000-0000-0000-000000000001', '70000000-0000-0000-0000-000000000003', '20000000-0000-0000-0000-000000000002', 'developer');

-- The project-membership trigger inherited both units. Remove Agency explicitly
-- to model a Dominion-only person who still has a stale Agency project row.
delete from public.business_unit_memberships
where business_unit_id='60000000-0000-0000-0000-000000000002'
  and profile_id='20000000-0000-0000-0000-000000000002';

insert into public.tasks (organization_id, project_id, owner_id, title) values
  ('10000000-0000-0000-0000-000000000001', '70000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000002', 'Dominion child'),
  ('10000000-0000-0000-0000-000000000001', '70000000-0000-0000-0000-000000000002', '20000000-0000-0000-0000-000000000002', 'Agency child');

begin;
  set local role authenticated;
  select set_config('request.jwt.claim.sub', '20000000-0000-0000-0000-000000000002', true);
  do $$ declare c int; begin
    select count(*) into c from business_units; if c <> 1 then raise exception 'member unit isolation failed: %', c; end if;
    if not can_access_project('70000000-0000-0000-0000-000000000001') then raise exception 'Dominion project denied'; end if;
    if can_access_project('70000000-0000-0000-0000-000000000002') then raise exception 'Agency project allowed'; end if;
    if not can_access_project('70000000-0000-0000-0000-000000000003') then raise exception 'legacy project compatibility denied'; end if;
    select count(*) into c from tasks where project_id in ('70000000-0000-0000-0000-000000000001'::uuid, '70000000-0000-0000-0000-000000000002'::uuid);
    if c <> 1 then raise exception 'project-child division boundary failed: %', c; end if;
  end $$;
rollback;

update public.business_unit_memberships set suspended_at=now()
where business_unit_id='60000000-0000-0000-0000-000000000001' and profile_id='20000000-0000-0000-0000-000000000002';

begin;
  set local role authenticated;
  select set_config('request.jwt.claim.sub', '20000000-0000-0000-0000-000000000002', true);
  do $$ declare c int; begin
    if can_access_project('70000000-0000-0000-0000-000000000001') then raise exception 'revoked division still authorizes project'; end if;
    select count(*) into c from tasks where project_id='70000000-0000-0000-0000-000000000001';
    if c <> 0 then raise exception 'revoked division still exposes child rows'; end if;
  end $$;
rollback;

do $$ begin
  begin
    update public.projects set business_unit_id='60000000-0000-0000-0000-000000000003'
    where id='70000000-0000-0000-0000-000000000003';
    raise exception 'cross-organization project classification was accepted';
  exception when foreign_key_violation then null; end;
end $$;

update public.projects set business_unit_id='60000000-0000-0000-0000-000000000001'
where id='70000000-0000-0000-0000-000000000003';

do $$ declare c int; begin
  select count(*) into c from public.business_unit_memberships
  where business_unit_id='60000000-0000-0000-0000-000000000001'
    and profile_id='20000000-0000-0000-0000-000000000002'
    and suspended_at is null;
  if c <> 1 then raise exception 'classification inheritance did not reactivate unit membership'; end if;
end $$;
