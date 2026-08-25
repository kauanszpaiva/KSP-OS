-- Authority Engine V4 — Network team isolation + canonical delegation hardening.
--
-- This source migration tightens existing broad partner/delegation behavior. It
-- does not backfill or mutate production rows. A production rollout therefore
-- requires an explicit partner-assignment backfill/reconciliation plan first.

-- ---------------------------------------------------------------------------
-- Network role separation: billing is a first-class membership that does not
-- imply assignment/work visibility.
-- ---------------------------------------------------------------------------
alter table public.partner_memberships
  drop constraint if exists partner_memberships_role_check;

alter table public.partner_memberships
  add constraint partner_memberships_role_check
  check (role in ('partner_owner','partner_coordinator','billing','editor','uploader','viewer'));

-- ---------------------------------------------------------------------------
-- Reuse the existing delegations table instead of creating a second delegation
-- source of truth. New delegations must be scoped; legacy unscoped rows remain
-- stored for history but are intentionally ignored by Authority Engine V4.
-- ---------------------------------------------------------------------------
alter table public.delegations
  add column if not exists resource_type text,
  add column if not exists resource_id uuid,
  add column if not exists granted_by uuid references public.profiles(id) on delete set null;

do $do$
begin
  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.delegations'::regclass
      and conname = 'delegations_resource_scope_check'
  ) then
    alter table public.delegations
      add constraint delegations_resource_scope_check
      check ((resource_type is null) = (resource_id is null));
  end if;
end
$do$;

create index if not exists delegations_delegate_active_idx
  on public.delegations (organization_id, delegate_id, action, resource_type, resource_id, effective_until)
  where revoked_at is null;

alter table public.delegations enable row level security;
drop policy if exists delegations_internal on public.delegations;
drop policy if exists delegations_read on public.delegations;
drop policy if exists delegations_insert on public.delegations;
drop policy if exists delegations_update on public.delegations;

revoke all on public.delegations from anon;
revoke all on public.delegations from authenticated;
grant select, insert on public.delegations to authenticated;
grant update (revoked_at) on public.delegations to authenticated;

create policy delegations_read on public.delegations
for select to authenticated
using (
  public.is_executive(organization_id)
  or delegator_id = (select auth.uid())
  or delegate_id = (select auth.uid())
);

-- Creation remains owner-governed because the database cannot safely infer the
-- complete application-level delegation ceiling for every resource type. The
-- KSP Inc action verifies the delegator's effective authority before insert.
create policy delegations_insert on public.delegations
for insert to authenticated
with check (
  public.is_executive(organization_id)
  and granted_by = (select auth.uid())
  and resource_type is not null
  and resource_id is not null
  and revoked_at is null
  and effective_from <= now()
  and effective_until > now()
  and effective_until <= now() + interval '30 days'
  and exists (
    select 1
    from public.organization_memberships om
    where om.organization_id = delegations.organization_id
      and om.profile_id = delegations.delegator_id
      and om.internal_role is not null
      and om.suspended_at is null
      and om.effective_from <= now()
      and (om.effective_until is null or om.effective_until > now())
  )
  and exists (
    select 1
    from public.organization_memberships om
    where om.organization_id = delegations.organization_id
      and om.profile_id = delegations.delegate_id
      and om.internal_role is not null
      and om.suspended_at is null
      and om.effective_from <= now()
      and (om.effective_until is null or om.effective_until > now())
  )
);

create policy delegations_update on public.delegations
for update to authenticated
using (
  public.is_executive(organization_id)
  or delegator_id = (select auth.uid())
)
with check (
  public.is_executive(organization_id)
  or delegator_id = (select auth.uid())
);

comment on table public.delegations is
  'Canonical time-bounded delegation records. Authority Engine V4 consumes only concrete resource-scoped rows; authenticated updates are revocation-only.';

-- Delegation is represented by the canonical delegations table, not the generic
-- relationship table.
alter table public.authority_relationships
  drop constraint if exists authority_relationships_relationship_type_check;
alter table public.authority_relationships
  add constraint authority_relationships_relationship_type_check
  check (relationship_type in ('supervises', 'approver_for', 'billing_for'));

