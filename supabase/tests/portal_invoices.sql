begin;
select plan(7);

-- Create test organization and users
insert into organizations (id, name, slug) values
  ('11111111-1111-1111-1111-111111111111', 'Test Org', 'test-org');

insert into auth.users (id, email) values
  ('22222222-2222-2222-2222-222222222222', 'internal@test.com'),
  ('33333333-3333-3333-3333-333333333333', 'client@test.com'),
  ('44444444-4444-4444-4444-444444444444', 'other-client@test.com');

insert into profiles (id, display_name, email) values
  ('22222222-2222-2222-2222-222222222222', 'Internal', 'internal@test.com'),
  ('33333333-3333-3333-3333-333333333333', 'Client', 'client@test.com'),
  ('44444444-4444-4444-4444-444444444444', 'Other Client', 'other-client@test.com');

insert into organization_memberships (organization_id, profile_id, role, internal_role) values
  ('11111111-1111-1111-1111-111111111111', '22222222-2222-2222-2222-222222222222', 'member', 'project_manager');

insert into client_organizations (id, organization_id, legal_name, display_name) values
  ('55555555-5555-5555-5555-555555555555', '11111111-1111-1111-1111-111111111111', 'Client Org', 'Client Org'),
  ('66666666-6666-6666-6666-666666666666', '11111111-1111-1111-1111-111111111111', 'Other Client Org', 'Other Client Org');

insert into client_memberships (organization_id, client_organization_id, profile_id, role) values
  ('11111111-1111-1111-1111-111111111111', '55555555-5555-5555-5555-555555555555', '33333333-3333-3333-3333-333333333333', 'client_billing_contact'),
  ('11111111-1111-1111-1111-111111111111', '66666666-6666-6666-6666-666666666666', '44444444-4444-4444-4444-444444444444', 'client_billing_contact');

insert into customer_invoices (id, organization_id, client_organization_id, invoice_number, amount_minor, currency, status) values
  ('77777777-7777-7777-7777-777777777771', '11111111-1111-1111-1111-111111111111', '55555555-5555-5555-5555-555555555555', 'INV-001', 100000, 'USD', 'draft'),
  ('77777777-7777-7777-7777-777777777772', '11111111-1111-1111-1111-111111111111', '55555555-5555-5555-5555-555555555555', 'INV-002', 200000, 'USD', 'issued'),
  ('77777777-7777-7777-7777-777777777773', '11111111-1111-1111-1111-111111111111', '66666666-6666-6666-6666-666666666666', 'INV-003', 300000, 'USD', 'issued');

insert into invoice_lines (id, organization_id, invoice_id, description, amount_minor, currency) values
  ('88888888-8888-8888-8888-888888888881', '11111111-1111-1111-1111-111111111111', '77777777-7777-7777-7777-777777777771', 'Line 1', 100000, 'USD'),
  ('88888888-8888-8888-8888-888888888882', '11111111-1111-1111-1111-111111111111', '77777777-7777-7777-7777-777777777772', 'Line 2', 200000, 'USD'),
  ('88888888-8888-8888-8888-888888888883', '11111111-1111-1111-1111-111111111111', '77777777-7777-7777-7777-777777777773', 'Line 3', 300000, 'USD');

insert into customer_payments (id, organization_id, invoice_id, amount_minor, currency, payment_date) values
  ('99999999-9999-9999-9999-999999999992', '11111111-1111-1111-1111-111111111111', '77777777-7777-7777-7777-777777777772', 200000, 'USD', '2026-01-01');

-- Test internal access
set local role authenticated;
set local request.jwt.claims = '{"sub": "22222222-2222-2222-2222-222222222222", "email": "internal@test.com", "role": "authenticated"}';

select is(
  (select count(*)::int from customer_invoices),
  3,
  'Internal member sees all invoices'
);

-- Test client access
set local role authenticated;
set local request.jwt.claims = '{"sub": "33333333-3333-3333-3333-333333333333", "email": "client@test.com", "role": "authenticated"}';

select is(
  (select count(*)::int from customer_invoices),
  1,
  'Client sees only their own issued/paid invoices'
);

select is(
  (select count(*)::int from customer_invoices where id = '77777777-7777-7777-7777-777777777771'),
  0,
  'Client does not see their own draft invoices'
);

select is(
  (select count(*)::int from customer_invoices where id = '77777777-7777-7777-7777-777777777773'),
  0,
  'Client does not see other clients invoices'
);

select is(
  (select count(*)::int from invoice_lines),
  1,
  'Client sees only lines for their visible invoices'
);

select is(
  (select count(*)::int from invoice_lines where id = '88888888-8888-8888-8888-888888888882'),
  1,
  'Client can see the line for their issued invoice'
);

select is(
  (select count(*)::int from customer_payments),
  1,
  'Client sees only payments for their visible invoices'
);

select * from finish();
rollback;
