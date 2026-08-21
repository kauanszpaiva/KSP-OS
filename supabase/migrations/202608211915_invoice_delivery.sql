-- Canonical customer invoice + email delivery foundation for KSP OS.
-- Additive production migration. It intentionally does NOT depend on Finance V2 Cash Control.

-- Refuse to silently reinterpret the older legacy invoice_lines shape if it ever exists
-- without the canonical customer_invoices table. Production preflight on 2026-08-21
-- confirmed neither table exists in appkspos.
do $$
begin
  if to_regclass('public.invoice_lines') is not null
     and to_regclass('public.customer_invoices') is null then
    raise exception 'legacy_invoice_schema_present';
  end if;
end $$;

do $$
begin
  create type invoice_status as enum (
    'draft','approved','issued','partially_paid','paid','overdue','disputed','voided','written_off'
  );
exception when duplicate_object then null;
end $$;

create table if not exists customer_invoices (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  client_organization_id uuid not null references client_organizations(id) on delete restrict,
  project_id uuid references projects(id) on delete set null,
  billing_contact_id uuid references contacts(id) on delete set null,
  billing_email text,
  invoice_number text not null unique,
  issue_date date,
  due_date date,
  amount_minor bigint not null default 0 check (amount_minor >= 0),
  currency char(3) not null default 'USD',
  status invoice_status not null default 'draft',
  issued_at timestamptz,
  url text,
  external_ref text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table customer_invoices add column if not exists billing_contact_id uuid references contacts(id) on delete set null;
alter table customer_invoices add column if not exists billing_email text;
alter table customer_invoices add column if not exists issued_at timestamptz;
alter table customer_invoices add column if not exists updated_at timestamptz not null default now();

create table if not exists invoice_lines (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  invoice_id uuid not null references customer_invoices(id) on delete cascade,
  description text not null check (length(btrim(description)) > 0),
  quantity numeric(12,2) not null default 1 check (quantity > 0),
  amount_minor bigint not null check (amount_minor > 0),
  currency char(3) not null default 'USD',
  created_at timestamptz not null default now()
);

create table if not exists customer_payments (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  invoice_id uuid not null references customer_invoices(id) on delete cascade,
  amount_minor bigint not null check (amount_minor > 0),
  currency char(3) not null default 'USD',
  payment_date date not null default current_date,
  status text not null default 'completed' check (status in ('pending','completed','failed','refunded')),
  external_ref text,
  receipt_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists invoice_email_deliveries (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  invoice_id uuid not null references customer_invoices(id) on delete cascade,
  event_type text not null default 'issued' check (event_type in ('issued','reminder','overdue','receipt')),
  recipient_email text not null,
  provider text not null default 'resend',
  provider_message_id text,
  status text not null default 'pending' check (status in ('pending','sent','failed','delivered','bounced')),
  idempotency_key text not null,
  attempt_count integer not null default 0 check (attempt_count >= 0),
  last_error text,
  sent_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(invoice_id, event_type),
  unique(idempotency_key)
);

create index if not exists customer_invoices_org_client_idx on customer_invoices(organization_id, client_organization_id, created_at desc);
create index if not exists customer_invoices_org_status_due_idx on customer_invoices(organization_id, status, due_date);
create index if not exists invoice_lines_invoice_idx on invoice_lines(invoice_id);
create index if not exists customer_payments_invoice_idx on customer_payments(invoice_id, payment_date desc);
create index if not exists invoice_email_deliveries_invoice_status_idx on invoice_email_deliveries(invoice_id, status, updated_at desc);

alter table customer_invoices enable row level security;
alter table invoice_lines enable row level security;
alter table customer_payments enable row level security;
alter table invoice_email_deliveries enable row level security;

drop policy if exists customer_invoices_executive_all on customer_invoices;
create policy customer_invoices_executive_all on customer_invoices
for all using (is_executive(organization_id)) with check (is_executive(organization_id));

drop policy if exists customer_invoices_portal_select on customer_invoices;
create policy customer_invoices_portal_select on customer_invoices
for select using (status <> 'draft' and is_portal_member(client_organization_id));

drop policy if exists invoice_lines_executive_all on invoice_lines;
create policy invoice_lines_executive_all on invoice_lines
for all using (is_executive(organization_id)) with check (is_executive(organization_id));

drop policy if exists invoice_lines_portal_select on invoice_lines;
create policy invoice_lines_portal_select on invoice_lines
for select using (
  exists (
    select 1 from customer_invoices i
    where i.id = invoice_lines.invoice_id
      and i.status <> 'draft'
      and is_portal_member(i.client_organization_id)
  )
);

drop policy if exists customer_payments_executive_all on customer_payments;
create policy customer_payments_executive_all on customer_payments
for all using (is_executive(organization_id)) with check (is_executive(organization_id));

drop policy if exists customer_payments_portal_select on customer_payments;
create policy customer_payments_portal_select on customer_payments
for select using (
  exists (
    select 1 from customer_invoices i
    where i.id = customer_payments.invoice_id
      and i.status <> 'draft'
      and is_portal_member(i.client_organization_id)
  )
);

drop policy if exists invoice_email_deliveries_executive_all on invoice_email_deliveries;
create policy invoice_email_deliveries_executive_all on invoice_email_deliveries
for all using (is_executive(organization_id)) with check (is_executive(organization_id));

-- Keep timestamps consistent with the rest of KSP OS.
drop trigger if exists trg_customer_invoices_updated_at on customer_invoices;
create trigger trg_customer_invoices_updated_at before update on customer_invoices
for each row execute function set_updated_at();

drop trigger if exists trg_customer_payments_updated_at on customer_payments;
create trigger trg_customer_payments_updated_at before update on customer_payments
for each row execute function set_updated_at();

drop trigger if exists trg_invoice_email_deliveries_updated_at on invoice_email_deliveries;
create trigger trg_invoice_email_deliveries_updated_at before update on invoice_email_deliveries
for each row execute function set_updated_at();

create or replace function invoice_schema_ready() returns boolean
language sql stable
set search_path = public, pg_temp
as $$
  select
    to_regclass('public.customer_invoices') is not null
    and to_regclass('public.invoice_lines') is not null
    and to_regclass('public.customer_payments') is not null
    and to_regclass('public.invoice_email_deliveries') is not null;
$$;

revoke all on function invoice_schema_ready() from public;
grant execute on function invoice_schema_ready() to authenticated;

create or replace function create_customer_invoice_draft(
  p_client_organization_id uuid,
  p_billing_contact_id uuid,
  p_due_date date,
  p_currency text,
  p_lines jsonb
) returns uuid
language plpgsql
set search_path = public, pg_temp
as $$
declare
  v_org uuid;
  v_email text;
  v_invoice_id uuid;
  v_invoice_number text;
  v_total bigint := 0;
  v_line jsonb;
  v_description text;
  v_amount bigint;
  v_quantity numeric(12,2);
begin
  if auth.uid() is null then raise exception 'authentication_required'; end if;

  select organization_id into v_org
  from client_organizations
  where id = p_client_organization_id;
  if v_org is null then raise exception 'client_not_found'; end if;
  if not is_executive(v_org) then raise exception 'executive_finance_access_required'; end if;

  select email into v_email
  from contacts
  where id = p_billing_contact_id
    and organization_id = v_org
    and client_id = p_client_organization_id;
  if v_email is null or position('@' in v_email) <= 1 then
    raise exception 'verified_billing_email_required';
  end if;

  if p_currency is null or p_currency !~ '^[A-Z]{3}$' then raise exception 'invalid_currency'; end if;
  if p_lines is null or jsonb_typeof(p_lines) <> 'array' or jsonb_array_length(p_lines) = 0 then
    raise exception 'invoice_lines_required';
  end if;
  if jsonb_array_length(p_lines) > 20 then raise exception 'too_many_invoice_lines'; end if;

  for v_line in select value from jsonb_array_elements(p_lines)
  loop
    v_description := btrim(coalesce(v_line->>'description',''));
    v_amount := coalesce((v_line->>'amount_minor')::bigint, 0);
    v_quantity := coalesce((v_line->>'quantity')::numeric, 1);
    if v_description = '' or v_amount <= 0 or v_quantity <= 0 then
      raise exception 'invalid_invoice_line';
    end if;
    -- amount_minor is the complete line amount; quantity is descriptive metadata.
    v_total := v_total + v_amount;
  end loop;

  v_invoice_id := gen_random_uuid();
  v_invoice_number := 'KSP-' || to_char(current_date, 'YYYYMMDD') || '-' || upper(substr(replace(v_invoice_id::text, '-', ''), 1, 8));

  insert into customer_invoices (
    id, organization_id, client_organization_id, billing_contact_id, billing_email,
    invoice_number, due_date, amount_minor, currency, status
  ) values (
    v_invoice_id, v_org, p_client_organization_id, p_billing_contact_id, lower(v_email),
    v_invoice_number, p_due_date, v_total, p_currency::char(3), 'draft'
  );

  for v_line in select value from jsonb_array_elements(p_lines)
  loop
    insert into invoice_lines (organization_id, invoice_id, description, quantity, amount_minor, currency)
    values (
      v_org,
      v_invoice_id,
      btrim(v_line->>'description'),
      coalesce((v_line->>'quantity')::numeric, 1),
      (v_line->>'amount_minor')::bigint,
      p_currency::char(3)
    );
  end loop;

  return v_invoice_id;
end;
$$;

revoke all on function create_customer_invoice_draft(uuid, uuid, date, text, jsonb) from public;
revoke all on function create_customer_invoice_draft(uuid, uuid, date, text, jsonb) from anon;
grant execute on function create_customer_invoice_draft(uuid, uuid, date, text, jsonb) to authenticated;
