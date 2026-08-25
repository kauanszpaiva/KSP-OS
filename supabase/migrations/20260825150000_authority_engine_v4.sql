-- KSP OS Authority Engine v4.
--
-- Additive access-control foundation extending Access Graph v3 with:
-- - granular operational and financial capabilities;
-- - explicit deny overrides;
-- - directional authority relationships (supervision/approval/billing/delegation);
-- - short, audited owner break-glass sessions.
--
-- This migration deliberately does not modify existing memberships, grants,
-- partner assignments, invoices, payments, or production users.

-- New capability labels are additive. Existing labels and semantics remain intact.
alter type public.permission_action add value if not exists 'work.read';
alter type public.permission_action add value if not exists 'work.manage';
alter type public.permission_action add value if not exists 'work.assign';
alter type public.permission_action add value if not exists 'deliverable.read';
alter type public.permission_action add value if not exists 'deliverable.review';
alter type public.permission_action add value if not exists 'deliverable.approve';
alter type public.permission_action add value if not exists 'invoice.create';
alter type public.permission_action add value if not exists 'invoice.submit';
alter type public.permission_action add value if not exists 'invoice.approve';
alter type public.permission_action add value if not exists 'payment.status.read';
alter type public.permission_action add value if not exists 'payment.schedule';
alter type public.permission_action add value if not exists 'payment.mark_paid';
alter type public.permission_action add value if not exists 'ar.manage';
alter type public.permission_action add value if not exists 'ap.manage';
alter type public.permission_action add value if not exists 'payout_method.manage';
alter type public.permission_action add value if not exists 'tax_profile.manage';
alter type public.permission_action add value if not exists 'pricing.internal.read';
alter type public.permission_action add value if not exists 'margin.read';
alter type public.permission_action add value if not exists 'cash.read';
alter type public.permission_action add value if not exists 'reconciliation.manage';

create table if not exists public.internal_permission_denies (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  profile_id uuid not null references public.profiles(id) on delete cascade,
  action public.permission_action not null,
  resource_type text,
  resource_id uuid,
  effective_from timestamptz not null default now(),
  effective_until timestamptz,
  reason text not null,
  denied_by uuid references public.profiles(id) on delete set null,
  revoked_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check ((resource_type is null) = (resource_id is null)),
  check (effective_until is null or effective_until > effective_from),
  check (char_length(btrim(reason)) between 3 and 1000)
);

create index if not exists internal_permission_denies_profile_idx
  on public.internal_permission_denies (organization_id, profile_id, action)
  where revoked_at is null;
create index if not exists internal_permission_denies_resource_idx
  on public.internal_permission_denies (organization_id, resource_type, resource_id)
  where revoked_at is null and resource_id is not null;

alter table public.internal_permission_denies enable row level security;
revoke all on public.internal_permission_denies from anon;
revoke all on public.internal_permission_denies from authenticated;
grant select, insert on public.internal_permission_denies to authenticated;
grant update (revoked_at, updated_at) on public.internal_permission_denies to authenticated;

drop policy if exists internal_permission_denies_read on public.internal_permission_denies;
create policy internal_permission_denies_read on public.internal_permission_denies
for select to authenticated
using (
  profile_id = (select auth.uid())
  or public.is_executive(organization_id)
);

drop policy if exists internal_permission_denies_insert on public.internal_permission_denies;
create policy internal_permission_denies_insert on public.internal_permission_denies
for insert to authenticated
with check (
  public.is_executive(organization_id)
  and denied_by = (select auth.uid())
  and revoked_at is null
  and effective_from <= now()
  and (effective_until is null or effective_until > now())
  and exists (
    select 1
    from public.organization_memberships om
    where om.organization_id = internal_permission_denies.organization_id
      and om.profile_id = internal_permission_denies.profile_id
      and om.suspended_at is null
      and om.effective_from <= now()
      and (om.effective_until is null or om.effective_until > now())
  )
);

drop policy if exists internal_permission_denies_update on public.internal_permission_denies;
create policy internal_permission_denies_update on public.internal_permission_denies
for update to authenticated
using (public.is_executive(organization_id))
with check (public.is_executive(organization_id));

comment on table public.internal_permission_denies is
  'Explicit authorization denies. Active matching rows override ordinary role/grant/relationship allows. Authenticated updates are limited to revocation metadata so history cannot be rewritten.';

create table if not exists public.authority_relationships (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  source_profile_id uuid not null references public.profiles(id) on delete cascade,
  target_profile_id uuid references public.profiles(id) on delete cascade,
  relationship_type text not null
    check (relationship_type in ('supervises', 'approver_for', 'billing_for', 'delegated_by')),
  action public.permission_action,
  resource_type text,
  resource_id uuid,
  effective_from timestamptz not null default now(),
  effective_until timestamptz,
  reason text,
  granted_by uuid references public.profiles(id) on delete set null,
  revoked_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (source_profile_id <> target_profile_id),
  check ((resource_type is null) = (resource_id is null)),
  check (effective_until is null or effective_until > effective_from),
  check (relationship_type <> 'supervises' or target_profile_id is not null),
  check (relationship_type = 'supervises' or action is not null),
  check (reason is null or char_length(btrim(reason)) <= 1000)
);

