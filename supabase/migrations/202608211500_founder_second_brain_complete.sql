-- Founder Second Brain: verified knowledge, sources, context packs and AI handoffs.
-- Additive only. All rows are both owner-bound and founder-gated.
--
-- This deliberately does not duplicate company projects, tasks, clients or Canon.
-- Founder-private ideas/project thoughts remain in founder_inbox_items; company
-- data is referenced read-only from the existing Company OS surfaces.

-- ---------------------------------------------------------------------------
-- founder_truth_items: explicit claims with verification state + provenance.
-- ---------------------------------------------------------------------------
create table founder_truth_items (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id),
  owner_id uuid not null references profiles(id),
  item_type text not null default 'fact'
    check (item_type in ('fact','decision','assumption','question','constraint')),
  title text not null,
  content text,
  status text not null default 'unverified'
    check (status in ('verified','unverified','needs_review','conflict','stale')),
  confidence text not null default 'medium'
    check (confidence in ('low','medium','high')),
  source_label text,
  source_url text,
  source_date date,
  last_verified_at timestamptz,
  metadata jsonb not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint founder_truth_title_len check (char_length(title) between 1 and 300),
  constraint founder_truth_source_url_len check (source_url is null or char_length(source_url) <= 2048)
);
create trigger founder_truth_items_touch before update on founder_truth_items
  for each row execute function set_updated_at();
create index founder_truth_items_owner_status_idx
  on founder_truth_items (owner_id, status, updated_at desc);
create index founder_truth_items_owner_type_idx
  on founder_truth_items (owner_id, item_type, updated_at desc);

-- ---------------------------------------------------------------------------
-- founder_sources: normalized provenance catalog. Locator is data, never code.
-- ---------------------------------------------------------------------------
create table founder_sources (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id),
  owner_id uuid not null references profiles(id),
  source_type text not null default 'other'
    check (source_type in ('web','drive','github','email','document','conversation','note','other')),
  title text not null,
  locator text,
  summary text,
  trust_status text not null default 'unverified'
    check (trust_status in ('primary','trusted','unverified','conflict')),
  source_date date,
  metadata jsonb not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint founder_sources_title_len check (char_length(title) between 1 and 300),
  constraint founder_sources_locator_len check (locator is null or char_length(locator) <= 2048)
);
create trigger founder_sources_touch before update on founder_sources
  for each row execute function set_updated_at();
create index founder_sources_owner_trust_idx
  on founder_sources (owner_id, trust_status, updated_at desc);
create index founder_sources_owner_type_idx
  on founder_sources (owner_id, source_type, updated_at desc);

-- ---------------------------------------------------------------------------
-- founder_context_packs: compact, reusable context prepared for an AI/job.
-- ---------------------------------------------------------------------------
create table founder_context_packs (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id),
  owner_id uuid not null references profiles(id),
  title text not null,
  purpose text,
  content text not null default '',
  status text not null default 'active'
    check (status in ('active','archived')),
  metadata jsonb not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint founder_context_packs_title_len check (char_length(title) between 1 and 300)
);
create trigger founder_context_packs_touch before update on founder_context_packs
  for each row execute function set_updated_at();
create index founder_context_packs_owner_status_idx
  on founder_context_packs (owner_id, status, updated_at desc);

-- Optional provenance links for a context pack. The RLS insert policy below
-- additionally proves that BOTH parent rows belong to this same owner/org.
create table founder_context_pack_sources (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id),
  owner_id uuid not null references profiles(id),
  context_pack_id uuid not null references founder_context_packs(id) on delete cascade,
  source_id uuid not null references founder_sources(id) on delete cascade,
  created_at timestamptz not null default now(),
  constraint founder_context_pack_sources_unique unique (context_pack_id, source_id)
);
create index founder_context_pack_sources_owner_idx
  on founder_context_pack_sources (owner_id, context_pack_id);

-- ---------------------------------------------------------------------------
-- founder_handoffs: explicit work/context transfer between AI operators.
-- ---------------------------------------------------------------------------
create table founder_handoffs (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id),
  owner_id uuid not null references profiles(id),
  title text not null,
  from_agent text not null default 'Kauan',
  to_agent text not null,
  objective text not null,
  context_pack_id uuid references founder_context_packs(id) on delete set null,
  instructions text,
  output text,
  status text not null default 'draft'
    check (status in ('draft','ready','claimed','done','blocked','cancelled')),
  claimed_by text,
  metadata jsonb not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint founder_handoffs_title_len check (char_length(title) between 1 and 300),
  constraint founder_handoffs_agent_len check (char_length(to_agent) between 1 and 120)
);
create trigger founder_handoffs_touch before update on founder_handoffs
  for each row execute function set_updated_at();
