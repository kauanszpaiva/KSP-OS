-- Secure self-service activation for pre-approved KSP internal users.
-- The invitation UUID is only a selector. Authorization is bound to:
--   1) an active pre-approved invitation,
--   2) the exact invited email,
--   3) the invitation UUID echoed in Auth user metadata, and
--   4) Supabase email confirmation before the user can sign in.
--
-- No password is created or stored by KSP. The invited user chooses it directly
-- with Supabase Auth, and existing KSP RLS continues to gate every application read.

create table if not exists public.internal_account_invitations (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  email text not null,
  display_name text not null,
  internal_role public.internal_role not null,
  expires_at timestamptz not null default (now() + interval '14 days'),
  revoked_at timestamptz,
  activated_user_id uuid references public.profiles(id),
  activated_at timestamptz,
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  constraint internal_account_invitations_ksp_email
    check (email = lower(email) and email ~ '^[^[:space:]@]+@kspdominion[.]group$'),
  constraint internal_account_invitations_expiry
    check (expires_at > created_at),
  constraint internal_account_invitations_activation_pair
    check (
      (activated_user_id is null and activated_at is null)
      or
      (activated_user_id is not null and activated_at is not null)
    )
);

create unique index if not exists internal_account_invitations_one_active_per_email
  on public.internal_account_invitations (lower(email))
  where revoked_at is null and activated_at is null;

create index if not exists internal_account_invitations_org_idx
  on public.internal_account_invitations (organization_id);

alter table public.internal_account_invitations enable row level security;

revoke all on table public.internal_account_invitations from public, anon, authenticated;

create or replace function public.validate_internal_account_invitation(
  p_invite_id uuid,
  p_email text
)
returns jsonb
language sql
stable
security definer
set search_path = 'pg_catalog', 'public'
as $$
  select coalesce(
    (
      select jsonb_build_object(
        'valid', true,
        'display_name', i.display_name
      )
      from public.internal_account_invitations i
      where i.id = p_invite_id
        and i.email = lower(pg_catalog.btrim(coalesce(p_email, '')))
        and i.revoked_at is null
        and i.activated_at is null
        and i.expires_at > now()
      limit 1
    ),
    jsonb_build_object('valid', false)
  );
$$;

revoke all on function public.validate_internal_account_invitation(uuid, text) from public;
grant execute on function public.validate_internal_account_invitation(uuid, text) to anon, authenticated;

create or replace function private.ksp_activate_internal_account_invitation()
returns trigger
language plpgsql
security definer
set search_path = 'pg_catalog', 'public', 'private'
as $$
declare
  v_invite_id uuid;
  v_invite public.internal_account_invitations%rowtype;
begin
  if new.email is null then
    return new;
  end if;

  begin
    v_invite_id := nullif(new.raw_user_meta_data ->> 'ksp_internal_invite_id', '')::uuid;
  exception
    when invalid_text_representation then
      return new;
  end;

  if v_invite_id is null then
    return new;
  end if;

  select i.*
  into v_invite
  from public.internal_account_invitations i
  where i.id = v_invite_id
    and i.email = lower(new.email)
    and i.revoked_at is null
    and i.activated_at is null
    and i.expires_at > now()
  for update;

  if not found then
    return new;
  end if;

  insert into public.organization_memberships (
    organization_id,
    profile_id,
    role,
    internal_role,
    scope,
    suspended_at,
    effective_until
  )
  values (
    v_invite.organization_id,
    new.id,
    v_invite.internal_role::text::public.app_role,
    v_invite.internal_role,
    'assigned',
    null,
    null
  )
  on conflict (organization_id, profile_id, role)
  do update set
    internal_role = excluded.internal_role,
    scope = excluded.scope,
    suspended_at = null,
    effective_until = null;

  update public.internal_account_invitations
  set activated_user_id = new.id,
      activated_at = now()
  where id = v_invite.id;

  insert into public.audit_events (
    organization_id,
    actor_id,
    action,
    target_table,
    target_id,
    classification,
    metadata
  )
  values (
    v_invite.organization_id,
    new.id,
    'identity.internal_invitation_activated',
    'internal_account_invitations',
    v_invite.id,
    'internal',
    jsonb_build_object(
      'email', lower(new.email),
      'internal_role', v_invite.internal_role::text
    )
  );

  return new;
end;
$$;

revoke all on function private.ksp_activate_internal_account_invitation() from public, anon, authenticated, service_role;

drop trigger if exists zz_ksp_internal_invitation_activation on auth.users;
create trigger zz_ksp_internal_invitation_activation
after insert on auth.users
for each row
execute function private.ksp_activate_internal_account_invitation();
