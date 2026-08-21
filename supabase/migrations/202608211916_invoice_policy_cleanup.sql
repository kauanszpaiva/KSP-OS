-- Remove permissive legacy invoice policies if the older portal invoice migration
-- was ever applied in another environment before the canonical invoice release.
-- The canonical policies created by 202608211915_invoice_delivery.sql remain.

drop policy if exists customer_invoices_internal_all on customer_invoices;
drop policy if exists invoice_lines_internal_all on invoice_lines;
drop policy if exists customer_payments_internal_all on customer_payments;

drop policy if exists customer_invoices_portal_read on customer_invoices;
drop policy if exists invoice_lines_portal_read on invoice_lines;
drop policy if exists customer_payments_portal_read on customer_payments;

-- The older migration used a second updated_at trigger name. Keep only the
-- canonical trigger to avoid duplicate trigger execution.
drop trigger if exists customer_invoices_touch on customer_invoices;
