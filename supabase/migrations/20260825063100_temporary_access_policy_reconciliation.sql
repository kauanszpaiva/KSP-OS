-- Reconcile the two historical temporary-access hardening paths (#144 and #145).
--
-- #144 introduced owner-named policies, while the later Access Graph migration
-- rebuilt generic policy names. PostgreSQL ORs permissive policies, so leaving the
-- older names in place would preserve a DELETE path and a broader owner INSERT
-- path than the final Access Graph contract intends.
--
-- Make the final table policy set canonical and singular:
-- - self-or-owner historical SELECT;
-- - owner-only INSERT with active-recipient + valid-window checks;
-- - owner-only UPDATE for revocation/history preservation;
-- - no DELETE policy.

alter table public.temporary_access_grants enable row level security;

drop policy if exists temporary_access_internal on public.temporary_access_grants;
drop policy if exists temporary_access_self_or_owner_read on public.temporary_access_grants;
drop policy if exists temporary_access_owner_insert on public.temporary_access_grants;
drop policy if exists temporary_access_owner_update on public.temporary_access_grants;
drop policy if exists temporary_access_owner_delete on public.temporary_access_grants;
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

-- No DELETE policy. Access is revoked by setting revoked_at so audit/history is
-- preserved and application permission hydration naturally stops using the row.
