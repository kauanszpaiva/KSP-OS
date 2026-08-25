-- KSP INC owner boundary for temporary access grants.
--
-- The legacy `temporary_access_internal` ALL policy allowed any active internal
-- member to mutate temporary entitlements. KSP OS Access Graph v3 makes access
-- administration an owner-plane responsibility, so mutations must fail closed
-- for ordinary Command users while recipients retain visibility into their own
-- active grants.

alter table public.temporary_access_grants enable row level security;

drop policy if exists temporary_access_internal on public.temporary_access_grants;
drop policy if exists temporary_access_read on public.temporary_access_grants;
drop policy if exists temporary_access_insert on public.temporary_access_grants;
drop policy if exists temporary_access_update on public.temporary_access_grants;
drop policy if exists temporary_access_delete on public.temporary_access_grants;

create policy temporary_access_read
on public.temporary_access_grants
for select to authenticated
using (
  public.is_executive(organization_id)
  or profile_id = (select auth.uid())
);

create policy temporary_access_insert
on public.temporary_access_grants
for insert to authenticated
with check (
  public.is_executive(organization_id)
  and created_by = (select auth.uid())
  and revoked_at is null
  and effective_from <= now()
  and effective_until > now()
  and exists (
    select 1
    from public.organization_memberships om
    where om.organization_id = temporary_access_grants.organization_id
      and om.profile_id = temporary_access_grants.profile_id
      and om.internal_role is not null
      and om.suspended_at is null
      and om.effective_from <= now()
      and (om.effective_until is null or om.effective_until > now())
  )
);

create policy temporary_access_update
on public.temporary_access_grants
for update to authenticated
using (public.is_executive(organization_id))
with check (public.is_executive(organization_id));

-- No DELETE policy by design. Revocation is an UPDATE to revoked_at so access
-- history remains available to KSP INC audit/review workflows.
