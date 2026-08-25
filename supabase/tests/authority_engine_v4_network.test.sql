-- Authority Engine V4 Network/delegation actor matrix.
-- Proves supervisor -> team asymmetry, billing isolation, individual assignment
-- membership and canonical delegation visibility/creation boundaries.

begin;

insert into public.organizations (id, name, slug)
values ('e0000000-0000-0000-0000-000000000001', 'Authority Network V4 CI', 'authority-network-v4-ci');

insert into auth.users (id, email) values
  ('e1000000-0000-0000-0000-000000000001', 'owner-network-v4@test.invalid'),
  ('e1000000-0000-0000-0000-000000000002', 'coordinator-network-v4@test.invalid'),
  ('e1000000-0000-0000-0000-000000000003', 'worker-network-v4@test.invalid'),
  ('e1000000-0000-0000-0000-000000000004', 'billing-network-v4@test.invalid'),
  ('e1000000-0000-0000-0000-000000000005', 'other-network-v4@test.invalid'),
  ('e1000000-0000-0000-0000-000000000006', 'manager-delegator-v4@test.invalid'),
  ('e1000000-0000-0000-0000-000000000007', 'delegate-v4@test.invalid');

insert into public.profiles (id, display_name, email) values
  ('e1000000-0000-0000-0000-000000000001', 'Owner Network V4', 'owner-network-v4@test.invalid'),
  ('e1000000-0000-0000-0000-000000000002', 'Coordinator Network V4', 'coordinator-network-v4@test.invalid'),
  ('e1000000-0000-0000-0000-000000000003', 'Worker Network V4', 'worker-network-v4@test.invalid'),
  ('e1000000-0000-0000-0000-000000000004', 'Billing Network V4', 'billing-network-v4@test.invalid'),
  ('e1000000-0000-0000-0000-000000000005', 'Other Network V4', 'other-network-v4@test.invalid'),
  ('e1000000-0000-0000-0000-000000000006', 'Manager Delegator V4', 'manager-delegator-v4@test.invalid'),
  ('e1000000-0000-0000-0000-000000000007', 'Delegate V4', 'delegate-v4@test.invalid');

insert into public.organization_memberships (organization_id, profile_id, role, internal_role, scope) values
  ('e0000000-0000-0000-0000-000000000001', 'e1000000-0000-0000-0000-000000000001', 'founder_ceo', 'founder_ceo', 'all'),
  ('e0000000-0000-0000-0000-000000000001', 'e1000000-0000-0000-0000-000000000005', 'developer', 'developer', 'assigned'),
  ('e0000000-0000-0000-0000-000000000001', 'e1000000-0000-0000-0000-000000000006', 'project_manager', 'project_manager', 'assigned'),
  ('e0000000-0000-0000-0000-000000000001', 'e1000000-0000-0000-0000-000000000007', 'developer', 'developer', 'assigned');

insert into public.business_units (id, organization_id, key, name, sort_order)
values ('e2000000-0000-0000-0000-000000000001', 'e0000000-0000-0000-0000-000000000001', 'network-v4-ci', 'Network V4 CI', 999);

insert into public.projects (id, organization_id, business_unit_id, name, project_type) values
  ('e3000000-0000-0000-0000-000000000001', 'e0000000-0000-0000-0000-000000000001', 'e2000000-0000-0000-0000-000000000001', 'Network V4 Project A', 'test'),
  ('e3000000-0000-0000-0000-000000000002', 'e0000000-0000-0000-0000-000000000001', 'e2000000-0000-0000-0000-000000000001', 'Network V4 Project B', 'test');

insert into public.project_memberships (organization_id, project_id, profile_id, role) values
  ('e0000000-0000-0000-0000-000000000001', 'e3000000-0000-0000-0000-000000000001', 'e1000000-0000-0000-0000-000000000006', 'project_manager');

insert into public.partner_organizations (
  id, organization_id, business_unit_id, display_name, slug, created_by
) values (
  'e4000000-0000-0000-0000-000000000001',
  'e0000000-0000-0000-0000-000000000001',
  'e2000000-0000-0000-0000-000000000001',
  'Vendor Network V4',
  'vendor-network-v4',
  'e1000000-0000-0000-0000-000000000001'
);

insert into public.partner_memberships (
  organization_id, partner_organization_id, profile_id, role, created_by
) values
  ('e0000000-0000-0000-0000-000000000001', 'e4000000-0000-0000-0000-000000000001', 'e1000000-0000-0000-0000-000000000002', 'partner_coordinator', 'e1000000-0000-0000-0000-000000000001'),
  ('e0000000-0000-0000-0000-000000000001', 'e4000000-0000-0000-0000-000000000001', 'e1000000-0000-0000-0000-000000000003', 'editor', 'e1000000-0000-0000-0000-000000000001'),
  ('e0000000-0000-0000-0000-000000000001', 'e4000000-0000-0000-0000-000000000001', 'e1000000-0000-0000-0000-000000000004', 'billing', 'e1000000-0000-0000-0000-000000000001');

