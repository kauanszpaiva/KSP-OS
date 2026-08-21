-- Allow authenticated executives to write the restricted audit events emitted by
-- Finance V2 server actions. Scope is intentionally limited to finance targets.
create policy audit_finance_exec_insert on audit_events for insert
with check (
  actor_id = auth.uid()
  and is_executive(organization_id)
  and classification = 'restricted'
  and target_table in (
    'financial_accounts',
    'cash_transactions',
    'reconciliation_statements',
    'invoices'
  )
);

-- This marker intentionally lives in the final migration for the Cash Control slice.
-- Application code uses it to distinguish "schema not released" from "no data yet"
-- and to block mutations until the complete slice (including audit policy) exists.
create or replace function finance_v2_cash_schema_ready()
returns boolean
language sql
stable
security invoker
set search_path = public, pg_temp
as $$
  select true;
$$;

revoke all on function finance_v2_cash_schema_ready() from public;
revoke all on function finance_v2_cash_schema_ready() from anon;
grant execute on function finance_v2_cash_schema_ready() to authenticated;
