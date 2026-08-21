begin;
select plan(10);

insert into organizations (id, name, slug) values
  ('11111111-1111-1111-1111-111111111111', 'Test Org', 'test-org');

insert into auth.users (id, email) values
  ('22222222-2222-2222-2222-222222222222', 'executive@test.com'),
  ('33333333-3333-3333-3333-333333333333', 'client@test.com'),
  ('44444444-4444-4444-4444-444444444444', 'other-client@test.com'),
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'member@test.com');

insert into profiles (id, display_name, email) values
  ('22222222-2222-2222-2222-222222222222', 'Executive', 'executive@test.com'),
  ('33333333-3333-3333-3333-333333333333', 'Client', 'client@test.com'),
  ('44444444-4444-4444-4444-444444444444', 'Other Client', 'other-client@test.com'),
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Member', 'member@test.com');

insert into organization_memberships (organization_id, profile_id, role, internal_role) values
  ('11111111-1111-1111-1111-111111111111', '22222222-2222-2222-2222-222222222222', 'member', 'founder_ceo'),
  ('11111111-1111-1111-1111-111111111111', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'member', 'project_manager');

insert into client_organizations (id, organization_id, legal_name, display_name) values
  ('55555555-5555-5555-5555-555555555555', '11111111-1111-1111-1111-111111111111', 'Client Org', 'Client Org'),
  ('66666666-6666-6666-6666-666666666666', '11111111-1111-1111-1111-111111111111', 'Other Client Org', 'Other Client Org');

insert into contacts (id, organization_id, client_id, name, email, client_visible, classification) values
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', '11111111-1111-1111-1111-111111111111', '55555555-5555-5555-5555-555555555555', 'Billing Contact', 'billing@client.test', true, 'confidential');

insert into client_memberships (organization_id, client_organization_id, profile_id, role) values
  ('11111111-1111-1111-1111-111111111111', '55555555-5555-5555-5555-555555555555', '33333333-3333-3333-3333-333333333333', 'client_billing_contact'),
  ('11111111-1111-1111-1111-111111111111', '66666666-6666-6666-6666-666666666666', '44444444-4444-4444-4444-444444444444', 'client_billing_contact');

insert into customer_invoices (id, organization_id, client_organization_id, billing_contact_id, billing_email, invoice_number, amount_minor, currency, status) values
  ('77777777-7777-7777-7777-777777777771', '11111111-1111-1111-1111-111111111111', '55555555-5555-5555-5555-555555555555', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'billing@client.test', 'INV-001', 100000, 'USD', 'draft'),
  ('77777777-7777-7777-7777-777777777772', '11111111-1111-1111-1111-111111111111', '55555555-5555-5555-5555-555555555555', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'billing@client.test', 'INV-002', 200000, 'USD', 'issued'),
  ('77777777-7777-7777-7777-777777777773', '11111111-1111-1111-1111-111111111111', '66666666-6666-6666-6666-666666666666', null, 'other@client.test', 'INV-003', 300000, 'USD', 'issued');

insert into invoice_lines (id, organization_id, invoice_id, description, amount_minor, currency) values
  ('88888888-8888-8888-8888-888888888881', '11111111-1111-1111-1111-111111111111', '77777777-7777-7777-7777-777777777771', 'Line 1', 100000, 'USD'),
  ('88888888-8888-8888-8888-888888888882', '11111111-1111-1111-1111-111111111111', '77777777-7777-7777-7777-777777777772', 'Line 2', 200000, 'USD'),
  ('88888888-8888-8888-8888-888888888883', '11111111-1111-1111-1111-111111111111', '77777777-7777-7777-7777-777777777773', 'Line 3', 300000, 'USD');

insert into customer_payments (id, organization_id, invoice_id, amount_minor, currency, payment_date) values
  ('99999999-9999-9999-9999-999999999992', '11111111-1111-1111-1111-111111111111', '77777777-7777-7777-7777-777777777772', 200000, 'USD', '2026-01-01');

insert into invoice_email_deliveries (organization_id, invoice_id, event_type, recipient_email, idempotency_key, status, attempt_count)
values ('11111111-1111-1111-1111-111111111111', '77777777-7777-7777-7777-777777777772', 'issued', 'billing@client.test', 'test-key', 'sent', 1);

set local role authenticated;
set local request.jwt.claims = '{"sub": "22222222-2222-2222-2222-222222222222", "email": "executive@test.com", "role": "authenticated"}';

select is((select count(*)::int from customer_invoices), 3, 'Executive sees all invoices in the organization');
select lives_ok($$
  select create_customer_invoice_draft(
    '55555555-5555-5555-5555-555555555555',
    'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
    '2026-09-15',
    'USD',
    '[{"description":"New work","amount_minor":12500,"quantity":1}]'::jsonb
  )
$$, 'Executive can atomically create a customer invoice draft');
select is((select count(*)::int from customer_invoices), 4, 'Draft RPC creates exactly one invoice');

set local request.jwt.claims = '{"sub": "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa", "email": "member@test.com", "role": "authenticated"}';
select throws_ok($$
  select create_customer_invoice_draft(
    '55555555-5555-5555-5555-555555555555',
    'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
    null,
    'USD',
    '[{"description":"Blocked","amount_minor":1000,"quantity":1}]'::jsonb
  )
$$, 'executive_finance_access_required', 'Non-executive internal member cannot create invoices');

set local request.jwt.claims = '{"sub": "33333333-3333-3333-3333-333333333333", "email": "client@test.com", "role": "authenticated"}';
select is((select count(*)::int from customer_invoices), 1, 'Client sees only their own issued invoices');
select is((select count(*)::int from customer_invoices where id = '77777777-7777-7777-7777-777777777771'), 0, 'Client cannot see their own draft');
select is((select count(*)::int from customer_invoices where id = '77777777-7777-7777-7777-777777777773'), 0, 'Client cannot see another client invoice');
select is((select count(*)::int from invoice_lines), 1, 'Client sees lines only for visible invoices');
select is((select count(*)::int from customer_payments), 1, 'Client sees payments only for visible invoices');
select is((select count(*)::int from invoice_email_deliveries), 0, 'Client cannot see internal email delivery telemetry');

select * from finish();
rollback;
