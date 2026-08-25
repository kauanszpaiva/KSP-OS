-- Invitation context V5: one contract for Portal and Network.
-- Additive only. Production application remains a separately gated action.
-- The raw bearer token is never stored in either invitation table.

begin;

alter table public.portal_invitations
  add column if not exists surface text not null default 'portal',
  add column if not exists context_version integer not null default 1,
  add column if not exists scope jsonb not null default '{}'::jsonb,
  add column if not exists team_key text;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.portal_invitations'::regclass
      and conname = 'portal_invitations_surface_check'
  ) then
    alter table public.portal_invitations
      add constraint portal_invitations_surface_check check (surface = 'portal');
  end if;
  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.portal_invitations'::regclass
      and conname = 'portal_invitations_context_version_check'
  ) then
    alter table public.portal_invitations
      add constraint portal_invitations_context_version_check check (context_version = 1);
  end if;
  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.portal_invitations'::regclass
      and conname = 'portal_invitations_scope_object_check'
  ) then
    alter table public.portal_invitations
      add constraint portal_invitations_scope_object_check check (jsonb_typeof(scope) = 'object');
  end if;
  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.portal_invitations'::regclass
      and conname = 'portal_invitations_scope_org_check'
  ) then
    alter table public.portal_invitations
      add constraint portal_invitations_scope_org_check check (
        scope->>'organizationId' is null
        or scope->>'organizationId' = organization_id::text
      );
  end if;
  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.portal_invitations'::regclass
      and conname = 'portal_invitations_scope_client_check'
  ) then
    alter table public.portal_invitations
      add constraint portal_invitations_scope_client_check check (
        scope->>'clientOrganizationId' is null
        or scope->>'clientOrganizationId' = client_organization_id::text
      );
  end if;
  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.portal_invitations'::regclass
      and conname = 'portal_invitations_scope_surface_check'
  ) then
    alter table public.portal_invitations
      add constraint portal_invitations_scope_surface_check check (
        not (scope ? 'partnerOrganizationId')
      );
  end if;
  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.portal_invitations'::regclass
      and conname = 'portal_invitations_team_key_check'
  ) then
    alter table public.portal_invitations
      add constraint portal_invitations_team_key_check check (
        team_key is null or team_key ~ '^[a-z0-9][a-z0-9_-]{0,62}$'
      );
  end if;
end
$$;

create index if not exists portal_invitations_context_idx
  on public.portal_invitations(organization_id, surface, client_organization_id, expires_at);

create table if not exists public.partner_invitations (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  partner_organization_id uuid not null,
  email text not null,
  role text not null constraint partner_invitations_role_check check (role in ('partner_owner','partner_coordinator','editor','uploader','viewer')),
  surface text not null default 'network' check (surface = 'network'),
  context_version integer not null default 1 check (context_version = 1),
  scope jsonb not null default '{}'::jsonb,
  team_key text,
  token_hash text not null unique,
  invited_by uuid not null references public.profiles(id) on delete restrict,
  expires_at timestamptz not null,
  revoked_at timestamptz,
  accepted_by uuid references public.profiles(id) on delete set null,
  accepted_at timestamptz,
  created_at timestamptz not null default now(),
  check (expires_at > created_at),
  check (jsonb_typeof(scope) = 'object'),
  check (
    scope->>'organizationId' is null
    or scope->>'organizationId' = organization_id::text
  ),
  check (
    scope->>'partnerOrganizationId' is null
    or scope->>'partnerOrganizationId' = partner_organization_id::text
  ),
  check (not (scope ? 'clientOrganizationId')),
  check (team_key is null or team_key ~ '^[a-z0-9][a-z0-9_-]{0,62}$'),
  foreign key (partner_organization_id, organization_id)
    references public.partner_organizations(id, organization_id) on delete cascade
);

create index if not exists partner_invitations_context_idx
  on public.partner_invitations(organization_id, partner_organization_id, expires_at);

alter table public.partner_invitations enable row level security;
revoke all on public.partner_invitations from anon;
grant select, insert, update on public.partner_invitations to authenticated;

