-- A signed-in profile without an active organization membership must not retain
-- notification content solely because recipient_id matches auth.uid().

begin;

insert into public.organizations(id,name,slug)
values('f0000000-0000-0000-0000-000000000001','Suspended Notification Test','suspended-notification-test');

insert into auth.users(id,email) values
 ('f1000000-0000-0000-0000-000000000001','owner-notification@test.invalid'),
 ('f1000000-0000-0000-0000-000000000002','member-notification@test.invalid');

insert into public.profiles(id,display_name,email) values
 ('f1000000-0000-0000-0000-000000000001','Owner Notification','owner-notification@test.invalid'),
 ('f1000000-0000-0000-0000-000000000002','Member Notification','member-notification@test.invalid')
on conflict (id) do update
set display_name = excluded.display_name,
    email = excluded.email;

insert into public.organization_memberships(organization_id,profile_id,role,internal_role,scope) values
 ('f0000000-0000-0000-0000-000000000001','f1000000-0000-0000-0000-000000000001','founder_ceo','founder_ceo','all'),
 ('f0000000-0000-0000-0000-000000000001','f1000000-0000-0000-0000-000000000002','developer','developer','assigned');

set local role authenticated;
select set_config('request.jwt.claim.sub','f1000000-0000-0000-0000-000000000001',true);
insert into public.notifications(
 organization_id,recipient_id,actor_id,verb,object_table,summary,link
) values(
 'f0000000-0000-0000-0000-000000000001',
 'f1000000-0000-0000-0000-000000000002',
 'f1000000-0000-0000-0000-000000000001',
 'task.assigned','tasks','Sensitive task title','/workspace'
);
reset role;

set local role authenticated;
select set_config('request.jwt.claim.sub','f1000000-0000-0000-0000-000000000002',true);
do $$ declare c int; begin
 select count(*) into c from public.notifications;
 if c<>1 then raise exception 'active recipient cannot read own notification: %',c; end if;
 with changed as (
   update public.notifications set read_at=now() returning 1
 ) select count(*) into c from changed;
 if c<>1 then raise exception 'active recipient cannot mark notification read: %',c; end if;
end $$;
reset role;

update public.organization_memberships
set suspended_at=now()
where organization_id='f0000000-0000-0000-0000-000000000001'
 and profile_id='f1000000-0000-0000-0000-000000000002';

set local role authenticated;
select set_config('request.jwt.claim.sub','f1000000-0000-0000-0000-000000000002',true);
do $$ declare c int; begin
 select count(*) into c from public.notifications;
 if c<>0 then raise exception 'suspended recipient still reads notification content: %',c; end if;
 with changed as (
   update public.notifications set read_at=null returning 1
 ) select count(*) into c from changed;
 if c<>0 then raise exception 'suspended recipient still mutates notification: %',c; end if;
end $$;
reset role;

rollback;