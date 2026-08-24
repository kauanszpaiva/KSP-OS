-- Executable business-unit RLS regression. The Docker DB harness applies the
-- full migration chain and seeds the shared actor fixtures before running this.

insert into public.business_units (id, organization_id, key, name, sort_order) values
  ('60000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', 'dominion-test', 'Dominion Test', 10),
  ('60000000-0000-0000-0000-000000000002', '10000000-0000-0000-0000-000000000001', 'dev-test', 'KSP Dev Test', 20),
  ('60000000-0000-0000-0000-000000000004', '10000000-0000-0000-0000-000000000001', 'agency-test', 'Agency Test', 30),
  ('60000000-0000-0000-0000-000000000003', '10000000-0000-0000-0000-000000000002', 'other-test', 'Other Test', 10);

insert into auth.users (id, email) values
  ('20000000-0000-0000-0000-000000000006', 'operations-owner@test.invalid');

insert into public.profiles (id, display_name, email) values
  ('20000000-0000-0000-0000-000000000006', 'Operations Owner Test', 'operations-owner@test.invalid');

insert into public.organization_memberships (organization_id, profile_id, role, internal_role, scope) values
  ('10000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000006', 'executive_operations', 'executive_operations', 'all');

insert into public.projects (id, organization_id, name, project_type, business_unit_id) values
  ('70000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', 'Dominion Classified', 'test', '60000000-0000-0000-0000-000000000001'),
  ('70000000-0000-0000-0000-000000000002', '10000000-0000-0000-0000-000000000001', 'KSP Dev Classified', 'test', '60000000-0000-0000-0000-000000000002'),
  ('70000000-0000-0000-0000-000000000004', '10000000-0000-0000-0000-000000000001', 'Agency Classified', 'test', '60000000-0000-0000-0000-000000000004'),
  ('70000000-0000-0000-0000-000000000003', '10000000-0000-0000-0000-000000000001', 'Legacy Unclassified', 'test', null);

insert into public.project_memberships (organization_id, project_id, profile_id, role) values
  ('10000000-0000-0000-0000-000000000001', '70000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000002', 'developer'),
  ('10000000-0000-0000-0000-000000000001', '70000000-0000-0000-0000-000000000002', '20000000-0000-0000-0000-000000000002', 'developer'),
  ('10000000-0000-0000-0000-000000000001', '70000000-0000-0000-0000-000000000003', '20000000-0000-0000-0000-000000000002', 'developer');

-- The project-membership trigger inherited Dominion and KSP Dev. Remove KSP Dev
-- explicitly to model a Dominion-only person who still has a stale project row.
delete from public.business_unit_memberships
where business_unit_id='60000000-0000-0000-0000-000000000002'
  and profile_id='20000000-0000-0000-0000-000000000002';

insert into public.tasks (organization_id, project_id, owner_id, title) values
  ('10000000-0000-0000-0000-000000000001', '70000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000002', 'Dominion child'),
  ('10000000-0000-0000-0000-000000000001', '70000000-0000-0000-0000-000000000002', '20000000-0000-0000-0000-000000000002', 'KSP Dev child');

begin;
  set local role authenticated;
  select set_config('request.jwt.claim.sub', '20000000-0000-0000-0000-000000000002', true);
  do $$ declare c int; begin
    select count(*) into c from business_units; if c <> 1 then raise exception 'member unit isolation failed: %', c; end if;
    if not can_access_project('70000000-0000-0000-0000-000000000001') then raise exception 'Dominion project denied'; end if;
    if can_access_project('70000000-0000-0000-0000-000000000002') then raise exception 'KSP Dev project allowed'; end if;
    if not can_access_project('70000000-0000-0000-0000-000000000003') then raise exception 'legacy project compatibility denied'; end if;
    select count(*) into c from tasks where project_id in ('70000000-0000-0000-0000-000000000001'::uuid, '70000000-0000-0000-0000-000000000002'::uuid);
    if c <> 1 then raise exception 'project-child division boundary failed: %', c; end if;
  end $$;
rollback;

-- Both approved global-owner roles see every KSP operating unit without
-- business_unit_memberships rows. This is the database proof for Kauan + Vanessa.
begin;
  set local role authenticated;
  select set_config('request.jwt.claim.sub', '20000000-0000-0000-0000-000000000001', true);
  do $$ declare c int; begin
    select count(*) into c from business_units where organization_id='10000000-0000-0000-0000-000000000001';
    if c <> 3 then raise exception 'founder global unit visibility failed: %', c; end if;
  end $$;
rollback;

begin;
  set local role authenticated;
  select set_config('request.jwt.claim.sub', '20000000-0000-0000-0000-000000000006', true);
  do $$ declare c int; begin
    select count(*) into c from business_units where organization_id='10000000-0000-0000-0000-000000000001';
    if c <> 3 then raise exception 'operations owner global unit visibility failed: %', c; end if;
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

