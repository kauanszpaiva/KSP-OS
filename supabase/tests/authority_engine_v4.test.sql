-- Authority Engine v4 executable RLS actor matrix.
-- Proves explicit-deny and directional-relationship isolation plus the AAL2,
-- owner-only and short-lived break-glass boundary.

begin;

insert into public.organizations (id, name, slug)
values ('d0000000-0000-0000-0000-000000000001', 'Authority Engine V4 CI', 'authority-engine-v4-ci');

insert into auth.users (id, email) values
  ('d1000000-0000-0000-0000-000000000001', 'owner-v4-ci@test.invalid'),
  ('d1000000-0000-0000-0000-000000000002', 'supervisor-v4-ci@test.invalid'),
  ('d1000000-0000-0000-0000-000000000003', 'worker-v4-ci@test.invalid'),
  ('d1000000-0000-0000-0000-000000000004', 'other-v4-ci@test.invalid');

insert into public.profiles (id, display_name, email) values
  ('d1000000-0000-0000-0000-000000000001', 'Owner V4 CI', 'owner-v4-ci@test.invalid'),
  ('d1000000-0000-0000-0000-000000000002', 'Supervisor V4 CI', 'supervisor-v4-ci@test.invalid'),
  ('d1000000-0000-0000-0000-000000000003', 'Worker V4 CI', 'worker-v4-ci@test.invalid'),
  ('d1000000-0000-0000-0000-000000000004', 'Other V4 CI', 'other-v4-ci@test.invalid');

insert into public.organization_memberships (
  organization_id,
  profile_id,
  role,
  internal_role,
  scope
) values
  ('d0000000-0000-0000-0000-000000000001', 'd1000000-0000-0000-0000-000000000001', 'founder_ceo', 'founder_ceo', 'all'),
  ('d0000000-0000-0000-0000-000000000001', 'd1000000-0000-0000-0000-000000000002', 'developer', 'department_lead', 'assigned'),
  ('d0000000-0000-0000-0000-000000000001', 'd1000000-0000-0000-0000-000000000003', 'developer', 'editor', 'assigned'),
  ('d0000000-0000-0000-0000-000000000001', 'd1000000-0000-0000-0000-000000000004', 'developer', 'developer', 'assigned');

insert into public.projects (id, organization_id, name, project_type) values
  ('d3000000-0000-0000-0000-000000000001', 'd0000000-0000-0000-0000-000000000001', 'Authority V4 CI Project', 'test');

-- Owner creates policy records. AAL2 is supplied so the break-glass insert policy
-- can independently prove step-up instead of trusting application state.
set local role authenticated;
select set_config('request.jwt.claim.sub', 'd1000000-0000-0000-0000-000000000001', true);
select set_config(
  'request.jwt.claims',
  '{"sub":"d1000000-0000-0000-0000-000000000001","aal":"aal2"}',
  true
);

insert into public.internal_permission_denies (
  organization_id,
  profile_id,
  action,
  resource_type,
  resource_id,
  reason,
  denied_by
) values
  (
    'd0000000-0000-0000-0000-000000000001',
    'd1000000-0000-0000-0000-000000000002',
    'project.read',
    'project',
    'd3000000-0000-0000-0000-000000000001',
    'temporary incident isolation',
    'd1000000-0000-0000-0000-000000000001'
  ),
  (
    'd0000000-0000-0000-0000-000000000001',
    'd1000000-0000-0000-0000-000000000004',
    'finance.read',
    null,
    null,
    'finance isolation test',
    'd1000000-0000-0000-0000-000000000001'
  );

insert into public.authority_relationships (
  organization_id,
  source_profile_id,
  target_profile_id,
  relationship_type,
  resource_type,
  resource_id,
  reason,
  granted_by
) values (
  'd0000000-0000-0000-0000-000000000001',
  'd1000000-0000-0000-0000-000000000002',
  'd1000000-0000-0000-0000-000000000003',
  'supervises',
  'project',
  'd3000000-0000-0000-0000-000000000001',
  'supervisor downward operating scope',
  'd1000000-0000-0000-0000-000000000001'
);

insert into public.access_break_glass_sessions (
  organization_id,
  profile_id,
  action,
  resource_type,
  resource_id,
  effective_until,
  reason,
  created_by
) values (
  'd0000000-0000-0000-0000-000000000001',
  'd1000000-0000-0000-0000-000000000001',
  'project.read',
  'project',
  'd3000000-0000-0000-0000-000000000001',
  now() + interval '15 minutes',
  'restore critical project access',
  'd1000000-0000-0000-0000-000000000001'
);
reset role;

