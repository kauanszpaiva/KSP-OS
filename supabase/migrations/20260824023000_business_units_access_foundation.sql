-- KSP OS business-unit foundation.
--
-- Purpose:
-- - keep one KSP OS while separating operating divisions such as KSP Dominion Group
--   and KSP Agency;
-- - preserve the existing project/member access model during migration;
-- - let future KSP divisions be added as data rather than new application forks.
--
-- This migration is additive. Existing projects remain unclassified until an
-- executive assigns them to a business unit. New projects, however, must be
-- classified at creation time. Once a legacy project is classified, existing
-- non-executive project members are automatically inherited into that unit so
-- classification cannot silently lock out legitimate current access.

create schema if not exists business_unit_private;
revoke all on schema business_unit_private from public;
revoke all on schema business_unit_private from anon;
grant usage on schema business_unit_private to authenticated;

create table if not exists public.business_units (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  key text not null,
  name text not null,
  focus text,
  status text not null default 'active' check (status in ('active', 'inactive', 'archived')),
  sort_order integer not null default 100,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, key),
  unique (id, organization_id),
  check (key ~ '^[a-z0-9][a-z0-9_-]{1,62}$')
);

create table if not exists public.business_unit_memberships (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  business_unit_id uuid not null,
  profile_id uuid not null references public.profiles(id) on delete cascade,
  access_level text not null default 'member' check (access_level in ('owner', 'admin', 'member', 'viewer')),
  effective_from timestamptz not null default now(),
  effective_until timestamptz,
  suspended_at timestamptz,
  granted_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  unique (business_unit_id, profile_id),
  constraint business_unit_memberships_unit_org_fkey
    foreign key (business_unit_id, organization_id)
    references public.business_units(id, organization_id)
    on delete cascade,
  check (effective_until is null or effective_until > effective_from)
);

alter table public.projects
  add column if not exists business_unit_id uuid;

alter table public.projects
  add constraint projects_business_unit_org_fkey
  foreign key (business_unit_id, organization_id)
  references public.business_units(id, organization_id)
  on delete restrict;

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

-- Existing organization authorization helpers historically ignored effective_from,
-- which meant a scheduled future membership could become usable immediately. Keep
-- their public contracts intact while making the validity window symmetric.
create or replace function public.current_org_ids()
returns setof uuid
language sql
stable
security definer
set search_path = ''
as $$
  select om.organization_id
  from public.organization_memberships om
  where om.profile_id = auth.uid()
    and om.suspended_at is null
    and om.effective_from <= now()
    and (om.effective_until is null or om.effective_until > now());
$$;

create or replace function public.is_internal_member(org uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.organization_memberships om
    where om.profile_id = auth.uid()
      and om.organization_id = org
      and om.internal_role is not null
      and om.suspended_at is null
      and om.effective_from <= now()
      and (om.effective_until is null or om.effective_until > now())
  );
$$;

create or replace function public.is_executive(org uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.organization_memberships om
    where om.profile_id = auth.uid()
      and om.organization_id = org
      and om.internal_role in ('founder_ceo', 'executive_operations')
      and om.suspended_at is null
      and om.effective_from <= now()
      and (om.effective_until is null or om.effective_until > now())
  );
$$;

-- The existing helper also needs to honor the start date of project access grants.
create or replace function public.has_project_access(pid uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.project_memberships pm
    where pm.profile_id = auth.uid()
      and pm.project_id = pid
      and (pm.effective_until is null or pm.effective_until > now())
  ) or exists (
    select 1
    from public.project_access_grants pag
    where pag.profile_id = auth.uid()
      and pag.project_id = pid
      and pag.revoked_at is null
      and pag.effective_from <= now()
      and (pag.effective_until is null or pag.effective_until > now())
  );
$$;

