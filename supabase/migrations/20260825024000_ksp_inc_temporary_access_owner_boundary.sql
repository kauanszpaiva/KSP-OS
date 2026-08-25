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
