-- Authority Engine V4 — finance posting hardening.
-- Preserve existing accounting semantics while enforcing granular authority.

create or replace function public.issue_customer_invoice(p_invoice_id uuid)
returns public.customer_invoices
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_invoice public.customer_invoices%rowtype;
  v_self_approval boolean;
begin
  if auth.uid() is null then raise exception 'authentication_required'; end if;

  select * into v_invoice
  from public.customer_invoices
  where id = p_invoice_id
  for update;
  if v_invoice.id is null then raise exception 'invoice_not_found'; end if;
  if v_invoice.status not in ('draft','issued') then raise exception 'invoice_not_issuable'; end if;

  if v_invoice.status = 'issued' then
    return v_invoice;
  end if;

  if not authority_private.can_execute_amount_action(
    v_invoice.organization_id,
    'invoice.approve'::public.permission_action,
    v_invoice.amount_minor,
    v_invoice.currency::text,
    'customer_invoice',
    v_invoice.id
  ) then
    if not authority_private.session_has_aal2() then raise exception 'mfa_required'; end if;
    if not authority_private.has_effective_permission(
      v_invoice.organization_id,
      'invoice.approve'::public.permission_action,
      'customer_invoice',
      v_invoice.id
    ) then
      raise exception 'insufficient_invoice_approve_permission';
    end if;
    raise exception 'approval_limit_exceeded_or_missing';
  end if;

  v_self_approval := v_invoice.created_by = auth.uid();
  if v_self_approval and not public.is_executive(v_invoice.organization_id) then
    raise exception 'separation_of_duties_self_approval_denied';
  end if;

  update public.customer_invoices
  set status = 'issued',
      issue_date = coalesce(issue_date, current_date),
      issued_at = coalesce(issued_at, now()),
      approved_by = auth.uid(),
      approved_at = coalesce(approved_at, now()),
      updated_at = now()
  where id = v_invoice.id
  returning * into v_invoice;

  insert into public.audit_events (
    organization_id, actor_id, action, target_table, target_id, classification, metadata
  ) values (
    v_invoice.organization_id,
    auth.uid(),
    'invoice.approve',
    'customer_invoices',
    v_invoice.id,
    'restricted',
    jsonb_build_object(
      'amount_minor', v_invoice.amount_minor,
      'currency', v_invoice.currency,
      'self_approval', v_self_approval
    )
  );

  return v_invoice;
end;
$$;
revoke all on function public.issue_customer_invoice(uuid) from public, anon;
grant execute on function public.issue_customer_invoice(uuid) to authenticated;

create or replace function public.post_journal_entry(
  p_entry_id uuid,
  p_actor_id uuid,
  p_idempotency_key text
) returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_org uuid;
  v_status public.record_status;
  v_entry_date date;
  v_debit bigint;
  v_credit bigint;
  v_lines int;
  v_currency_count int;
  v_currency text;
  v_existing_entry uuid;
begin
  if auth.uid() is null then raise exception 'authentication_required'; end if;
  if p_actor_id is distinct from auth.uid() then raise exception 'actor_mismatch'; end if;
  if p_idempotency_key is null or btrim(p_idempotency_key) = '' then raise exception 'idempotency_key_required'; end if;

  -- A retry with the same key and same journal is a successful no-op. Reusing
  -- the same key for a different journal is rejected.
  select pik.journal_entry_id into v_existing_entry
  from public.posting_idempotency_keys pik
  where pik.idempotency_key = p_idempotency_key
    and pik.organization_id = (
      select je.organization_id from public.journal_entries je where je.id = p_entry_id
    );

  if v_existing_entry is not null then
    if v_existing_entry = p_entry_id then return p_entry_id; end if;
    raise exception 'idempotency_key_reused_for_different_entry';
  end if;

  select organization_id, status, entry_date into v_org, v_status, v_entry_date
  from public.journal_entries
  where id = p_entry_id
  for update;
  if v_org is null then raise exception 'journal_entry_not_found'; end if;
  if v_status <> 'draft' then raise exception 'only_draft_entries_can_be_posted'; end if;

  select
    count(*),
    coalesce(sum(debit_minor),0),
    coalesce(sum(credit_minor),0),
    count(distinct currency),
    min(currency)::text
  into v_lines, v_debit, v_credit, v_currency_count, v_currency
  from public.journal_lines
  where journal_entry_id = p_entry_id;

  if v_lines < 2 then raise exception 'journal_requires_at_least_two_lines'; end if;
  if v_currency_count <> 1 then raise exception 'mixed_currency_journal_requires_documented_fx_flow'; end if;
  if v_debit <> v_credit then raise exception 'journal_entry_must_balance'; end if;

  if not authority_private.can_execute_amount_action(
    v_org,
    'finance.post'::public.permission_action,
    v_debit,
    v_currency,
    'journal_entry',
    p_entry_id
  ) then
    if not authority_private.session_has_aal2() then raise exception 'mfa_required'; end if;
    if not authority_private.has_effective_permission(
      v_org,
      'finance.post'::public.permission_action,
      'journal_entry',
      p_entry_id
    ) then
      raise exception 'insufficient_permission';
    end if;
    raise exception 'approval_limit_exceeded_or_missing';
  end if;

  if exists (
    select 1
    from public.accounting_periods ap
    where ap.organization_id = v_org
      and ap.locked_at is not null
      and v_entry_date between ap.period_start and ap.period_end
  ) then
    raise exception 'accounting_period_locked';
  end if;

  insert into public.posting_idempotency_keys (
    organization_id, idempotency_key, journal_entry_id
  ) values (
    v_org, p_idempotency_key, p_entry_id
  );

  update public.journal_entries
  set status = 'posted', posted_at = now()
  where id = p_entry_id;

  insert into public.audit_events (
    organization_id, actor_id, action, target_table, target_id, classification, metadata
  ) values (
    v_org,
    p_actor_id,
    'finance.post',
    'journal_entries',
    p_entry_id,
    'restricted',
    jsonb_build_object(
      'idempotency_key', p_idempotency_key,
      'amount_minor', v_debit,
      'currency', v_currency,
      'entry_date', v_entry_date
    )
  );

  return p_entry_id;
end;
$$;
revoke all on function public.post_journal_entry(uuid,uuid,text) from public, anon;
grant execute on function public.post_journal_entry(uuid,uuid,text) to authenticated;
