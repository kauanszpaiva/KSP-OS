begin;
select plan(12);

-- negative permissions
-- finance negative permissions

-- Create test profiles
insert into auth.users (id, email) values ('00000000-0000-0000-0000-000000000001', 'nonexec@example.com');
insert into profiles (id, display_name, email) values ('00000000-0000-0000-0000-000000000001', 'Non Exec', 'nonexec@example.com');

insert into auth.users (id, email) values ('00000000-0000-0000-0000-000000000002', 'exec@example.com');
insert into profiles (id, display_name, email) values ('00000000-0000-0000-0000-000000000002', 'Exec', 'exec@example.com');

-- Create org
insert into organizations (id, name, slug) values ('10000000-0000-0000-0000-000000000000', 'Test Org', 'test-org');

-- Assign roles
insert into memberships (organization_id, profile_id, role) values ('10000000-0000-0000-0000-000000000000', '00000000-0000-0000-0000-000000000001', 'developer');
insert into memberships (organization_id, profile_id, role) values ('10000000-0000-0000-0000-000000000000', '00000000-0000-0000-0000-000000000002', 'executive_operations');

-- Setup a client to link invoices to
insert into clients (id, organization_id, legal_name, display_name) values ('20000000-0000-0000-0000-000000000000', '10000000-0000-0000-0000-000000000000', 'Test Client', 'Test Client');

-- Non-exec context
select set_config('role', 'authenticated', true);
select set_config('request.jwt.claims', '{"sub": "00000000-0000-0000-0000-000000000001"}', true);

select throws_ok(
  $$ insert into journal_entries (organization_id) values ('10000000-0000-0000-0000-000000000000') $$,
  'new row violates row-level security policy for table "journal_entries"',
  'Non-executive cannot insert journal entry'
);

select throws_ok(
  $$ insert into invoices (organization_id, client_id) values ('10000000-0000-0000-0000-000000000000', '20000000-0000-0000-0000-000000000000') $$,
  'new row violates row-level security policy for table "invoices"',
  'Non-executive cannot insert invoice'
);

-- Exec context
select set_config('request.jwt.claims', '{"sub": "00000000-0000-0000-0000-000000000002"}', true);

select lives_ok(
  $$ insert into journal_entries (id, organization_id) values ('30000000-0000-0000-0000-000000000000', '10000000-0000-0000-0000-000000000000') $$,
  'Executive can insert journal entry'
);

select lives_ok(
  $$ insert into invoices (id, organization_id, client_id) values ('40000000-0000-0000-0000-000000000000', '10000000-0000-0000-0000-000000000000', '20000000-0000-0000-0000-000000000000') $$,
  'Executive can insert invoice'
);

-- Back to non-exec context to test update policy
select set_config('request.jwt.claims', '{"sub": "00000000-0000-0000-0000-000000000001"}', true);

select results_eq(
  $$ update journal_entries set memo = 'hacked' where id = '30000000-0000-0000-0000-000000000000' returning id $$,
  $$ values (null::uuid) limit 0 $$,
  'Non-executive cannot update journal entry'
);

select results_eq(
  $$ update invoices set status = 'paid' where id = '40000000-0000-0000-0000-000000000000' returning id $$,
  $$ values (null::uuid) limit 0 $$,
  'Non-executive cannot update invoice'
);

-- Delete policies
select throws_ok(
  $$ delete from journal_entries where id = '30000000-0000-0000-0000-000000000000' $$,
  'new row violates row-level security policy for table "journal_entries"',
  'Non-executive cannot delete journal entry'
);

select throws_ok(
  $$ delete from invoices where id = '40000000-0000-0000-0000-000000000000' $$,
  'new row violates row-level security policy for table "invoices"',
  'Non-executive cannot delete invoice'
);

-- Exec can update
select set_config('request.jwt.claims', '{"sub": "00000000-0000-0000-0000-000000000002"}', true);

select lives_ok(
  $$ update journal_entries set memo = 'updated' where id = '30000000-0000-0000-0000-000000000000' $$,
  'Executive can update journal entry'
);

select lives_ok(
  $$ update invoices set status = 'draft' where id = '40000000-0000-0000-0000-000000000000' $$,
  'Executive can update invoice'
);

select * from finish();
rollback;
