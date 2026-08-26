-- Keep the custom KSP recovery relay from bypassing the per-user cooldown that
-- Supabase applies to /auth/v1/recover. admin.generateLink() intentionally does
-- not perform the standard email-send frequency check, so the relay must gate
-- token generation before asking GoTrue for a new recovery token.

create or replace function public.ksp_can_generate_recovery_link(
  p_email text,
  p_cooldown_seconds integer default 60
)
returns boolean
language sql
stable
security definer
set search_path = pg_catalog, auth
as $$
  select exists (
    select 1
    from auth.users u
    where pg_catalog.lower(u.email) = pg_catalog.lower(pg_catalog.btrim(p_email))
      and (
        u.recovery_sent_at is null
        or u.recovery_sent_at <= pg_catalog.now() - pg_catalog.make_interval(
          secs => case
            when coalesce(p_cooldown_seconds, 60) < 60 then 60
            else coalesce(p_cooldown_seconds, 60)
          end
        )
      )
  );
$$;

revoke all on function public.ksp_can_generate_recovery_link(text, integer) from public;
revoke all on function public.ksp_can_generate_recovery_link(text, integer) from anon;
revoke all on function public.ksp_can_generate_recovery_link(text, integer) from authenticated;
grant execute on function public.ksp_can_generate_recovery_link(text, integer) to service_role;

comment on function public.ksp_can_generate_recovery_link(text, integer) is
  'Service-role-only gate for KSP custom password recovery. Returns false for unknown users and for users whose last recovery token was generated less than 60 seconds ago.';
