-- Phase P2 (Portal Approvals/Change Orders + Requests/Support).
--
-- Recurring pattern, found an 8th time, confirmed before writing any UI on
-- top of it: change_order_versions_portal_read ("change_versions_portal_read")
-- and change_order_items_portal_read both gate through
-- `exists(select 1 from change_orders co where ... and
-- is_portal_member(co.client_organization_id))`, but change_orders itself
-- has only `change_orders_internal` (for all using (is_internal_member(...)))
-- — no portal-facing select policy at all. Postgres re-evaluates a
-- referenced table's own RLS for the querying role inside a policy
-- subquery, so with no portal-select policy on change_orders that
-- exists(...) subquery can never return true for a real client session:
-- today, change_order_versions_portal_read and change_order_items_portal_read
-- are dead code for clients. Fixed here with the same scoping the row
-- already carries (client_organization_id), before Approvals ships any UI.
alter table change_orders enable row level security;

create policy change_orders_portal_read on change_orders for select
  using (is_portal_member(client_organization_id));

-- No other new policies are needed for this phase:
-- - client_requests_portal_insert / _read (submit + list) already exist
--   (202607150002) and are already exercised by Phase P1's Home card.
-- - request_status_history / request_comments already have client_visible-
--   scoped read policies (202607150002) — reused as-is for the requests
--   detail view, no new business rule invented.
-- - change_order_client_decisions already has a portal insert policy
--   (decided_by=auth.uid() and is_portal_member(...)) and a portal-or-
--   internal read policy — reused as-is for recording accept/reject.
