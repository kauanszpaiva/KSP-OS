-- Operational vertical slice: company outcomes, commitments, assignments, proofs,
-- activity events, and the isolated Founder Vault.
--
-- This migration also repairs two latent defects introduced when 202607150002
-- renamed `memberships` -> `organization_memberships`:
--   1. current_org_ids() and is_executive() still referenced the old table name.
--   2. Membership helper functions were not SECURITY DEFINER, so evaluating an
--      RLS policy that reads organization_memberships could recurse into that
--      table's own policy (which calls current_org_ids()) indefinitely.
-- Recreating the helpers as SECURITY DEFINER with a fixed search_path breaks the
-- recursion cycle and points every helper at the correct table.

create or replace function current_org_ids() returns setof uuid
  language sql stable security definer set search_path = public, pg_temp as $$
  select organization_id from organization_memberships
  where profile_id = auth.uid() and suspended_at is null
    and (effective_until is null or effective_until > now())
$$;

create or replace function is_executive(org uuid) returns boolean
  language sql stable security definer set search_path = public, pg_temp as $$
  select exists(
    select 1 from organization_memberships
    where profile_id = auth.uid() and organization_id = org
      and internal_role in ('founder_ceo','executive_operations')
      and suspended_at is null and (effective_until is null or effective_until > now())
  )
$$;

create or replace function is_internal_member(org uuid) returns boolean
  language sql stable security definer set search_path = public, pg_temp as $$
  select exists(
    select 1 from organization_memberships
    where profile_id = auth.uid() and organization_id = org
      and suspended_at is null and internal_role is not null
      and (effective_until is null or effective_until > now())
  )
$$;

create or replace function is_founder(org uuid) returns boolean
  language sql stable security definer set search_path = public, pg_temp as $$
  select exists(
    select 1 from organization_memberships
    where profile_id = auth.uid() and organization_id = org
      and internal_role = 'founder_ceo'
      and suspended_at is null and (effective_until is null or effective_until > now())
  )
$$;

-- Let internal members read the profiles of people who share an organization,
-- so owner/assignee names render. own_profile_read (mig 1) remains for self.
create policy profiles_org_read on profiles for select using (
  exists (
    select 1 from organization_memberships m1
    join organization_memberships m2 on m1.organization_id = m2.organization_id
    where m1.profile_id = auth.uid() and m2.profile_id = profiles.id
  )
);

-- Generic updated_at maintenance.
create or replace function set_updated_at() returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end $$;

-- ---------------------------------------------------------------------------
-- company_outcomes: the Focus Governor object. Max 3 active per organization.
-- ---------------------------------------------------------------------------
create type outcome_state as enum ('active','paused','completed','replaced');

create table company_outcomes (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id),
  title text not null,
  description text,
  metric text,
  target text,
  horizon_days int check (horizon_days is null or horizon_days > 0),
  state outcome_state not null default 'active',
  progress int not null default 0 check (progress between 0 and 100),
  owner_id uuid references profiles(id),
  created_by uuid references profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  activated_at timestamptz default now(),
  closed_at timestamptz
);
create index company_outcomes_org_state_idx on company_outcomes (organization_id, state);

create or replace function enforce_active_outcome_limit() returns trigger language plpgsql as $$
declare v_count int;
begin
  if new.state = 'active' then
    select count(*) into v_count from company_outcomes
    where organization_id = new.organization_id and state = 'active' and id <> new.id;
    if v_count >= 3 then
      raise exception 'active_outcome_limit_reached'
        using hint = 'Complete, pause, or replace an existing active outcome first.';
    end if;
  end if;
  return new;
end $$;
create trigger company_outcomes_active_limit before insert or update on company_outcomes
  for each row execute function enforce_active_outcome_limit();
create trigger company_outcomes_touch before update on company_outcomes
  for each row execute function set_updated_at();

-- ---------------------------------------------------------------------------
-- commitments: promised results. Every active commitment has an accountable
-- owner and a deadline or explicit next-action date.
-- ---------------------------------------------------------------------------
create type commitment_state as enum
  ('open','in_progress','blocked','proof_submitted','completed','rejected','archived');

create table commitments (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id),
  outcome_id uuid references company_outcomes(id),
  title text not null,
  outcome_statement text not null,
  context text,
  owner_id uuid not null references profiles(id),
  due_date date,
  next_action_date date,
  requires_proof boolean not null default true,
  state commitment_state not null default 'open',
  progress int not null default 0 check (progress between 0 and 100),
  classification data_classification not null default 'internal',
  created_by uuid references profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  completed_at timestamptz,
  constraint commitments_active_needs_date check (
    state not in ('open','in_progress','blocked')
    or due_date is not null or next_action_date is not null
  )
);
create index commitments_org_state_idx on commitments (organization_id, state);
create index commitments_owner_idx on commitments (owner_id);
create index commitments_outcome_idx on commitments (outcome_id);

create table commitment_assignments (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id),
  commitment_id uuid not null references commitments(id) on delete cascade,
  profile_id uuid not null references profiles(id),
  role text not null default 'contributor' check (role in ('accountable','contributor')),
  assigned_by uuid references profiles(id),
  created_at timestamptz not null default now(),
  unique (commitment_id, profile_id)
);
create index commitment_assignments_profile_idx on commitment_assignments (profile_id);

-- ---------------------------------------------------------------------------
-- proofs: Proof Chain evidence. Completing a proof-required commitment needs an
-- accepted proof, and acceptance is executive-only (enforced below).
-- ---------------------------------------------------------------------------
create type proof_kind as enum ('file','url','commit','deployment','payment','approval','note');