drop policy if exists partner_invitations_internal on public.partner_invitations;
create policy partner_invitations_internal
  on public.partner_invitations
  for all
  to authenticated
  using (public.is_internal_member(organization_id))
  with check (public.is_internal_member(organization_id));

create or replace function public.preview_partner_invitation(p_token_hash text)
returns table(partner_organization_name text, role text, expires_at timestamptz, status text)
language sql
stable
security definer
set search_path = 'pg_catalog', 'public'
as $$
  select
    po.display_name,
    pi.role,
    pi.expires_at,
    case
      when pi.revoked_at is not null then 'revoked'
      when pi.accepted_at is not null then 'accepted'
      when pi.expires_at <= pg_catalog.now() then 'expired'
      else 'ready'
    end
  from public.partner_invitations pi
  join public.partner_organizations po
    on po.id = pi.partner_organization_id
   and po.organization_id = pi.organization_id
  where (select auth.uid()) is not null
    and pi.token_hash = p_token_hash
  order by pi.created_at desc
  limit 1;
$$;

revoke all on function public.preview_partner_invitation(text) from public, anon;
grant execute on function public.preview_partner_invitation(text) to authenticated;

create or replace function public.accept_partner_invitation(p_token_hash text)
returns table(partner_organization_id uuid)
language plpgsql
security definer
set search_path = 'pg_catalog', 'public'
as $$
declare
  v_invitation public.partner_invitations%rowtype;
  v_email text;
  v_partner_status text;
  v_inserted integer;
begin
  select *
    into v_invitation
    from public.partner_invitations
   where token_hash = p_token_hash
   for update;

  if not found then raise exception 'invitation_not_found'; end if;
  if v_invitation.surface <> 'network' or v_invitation.context_version <> 1 then
    raise exception 'invitation_context_invalid';
  end if;
  if v_invitation.revoked_at is not null then raise exception 'invitation_revoked'; end if;
  if v_invitation.accepted_at is not null then raise exception 'invitation_already_accepted'; end if;
  if v_invitation.expires_at <= pg_catalog.now() then raise exception 'invitation_expired'; end if;

  if v_invitation.scope->>'organizationId' is not null
     and v_invitation.scope->>'organizationId' <> v_invitation.organization_id::text then
    raise exception 'invitation_scope_invalid';
  end if;
  if v_invitation.scope->>'partnerOrganizationId' is not null
     and v_invitation.scope->>'partnerOrganizationId' <> v_invitation.partner_organization_id::text then
    raise exception 'invitation_scope_invalid';
  end if;
  if v_invitation.scope ? 'clientOrganizationId' then
    raise exception 'invitation_scope_invalid';
  end if;
  if jsonb_typeof(v_invitation.scope->'projectIds') = 'array'
     and jsonb_array_length(v_invitation.scope->'projectIds') > 0 then
    raise exception 'partner_invitation_scope_not_supported';
  end if;
  if nullif(v_invitation.team_key, '') is not null
     or nullif(v_invitation.scope->>'teamKey', '') is not null then
    raise exception 'partner_invitation_team_scope_not_supported';
  end if;

  select status into v_partner_status
    from public.partner_organizations
   where id = v_invitation.partner_organization_id
     and organization_id = v_invitation.organization_id;
  if v_partner_status is distinct from 'active' then
    raise exception 'partner_organization_inactive';
  end if;

  select email into v_email from public.profiles where id = auth.uid();
  if v_email is null or lower(v_email) <> lower(v_invitation.email) then
    raise exception 'invitation_email_mismatch';
  end if;

  insert into public.partner_memberships (
    organization_id,
    partner_organization_id,
    profile_id,
    role,
    created_by
  )
  values (
    v_invitation.organization_id,
    v_invitation.partner_organization_id,
    auth.uid(),
    v_invitation.role,
    v_invitation.invited_by
  )
  on conflict (partner_organization_id, profile_id) do nothing;

  get diagnostics v_inserted = row_count;
  if v_inserted = 0 then raise exception 'partner_membership_exists'; end if;

  update public.partner_invitations
     set accepted_by = auth.uid(), accepted_at = pg_catalog.now()
   where id = v_invitation.id;

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
    v_invitation.organization_id,
    auth.uid(),
    'network.invitation.accepted',
    'partner_invitations',
    v_invitation.id,
    'internal',
    jsonb_build_object(
      'partner_organization_id', v_invitation.partner_organization_id,
      'role', v_invitation.role,
      'surface', v_invitation.surface
    )
  );

  return query select v_invitation.partner_organization_id;
