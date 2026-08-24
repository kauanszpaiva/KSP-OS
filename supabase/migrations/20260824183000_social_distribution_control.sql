-- Social distribution control for KSP Agency content operations.
--
-- This deliberately extends the existing content_items + client-media model
-- instead of creating a second social-content source of truth. A content item
-- answers "what are we making?"; a social_distribution answers "where is it
-- going, who controls publication, and what evidence proves it was published?"
--
-- Invariants:
--   1. delivery/client-portal visibility and social publication are independent;
--   2. one content item may target multiple social profiles;
--   3. profile defaults may be overridden per distribution;
--   4. published state requires explicit publication evidence;
--   5. profile/content/media relations must remain in the same org and scope.

create table if not exists public.social_profiles (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  client_id uuid references public.client_organizations(id) on delete set null,
  project_id uuid references public.projects(id) on delete set null,
  display_name text not null,
  platform text not null default 'instagram',
  handle text,
  editorial_role text,
  account_owner text,
  default_control_mode text not null default 'unknown',
  default_publisher text,
  default_approver text,
  kpi_owner text,
  is_active boolean not null default true,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint social_profiles_display_name_check check (char_length(trim(display_name)) >= 2),
  constraint social_profiles_platform_check check (char_length(trim(platform)) >= 2),
  constraint social_profiles_control_mode_check check (default_control_mode in ('controlled', 'shared', 'external', 'unknown'))
);

create unique index if not exists social_profiles_identity_idx
  on public.social_profiles (
    organization_id,
    lower(display_name),
    lower(platform),
    coalesce(project_id, '00000000-0000-0000-0000-000000000000'::uuid)
  );
create index if not exists social_profiles_client_idx
  on public.social_profiles (organization_id, client_id, is_active);
create index if not exists social_profiles_project_idx
  on public.social_profiles (organization_id, project_id, is_active);

create table if not exists public.social_distributions (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  content_item_id uuid not null references public.content_items(id) on delete cascade,
  social_profile_id uuid not null references public.social_profiles(id) on delete cascade,
  deliverable_version_id uuid references public.deliverable_versions(id) on delete set null,
  control_mode text not null,
  publisher text,
  approver text,
  status text not null default 'planned',
  scheduled_for timestamptz,
  delivered_at timestamptz,
  published_at timestamptz,
  publication_url text,
  evidence_kind text not null default 'none',
  evidence_note text,
  confirmed_by uuid references public.profiles(id) on delete set null,
  confirmed_at timestamptz,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint social_distributions_control_mode_check check (control_mode in ('controlled', 'shared', 'external', 'unknown')),
  constraint social_distributions_status_check check (status in (
    'planned',
    'creating',
    'internal_review',
    'client_review',
    'ready',
    'delivered',
    'awaiting_external',
    'scheduled',
    'published',
    'withdrawn',
    'skipped'
  )),
  constraint social_distributions_evidence_kind_check check (evidence_kind in ('none', 'owner_confirmation', 'publication_url', 'platform_api', 'manual')),
  constraint social_distributions_publication_evidence_check check (
    status <> 'published'
    or (
      published_at is not null
      and (
        (evidence_kind = 'publication_url' and publication_url is not null)
        or
        (evidence_kind in ('owner_confirmation', 'platform_api', 'manual') and evidence_note is not null)
      )
    )
  )
);

create unique index if not exists social_distributions_content_profile_idx
  on public.social_distributions (content_item_id, social_profile_id);
create index if not exists social_distributions_queue_idx
  on public.social_distributions (organization_id, status, scheduled_for, created_at desc);
create index if not exists social_distributions_profile_idx
  on public.social_distributions (social_profile_id, status, created_at desc);
create index if not exists social_distributions_version_idx
  on public.social_distributions (deliverable_version_id)
  where deliverable_version_id is not null;

-- Keep client/project scope coherent even for direct API callers.
create or replace function public.validate_social_profile_scope()
returns trigger
language plpgsql
as $$
declare
  project_client_id uuid;
