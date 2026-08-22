-- Allow Command executives to inspect the identities that currently hold
-- client Portal memberships without weakening profile visibility for ordinary
-- internal members. The Command UI uses this to show active Portal emails by
-- client. Client users still only see their own profile through own_profile_read.

drop policy if exists profiles_client_portal_access_executive_read on public.profiles;
create policy profiles_client_portal_access_executive_read
on public.profiles
for select
to authenticated
using (
  exists (
    select 1
    from public.client_memberships cm
    where cm.profile_id = profiles.id
      and cm.suspended_at is null
      and (cm.effective_until is null or cm.effective_until > now())
      and public.is_executive(cm.organization_id)
  )
);
