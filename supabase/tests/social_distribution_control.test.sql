-- Executable social-distribution regression.
-- Coverage: internal access, anonymous/client isolation, cross-organization denial,
-- cross-client denial, cross-project denial, media/content scope, and publication
-- evidence integrity.

insert into auth.users (id, email) values
  ('22000000-0000-0000-0000-000000000001', 'social-founder@test.invalid'),
  ('22000000-0000-0000-0000-000000000002', 'social-member@test.invalid'),
  ('22000000-0000-0000-0000-000000000003', 'social-client@test.invalid'),
  ('22000000-0000-0000-0000-000000000004', 'social-other-org@test.invalid');

insert into public.profiles (id, display_name, email) values
  ('22000000-0000-0000-0000-000000000001', 'Social Founder', 'social-founder@test.invalid'),
  ('22000000-0000-0000-0000-000000000002', 'Social Member', 'social-member@test.invalid'),
  ('22000000-0000-0000-0000-000000000003', 'Social Client', 'social-client@test.invalid'),
  ('22000000-0000-0000-0000-000000000004', 'Social Other Org', 'social-other-org@test.invalid');

insert into public.organizations (id, name, slug) values
  ('12000000-0000-0000-0000-000000000001', 'Social Distribution Test Org', 'social-distribution-test'),
  ('12000000-0000-0000-0000-000000000002', 'Social Other Tenant', 'social-other-tenant');

insert into public.organization_memberships (organization_id, profile_id, role, internal_role, scope) values
  ('12000000-0000-0000-0000-000000000001', '22000000-0000-0000-0000-000000000001', 'founder_ceo', 'founder_ceo', 'all'),
  ('12000000-0000-0000-0000-000000000001', '22000000-0000-0000-0000-000000000002', 'developer', 'developer', 'assigned'),
  ('12000000-0000-0000-0000-000000000002', '22000000-0000-0000-0000-000000000004', 'founder_ceo', 'founder_ceo', 'all');

insert into public.client_organizations (id, organization_id, legal_name, display_name) values
  ('32000000-0000-0000-0000-000000000001', '12000000-0000-0000-0000-000000000001', 'Social Client A LLC', 'Social Client A'),
  ('32000000-0000-0000-0000-000000000002', '12000000-0000-0000-0000-000000000001', 'Social Client B LLC', 'Social Client B');

insert into public.client_memberships (organization_id, client_organization_id, profile_id, role) values
  ('12000000-0000-0000-0000-000000000001', '32000000-0000-0000-0000-000000000001', '22000000-0000-0000-0000-000000000003', 'client_owner');

insert into public.projects (id, organization_id, client_id, name, project_type) values
  ('42000000-0000-0000-0000-000000000001', '12000000-0000-0000-0000-000000000001', '32000000-0000-0000-0000-000000000001', 'Social Client A Project', 'test'),
  ('42000000-0000-0000-0000-000000000002', '12000000-0000-0000-0000-000000000001', '32000000-0000-0000-0000-000000000002', 'Social Client B Project', 'test');

insert into public.content_items (
  id, organization_id, client_id, project_id, title, channel, status, created_by
) values
  ('52000000-0000-0000-0000-000000000001', '12000000-0000-0000-0000-000000000001', '32000000-0000-0000-0000-000000000001', '42000000-0000-0000-0000-000000000001', 'Client A Reel', 'Instagram Reels', 'approved', '22000000-0000-0000-0000-000000000001'),
  ('52000000-0000-0000-0000-000000000002', '12000000-0000-0000-0000-000000000001', '32000000-0000-0000-0000-000000000002', '42000000-0000-0000-0000-000000000002', 'Client B Reel', 'Instagram Reels', 'approved', '22000000-0000-0000-0000-000000000001');