-- KSP Network negative-path coverage.
insert into auth.users (id,email) values
 ('20000000-0000-0000-0000-000000000008','partner-a@test.invalid'),
 ('20000000-0000-0000-0000-000000000009','partner-b@test.invalid');
insert into public.profiles (id,display_name,email) values
 ('20000000-0000-0000-0000-000000000008','Partner A','partner-a@test.invalid'),
 ('20000000-0000-0000-0000-000000000009','Partner B','partner-b@test.invalid');
insert into public.business_units(id,organization_id,key,name,sort_order) values
 ('61000000-0000-0000-0000-000000000001','10000000-0000-0000-0000-000000000001','network-agency-test','Network Agency Test',40),
 ('61000000-0000-0000-0000-000000000002','10000000-0000-0000-0000-000000000001','network-dev-test','Network Dev Test',50);
insert into public.projects(id,organization_id,name,project_type,business_unit_id) values
 ('71000000-0000-0000-0000-000000000001','10000000-0000-0000-0000-000000000001','Agency Event','test','61000000-0000-0000-0000-000000000001'),
 ('71000000-0000-0000-0000-000000000002','10000000-0000-0000-0000-000000000001','Dev Build','test','61000000-0000-0000-0000-000000000002');
insert into public.partner_organizations(id,organization_id,business_unit_id,display_name,slug,created_by) values
 ('81000000-0000-0000-0000-000000000001','10000000-0000-0000-0000-000000000001','61000000-0000-0000-0000-000000000001','Partner Studio A','partner-a','20000000-0000-0000-0000-000000000001'),
 ('81000000-0000-0000-0000-000000000002','10000000-0000-0000-0000-000000000001','61000000-0000-0000-0000-000000000001','Partner Studio B','partner-b','20000000-0000-0000-0000-000000000001');
insert into public.partner_memberships(organization_id,partner_organization_id,profile_id,role,created_by) values
 ('10000000-0000-0000-0000-000000000001','81000000-0000-0000-0000-000000000001','20000000-0000-0000-0000-000000000008','partner_owner','20000000-0000-0000-0000-000000000001'),
 ('10000000-0000-0000-0000-000000000001','81000000-0000-0000-0000-000000000002','20000000-0000-0000-0000-000000000009','partner_owner','20000000-0000-0000-0000-000000000001');
insert into public.partner_assignments(id,organization_id,business_unit_id,project_id,partner_organization_id,title,created_by) values
 ('91000000-0000-0000-0000-000000000001','10000000-0000-0000-0000-000000000001','61000000-0000-0000-0000-000000000001','71000000-0000-0000-0000-000000000001','81000000-0000-0000-0000-000000000001','Event A','20000000-0000-0000-0000-000000000001'),
 ('91000000-0000-0000-0000-000000000002','10000000-0000-0000-0000-000000000001','61000000-0000-0000-0000-000000000001','71000000-0000-0000-0000-000000000001','81000000-0000-0000-0000-000000000002','Event B','20000000-0000-0000-0000-000000000001');

begin;
 set local role authenticated;
 select set_config('request.jwt.claim.sub','20000000-0000-0000-0000-000000000008',true);
 do $$ declare c int; r text; begin
  select count(*) into c from public.partner_organizations; if c<>1 then raise exception 'cross-partner organization denial failed: %',c; end if;
  select count(*) into c from public.partner_assignments; if c<>1 then raise exception 'cross-partner assignment denial failed: %',c; end if;
  r:=public.respond_partner_assignment('91000000-0000-0000-0000-000000000001','accepted',null); if r<>'accepted' then raise exception 'assignment response failed'; end if;
  begin
    perform public.respond_partner_assignment('91000000-0000-0000-0000-000000000002','accepted',null);
    raise exception 'cross-partner response unexpectedly allowed';
  exception when others then
    if sqlerrm='cross-partner response unexpectedly allowed' then raise; end if;
  end;
 end $$;
rollback;

do $$ begin
 begin
  insert into public.partner_assignments(organization_id,business_unit_id,project_id,partner_organization_id,title,created_by)
  values('10000000-0000-0000-0000-000000000001','61000000-0000-0000-0000-000000000002','71000000-0000-0000-0000-000000000002','81000000-0000-0000-0000-000000000001','Wrong vertical','20000000-0000-0000-0000-000000000001');
  raise exception 'cross-vertical assignment unexpectedly allowed';
 exception when others then
  if sqlerrm='cross-vertical assignment unexpectedly allowed' then raise; end if;
 end;
end $$;

update public.partner_memberships set suspended_at=now() where partner_organization_id='81000000-0000-0000-0000-000000000001' and profile_id='20000000-0000-0000-0000-000000000008';
begin;
 set local role authenticated;
 select set_config('request.jwt.claim.sub','20000000-0000-0000-0000-000000000008',true);
 do $$ declare c int; begin
  select count(*) into c from public.partner_assignments; if c<>0 then raise exception 'offboarding denial failed: %',c; end if;
 end $$;
rollback;
