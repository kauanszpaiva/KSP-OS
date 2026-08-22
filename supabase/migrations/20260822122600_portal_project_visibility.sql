-- Per-identity project visibility for KSP Client Portal.
-- Access is enforced at RLS/data-policy level. UI hiding is only a reflection.

create unique index if not exists project_access_grants_active_profile_project_action_uq
  on public.project_access_grants(project_id, profile_id, action)
  where profile_id is not null and revoked_at is null;

-- Preserve access existing client members already effectively had when this
-- access model is introduced. Future visibility is managed explicitly.
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
  cm.client_organization_id,
  cm.profile_id,
  'project.read'::public.permission_action,
  now(),
  null
from public.client_memberships cm
join public.projects p
  on p.organization_id = cm.organization_id
 and p.client_id = cm.client_organization_id
where cm.suspended_at is null
  and cm.effective_from <= now()
  and (cm.effective_until is null or cm.effective_until > now())
  and p.status <> 'archived'
  and not exists (
    select 1
    from public.project_access_grants existing
    where existing.project_id = p.id
      and existing.profile_id = cm.profile_id
      and existing.action = 'project.read'::public.permission_action
      and existing.revoked_at is null
  );

create or replace function portal_private.portal_can_access_project(p_project_id uuid)
returns boolean
language sql
stable
security definer
set search_path = 'pg_catalog', 'public'
as $$
  select exists (
    select 1
    from public.projects p
    join public.project_access_grants pag
      on pag.project_id = p.id
     and pag.organization_id = p.organization_id
    where p.id = p_project_id
      and pag.action = 'project.read'::public.permission_action
      and pag.revoked_at is null
      and pag.effective_from <= pg_catalog.now()
      and (pag.effective_until is null or pag.effective_until > pg_catalog.now())
      and pag.client_organization_id is not null
      and exists (
        select 1
        from public.client_memberships cm
        where cm.profile_id = auth.uid()
          and cm.organization_id = p.organization_id
          and cm.client_organization_id = pag.client_organization_id
          and cm.suspended_at is null
          and cm.effective_from <= pg_catalog.now()
          and (cm.effective_until is null or cm.effective_until > pg_catalog.now())
      )
      and (pag.profile_id = auth.uid() or pag.profile_id is null)
  );
$$;

-- Portal-facing project/data policies.
drop policy if exists projects_portal_read on public.projects;
create policy projects_portal_read on public.projects for select
  using (portal_private.portal_can_access_project(id));

drop policy if exists client_publications_portal_read on public.client_publications;
create policy client_publications_portal_read on public.client_publications for select
  using (
    state = 'published_to_client'::public.publication_state
    and public.is_portal_member(client_organization_id)
    and (project_id is null or portal_private.portal_can_access_project(project_id))
  );

drop policy if exists mission_milestones_portal_read on public.mission_milestones;
create policy mission_milestones_portal_read on public.mission_milestones for select
  using (
    portal_private.portal_can_access_project(project_id)
    and exists (
      select 1
      from public.client_publications cp
      where cp.project_id = mission_milestones.project_id
        and cp.state = 'published_to_client'::public.publication_state
        and public.is_portal_member(cp.client_organization_id)
    )
  );

drop policy if exists client_updates_portal_read on public.client_updates;
create policy client_updates_portal_read on public.client_updates for select
  using (
    exists (
      select 1
      from public.client_publications cp
      where cp.id = client_updates.publication_id
        and cp.state = 'published_to_client'::public.publication_state
        and public.is_portal_member(cp.client_organization_id)
        and (cp.project_id is null or portal_private.portal_can_access_project(cp.project_id))
    )
  );

drop policy if exists client_requests_portal_read on public.client_requests;
create policy client_requests_portal_read on public.client_requests for select
  using (
    public.is_portal_member(client_organization_id)
    and (project_id is null or portal_private.portal_can_access_project(project_id))
  );

drop policy if exists client_requests_portal_insert on public.client_requests;
create policy client_requests_portal_insert on public.client_requests for insert
  with check (
    submitted_by = auth.uid()
    and public.is_portal_member(client_organization_id)
    and status = 'submitted'::public.client_request_status
    and (project_id is null or portal_private.portal_can_access_project(project_id))
  );

drop policy if exists client_meetings_portal_read on public.client_meetings;
create policy client_meetings_portal_read on public.client_meetings for select
  using (
    public.is_portal_member(client_organization_id)
    and (project_id is null or portal_private.portal_can_access_project(project_id))
  );