-- ---------------------------------------------------------------------------
-- Network assignment membership: an operational team member sees only work
-- explicitly assigned to them. Partner owners/coordinators retain supervisor
-- visibility over the vendor organization's assignments. A billing user gets no
-- work visibility merely because they belong to the same vendor company.
-- ---------------------------------------------------------------------------
create table if not exists public.partner_assignment_members (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  partner_organization_id uuid not null,
  assignment_id uuid not null references public.partner_assignments(id) on delete cascade,
  profile_id uuid not null references public.profiles(id) on delete cascade,
  assignment_role text not null default 'worker'
    check (assignment_role in ('lead','worker','viewer')),
  effective_from timestamptz not null default now(),
  effective_until timestamptz,
  revoked_at timestamptz,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  foreign key (partner_organization_id, organization_id)
    references public.partner_organizations(id, organization_id) on delete cascade,
  check (effective_until is null or effective_until > effective_from)
);

create unique index if not exists partner_assignment_members_active_unique
  on public.partner_assignment_members (assignment_id, profile_id)
  where revoked_at is null;
create index if not exists partner_assignment_members_profile_idx
  on public.partner_assignment_members (profile_id, assignment_id)
  where revoked_at is null;

create or replace function partner_private.validate_assignment_member_scope()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  a record;
begin
  select pa.organization_id, pa.partner_organization_id
    into a
  from public.partner_assignments pa
  where pa.id = new.assignment_id;

  if a.organization_id is null
     or a.organization_id is distinct from new.organization_id
     or a.partner_organization_id is distinct from new.partner_organization_id then
    raise exception 'partner_assignment_member_scope_mismatch';
  end if;

  if not exists (
    select 1
    from public.partner_memberships pm
    where pm.organization_id = new.organization_id
      and pm.partner_organization_id = new.partner_organization_id
      and pm.profile_id = new.profile_id
      and pm.suspended_at is null
      and pm.effective_from <= now()
      and (pm.effective_until is null or pm.effective_until > now())
  ) then
    raise exception 'partner_assignment_member_not_active_partner_member';
  end if;

  return new;
end;
$$;
revoke all on function partner_private.validate_assignment_member_scope() from public, anon, authenticated;

drop trigger if exists partner_assignment_member_scope_guard on public.partner_assignment_members;
create trigger partner_assignment_member_scope_guard
before insert or update of organization_id, partner_organization_id, assignment_id, profile_id
on public.partner_assignment_members
for each row execute function partner_private.validate_assignment_member_scope();

create or replace function partner_private.is_assignment_member(target_assignment uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.partner_assignment_members pam
    join public.partner_memberships pm
      on pm.organization_id = pam.organization_id
     and pm.partner_organization_id = pam.partner_organization_id
     and pm.profile_id = pam.profile_id
    where pam.assignment_id = target_assignment
      and pam.profile_id = auth.uid()
      and pam.revoked_at is null
      and pam.effective_from <= now()
      and (pam.effective_until is null or pam.effective_until > now())
      and pm.suspended_at is null
      and pm.effective_from <= now()
      and (pm.effective_until is null or pm.effective_until > now())
  );
$$;
revoke all on function partner_private.is_assignment_member(uuid) from public, anon;
grant execute on function partner_private.is_assignment_member(uuid) to authenticated;

create or replace function partner_private.is_assignment_lead(target_assignment uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.partner_assignment_members pam
    join public.partner_memberships pm
      on pm.organization_id = pam.organization_id
     and pm.partner_organization_id = pam.partner_organization_id
     and pm.profile_id = pam.profile_id
    where pam.assignment_id = target_assignment
      and pam.profile_id = auth.uid()
      and pam.assignment_role = 'lead'
      and pam.revoked_at is null
      and pam.effective_from <= now()
      and (pam.effective_until is null or pam.effective_until > now())
      and pm.suspended_at is null
      and pm.effective_from <= now()
      and (pm.effective_until is null or pm.effective_until > now())
  );
$$;
revoke all on function partner_private.is_assignment_lead(uuid) from public, anon;
grant execute on function partner_private.is_assignment_lead(uuid) to authenticated;

create or replace function partner_private.can_access_assignment(target_assignment uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.partner_assignments pa
    where pa.id = target_assignment
      and (
        partner_private.is_partner_owner(pa.partner_organization_id)
        or partner_private.is_assignment_member(pa.id)
      )
  );
