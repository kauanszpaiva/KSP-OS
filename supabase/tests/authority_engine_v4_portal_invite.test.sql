-- Authority Engine V4 Portal invitation scope actor matrix.
-- Proves that invitation context is tenant validated and acceptance grants only
-- the exact projects selected at invitation time.

begin;

insert into public.organizations (id, name, slug)
values ('f0000000-0000-0000-0000-000000000001', 'Portal Invite V4 CI', 'portal-invite-v4-ci');

insert into auth.users (id, email) values
  ('f1000000-0000-0000-0000-000000000001', 'inviter-v4@test.invalid'),
  ('f1000000-0000-0000-0000-000000000002', 'invitee-v4@test.invalid');

insert into public.profiles (id, display_name, email) values
  ('f1000000-0000-0000-0000-000000000001', 'Inviter V4 CI', 'inviter-v4@test.invalid'),
  ('f1000000-0000-0000-0000-000000000002', 'Invitee V4 CI', 'invitee-v4@test.invalid');

insert into public.organization_memberships (organization_id, profile_id, role, internal_role, scope)
values (
  'f0000000-0000-0000-0000-000000000001',
  'f1000000-0000-0000-0000-000000000001',
  'founder_ceo',
  'founder_ceo',
  'all'
);

insert into public.client_organizations (id, organization_id, legal_name, display_name, created_by) values
  ('f2000000-0000-0000-0000-000000000001', 'f0000000-0000-0000-0000-000000000001', 'Client A LLC', 'Client A', 'f1000000-0000-0000-0000-000000000001'),
  ('f2000000-0000-0000-0000-000000000002', 'f0000000-0000-0000-0000-000000000001', 'Client B LLC', 'Client B', 'f1000000-0000-0000-0000-000000000001');

insert into public.projects (id, organization_id, client_id, name, project_type) values
  ('f3000000-0000-0000-0000-000000000001', 'f0000000-0000-0000-0000-000000000001', 'f2000000-0000-0000-0000-000000000001', 'Client A Selected', 'test'),
  ('f3000000-0000-0000-0000-000000000002', 'f0000000-0000-0000-0000-000000000001', 'f2000000-0000-0000-0000-000000000001', 'Client A Hidden', 'test'),
  ('f3000000-0000-0000-0000-000000000003', 'f0000000-0000-0000-0000-000000000001', 'f2000000-0000-0000-0000-000000000002', 'Client B Foreign', 'test');

-- The real email trigger performs an external Resend request. Disable that one
-- trigger only for this local DB actor test; the scope guard remains active.
alter table public.portal_invitations disable trigger portal_invitation_send_email_before_insert;

-- Cross-client project scope is rejected before the invitation can exist.
do $$
begin
  begin
    insert into public.portal_invitations (
      id, organization_id, client_organization_id, email, initial_role, invited_by,
      token_hash, expires_at, surface, context_version, scope
    ) values (
      'f4000000-0000-0000-0000-000000000001',
      'f0000000-0000-0000-0000-000000000001',
      'f2000000-0000-0000-0000-000000000001',
      'invitee-v4@test.invalid',
      'client_viewer',
      'f1000000-0000-0000-0000-000000000001',
      'foreign-project-token-hash',
      now() + interval '1 day',
      'portal',
      1,
      jsonb_build_object(
        'organizationId','f0000000-0000-0000-0000-000000000001',
        'clientOrganizationId','f2000000-0000-0000-0000-000000000001',
        'projectIds',jsonb_build_array('f3000000-0000-0000-0000-000000000003'),
        'teamKey',null
      )
    );
    raise exception 'cross-client invitation project was accepted';
  exception when others then
    if sqlerrm = 'cross-client invitation project was accepted' then raise; end if;
    if sqlerrm not like '%portal_invitation_project_outside_scope%' then raise; end if;
  end;
end $$;

insert into public.portal_invitations (
  id, organization_id, client_organization_id, email, initial_role, invited_by,
  token_hash, expires_at, surface, context_version, scope
) values (
  'f4000000-0000-0000-0000-000000000002',
  'f0000000-0000-0000-0000-000000000001',
  'f2000000-0000-0000-0000-000000000001',
  'invitee-v4@test.invalid',
  'client_viewer',
  'f1000000-0000-0000-0000-000000000001',
  'selected-project-token-hash',
  now() + interval '1 day',
  'portal',
  1,
  jsonb_build_object(
    'organizationId','f0000000-0000-0000-0000-000000000001',
    'clientOrganizationId','f2000000-0000-0000-0000-000000000001',
    'projectIds',jsonb_build_array('f3000000-0000-0000-0000-000000000001'),
    'teamKey','review-team'
  )
);

do $$
declare key_value text;
begin
  select team_key into key_value
  from public.portal_invitations
  where id = 'f4000000-0000-0000-0000-000000000002';
  if key_value is distinct from 'review-team' then
    raise exception 'invitation team context was not canonicalized';
  end if;
end $$;

set local role authenticated;
select set_config('request.jwt.claim.sub', 'f1000000-0000-0000-0000-000000000002', true);
select * from public.accept_portal_invitation('selected-project-token-hash');

do $$
declare membership_count int; selected_count int; hidden_count int; foreign_count int;
begin
  select count(*) into membership_count
  from public.client_memberships
  where client_organization_id = 'f2000000-0000-0000-0000-000000000001'
    and profile_id = 'f1000000-0000-0000-0000-000000000002'
    and role = 'client_viewer';
  if membership_count <> 1 then
    raise exception 'invitation did not create client membership';
  end if;

  select count(*) into selected_count
  from public.project_access_grants
  where project_id = 'f3000000-0000-0000-0000-000000000001'
    and profile_id = 'f1000000-0000-0000-0000-000000000002'
    and action = 'project.read'
    and revoked_at is null;
  if selected_count <> 1 then
    raise exception 'selected project grant missing';
  end if;

  select count(*) into hidden_count
  from public.project_access_grants
  where project_id = 'f3000000-0000-0000-0000-000000000002'
    and profile_id = 'f1000000-0000-0000-0000-000000000002'
    and revoked_at is null;
  if hidden_count <> 0 then raise exception 'unselected same-client project leaked'; end if;

  select count(*) into foreign_count
  from public.project_access_grants
  where project_id = 'f3000000-0000-0000-0000-000000000003'
    and profile_id = 'f1000000-0000-0000-0000-000000000002'
    and revoked_at is null;
  if foreign_count <> 0 then raise exception 'foreign client project leaked'; end if;
end $$;
reset role;

alter table public.portal_invitations enable trigger portal_invitation_send_email_before_insert;
rollback;
