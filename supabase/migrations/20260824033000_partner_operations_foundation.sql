-- KSP Network partner-operations foundation.
-- Additive only. No existing client/internal authorization is widened.

create schema if not exists partner_private;
revoke all on schema partner_private from public, anon;
grant usage on schema partner_private to authenticated;

create table if not exists public.partner_organizations (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  business_unit_id uuid references public.business_units(id) on delete restrict,
  display_name text not null,
  legal_name text,
  slug text not null,
  status text not null default 'active' check (status in ('active','suspended','archived')),
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, slug),
  unique (id, organization_id)
);

create table if not exists public.partner_memberships (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  partner_organization_id uuid not null,
  profile_id uuid not null references public.profiles(id) on delete cascade,
  role text not null check (role in ('partner_owner','partner_coordinator','editor','uploader','viewer')),
  effective_from timestamptz not null default now(),
  effective_until timestamptz,
  suspended_at timestamptz,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  unique (partner_organization_id, profile_id),
  foreign key (partner_organization_id, organization_id)
    references public.partner_organizations(id, organization_id) on delete cascade,
  check (effective_until is null or effective_until > effective_from)
);

create table if not exists public.partner_assignments (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  business_unit_id uuid not null references public.business_units(id) on delete restrict,
  project_id uuid not null references public.projects(id) on delete restrict,
  partner_organization_id uuid not null,
  title text not null,
  assignment_type text not null default 'production',
  starts_at timestamptz,
  timezone text not null default 'America/New_York',
  location text,
  brief jsonb not null default '{}'::jsonb,
  status text not null default 'offered' check (status in ('offered','clarification_requested','accepted','declined','in_progress','review','completed','cancelled')),
  response_note text,
  response_due_at timestamptz,
  responded_at timestamptz,
  responded_by uuid references public.profiles(id) on delete set null,
  created_by uuid not null references public.profiles(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  foreign key (partner_organization_id, organization_id)
    references public.partner_organizations(id, organization_id) on delete restrict
);

create table if not exists public.partner_activity_events (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  partner_organization_id uuid not null,
  assignment_id uuid references public.partner_assignments(id) on delete set null,
  actor_id uuid references public.profiles(id) on delete set null,
  action text not null,
  summary text not null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  foreign key (partner_organization_id, organization_id)
    references public.partner_organizations(id, organization_id) on delete cascade
);

create index if not exists partner_memberships_profile_idx on public.partner_memberships(profile_id, partner_organization_id) where suspended_at is null;
create index if not exists partner_assignments_partner_idx on public.partner_assignments(partner_organization_id, status, starts_at);
create index if not exists partner_assignments_project_idx on public.partner_assignments(project_id, status);
create index if not exists partner_activity_assignment_idx on public.partner_activity_events(assignment_id, created_at desc);

create or replace function partner_private.is_active_member(target_partner uuid)
returns boolean language sql stable security definer set search_path=''
as $$
  select exists (
    select 1 from public.partner_memberships pm
    join public.partner_organizations po on po.id=pm.partner_organization_id and po.organization_id=pm.organization_id
    where pm.partner_organization_id=target_partner
      and pm.profile_id=auth.uid()
      and pm.suspended_at is null
      and pm.effective_from <= now()
      and (pm.effective_until is null or pm.effective_until > now())
      and po.status='active'
  );
$$;
revoke all on function partner_private.is_active_member(uuid) from public, anon;
grant execute on function partner_private.is_active_member(uuid) to authenticated;

create or replace function partner_private.is_partner_owner(target_partner uuid)
returns boolean language sql stable security definer set search_path=''
as $$
  select exists (
    select 1 from public.partner_memberships pm
    join public.partner_organizations po on po.id=pm.partner_organization_id and po.organization_id=pm.organization_id
    where pm.partner_organization_id=target_partner and pm.profile_id=auth.uid()
      and pm.role in ('partner_owner','partner_coordinator')
      and pm.suspended_at is null and pm.effective_from<=now()
      and (pm.effective_until is null or pm.effective_until>now()) and po.status='active'
  );
$$;
revoke all on function partner_private.is_partner_owner(uuid) from public, anon;
grant execute on function partner_private.is_partner_owner(uuid) to authenticated;

create or replace function partner_private.validate_assignment_scope()
returns trigger language plpgsql security definer set search_path=''
as $$
declare p record; po record; bu record;
begin
  select organization_id,business_unit_id into p from public.projects where id=new.project_id;
  select organization_id,business_unit_id into po from public.partner_organizations where id=new.partner_organization_id;
  select organization_id into bu from public.business_units where id=new.business_unit_id;
  if p.organization_id is distinct from new.organization_id
     or p.business_unit_id is distinct from new.business_unit_id
     or po.organization_id is distinct from new.organization_id
     or po.business_unit_id is distinct from new.business_unit_id
     or bu.organization_id is distinct from new.organization_id then
    raise exception 'partner_assignment_scope_mismatch';
  end if;
  return new;
end;
$$;
revoke all on function partner_private.validate_assignment_scope() from public, anon, authenticated;
drop trigger if exists partner_assignment_scope_guard on public.partner_assignments;
create trigger partner_assignment_scope_guard before insert or update of organization_id,business_unit_id,project_id,partner_organization_id on public.partner_assignments
for each row execute function partner_private.validate_assignment_scope();

alter table public.partner_organizations enable row level security;
alter table public.partner_memberships enable row level security;
alter table public.partner_assignments enable row level security;
alter table public.partner_activity_events enable row level security;

grant select,insert,update,delete on public.partner_organizations,public.partner_memberships,public.partner_assignments to authenticated;
grant select on public.partner_activity_events to authenticated;

-- Internal reads are scoped by executive authority, business-unit membership, or
-- explicit project access. Being a generic KSP org member is not enough.
create policy partner_org_read on public.partner_organizations for select to authenticated using (
  public.is_executive(organization_id)
  or (business_unit_id is not null and business_unit_private.can_access_business_unit(business_unit_id))
  or partner_private.is_active_member(id)
);
create policy partner_org_ksp_insert on public.partner_organizations for insert to authenticated with check (public.is_executive(organization_id));
create policy partner_org_ksp_update on public.partner_organizations for update to authenticated using (public.is_executive(organization_id)) with check (public.is_executive(organization_id));
create policy partner_org_ksp_delete on public.partner_organizations for delete to authenticated using (public.is_executive(organization_id));

create policy partner_membership_read on public.partner_memberships for select to authenticated using (
  public.is_executive(organization_id)
  or profile_id=auth.uid()
  or partner_private.is_partner_owner(partner_organization_id)
  or exists (
    select 1 from public.partner_organizations po
    where po.id=partner_memberships.partner_organization_id
      and po.organization_id=partner_memberships.organization_id
      and po.business_unit_id is not null
      and business_unit_private.can_access_business_unit(po.business_unit_id)
  )
);
create policy partner_membership_ksp_insert on public.partner_memberships for insert to authenticated with check (public.is_executive(organization_id));
create policy partner_membership_ksp_update on public.partner_memberships for update to authenticated using (public.is_executive(organization_id)) with check (public.is_executive(organization_id));
create policy partner_membership_ksp_delete on public.partner_memberships for delete to authenticated using (public.is_executive(organization_id));

create policy partner_assignment_read on public.partner_assignments for select to authenticated using (
  public.is_executive(organization_id)
  or public.can_access_project(project_id)
  or partner_private.is_active_member(partner_organization_id)
);
create policy partner_assignment_ksp_insert on public.partner_assignments for insert to authenticated with check (public.is_executive(organization_id));
create policy partner_assignment_ksp_update on public.partner_assignments for update to authenticated using (public.is_executive(organization_id)) with check (public.is_executive(organization_id));
create policy partner_assignment_ksp_delete on public.partner_assignments for delete to authenticated using (public.is_executive(organization_id));

create policy partner_activity_read on public.partner_activity_events for select to authenticated using (
  public.is_executive(organization_id)
  or partner_private.is_active_member(partner_organization_id)
  or exists (
    select 1 from public.partner_assignments pa
    where pa.id=partner_activity_events.assignment_id
      and public.can_access_project(pa.project_id)
  )
);

create or replace function public.respond_partner_assignment(p_assignment_id uuid,p_response text,p_note text default null)
returns text language plpgsql security definer set search_path=''
as $$
declare a public.partner_assignments%rowtype; next_status text;
begin
  if auth.uid() is null then raise exception 'authentication_required'; end if;
  if p_response not in ('accepted','declined','clarification_requested') then raise exception 'invalid_assignment_response'; end if;
  select * into a from public.partner_assignments where id=p_assignment_id for update;
  if a.id is null then raise exception 'assignment_not_found'; end if;
  if not partner_private.is_active_member(a.partner_organization_id) then raise exception 'assignment_access_denied'; end if;
  if a.status not in ('offered','clarification_requested') then raise exception 'assignment_not_respondable'; end if;
  next_status:=p_response;
  update public.partner_assignments set status=next_status,response_note=nullif(trim(p_note),''),responded_at=now(),responded_by=auth.uid(),updated_at=now() where id=a.id;
  insert into public.partner_activity_events(organization_id,partner_organization_id,assignment_id,actor_id,action,summary)
  values(a.organization_id,a.partner_organization_id,a.id,auth.uid(),'partner.assignment.'||next_status,'Partner responded to assignment: '||next_status);
  insert into public.audit_events(organization_id,actor_id,action,target_table,target_id,classification,metadata)
  values(a.organization_id,auth.uid(),'partner.assignment.'||next_status,'partner_assignments',a.id,'internal',jsonb_build_object('partner_organization_id',a.partner_organization_id));
  return next_status;
end;
$$;
revoke all on function public.respond_partner_assignment(uuid,text,text) from public, anon;
grant execute on function public.respond_partner_assignment(uuid,text,text) to authenticated;

-- Partner records never gain a Portal policy. Client publication remains an explicit KSP action.
