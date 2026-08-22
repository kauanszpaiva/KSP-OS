-- Make existing Command remove/delete controls deterministic and history-safe.

-- Visible executive delete actions need matching RLS permissions.
drop policy if exists tasks_delete on public.tasks;
create policy tasks_delete on public.tasks for delete using (public.is_executive(organization_id));

drop policy if exists projects_delete on public.projects;
create policy projects_delete on public.projects for delete using (public.is_executive(organization_id));

drop policy if exists client_organizations_delete on public.client_organizations;
create policy client_organizations_delete on public.client_organizations for delete using (public.is_executive(organization_id));

drop policy if exists contacts_delete on public.contacts;
create policy contacts_delete on public.contacts for delete using (public.is_executive(organization_id));

drop policy if exists comments_delete on public.comments;
create policy comments_delete on public.comments for delete using (public.is_executive(organization_id));

drop policy if exists leads_delete on public.leads;
create policy leads_delete on public.leads for delete using (public.is_executive(organization_id));

-- Deleting a task must not fail because a deliverable references it optionally.
create or replace function public.ksp_before_delete_task_detach_optional_history()
returns trigger
language plpgsql
security definer
set search_path='pg_catalog','public'
as $$
begin
  update public.deliverables set task_id = null where task_id = old.id;
  return old;
end;
$$;
revoke all on function public.ksp_before_delete_task_detach_optional_history() from public;
drop trigger if exists ksp_before_delete_task_detach_optional_history on public.tasks;
create trigger ksp_before_delete_task_detach_optional_history
before delete on public.tasks
for each row execute function public.ksp_before_delete_task_detach_optional_history();

-- An outcome can be removed without destroying commitments that once pointed to it.
create or replace function public.ksp_before_delete_outcome_detach_commitments()
returns trigger
language plpgsql
security definer
set search_path='pg_catalog','public'
as $$
begin
  update public.commitments set outcome_id = null where outcome_id = old.id;
  return old;
end;
$$;
revoke all on function public.ksp_before_delete_outcome_detach_commitments() from public;
drop trigger if exists ksp_before_delete_outcome_detach_commitments on public.company_outcomes;
create trigger ksp_before_delete_outcome_detach_commitments
before delete on public.company_outcomes
for each row execute function public.ksp_before_delete_outcome_detach_commitments();

-- A project with immutable client change-order history is removed from active
-- operations by archiving rather than destroying that client/audit record.
-- A project without protected change-order history is hard-deleted after
-- nullable references are detached; existing CASCADE foreign keys handle
-- appropriate child records.
create or replace function public.ksp_before_delete_project_safe_remove()
returns trigger
language plpgsql
security definer
set search_path='pg_catalog','public'
as $$
begin
  if exists (select 1 from public.change_orders where project_id = old.id) then
    update public.projects
       set status = 'archived'::public.record_status,
           archived_at = coalesce(archived_at, now())
     where id = old.id;
    update public.project_access_grants
       set revoked_at = coalesce(revoked_at, now())
     where project_id = old.id and revoked_at is null;
    return null;
  end if;

  update public.client_meetings set project_id = null where project_id = old.id;
  update public.client_permission_grants set project_id = null where project_id = old.id;
  update public.client_publications set project_id = null where project_id = old.id;
  update public.client_requests set project_id = null where project_id = old.id;
  update public.documents set project_id = null where project_id = old.id;
  update public.journal_lines set project_id = null where project_id = old.id;
  update public.tasks set project_id = null where project_id = old.id;
  delete from public.project_access_grants where project_id = old.id;
  return old;
end;
$$;
revoke all on function public.ksp_before_delete_project_safe_remove() from public;
drop trigger if exists ksp_before_delete_project_safe_remove on public.projects;
create trigger ksp_before_delete_project_safe_remove
before delete on public.projects
for each row execute function public.ksp_before_delete_project_safe_remove();
