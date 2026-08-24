-- P0 staging-proven function hardening.
--
-- Goals:
-- 1. Pin search_path on trigger/helper functions flagged by the Supabase linter.
-- 2. Remove anonymous/public direct execution from SECURITY DEFINER helpers.
-- 3. Keep authenticated access only where RLS/application semantics require it.
--
-- This migration does not change table data, RLS policy predicates, or tenant scope.

alter function public.prevent_posted_journal_update()
  set search_path = public, pg_temp;

alter function public.prevent_posted_journal_line_update()
  set search_path = public, pg_temp;

alter function public.set_updated_at()
  set search_path = public, pg_temp;

alter function public.enforce_active_outcome_limit()
  set search_path = public, pg_temp;

alter function public.enforce_commitment_completion()
  set search_path = public, pg_temp;

-- Trigger-only function. Clients do not need to invoke it as an RPC.
revoke execute on function public.apply_approval_decision() from public;
revoke execute on function public.apply_approval_decision() from anon;
revoke execute on function public.apply_approval_decision() from authenticated;
grant execute on function public.apply_approval_decision() to service_role;

-- RLS helpers remain available to authenticated sessions, but must not be
-- directly executable by anonymous/public callers.
revoke execute on function public.current_org_ids() from public;
revoke execute on function public.current_org_ids() from anon;
grant execute on function public.current_org_ids() to authenticated;
grant execute on function public.current_org_ids() to service_role;

revoke execute on function public.is_founder(uuid) from public;
revoke execute on function public.is_founder(uuid) from anon;
grant execute on function public.is_founder(uuid) to authenticated;
grant execute on function public.is_founder(uuid) to service_role;
