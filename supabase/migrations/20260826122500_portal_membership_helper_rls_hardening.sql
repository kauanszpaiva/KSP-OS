-- Keep the boolean portal membership helper independent from client_memberships RLS.
-- The function exposes no membership rows or attributes: it answers only whether
-- auth.uid() currently holds an active membership for the requested client org.
-- This avoids circular/ordering-sensitive RLS evaluation in drift rehearsals.

create or replace function public.is_portal_member(client_org uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.client_memberships cm
    where cm.profile_id = auth.uid()
      and cm.client_organization_id = client_org
      and cm.suspended_at is null
      and cm.effective_from <= pg_catalog.now()
      and (cm.effective_until is null or cm.effective_until > pg_catalog.now())
  )
$$;

revoke all on function public.is_portal_member(uuid) from public, anon, authenticated, service_role;
grant execute on function public.is_portal_member(uuid) to authenticated;
