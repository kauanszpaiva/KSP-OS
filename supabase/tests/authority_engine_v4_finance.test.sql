-- Authority Engine V4 finance actor matrix.
-- Proves non-executive finance authority with AAL2 + persisted ceilings and the
-- negative boundaries: missing/exceeded ceiling, self-approval and explicit deny.

begin;

insert into public.organizations (id, name, slug)
values ('a0000000-0000-4000-8000-000000000001', 'Authority Finance V4 CI', 'authority-finance-v4-ci');

insert into auth.users (id, email) values
  ('a1000000-0000-4000-8000-000000000001', 'owner-fin-v4@test.invalid'),
  ('a1000000-0000-4000-8000-000000000002', 'creator-fin-v4@test.invalid'),
  ('a1000000-0000-4000-8000-000000000003', 'approver-fin-v4@test.invalid');

insert into public.profiles (id, display_name, email) values
  ('a1000000-0000-4000-8000-000000000001', 'Owner Finance V4', 'owner-fin-v4@test.invalid'),
  ('a1000000-0000-4000-8000-000000000002', 'Creator Finance V4', 'creator-fin-v4@test.invalid'),
  ('a1000000-0000-4000-8000-000000000003', 'Approver Finance V4', 'approver-fin-v4@test.invalid');

insert into public.organization_memberships (organization_id, profile_id, role, internal_role, scope) values
  ('a0000000-0000-4000-8000-000000000001','a1000000-0000-4000-8000-000000000001','founder_ceo','founder_ceo','all'),
  ('a0000000-0000-4000-8000-000000000001','a1000000-0000-4000-8000-000000000002','developer','developer','assigned'),
  ('a0000000-0000-4000-8000-000000000001','a1000000-0000-4000-8000-000000000003','developer','developer','assigned');

insert into public.internal_permission_grants (organization_id, profile_id, action, granted_by) values
  ('a0000000-0000-4000-8000-000000000001','a1000000-0000-4000-8000-000000000002','invoice.create','a1000000-0000-4000-8000-000000000001'),
  ('a0000000-0000-4000-8000-000000000001','a1000000-0000-4000-8000-000000000002','invoice.approve','a1000000-0000-4000-8000-000000000001'),
  ('a0000000-0000-4000-8000-000000000001','a1000000-0000-4000-8000-000000000003','invoice.approve','a1000000-0000-4000-8000-000000000001'),
  ('a0000000-0000-4000-8000-000000000001','a1000000-0000-4000-8000-000000000003','finance.read','a1000000-0000-4000-8000-000000000001'),
  ('a0000000-0000-4000-8000-000000000001','a1000000-0000-4000-8000-000000000003','finance.post','a1000000-0000-4000-8000-000000000001');

-- Owner configures amount ceilings. Creator deliberately also receives an
-- approval ceiling so the self-approval test reaches the SoD guard rather than
-- failing earlier for missing authority.
set local role authenticated;
select set_config('request.jwt.claim.sub','a1000000-0000-4000-8000-000000000001',true);
select set_config('request.jwt.claims','{"sub":"a1000000-0000-4000-8000-000000000001","aal":"aal2"}',true);
insert into public.authority_approval_limits (
  organization_id, profile_id, action, max_amount_minor, currency, granted_by
) values
  ('a0000000-0000-4000-8000-000000000001','a1000000-0000-4000-8000-000000000002','invoice.approve',100000,'USD','a1000000-0000-4000-8000-000000000001'),
  ('a0000000-0000-4000-8000-000000000001','a1000000-0000-4000-8000-000000000003','invoice.approve',100000,'USD','a1000000-0000-4000-8000-000000000001'),
  ('a0000000-0000-4000-8000-000000000001','a1000000-0000-4000-8000-000000000003','finance.post',100000,'USD','a1000000-0000-4000-8000-000000000001');
reset role;

insert into public.client_organizations (id, organization_id, legal_name, display_name, created_by)
values ('a2000000-0000-4000-8000-000000000001','a0000000-0000-4000-8000-000000000001','Finance Client LLC','Finance Client','a1000000-0000-4000-8000-000000000001');
insert into public.contacts (id, organization_id, client_id, full_name, email)
values ('a2100000-0000-4000-8000-000000000001','a0000000-0000-4000-8000-000000000001','a2000000-0000-4000-8000-000000000001','Billing Contact','billing-fin-v4@test.invalid');

-- Creator with AAL2 can create a draft via granular invoice.create.
set local role authenticated;
select set_config('request.jwt.claim.sub','a1000000-0000-4000-8000-000000000002',true);
select set_config('request.jwt.claims','{"sub":"a1000000-0000-4000-8000-000000000002","aal":"aal2"}',true);
select public.create_customer_invoice_draft(
  'a2000000-0000-4000-8000-000000000001',
  'a2100000-0000-4000-8000-000000000001',
  current_date + 14,
  'USD',
  '[{"description":"Within limit","quantity":1,"amount_minor":50000}]'::jsonb
) as invoice_id \gset within_

select public.create_customer_invoice_draft(
  'a2000000-0000-4000-8000-000000000001',
  'a2100000-0000-4000-8000-000000000001',
  current_date + 14,
  'USD',
  '[{"description":"Over limit","quantity":1,"amount_minor":150000}]'::jsonb
) as invoice_id \gset over_

