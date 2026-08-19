create type invoice_status as enum ('draft', 'approved', 'issued', 'partially_paid', 'paid', 'overdue', 'disputed', 'voided', 'written_off');

create table if not exists customer_invoices (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id),
  client_organization_id uuid not null references client_organizations(id),
  project_id uuid references projects(id),
  invoice_number text not null,
  issue_date date,
  due_date date,
  amount_minor bigint not null check (amount_minor >= 0),
  currency char(3) not null,
  status invoice_status not null default 'draft',
  url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(organization_id, invoice_number)
);

create trigger customer_invoices_touch before update on customer_invoices
  for each row execute function set_updated_at();

create table if not exists invoice_lines (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id),
  invoice_id uuid not null references customer_invoices(id) on delete cascade,
  description text not null,
  amount_minor bigint not null check (amount_minor >= 0),
  quantity numeric(10,2) not null default 1,
  currency char(3) not null
);

create table if not exists customer_payments (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id),
  invoice_id uuid not null references customer_invoices(id) on delete restrict,
  amount_minor bigint not null check (amount_minor > 0),
  currency char(3) not null,
  payment_date date not null,
  status text not null default 'completed',
  receipt_url text,
  created_at timestamptz not null default now()
);

-- RLS
alter table customer_invoices enable row level security;
alter table invoice_lines enable row level security;
alter table customer_payments enable row level security;

-- Internal members can read and manage all invoices
create policy customer_invoices_internal_all on customer_invoices for all
  using (is_internal_member(organization_id)) with check (is_internal_member(organization_id));

create policy invoice_lines_internal_all on invoice_lines for all
  using (is_internal_member(organization_id)) with check (is_internal_member(organization_id));

create policy customer_payments_internal_all on customer_payments for all
  using (is_internal_member(organization_id)) with check (is_internal_member(organization_id));

-- Portal members (clients) can only read issued/paid/overdue/partially_paid invoices linked to their org
create policy customer_invoices_portal_read on customer_invoices for select
  using (
    status in ('issued', 'paid', 'overdue', 'partially_paid')
    and is_portal_member(client_organization_id)
  );

create policy invoice_lines_portal_read on invoice_lines for select
  using (
    exists (
      select 1 from customer_invoices ci
      where ci.id = invoice_lines.invoice_id
      and ci.status in ('issued', 'paid', 'overdue', 'partially_paid')
      and is_portal_member(ci.client_organization_id)
    )
  );

create policy customer_payments_portal_read on customer_payments for select
  using (
    exists (
      select 1 from customer_invoices ci
      where ci.id = customer_payments.invoice_id
      and ci.status in ('issued', 'paid', 'overdue', 'partially_paid')
      and is_portal_member(ci.client_organization_id)
    )
  );
