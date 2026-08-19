-- managed-files behavioral RLS regression test.
-- Executed by scripts/check-db-tests.mjs against the Docker rehearsal database.
-- Coverage: authorized internal read/upload, executive restricted access,
-- portal public read, cross-organization denial, cross-client denial,
-- anonymous denial, portal upload denial, path tampering denial, overwrite denial.

-- Deterministic document fixtures. Object path must be org/document/file.
insert into documents (id, organization_id, client_id, title, storage_path, classification, client_visible, status) values
  ('60000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', '30000000-0000-0000-0000-000000000001', 'managed-member', '10000000-0000-0000-0000-000000000001/60000000-0000-0000-0000-000000000001/member.txt', 'internal', false, 'active'),
  ('60000000-0000-0000-0000-000000000002', '10000000-0000-0000-0000-000000000001', '30000000-0000-0000-0000-000000000001', 'managed-restricted', '10000000-0000-0000-0000-000000000001/60000000-0000-0000-0000-000000000002/restricted.txt', 'restricted', false, 'active'),
  ('60000000-0000-0000-0000-000000000003', '10000000-0000-0000-0000-000000000001', '30000000-0000-0000-0000-000000000001', 'managed-client-a', '10000000-0000-0000-0000-000000000001/60000000-0000-0000-0000-000000000003/client-a.txt', 'public', true, 'active'),
  ('60000000-0000-0000-0000-000000000004', '10000000-0000-0000-0000-000000000001', '30000000-0000-0000-0000-000000000002', 'managed-client-b', '10000000-0000-0000-0000-000000000001/60000000-0000-0000-0000-000000000004/client-b.txt', 'public', true, 'active'),
  ('60000000-0000-0000-0000-000000000005', '10000000-0000-0000-0000-000000000002', '30000000-0000-0000-0000-000000000003', 'managed-other-org', '10000000-0000-0000-0000-000000000002/60000000-0000-0000-0000-000000000005/other-org.txt', 'public', true, 'active');

-- Seed read fixtures as the table owner so read behavior is isolated from upload policy behavior.
insert into storage.objects (bucket_id, name) values
  ('managed-files', '10000000-0000-0000-0000-000000000001/60000000-0000-0000-0000-000000000001/member.txt'),
  ('managed-files', '10000000-0000-0000-0000-000000000001/60000000-0000-0000-0000-000000000002/restricted.txt'),
  ('managed-files', '10000000-0000-0000-0000-000000000001/60000000-0000-0000-0000-000000000003/client-a.txt'),
  ('managed-files', '10000000-0000-0000-0000-000000000001/60000000-0000-0000-0000-000000000004/client-b.txt'),
  ('managed-files', '10000000-0000-0000-0000-000000000002/60000000-0000-0000-0000-000000000005/other-org.txt');

-- QUERY/EXPLAIN EVIDENCE: policy catalog and planner output are emitted in CI logs.
select id, name, public from storage.buckets where id = 'managed-files';
select policyname, cmd, roles, qual, with_check
from pg_policies
where schemaname = 'storage' and tablename = 'objects' and policyname like 'managed_files_%'
order by policyname;

begin;
  set local role authenticated;
  select set_config('request.jwt.claim.sub', '20000000-0000-0000-0000-000000000002', true);
  explain (costs off) select name from storage.objects where bucket_id = 'managed-files';
  do $$ declare c int; begin
    select count(*) into c from storage.objects where name like '%/member.txt';
    if c <> 1 then raise exception 'internal member authorized read failed: %', c; end if;

    select count(*) into c from storage.objects where name like '%/restricted.txt';
    if c <> 0 then raise exception 'non-executive restricted read allowed: %', c; end if;

    select count(*) into c from storage.objects where name like '%/other-org.txt';
    if c <> 0 then raise exception 'cross-organization managed-file read allowed: %', c; end if;

    insert into storage.objects (bucket_id, name)
      values ('managed-files', '10000000-0000-0000-0000-000000000001/60000000-0000-0000-0000-000000000001/member.txt.upload-copy');
    raise exception 'path without matching document metadata was uploadable';
  exception when insufficient_privilege then null; end $$;
rollback;

-- A dedicated upload fixture has metadata for the exact object path.
insert into documents (id, organization_id, client_id, title, storage_path, classification, client_visible, status)
values ('60000000-0000-0000-0000-000000000006', '10000000-0000-0000-0000-000000000001', '30000000-0000-0000-0000-000000000001', 'managed-member-upload', '10000000-0000-0000-0000-000000000001/60000000-0000-0000-0000-000000000006/upload.txt', 'internal', false, 'active');

begin;
  set local role authenticated;
  select set_config('request.jwt.claim.sub', '20000000-0000-0000-0000-000000000002', true);
  do $$ declare c int; begin
    with i as (
      insert into storage.objects (bucket_id, name)
      values ('managed-files', '10000000-0000-0000-0000-000000000001/60000000-0000-0000-0000-000000000006/upload.txt')
      returning 1
    ) select count(*) into c from i;
    if c <> 1 then raise exception 'authorized internal upload denied'; end if;

    with u as (
      update storage.objects set metadata = '{"tampered":true}'::jsonb
      where name = '10000000-0000-0000-0000-000000000001/60000000-0000-0000-0000-000000000006/upload.txt'
      returning 1
    ) select count(*) into c from u;
    if c <> 0 then raise exception 'authenticated overwrite/update allowed'; end if;
  end $$;
rollback;

begin;
  set local role authenticated;
  select set_config('request.jwt.claim.sub', '20000000-0000-0000-0000-000000000001', true);
  do $$ declare c int; begin
    select count(*) into c from storage.objects where name like '%/restricted.txt';
    if c <> 1 then raise exception 'executive restricted read denied: %', c; end if;
  end $$;
rollback;

begin;
  set local role authenticated;
  select set_config('request.jwt.claim.sub', '20000000-0000-0000-0000-000000000003', true);
  explain (costs off) select name from storage.objects where bucket_id = 'managed-files';
  do $$ declare c int; begin
    select count(*) into c from storage.objects where name like '%/client-a.txt';
    if c <> 1 then raise exception 'portal authorized public read failed: %', c; end if;

    select count(*) into c from storage.objects where name like '%/client-b.txt';
    if c <> 0 then raise exception 'cross-client managed-file read allowed: %', c; end if;

    begin
      insert into storage.objects (bucket_id, name)
      values ('managed-files', '10000000-0000-0000-0000-000000000001/60000000-0000-0000-0000-000000000003/client-a.txt');
      raise exception 'portal managed-file upload was allowed';
    exception when insufficient_privilege then null; end;
  end $$;
rollback;

begin;
  set local role anon;
  select set_config('request.jwt.claim.sub', '', true);
  do $$ declare c int; begin
    select count(*) into c from storage.objects where bucket_id = 'managed-files';
    if c <> 0 then raise exception 'anonymous managed-file read allowed: %', c; end if;
  end $$;
rollback;
