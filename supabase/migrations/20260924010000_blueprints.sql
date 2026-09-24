-- Blueprints: named software/system design canvases with interactive
-- flowcharts (nodes + edges), optionally scoped to a project.
-- Additive migration; does not reset or rewrite any existing table.

create table public.blueprints (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id),
  project_id uuid references public.projects(id) on delete set null,
  name text not null check (char_length(name) between 2 and 160),
  description text not null default '' check (char_length(description) <= 4000),
  kind text not null default 'system' check (kind in ('software', 'system', 'process', 'infrastructure')),
  status text not null default 'draft' check (status in ('draft', 'active', 'archived')),
  -- Interactive flowchart canvas. Nodes carry an id, a kind, a label and a
  -- position; edges connect node ids. Shape is enforced so a malformed payload
  -- can never be persisted, with hard caps matching the editor's limits.
  canvas jsonb not null default '{"nodes": [], "edges": []}'::jsonb,
  created_by uuid not null references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint blueprints_canvas_shape check (
    jsonb_typeof(canvas) = 'object'
    and jsonb_typeof(canvas -> 'nodes') = 'array'
    and jsonb_typeof(canvas -> 'edges') = 'array'
    and jsonb_array_length(canvas -> 'nodes') <= 300
    and jsonb_array_length(canvas -> 'edges') <= 600
  )
);

create index blueprints_org_updated_idx on public.blueprints(organization_id, updated_at desc);
create index blueprints_project_idx on public.blueprints(project_id) where project_id is not null;

alter table public.blueprints enable row level security;
revoke all on public.blueprints from public, anon;
grant select, insert, update, delete on public.blueprints to authenticated;

-- Org-wide internal gate, mirroring the other operational tables: any internal
-- member of the organization may read and maintain blueprints; inserts must be
-- attributed to the acting member.
create policy blueprints_read on public.blueprints for select to authenticated
using (public.is_internal_member(organization_id));

create policy blueprints_insert on public.blueprints for insert to authenticated
with check (
  public.is_internal_member(organization_id)
  and created_by = (select auth.uid())
);

create policy blueprints_update on public.blueprints for update to authenticated
using (public.is_internal_member(organization_id))
with check (public.is_internal_member(organization_id));

create policy blueprints_delete on public.blueprints for delete to authenticated
using (public.is_internal_member(organization_id));

-- Keep updated_at honest when the canvas is saved through any SQL path.
create or replace function public.touch_blueprints_updated_at() returns trigger
language plpgsql set search_path = '' as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger blueprints_touch_updated_at before update on public.blueprints
for each row execute function public.touch_blueprints_updated_at();
