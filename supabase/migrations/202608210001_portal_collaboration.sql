-- Add visibility to comments
alter table comments add column visibility text not null default 'internal' check (visibility in ('internal', 'client'));

-- Update comments policies to allow portal members to read and create client-visible comments
-- We need a function to determine if a portal member can access the parent object
create or replace function can_portal_member_access_comment_target(p_object_table text, p_object_id uuid) returns boolean language sql stable as \$\$
  select case
    when p_object_table = 'client_requests' then
      exists(select 1 from client_requests where id = p_object_id and is_portal_member(client_organization_id))
    when p_object_table = 'deliverable_versions' then
      exists(
        select 1 from deliverable_versions dv
        join deliverables d on d.id = dv.deliverable_id
        join work_packages wp on wp.id = d.work_package_id
        join projects p on p.id = wp.project_id
        where dv.id = p_object_id and d.client_visible = true and is_portal_member(p.client_id)
      )
    else false
  end;
\$\$;

drop policy if exists comments_read on comments;
create policy comments_read on comments for select using (
  (organization_id in (select current_org_ids())) or
  (visibility = 'client' and can_portal_member_access_comment_target(object_table, object_id))
);

drop policy if exists comments_insert on comments;
create policy comments_insert on comments for insert with check (
  (organization_id in (select current_org_ids()) and author_id = auth.uid()) or
  (visibility = 'client' and author_id = auth.uid() and can_portal_member_access_comment_target(object_table, object_id))
);

-- Deliverables and Deliverable Versions RLS for Portal
drop policy if exists org_access on deliverables;
create policy deliverables_internal_read on deliverables for select using (organization_id in (select current_org_ids()));
create policy deliverables_internal_insert on deliverables for insert with check (organization_id in (select current_org_ids()));
create policy deliverables_internal_update on deliverables for update using (organization_id in (select current_org_ids()));
create policy deliverables_internal_delete on deliverables for delete using (organization_id in (select current_org_ids()));

create policy deliverables_portal_read on deliverables for select using (
  client_visible = true and
  exists(select 1 from work_packages wp join projects p on p.id = wp.project_id where wp.id = work_package_id and is_portal_member(p.client_id))
);

drop policy if exists org_access on deliverable_versions;
create policy deliverable_versions_internal_read on deliverable_versions for select using (organization_id in (select current_org_ids()));
create policy deliverable_versions_internal_insert on deliverable_versions for insert with check (organization_id in (select current_org_ids()));
create policy deliverable_versions_internal_update on deliverable_versions for update using (organization_id in (select current_org_ids()));
create policy deliverable_versions_internal_delete on deliverable_versions for delete using (organization_id in (select current_org_ids()));

create policy deliverable_versions_portal_read on deliverable_versions for select using (
  exists(
    select 1 from deliverables d
    join work_packages wp on wp.id = d.work_package_id
    join projects p on p.id = wp.project_id
    where d.id = deliverable_id and d.client_visible = true and is_portal_member(p.client_id)
  )
);

-- Notifications RLS for Portal
drop policy if exists notifications_read on notifications;
create policy notifications_read on notifications for select using (recipient_id = auth.uid());
drop policy if exists notifications_update on notifications;
create policy notifications_update on notifications for update using (recipient_id = auth.uid()) with check (recipient_id = auth.uid());

-- Approval Requests and Decisions RLS for Portal
drop policy if exists approvals_executive_read on approval_requests;
create policy approvals_read on approval_requests for select using (
  is_executive(organization_id) or requester_id = auth.uid() or
  (deliverable_version_id is not null and exists(
    select 1 from deliverable_versions dv
    join deliverables d on d.id = dv.deliverable_id
    join work_packages wp on wp.id = d.work_package_id
    join projects p on p.id = wp.project_id
    where dv.id = deliverable_version_id and d.client_visible = true and is_portal_member(p.client_id)
  ))
);

drop policy if exists approval_decisions_executive_read on approval_decisions;
create policy approval_decisions_read on approval_decisions for select using (
  is_executive(organization_id) or approver_id = auth.uid() or
  exists(
    select 1 from approval_requests ar
    where ar.id = approval_request_id and ar.deliverable_version_id is not null and exists(
      select 1 from deliverable_versions dv
      join deliverables d on d.id = dv.deliverable_id
      join work_packages wp on wp.id = d.work_package_id
      join projects p on p.id = wp.project_id
      where dv.id = ar.deliverable_version_id and d.client_visible = true and is_portal_member(p.client_id)
    )
  )
);

create policy approval_decisions_portal_insert on approval_decisions for insert with check (
  approver_id = auth.uid() and
  exists(
    select 1 from approval_requests ar
    where ar.id = approval_request_id and ar.deliverable_version_id is not null and exists(
      select 1 from deliverable_versions dv
      join deliverables d on d.id = dv.deliverable_id
      join work_packages wp on wp.id = d.work_package_id
      join projects p on p.id = wp.project_id
      where dv.id = ar.deliverable_version_id and d.client_visible = true and is_portal_member(p.client_id)
    )
  )
);

alter table comments enable row level security;
