-- KSP OS business-unit foundation.
--
-- Purpose:
-- - keep one KSP OS while separating operating divisions such as KSP Dominion Group
--   and KSP Agency;
-- - preserve the existing project/member access model during migration;
-- - let future KSP divisions be added as data rather than new application forks.
--
-- This migration is additive. Existing projects remain unclassified until an
-- executive assigns them to a business unit. Once a project is classified,
-- existing project members are automatically inherited into that unit so the
-- classification cannot silently lock out people who already had legitimate access.

create table if not exists public.business_units (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  parent_business_unit_id uuid references public.business_units(id) on delete set null,
  key text not null,
  name text not null,
  focus text,
  status text not null default 'active' check (status in ('active', 'inactive', 'archived')),
  sort_order integer not null default 100,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, key),
  check (key ~ '^[a-z0-9][a-z0-9_-]{1,62}$')
);

create table if not exists public.business_unit_memberships (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  business_unit_id uuid not null references public.business_units(id) on delete cascade,
  profile_id uuid not null references public.profiles(id) on delete cascade,
  access_level text not null default 'member' check (access_level in ('owner', 'admin', 'member', 'viewer')),
  effective_from timestamptz not null default now(),
  effective_until timestamptz,
  suspended_at timestamptz,
  granted_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  unique (business_unit_id, profile_id),
  check (effective_until is null or effective_until > effective_from)
);

alter table public.projects
  add column if not exists business_unit_id uuid references public.business_units(id) on delete set null;

create index if not exists business_units_org_status_idx
  on public.business_units (organization_id, status, sort_order, name);
create index if not exists business_unit_memberships_profile_idx
  on public.business_unit_memberships (profile_id, business_unit_id)
  where suspended_at is null;
create index if not exists projects_business_unit_idx
  on public.projects (business_unit_id, status)
  where business_unit_id is not null;

alter table public.business_units enable row level security;
alter table public.business_unit_memberships enable row level security;

-- Current Supabase Data API projects may require explicit table grants in addition
-- to RLS. RLS below remains the authorization boundary.
grant select, insert, update, delete on public.business_units to authenticated;
grant select, insert, update, delete on public.business_unit_memberships to authenticated;

-- Seed the two operating divisions explicitly requested for KSP OS. They are
-- application operating units, not a legal-entity assertion. Future divisions use
-- the same table and require no schema change.
insert into public.business_units (organization_id, key, name, focus, sort_order)
select id, 'dominion', 'KSP Dominion Group', 'Software, systems, applications, automation and AI', 10
from public.organizations
where status = 'active'
on conflict (organization_id, key) do update
  set name = excluded.name,
      focus = excluded.focus,
      sort_order = excluded.sort_order,
      updated_at = now();

insert into public.business_units (organization_id, key, name, focus, sort_order)
select id, 'agency', 'KSP Agency', 'Creative media, marketing, campaigns, landing pages and content production', 20
from public.organizations
where status = 'active'
on conflict (organization_id, key) do update
  set name = excluded.name,
      focus = excluded.focus,
      sort_order = excluded.sort_order,
      updated_at = now();

create or replace function public.can_access_business_unit(target_business_unit_id uuid)
returns boolean
language sql
stable
security definer
set search_path = 'pg_catalog', 'public'
as $$
  select exists (
    select 1
    from public.business_units bu
    where bu.id = target_business_unit_id
      and bu.status = 'active'
      and (
        public.is_executive(bu.organization_id)
        or exists (
          select 1
          from public.business_unit_memberships bum
          where bum.business_unit_id = bu.id
            and bum.organization_id = bu.organization_id
            and bum.profile_id = auth.uid()
            and bum.suspended_at is null
            and bum.effective_from <= now()
            and (bum.effective_until is null or bum.effective_until > now())
        )
      )
  );
$$;

revoke all on function public.can_access_business_unit(uuid) from public;
revoke all on function public.can_access_business_unit(uuid) from anon;
grant execute on function public.can_access_business_unit(uuid) to authenticated;

-- Unit catalog: executives see all; everyone else sees only units they belong to.
drop policy if exists business_units_read on public.business_units;
create policy business_units_read on public.business_units
for select to authenticated
using (
  public.is_executive(organization_id)
  or exists (
    select 1
    from public.business_unit_memberships bum
    where bum.business_unit_id = business_units.id
      and bum.profile_id = auth.uid()
      and bum.suspended_at is null
      and bum.effective_from <= now()
      and (bum.effective_until is null or bum.effective_until > now())
  )
);

drop policy if exists business_units_insert on public.business_units;
create policy business_units_insert on public.business_units
for insert to authenticated
with check (public.is_executive(organization_id));

