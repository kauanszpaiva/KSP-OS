-- Phase C4: Revenue, Clients, Products, Content become live modules.
-- `leads`, `contacts`, `client_organizations`, and `client_internal_notes` share the
-- now-familiar pattern found in C2 and C3: read-only RLS since the foundation/
-- identity migrations, no insert/update policy anywhere. This migration closes it
-- for the Growth-section tables and adds the two new tables Products and Content need.

alter table leads enable row level security;
alter table contacts enable row level security;
alter table client_organizations enable row level security;
alter table client_internal_notes enable row level security;

-- ---------------------------------------------------------------------------
-- leads (Revenue): any internal member can create/update their own lead; an
-- executive can manage any lead in the org.
-- ---------------------------------------------------------------------------
create policy leads_insert on leads for insert
  with check (organization_id in (select current_org_ids()) and owner_id = auth.uid());

create policy leads_update on leads for update
  using (organization_id in (select current_org_ids()) and (is_executive(organization_id) or owner_id = auth.uid()))
  with check (organization_id in (select current_org_ids()));

-- ---------------------------------------------------------------------------
-- client_organizations, contacts (Clients): write requires internal
-- membership. There is no per-row owner on either table, so scope is
-- organization-wide for internal members rather than creator-only — matching
-- how client_organizations_read (migration 2) already grants org-wide read.
-- ---------------------------------------------------------------------------
create policy client_organizations_insert on client_organizations for insert
  with check (organization_id in (select current_org_ids()));

create policy client_organizations_update on client_organizations for update
  using (organization_id in (select current_org_ids()))
  with check (organization_id in (select current_org_ids()));

create policy contacts_insert on contacts for insert
  with check (organization_id in (select current_org_ids()));

create policy contacts_update on contacts for update
  using (organization_id in (select current_org_ids()))
  with check (organization_id in (select current_org_ids()));

-- client_internal_notes: append-only from the app's perspective (no update
-- policy — corrections are a new note, not an edit to history).
create policy client_internal_notes_insert on client_internal_notes for insert
  with check (is_internal_member(organization_id) and created_by = auth.uid());

-- ---------------------------------------------------------------------------
-- products (Products): catalog of offers/services. Org-scoped, internal-write.
-- ---------------------------------------------------------------------------
create table products (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id),
  name text not null,
  description text,
  price_minor bigint check (price_minor >= 0),
  currency char(3),
  category text,
  active boolean not null default true,
  created_by uuid references profiles(id),
  created_at timestamptz not null default now()
);
create index products_org_idx on products (organization_id);

alter table products enable row level security;
create policy products_read on products for select using (organization_id in (select current_org_ids()));
create policy products_insert on products for insert with check (organization_id in (select current_org_ids()));
create policy products_update on products for update
  using (organization_id in (select current_org_ids())) with check (organization_id in (select current_org_ids()));
create policy products_delete on products for delete using (is_executive(organization_id));

-- ---------------------------------------------------------------------------
-- campaigns, content_items (Content): a campaign groups content items; both
-- are org-scoped, internal-write, mirroring the products policy shape.
-- ---------------------------------------------------------------------------
create table campaigns (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id),
  client_id uuid references client_organizations(id),
  name text not null,
  objective text,
  audience text,
  channel text,
  budget_minor bigint check (budget_minor >= 0),
  currency char(3),
  status record_status not null default 'active',
  created_by uuid references profiles(id),
  created_at timestamptz not null default now()
);
create index campaigns_org_idx on campaigns (organization_id);

create table content_items (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id),
  campaign_id uuid references campaigns(id),
  client_id uuid references client_organizations(id),
  title text not null,
  channel text not null,
  publish_date date,
  status text not null default 'idea' check (status in ('idea', 'drafting', 'internal_review', 'client_review', 'approved', 'scheduled', 'published')),
  brief_ready boolean not null default false,
  asset_ready boolean not null default false,
  rights_cleared boolean not null default false,
  caption_ready boolean not null default false,
  link text,
  created_by uuid references profiles(id),
  created_at timestamptz not null default now()
);
create index content_items_org_idx on content_items (organization_id);
create index content_items_campaign_idx on content_items (campaign_id);

alter table campaigns enable row level security;
create policy campaigns_read on campaigns for select using (organization_id in (select current_org_ids()));
create policy campaigns_insert on campaigns for insert with check (organization_id in (select current_org_ids()));
create policy campaigns_update on campaigns for update
  using (organization_id in (select current_org_ids())) with check (organization_id in (select current_org_ids()));
create policy campaigns_delete on campaigns for delete using (is_executive(organization_id));

alter table content_items enable row level security;
create policy content_items_read on content_items for select using (organization_id in (select current_org_ids()));
create policy content_items_insert on content_items for insert with check (organization_id in (select current_org_ids()));
create policy content_items_update on content_items for update
  using (organization_id in (select current_org_ids())) with check (organization_id in (select current_org_ids()));
create policy content_items_delete on content_items for delete using (is_executive(organization_id));
