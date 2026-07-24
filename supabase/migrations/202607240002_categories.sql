-- Phase C9: Categories. Missions (projects) and Workspace tasks had no way to be
-- grouped by a reusable label — only free-text `project_type` on projects and
-- nothing on tasks. This adds a small org-scoped `categories` lookup table that
-- both projects and tasks reference by nullable FK, so a team can tag work
-- ("Website", "SEO", "Retainer", …) and filter/report on it. The table follows
-- the exact policy shape of `products` (202607230003): org-scoped read/insert/
-- update, executive-only delete. Deleting a category never blocks the referenced
-- row — the FK is `on delete set null`, so the task/project simply becomes
-- uncategorised. Category management (rename/delete) stays consistent with the
-- rest of the app: any internal member can create/rename, only executives delete.

create table categories (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id),
  name text not null,
  color text,
  created_by uuid references profiles(id),
  created_at timestamptz not null default now(),
  unique (organization_id, name)
);
create index categories_org_idx on categories (organization_id);

alter table categories enable row level security;
create policy categories_read on categories for select
  using (organization_id in (select current_org_ids()));
create policy categories_insert on categories for insert
  with check (organization_id in (select current_org_ids()));
create policy categories_update on categories for update
  using (organization_id in (select current_org_ids()))
  with check (organization_id in (select current_org_ids()));
create policy categories_delete on categories for delete
  using (is_executive(organization_id));

-- Nullable category link on the two entities the request targets. `on delete
-- set null` keeps deletion of a category non-destructive to the work itself.
alter table projects add column if not exists category_id uuid references categories(id) on delete set null;
alter table tasks add column if not exists category_id uuid references categories(id) on delete set null;

create index if not exists projects_category_idx on projects (category_id);
create index if not exists tasks_category_idx on tasks (category_id);

-- The new columns are covered by the existing projects/tasks RLS policies (read/
-- insert/update/delete already scope by row, not column). Re-assert RLS on both
-- tables to document intent and satisfy the migration check.
alter table projects enable row level security;
alter table tasks enable row level security;