drop policy if exists business_units_update on public.business_units;
create policy business_units_update on public.business_units
for update to authenticated
using (public.is_executive(organization_id))
with check (public.is_executive(organization_id));

drop policy if exists business_units_delete on public.business_units;
create policy business_units_delete on public.business_units
for delete to authenticated
using (public.is_executive(organization_id));

-- Memberships: a user may inspect their own unit memberships; executives can
-- inspect and administer all memberships in their organization.
drop policy if exists business_unit_memberships_read on public.business_unit_memberships;
create policy business_unit_memberships_read on public.business_unit_memberships
for select to authenticated
using (profile_id = auth.uid() or public.is_executive(organization_id));

drop policy if exists business_unit_memberships_insert on public.business_unit_memberships;
create policy business_unit_memberships_insert on public.business_unit_memberships
for insert to authenticated
with check (public.is_executive(organization_id));

drop policy if exists business_unit_memberships_update on public.business_unit_memberships;
create policy business_unit_memberships_update on public.business_unit_memberships
for update to authenticated
using (public.is_executive(organization_id))
with check (public.is_executive(organization_id));

drop policy if exists business_unit_memberships_delete on public.business_unit_memberships;
create policy business_unit_memberships_delete on public.business_unit_memberships
for delete to authenticated
using (public.is_executive(organization_id));

-- Classified internal projects require both the existing project entitlement and
-- access to the assigned business unit. Legacy/unclassified projects preserve the
-- exact prior behavior. Portal policy is intentionally unchanged: client access is
-- still governed by client/project publication rules, not internal unit membership.
drop policy if exists projects_member_read on public.projects;
create policy projects_member_read on public.projects
for select to authenticated
using (
  organization_id in (select public.current_org_ids())
  and (public.is_executive(organization_id) or public.can_access_project(id))
  and (business_unit_id is null or public.can_access_business_unit(business_unit_id))
);

drop policy if exists projects_insert on public.projects;
create policy projects_insert on public.projects
for insert to authenticated
with check (
  organization_id in (select public.current_org_ids())
  and (business_unit_id is null or public.can_access_business_unit(business_unit_id))
);

drop policy if exists projects_update on public.projects;
create policy projects_update on public.projects
for update to authenticated
using (
  organization_id in (select public.current_org_ids())
  and (public.is_executive(organization_id) or public.can_access_project(id))
  and (business_unit_id is null or public.can_access_business_unit(business_unit_id))
)
with check (
  organization_id in (select public.current_org_ids())
  and (business_unit_id is null or public.can_access_business_unit(business_unit_id))
);

-- Compatibility bridge: when an existing project is classified, inherit its
-- current members into that unit. When a new project member is assigned later,
-- inherit the unit membership too. We deliberately do not auto-revoke unit access
-- when one project link is removed because the person may still need that unit via
-- another project; revocation remains an explicit audited access-control action.
create or replace function public.ksp_sync_project_business_unit_membership()
returns trigger
language plpgsql
security definer
set search_path = 'pg_catalog', 'public'
as $$
begin
  if tg_table_name = 'projects' then
    if new.business_unit_id is not null and new.business_unit_id is distinct from old.business_unit_id then
      insert into public.business_unit_memberships (
        organization_id,
        business_unit_id,
        profile_id,
        access_level,
        granted_by
      )
      select new.organization_id, new.business_unit_id, pm.profile_id, 'member', auth.uid()
      from public.project_memberships pm
      where pm.project_id = new.id
      on conflict (business_unit_id, profile_id) do update
        set suspended_at = null,
            effective_until = null;
    end if;
    return new;
  end if;

  if tg_table_name = 'project_memberships' then
    insert into public.business_unit_memberships (
      organization_id,
      business_unit_id,
      profile_id,
      access_level,
      granted_by
    )
    select p.organization_id, p.business_unit_id, new.profile_id, 'member', auth.uid()
    from public.projects p
    where p.id = new.project_id
      and p.business_unit_id is not null
    on conflict (business_unit_id, profile_id) do update
      set suspended_at = null,
          effective_until = null;
    return new;
  end if;

  return new;
end;
$$;

revoke all on function public.ksp_sync_project_business_unit_membership() from public;
revoke all on function public.ksp_sync_project_business_unit_membership() from anon;

-- Projects trigger only needs UPDATE because the current create flow stays
-- unclassified until an executive chooses the unit.
drop trigger if exists ksp_projects_business_unit_membership_sync on public.projects;
create trigger ksp_projects_business_unit_membership_sync
after update of business_unit_id on public.projects
for each row execute function public.ksp_sync_project_business_unit_membership();

drop trigger if exists ksp_project_memberships_business_unit_sync on public.project_memberships;
create trigger ksp_project_memberships_business_unit_sync
after insert on public.project_memberships
for each row execute function public.ksp_sync_project_business_unit_membership();