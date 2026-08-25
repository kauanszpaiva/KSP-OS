-- KSP OS Authority Engine V4 — Portal invitation context.
--
-- Persists the authorization context that was selected at invite time so
-- accepting an invitation cannot silently expand a client identity's scope.
-- Existing invitations are backfilled to the previous safe behavior:
-- client_owner -> current non-archived client projects; every other role -> no
-- project grants until explicitly selected.

alter table public.portal_invitations
  add column if not exists surface text not null default 'portal',
  add column if not exists context_version smallint not null default 1,
  add column if not exists scope jsonb,
  add column if not exists team_key text;

update public.portal_invitations pi
set scope = jsonb_build_object(
  'organizationId', pi.organization_id::text,
  'clientOrganizationId', pi.client_organization_id::text,
  'projectIds', case
    when pi.initial_role = 'client_owner'::public.client_role then coalesce((
      select jsonb_agg(p.id::text order by p.created_at, p.id)
      from public.projects p
      where p.organization_id = pi.organization_id
        and p.client_id = pi.client_organization_id
        and p.status <> 'archived'
    ), '[]'::jsonb)
    else '[]'::jsonb
  end,
  'teamKey', null
)
where pi.scope is null;

alter table public.portal_invitations
  alter column scope set default '{}'::jsonb,
  alter column scope set not null;

do $do$
begin
  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.portal_invitations'::regclass
      and conname = 'portal_invitations_surface_check'
  ) then
    alter table public.portal_invitations
      add constraint portal_invitations_surface_check
      check (surface = 'portal');
  end if;

  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.portal_invitations'::regclass
      and conname = 'portal_invitations_context_version_check'
  ) then
    alter table public.portal_invitations
      add constraint portal_invitations_context_version_check
      check (context_version = 1);
  end if;

  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.portal_invitations'::regclass
      and conname = 'portal_invitations_scope_shape_check'
  ) then
    alter table public.portal_invitations
      add constraint portal_invitations_scope_shape_check
      check (
        jsonb_typeof(scope) = 'object'
        and scope ->> 'organizationId' = organization_id::text
        and scope ->> 'clientOrganizationId' = client_organization_id::text
        and jsonb_typeof(scope -> 'projectIds') = 'array'
        and jsonb_array_length(scope -> 'projectIds') <= 500
        and (
          not (scope ? 'teamKey')
          or scope -> 'teamKey' = 'null'::jsonb
          or (
            jsonb_typeof(scope -> 'teamKey') = 'string'
            and (scope ->> 'teamKey') ~ '^[a-z0-9][a-z0-9_-]{0,62}$'
          )
        )
      );
  end if;
end
$do$;

create schema if not exists portal_private;
revoke all on schema portal_private from public, anon;
grant usage on schema portal_private to authenticated;

create or replace function portal_private.validate_portal_invitation_scope()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  project_text text;
  project_uuid uuid;
begin
  if new.surface <> 'portal' or new.context_version <> 1 then
    raise exception 'invalid_portal_invitation_context_version';
  end if;

  if jsonb_typeof(new.scope) <> 'object'
     or new.scope ->> 'organizationId' is distinct from new.organization_id::text
     or new.scope ->> 'clientOrganizationId' is distinct from new.client_organization_id::text
     or jsonb_typeof(new.scope -> 'projectIds') <> 'array'
     or jsonb_array_length(new.scope -> 'projectIds') > 500 then
    raise exception 'invalid_portal_invitation_scope';
  end if;

  if new.scope ? 'teamKey' and new.scope -> 'teamKey' <> 'null'::jsonb then
    if jsonb_typeof(new.scope -> 'teamKey') <> 'string'
       or (new.scope ->> 'teamKey') !~ '^[a-z0-9][a-z0-9_-]{0,62}$' then
      raise exception 'invalid_portal_invitation_team_key';
    end if;
    new.team_key := new.scope ->> 'teamKey';
  else
    new.team_key := null;
  end if;

  for project_text in
    select value from jsonb_array_elements_text(new.scope -> 'projectIds') as t(value)
  loop
    if project_text !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$' then
      raise exception 'invalid_portal_invitation_project_id';
    end if;
    project_uuid := project_text::uuid;

    if not exists (
      select 1
      from public.projects p
      where p.id = project_uuid
        and p.organization_id = new.organization_id
        and p.client_id = new.client_organization_id
        and p.status <> 'archived'
    ) then
      raise exception 'portal_invitation_project_outside_scope';
    end if;
  end loop;

  return new;
end;
$$;
revoke all on function portal_private.validate_portal_invitation_scope() from public, anon, authenticated;

drop trigger if exists portal_invitation_scope_guard on public.portal_invitations;
create trigger portal_invitation_scope_guard
before insert or update of organization_id, client_organization_id, surface, context_version, scope, team_key
on public.portal_invitations
for each row execute function portal_private.validate_portal_invitation_scope();