drop policy if exists customer_invoices_portal_select on public.customer_invoices;
create policy customer_invoices_portal_select on public.customer_invoices for select
  using (
    status = any(array[
      'issued'::public.invoice_status,
      'partially_paid'::public.invoice_status,
      'paid'::public.invoice_status,
      'overdue'::public.invoice_status
    ])
    and public.is_portal_member(client_organization_id)
    and (project_id is null or portal_private.portal_can_access_project(project_id))
  );

drop policy if exists invoice_lines_portal_select on public.invoice_lines;
create policy invoice_lines_portal_select on public.invoice_lines for select
  using (
    exists (
      select 1
      from public.customer_invoices i
      where i.id = invoice_lines.invoice_id
        and i.status = any(array[
          'issued'::public.invoice_status,
          'partially_paid'::public.invoice_status,
          'paid'::public.invoice_status,
          'overdue'::public.invoice_status
        ])
        and public.is_portal_member(i.client_organization_id)
        and (i.project_id is null or portal_private.portal_can_access_project(i.project_id))
    )
  );

drop policy if exists customer_payments_portal_select on public.customer_payments;
create policy customer_payments_portal_select on public.customer_payments for select
  using (
    exists (
      select 1
      from public.customer_invoices i
      where i.id = customer_payments.invoice_id
        and i.status = any(array[
          'issued'::public.invoice_status,
          'partially_paid'::public.invoice_status,
          'paid'::public.invoice_status,
          'overdue'::public.invoice_status
        ])
        and public.is_portal_member(i.client_organization_id)
        and (i.project_id is null or portal_private.portal_can_access_project(i.project_id))
    )
  );

drop policy if exists change_versions_portal_read on public.change_order_versions;
create policy change_versions_portal_read on public.change_order_versions for select
  using (
    state = 'published_to_client'::public.publication_state
    and exists (
      select 1
      from public.change_orders co
      where co.id = change_order_versions.change_order_id
        and public.is_portal_member(co.client_organization_id)
        and portal_private.portal_can_access_project(co.project_id)
    )
  );

drop policy if exists change_order_items_portal_read on public.change_order_items;
create policy change_order_items_portal_read on public.change_order_items for select
  using (
    exists (
      select 1
      from public.change_order_versions cov
      join public.change_orders co on co.id = cov.change_order_id
      where cov.id = change_order_items.change_order_version_id
        and cov.state = 'published_to_client'::public.publication_state
        and public.is_portal_member(co.client_organization_id)
        and portal_private.portal_can_access_project(co.project_id)
    )
  );

drop policy if exists change_client_decisions_read on public.change_order_client_decisions;
create policy change_client_decisions_read on public.change_order_client_decisions for select
  using (
    public.is_internal_member(organization_id)
    or exists (
      select 1
      from public.change_order_versions cov
      join public.change_orders co on co.id = cov.change_order_id
      where cov.id = change_order_client_decisions.change_order_version_id
        and public.is_portal_member(change_order_client_decisions.client_organization_id)
        and co.client_organization_id = change_order_client_decisions.client_organization_id
        and portal_private.portal_can_access_project(co.project_id)
    )
  );

drop policy if exists change_client_decisions_insert on public.change_order_client_decisions;
create policy change_client_decisions_insert on public.change_order_client_decisions for insert
  with check (
    decided_by = auth.uid()
    and public.is_portal_member(client_organization_id)
    and exists (
      select 1
      from public.change_order_versions cov
      join public.change_orders co on co.id = cov.change_order_id
      where cov.id = change_order_client_decisions.change_order_version_id
        and co.client_organization_id = change_order_client_decisions.client_organization_id
        and portal_private.portal_can_access_project(co.project_id)
    )
  );

drop policy if exists documents_portal_read on public.documents;
create policy documents_portal_read on public.documents for select
  using (
    client_visible = true
    and classification = 'public'::public.data_classification
    and status = 'active'::public.record_status
    and (
      (client_id is not null and public.is_portal_member(client_id) and (project_id is null or portal_private.portal_can_access_project(project_id)))
      or (client_id is null and project_id is not null and portal_private.portal_can_access_project(project_id))
    )
  );

-- Executives control membership and access mutations.
drop policy if exists client_memberships_executive_update on public.client_memberships;
create policy client_memberships_executive_update on public.client_memberships for update
  using (public.is_executive(organization_id))
  with check (public.is_executive(organization_id));

