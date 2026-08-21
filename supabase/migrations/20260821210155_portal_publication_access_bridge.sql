-- Align Portal access with its publication model.
-- A project may be shown to a client through client_publications even when
-- projects.client_id is intentionally unset. These helpers bridge published
-- projects into downstream work-package, deliverable, approval, comment, and
-- document RLS without granting broad internal access.

create schema if not exists portal_private;
revoke all on schema portal_private from public;
grant usage on schema portal_private to authenticated;

create or replace function portal_private.portal_can_access_project(p_project_id uuid)
returns boolean
language sql
stable
security definer
set search_path = pg_catalog, public
as $$
  select exists (
    select 1
    from public.projects p
    where p.id = p_project_id
      and exists (
        select 1
        from public.client_memberships cm
        where cm.profile_id = auth.uid()
          and cm.organization_id = p.organization_id
          and cm.suspended_at is null
          and (cm.effective_until is null or cm.effective_until > pg_catalog.now())
          and (
            (p.client_id is not null and cm.client_organization_id = p.client_id)
            or exists (
              select 1
              from public.client_publications cp
              where cp.organization_id = p.organization_id
                and cp.project_id = p.id
                and cp.client_organization_id = cm.client_organization_id
                and cp.state = 'published_to_client'
            )
          )
      )
  );
$$;

create or replace function portal_private.portal_can_access_work_package(p_work_package_id uuid)
returns boolean
language sql
stable
security definer
set search_path = pg_catalog, public
as $$
  select exists (
    select 1
    from public.work_packages wp
    where wp.id = p_work_package_id
      and portal_private.portal_can_access_project(wp.project_id)
  );
$$;

create or replace function portal_private.portal_can_access_deliverable(p_deliverable_id uuid)
returns boolean
language sql
stable
security definer
set search_path = pg_catalog, public
as $$
  select exists (
    select 1
    from public.deliverables d
    where d.id = p_deliverable_id
      and d.client_visible = true
      and portal_private.portal_can_access_work_package(d.work_package_id)
  );
$$;

create or replace function portal_private.portal_can_access_deliverable_version(p_version_id uuid)
returns boolean
language sql
stable
security definer
set search_path = pg_catalog, public
as $$
  select exists (
    select 1
    from public.deliverable_versions dv
    where dv.id = p_version_id
      and portal_private.portal_can_access_deliverable(dv.deliverable_id)
  );
$$;

create or replace function portal_private.portal_can_access_approval_request(p_approval_request_id uuid)
returns boolean
language sql
stable
security definer
set search_path = pg_catalog, public
as $$
  select exists (
    select 1
    from public.approval_requests ar
    where ar.id = p_approval_request_id
      and ar.deliverable_version_id is not null
      and portal_private.portal_can_access_deliverable_version(ar.deliverable_version_id)
  );
$$;

revoke all on function portal_private.portal_can_access_project(uuid) from public, anon;
revoke all on function portal_private.portal_can_access_work_package(uuid) from public, anon;
revoke all on function portal_private.portal_can_access_deliverable(uuid) from public, anon;
revoke all on function portal_private.portal_can_access_deliverable_version(uuid) from public, anon;
revoke all on function portal_private.portal_can_access_approval_request(uuid) from public, anon;
grant execute on function portal_private.portal_can_access_project(uuid) to authenticated;
grant execute on function portal_private.portal_can_access_work_package(uuid) to authenticated;
grant execute on function portal_private.portal_can_access_deliverable(uuid) to authenticated;
grant execute on function portal_private.portal_can_access_deliverable_version(uuid) to authenticated;
grant execute on function portal_private.portal_can_access_approval_request(uuid) to authenticated;

drop policy if exists work_packages_portal_read on public.work_packages;
create policy work_packages_portal_read on public.work_packages
  for select to authenticated
  using (portal_private.portal_can_access_project(project_id));

drop policy if exists deliverables_portal_read on public.deliverables;
create policy deliverables_portal_read on public.deliverables
  for select to authenticated
  using (client_visible = true and portal_private.portal_can_access_work_package(work_package_id));

drop policy if exists deliverable_versions_portal_read on public.deliverable_versions;
create policy deliverable_versions_portal_read on public.deliverable_versions
  for select to authenticated
  using (portal_private.portal_can_access_deliverable(deliverable_id));

create or replace function public.can_portal_member_access_comment_target(p_object_table text, p_object_id uuid)
returns boolean
language sql
stable
set search_path = pg_catalog, public
as $$
  select case
    when p_object_table = 'client_requests' then
      exists(
        select 1 from public.client_requests cr
        where cr.id = p_object_id and public.is_portal_member(cr.client_organization_id)
      )
    when p_object_table = 'deliverable_versions' then
      portal_private.portal_can_access_deliverable_version(p_object_id)
    else false
  end;
$$;

drop policy if exists approvals_read on public.approval_requests;
create policy approvals_read on public.approval_requests
  for select to authenticated
  using (
    public.is_executive(organization_id)
    or requester_id = auth.uid()
    or (deliverable_version_id is not null and portal_private.portal_can_access_deliverable_version(deliverable_version_id))
  );

drop policy if exists approval_decisions_read on public.approval_decisions;
create policy approval_decisions_read on public.approval_decisions
  for select to authenticated
  using (
    public.is_executive(organization_id)
    or approver_id = auth.uid()
    or portal_private.portal_can_access_approval_request(approval_request_id)
  );

drop policy if exists approval_decisions_portal_insert on public.approval_decisions;
create policy approval_decisions_portal_insert on public.approval_decisions
  for insert to authenticated
  with check (
    approver_id = auth.uid()
    and portal_private.portal_can_access_approval_request(approval_request_id)
  );

drop policy if exists documents_portal_read on public.documents;
create policy documents_portal_read on public.documents
  for select to authenticated
  using (
    client_visible = true
    and classification = 'public'
    and status = 'active'
    and (
      (client_id is not null and public.is_portal_member(client_id))
      or (client_id is null and project_id is not null and portal_private.portal_can_access_project(project_id))
    )
  );
