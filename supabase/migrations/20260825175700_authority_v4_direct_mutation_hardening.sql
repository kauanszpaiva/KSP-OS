-- Authority Engine V4 — direct mutation hardening.
--
-- Sensitive authorization records and financial truth must be changed through
-- bounded workflows/RPCs, not generic table PATCH access that could bypass
-- explicit-deny, MFA, approval-ceiling or separation-of-duties rules.

-- Portal invitation authorization context is immutable after issuance. An
-- executive may create/read/revoke an invitation; acceptance fields are written
-- only by the security-definer acceptance function.
alter table public.portal_invitations enable row level security;
drop policy if exists portal_invitations_internal on public.portal_invitations;
drop policy if exists portal_invitations_read on public.portal_invitations;
drop policy if exists portal_invitations_insert on public.portal_invitations;
drop policy if exists portal_invitations_update on public.portal_invitations;

revoke all on public.portal_invitations from anon;
revoke all on public.portal_invitations from authenticated;
grant select, insert on public.portal_invitations to authenticated;
grant update (revoked_at) on public.portal_invitations to authenticated;

create policy portal_invitations_read on public.portal_invitations
for select to authenticated
using (public.is_executive(organization_id));

create policy portal_invitations_insert on public.portal_invitations
for insert to authenticated
with check (
  public.is_executive(organization_id)
  and invited_by = (select auth.uid())
  and revoked_at is null
  and accepted_at is null
  and expires_at > now()
);

create policy portal_invitations_update on public.portal_invitations
for update to authenticated
using (public.is_executive(organization_id))
with check (public.is_executive(organization_id));

-- Invoice financial truth has no generic authenticated write surface. Draft,
-- approval/issue and delivery telemetry are handled by reviewed SECURITY
-- DEFINER functions. Service-role integrations remain independent of the
-- authenticated role grants below.
drop policy if exists customer_invoices_executive_mutation on public.customer_invoices;
drop policy if exists customer_invoices_executive_all on public.customer_invoices;
revoke insert, update, delete on public.customer_invoices from authenticated;

drop policy if exists invoice_lines_executive_mutation on public.invoice_lines;
drop policy if exists invoice_lines_executive_all on public.invoice_lines;
revoke insert, update, delete on public.invoice_lines from authenticated;

drop policy if exists customer_payments_executive_mutation on public.customer_payments;
drop policy if exists customer_payments_executive_all on public.customer_payments;
revoke insert, update, delete on public.customer_payments from authenticated;

comment on table public.customer_invoices is
  'Invoice truth. Authenticated mutation is RPC-only so granular authority, explicit deny, AAL2, approval ceilings and separation of duties cannot be bypassed by direct table writes.';
comment on table public.portal_invitations is
  'Portal invitation bearer-token records. Authorization context is immutable after insert; authenticated users can only read/create/revoke under executive RLS while acceptance is performed by the bounded RPC.';