$$;
revoke all on function partner_private.can_access_assignment(uuid) from public, anon;
grant execute on function partner_private.can_access_assignment(uuid) to authenticated;

alter table public.partner_assignment_members enable row level security;
revoke all on public.partner_assignment_members from anon;
revoke all on public.partner_assignment_members from authenticated;
grant select, insert on public.partner_assignment_members to authenticated;
grant update (revoked_at) on public.partner_assignment_members to authenticated;

create policy partner_assignment_members_read on public.partner_assignment_members
for select to authenticated
using (
  public.is_executive(organization_id)
  or profile_id = (select auth.uid())
  or partner_private.is_partner_owner(partner_organization_id)
);

create policy partner_assignment_members_insert on public.partner_assignment_members
for insert to authenticated
with check (
  (
    public.is_executive(organization_id)
    or partner_private.is_partner_owner(partner_organization_id)
  )
  and created_by = (select auth.uid())
  and revoked_at is null
  and effective_from <= now()
  and (effective_until is null or effective_until > now())
);

create policy partner_assignment_members_update on public.partner_assignment_members
for update to authenticated
using (
  public.is_executive(organization_id)
  or partner_private.is_partner_owner(partner_organization_id)
)
with check (
  public.is_executive(organization_id)
  or partner_private.is_partner_owner(partner_organization_id)
);

-- Replace organization-wide partner assignment visibility with supervisor/member
-- scoping. Internal KSP project access is preserved.
drop policy if exists partner_assignment_read on public.partner_assignments;
create policy partner_assignment_read on public.partner_assignments
for select to authenticated
using (
  public.is_executive(organization_id)
  or public.can_access_project(project_id)
  or partner_private.can_access_assignment(id)
);

drop policy if exists partner_activity_read on public.partner_activity_events;
create policy partner_activity_read on public.partner_activity_events
for select to authenticated
using (
  public.is_executive(organization_id)
  or (
    assignment_id is not null
    and partner_private.can_access_assignment(assignment_id)
  )
  or (
    assignment_id is null
    and partner_private.is_partner_owner(partner_organization_id)
  )
  or exists (
    select 1 from public.partner_assignments pa
    where pa.id = partner_activity_events.assignment_id
      and public.can_access_project(pa.project_id)
  )
);

-- Company-level owners/coordinators may accept/decline an offered assignment;
-- a specifically assigned lead may also respond. Ordinary workers/billing users
-- cannot change the company response state.
create or replace function public.respond_partner_assignment(
  p_assignment_id uuid,
  p_response text,
  p_note text default null
)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  a public.partner_assignments%rowtype;
  next_status text;
begin
  if auth.uid() is null then raise exception 'authentication_required'; end if;
  if p_response not in ('accepted','declined','clarification_requested') then raise exception 'invalid_assignment_response'; end if;

  select * into a
  from public.partner_assignments
  where id = p_assignment_id
  for update;

  if a.id is null then raise exception 'assignment_not_found'; end if;
  if not (
    partner_private.is_partner_owner(a.partner_organization_id)
    or partner_private.is_assignment_lead(a.id)
  ) then
    raise exception 'assignment_response_denied';
  end if;
  if a.status not in ('offered','clarification_requested') then raise exception 'assignment_not_respondable'; end if;

  next_status := p_response;
  update public.partner_assignments
    set status = next_status,
        response_note = nullif(trim(p_note),''),
        responded_at = now(),
        responded_by = auth.uid(),
        updated_at = now()
  where id = a.id;

  insert into public.partner_activity_events(
    organization_id,partner_organization_id,assignment_id,actor_id,action,summary
  ) values (
    a.organization_id,a.partner_organization_id,a.id,auth.uid(),
    'partner.assignment.'||next_status,
    'Partner responded to assignment: '||next_status
  );

  insert into public.audit_events(
    organization_id,actor_id,action,target_table,target_id,classification,metadata
  ) values (
    a.organization_id,auth.uid(),'partner.assignment.'||next_status,
    'partner_assignments',a.id,'internal',
    jsonb_build_object('partner_organization_id',a.partner_organization_id)
  );

  return next_status;
end;
$$;
revoke all on function public.respond_partner_assignment(uuid,text,text) from public, anon;
grant execute on function public.respond_partner_assignment(uuid,text,text) to authenticated;