-- The invitation email must describe the same selected project scope that will
-- later be granted. Patch the reviewed predicate from either the original
-- trigger or a later presentation-only replacement. The operation is
-- idempotent so migration replay never silently drifts the email scope.
do $do$
declare
  ddl text;
  original text;
begin
  select pg_get_functiondef('public.ksp_portal_invitation_email_before_insert()'::regprocedure) into ddl;
  original := ddl;

  if position(
    'jsonb_array_elements_text(coalesce(new.scope -> ''projectIds'', ''[]''::jsonb))'
    in ddl
  ) = 0 then
    ddl := replace(
      ddl,
      '    and new.initial_role = ''client_owner''::public.client_role;',
      '    and p.id::text in (' || chr(10) ||
      '      select jsonb_array_elements_text(coalesce(new.scope -> ''projectIds'', ''[]''::jsonb))' || chr(10) ||
      '    );'
    );

    if ddl = original then
      ddl := replace(
        ddl,
        '    and p.status <> ''archived'';',
        '    and p.status <> ''archived''' || chr(10) ||
        '    and p.id::text in (' || chr(10) ||
        '      select jsonb_array_elements_text(coalesce(new.scope -> ''projectIds'', ''[]''::jsonb))' || chr(10) ||
        '    );'
      );
    end if;

    if ddl = original then
      raise exception 'expected safe invitation email project predicate not found';
    end if;

    execute ddl;
  end if;
end
$do$;

create or replace function public.accept_portal_invitation(p_token_hash text)
returns table(client_organization_id uuid)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_invitation public.portal_invitations%rowtype;
  v_email text;
  v_project_text text;
  v_project_id uuid;
begin
  if auth.uid() is null then raise exception 'authentication_required'; end if;

  select * into v_invitation
  from public.portal_invitations
  where token_hash = p_token_hash or email_token_hash = p_token_hash
  order by created_at desc
  limit 1
  for update;

  if not found then raise exception 'invitation_not_found'; end if;
  if v_invitation.revoked_at is not null then raise exception 'invitation_revoked'; end if;
  if v_invitation.accepted_at is not null then raise exception 'invitation_already_accepted'; end if;
  if v_invitation.expires_at <= now() then raise exception 'invitation_expired'; end if;
  if v_invitation.surface <> 'portal' or v_invitation.context_version <> 1 then
    raise exception 'invalid_invitation_surface';
  end if;
  if jsonb_typeof(v_invitation.scope) <> 'object'
     or v_invitation.scope ->> 'organizationId' is distinct from v_invitation.organization_id::text
     or v_invitation.scope ->> 'clientOrganizationId' is distinct from v_invitation.client_organization_id::text
     or jsonb_typeof(v_invitation.scope -> 'projectIds') <> 'array' then
    raise exception 'invalid_invitation_scope';
  end if;

  select p.email into v_email
  from public.profiles p
  where p.id = auth.uid();
  if v_email is null or lower(v_email) <> lower(v_invitation.email) then
    raise exception 'invitation_email_mismatch';
  end if;

  insert into public.client_memberships (organization_id, client_organization_id, profile_id, role)
  values (v_invitation.organization_id, v_invitation.client_organization_id, auth.uid(), v_invitation.initial_role)
  on conflict (client_organization_id, profile_id, role) do nothing;

  for v_project_text in
    select value from jsonb_array_elements_text(v_invitation.scope -> 'projectIds') as t(value)
  loop
    if v_project_text !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$' then
      raise exception 'invalid_invitation_project_id';
    end if;
    v_project_id := v_project_text::uuid;

    if not exists (
      select 1
      from public.projects p
      where p.id = v_project_id
        and p.organization_id = v_invitation.organization_id
        and p.client_id = v_invitation.client_organization_id
        and p.status <> 'archived'
    ) then
      raise exception 'invitation_project_outside_scope';
    end if;

    if not exists (
      select 1
      from public.project_access_grants pag
      where pag.organization_id = v_invitation.organization_id
        and pag.project_id = v_project_id
        and pag.client_organization_id = v_invitation.client_organization_id
        and pag.profile_id = auth.uid()
        and pag.action = 'project.read'::public.permission_action
        and pag.revoked_at is null
    ) then
      insert into public.project_access_grants (
        organization_id,
        project_id,
        client_organization_id,
        profile_id,
        action,
        effective_from,
        created_by
      ) values (
        v_invitation.organization_id,
        v_project_id,
        v_invitation.client_organization_id,
        auth.uid(),
        'project.read'::public.permission_action,
        now(),
        v_invitation.invited_by
      );
    end if;
  end loop;

  update public.portal_invitations
  set accepted_by = auth.uid(), accepted_at = now()
  where id = v_invitation.id;

  return query select v_invitation.client_organization_id;
end;
$$;
revoke all on function public.accept_portal_invitation(text) from public, anon;
grant execute on function public.accept_portal_invitation(text) to authenticated;

comment on column public.portal_invitations.scope is
  'Immutable-at-acceptance authorization context selected by the inviter. Project grants are created only from scope.projectIds after tenant validation.';