insert into public.social_profiles (
  id, organization_id, client_id, project_id, display_name, platform, editorial_role,
  account_owner, default_control_mode, default_publisher, default_approver, kpi_owner, created_by
) values
  ('62000000-0000-0000-0000-000000000001', '12000000-0000-0000-0000-000000000001', '32000000-0000-0000-0000-000000000001', '42000000-0000-0000-0000-000000000001', 'Client A Instagram', 'instagram', 'Institution and community', 'Client A', 'controlled', 'KSP social', 'Client A', 'KSP', '22000000-0000-0000-0000-000000000001'),
  ('62000000-0000-0000-0000-000000000002', '12000000-0000-0000-0000-000000000001', '32000000-0000-0000-0000-000000000002', '42000000-0000-0000-0000-000000000002', 'Client B Instagram', 'instagram', 'Institution and community', 'Client B', 'external', 'Client B', 'Client B', 'Client B', '22000000-0000-0000-0000-000000000001'),
  ('62000000-0000-0000-0000-000000000003', '12000000-0000-0000-0000-000000000001', '32000000-0000-0000-0000-000000000001', '42000000-0000-0000-0000-000000000001', 'Client A Founder', 'instagram', 'Founder authority', 'Founder A', 'external', 'Founder A', 'Founder A', 'Founder A', '22000000-0000-0000-0000-000000000001'),
  ('62000000-0000-0000-0000-000000000004', '12000000-0000-0000-0000-000000000001', '32000000-0000-0000-0000-000000000001', '42000000-0000-0000-0000-000000000001', 'Client A Cast', 'instagram', 'Podcast and cuts', 'Client A', 'shared', 'KSP + Client A', 'Client A', 'shared', '22000000-0000-0000-0000-000000000001');

-- Profile scope cannot combine one project's ID with a different client.
do $$ begin
  begin
    insert into public.social_profiles (
      organization_id, client_id, project_id, display_name, platform, default_control_mode
    ) values (
      '12000000-0000-0000-0000-000000000001',
      '32000000-0000-0000-0000-000000000002',
      '42000000-0000-0000-0000-000000000001',
      'Invalid Mixed Scope', 'instagram', 'unknown'
    );
    raise exception 'cross-client profile scope unexpectedly allowed';
  exception when others then
    if sqlerrm = 'cross-client profile scope unexpectedly allowed' then raise; end if;
  end;
end $$;

-- A content item cannot be routed to a profile scoped to another client/project.
do $$ begin
  begin
    insert into public.social_distributions (
      organization_id, content_item_id, social_profile_id, control_mode, status
    ) values (
      '12000000-0000-0000-0000-000000000001',
      '52000000-0000-0000-0000-000000000001',
      '62000000-0000-0000-0000-000000000002',
      'external', 'planned'
    );
    raise exception 'cross-project distribution unexpectedly allowed';
  exception when others then
    if sqlerrm = 'cross-project distribution unexpectedly allowed' then raise; end if;
  end;
end $$;

-- Publication cannot be asserted without evidence.
do $$ begin
  begin
    insert into public.social_distributions (
      organization_id, content_item_id, social_profile_id, control_mode, status, published_at, evidence_kind
    ) values (
      '12000000-0000-0000-0000-000000000001',
      '52000000-0000-0000-0000-000000000001',
      '62000000-0000-0000-0000-000000000001',
      'controlled', 'published', now(), 'none'
    );
    raise exception 'published without evidence unexpectedly allowed';
  exception when check_violation then null;
  end;
end $$;

-- Publication URL is sufficient evidence when the URL itself is stored.
insert into public.social_distributions (
  id, organization_id, content_item_id, social_profile_id, control_mode, publisher, approver,
  status, published_at, publication_url, evidence_kind, confirmed_by, confirmed_at, created_by
) values (
  '72000000-0000-0000-0000-000000000001',
  '12000000-0000-0000-0000-000000000001',
  '52000000-0000-0000-0000-000000000001',
  '62000000-0000-0000-0000-000000000001',
  'controlled', 'KSP social', 'Client A', 'published', now(),
  'https://www.instagram.com/p/test-social-proof/', 'publication_url',
  '22000000-0000-0000-0000-000000000001', now(), '22000000-0000-0000-0000-000000000001'
);

-- Non-URL evidence must include a note identifying the confirmation source.
do $$ begin
  begin
    insert into public.social_distributions (
      organization_id, content_item_id, social_profile_id, control_mode, status,
      published_at, evidence_kind, confirmed_by, confirmed_at
    ) values (
      '12000000-0000-0000-0000-000000000001',
      '52000000-0000-0000-0000-000000000001',
      '62000000-0000-0000-0000-000000000003',
      'external', 'published', now(), 'owner_confirmation',
      '22000000-0000-0000-0000-000000000001', now()
    );
    raise exception 'owner confirmation without evidence note unexpectedly allowed';
  exception when check_violation then null;
  end;
end $$;