insert into public.partner_assignments (
  id, organization_id, business_unit_id, project_id, partner_organization_id, title, created_by
) values
  ('e5000000-0000-0000-0000-000000000001', 'e0000000-0000-0000-0000-000000000001', 'e2000000-0000-0000-0000-000000000001', 'e3000000-0000-0000-0000-000000000001', 'e4000000-0000-0000-0000-000000000001', 'Assigned to worker', 'e1000000-0000-0000-0000-000000000001'),
  ('e5000000-0000-0000-0000-000000000002', 'e0000000-0000-0000-0000-000000000001', 'e2000000-0000-0000-0000-000000000001', 'e3000000-0000-0000-0000-000000000002', 'e4000000-0000-0000-0000-000000000001', 'Supervisor only assignment', 'e1000000-0000-0000-0000-000000000001');

-- Owner assigns only assignment A to the worker as lead.
set local role authenticated;
select set_config('request.jwt.claim.sub', 'e1000000-0000-0000-0000-000000000001', true);
select set_config('request.jwt.claims', '{"sub":"e1000000-0000-0000-0000-000000000001","aal":"aal2"}', true);
insert into public.partner_assignment_members (
  organization_id, partner_organization_id, assignment_id, profile_id, assignment_role, created_by
) values (
  'e0000000-0000-0000-0000-000000000001',
  'e4000000-0000-0000-0000-000000000001',
  'e5000000-0000-0000-0000-000000000001',
  'e1000000-0000-0000-0000-000000000003',
  'lead',
  'e1000000-0000-0000-0000-000000000001'
);
reset role;

-- Coordinator/supervisor sees all company assignments.
set local role authenticated;
select set_config('request.jwt.claim.sub', 'e1000000-0000-0000-0000-000000000002', true);
do $$
declare n int;
begin
  select count(*) into n from public.partner_assignments where partner_organization_id='e4000000-0000-0000-0000-000000000001';
  if n <> 2 then raise exception 'coordinator expected 2 assignments, got %', n; end if;
end $$;
reset role;

-- Worker sees only their explicitly assigned work and can respond because they
-- were assigned as lead.
set local role authenticated;
select set_config('request.jwt.claim.sub', 'e1000000-0000-0000-0000-000000000003', true);
do $$
declare n int; result text;
begin
  select count(*) into n from public.partner_assignments where partner_organization_id='e4000000-0000-0000-0000-000000000001';
  if n <> 1 then raise exception 'worker expected 1 assignment, got %', n; end if;
  result := public.respond_partner_assignment('e5000000-0000-0000-0000-000000000001', 'accepted', 'lead accepts');
  if result <> 'accepted' then raise exception 'lead response failed'; end if;
end $$;
reset role;

-- Billing belongs to the same vendor organization but gets zero operational
-- assignment rows and cannot respond to company work.
set local role authenticated;
select set_config('request.jwt.claim.sub', 'e1000000-0000-0000-0000-000000000004', true);
do $$
declare n int;
begin
  select count(*) into n from public.partner_assignments where partner_organization_id='e4000000-0000-0000-0000-000000000001';
  if n <> 0 then raise exception 'billing operational leakage: expected 0 assignments, got %', n; end if;
  begin
    perform public.respond_partner_assignment('e5000000-0000-0000-0000-000000000002', 'accepted', 'must fail');
    raise exception 'billing user responded to assignment';
  exception when others then
    if sqlerrm = 'billing user responded to assignment' then raise; end if;
  end;
end $$;
reset role;

-- Canonical delegation is resource-scoped. Owner creates it after application
-- ceiling evaluation; delegate can see it, unrelated internal users cannot.
set local role authenticated;
select set_config('request.jwt.claim.sub', 'e1000000-0000-0000-0000-000000000001', true);
select set_config('request.jwt.claims', '{"sub":"e1000000-0000-0000-0000-000000000001","aal":"aal2"}', true);
insert into public.delegations (
  organization_id, delegator_id, delegate_id, action, resource_type, resource_id,
  effective_from, effective_until, granted_by
) values (
  'e0000000-0000-0000-0000-000000000001',
  'e1000000-0000-0000-0000-000000000006',
  'e1000000-0000-0000-0000-000000000007',
  'project.read',
  'project',
  'e3000000-0000-0000-0000-000000000001',
  now(),
  now() + interval '24 hours',
  'e1000000-0000-0000-0000-000000000001'
);
reset role;

set local role authenticated;
select set_config('request.jwt.claim.sub', 'e1000000-0000-0000-0000-000000000007', true);
do $$
declare n int;
begin
  select count(*) into n from public.delegations where organization_id='e0000000-0000-0000-0000-000000000001';
  if n <> 1 then raise exception 'delegate expected own delegation, got %', n; end if;
end $$;
reset role;

set local role authenticated;
select set_config('request.jwt.claim.sub', 'e1000000-0000-0000-0000-000000000005', true);
do $$
declare n int;
begin
  select count(*) into n from public.delegations where organization_id='e0000000-0000-0000-0000-000000000001';
  if n <> 0 then raise exception 'unrelated internal enumerated delegations: %', n; end if;
  begin
    insert into public.delegations (
      organization_id, delegator_id, delegate_id, action, resource_type, resource_id,
      effective_from, effective_until, granted_by
    ) values (
      'e0000000-0000-0000-0000-000000000001',
      'e1000000-0000-0000-0000-000000000005',
      'e1000000-0000-0000-0000-000000000007',
      'project.read', 'project', 'e3000000-0000-0000-0000-000000000001',
      now(), now()+interval '1 hour', 'e1000000-0000-0000-0000-000000000005'
    );
    raise exception 'non-owner minted delegation';
  exception when sqlstate '42501' then null;
  end;
end $$;
reset role;

rollback;