end;
$$;

revoke all on function public.accept_partner_invitation(text) from public, anon;
grant execute on function public.accept_partner_invitation(text) to authenticated;

-- Keep Portal acceptance authoritative over the persisted context. Existing
-- rows without a context object retain their historical owner behavior; new
-- rows carry the bounded project list created by the server action.
create or replace function public.accept_portal_invitation(p_token_hash text)
returns table(client_organization_id uuid)
language plpgsql
security definer
set search_path = 'pg_catalog', 'public'
as $$
declare
  v_invitation public.portal_invitations%rowtype;
  v_email text;
begin
  select *
    into v_invitation
    from public.portal_invitations
   where token_hash = p_token_hash or email_token_hash = p_token_hash
   order by created_at desc
   limit 1
   for update;

  if not found then raise exception 'invitation_not_found'; end if;
  if v_invitation.surface <> 'portal' or v_invitation.context_version <> 1 then
    raise exception 'invitation_context_invalid';
  end if;
  if v_invitation.revoked_at is not null then raise exception 'invitation_revoked'; end if;
  if v_invitation.accepted_at is not null then raise exception 'invitation_already_accepted'; end if;
  if v_invitation.expires_at <= pg_catalog.now() then raise exception 'invitation_expired'; end if;

  if v_invitation.scope->>'organizationId' is not null
     and v_invitation.scope->>'organizationId' <> v_invitation.organization_id::text then
    raise exception 'invitation_scope_invalid';
  end if;
  if v_invitation.scope->>'clientOrganizationId' is not null
     and v_invitation.scope->>'clientOrganizationId' <> v_invitation.client_organization_id::text then
    raise exception 'invitation_scope_invalid';
  end if;
  if v_invitation.scope ? 'partnerOrganizationId' then
    raise exception 'invitation_scope_invalid';
  end if;

  select email into v_email from public.profiles where id = auth.uid();
  if v_email is null or lower(v_email) <> lower(v_invitation.email) then
    raise exception 'invitation_email_mismatch';
  end if;

  insert into public.client_memberships (
    organization_id,
    client_organization_id,
    profile_id,
    role
  )
  values (
    v_invitation.organization_id,
    v_invitation.client_organization_id,
    auth.uid(),
    v_invitation.initial_role
  )
  on conflict (client_organization_id, profile_id, role) do nothing;

  if v_invitation.initial_role = 'client_owner'::public.client_role then
    insert into public.project_access_grants (
      organization_id,
      project_id,
      client_organization_id,
      profile_id,
      action,
      effective_from,
      created_by
    )
    select
      p.organization_id,
      p.id,
      v_invitation.client_organization_id,
      auth.uid(),
      'project.read'::public.permission_action,
      pg_catalog.now(),
      v_invitation.invited_by
    from public.projects p
    where p.organization_id = v_invitation.organization_id
      and p.client_id = v_invitation.client_organization_id
      and p.status <> 'archived'
      and (
        not (v_invitation.scope ? 'projectIds')
        or p.id::text in (
          select jsonb_array_elements_text(v_invitation.scope->'projectIds')
        )
      )
      and not exists (
        select 1
          from public.project_access_grants pag
         where pag.project_id = p.id
           and pag.profile_id = auth.uid()
           and pag.action = 'project.read'::public.permission_action
           and pag.revoked_at is null
      );
  end if;

  update public.portal_invitations
     set accepted_by = auth.uid(), accepted_at = pg_catalog.now()
   where id = v_invitation.id;

  return query select v_invitation.client_organization_id;
end;
$$;

commit;
