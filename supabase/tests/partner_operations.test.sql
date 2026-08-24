-- Executable KSP Network RLS regression.
-- Covers cross-partner denial, cross-vertical scope, response authorization and immediate offboarding.

insert into auth.users (id,email) values
 ('20000000-0000-0000-0000-000000000006','partner-a@test.invalid'),
 ('20000000-0000-0000-0000-000000000007','partner-b@test.invalid');
insert into public.profiles (id,display_name,email) values
 ('20000000-0000-0000-0000-000000000006','Partner A','partner-a@test.invalid'),
 ('20000000-0000-0000-0000-000000000007','Partner B','partner-b@test.invalid');

insert into public.business_units(id,organization_id,key,name,sort_order) values
 ('61000000-0000-0000-0000-000000000001','10000000-0000-0000-0000-000000000001','network-agency-test','Network Agency Test',30),
 ('61000000-0000-0000-0000-000000000002','10000000-0000-0000-0000-000000000001','network-dev-test','Network Dev Test',40);
insert into public.projects(id,organization_id,name,project_type,business_unit_id) values
 ('71000000-0000-0000-0000-000000000001','10000000-0000-0000-0000-000000000001','Agency Event','test','61000000-0000-0000-0000-000000000001'),
 ('71000000-0000-0000-0000-000000000002','10000000-0000-0000-0000-000000000001','Dev Build','test','61000000-0000-0000-0000-000000000002');
insert into public.partner_organizations(id,organization_id,business_unit_id,display_name,slug,created_by) values
 ('81000000-0000-0000-0000-000000000001','10000000-0000-0000-0000-000000000001','61000000-0000-0000-0000-000000000001','Partner Studio A','partner-a','20000000-0000-0000-0000-000000000001'),
 ('81000000-0000-0000-0000-000000000002','10000000-0000-0000-0000-000000000001','61000000-0000-0000-0000-000000000001','Partner Studio B','partner-b','20000000-0000-0000-0000-000000000001');
insert into public.partner_memberships(organization_id,partner_organization_id,profile_id,role,created_by) values
 ('10000000-0000-0000-0000-000000000001','81000000-0000-0000-0000-000000000001','20000000-0000-0000-0000-000000000006','partner_owner','20000000-0000-0000-0000-000000000001'),
 ('10000000-0000-0000-0000-000000000001','81000000-0000-0000-0000-000000000002','20000000-0000-0000-0000-000000000007','partner_owner','20000000-0000-0000-0000-000000000001');
insert into public.partner_assignments(id,organization_id,business_unit_id,project_id,partner_organization_id,title,created_by) values
 ('91000000-0000-0000-0000-000000000001','10000000-0000-0000-0000-000000000001','61000000-0000-0000-0000-000000000001','71000000-0000-0000-0000-000000000001','81000000-0000-0000-0000-000000000001','Event A','20000000-0000-0000-0000-000000000001'),
 ('91000000-0000-0000-0000-000000000002','10000000-0000-0000-0000-000000000001','61000000-0000-0000-0000-000000000001','71000000-0000-0000-0000-000000000001','81000000-0000-0000-0000-000000000002','Event B','20000000-0000-0000-0000-000000000001');

begin;
 set local role authenticated;
 select set_config('request.jwt.claim.sub','20000000-0000-0000-0000-000000000006',true);
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

-- Scope mismatch must fail closed even for privileged inserts.
do $$ begin
 begin
  insert into public.partner_assignments(organization_id,business_unit_id,project_id,partner_organization_id,title,created_by)
  values('10000000-0000-0000-0000-000000000001','61000000-0000-0000-0000-000000000002','71000000-0000-0000-0000-000000000002','81000000-0000-0000-0000-000000000001','Wrong vertical','20000000-0000-0000-0000-000000000001');
  raise exception 'cross-vertical assignment unexpectedly allowed';
 exception when others then
  if sqlerrm='cross-vertical assignment unexpectedly allowed' then raise; end if;
 end;
end $$;

update public.partner_memberships set suspended_at=now() where partner_organization_id='81000000-0000-0000-0000-000000000001' and profile_id='20000000-0000-0000-0000-000000000006';
begin;
 set local role authenticated;
 select set_config('request.jwt.claim.sub','20000000-0000-0000-0000-000000000006',true);
 do $$ declare c int; begin
  select count(*) into c from public.partner_assignments; if c<>0 then raise exception 'offboarding denial failed: %',c; end if;
 end $$;
rollback;
