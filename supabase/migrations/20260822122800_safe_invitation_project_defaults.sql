-- Safe invitation defaults: client owners inherit current projects. Every other
-- client role begins with zero project visibility and receives explicit grants
-- from Command after acceptance. This prevents brief accidental exposure.

-- Keep non-owner invitation emails from claiming that every client project is
-- included. The branded invitation function is defined in the immediately
-- preceding migration; patch only its project-list query while preserving the
-- reviewed template and provider behavior.
do $do$
declare
  ddl text;
  original text;
begin
  select pg_get_functiondef('public.ksp_portal_invitation_email_before_insert()'::regprocedure) into ddl;
  original := ddl;
  ddl := replace(
    ddl,
    '    and p.status <> ''archived'';',
    '    and p.status <> ''archived''' || chr(10) || '    and new.initial_role = ''client_owner''::public.client_role;'
  );
  if ddl = original then
    raise exception 'expected invitation project filter not found';
  end if;
  execute ddl;
end
$do$;

create or replace function public.accept_portal_invitation(p_token_hash text)
returns table(client_organization_id uuid)
language plpgsql
security definer
set search_path = 'public'
as $$
declare
  v_invitation public.portal_invitations%rowtype;
  v_email text;
begin
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

  select email into v_email from public.profiles where id = auth.uid();
  if v_email is null or lower(v_email) <> lower(v_invitation.email) then
    raise exception 'invitation_email_mismatch';
  end if;

  insert into public.client_memberships (organization_id, client_organization_id, profile_id, role)
  values (v_invitation.organization_id, v_invitation.client_organization_id, auth.uid(), v_invitation.initial_role)
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
      now(),
      v_invitation.invited_by
    from public.projects p
    where p.organization_id = v_invitation.organization_id
      and p.client_id = v_invitation.client_organization_id
      and p.status <> 'archived'
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
  set accepted_by = auth.uid(), accepted_at = now()
  where id = v_invitation.id;

  return query select v_invitation.client_organization_id;
end;
$$;