insert into public.social_distributions (
  id, organization_id, content_item_id, social_profile_id, control_mode, status,
  delivered_at, published_at, evidence_kind, evidence_note, confirmed_by, confirmed_at, created_by
) values (
  '72000000-0000-0000-0000-000000000002',
  '12000000-0000-0000-0000-000000000001',
  '52000000-0000-0000-0000-000000000001',
  '62000000-0000-0000-0000-000000000003',
  'external', 'published', now(), now(), 'owner_confirmation',
  'Account owner confirmed the Instagram post is live.',
  '22000000-0000-0000-0000-000000000001', now(), '22000000-0000-0000-0000-000000000001'
);

-- A version from different content cannot be attached merely because it is in the same tenant.
insert into public.work_packages (
  id, organization_id, project_id, name, status, created_by
) values (
  '82000000-0000-0000-0000-000000000001',
  '12000000-0000-0000-0000-000000000001',
  '42000000-0000-0000-0000-000000000002',
  'Client B Media', 'active', '22000000-0000-0000-0000-000000000001'
);

insert into public.deliverables (
  id, organization_id, work_package_id, name, status, client_visible, content_item_id
) values (
  '92000000-0000-0000-0000-000000000001',
  '12000000-0000-0000-0000-000000000001',
  '82000000-0000-0000-0000-000000000001',
  'Client B Reel', 'active', false,
  '52000000-0000-0000-0000-000000000002'
);

insert into public.deliverable_versions (
  id, organization_id, deliverable_id, version_number, status, upload_state, client_visible
) values (
  'a2000000-0000-0000-0000-000000000001',
  '12000000-0000-0000-0000-000000000001',
  '92000000-0000-0000-0000-000000000001',
  1, 'approved', 'ready', false
);

do $$ begin
  begin
    insert into public.social_distributions (
      organization_id, content_item_id, social_profile_id, deliverable_version_id, control_mode, status
    ) values (
      '12000000-0000-0000-0000-000000000001',
      '52000000-0000-0000-0000-000000000001',
      '62000000-0000-0000-0000-000000000004',
      'a2000000-0000-0000-0000-000000000001',
      'shared', 'ready'
    );
    raise exception 'wrong-content media version unexpectedly allowed';
  exception when others then
    if sqlerrm = 'wrong-content media version unexpectedly allowed' then raise; end if;
  end;
end $$;

-- Internal users in the org can read the operating matrix and distributions.
begin;
  set local role authenticated;
  select set_config('request.jwt.claim.sub', '22000000-0000-0000-0000-000000000002', true);
  do $$ declare p int; d int; begin
    select count(*) into p from public.social_profiles;
    select count(*) into d from public.social_distributions;
    if p <> 4 then raise exception 'internal social profile read failed: %', p; end if;
    if d <> 2 then raise exception 'internal social distribution read failed: %', d; end if;
  end $$;
rollback;

-- Portal clients do not inherit internal social-control visibility.
begin;
  set local role authenticated;
  select set_config('request.jwt.claim.sub', '22000000-0000-0000-0000-000000000003', true);
  do $$ declare p int; d int; begin
    select count(*) into p from public.social_profiles;
    select count(*) into d from public.social_distributions;
    if p <> 0 or d <> 0 then raise exception 'client social-control isolation failed: profiles %, distributions %', p, d; end if;
  end $$;
rollback;

-- Anonymous and another tenant cannot read internal social control data.
begin;
  set local role anon;
  select set_config('request.jwt.claim.sub', '', true);
  do $$ declare p int; d int; begin
    select count(*) into p from public.social_profiles;
    select count(*) into d from public.social_distributions;
    if p <> 0 or d <> 0 then raise exception 'anonymous social-control isolation failed'; end if;
  end $$;
rollback;

begin;
  set local role authenticated;
  select set_config('request.jwt.claim.sub', '22000000-0000-0000-0000-000000000004', true);
  do $$ declare p int; d int; begin
    select count(*) into p from public.social_profiles where organization_id='12000000-0000-0000-0000-000000000001'::uuid;
    select count(*) into d from public.social_distributions where organization_id='12000000-0000-0000-0000-000000000001'::uuid;
    if p <> 0 or d <> 0 then raise exception 'cross-organization social-control read allowed'; end if;
    begin
      insert into public.social_profiles (organization_id, display_name, platform, default_control_mode)
      values ('12000000-0000-0000-0000-000000000001', 'Cross Tenant Hack', 'instagram', 'controlled');
      raise exception 'cross-organization social profile insert allowed';
    exception when insufficient_privilege then null;
    end;
  end $$;
rollback;