create index if not exists authority_relationships_source_idx
  on public.authority_relationships (organization_id, source_profile_id, relationship_type)
  where revoked_at is null;
create index if not exists authority_relationships_target_idx
  on public.authority_relationships (organization_id, target_profile_id, relationship_type)
  where revoked_at is null and target_profile_id is not null;
create index if not exists authority_relationships_resource_idx
  on public.authority_relationships (organization_id, resource_type, resource_id)
  where revoked_at is null and resource_id is not null;

alter table public.authority_relationships enable row level security;
revoke all on public.authority_relationships from anon;
revoke all on public.authority_relationships from authenticated;
grant select, insert on public.authority_relationships to authenticated;
grant update (revoked_at, updated_at) on public.authority_relationships to authenticated;

drop policy if exists authority_relationships_read on public.authority_relationships;
create policy authority_relationships_read on public.authority_relationships
for select to authenticated
using (
  source_profile_id = (select auth.uid())
  or public.is_executive(organization_id)
);

drop policy if exists authority_relationships_insert on public.authority_relationships;
create policy authority_relationships_insert on public.authority_relationships
for insert to authenticated
with check (
  public.is_executive(organization_id)
  and granted_by = (select auth.uid())
  and revoked_at is null
  and effective_from <= now()
  and (effective_until is null or effective_until > now())
  and exists (
    select 1
    from public.organization_memberships source_membership
    where source_membership.organization_id = authority_relationships.organization_id
      and source_membership.profile_id = authority_relationships.source_profile_id
      and source_membership.suspended_at is null
      and source_membership.effective_from <= now()
      and (source_membership.effective_until is null or source_membership.effective_until > now())
  )
  and (
    target_profile_id is null
    or exists (
      select 1
      from public.organization_memberships target_membership
      where target_membership.organization_id = authority_relationships.organization_id
        and target_membership.profile_id = authority_relationships.target_profile_id
        and target_membership.suspended_at is null
        and target_membership.effective_from <= now()
        and (target_membership.effective_until is null or target_membership.effective_until > now())
    )
  )
);

drop policy if exists authority_relationships_update on public.authority_relationships;
create policy authority_relationships_update on public.authority_relationships
for update to authenticated
using (public.is_executive(organization_id))
with check (public.is_executive(organization_id));

comment on table public.authority_relationships is
  'Directional authority edges. Supervision grants bounded downward operational context; it never implies upward or financial inheritance. Authenticated updates are limited to revocation metadata.';

create table if not exists public.access_break_glass_sessions (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  profile_id uuid not null references public.profiles(id) on delete cascade,
  action public.permission_action not null,
  resource_type text not null,
  resource_id uuid not null,
  effective_from timestamptz not null default now(),
  effective_until timestamptz not null,
  reason text not null,
  created_by uuid not null references public.profiles(id) on delete restrict,
  revoked_at timestamptz,
  created_at timestamptz not null default now(),
  check (profile_id = created_by),
  check (effective_until > effective_from),
  check (effective_until <= effective_from + interval '30 minutes'),
  check (char_length(btrim(reason)) between 12 and 1000)
);

create index if not exists access_break_glass_active_idx
  on public.access_break_glass_sessions (organization_id, profile_id, action, effective_until)
  where revoked_at is null;

alter table public.access_break_glass_sessions enable row level security;
revoke all on public.access_break_glass_sessions from anon;
revoke all on public.access_break_glass_sessions from authenticated;
grant select, insert on public.access_break_glass_sessions to authenticated;
grant update (revoked_at) on public.access_break_glass_sessions to authenticated;

drop policy if exists access_break_glass_read on public.access_break_glass_sessions;
create policy access_break_glass_read on public.access_break_glass_sessions
for select to authenticated
using (
  public.is_executive(organization_id)
  and profile_id = (select auth.uid())
);

drop policy if exists access_break_glass_insert on public.access_break_glass_sessions;
create policy access_break_glass_insert on public.access_break_glass_sessions
for insert to authenticated
with check (
  public.is_executive(organization_id)
  and profile_id = (select auth.uid())
  and created_by = (select auth.uid())
  and coalesce(
    nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'aal',
    ''
  ) = 'aal2'
  and revoked_at is null
  and effective_from <= now()
  and effective_until > now()
  and effective_until <= effective_from + interval '30 minutes'
);

drop policy if exists access_break_glass_update on public.access_break_glass_sessions;
create policy access_break_glass_update on public.access_break_glass_sessions
for update to authenticated
using (
  public.is_executive(organization_id)
  and profile_id = (select auth.uid())
)
with check (
  public.is_executive(organization_id)
  and profile_id = (select auth.uid())
  and created_by = (select auth.uid())
);

comment on table public.access_break_glass_sessions is
  'Short owner-only AAL2 emergency override records. Application logic may use them only to override an explicit deny in the same action/resource scope. Authenticated updates are limited to revoked_at.';
