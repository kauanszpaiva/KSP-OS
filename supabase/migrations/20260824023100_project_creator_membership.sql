-- Ensure a successful authenticated project creator receives the project-level
-- entitlement required by the existing read model. Business-unit visibility is
-- necessary but intentionally not sufficient to read every project in a unit.
--
-- The projects INSERT policy may authorize executives, unit owners/admins, or an
-- organization-wide project.manage grantee. Without this bridge a non-executive
-- unit admin could create a project successfully and then immediately lose sight
-- of it because projects SELECT still requires project membership.

create or replace function business_unit_private.sync_project_creator_membership()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor_id uuid := auth.uid();
  actor_role public.app_role;
begin
  -- Service-role/migration inserts have no end-user actor and are intentionally
  -- left unchanged.
  if actor_id is null then
    return new;
  end if;

  select om.role
    into actor_role
  from public.organization_memberships om
  where om.organization_id = new.organization_id
    and om.profile_id = actor_id
    and om.internal_role is not null
    and om.suspended_at is null
    and om.effective_from <= now()
    and (om.effective_until is null or om.effective_until > now())
  order by
    case om.internal_role
      when 'founder_ceo' then 0
      when 'executive_operations' then 1
      when 'project_manager' then 2
      when 'department_lead' then 3
      else 10
    end,
    om.effective_from desc
  limit 1;

  if actor_role is null then
    raise exception 'project_creator_requires_active_internal_membership'
      using errcode = '42501';
  end if;

  insert into public.project_memberships (
    organization_id,
    project_id,
    profile_id,
    role
  ) values (
    new.organization_id,
    new.id,
    actor_id,
    actor_role
  )
  on conflict (project_id, profile_id) do nothing;

  return new;
end;
$$;

revoke all on function business_unit_private.sync_project_creator_membership() from public;
revoke all on function business_unit_private.sync_project_creator_membership() from anon;
revoke all on function business_unit_private.sync_project_creator_membership() from authenticated;

drop trigger if exists ksp_projects_creator_membership_sync on public.projects;
create trigger ksp_projects_creator_membership_sync
after insert on public.projects
for each row execute function business_unit_private.sync_project_creator_membership();
