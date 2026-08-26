-- Invitation Context V5 hardening.
--
-- This follow-up intentionally runs after 20260825173000_invitation_context_v5.sql
-- so the final runtime contract cannot be weakened by the broader V5 function
-- replacement. It is source-only until a separately approved migration rollout.

-- Network billing is a first-class identity role. It remains operationally
-- isolated by the partner-assignment RLS introduced in Authority Engine V4.
alter table public.partner_invitations
  drop constraint if exists partner_invitations_role_check;
alter table public.partner_invitations
  add constraint partner_invitations_role_check
  check (role in ('partner_owner','partner_coordinator','billing','editor','uploader','viewer'));

-- Invitation bearer-token rows are an administrative surface, not general
-- internal workspace data. Direct table access is executive-only; invitees use
-- the narrow preview/accept security-definer functions instead.
drop policy if exists partner_invitations_internal on public.partner_invitations;
drop policy if exists partner_invitations_read on public.partner_invitations;
drop policy if exists partner_invitations_insert on public.partner_invitations;
drop policy if exists partner_invitations_update on public.partner_invitations;

revoke all on public.partner_invitations from anon;
revoke all on public.partner_invitations from authenticated;
grant select, insert on public.partner_invitations to authenticated;
grant update (revoked_at) on public.partner_invitations to authenticated;

create policy partner_invitations_read on public.partner_invitations
for select to authenticated
using (public.is_executive(organization_id));

create policy partner_invitations_insert on public.partner_invitations
for insert to authenticated
with check (
  public.is_executive(organization_id)
  and invited_by = (select auth.uid())
  and revoked_at is null
  and accepted_at is null
  and expires_at > now()
);

create policy partner_invitations_update on public.partner_invitations
for update to authenticated
using (public.is_executive(organization_id))
with check (public.is_executive(organization_id));

-- New Network invitations must carry a complete, self-consistent context. The
-- current Network invitation slice deliberately supports organization/company
-- context only; project/team scoping remains fail-closed until its ledger is
-- implemented.
do $do$
begin
  if not exists (
    select 1
    from pg_constraint
    where conrelid = 'public.partner_invitations'::regclass
      and conname = 'partner_invitations_scope_required_context_check'
  ) then
    alter table public.partner_invitations
      add constraint partner_invitations_scope_required_context_check
      check (
        jsonb_typeof(scope) = 'object'
        and scope ->> 'organizationId' = organization_id::text
        and scope ->> 'partnerOrganizationId' = partner_organization_id::text
        and not (scope ? 'clientOrganizationId')
        and (
          not (scope ? 'projectIds')
          or (
            jsonb_typeof(scope -> 'projectIds') = 'array'
            and jsonb_array_length(scope -> 'projectIds') = 0
          )
        )
        and (
          not (scope ? 'teamKey')
          or scope -> 'teamKey' = 'null'::jsonb
          or scope ->> 'teamKey' = ''
        )
      );
  end if;
end
$do$;

