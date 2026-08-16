-- Fixes for the 2026-08-16 external audit (AI-0091 / RESP-0152 / CHG-0228).
--
-- No tables are created or dropped here, and no table's RLS posture changes
-- (every affected table already has enable row level security set from its
-- originating migration) — this migration only replaces the security
-- definition of three functions.
--
-- P0-1 — RLS recursion on projects / project_memberships / tasks / missions.
-- `can_access_project()` and `has_project_access()` were declared
-- `language sql stable` with NO `security definer`, so they run as the calling
-- role (authenticated/anon) and are themselves subject to RLS on the tables
-- they query. Every policy that calls them (`projects_member_read`,
-- `project_members_read`, `tasks_project_read`, the mission policies in
-- 202607230002) therefore re-enters the same RLS policy while evaluating the
-- helper, which re-enters it again, without bound — this is the exact
-- `stack depth limit exceeded` / HTTP 500 observed on `GET /rest/v1/projects`
-- and `GET /rest/v1/project_memberships`.
--
-- The rest of the helper functions (`current_org_ids`, `is_executive`,
-- `is_internal_member`, `is_founder`) were already corrected to
-- `security definer set search_path = public, pg_temp` in
-- 202607210001_operational_slice.sql. These two were missed. `security
-- definer` makes them run as the function owner (bypassing RLS on the
-- narrow membership check they perform), which is the standard, safe pattern
-- for RLS helper functions — they still only ever return a boolean derived
-- from `auth.uid()`, never row data.
create or replace function can_access_project(pid uuid) returns boolean
  language sql stable security definer set search_path = public, pg_temp as $$
    select exists(
      select 1 from project_memberships pm
      where pm.project_id = pid
        and pm.profile_id = auth.uid()
        and (pm.effective_until is null or pm.effective_until > now())
    )
  $$;

create or replace function has_project_access(pid uuid) returns boolean
  language sql stable security definer set search_path = public, pg_temp as $$
    select exists(
      select 1 from project_memberships
      where profile_id = auth.uid()
        and project_id = pid
        and (effective_until is null or effective_until > now())
    ) or exists(
      select 1 from project_access_grants
      where profile_id = auth.uid()
        and project_id = pid
        and revoked_at is null
        and (effective_until is null or effective_until > now())
    )
  $$;

-- P0-3 — post_journal_entry() is SECURITY DEFINER with no fixed search_path
-- and no in-function identity/authorization check, and carried no explicit
-- grant/revoke, which leaves it executable under Postgres' default PUBLIC
-- EXECUTE grant (i.e. reachable by `anon` through PostgREST). A financial
-- posting RPC must never be callable unauthenticated, must not trust its
-- `p_actor_id` argument, and must require the caller to actually hold
-- `finance.post` for the entry's organization.
create or replace function post_journal_entry(p_entry_id uuid, p_actor_id uuid, p_idempotency_key text) returns uuid
  language plpgsql security definer set search_path = public, pg_temp as $$
declare
  v_org uuid;
  v_status record_status;
  v_debit bigint;
  v_credit bigint;
  v_lines int;
  v_currency_count int;
begin
  if auth.uid() is null then
    raise exception 'authentication_required';
  end if;
  -- The caller may only post as themselves. A privileged backend job needing
  -- to post on a user's behalf must use the service-role client, which does
  -- not go through this RPC's PostgREST/anon-reachable surface.
  if p_actor_id is distinct from auth.uid() then
    raise exception 'actor_mismatch';
  end if;

  select organization_id, status into v_org, v_status
    from journal_entries where id = p_entry_id for update;
  if v_org is null then
    raise exception 'journal_entry_not_found';
  end if;

  -- Require the caller to hold finance.post for this org: either an
  -- executive role, or an explicit, unrevoked, unexpired grant.
  if not (
    is_executive(v_org)
    or exists (
      select 1 from internal_permission_grants g
      where g.organization_id = v_org
        and g.profile_id = auth.uid()
        and g.action = 'finance.post'
        and g.revoked_at is null
        and (g.effective_until is null or g.effective_until > now())
    )
  ) then
    raise exception 'insufficient_permission';
  end if;

  if v_status <> 'draft' then
    raise exception 'only_draft_entries_can_be_posted';
  end if;
  if exists (
    select 1 from accounting_periods ap
    where ap.organization_id = v_org
      and ap.locked_at is not null
      and current_date between ap.period_start and ap.period_end
  ) then
    raise exception 'accounting_period_locked';
  end if;

  insert into posting_idempotency_keys (organization_id, idempotency_key, journal_entry_id)
    values (v_org, p_idempotency_key, p_entry_id);

  select count(*), coalesce(sum(debit_minor),0), coalesce(sum(credit_minor),0), count(distinct currency)
    into v_lines, v_debit, v_credit, v_currency_count
    from journal_lines where journal_entry_id = p_entry_id;

  if v_lines < 2 then
    raise exception 'journal_requires_at_least_two_lines';
  end if;
  if v_currency_count <> 1 then
    raise exception 'mixed_currency_journal_requires_documented_fx_flow';
  end if;
  if v_debit <> v_credit then
    raise exception 'journal_entry_must_balance';
  end if;

  update journal_entries set status = 'posted', posted_at = now() where id = p_entry_id;

  insert into audit_events (organization_id, actor_id, action, target_table, target_id, classification, metadata)
    values (v_org, p_actor_id, 'finance.post', 'journal_entries', p_entry_id, 'restricted',
      jsonb_build_object('idempotency_key', p_idempotency_key));

  return p_entry_id;
end $$;

-- Close the anon/PUBLIC execution gap explicitly rather than relying on the
-- default deny — never grant this back to anon.
revoke all on function post_journal_entry(uuid, uuid, text) from public;
revoke all on function post_journal_entry(uuid, uuid, text) from anon;
grant execute on function post_journal_entry(uuid, uuid, text) to authenticated;
