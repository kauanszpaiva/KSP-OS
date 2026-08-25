-- Keep the application profile table synchronized with Supabase Auth users.
-- A profile does not grant Portal access by itself; client membership is still
-- created only by accept_portal_invitation after token, expiry, revocation,
-- authenticated user, and invited-email checks pass.

create or replace function public.ksp_sync_auth_user_profile()
returns trigger
language plpgsql
security definer
set search_path = 'pg_catalog', 'public'
as $$
declare
  v_display_name text;
begin
  if new.email is null then
    return new;
  end if;

  v_display_name := coalesce(
    nullif(pg_catalog.btrim(new.raw_user_meta_data ->> 'display_name'), ''),
    nullif(pg_catalog.btrim(new.raw_user_meta_data ->> 'full_name'), ''),
    nullif(pg_catalog.split_part(pg_catalog.lower(new.email), '@', 1), ''),
    'KSP OS User'
  );

  insert into public.profiles (id, display_name, email)
  values (new.id, v_display_name, pg_catalog.lower(new.email))
  on conflict (id) do update
    set email = excluded.email;

  return new;
end;
$$;

revoke all on function public.ksp_sync_auth_user_profile() from public, anon, authenticated, service_role;

drop trigger if exists ksp_auth_user_profile_sync on auth.users;
create trigger ksp_auth_user_profile_sync
after insert or update of email on auth.users
for each row execute function public.ksp_sync_auth_user_profile();

-- Repair historical Auth users that were created before the sync trigger existed.
-- This intentionally creates profiles only; it does not create organization or
-- client memberships, project grants, or any other authorization record.
insert into public.profiles (id, display_name, email)
select
  u.id,
  coalesce(
    nullif(pg_catalog.btrim(u.raw_user_meta_data ->> 'display_name'), ''),
    nullif(pg_catalog.btrim(u.raw_user_meta_data ->> 'full_name'), ''),
    nullif(pg_catalog.split_part(pg_catalog.lower(u.email), '@', 1), ''),
    'KSP OS User'
  ),
  pg_catalog.lower(u.email)
from auth.users u
where u.email is not null
on conflict (id) do update
  set email = excluded.email;
