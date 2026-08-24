-- task-delivery evidence regression test.
-- Coverage: completion gate, authorized delivery, private file upload, path
-- tampering denial, append-only storage, immutable ready evidence, and
-- cross-organization denial.

insert into project_memberships (organization_id, project_id, profile_id, role)
values ('10000000-0000-0000-0000-000000000001', '40000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000002', 'developer')
on conflict (project_id, profile_id) do nothing;

insert into tasks (id, organization_id, project_id, owner_id, created_by, title, requires_delivery, status)
values
  ('70000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', '40000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000002', '20000000-0000-0000-0000-000000000001', 'external delivery task', true, 'active'),
  ('70000000-0000-0000-0000-000000000002', '10000000-0000-0000-0000-000000000001', '40000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000002', '20000000-0000-0000-0000-000000000001', 'file delivery task', true, 'active');

-- Delivery-required tasks cannot be completed before evidence is ready.
begin;
  set local role authenticated;
  select set_config('request.jwt.claim.sub', '20000000-0000-0000-0000-000000000002', true);
  do $$ begin
    begin
      update tasks set status='archived' where id='70000000-0000-0000-0000-000000000001'::uuid;
      raise exception 'delivery completion gate did not fire';
    exception when others then
      if sqlerrm not like '%task_delivery_required%' then raise; end if;
    end;
  end $$;
rollback;

-- The assigned owner cannot bypass the delivery gate by disabling a requirement
-- owned by a different creator. This matches the trigger's canonical error.
begin;
  set local role authenticated;
  select set_config('request.jwt.claim.sub', '20000000-0000-0000-0000-000000000002', true);
  do $$ begin
    begin
      update tasks set requires_delivery=false where id='70000000-0000-0000-0000-000000000001'::uuid;
      raise exception 'assigned owner disabled the delivery requirement';
    exception when others then
      if sqlerrm not like '%task_delivery_requirement_change_not_allowed%' then raise; end if;
    end;
  end $$;
rollback;

-- An assigned project member may add a ready external delivery and complete.
begin;
  set local role authenticated;
  select set_config('request.jwt.claim.sub', '20000000-0000-0000-0000-000000000002', true);
  insert into task_delivery_evidence (id, organization_id, task_id, submitted_by, kind, status, external_url)
  values ('71000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', '70000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000002', 'external_url', 'ready', 'https://drive.google.com/example');
  update tasks set status='archived' where id='70000000-0000-0000-0000-000000000001'::uuid;
  do $$ declare c int; done_at timestamptz; begin
    select count(*) into c from task_delivery_evidence where id='71000000-0000-0000-0000-000000000001'::uuid;
    if c <> 1 then raise exception 'authorized external delivery insert denied'; end if;
    select completed_at into done_at from tasks where id='70000000-0000-0000-0000-000000000001'::uuid;
    if done_at is null then raise exception 'completed_at not set'; end if;
  end $$;
rollback;

-- A pending private file may upload only to its exact canonical path, then be
-- finalized once. Storage remains append-only.
begin;
  set local role authenticated;
  select set_config('request.jwt.claim.sub', '20000000-0000-0000-0000-000000000002', true);
  insert into task_delivery_evidence (
    id, organization_id, task_id, submitted_by, kind, status, storage_path, original_filename, mime_type, size_bytes
  ) values (
    '71000000-0000-0000-0000-000000000002',
    '10000000-0000-0000-0000-000000000001',
    '70000000-0000-0000-0000-000000000002',
    '20000000-0000-0000-0000-000000000002',
    'file', 'pending',
    '10000000-0000-0000-0000-000000000001/70000000-0000-0000-0000-000000000002/71000000-0000-0000-0000-000000000002/review.mp4',
    'review.mp4', 'video/mp4', 1024
  );

  insert into storage.objects (bucket_id, name)
  values ('task-deliveries', '10000000-0000-0000-0000-000000000001/70000000-0000-0000-0000-000000000002/71000000-0000-0000-0000-000000000002/review.mp4');

  do $$ begin
    begin
      insert into storage.objects (bucket_id, name)
      values ('task-deliveries', '10000000-0000-0000-0000-000000000001/70000000-0000-0000-0000-000000000002/71000000-0000-0000-0000-000000000002/tampered.mp4');
      raise exception 'task delivery path tampering was allowed';
    exception when insufficient_privilege then null; end;
  end $$;

  update task_delivery_evidence set status='ready' where id='71000000-0000-0000-0000-000000000002'::uuid;
  update tasks set status='archived' where id='70000000-0000-0000-0000-000000000002'::uuid;

  do $$ declare c int; begin
    select count(*) into c from storage.objects where bucket_id='task-deliveries';
    if c <> 1 then raise exception 'authorized private delivery read failed: %', c; end if;
    with u as (
      update storage.objects set metadata='{"tampered":true}'::jsonb
      where bucket_id='task-deliveries' returning 1
    ) select count(*) into c from u;
    if c <> 0 then raise exception 'task delivery storage overwrite allowed'; end if;
    with u as (
      update task_delivery_evidence set status='failed'
      where id='71000000-0000-0000-0000-000000000002'::uuid returning 1
    ) select count(*) into c from u;
    if c <> 0 then raise exception 'ready task evidence was mutable'; end if;
  end $$;
commit;

-- Cross-organization users cannot read or mutate KSP task evidence.
begin;
  set local role authenticated;
  select set_config('request.jwt.claim.sub', '20000000-0000-0000-0000-000000000005', true);
  do $$ declare c int; begin
    select count(*) into c from task_delivery_evidence where organization_id='10000000-0000-0000-0000-000000000001'::uuid;
    if c <> 0 then raise exception 'cross-organization task delivery read allowed: %', c; end if;
    select count(*) into c from storage.objects where bucket_id='task-deliveries';
    if c <> 0 then raise exception 'cross-organization task delivery file read allowed: %', c; end if;
  end $$;
rollback;
