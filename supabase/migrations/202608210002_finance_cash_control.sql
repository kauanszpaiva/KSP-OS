-- Finance V2 / Cash Control vertical slice.
-- Additive only. This migration does not connect a bank, move money, or infer unknown balances.

create table if not exists financial_accounts (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id),
  name text not null,
  account_kind text not null check (account_kind in ('bank','cash','card','processor','wallet','clearing','loan')),
  institution_name text,
  currency char(3) not null check (currency ~ '^[A-Z]{3}$'),
  opening_balance_minor bigint,
  opening_balance_date date,
  balance_source text not null default 'manual' check (balance_source in ('manual','statement','csv','processor')),
  status record_status not null default 'active',
  created_by uuid references profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check ((opening_balance_minor is null and opening_balance_date is null) or opening_balance_minor is not null)
);

create unique index if not exists financial_accounts_org_name_active_uidx
  on financial_accounts (organization_id, lower(name))
  where status <> 'archived';

create table if not exists cash_transactions (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id),
  financial_account_id uuid not null references financial_accounts(id),
  occurred_on date not null,
  description text not null,
  direction text not null check (direction in ('inflow','outflow')),
  amount_minor bigint not null check (amount_minor > 0),
  currency char(3) not null check (currency ~ '^[A-Z]{3}$'),
  source text not null default 'manual' check (source in ('manual','csv','statement','processor')),
  external_reference text,
  evidence_reference text,
  project_id uuid references projects(id),
  client_id uuid references client_organizations(id),
  vendor_name text,
  transfer_group_id uuid,
  reconciliation_status text not null default 'unreconciled' check (reconciliation_status in ('unreconciled','reconciled')),
  reconciled_at timestamptz,
  reconciled_by uuid references profiles(id),
  created_by uuid references profiles(id),
  created_at timestamptz not null default now(),
  check ((reconciliation_status = 'reconciled') = (reconciled_at is not null and reconciled_by is not null))
);

create index if not exists cash_transactions_account_date_idx
  on cash_transactions (financial_account_id, occurred_on desc);
create index if not exists cash_transactions_org_reconciliation_idx
  on cash_transactions (organization_id, reconciliation_status, occurred_on desc);
create index if not exists cash_transactions_project_idx
  on cash_transactions (project_id) where project_id is not null;
create index if not exists cash_transactions_client_idx
  on cash_transactions (client_id) where client_id is not null;

create table if not exists reconciliation_statements (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id),
  financial_account_id uuid not null references financial_accounts(id),
  statement_end_date date not null,
  ending_balance_minor bigint not null,
  currency char(3) not null check (currency ~ '^[A-Z]{3}$'),
  source text not null default 'statement' check (source in ('statement','csv','processor')),
  evidence_reference text,
  status text not null default 'draft' check (status in ('draft','reconciled')),
  reconciled_at timestamptz,
  reconciled_by uuid references profiles(id),
  created_by uuid references profiles(id),
  created_at timestamptz not null default now(),
  unique (financial_account_id, statement_end_date),
  check ((status = 'reconciled') = (reconciled_at is not null and reconciled_by is not null))
);

create or replace function enforce_cash_transaction_scope()
returns trigger
language plpgsql
as $$
declare
  v_org uuid;
  v_currency char(3);
begin
  select organization_id, currency into v_org, v_currency
    from financial_accounts where id = new.financial_account_id;
  if v_org is null then raise exception 'financial_account_not_found'; end if;
  if v_org <> new.organization_id then raise exception 'cash_transaction_cross_organization_account'; end if;
  if v_currency <> new.currency then raise exception 'cash_transaction_currency_mismatch'; end if;
  if new.project_id is not null and not exists (
    select 1 from projects p where p.id = new.project_id and p.organization_id = new.organization_id
  ) then raise exception 'cash_transaction_cross_organization_project'; end if;
  if new.client_id is not null and not exists (
    select 1 from client_organizations c where c.id = new.client_id and c.organization_id = new.organization_id
  ) then raise exception 'cash_transaction_cross_organization_client'; end if;
  return new;
end
$$;

drop trigger if exists cash_transactions_scope_guard on cash_transactions;
create trigger cash_transactions_scope_guard
before insert or update on cash_transactions
for each row execute function enforce_cash_transaction_scope();

create or replace function enforce_reconciliation_statement_scope()
returns trigger
language plpgsql
as $$
declare
  v_org uuid;
  v_currency char(3);
begin
  select organization_id, currency into v_org, v_currency
    from financial_accounts where id = new.financial_account_id;
  if v_org is null then raise exception 'financial_account_not_found'; end if;
  if v_org <> new.organization_id then raise exception 'reconciliation_cross_organization_account'; end if;
  if v_currency <> new.currency then raise exception 'reconciliation_currency_mismatch'; end if;
  return new;
end
$$;

drop trigger if exists reconciliation_statements_scope_guard on reconciliation_statements;
create trigger reconciliation_statements_scope_guard
before insert or update on reconciliation_statements
for each row execute function enforce_reconciliation_statement_scope();

create or replace function prevent_reconciled_cash_transaction_change()
returns trigger
language plpgsql
as $$
begin
  if old.reconciliation_status = 'reconciled' then
    raise exception 'reconciled_cash_transactions_are_immutable';
  end if;
  return new;
