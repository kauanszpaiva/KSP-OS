-- KSP INC temporary-access owner boundary.
--
-- The original identity foundation used one FOR ALL policy guarded by
-- is_internal_member(organization_id). That made every active internal member
-- able to create, alter, or delete temporary permission grants through the Data
-- API. Temporary access is an authorization mutation and belongs to the same
-- owner boundary as internal_permission_grants: founder_ceo or
-- executive_operations.
--
-- Keep self-read so getAuthContext() can hydrate a signed-in user's own active
-- temporary grants. Owners retain organization-wide read visibility for access
-- review and administration. Mutations are owner-only at the database boundary.

drop policy if exists temporary_access_internal on public.temporary_access_grants;
drop policy if exists temporary_access_self_or_owner_read on public.temporary_access_grants;
drop policy if exists temporary_access_owner_insert on public.temporary_access_grants;
drop policy if exists temporary_access_owner_update on public.temporary_access_grants;
drop policy if exists temporary_access_owner_delete on public.temporary_access_grants;

create policy temporary_access_self_or_owner_read
on public.temporary_access_grants
for select
to authenticated
using (
  profile_id = auth.uid()
  or public.is_executive(organization_id)
);

create policy temporary_access_owner_insert
on public.temporary_access_grants
for insert
to authenticated
with check (public.is_executive(organization_id));

create policy temporary_access_owner_update
on public.temporary_access_grants
for update
to authenticated
using (public.is_executive(organization_id))
with check (public.is_executive(organization_id));

create policy temporary_access_owner_delete
on public.temporary_access_grants
for delete
to authenticated
using (public.is_executive(organization_id));

-- Migration-level contract checks. The repository DB harness applies every
-- migration against fresh PostgreSQL and production-like drift databases, so
-- these assertions make the existing `pnpm test:db` gate fail if the broad
-- mutation policy survives or any owner-only mutation policy is missing.
do $$
begin
  if exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'temporary_access_grants'
      and policyname = 'temporary_access_internal'
  ) then
    raise exception 'temporary_access_internal broad mutation policy still exists';
  end if;

  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'temporary_access_grants'
      and policyname = 'temporary_access_self_or_owner_read'
      and cmd = 'SELECT'
      and qual like '%is_executive%'
      and qual like '%auth.uid%'
  ) then
    raise exception 'temporary access self/owner read policy contract missing';
  end if;

  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'temporary_access_grants'
      and policyname = 'temporary_access_owner_insert'
      and cmd = 'INSERT'
      and with_check like '%is_executive%'
  ) then
    raise exception 'temporary access owner insert policy contract missing';
  end if;

  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'temporary_access_grants'
      and policyname = 'temporary_access_owner_update'
      and cmd = 'UPDATE'
      and qual like '%is_executive%'
      and with_check like '%is_executive%'
  ) then
    raise exception 'temporary access owner update policy contract missing';
  end if;

  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'temporary_access_grants'
      and policyname = 'temporary_access_owner_delete'
      and cmd = 'DELETE'
      and qual like '%is_executive%'
  ) then
    raise exception 'temporary access owner delete policy contract missing';
  end if;
end $$;
