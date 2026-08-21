-- Founder Second Brain: private canonical knowledge / truth layer.
-- Additive only. This migration does not promote or expose any founder-private
-- information to Company OS. Every row is owner-bound and founder-gated.

create table founder_truth_items (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id),
  owner_id uuid not null references profiles(id),
  item_type text not null
    check (item_type in ('fact','decision','assumption','question','constraint')),
  status text not null default 'unverified'
    check (status in ('verified','unverified','needs_review','conflict','stale')),
  title text not null,
  content text,
  source_label text,
  source_url text,
  source_date date,
  confidence text not null default 'medium'
    check (confidence in ('low','medium','high')),
  last_verified_at timestamptz,
  metadata jsonb not null default '{}',
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint founder_truth_title_len check (char_length(title) between 1 and 300),
  constraint founder_truth_verified_requires_time check (
    status <> 'verified' or last_verified_at is not null
  )
);

create trigger founder_truth_items_touch before update on founder_truth_items
  for each row execute function set_updated_at();

create index founder_truth_items_owner_status_idx
  on founder_truth_items (owner_id, status, updated_at desc)
  where archived_at is null;
create index founder_truth_items_owner_type_idx
  on founder_truth_items (owner_id, item_type, updated_at desc)
  where archived_at is null;

alter table founder_truth_items enable row level security;

create policy founder_truth_items_select on founder_truth_items for select
  using (owner_id = auth.uid() and is_founder(organization_id));
create policy founder_truth_items_insert on founder_truth_items for insert
  with check (owner_id = auth.uid() and is_founder(organization_id));
create policy founder_truth_items_update on founder_truth_items for update
  using (owner_id = auth.uid() and is_founder(organization_id))
  with check (owner_id = auth.uid() and is_founder(organization_id));
create policy founder_truth_items_delete on founder_truth_items for delete
  using (owner_id = auth.uid() and is_founder(organization_id));

comment on table founder_truth_items is
  'Founder-only Second Brain truth layer. Facts, decisions, assumptions, questions and constraints with explicit verification state and provenance.';
