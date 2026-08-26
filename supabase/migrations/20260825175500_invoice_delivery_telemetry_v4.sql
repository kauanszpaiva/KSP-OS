-- Authority Engine V4 — invoice delivery telemetry.
--
-- Non-executive invoice approvers may deliver an approved invoice through the
-- reviewed email workflow, but direct customer_invoices UPDATE remains
-- executive-only. This narrow RPC records send telemetry without reopening
-- invoice truth for arbitrary mutation.

create or replace function public.record_customer_invoice_email_sent(
  p_invoice_id uuid,
  p_sent_at timestamptz default now()
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_invoice public.customer_invoices%rowtype;
begin
  if auth.uid() is null then raise exception 'authentication_required'; end if;
  if not authority_private.session_has_aal2() then raise exception 'mfa_required'; end if;

  select * into v_invoice
  from public.customer_invoices
  where id = p_invoice_id
  for update;

  if v_invoice.id is null then raise exception 'invoice_not_found'; end if;
  if v_invoice.status <> 'issued' then raise exception 'invoice_not_issued'; end if;

  if not authority_private.has_effective_permission(
    v_invoice.organization_id,
    'invoice.approve'::public.permission_action,
    'customer_invoice',
    v_invoice.id
  ) then
    raise exception 'insufficient_invoice_approve_permission';
  end if;

  update public.customer_invoices
  set email_last_sent_at = p_sent_at,
      email_send_count = coalesce(email_send_count, 0) + 1,
      updated_at = now()
  where id = v_invoice.id;

  insert into public.audit_events (
    organization_id,
    actor_id,
    action,
    target_table,
    target_id,
    classification,
    metadata
  ) values (
    v_invoice.organization_id,
    auth.uid(),
    'invoice.email.sent',
    'customer_invoices',
    v_invoice.id,
    'restricted',
    jsonb_build_object('sent_at', p_sent_at)
  );
end;
$$;

revoke all on function public.record_customer_invoice_email_sent(uuid,timestamptz) from public, anon;
grant execute on function public.record_customer_invoice_email_sent(uuid,timestamptz) to authenticated;
