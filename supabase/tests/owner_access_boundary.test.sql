-- Issue #142 executable RLS matrix for temporary_access_grants.
-- Run after the repository migration chain. All fixtures roll back.

-- The final lineage must have one canonical SELECT/INSERT/UPDATE set and no
-- DELETE policy. This catches permissive-policy accumulation across migrations.
do $$ declare c int; begin
  select count(*) into c
  from pg_policies
  where schemaname='public'
    and tablename='temporary_access_grants'
    and cmd='DELETE';
  if c<>0 then raise exception 'temporary access DELETE policy still exists: %',c; end if;

  select count(*) into c
  from pg_policies
  where schemaname='public'
    and tablename='temporary_access_grants';
  if c<>3 then raise exception 'temporary access policy set is not canonical: %',c; end if;
end $$;

begin;

insert into public.organizations(id,name,slug) values
 ('e0000000-0000-0000-0000-000000000001','Owner Boundary Matrix A','owner-boundary-matrix-a'),
 ('e0000000-0000-0000-0000-000000000002','Owner Boundary Matrix B','owner-boundary-matrix-b');

insert into auth.users(id,email) values
 ('e1000000-0000-0000-0000-000000000001','founder-matrix@test.invalid'),
 ('e1000000-0000-0000-0000-000000000002','exec-matrix@test.invalid'),
 ('e1000000-0000-0000-0000-000000000003','member-matrix@test.invalid'),
 ('e1000000-0000-0000-0000-000000000004','other-founder-matrix@test.invalid');

insert into public.profiles(id,display_name,email) values
 ('e1000000-0000-0000-0000-000000000001','Founder Matrix','founder-matrix@test.invalid'),
 ('e1000000-0000-0000-0000-000000000002','Executive Matrix','exec-matrix@test.invalid'),
 ('e1000000-0000-0000-0000-000000000003','Member Matrix','member-matrix@test.invalid'),
 ('e1000000-0000-0000-0000-000000000004','Other Founder Matrix','other-founder-matrix@test.invalid')
on conflict (id) do update
set display_name = excluded.display_name,
    email = excluded.email;

insert into public.organization_memberships(organization_id,profile_id,role,internal_role,scope) values
 ('e0000000-0000-0000-0000-000000000001','e1000000-0000-0000-0000-000000000001','founder_ceo','founder_ceo','all'),
 ('e0000000-0000-0000-0000-000000000001','e1000000-0000-0000-0000-000000000002','executive_operations','executive_operations','all'),
 ('e0000000-0000-0000-0000-000000000001','e1000000-0000-0000-0000-000000000003','developer','developer','assigned'),
 ('e0000000-0000-0000-0000-000000000002','e1000000-0000-0000-0000-000000000004','founder_ceo','founder_ceo','all');

-- founder_ceo allowed
set local role authenticated;
select set_config('request.jwt.claim.sub','e1000000-0000-0000-0000-000000000001',true);
insert into public.temporary_access_grants(id,organization_id,profile_id,action,resource_type,resource_id,effective_until,created_by)
values('e2000000-0000-0000-0000-000000000001','e0000000-0000-0000-0000-000000000001','e1000000-0000-0000-0000-000000000003','project.read','project','e3000000-0000-0000-0000-000000000001',now()+interval '2 hours','e1000000-0000-0000-0000-000000000001');

-- Even an owner cannot hard-delete access history.
do $$ declare c int; begin
 with deleted as (
  delete from public.temporary_access_grants
  where id='e2000000-0000-0000-0000-000000000001'
  returning 1
 ) select count(*) into c from deleted;
 if c<>0 then raise exception 'owner hard-delete unexpectedly allowed: %',c; end if;
end $$;
reset role;

-- executive_operations allowed
set local role authenticated;
select set_config('request.jwt.claim.sub','e1000000-0000-0000-0000-000000000002',true);
insert into public.temporary_access_grants(id,organization_id,profile_id,action,resource_type,resource_id,effective_until,created_by)
values('e2000000-0000-0000-0000-000000000002','e0000000-0000-0000-0000-000000000001','e1000000-0000-0000-0000-000000000003','project.manage','project','e3000000-0000-0000-0000-000000000002',now()+interval '2 hours','e1000000-0000-0000-0000-000000000002');
reset role;

-- normal internal member denied mutation
set local role authenticated;
select set_config('request.jwt.claim.sub','e1000000-0000-0000-0000-000000000003',true);
do $$ begin
 begin
  insert into public.temporary_access_grants(organization_id,profile_id,action,resource_type,resource_id,effective_until,created_by)
  values('e0000000-0000-0000-0000-000000000001','e1000000-0000-0000-0000-000000000003','project.read','project','e3000000-0000-0000-0000-000000000003',now()+interval '1 hour','e1000000-0000-0000-0000-000000000003');
  raise exception 'normal internal member mutation unexpectedly allowed';
 exception when insufficient_privilege then null; end;
end $$;
reset role;

-- cross-organization owner cannot update rows in another organization
set local role authenticated;
select set_config('request.jwt.claim.sub','e1000000-0000-0000-0000-000000000004',true);
do $$ declare c int; begin
 with changed as (
  update public.temporary_access_grants set revoked_at=now()
  where id='e2000000-0000-0000-0000-000000000001'
  returning 1
 ) select count(*) into c from changed;
 if c<>0 then raise exception 'cross-organization mutation allowed: %',c; end if;
end $$;
reset role;

-- Convert one row to a valid expired window and revoke the other.
set local role authenticated;
select set_config('request.jwt.claim.sub','e1000000-0000-0000-0000-000000000001',true);
update public.temporary_access_grants
set effective_from=now()-interval '2 hours', effective_until=now()-interval '1 hour'
where id='e2000000-0000-0000-0000-000000000001';
update public.temporary_access_grants set revoked_at=now()
where id='e2000000-0000-0000-0000-000000000002';
reset role;

-- Recipient retains historical read evidence, but the exact getAuthContext
-- effectiveness predicate resolves neither expired nor revoked grant.
set local role authenticated;
select set_config('request.jwt.claim.sub','e1000000-0000-0000-0000-000000000003',true);
do $$ declare visible_count int; effective_count int; begin
 select count(*) into visible_count from public.temporary_access_grants
 where profile_id='e1000000-0000-0000-0000-000000000003';
 if visible_count<>2 then raise exception 'historical read mismatch: %',visible_count; end if;

 select count(*) into effective_count from public.temporary_access_grants
 where organization_id='e0000000-0000-0000-0000-000000000001'
   and profile_id='e1000000-0000-0000-0000-000000000003'
   and revoked_at is null
   and effective_from<=now()
   and effective_until>now();
 if effective_count<>0 then raise exception 'revoked/expired grant remained effective: %',effective_count; end if;
end $$;
reset role;

rollback;