-- Final Portal acceptance contract: every invited role gets exactly the
-- persisted scope.projectIds after tenant validation. Role does not silently
-- expand project visibility. Owners retain historical "all current projects"
-- behavior only because invite creation/backfill explicitly persists that list.
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
  if v_invitation.surface <> 'portal' or v_invitation.context_version <> 1 then
    raise exception 'invitation_context_invalid';
  end if;
  if v_invitation.revoked_at is not null then raise exception 'invitation_revoked'; end if;
  if v_invitation.accepted_at is not null then raise exception 'invitation_already_accepted'; end if;
  if v_invitation.expires_at <= pg_catalog.now() then raise exception 'invitation_expired'; end if;

  if jsonb_typeof(v_invitation.scope) <> 'object'
     or v_invitation.scope ->> 'organizationId' is distinct from v_invitation.organization_id::text
     or v_invitation.scope ->> 'clientOrganizationId' is distinct from v_invitation.client_organization_id::text
     or jsonb_typeof(v_invitation.scope -> 'projectIds') <> 'array'
     or jsonb_array_length(v_invitation.scope -> 'projectIds') > 500
     or v_invitation.scope ? 'partnerOrganizationId' then
    raise exception 'invitation_scope_invalid';
  end if;

  select p.email into v_email
  from public.profiles p
  where p.id = auth.uid();
  if v_email is null or lower(v_email) <> lower(v_invitation.email) then
    raise exception 'invitation_email_mismatch';
  end if;

  -- Validate the complete project set before writing membership/grants so an
  -- invalid context cannot leave a partially accepted invitation.
  for v_project_text in
    select value from jsonb_array_elements_text(v_invitation.scope -> 'projectIds') as t(value)
  loop
    if v_project_text !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' then
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
  end loop;

  insert into public.client_memberships (
    organization_id,
    client_organization_id,
    profile_id,
    role
  ) values (
    v_invitation.organization_id,
    v_invitation.client_organization_id,
    auth.uid(),
    v_invitation.initial_role
  )
  on conflict (client_organization_id, profile_id, role) do nothing;

  for v_project_text in
    select value from jsonb_array_elements_text(v_invitation.scope -> 'projectIds') as t(value)
  loop
    v_project_id := v_project_text::uuid;

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
        pg_catalog.now(),
        v_invitation.invited_by
      );
    end if;
  end loop;

  update public.portal_invitations
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
  ) values (
    v_invitation.organization_id,
    auth.uid(),
    'portal.invitation.accepted',
    'portal_invitations',
    v_invitation.id,
    'internal',
    jsonb_build_object(
      'client_organization_id', v_invitation.client_organization_id,
      'role', v_invitation.initial_role,
      'surface', v_invitation.surface,
      'project_count', jsonb_array_length(v_invitation.scope -> 'projectIds'),
      'team_key', v_invitation.team_key
    )
  );

  return query select v_invitation.client_organization_id;
end;
$$;
revoke all on function public.accept_portal_invitation(text) from public, anon;
grant execute on function public.accept_portal_invitation(text) to authenticated;

-- Final Network acceptance accepts billing as a valid company membership while
-- preserving the current fail-closed no-project/no-team invitation contract.
create or replace function public.accept_partner_invitation(p_token_hash text)
returns table(partner_organization_id uuid)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_invitation public.partner_invitations%rowtype;
  v_email text;
  v_partner_status text;
  v_inserted integer;
begin
  if auth.uid() is null then raise exception 'authentication_required'; end if;

  select * into v_invitation
  from public.partner_invitations
  where token_hash = p_token_hash
  order by created_at desc
  limit 1
  for update;

  if not found then raise exception 'invitation_not_found'; end if;
  if v_invitation.surface <> 'network' or v_invitation.context_version <> 1 then
    raise exception 'invitation_context_invalid';
  end if;
  if v_invitation.revoked_at is not null then raise exception 'invitation_revoked'; end if;
  if v_invitation.accepted_at is not null then raise exception 'invitation_already_accepted'; end if;
  if v_invitation.expires_at <= pg_catalog.now() then raise exception 'invitation_expired'; end if;
  if v_invitation.role not in ('partner_owner','partner_coordinator','billing','editor','uploader','viewer') then
    raise exception 'invitation_role_invalid';
  end if;

  if jsonb_typeof(v_invitation.scope) <> 'object'
     or v_invitation.scope ->> 'organizationId' is distinct from v_invitation.organization_id::text
     or v_invitation.scope ->> 'partnerOrganizationId' is distinct from v_invitation.partner_organization_id::text
     or v_invitation.scope ? 'clientOrganizationId' then
    raise exception 'invitation_scope_invalid';
  end if;
  if jsonb_typeof(v_invitation.scope -> 'projectIds') = 'array'
     and jsonb_array_length(v_invitation.scope -> 'projectIds') > 0 then
    raise exception 'partner_invitation_scope_not_supported';
  end if;
  if nullif(v_invitation.team_key, '') is not null
     or nullif(v_invitation.scope ->> 'teamKey', '') is not null then
    raise exception 'partner_invitation_team_scope_not_supported';
  end if;

  select po.status into v_partner_status
  from public.partner_organizations po
  where po.id = v_invitation.partner_organization_id
    and po.organization_id = v_invitation.organization_id;
  if v_partner_status is distinct from 'active' then
    raise exception 'partner_organization_inactive';
  end if;

  select p.email into v_email
  from public.profiles p
  where p.id = auth.uid();
  if v_email is null or lower(v_email) <> lower(v_invitation.email) then
    raise exception 'invitation_email_mismatch';
  end if;

  insert into public.partner_memberships (
    organization_id,
    partner_organization_id,
    profile_id,
    role,
    created_by
  ) values (
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
  ) values (
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