create index founder_handoffs_owner_status_idx
  on founder_handoffs (owner_id, status, updated_at desc);
create index founder_handoffs_owner_agent_idx
  on founder_handoffs (owner_id, to_agent, updated_at desc);

-- ---------------------------------------------------------------------------
-- Row Level Security: the authenticated principal must own the row AND be the
-- founder for its organization. No service-role application path uses these.
-- Relationship writes also prove parent ownership so a known UUID can never
-- create a cross-owner/cross-organization link.
-- ---------------------------------------------------------------------------
alter table founder_truth_items enable row level security;
alter table founder_sources enable row level security;
alter table founder_context_packs enable row level security;
alter table founder_context_pack_sources enable row level security;
alter table founder_handoffs enable row level security;

create policy founder_truth_select on founder_truth_items for select
  using (owner_id = auth.uid() and is_founder(organization_id));
create policy founder_truth_insert on founder_truth_items for insert
  with check (owner_id = auth.uid() and is_founder(organization_id));
create policy founder_truth_update on founder_truth_items for update
  using (owner_id = auth.uid() and is_founder(organization_id))
  with check (owner_id = auth.uid() and is_founder(organization_id));
create policy founder_truth_delete on founder_truth_items for delete
  using (owner_id = auth.uid() and is_founder(organization_id));

create policy founder_sources_select on founder_sources for select
  using (owner_id = auth.uid() and is_founder(organization_id));
create policy founder_sources_insert on founder_sources for insert
  with check (owner_id = auth.uid() and is_founder(organization_id));
create policy founder_sources_update on founder_sources for update
  using (owner_id = auth.uid() and is_founder(organization_id))
  with check (owner_id = auth.uid() and is_founder(organization_id));
create policy founder_sources_delete on founder_sources for delete
  using (owner_id = auth.uid() and is_founder(organization_id));

create policy founder_context_packs_select on founder_context_packs for select
  using (owner_id = auth.uid() and is_founder(organization_id));
create policy founder_context_packs_insert on founder_context_packs for insert
  with check (owner_id = auth.uid() and is_founder(organization_id));
create policy founder_context_packs_update on founder_context_packs for update
  using (owner_id = auth.uid() and is_founder(organization_id))
  with check (owner_id = auth.uid() and is_founder(organization_id));
create policy founder_context_packs_delete on founder_context_packs for delete
  using (owner_id = auth.uid() and is_founder(organization_id));

create policy founder_context_pack_sources_select on founder_context_pack_sources for select
  using (owner_id = auth.uid() and is_founder(organization_id));
create policy founder_context_pack_sources_insert on founder_context_pack_sources for insert
  with check (
    owner_id = auth.uid()
    and is_founder(organization_id)
    and exists (
      select 1
      from founder_context_packs p
      where p.id = founder_context_pack_sources.context_pack_id
        and p.organization_id = founder_context_pack_sources.organization_id
        and p.owner_id = founder_context_pack_sources.owner_id
    )
    and exists (
      select 1
      from founder_sources s
      where s.id = founder_context_pack_sources.source_id
        and s.organization_id = founder_context_pack_sources.organization_id
        and s.owner_id = founder_context_pack_sources.owner_id
    )
  );
create policy founder_context_pack_sources_delete on founder_context_pack_sources for delete
  using (owner_id = auth.uid() and is_founder(organization_id));

create policy founder_handoffs_select on founder_handoffs for select
  using (owner_id = auth.uid() and is_founder(organization_id));
create policy founder_handoffs_insert on founder_handoffs for insert
  with check (
    owner_id = auth.uid()
    and is_founder(organization_id)
    and (
      context_pack_id is null
      or exists (
        select 1
        from founder_context_packs p
        where p.id = founder_handoffs.context_pack_id
          and p.organization_id = founder_handoffs.organization_id
          and p.owner_id = founder_handoffs.owner_id
      )
    )
  );
create policy founder_handoffs_update on founder_handoffs for update
  using (owner_id = auth.uid() and is_founder(organization_id))
  with check (
    owner_id = auth.uid()
    and is_founder(organization_id)
    and (
      context_pack_id is null
      or exists (
        select 1
        from founder_context_packs p
        where p.id = founder_handoffs.context_pack_id
          and p.organization_id = founder_handoffs.organization_id
          and p.owner_id = founder_handoffs.owner_id
      )
    )
  );
create policy founder_handoffs_delete on founder_handoffs for delete
  using (owner_id = auth.uid() and is_founder(organization_id));
