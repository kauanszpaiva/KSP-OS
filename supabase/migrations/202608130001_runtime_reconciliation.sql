-- Forward reconciliation for the KSP OS database state audited on 2026-08-13.
--
-- The connected appkspos project contains the core Command/Portal migrations,
-- but several later repository migrations are absent or only partially reflected
-- in the live schema. This migration expresses the intended final state without
-- fabricating historical migration records or replaying non-idempotent files.
--
-- Apply only through the normal reviewed migration flow after environment,
-- backup/rollback, RLS, and release gates are approved.

-- Portal change-order visibility.
alter table change_orders enable row level security;
drop policy if exists change_orders_portal_read on change_orders;
create policy change_orders_portal_read on change_orders for select
  using (is_portal_member(client_organization_id));

-- Timeline duration support.
alter table mission_milestones enable row level security;
alter table tasks enable row level security;
alter table mission_milestones add column if not exists start_date date;
alter table tasks add column if not exists start_date date;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'mission_milestones_start_before_due'
      and conrelid = 'mission_milestones'::regclass
  ) then
    alter table mission_milestones add constraint mission_milestones_start_before_due
      check (start_date is null or due_date is null or start_date <= due_date);
  end if;
end;
$$;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'tasks_start_before_due'
      and conrelid = 'tasks'::regclass
  ) then
    alter table tasks add constraint tasks_start_before_due
      check (start_date is null or due_date is null or start_date <= due_date);
  end if;
end;
$$;

-- Executive member-management control with a last-founder invariant.
alter table organization_memberships enable row level security;
drop policy if exists organization_memberships_executive_update on organization_memberships;
create policy organization_memberships_executive_update on organization_memberships
  for update
  using (is_executive(organization_id))
  with check (is_executive(organization_id));

create or replace function prevent_last_founder_downgrade()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if old.internal_role = 'founder_ceo'
     and (new.internal_role is distinct from 'founder_ceo' or new.suspended_at is not null) then
    if not exists (
      select 1 from organization_memberships m
      where m.organization_id = old.organization_id
        and m.profile_id <> old.profile_id
        and m.internal_role = 'founder_ceo'
        and m.suspended_at is null
        and (m.effective_until is null or m.effective_until > now())
    ) then
      raise exception 'cannot remove the last active founder_ceo from the organization';
    end if;
  end if;
  return new;
end;
$$;

revoke all on function prevent_last_founder_downgrade() from public;
drop trigger if exists trg_prevent_last_founder_downgrade on organization_memberships;
create trigger trg_prevent_last_founder_downgrade
  before update on organization_memberships
  for each row
  execute function prevent_last_founder_downgrade();

-- Executive-only destructive actions for operational records.
alter table projects enable row level security;
alter table client_organizations enable row level security;
alter table contacts enable row level security;
alter table client_internal_notes enable row level security;
alter table comments enable row level security;
alter table leads enable row level security;

drop policy if exists tasks_delete on tasks;
create policy tasks_delete on tasks for delete using (is_executive(organization_id));

drop policy if exists projects_delete on projects;
create policy projects_delete on projects for delete using (is_executive(organization_id));

drop policy if exists client_organizations_delete on client_organizations;
create policy client_organizations_delete on client_organizations for delete using (is_executive(organization_id));

drop policy if exists contacts_delete on contacts;
create policy contacts_delete on contacts for delete using (is_executive(organization_id));

drop policy if exists client_internal_notes_delete on client_internal_notes;
create policy client_internal_notes_delete on client_internal_notes for delete using (is_executive(organization_id));

drop policy if exists comments_delete on comments;
create policy comments_delete on comments for delete using (is_executive(organization_id));

drop policy if exists leads_delete on leads;
create policy leads_delete on leads for delete using (is_executive(organization_id));

-- Authenticated invitation preview with a deliberately narrow return shape.
alter table portal_invitations enable row level security;
create or replace function preview_portal_invitation(p_token_hash text)
returns table (client_organization_name text, initial_role client_role, expires_at timestamptz, status text)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_invitation portal_invitations%rowtype;
begin
  select * into v_invitation from portal_invitations where token_hash = p_token_hash;
  if not found then
    return;
  end if;

  return query
  select
    (select display_name from client_organizations where id = v_invitation.client_organization_id),
    v_invitation.initial_role,
    v_invitation.expires_at,
    case
      when v_invitation.revoked_at is not null then 'revoked'
      when v_invitation.accepted_at is not null then 'accepted'
      when v_invitation.expires_at <= now() then 'expired'
      else 'pending'
    end;
end;
$$;

revoke all on function preview_portal_invitation(text) from public;
revoke execute on function preview_portal_invitation(text) from anon;
grant execute on function preview_portal_invitation(text) to authenticated;

-- Client-visible documents remain classification-gated.
alter table documents enable row level security;
drop policy if exists documents_portal_read on documents;
create policy documents_portal_read on documents for select using (
  client_visible = true
  and classification = 'public'
  and status = 'active'
  and client_id is not null
  and is_portal_member(client_id)
);

-- Minimal client meeting schedule used by the portal.
create table if not exists client_meetings (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id),
  client_organization_id uuid not null references client_organizations(id),
  project_id uuid references projects(id),
  title text not null,
  scheduled_at timestamptz not null,
  duration_minutes int check (duration_minutes is null or duration_minutes > 0),
  location text,
  agenda text,
  status text not null default 'scheduled' check (status in ('scheduled', 'completed', 'cancelled')),
  created_by uuid references profiles(id),
  created_at timestamptz not null default now()
);

alter table client_meetings enable row level security;
drop policy if exists client_meetings_internal on client_meetings;
create policy client_meetings_internal on client_meetings for all
  using (is_internal_member(organization_id))
  with check (is_internal_member(organization_id));

drop policy if exists client_meetings_portal_read on client_meetings;
create policy client_meetings_portal_read on client_meetings for select
  using (is_portal_member(client_organization_id));