begin
  if new.client_id is not null and not exists (
    select 1 from public.client_organizations c
    where c.id = new.client_id and c.organization_id = new.organization_id
  ) then
    raise exception 'social profile client must belong to the same organization';
  end if;

  if new.project_id is not null then
    select p.client_id
      into project_client_id
      from public.projects p
      where p.id = new.project_id
        and p.organization_id = new.organization_id;

    if not found then
      raise exception 'social profile project must belong to the same organization';
    end if;

    if new.client_id is not null and project_client_id is distinct from new.client_id then
      raise exception 'social profile client must match the project client';
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists social_profiles_scope_guard on public.social_profiles;
create trigger social_profiles_scope_guard
before insert or update of organization_id, client_id, project_id
on public.social_profiles
for each row execute function public.validate_social_profile_scope();

-- The distribution relation is tenant- and content-bound. A same-org video is
-- still rejected when it belongs to a different content item.
create or replace function public.validate_social_distribution_scope()
returns trigger
language plpgsql
as $$
declare
  content_project_id uuid;
  content_client_id uuid;
  profile_project_id uuid;
  profile_client_id uuid;
  version_content_item_id uuid;
begin
  select c.project_id, c.client_id
    into content_project_id, content_client_id
    from public.content_items c
    where c.id = new.content_item_id
      and c.organization_id = new.organization_id;

  if not found then
    raise exception 'social distribution content item must belong to the same organization';
  end if;

  select p.project_id, p.client_id
    into profile_project_id, profile_client_id
    from public.social_profiles p
    where p.id = new.social_profile_id
      and p.organization_id = new.organization_id;

  if not found then
    raise exception 'social distribution profile must belong to the same organization';
  end if;

  if profile_project_id is not null and profile_project_id is distinct from content_project_id then
    raise exception 'social distribution profile is scoped to a different project';
  end if;

  if profile_client_id is not null and profile_client_id is distinct from content_client_id then
    raise exception 'social distribution profile is scoped to a different client';
  end if;

  if new.deliverable_version_id is not null then
    select d.content_item_id
      into version_content_item_id
      from public.deliverable_versions v
      join public.deliverables d on d.id = v.deliverable_id
      where v.id = new.deliverable_version_id
        and v.organization_id = new.organization_id
        and d.organization_id = new.organization_id;

    if not found then
      raise exception 'social distribution deliverable version must belong to the same organization';
    end if;

    if version_content_item_id is distinct from new.content_item_id then
      raise exception 'social distribution deliverable version must belong to the same content item';
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists social_distributions_scope_guard on public.social_distributions;
create trigger social_distributions_scope_guard
before insert or update of organization_id, content_item_id, social_profile_id, deliverable_version_id
on public.social_distributions
for each row execute function public.validate_social_distribution_scope();

alter table public.social_profiles enable row level security;
alter table public.social_distributions enable row level security;

drop policy if exists social_profiles_read on public.social_profiles;
create policy social_profiles_read on public.social_profiles for select
using (organization_id in (select public.current_org_ids()));

drop policy if exists social_profiles_insert on public.social_profiles;
create policy social_profiles_insert on public.social_profiles for insert
with check (organization_id in (select public.current_org_ids()));

drop policy if exists social_profiles_update on public.social_profiles;
create policy social_profiles_update on public.social_profiles for update
using (organization_id in (select public.current_org_ids()))
with check (organization_id in (select public.current_org_ids()));

drop policy if exists social_profiles_delete on public.social_profiles;
create policy social_profiles_delete on public.social_profiles for delete
using (public.is_executive(organization_id));

drop policy if exists social_distributions_read on public.social_distributions;
create policy social_distributions_read on public.social_distributions for select
using (organization_id in (select public.current_org_ids()));

drop policy if exists social_distributions_insert on public.social_distributions;
create policy social_distributions_insert on public.social_distributions for insert
with check (organization_id in (select public.current_org_ids()));

drop policy if exists social_distributions_update on public.social_distributions;
create policy social_distributions_update on public.social_distributions for update
using (organization_id in (select public.current_org_ids()))
with check (organization_id in (select public.current_org_ids()));

drop policy if exists social_distributions_delete on public.social_distributions;
create policy social_distributions_delete on public.social_distributions for delete
using (public.is_executive(organization_id));