create table proofs (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id),
  commitment_id uuid not null references commitments(id) on delete cascade,
  kind proof_kind not null,
  reference text not null,
  description text,
  submitted_by uuid not null references profiles(id),
  accepted_at timestamptz,
  accepted_by uuid references profiles(id),
  created_at timestamptz not null default now()
);
create index proofs_commitment_idx on proofs (commitment_id);

create or replace function enforce_commitment_completion() returns trigger language plpgsql as $$
begin
  if new.state = 'completed' and old.state is distinct from 'completed' then
    if not is_executive(new.organization_id) then
      raise exception 'completion_requires_executive_acceptance';
    end if;
    if new.requires_proof and not exists (
      select 1 from proofs p where p.commitment_id = new.id and p.accepted_at is not null
    ) then
      raise exception 'completion_requires_accepted_proof';
    end if;
    new.completed_at = now();
  end if;
  return new;
end $$;
create trigger commitments_completion_gate before update on commitments
  for each row execute function enforce_commitment_completion();
create trigger commitments_touch before update on commitments
  for each row execute function set_updated_at();

-- ---------------------------------------------------------------------------
-- activity_events: append-only work-graph timeline (distinct from the security
-- audit_events log). Written by server actions on every critical mutation.
-- ---------------------------------------------------------------------------
create table activity_events (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id),
  actor_id uuid references profiles(id),
  verb text not null,
  object_table text not null,
  object_id uuid,
  summary text not null,
  metadata jsonb not null default '{}',
  created_at timestamptz not null default now()
);
create index activity_events_org_created_idx on activity_events (organization_id, created_at desc);

-- ---------------------------------------------------------------------------
-- founder_vault_entries: fully isolated. Only the founder, only their own rows.
-- Excluded from all company/client/team surfaces (no other policy references it).
-- ---------------------------------------------------------------------------
create table founder_vault_entries (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id),
  owner_id uuid not null references profiles(id),
  entry_type text not null,
  title text not null,
  body text,
  metadata jsonb not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger founder_vault_touch before update on founder_vault_entries
  for each row execute function set_updated_at();

-- ---------------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------------
alter table company_outcomes enable row level security;
alter table commitments enable row level security;
alter table commitment_assignments enable row level security;
alter table proofs enable row level security;
alter table activity_events enable row level security;
alter table founder_vault_entries enable row level security;

-- company_outcomes: all internal members read; executives manage.
create policy company_outcomes_read on company_outcomes for select
  using (is_internal_member(organization_id));
create policy company_outcomes_insert on company_outcomes for insert
  with check (is_executive(organization_id) and created_by = auth.uid());
create policy company_outcomes_update on company_outcomes for update
  using (is_executive(organization_id)) with check (is_executive(organization_id));
create policy company_outcomes_delete on company_outcomes for delete
  using (is_executive(organization_id));

-- commitments: internal members read (restricted hidden from non-exec non-owner);
-- creators insert; owner/assignee/executive update; executive delete.
create policy commitments_read on commitments for select using (
  is_internal_member(organization_id)
  and (is_executive(organization_id) or classification <> 'restricted' or owner_id = auth.uid())
);
create policy commitments_insert on commitments for insert
  with check (is_internal_member(organization_id) and created_by = auth.uid());
create policy commitments_update on commitments for update using (
  is_internal_member(organization_id) and (
    is_executive(organization_id) or owner_id = auth.uid()
    or exists (select 1 from commitment_assignments ca where ca.commitment_id = commitments.id and ca.profile_id = auth.uid())
  )
) with check (is_internal_member(organization_id));
create policy commitments_delete on commitments for delete
  using (is_executive(organization_id));

-- commitment_assignments: internal members read; executives manage.
create policy commitment_assignments_read on commitment_assignments for select
  using (is_internal_member(organization_id));
create policy commitment_assignments_insert on commitment_assignments for insert
  with check (is_executive(organization_id));
create policy commitment_assignments_update on commitment_assignments for update
  using (is_executive(organization_id)) with check (is_executive(organization_id));
create policy commitment_assignments_delete on commitment_assignments for delete
  using (is_executive(organization_id));

-- proofs: internal members read; submitter inserts own; executive accepts/deletes.
create policy proofs_read on proofs for select
  using (is_internal_member(organization_id));
create policy proofs_insert on proofs for insert
  with check (is_internal_member(organization_id) and submitted_by = auth.uid());
create policy proofs_update on proofs for update
  using (is_executive(organization_id)) with check (is_executive(organization_id));
create policy proofs_delete on proofs for delete
  using (is_executive(organization_id));

-- activity_events: internal members read; internal members append as themselves.
-- No update/delete policy -> append-only under RLS.
create policy activity_events_read on activity_events for select
  using (is_internal_member(organization_id));
create policy activity_events_insert on activity_events for insert
  with check (is_internal_member(organization_id) and actor_id = auth.uid());

-- founder_vault_entries: founder-only, own rows only, for every command.
create policy founder_vault_select on founder_vault_entries for select
  using (owner_id = auth.uid() and is_founder(organization_id));
create policy founder_vault_insert on founder_vault_entries for insert
  with check (owner_id = auth.uid() and is_founder(organization_id));
create policy founder_vault_update on founder_vault_entries for update
  using (owner_id = auth.uid() and is_founder(organization_id))
  with check (owner_id = auth.uid() and is_founder(organization_id));
create policy founder_vault_delete on founder_vault_entries for delete
  using (owner_id = auth.uid() and is_founder(organization_id));
