-- Synthetic actor tests only. No external mail or hosted database is used.
begin;
insert into public.organizations(id,name,slug) values
 ('d1000000-0000-4000-8000-000000000001','Day planner CI','day-planner-ci'),
 ('d1000000-0000-4000-8000-000000000002','Foreign day CI','foreign-day-ci');
insert into auth.users(id,email) values
 ('d2000000-0000-4000-8000-000000000001','day-owner@test.invalid'),
 ('d2000000-0000-4000-8000-000000000002','day-peer@test.invalid'),
 ('d2000000-0000-4000-8000-000000000003','day-outsider@test.invalid');
insert into public.profiles(id,display_name,email) values
 ('d2000000-0000-4000-8000-000000000001','Day Owner','day-owner@test.invalid'),
 ('d2000000-0000-4000-8000-000000000002','Day Peer','day-peer@test.invalid'),
 ('d2000000-0000-4000-8000-000000000003','Day Outsider','day-outsider@test.invalid')
on conflict(id) do update set display_name=excluded.display_name;
insert into public.organization_memberships(organization_id,profile_id,role,internal_role,scope) values
 ('d1000000-0000-4000-8000-000000000001','d2000000-0000-4000-8000-000000000001','founder_ceo','founder_ceo','all'),
 ('d1000000-0000-4000-8000-000000000001','d2000000-0000-4000-8000-000000000002','founder_ceo','founder_ceo','all');
insert into public.projects(id,organization_id,name,project_type,status) values
 ('d3000000-0000-4000-8000-000000000001','d1000000-0000-4000-8000-000000000001','Planner project','internal','active'),
 ('d3000000-0000-4000-8000-000000000002','d1000000-0000-4000-8000-000000000002','Foreign project','internal','active');
insert into public.tasks(id,organization_id,project_id,title,status,owner_id,due_date) values
 ('d4000000-0000-4000-8000-000000000001','d1000000-0000-4000-8000-000000000001','d3000000-0000-4000-8000-000000000001','Day task','active','d2000000-0000-4000-8000-000000000001','2026-10-01'),
 ('d4000000-0000-4000-8000-000000000002','d1000000-0000-4000-8000-000000000002','d3000000-0000-4000-8000-000000000002','Foreign task','active','d2000000-0000-4000-8000-000000000003','2026-10-01');
set local role authenticated;
select set_config('request.jwt.claim.sub','d2000000-0000-4000-8000-000000000001',true);
select public.save_task_day_slot('d5000000-0000-4000-8000-000000000001','d4000000-0000-4000-8000-000000000001','2026-09-23',540,600,0);
select public.save_task_day_slot('d5000000-0000-4000-8000-000000000001','d4000000-0000-4000-8000-000000000001','2026-09-23',555,615,1);
do $$ begin
 if (select revision from public.task_day_schedule where id='d5000000-0000-4000-8000-000000000001') <> 2 then raise exception 'revision failed'; end if;
 if (select due_date from public.tasks where id='d4000000-0000-4000-8000-000000000001') <> date '2026-10-01' then raise exception 'deadline changed'; end if;
 begin
  perform public.save_task_day_slot('d5000000-0000-4000-8000-000000000001','d4000000-0000-4000-8000-000000000001','2026-09-23',570,630,1);
  raise exception 'stale revision accepted';
 exception when serialization_failure then null; end;
 begin
  perform public.save_task_day_slot('d5000000-0000-4000-8000-000000000002','d4000000-0000-4000-8000-000000000001','2026-09-23',600,660,0);
  raise exception 'overlap accepted';
 exception when exclusion_violation then null; end;
 begin
  perform public.save_task_day_slot('d5000000-0000-4000-8000-000000000003','d4000000-0000-4000-8000-000000000002','2026-09-23',900,960,0);
  raise exception 'foreign task accepted';
 exception when insufficient_privilege then null; end;
 begin
  insert into public.task_day_schedule(organization_id,profile_id,task_id,work_date,start_minute,end_minute)
  values ('d1000000-0000-4000-8000-000000000001','d2000000-0000-4000-8000-000000000002','d4000000-0000-4000-8000-000000000001','2026-09-23',900,960);
  raise exception 'spoofed owner accepted';
 exception when insufficient_privilege then null; end;
 begin
  update public.task_day_schedule set task_id='d4000000-0000-4000-8000-000000000002' where id='d5000000-0000-4000-8000-000000000001';
  raise exception 'scope replacement accepted';
 exception when check_violation then null; end;
end $$;
select set_config('request.jwt.claim.sub','d2000000-0000-4000-8000-000000000002',true);
do $$ begin
 if exists(select 1 from public.task_day_schedule) then raise exception 'peer saw private schedule'; end if;
 begin
  perform public.remove_task_day_slot('d5000000-0000-4000-8000-000000000001',2);
  raise exception 'peer deleted schedule';
 exception when serialization_failure then null; end;
end $$;
select set_config('request.jwt.claim.sub','d2000000-0000-4000-8000-000000000003',true);
do $$ begin
 begin
  perform public.save_task_day_slot('d5000000-0000-4000-8000-000000000003','d4000000-0000-4000-8000-000000000001','2026-09-23',900,960,0);
  raise exception 'outsider scheduled';
 exception when insufficient_privilege then null; end;
end $$;
select set_config('request.jwt.claim.sub','d2000000-0000-4000-8000-000000000001',true);
select public.remove_task_day_slot('d5000000-0000-4000-8000-000000000001',2);
reset role;
do $$ begin
 if (select count(*) from public.audit_events where target_id='d5000000-0000-4000-8000-000000000001') <> 3 then raise exception 'schedule audit mismatch'; end if;
 if not exists(select 1 from public.tasks where id='d4000000-0000-4000-8000-000000000001') then raise exception 'unschedule deleted task'; end if;
end $$;
rollback;
