-- Phase C2: Signals (inbox_items) and Decisions (approval_requests/approval_decisions)
-- become live modules. Both tables were created in the foundation migration with a
-- read-only policy each; this migration adds the missing write-side policies and a
-- status-sync trigger so a decision closes its request without a second manual write.

-- Idempotent re-assertion (these tables already had RLS enabled in migration 1) —
-- kept explicit here so this migration is self-describing about which tables it
-- extends the write-policy surface of.
alter table inbox_items enable row level security;
alter table approval_requests enable row level security;
alter table approval_decisions enable row level security;

-- ---------------------------------------------------------------------------
-- inbox_items: Signals. Creator or an executive may write; everyone internal
-- already reads their own items (inbox_owner_read, migration 1).
-- ---------------------------------------------------------------------------
create policy inbox_items_insert on inbox_items for insert
  with check (organization_id in (select current_org_ids()) and created_by = auth.uid());

create policy inbox_items_update on inbox_items for update
  using (
    organization_id in (select current_org_ids())
    and (created_by = auth.uid() or is_executive(organization_id))
  )
  with check (organization_id in (select current_org_ids()));

-- ---------------------------------------------------------------------------
-- approval_requests: Decisions. Any internal member may request approval of
-- their own action; only an executive may change its status directly (the
-- normal path is the trigger below, fired by an executive's decision).
-- ---------------------------------------------------------------------------
create policy approval_requests_insert on approval_requests for insert
  with check (
    organization_id in (select current_org_ids())
    and requester_id = auth.uid()
  );

create policy approval_requests_update on approval_requests for update
  using (is_executive(organization_id))
  with check (is_executive(organization_id));

-- Closing a request is a side effect of the (already-gated) decision, not a
-- separate privileged write the client has to perform. `no_self_approval_insert`
-- (migration 1) already restricts approval_decisions inserts to executives who
-- are not the requester, so this trigger only ever runs in that context.
create or replace function apply_approval_decision() returns trigger
  language plpgsql security definer set search_path = public, pg_temp as $$
begin
  update approval_requests
  set status = case when new.decision = 'approved' then 'approved'::record_status else 'rejected'::record_status end
  where id = new.approval_request_id
    and status = 'pending_approval';
  return new;
end $$;

create trigger approval_decisions_apply_status after insert on approval_decisions
  for each row execute function apply_approval_decision();
