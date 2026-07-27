-- Phase P2.2 follow-up (Portal Meetings): the "Schedule" half of the
-- "Meetings & Requests" portal screen (PRODUCT_INFORMATION_ARCHITECTURE.md §12).
-- The Requests half already exists (client_requests); this adds the meeting
-- schedule the client can see.
--
-- Deliberately minimal, matching the spec's single word "Schedule": staff
-- schedule meetings against a client org (optionally a project); the client
-- reads their own org's meetings. No client-side booking, availability, or
-- calendar-sync logic is invented here — those are not specified and would be
-- business-rule invention. status is a small closed set; scheduled_at is the
-- only required time field.

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

-- Internal members manage meetings for their organization.
create policy client_meetings_internal on client_meetings for all
  using (is_internal_member(organization_id))
  with check (is_internal_member(organization_id));

-- Clients read only their own organization's meetings (never write).
create policy client_meetings_portal_read on client_meetings for select
  using (is_portal_member(client_organization_id));
