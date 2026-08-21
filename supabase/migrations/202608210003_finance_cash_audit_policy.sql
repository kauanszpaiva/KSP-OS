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