-- Supervisor may read only their own deny and outgoing relationship. They cannot
-- enumerate another person's deny and cannot mutate owner-governed policy rows.
set local role authenticated;
select set_config('request.jwt.claim.sub', 'd1000000-0000-0000-0000-000000000002', true);
select set_config(
  'request.jwt.claims',
  '{"sub":"d1000000-0000-0000-0000-000000000002","aal":"aal2"}',
  true
);
do $$
declare
  deny_count int;
  relationship_count int;
begin
  select count(*) into deny_count from public.internal_permission_denies;
  if deny_count <> 1 then
    raise exception 'supervisor deny isolation failed: expected 1, got %', deny_count;
  end if;

  select count(*) into relationship_count from public.authority_relationships;
  if relationship_count <> 1 then
    raise exception 'supervisor relationship read failed: expected 1, got %', relationship_count;
  end if;

  begin
    insert into public.internal_permission_denies (
      organization_id,
      profile_id,
      action,
      reason,
      denied_by
    ) values (
      'd0000000-0000-0000-0000-000000000001',
      'd1000000-0000-0000-0000-000000000003',
      'project.read',
      'must fail because supervisor is not owner',
      'd1000000-0000-0000-0000-000000000002'
    );
    raise exception 'non-owner created an explicit deny';
  exception when sqlstate '42501' then
    null;
  end;
end $$;
reset role;

-- A subordinate never receives upward enumeration of the supervisor edge merely
-- because they are the target of that directional relationship.
set local role authenticated;
select set_config('request.jwt.claim.sub', 'd1000000-0000-0000-0000-000000000003', true);
do $$
declare relationship_count int;
begin
  select count(*) into relationship_count from public.authority_relationships;
  if relationship_count <> 0 then
    raise exception 'downward authority leaked upward: % relationship rows', relationship_count;
  end if;
end $$;
reset role;

-- AAL1 owner sessions cannot mint break-glass authority even though the identity
-- is an executive. This is the database backstop for the application MFA gate.
set local role authenticated;
select set_config('request.jwt.claim.sub', 'd1000000-0000-0000-0000-000000000001', true);
select set_config(
  'request.jwt.claims',
  '{"sub":"d1000000-0000-0000-0000-000000000001","aal":"aal1"}',
  true
);
do $$
begin
  begin
    insert into public.access_break_glass_sessions (
      organization_id,
      profile_id,
      action,
      resource_type,
      resource_id,
      effective_until,
      reason,
      created_by
    ) values (
      'd0000000-0000-0000-0000-000000000001',
      'd1000000-0000-0000-0000-000000000001',
      'project.read',
      'project',
      'd3000000-0000-0000-0000-000000000001',
      now() + interval '10 minutes',
      'aal1 attempt must be rejected',
      'd1000000-0000-0000-0000-000000000001'
    );
    raise exception 'AAL1 owner minted break-glass access';
  exception when sqlstate '42501' then
    null;
  end;
end $$;
reset role;

-- Even an AAL2 owner cannot rewrite historical policy meaning through direct SQL.
-- The only authenticated update surface is revocation metadata.
set local role authenticated;
select set_config('request.jwt.claim.sub', 'd1000000-0000-0000-0000-000000000001', true);
select set_config(
  'request.jwt.claims',
  '{"sub":"d1000000-0000-0000-0000-000000000001","aal":"aal2"}',
  true
);
do $$
begin
  begin
    update public.internal_permission_denies
      set action = 'project.manage'
      where organization_id = 'd0000000-0000-0000-0000-000000000001'
        and profile_id = 'd1000000-0000-0000-0000-000000000002';
    raise exception 'explicit deny history was rewritten';
  exception when sqlstate '42501' then
    null;
  end;

  begin
    update public.authority_relationships
      set relationship_type = 'billing_for', action = 'finance.read'
      where organization_id = 'd0000000-0000-0000-0000-000000000001';
    raise exception 'authority relationship history was rewritten';
  exception when sqlstate '42501' then
    null;
  end;

  begin
    update public.access_break_glass_sessions
      set action = 'project.manage'
      where organization_id = 'd0000000-0000-0000-0000-000000000001';
    raise exception 'break-glass scope was rewritten';
  exception when sqlstate '42501' then
    null;
  end;
end $$;
reset role;

-- No authenticated actor receives DELETE privilege on the policy-history tables.
set local role authenticated;
select set_config('request.jwt.claim.sub', 'd1000000-0000-0000-0000-000000000001', true);
do $$
begin
  begin
    delete from public.internal_permission_denies
    where organization_id = 'd0000000-0000-0000-0000-000000000001';
    raise exception 'policy history was destructively deleted';
  exception when sqlstate '42501' then
    null;
  end;
end $$;
reset role;

rollback;
