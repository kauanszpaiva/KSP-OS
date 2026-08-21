begin;
select plan(8);

insert into auth.users (id, email) values
  ('91000000-0000-0000-0000-000000000001', 'cash-nonexec@test.invalid'),
  ('91000000-0000-0000-0000-000000000002', 'cash-exec@test.invalid');
insert into profiles (id, display_name, email) values
  ('91000000-0000-0000-0000-000000000001', 'Cash Non Exec', 'cash-nonexec@test.invalid'),
  ('91000000-0000-0000-0000-000000000002', 'Cash Exec', 'cash-exec@test.invalid');
insert into organizations (id, name, slug) values
  ('92000000-0000-0000-0000-000000000001', 'Cash Control Test Org', 'cash-control-test');
insert into organization_memberships (organization_id, profile_id, role, internal_role, scope) values
  ('92000000-0000-0000-0000-000000000001', '91000000-0000-0000-0000-000000000001', 'developer', 'developer', 'assigned'),
  ('92000000-0000-0000-0000-000000000001', '91000000-0000-0000-0000-000000000002', 'executive_operations', 'executive_operations', 'all');

grant usage on schema public to authenticated;
grant select, insert, update, delete on financial_accounts, cash_transactions, reconciliation_statements to authenticated;
grant select, insert on audit_events to authenticated;
grant usage, select on all sequences in schema public to authenticated;

set local role authenticated;
select set_config('request.jwt.claim.sub', '91000000-0000-0000-0000-000000000001', true);

select throws_ok(
  $$ insert into financial_accounts (organization_id, name, account_kind, currency) values ('92000000-0000-0000-0000-000000000001', 'Blocked Account', 'bank', 'USD') $$,
  '42501',
  null,
  'Non-executive cannot create a financial account'
);

select is_empty(
  $$ select id from financial_accounts where organization_id = '92000000-0000-0000-0000-000000000001' $$,
  'Non-executive cannot read cash accounts'
);

select set_config('request.jwt.claim.sub', '91000000-0000-0000-0000-000000000002', true);

select lives_ok(
  $$ insert into financial_accounts (id, organization_id, name, account_kind, currency, opening_balance_minor, opening_balance_date, created_by) values ('93000000-0000-0000-0000-000000000001', '92000000-0000-0000-0000-000000000001', 'Operating', 'bank', 'USD', 10000, '2026-08-01', '91000000-0000-0000-0000-000000000002') $$,
  'Executive can create a financial account'
);

select throws_ok(
  $$ insert into cash_transactions (organization_id, financial_account_id, occurred_on, description, direction, amount_minor, currency) values ('92000000-0000-0000-0000-000000000001', '93000000-0000-0000-0000-000000000001', '2026-08-02', 'Wrong currency', 'inflow', 500, 'EUR') $$,
  'P0001',
  'cash_transaction_currency_mismatch',
  'Transaction currency must match account currency'
);

select lives_ok(
  $$ insert into cash_transactions (id, organization_id, financial_account_id, occurred_on, description, direction, amount_minor, currency, created_by) values ('94000000-0000-0000-0000-000000000001', '92000000-0000-0000-0000-000000000001', '93000000-0000-0000-0000-000000000001', '2026-08-02', 'Deposit', 'inflow', 2500, 'USD', '91000000-0000-0000-0000-000000000002'), ('94000000-0000-0000-0000-000000000002', '92000000-0000-0000-0000-000000000001', '93000000-0000-0000-0000-000000000001', '2026-08-03', 'Expense', 'outflow', 1000, 'USD', '91000000-0000-0000-0000-000000000002') $$,
  'Executive can record exact cash activity'
);

insert into reconciliation_statements (id, organization_id, financial_account_id, statement_end_date, ending_balance_minor, currency, created_by)
values ('95000000-0000-0000-0000-000000000001', '92000000-0000-0000-0000-000000000001', '93000000-0000-0000-0000-000000000001', '2026-08-03', 11499, 'USD', '91000000-0000-0000-0000-000000000002');

select throws_ok(
  $$ select reconcile_cash_statement('95000000-0000-0000-0000-000000000001', '91000000-0000-0000-0000-000000000002') $$,
  'P0001',
  'statement_does_not_reconcile',
  'Mismatched statement cannot be reconciled'
);

update reconciliation_statements set ending_balance_minor = 11500 where id = '95000000-0000-0000-0000-000000000001';
select lives_ok(
  $$ select reconcile_cash_statement('95000000-0000-0000-0000-000000000001', '91000000-0000-0000-0000-000000000002') $$,
  'Matching statement reconciles atomically'
);

select throws_ok(
  $$ update cash_transactions set description = 'tampered' where id = '94000000-0000-0000-0000-000000000001' $$,
  'P0001',
  'reconciled_cash_transactions_are_immutable',
  'Reconciled cash transactions are immutable'
);

select * from finish();
rollback;