drop policy if exists client_memberships_executive_delete on public.client_memberships;
create policy client_memberships_executive_delete on public.client_memberships for delete
  using (public.is_executive(organization_id));

drop policy if exists project_access_internal on public.project_access_grants;
drop policy if exists project_access_internal_read on public.project_access_grants;
drop policy if exists project_access_executive_insert on public.project_access_grants;
drop policy if exists project_access_executive_update on public.project_access_grants;
drop policy if exists project_access_executive_delete on public.project_access_grants;
create policy project_access_internal_read on public.project_access_grants for select
  using (public.is_internal_member(organization_id));
create policy project_access_executive_insert on public.project_access_grants for insert
  with check (public.is_executive(organization_id));
create policy project_access_executive_update on public.project_access_grants for update
  using (public.is_executive(organization_id))
  with check (public.is_executive(organization_id));
create policy project_access_executive_delete on public.project_access_grants for delete
  using (public.is_executive(organization_id));

drop policy if exists client_permission_grants_internal on public.client_permission_grants;
drop policy if exists client_permission_grants_internal_read on public.client_permission_grants;
drop policy if exists client_permission_grants_executive_insert on public.client_permission_grants;
drop policy if exists client_permission_grants_executive_update on public.client_permission_grants;
drop policy if exists client_permission_grants_executive_delete on public.client_permission_grants;
create policy client_permission_grants_internal_read on public.client_permission_grants for select
  using (public.is_internal_member(organization_id));
create policy client_permission_grants_executive_insert on public.client_permission_grants for insert
  with check (public.is_executive(organization_id));
create policy client_permission_grants_executive_update on public.client_permission_grants for update
  using (public.is_executive(organization_id))
  with check (public.is_executive(organization_id));
create policy client_permission_grants_executive_delete on public.client_permission_grants for delete
  using (public.is_executive(organization_id));

drop policy if exists portal_invitations_internal on public.portal_invitations;
drop policy if exists portal_invitations_internal_read on public.portal_invitations;
drop policy if exists portal_invitations_executive_insert on public.portal_invitations;
drop policy if exists portal_invitations_executive_update on public.portal_invitations;
drop policy if exists portal_invitations_executive_delete on public.portal_invitations;
create policy portal_invitations_internal_read on public.portal_invitations for select
  using (public.is_internal_member(organization_id));
create policy portal_invitations_executive_insert on public.portal_invitations for insert
  with check (public.is_executive(organization_id));
create policy portal_invitations_executive_update on public.portal_invitations for update
  using (public.is_executive(organization_id))
  with check (public.is_executive(organization_id));
create policy portal_invitations_executive_delete on public.portal_invitations for delete
  using (public.is_executive(organization_id));

create or replace function public.portal_visible_projects()
returns table(
  id uuid,
  name text,
  project_type text,
  status public.record_status,
  client_id uuid,
  created_at timestamptz
)
language sql
stable
security definer
set search_path = 'pg_catalog', 'public'
as $$
  select distinct p.id, p.name, p.project_type, p.status, p.client_id, p.created_at
  from public.projects p
  join public.project_access_grants pag
    on pag.project_id = p.id
   and pag.organization_id = p.organization_id
  join public.client_memberships cm
    on cm.profile_id = auth.uid()
   and cm.organization_id = p.organization_id
   and cm.client_organization_id = pag.client_organization_id
  where pag.action = 'project.read'::public.permission_action
    and pag.revoked_at is null
    and pag.effective_from <= pg_catalog.now()
    and (pag.effective_until is null or pag.effective_until > pg_catalog.now())
    and (pag.profile_id = auth.uid() or pag.profile_id is null)
    and cm.suspended_at is null
    and cm.effective_from <= pg_catalog.now()
    and (cm.effective_until is null or cm.effective_until > pg_catalog.now())
    and p.status <> 'archived'::public.record_status
  order by p.name;
$$;
revoke all on function public.portal_visible_projects() from public;
grant execute on function public.portal_visible_projects() to authenticated;

-- Accept invitation + initialize explicit project grants.
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

  insert into public.project_access_grants (
    organization_id, project_id, client_organization_id, profile_id, action, effective_from, created_by
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

  update public.portal_invitations
  set accepted_by = auth.uid(), accepted_at = now()
  where id = v_invitation.id;

  return query select v_invitation.client_organization_id;
end;
$$;
