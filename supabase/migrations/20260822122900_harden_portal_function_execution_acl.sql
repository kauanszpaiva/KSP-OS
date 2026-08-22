-- Portal invitation/access helper ACL hardening.
-- Trigger-only helpers must never be directly callable through PostgREST RPC.

alter function public.ksp_email_escape_html(text) set search_path = 'pg_catalog';
alter function public.is_portal_member(uuid) set search_path = 'pg_catalog', 'public';

revoke all on function public.ksp_email_escape_html(text) from public, anon, authenticated, service_role;
revoke all on function public.ksp_portal_invitation_email_before_insert() from public, anon, authenticated, service_role;
revoke all on function public.ksp_before_delete_task_detach_optional_history() from public, anon, authenticated, service_role;
revoke all on function public.ksp_before_delete_outcome_detach_commitments() from public, anon, authenticated, service_role;
revoke all on function public.ksp_before_delete_project_safe_remove() from public, anon, authenticated, service_role;

revoke all on function public.accept_portal_invitation(text) from public, anon, authenticated, service_role;
grant execute on function public.accept_portal_invitation(text) to authenticated;

revoke all on function public.preview_portal_invitation(text) from public, anon, authenticated, service_role;
grant execute on function public.preview_portal_invitation(text) to authenticated;

revoke all on function public.portal_visible_projects() from public, anon, authenticated, service_role;
grant execute on function public.portal_visible_projects() to authenticated;

revoke execute on function public.is_portal_member(uuid) from public, anon;
grant execute on function public.is_portal_member(uuid) to authenticated;

revoke execute on function public.is_executive(uuid) from public, anon;
grant execute on function public.is_executive(uuid) to authenticated;

revoke execute on function public.is_internal_member(uuid) from public, anon;
grant execute on function public.is_internal_member(uuid) to authenticated;

revoke execute on function public.can_access_project(uuid) from public, anon;
grant execute on function public.can_access_project(uuid) to authenticated;

revoke execute on function public.has_project_access(uuid) from public, anon;
grant execute on function public.has_project_access(uuid) to authenticated;