end
$$;

drop trigger if exists cash_transactions_reconciled_immutable on cash_transactions;
create trigger cash_transactions_reconciled_immutable
before update or delete on cash_transactions
for each row execute function prevent_reconciled_cash_transaction_change();

create or replace function prevent_reconciled_statement_change()
returns trigger
language plpgsql
as $$
begin
  if old.status = 'reconciled' then
    raise exception 'reconciled_statements_are_immutable';
  end if;
  return new;
end
$$;

drop trigger if exists reconciliation_statements_immutable on reconciliation_statements;
create trigger reconciliation_statements_immutable
before update or delete on reconciliation_statements
for each row execute function prevent_reconciled_statement_change();

create or replace function prevent_reconciled_account_basis_change()
returns trigger
language plpgsql
as $$
begin
  if exists (
    select 1 from reconciliation_statements rs
    where rs.financial_account_id = old.id and rs.status = 'reconciled'
  ) and (
    old.currency is distinct from new.currency
    or old.opening_balance_minor is distinct from new.opening_balance_minor
    or old.opening_balance_date is distinct from new.opening_balance_date
  ) then
    raise exception 'reconciled_account_basis_is_immutable';
  end if;
  new.updated_at = now();
  return new;
end
$$;

drop trigger if exists financial_accounts_reconciled_basis_guard on financial_accounts;
create trigger financial_accounts_reconciled_basis_guard
before update on financial_accounts
for each row execute function prevent_reconciled_account_basis_change();

alter table financial_accounts enable row level security;
alter table cash_transactions enable row level security;
alter table reconciliation_statements enable row level security;

create policy financial_accounts_exec_select on financial_accounts for select
  using (is_executive(organization_id));
create policy financial_accounts_exec_insert on financial_accounts for insert
  with check (is_executive(organization_id));
create policy financial_accounts_exec_update on financial_accounts for update
  using (is_executive(organization_id)) with check (is_executive(organization_id));

create policy cash_transactions_exec_select on cash_transactions for select
  using (is_executive(organization_id));
create policy cash_transactions_exec_insert on cash_transactions for insert
  with check (is_executive(organization_id));
create policy cash_transactions_exec_update on cash_transactions for update
  using (is_executive(organization_id)) with check (is_executive(organization_id));

create policy reconciliation_statements_exec_select on reconciliation_statements for select
  using (is_executive(organization_id));
create policy reconciliation_statements_exec_insert on reconciliation_statements for insert
  with check (is_executive(organization_id));
create policy reconciliation_statements_exec_update on reconciliation_statements for update
  using (is_executive(organization_id)) with check (is_executive(organization_id));

create or replace function reconcile_cash_statement(p_statement_id uuid, p_actor_id uuid)
returns uuid
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_org uuid;
  v_account uuid;
  v_end_date date;
  v_ending bigint;
  v_currency char(3);
  v_status text;
  v_opening bigint;
  v_account_currency char(3);
  v_book bigint;
begin
  if auth.uid() is null or auth.uid() <> p_actor_id then
    raise exception 'finance_actor_mismatch';
  end if;

  select organization_id, financial_account_id, statement_end_date, ending_balance_minor, currency, status
    into v_org, v_account, v_end_date, v_ending, v_currency, v_status
    from reconciliation_statements
    where id = p_statement_id
    for update;

  if v_org is null then raise exception 'reconciliation_statement_not_found'; end if;
  if not is_executive(v_org) then raise exception 'finance_access_denied'; end if;
  if v_status <> 'draft' then raise exception 'only_draft_statements_can_be_reconciled'; end if;

  select opening_balance_minor, currency
    into v_opening, v_account_currency
    from financial_accounts
    where id = v_account and organization_id = v_org;

  if v_opening is null then raise exception 'opening_balance_required_before_reconciliation'; end if;
  if v_account_currency <> v_currency then raise exception 'reconciliation_currency_mismatch'; end if;

  select v_opening + coalesce(sum(
    case when direction = 'inflow' then amount_minor else -amount_minor end
  ), 0)
  into v_book
  from cash_transactions
  where organization_id = v_org
    and financial_account_id = v_account
    and occurred_on <= v_end_date;

  if v_book <> v_ending then
    raise exception 'statement_does_not_reconcile';
  end if;

  update cash_transactions
    set reconciliation_status = 'reconciled', reconciled_at = now(), reconciled_by = p_actor_id
    where organization_id = v_org
      and financial_account_id = v_account
      and occurred_on <= v_end_date
      and reconciliation_status = 'unreconciled';

  update reconciliation_statements
    set status = 'reconciled', reconciled_at = now(), reconciled_by = p_actor_id
    where id = p_statement_id;

  insert into audit_events (organization_id, actor_id, action, target_table, target_id, classification, metadata)
    values (v_org, p_actor_id, 'finance.cash_reconciled', 'reconciliation_statements', p_statement_id, 'restricted', jsonb_build_object('account_id', v_account, 'statement_end_date', v_end_date));

  return p_statement_id;
end
$$;

revoke all on function reconcile_cash_statement(uuid, uuid) from public;
revoke all on function reconcile_cash_statement(uuid, uuid) from anon;
grant execute on function reconcile_cash_statement(uuid, uuid) to authenticated;
