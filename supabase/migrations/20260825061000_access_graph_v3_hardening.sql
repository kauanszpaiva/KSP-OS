-- Access Graph v3 hardening after staging actor-matrix validation.
--
-- Keep the SECURITY DEFINER implementation outside the exposed public schema,
-- while preserving public.can_view_task(uuid) as a SECURITY INVOKER compatibility
-- wrapper for existing RLS policies/application calls. Add the covering indexes
-- surfaced by the Supabase performance advisor and avoid per-row auth.uid()
-- initialization in the task-access-grant read policy.

create or replace function access_graph_private.can_view_task(target_task_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.tasks t
    where t.id = target_task_id
      and t.organization_id in (select public.current_org_ids())
      and (
        public.is_executive(t.organization_id)
        or t.owner_id = auth.uid()
        or t.project_id is null
        or (t.project_id is not null and public.can_access_project(t.project_id))
        or exists (
          select 1
          from public.task_access_grants tag
          where tag.organization_id = t.organization_id
            and tag.task_id = t.id
            and tag.profile_id = auth.uid()
            and tag.revoked_at is null
            and tag.effective_from <= now()
            and (tag.effective_until is null or tag.effective_until > now())
        )
      )
  );
$$;

revoke all on function access_graph_private.can_view_task(uuid) from public;
revoke all on function access_graph_private.can_view_task(uuid) from anon;
grant execute on function access_graph_private.can_view_task(uuid) to authenticated;
grant execute on function access_graph_private.can_view_task(uuid) to service_role;

-- Public compatibility wrapper is intentionally SECURITY INVOKER. PostgREST may
-- expose this RPC, but it cannot elevate the caller; the actual definer helper is
-- kept in the private, non-exposed schema and still derives identity from auth.uid().
create or replace function public.can_view_task(target_task_id uuid)
returns boolean
language sql
stable
security invoker
set search_path = ''
as $$
  select access_graph_private.can_view_task(target_task_id);
$$;

revoke all on function public.can_view_task(uuid) from public;
revoke all on function public.can_view_task(uuid) from anon;
grant execute on function public.can_view_task(uuid) to authenticated;
grant execute on function public.can_view_task(uuid) to service_role;

create index if not exists task_access_grants_organization_idx
  on public.task_access_grants (organization_id);

create index if not exists task_access_grants_granted_by_idx
  on public.task_access_grants (granted_by)
  where granted_by is not null;

drop policy if exists task_access_grants_read on public.task_access_grants;
create policy task_access_grants_read on public.task_access_grants
for select to authenticated
using (
  profile_id = (select auth.uid())
  or public.is_executive(organization_id)
);
