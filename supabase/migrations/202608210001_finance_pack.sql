-- Invoices
-- `clients` was renamed to `client_organizations` in
-- 202607150002_identity_portal_finance_security.sql. Keep this later finance
-- migration aligned with the canonical post-rename relation so a clean full
-- migration replay does not depend on historical production residue.
create table invoices (
    id uuid primary key default gen_random_uuid(),
    organization_id uuid not null references organizations(id),
    client_id uuid not null references client_organizations(id),
    status record_status not null default 'draft',
    amount_minor bigint not null default 0 check (amount_minor >= 0),
    balance_minor bigint not null default 0 check (balance_minor >= 0),
    due_date date,
    issued_at timestamptz,
    created_at timestamptz not null default now()
);

create table invoice_lines (
    id uuid primary key default gen_random_uuid(),
    organization_id uuid not null references organizations(id),
    invoice_id uuid not null references invoices(id) on delete cascade,
    description text not null,
    amount_minor bigint not null default 0 check (amount_minor >= 0)
);

-- RLS for Invoices
alter table invoices enable row level security;
alter table invoice_lines enable row level security;

create policy invoices_executive_all on invoices for all using (is_executive(organization_id)) with check (is_executive(organization_id));
create policy invoice_lines_executive_all on invoice_lines for all using (is_executive(organization_id)) with check (is_executive(organization_id));

-- RLS for Journal Entries (Write Policies)
-- Read policies exist, adding Insert and Update
create policy journal_entries_insert on journal_entries for insert with check (is_executive(organization_id));
create policy journal_entries_update on journal_entries for update using (is_executive(organization_id)) with check (is_executive(organization_id));

create policy journal_lines_insert on journal_lines for insert with check (is_executive(organization_id));
create policy journal_lines_update on journal_lines for update using (is_executive(organization_id)) with check (is_executive(organization_id));

-- Update Subscriptions
alter table subscriptions add column project_id uuid references projects(id);
alter table subscriptions add column plan text;
alter table subscriptions add column notes text;
