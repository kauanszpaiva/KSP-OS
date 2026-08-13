-- Founder OS foundation: founder-private capture, private work, and an audited
-- private->company promotion ledger. Additive only.
--
-- Privacy model (identical to the existing founder_vault_entries table):
--   every row is owner-bound and founder-gated. RLS requires BOTH
--     owner_id = auth.uid()            (the authenticated principal owns the row)
--     AND is_founder(organization_id)  (the authoritative founder-role helper)
-- No email/UUID hardcoding. Reuses is_founder() and set_updated_at() from
-- 202607210001_operational_slice.sql. These tables are referenced by NO other
-- policy, so they are invisible to every company/client/team/search/analytics
-- surface by construction — exactly as founder_vault_entries is.
--
-- Distinct from the company `inbox_items` and `tasks` tables (foundation
-- migration), which are internal-member-visible. Founder OS never reuses those
-- for private data; it references company work read-only where appropriate.

-- ---------------------------------------------------------------------------
-- founder_inbox_items: universal private capture layer.
-- ---------------------------------------------------------------------------
create table founder_inbox_items (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id),
  owner_id uuid not null references profiles(id),
  item_type text not null default 'note'
    check (item_type in (
      'note','idea','task','opportunity','person','link',
      'project_thought','reminder','financial_thought','learning_item','other'
    )),
  title text not null,
  body text,
  triage_status text not null default 'captured'
    check (triage_status in ('captured','triaged','promoted','archived')),
  -- Set when the item is converted/promoted into another record (private or
  -- company). Points at the produced row for provenance; never overwritten by
  -- later private edits.
  target_table text,
  target_id uuid,
  metadata jsonb not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint founder_inbox_title_len check (char_length(title) between 1 and 300),
  constraint founder_inbox_target_pair check ((target_table is null) = (target_id is null))
);
create trigger founder_inbox_items_touch before update on founder_inbox_items
  for each row execute function set_updated_at();
create index founder_inbox_items_owner_status_idx
  on founder_inbox_items (owner_id, triage_status, created_at desc);

-- ---------------------------------------------------------------------------
-- founder_tasks: private personal work. Company tasks live in `commitments`
-- and are referenced read-only in "My Work" — never duplicated here.
-- ---------------------------------------------------------------------------
create table founder_tasks (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id),
  owner_id uuid not null references profiles(id),
  title text not null,
  notes text,
  status text not null default 'open'
    check (status in ('open','in_progress','waiting','done','archived')),
  priority text not null default 'normal'
    check (priority in ('low','normal','high')),
  due_date date,
  -- Free-text "who/what this is blocked on" for the Waiting bucket.
  waiting_on text,
  -- Provenance when a task was created from an inbox capture. SET NULL on inbox
  -- delete so the task survives independently.
  source_inbox_id uuid references founder_inbox_items(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint founder_tasks_title_len check (char_length(title) between 1 and 300),
  constraint founder_tasks_waiting_has_context
    check (status <> 'waiting' or waiting_on is not null)
);
create trigger founder_tasks_touch before update on founder_tasks
  for each row execute function set_updated_at();
create index founder_tasks_owner_status_idx
  on founder_tasks (owner_id, status, due_date);

-- ---------------------------------------------------------------------------
-- founder_promotions: append-only ledger of explicit private->company
-- promotions. Provides idempotency (a given private source promotes into a
-- given company table at most once) and an audit trail that does NOT expose the
-- private body -- only the fields the founder chose to make company-visible.
-- ---------------------------------------------------------------------------
create table founder_promotions (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id),
  owner_id uuid not null references profiles(id),
  source_table text not null
    check (source_table in ('founder_inbox_items','founder_tasks','founder_vault_entries')),
  source_id uuid not null,
  target_table text not null,
  target_id uuid not null,
  -- Snapshot of exactly the fields that crossed the boundary. Company-visible
  -- content only; never the full private record.
  fields jsonb not null default '{}',
  created_at timestamptz not null default now(),
  constraint founder_promotions_unique unique (source_table, source_id, target_table)
);
create index founder_promotions_owner_idx
  on founder_promotions (owner_id, source_table, source_id);

-- ---------------------------------------------------------------------------
-- Row Level Security -- founder-only, own rows only. Mirrors founder_vault.
-- ---------------------------------------------------------------------------
alter table founder_inbox_items enable row level security;
alter table founder_tasks enable row level security;
alter table founder_promotions enable row level security;

-- founder_inbox_items
create policy founder_inbox_items_select on founder_inbox_items for select
  using (owner_id = auth.uid() and is_founder(organization_id));
create policy founder_inbox_items_insert on founder_inbox_items for insert
  with check (owner_id = auth.uid() and is_founder(organization_id));
create policy founder_inbox_items_update on founder_inbox_items for update
  using (owner_id = auth.uid() and is_founder(organization_id))
  with check (owner_id = auth.uid() and is_founder(organization_id));
create policy founder_inbox_items_delete on founder_inbox_items for delete
  using (owner_id = auth.uid() and is_founder(organization_id));

-- founder_tasks
create policy founder_tasks_select on founder_tasks for select
  using (owner_id = auth.uid() and is_founder(organization_id));
create policy founder_tasks_insert on founder_tasks for insert
  with check (owner_id = auth.uid() and is_founder(organization_id));
create policy founder_tasks_update on founder_tasks for update
  using (owner_id = auth.uid() and is_founder(organization_id))
  with check (owner_id = auth.uid() and is_founder(organization_id));
create policy founder_tasks_delete on founder_tasks for delete
  using (owner_id = auth.uid() and is_founder(organization_id));

-- founder_promotions: founder reads/creates own; append-only (no update/delete
-- policy -> immutable audit trail under RLS, same shape as activity_events).
create policy founder_promotions_select on founder_promotions for select
  using (owner_id = auth.uid() and is_founder(organization_id));
create policy founder_promotions_insert on founder_promotions for insert
  with check (owner_id = auth.uid() and is_founder(organization_id));
