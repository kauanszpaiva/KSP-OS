-- Executable KSP INC temporary-access RLS regression.
-- The Docker DB harness applies the full migration chain and seeds the shared
-- founder/member/other-tenant fixtures before running this file.

insert into auth.users (id, email) values
  ('20000000-0000-0000-0000-000000000008', 'operations-owner-access@test.invalid');

insert into public.profiles (id, display_name, email) values
  ('20000000-0000-0000-0000-000000000008', 'Operations Owner Access Test', 'operations-owner-access@test.invalid');

insert into public.organization_memberships (
  organization_id,
  profile_id,
  role,
  internal_role,
  scope
) values (
  '10000000-0000-0000-0000-000000000001',
  '20000000-0000-0000-0000-000000000008',
  'executive_operations',
  'executive_operations',
  'all'
);

-- Founder can create a temporary grant for another internal member.
begin;
  set local role authenticated;
  select set_config('request.jwt.claim.sub', '20000000-0000-0000-0000-000000000001', true);
  insert into public.temporary_access_grants (
    id,
    organization_id,
    profile_id,
    action,
    resource_type,
    resource_id,
    effective_until,
    created_by
  ) values (
    '81000000-0000-0000-0000-000000000001',
    '10000000-0000-0000-0000-000000000001',
    '20000000-0000-0000-0000-000000000002',
    'project.read',
    'project',
    '40000000-0000-0000-0000-000000000001',
    now() + interval '2 hours',
    '20000000-0000-0000-0000-000000000001'
  );
commit;

-- The grantee can read their own temporary grant, but cannot mutate it or
-- create another grant. This preserves getAuthContext() self-hydration while
-- denying normal internal members access-administration authority.
begin;
  set local role authenticated;
  select set_config('request.jwt.claim.sub', '20000000-0000-0000-0000-000000000002', true);
  do $$ declare c int; begin
    select count(*) into c
    from public.temporary_access_grants
    where id = '81000000-0000-0000-0000-000000000001'::uuid;
    if c <> 1 then raise exception 'temporary grant self-read denied: %', c; end if;

    begin
      insert into public.temporary_access_grants (
        id, organization_id, profile_id, action, resource_type, resource_id, effective_until, created_by
      ) values (
        '81000000-0000-0000-0000-000000000002',
        '10000000-0000-0000-0000-000000000001',
        '20000000-0000-0000-0000-000000000002',
        'project.manage',
        'project',
        '40000000-0000-0000-0000-000000000001',
        now() + interval '1 hour',
        '20000000-0000-0000-0000-000000000002'
      );
      raise exception 'normal internal member created a temporary grant';
    exception when insufficient_privilege then null;
    end;

    with u as (
      update public.temporary_access_grants
      set effective_until = now() + interval '4 hours'
      where id = '81000000-0000-0000-0000-000000000001'::uuid
      returning 1
    ) select count(*) into c from u;
    if c <> 0 then raise exception 'normal internal member updated a temporary grant'; end if;

    with d as (
      delete from public.temporary_access_grants
      where id = '81000000-0000-0000-0000-000000000001'::uuid
      returning 1
    ) select count(*) into c from d;
    if c <> 0 then raise exception 'normal internal member deleted a temporary grant'; end if;
  end $$;
rollback;

-- Executive Operations is the second KSP INC owner role and may administer
-- temporary grants across the KSP organization.
begin;
  set local role authenticated;
  select set_config('request.jwt.claim.sub', '20000000-0000-0000-0000-000000000008', true);
  do $$ declare c int; begin
    update public.temporary_access_grants
    set effective_until = now() + interval '3 hours'
    where id = '81000000-0000-0000-0000-000000000001'::uuid;

    select count(*) into c
    from public.temporary_access_grants
    where id = '81000000-0000-0000-0000-000000000001'::uuid
      and effective_until > now() + interval '2 hours';
    if c <> 1 then raise exception 'executive operations could not update temporary grant'; end if;

    insert into public.temporary_access_grants (
      id, organization_id, profile_id, action, resource_type, resource_id, effective_until, created_by
    ) values (
      '81000000-0000-0000-0000-000000000003',
      '10000000-0000-0000-0000-000000000001',
      '20000000-0000-0000-0000-000000000002',
      'document.download',
      'project',
      '40000000-0000-0000-0000-000000000001',
      now() + interval '1 hour',
      '20000000-0000-0000-0000-000000000008'
    );
  end $$;
rollback;

-- A member of another tenant cannot mutate KSP temporary grants and cannot see
-- them merely because they are authenticated.
begin;
  set local role authenticated;
  select set_config('request.jwt.claim.sub', '20000000-0000-0000-0000-000000000005', true);
  do $$ declare c int; begin
    select count(*) into c
    from public.temporary_access_grants
    where id = '81000000-0000-0000-0000-000000000001'::uuid;
    if c <> 0 then raise exception 'cross-organization temporary grant read allowed'; end if;

    begin
      insert into public.temporary_access_grants (
        id, organization_id, profile_id, action, resource_type, resource_id, effective_until, created_by
      ) values (
        '81000000-0000-0000-0000-000000000004',
        '10000000-0000-0000-0000-000000000001',
        '20000000-0000-0000-0000-000000000005',
        'project.read',
        'project',
        '40000000-0000-0000-0000-000000000001',
        now() + interval '1 hour',
        '20000000-0000-0000-0000-000000000005'
      );
      raise exception 'cross-organization temporary grant mutation allowed';
    exception when insufficient_privilege then null;
    end;
  end $$;
rollback;

-- Owner can revoke the grant by marking revoked_at; the auth context query is
-- required to exclude revoked and expired rows from effective access.
begin;
  set local role authenticated;
  select set_config('request.jwt.claim.sub', '20000000-0000-0000-0000-000000000001', true);
  update public.temporary_access_grants
  set revoked_at = now()
  where id = '81000000-0000-0000-0000-000000000001'::uuid;
commit;

do $$ declare c int; begin
  select count(*) into c
  from public.temporary_access_grants
  where id = '81000000-0000-0000-0000-000000000001'::uuid
    and revoked_at is null
    and effective_from <= now()
    and effective_until > now();
  if c <> 0 then raise exception 'revoked temporary grant still resolves as active'; end if;
end $$;