-- Keep the authorization helper outside exposed schemas. It intentionally runs
-- as definer so RLS on the membership table cannot recursively hide the rows used
-- to evaluate RLS itself. Every identifier is schema-qualified and search_path is
-- empty; the function still authorizes against auth.uid() for every call.
create or replace function business_unit_private.can_access_business_unit(target_business_unit_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
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

revoke all on function business_unit_private.can_access_business_unit(uuid) from public;
revoke all on function business_unit_private.can_access_business_unit(uuid) from anon;
grant execute on function business_unit_private.can_access_business_unit(uuid) to authenticated;

-- Creating a project is stronger than merely seeing a business unit. Executives
-- may create everywhere. A unit owner/admin may create inside that unit. An
-- organization-wide project.manage grant may also create, but only where the user
-- already has active business-unit visibility. Member/viewer scope alone is not
-- project-creation authority.
create or replace function business_unit_private.can_create_project_in_business_unit(target_business_unit_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.business_units bu
    where bu.id = target_business_unit_id
      and bu.status = 'active'
      and business_unit_private.can_access_business_unit(bu.id)
      and (
        public.is_executive(bu.organization_id)
        or exists (
          select 1
          from public.business_unit_memberships bum
          where bum.business_unit_id = bu.id
            and bum.organization_id = bu.organization_id
            and bum.profile_id = auth.uid()
            and bum.access_level in ('owner', 'admin')
            and bum.suspended_at is null
            and bum.effective_from <= now()
            and (bum.effective_until is null or bum.effective_until > now())
        )
        or exists (
          select 1
          from public.internal_permission_grants ipg
          where ipg.organization_id = bu.organization_id
            and ipg.profile_id = auth.uid()
            and ipg.action = 'project.manage'::public.permission_action
            and ipg.resource_type is null
            and ipg.resource_id is null
            and ipg.revoked_at is null
            and ipg.effective_from <= now()
            and (ipg.effective_until is null or ipg.effective_until > now())
        )
      )
  );
$$;

revoke all on function business_unit_private.can_create_project_in_business_unit(uuid) from public;
revoke all on function business_unit_private.can_create_project_in_business_unit(uuid) from anon;
grant execute on function business_unit_private.can_create_project_in_business_unit(uuid) to authenticated;

-- Centralize the new boundary in can_access_project because project-owned tables
-- throughout KSP OS already depend on this helper. That means revoking a person's
-- division membership blocks not only the Projects page but downstream project
-- data reached by direct URL/API as well. Unclassified legacy projects retain the
-- previous membership-only behavior during the backfill window.
create or replace function public.can_access_project(pid uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.project_memberships pm
    join public.projects p
      on p.id = pm.project_id
     and p.organization_id = pm.organization_id
    where pm.project_id = pid
      and pm.profile_id = auth.uid()
      and (pm.effective_until is null or pm.effective_until > now())
      and (
        p.business_unit_id is null
        or business_unit_private.can_access_business_unit(p.business_unit_id)
      )
  );
$$;

revoke all on function public.can_access_project(uuid) from public;
revoke all on function public.can_access_project(uuid) from anon;
grant execute on function public.can_access_project(uuid) to authenticated;
grant execute on function public.can_access_project(uuid) to service_role;

-- Unit catalog: executives see all; everyone else sees only units they belong to.
drop policy if exists business_units_read on public.business_units;
create policy business_units_read on public.business_units
for select to authenticated
using (
  public.is_executive(organization_id)
  or business_unit_private.can_access_business_unit(id)
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

-- Portal-only users need to hydrate their own fine-grained client grants. The
-- existing internal-read policy remains untouched; this additional policy exposes
-- only active grants whose client organization also has an active membership for
-- the same signed-in profile. It does not expose another client's grants and does
-- not grant access by itself: publication/classification checks still run in the
-- application permission engine and resource RLS.
drop policy if exists client_permission_grants_self_portal_read on public.client_permission_grants;
create policy client_permission_grants_self_portal_read on public.client_permission_grants
for select to authenticated
using (
  profile_id = auth.uid()
  and revoked_at is null
  and effective_from <= now()
  and (effective_until is null or effective_until > now())
  and exists (
    select 1
    from public.client_memberships cm
    where cm.organization_id = client_permission_grants.organization_id
      and cm.client_organization_id = client_permission_grants.client_organization_id
      and cm.profile_id = auth.uid()
      and cm.suspended_at is null
      and cm.effective_from <= now()
      and (cm.effective_until is null or cm.effective_until > now())
  )
);

-- Classified internal projects require both the existing project entitlement and
-- access to the assigned business unit through the central helper above. Portal
-- policy is intentionally unchanged: client access is still governed by client /
-- project publication rules, not internal division membership.
drop policy if exists projects_member_read on public.projects;
create policy projects_member_read on public.projects
for select to authenticated
using (
  organization_id in (select public.current_org_ids())
  and (public.is_executive(organization_id) or public.can_access_project(id))
);

-- New projects must always be classified. Direct REST/API callers cannot bypass
-- the division picker by omitting business_unit_id, and plain member/viewer scope
-- is not sufficient project-creation authority.
drop policy if exists projects_insert on public.projects;
create policy projects_insert on public.projects
for insert to authenticated
with check (
  organization_id in (select public.current_org_ids())
  and business_unit_id is not null
  and business_unit_private.can_create_project_in_business_unit(business_unit_id)
);

drop policy if exists projects_update on public.projects;
create policy projects_update on public.projects
for update to authenticated
using (
  organization_id in (select public.current_org_ids())
  and (public.is_executive(organization_id) or public.can_access_project(id))
)
with check (
  organization_id in (select public.current_org_ids())
  and (
    business_unit_id is null
    or public.is_executive(organization_id)
    or business_unit_private.can_access_business_unit(business_unit_id)
  )
);

-- Changing the division of an existing project is a structural operation, not a
-- normal project edit. The application already makes this owner-only; this trigger
-- closes the same boundary for direct Data API calls. Service-role/maintenance
-- sessions without auth.uid() remain available for controlled migrations.
create or replace function business_unit_private.guard_project_business_unit_reassignment()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.business_unit_id is distinct from old.business_unit_id
     and auth.uid() is not null
     and not public.is_executive(old.organization_id) then
    raise exception 'business_unit_reassignment_requires_executive' using errcode = '42501';
  end if;
  return new;
end;
$$;

revoke all on function business_unit_private.guard_project_business_unit_reassignment() from public;
revoke all on function business_unit_private.guard_project_business_unit_reassignment() from anon;
revoke all on function business_unit_private.guard_project_business_unit_reassignment() from authenticated;

drop trigger if exists ksp_projects_business_unit_reassignment_guard on public.projects;
create trigger ksp_projects_business_unit_reassignment_guard
before update of business_unit_id on public.projects
for each row execute function business_unit_private.guard_project_business_unit_reassignment();

-- Compatibility bridge: when an existing project is classified, inherit its
-- current non-executive members into that unit. When a new project member is
-- assigned later, inherit the unit membership too. We deliberately do not
-- auto-revoke unit access when one project link is removed because the person may
-- still need that unit via another project; revocation is an explicit audited action.
create or replace function business_unit_private.sync_project_membership()
returns trigger
language plpgsql
security definer
set search_path = ''
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
        and not exists (
          select 1
          from public.organization_memberships om
          where om.organization_id = new.organization_id
            and om.profile_id = pm.profile_id
            and om.internal_role in ('founder_ceo', 'executive_operations')
            and om.suspended_at is null
            and om.effective_from <= now()
            and (om.effective_until is null or om.effective_until > now())
        )
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
      and not exists (
        select 1
        from public.organization_memberships om
        where om.organization_id = p.organization_id
          and om.profile_id = new.profile_id
          and om.internal_role in ('founder_ceo', 'executive_operations')
          and om.suspended_at is null
          and om.effective_from <= now()
          and (om.effective_until is null or om.effective_until > now())
      )
    on conflict (business_unit_id, profile_id) do update
      set suspended_at = null,
          effective_until = null;
    return new;
  end if;

  return new;
end;
$$;

revoke all on function business_unit_private.sync_project_membership() from public;
revoke all on function business_unit_private.sync_project_membership() from anon;
revoke all on function business_unit_private.sync_project_membership() from authenticated;

-- Existing projects are classified by UPDATE. New classified projects gain unit
-- membership for their creator through the project_memberships INSERT trigger.
drop trigger if exists ksp_projects_business_unit_membership_sync on public.projects;
create trigger ksp_projects_business_unit_membership_sync
after update of business_unit_id on public.projects
for each row execute function business_unit_private.sync_project_membership();

drop trigger if exists ksp_project_memberships_business_unit_sync on public.project_memberships;
create trigger ksp_project_memberships_business_unit_sync
after insert on public.project_memberships
for each row execute function business_unit_private.sync_project_membership();