select public.create_customer_invoice_draft(
  'a2000000-0000-4000-8000-000000000001',
  'a2100000-0000-4000-8000-000000000001',
  current_date + 14,
  'USD',
  '[{"description":"Self approval","quantity":1,"amount_minor":25000}]'::jsonb
) as invoice_id \gset self_

-- Self-approval is denied even though the creator has capability + ceiling.
do $$
begin
  begin
    perform public.issue_customer_invoice(:'self_invoice_id'::uuid);
    raise exception 'non-executive self approval succeeded';
  exception when others then
    if sqlerrm = 'non-executive self approval succeeded' then raise; end if;
    if sqlerrm not like '%separation_of_duties_self_approval_denied%' then raise; end if;
  end;
end $$;
reset role;

-- Independent approver can issue within ceiling.
set local role authenticated;
select set_config('request.jwt.claim.sub','a1000000-0000-4000-8000-000000000003',true);
select set_config('request.jwt.claims','{"sub":"a1000000-0000-4000-8000-000000000003","aal":"aal2"}',true);
select (public.issue_customer_invoice(:'within_invoice_id'::uuid)).status as status \gset issued_
\if :'issued_status' != 'issued'
  \quit 1
\endif

-- Same approver cannot exceed the configured USD ceiling.
do $$
begin
  begin
    perform public.issue_customer_invoice(:'over_invoice_id'::uuid);
    raise exception 'approval ceiling was bypassed';
  exception when others then
    if sqlerrm = 'approval ceiling was bypassed' then raise; end if;
    if sqlerrm not like '%approval_limit_exceeded_or_missing%' then raise; end if;
  end;
end $$;

-- AAL1 fails even with capability + ceiling.
select set_config('request.jwt.claims','{"sub":"a1000000-0000-4000-8000-000000000003","aal":"aal1"}',true);
do $$
begin
  begin
    perform public.issue_customer_invoice(:'over_invoice_id'::uuid);
    raise exception 'AAL1 invoice approval succeeded';
  exception when others then
    if sqlerrm = 'AAL1 invoice approval succeeded' then raise; end if;
    if sqlerrm not like '%mfa_required%' then raise; end if;
  end;
end $$;
reset role;

-- Explicit deny overrides the approver's grant and ceiling.
set local role authenticated;
select set_config('request.jwt.claim.sub','a1000000-0000-4000-8000-000000000001',true);
select set_config('request.jwt.claims','{"sub":"a1000000-0000-4000-8000-000000000001","aal":"aal2"}',true);
insert into public.internal_permission_denies (
  organization_id, profile_id, action, reason, denied_by
) values (
  'a0000000-0000-4000-8000-000000000001',
  'a1000000-0000-4000-8000-000000000003',
  'invoice.approve',
  'finance approval hold',
  'a1000000-0000-4000-8000-000000000001'
);
reset role;

set local role authenticated;
select set_config('request.jwt.claim.sub','a1000000-0000-4000-8000-000000000003',true);
select set_config('request.jwt.claims','{"sub":"a1000000-0000-4000-8000-000000000003","aal":"aal2"}',true);
do $$
begin
  begin
    perform public.issue_customer_invoice(:'over_invoice_id'::uuid);
    raise exception 'explicit deny was bypassed';
  exception when others then
    if sqlerrm = 'explicit deny was bypassed' then raise; end if;
    if sqlerrm not like '%insufficient_invoice_approve_permission%' then raise; end if;
  end;
end $$;
reset role;

-- Revoke the hold so the same actor can exercise finance.post independently.
set local role authenticated;
select set_config('request.jwt.claim.sub','a1000000-0000-4000-8000-000000000001',true);
update public.internal_permission_denies
set revoked_at = now(), updated_at = now()
where organization_id='a0000000-0000-4000-8000-000000000001'
  and profile_id='a1000000-0000-4000-8000-000000000003'
  and action='invoice.approve';
reset role;

insert into public.chart_accounts (id, organization_id, code, name, account_type) values
  ('a3000000-0000-4000-8000-000000000001','a0000000-0000-4000-8000-000000000001','1000','Cash','asset'),
  ('a3000000-0000-4000-8000-000000000002','a0000000-0000-4000-8000-000000000001','4000','Revenue','revenue');
insert into public.journal_entries (id, organization_id, entry_date, memo)
values ('a3100000-0000-4000-8000-000000000001','a0000000-0000-4000-8000-000000000001',current_date,'Within finance post ceiling');
insert into public.journal_lines (organization_id, journal_entry_id, account_id, debit_minor, credit_minor, currency) values
  ('a0000000-0000-4000-8000-000000000001','a3100000-0000-4000-8000-000000000001','a3000000-0000-4000-8000-000000000001',50000,0,'USD'),
  ('a0000000-0000-4000-8000-000000000001','a3100000-0000-4000-8000-000000000001','a3000000-0000-4000-8000-000000000002',0,50000,'USD');

set local role authenticated;
select set_config('request.jwt.claim.sub','a1000000-0000-4000-8000-000000000003',true);
select set_config('request.jwt.claims','{"sub":"a1000000-0000-4000-8000-000000000003","aal":"aal2"}',true);
select public.post_journal_entry(
  'a3100000-0000-4000-8000-000000000001',
  'a1000000-0000-4000-8000-000000000003',
  'finance-v4-ci-post-1'
);

do $$
declare v_status public.record_status;
begin
  select status into v_status from public.journal_entries where id='a3100000-0000-4000-8000-000000000001';
  if v_status <> 'posted' then raise exception 'finance post did not complete'; end if;
end $$;
reset role;

rollback;
