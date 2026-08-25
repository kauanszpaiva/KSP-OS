-- Authority Engine V4 — granular finance authority + approval ceilings.
--
-- Makes the database honor explicit-deny precedence and granular finance
-- capabilities instead of treating every finance operation as executive-only.
-- High-impact amount-bearing actions require AAL2 and a persisted approval
-- ceiling for non-executives. Existing owner authority remains available, but
-- explicit deny still wins unless a valid matching break-glass record exists.

create table if not exists public.authority_approval_limits (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  profile_id uuid not null references public.profiles(id) on delete cascade,
  action public.permission_action not null,
  max_amount_minor bigint not null check (max_amount_minor >= 0),
  currency char(3) not null,
  resource_type text,
  resource_id uuid,
  effective_from timestamptz not null default now(),
  effective_until timestamptz,
  granted_by uuid not null references public.profiles(id) on delete restrict,
  revoked_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check ((resource_type is null) = (resource_id is null)),
  check (effective_until is null or effective_until > effective_from),
  check (currency ~ '^[A-Z]{3}$'),
  check (
    action::text in (
      'invoice.approve',
      'invoice.pay',
      'payment.schedule',
      'payment.mark_paid',
      'payment.refund',
      'finance.post',
      'finance.reconcile',
      'reconciliation.manage'
    )
  )
);

create index if not exists authority_approval_limits_profile_idx
  on public.authority_approval_limits (organization_id, profile_id, action, currency)
  where revoked_at is null;

alter table public.authority_approval_limits enable row level security;
revoke all on public.authority_approval_limits from anon;
revoke all on public.authority_approval_limits from authenticated;
grant select, insert on public.authority_approval_limits to authenticated;
grant update (revoked_at, updated_at) on public.authority_approval_limits to authenticated;

create policy authority_approval_limits_read on public.authority_approval_limits
for select to authenticated
using (
  profile_id = (select auth.uid())
  or public.is_executive(organization_id)
);

create policy authority_approval_limits_insert on public.authority_approval_limits
for insert to authenticated
with check (
  public.is_executive(organization_id)
  and granted_by = (select auth.uid())
  and revoked_at is null
  and effective_from <= now()
  and (effective_until is null or effective_until > now())
  and exists (
    select 1
    from public.organization_memberships om
    where om.organization_id = authority_approval_limits.organization_id
      and om.profile_id = authority_approval_limits.profile_id
      and om.internal_role is not null
      and om.suspended_at is null
      and om.effective_from <= now()
      and (om.effective_until is null or om.effective_until > now())
  )
);

create policy authority_approval_limits_update on public.authority_approval_limits
for update to authenticated
using (public.is_executive(organization_id))
with check (public.is_executive(organization_id));

comment on table public.authority_approval_limits is
  'Amount/currency ceilings for high-impact delegated finance authority. Authenticated updates are revocation-only.';

create schema if not exists authority_private;
revoke all on schema authority_private from public, anon;
grant usage on schema authority_private to authenticated;

create or replace function authority_private.session_has_aal2()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(
    nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'aal',
    ''
  ) = 'aal2';
$$;
revoke all on function authority_private.session_has_aal2() from public, anon;
grant execute on function authority_private.session_has_aal2() to authenticated;

create or replace function authority_private.has_active_explicit_deny(
  p_organization_id uuid,
  p_action public.permission_action,
  p_resource_type text default null,
  p_resource_id uuid default null
)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.internal_permission_denies d
    where d.organization_id = p_organization_id
      and d.profile_id = auth.uid()
      and d.action = p_action
      and d.revoked_at is null
      and d.effective_from <= now()
      and (d.effective_until is null or d.effective_until > now())
      and (
        (d.resource_type is null and d.resource_id is null)
        or (
          d.resource_type = p_resource_type
          and d.resource_id = p_resource_id
        )
      )
  );
$$;
revoke all on function authority_private.has_active_explicit_deny(uuid,public.permission_action,text,uuid) from public, anon;
grant execute on function authority_private.has_active_explicit_deny(uuid,public.permission_action,text,uuid) to authenticated;

create or replace function authority_private.has_matching_break_glass(
  p_organization_id uuid,
  p_action public.permission_action,
  p_resource_type text,
  p_resource_id uuid
)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select
    public.is_executive(p_organization_id)
    and authority_private.session_has_aal2()
    and p_resource_type is not null
    and p_resource_id is not null
    and exists (
      select 1
      from public.access_break_glass_sessions b
      where b.organization_id = p_organization_id
        and b.profile_id = auth.uid()
        and b.action = p_action
        and b.resource_type = p_resource_type
        and b.resource_id = p_resource_id
        and b.revoked_at is null
        and b.effective_from <= now()
        and b.effective_until > now()
    );
$$;
revoke all on function authority_private.has_matching_break_glass(uuid,public.permission_action,text,uuid) from public, anon;
grant execute on function authority_private.has_matching_break_glass(uuid,public.permission_action,text,uuid) to authenticated;

create or replace function authority_private.has_effective_permission(
  p_organization_id uuid,
  p_action public.permission_action,
  p_resource_type text default null,
  p_resource_id uuid default null
)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select
    auth.uid() is not null
    and (
      not authority_private.has_active_explicit_deny(
        p_organization_id,
        p_action,
        p_resource_type,
        p_resource_id
      )
      or authority_private.has_matching_break_glass(
        p_organization_id,
        p_action,
        p_resource_type,
        p_resource_id
      )
    )
    and (
      public.is_executive(p_organization_id)
      or exists (
        select 1
        from public.internal_permission_grants g
        where g.organization_id = p_organization_id
          and g.profile_id = auth.uid()
          and g.action = p_action
          and g.revoked_at is null
          and g.effective_from <= now()
          and (g.effective_until is null or g.effective_until > now())
          and (
            (g.resource_type is null and g.resource_id is null)
            or (g.resource_type = p_resource_type and g.resource_id = p_resource_id)
          )
      )
      or exists (
        select 1
        from public.temporary_access_grants t
        where t.organization_id = p_organization_id
          and t.profile_id = auth.uid()
          and t.action = p_action
          and t.revoked_at is null
          and t.effective_from <= now()
          and t.effective_until > now()
          and t.resource_type = p_resource_type
          and t.resource_id = p_resource_id
      )
    );
$$;
revoke all on function authority_private.has_effective_permission(uuid,public.permission_action,text,uuid) from public, anon;
grant execute on function authority_private.has_effective_permission(uuid,public.permission_action,text,uuid) to authenticated;

create or replace function authority_private.within_approval_ceiling(
  p_organization_id uuid,
  p_action public.permission_action,
  p_amount_minor bigint,
  p_currency text,
  p_resource_type text default null,
  p_resource_id uuid default null
)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select
    p_amount_minor >= 0
    and p_currency ~ '^[A-Z]{3}$'
    and (
      public.is_executive(p_organization_id)
      or exists (
        select 1
        from public.authority_approval_limits l
        where l.organization_id = p_organization_id
          and l.profile_id = auth.uid()
          and l.action = p_action
          and l.currency = p_currency::char(3)
          and l.max_amount_minor >= p_amount_minor
          and l.revoked_at is null
          and l.effective_from <= now()
          and (l.effective_until is null or l.effective_until > now())
          and (
            (l.resource_type is null and l.resource_id is null)
            or (l.resource_type = p_resource_type and l.resource_id = p_resource_id)
          )
      )
    );
$$;
revoke all on function authority_private.within_approval_ceiling(uuid,public.permission_action,bigint,text,text,uuid) from public, anon;
grant execute on function authority_private.within_approval_ceiling(uuid,public.permission_action,bigint,text,text,uuid) to authenticated;

create or replace function authority_private.can_execute_amount_action(
  p_organization_id uuid,
  p_action public.permission_action,
  p_amount_minor bigint,
  p_currency text,
  p_resource_type text,
  p_resource_id uuid
)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select
    authority_private.session_has_aal2()
    and authority_private.has_effective_permission(
      p_organization_id,
      p_action,
      p_resource_type,
      p_resource_id
    )
    and authority_private.within_approval_ceiling(
      p_organization_id,
      p_action,
      p_amount_minor,
      p_currency,
      p_resource_type,
      p_resource_id
    );
$$;
revoke all on function authority_private.can_execute_amount_action(uuid,public.permission_action,bigint,text,text,uuid) from public, anon;
grant execute on function authority_private.can_execute_amount_action(uuid,public.permission_action,bigint,text,text,uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- Finance read policies: explicit finance/invoice/payment readers no longer
-- need executive identity, but explicit deny still overrides their grants.
-- ---------------------------------------------------------------------------
drop policy if exists finance_executive_read on public.chart_accounts;
create policy chart_accounts_finance_read on public.chart_accounts
for select to authenticated
using (
  authority_private.has_effective_permission(
    organization_id,
    'finance.read'::public.permission_action,
    'chart_account',
    id
  )
);

drop policy if exists journal_entries_executive_read on public.journal_entries;
create policy journal_entries_finance_read on public.journal_entries
for select to authenticated
using (
  authority_private.has_effective_permission(
    organization_id,
    'finance.read'::public.permission_action,
    'journal_entry',
    id
  )
);

drop policy if exists journal_lines_executive_read on public.journal_lines;
create policy journal_lines_finance_read on public.journal_lines
for select to authenticated
using (
  authority_private.has_effective_permission(
    organization_id,
    'finance.read'::public.permission_action,
    'journal_entry',
    journal_entry_id
  )
);

drop policy if exists subscriptions_executive_read on public.subscriptions;
create policy subscriptions_finance_read on public.subscriptions
for select to authenticated
using (
  authority_private.has_effective_permission(
    organization_id,
    'finance.read'::public.permission_action,
    'subscription',
    id
  )
);

drop policy if exists finance_periods_exec on public.accounting_periods;
create policy accounting_periods_finance_read on public.accounting_periods
for select to authenticated
using (
  authority_private.has_effective_permission(
    organization_id,
    'finance.read'::public.permission_action,
    'accounting_period',
    id
  )
);

-- Period mutation remains an executive/approved finance-reconcile action and
-- requires AAL2. A separate workflow should own close/lock semantics.
create policy accounting_periods_finance_write on public.accounting_periods
for all to authenticated
using (
  authority_private.session_has_aal2()
  and authority_private.has_effective_permission(
    organization_id,
    'finance.reconcile'::public.permission_action,
    'accounting_period',
    id
  )
)
with check (
  authority_private.session_has_aal2()
  and authority_private.has_effective_permission(
    organization_id,
    'finance.reconcile'::public.permission_action,
    'accounting_period',
    id
  )
);

drop policy if exists posting_keys_exec on public.posting_idempotency_keys;
create policy posting_keys_finance_read on public.posting_idempotency_keys
for select to authenticated
using (
  authority_private.has_effective_permission(
    organization_id,
    'finance.read'::public.permission_action,
    'journal_entry',
    journal_entry_id
  )
);

-- Internal invoice visibility is granular. Existing client Portal policies are
-- left intact and still enforce issued-state + client/project boundaries.
drop policy if exists customer_invoices_executive_all on public.customer_invoices;
create policy customer_invoices_internal_select on public.customer_invoices
for select to authenticated
using (
  authority_private.has_effective_permission(
    organization_id,
    'invoice.read'::public.permission_action,
    'customer_invoice',
    id
  )
  or authority_private.has_effective_permission(
    organization_id,
    'invoice.create'::public.permission_action,
    'customer_invoice',
    id
  )
  or authority_private.has_effective_permission(
    organization_id,
    'invoice.approve'::public.permission_action,
    'customer_invoice',
    id
  )
);

-- Direct mutation of invoice truth stays owner-only. Granular writers use the
-- reviewed security-definer RPCs below so status transitions, SoD and ceilings
-- cannot be bypassed with raw table PATCH requests.
create policy customer_invoices_executive_mutation on public.customer_invoices
for all to authenticated
using (public.is_executive(organization_id))
with check (public.is_executive(organization_id));

drop policy if exists invoice_lines_executive_all on public.invoice_lines;
create policy invoice_lines_internal_select on public.invoice_lines
for select to authenticated
using (
  authority_private.has_effective_permission(
    organization_id,
    'invoice.read'::public.permission_action,
    'customer_invoice',
    invoice_id
  )
  or authority_private.has_effective_permission(
    organization_id,
    'invoice.create'::public.permission_action,
    'customer_invoice',
    invoice_id
  )
  or authority_private.has_effective_permission(
    organization_id,
    'invoice.approve'::public.permission_action,
    'customer_invoice',
    invoice_id
  )
);
create policy invoice_lines_executive_mutation on public.invoice_lines
for all to authenticated
using (public.is_executive(organization_id))
with check (public.is_executive(organization_id));

drop policy if exists customer_payments_executive_all on public.customer_payments;
create policy customer_payments_internal_select on public.customer_payments
for select to authenticated
using (
  authority_private.has_effective_permission(
    organization_id,
    'payment.status.read'::public.permission_action,
    'customer_invoice',
    invoice_id
  )
);
create policy customer_payments_executive_mutation on public.customer_payments
for all to authenticated
using (public.is_executive(organization_id))
with check (public.is_executive(organization_id));

drop policy if exists invoice_email_deliveries_executive_all on public.invoice_email_deliveries;
create policy invoice_email_deliveries_internal_select on public.invoice_email_deliveries
for select to authenticated
using (
  authority_private.has_effective_permission(
    organization_id,
    'invoice.approve'::public.permission_action,
    'customer_invoice',
    invoice_id
  )
  or authority_private.has_effective_permission(
    organization_id,
    'invoice.read'::public.permission_action,
    'customer_invoice',
    invoice_id
  )
);
create policy invoice_email_deliveries_approver_insert on public.invoice_email_deliveries
for insert to authenticated
with check (
  authority_private.session_has_aal2()
  and authority_private.has_effective_permission(
    organization_id,
    'invoice.approve'::public.permission_action,
    'customer_invoice',
    invoice_id
  )
);
create policy invoice_email_deliveries_approver_update on public.invoice_email_deliveries
for update to authenticated
using (
  authority_private.session_has_aal2()
  and authority_private.has_effective_permission(
    organization_id,
    'invoice.approve'::public.permission_action,
    'customer_invoice',
    invoice_id
  )
)
with check (
  authority_private.session_has_aal2()
  and authority_private.has_effective_permission(
    organization_id,
    'invoice.approve'::public.permission_action,
    'customer_invoice',
    invoice_id
  )
);

alter table public.customer_invoices
  add column if not exists created_by uuid references public.profiles(id) on delete set null,
  add column if not exists approved_by uuid references public.profiles(id) on delete set null,
  add column if not exists approved_at timestamptz;

-- Draft creation: granular invoice.create + AAL2. SECURITY DEFINER is required
-- because direct invoice mutation remains executive-only by policy.
create or replace function public.create_customer_invoice_draft(
  p_client_organization_id uuid,
  p_billing_contact_id uuid,
  p_due_date date,
  p_currency text,
  p_lines jsonb
) returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_org uuid;
  v_email text;
  v_invoice_id uuid;
  v_invoice_number text;
  v_total bigint := 0;
  v_line jsonb;
  v_description text;
  v_amount bigint;
  v_quantity numeric(12,2);
begin
  if auth.uid() is null then raise exception 'authentication_required'; end if;
  if not authority_private.session_has_aal2() then raise exception 'mfa_required'; end if;

  select organization_id into v_org
  from public.client_organizations
  where id = p_client_organization_id;
  if v_org is null then raise exception 'client_not_found'; end if;

  if not authority_private.has_effective_permission(
    v_org,
    'invoice.create'::public.permission_action,
    null,
    null
  ) then
    raise exception 'insufficient_invoice_create_permission';
  end if;

  select email into v_email
  from public.contacts
  where id = p_billing_contact_id
    and organization_id = v_org
    and client_id = p_client_organization_id;
  if v_email is null or position('@' in v_email) <= 1 then raise exception 'billing_email_required'; end if;

  if p_currency is null or p_currency !~ '^[A-Z]{3}$' then raise exception 'invalid_currency'; end if;
  if p_lines is null or jsonb_typeof(p_lines) <> 'array' or jsonb_array_length(p_lines) = 0 then
    raise exception 'invoice_lines_required';
  end if;
  if jsonb_array_length(p_lines) > 20 then raise exception 'too_many_invoice_lines'; end if;

  for v_line in select value from jsonb_array_elements(p_lines)
  loop
    v_description := btrim(coalesce(v_line->>'description',''));
    v_amount := coalesce((v_line->>'amount_minor')::bigint, 0);
    v_quantity := coalesce((v_line->>'quantity')::numeric, 1);
    if v_description = '' or v_amount <= 0 or v_quantity <= 0 then raise exception 'invalid_invoice_line'; end if;
    v_total := v_total + v_amount;
  end loop;

  v_invoice_id := gen_random_uuid();
  v_invoice_number := 'KSP-' || to_char(current_date, 'YYYYMMDD') || '-' || upper(substr(replace(v_invoice_id::text, '-', ''), 1, 8));

  insert into public.customer_invoices (
    id, organization_id, client_organization_id, billing_contact_id, billing_email,
    invoice_number, due_date, amount_minor, currency, status, created_by
  ) values (
    v_invoice_id, v_org, p_client_organization_id, p_billing_contact_id, lower(v_email),
    v_invoice_number, p_due_date, v_total, p_currency::char(3), 'draft', auth.uid()
  );

  for v_line in select value from jsonb_array_elements(p_lines)
  loop
    insert into public.invoice_lines (
      organization_id, invoice_id, description, quantity, amount_minor, currency
    ) values (
      v_org,
      v_invoice_id,
      btrim(v_line->>'description'),
      coalesce((v_line->>'quantity')::numeric, 1),
      (v_line->>'amount_minor')::bigint,
      p_currency::char(3)
    );
  end loop;

  insert into public.audit_events (
    organization_id, actor_id, action, target_table, target_id, classification, metadata
  ) values (
    v_org, auth.uid(), 'invoice.create', 'customer_invoices', v_invoice_id, 'restricted',
    jsonb_build_object('amount_minor', v_total, 'currency', p_currency)
  );

  return v_invoice_id;
end;
$$;
revoke all on function public.create_customer_invoice_draft(uuid,uuid,date,text,jsonb) from public, anon;
grant execute on function public.create_customer_invoice_draft(uuid,uuid,date,text,jsonb) to authenticated;

-- Approval/issue transition: amount ceiling + AAL2 + separation of duties for
-- non-executives. Executives may approve their own draft but the event is still
-- explicitly audited with self_approval=true.
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
  if v_invoice.status not in ('draft','approved','issued') then raise exception 'invoice_not_issuable'; end if;

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

  if v_invoice.status <> 'issued' then
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
  end if;

  return v_invoice;
end;
$$;
revoke all on function public.issue_customer_invoice(uuid) from public, anon;
grant execute on function public.issue_customer_invoice(uuid) to authenticated;

-- Journal posting now uses the same deny-aware, AAL2, amount-ceiling path.
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
  v_debit bigint;
  v_credit bigint;
  v_lines int;
  v_currency_count int;
  v_currency text;
begin
  if auth.uid() is null then raise exception 'authentication_required'; end if;
  if p_actor_id is distinct from auth.uid() then raise exception 'actor_mismatch'; end if;

  select organization_id, status into v_org, v_status
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
      and current_date between ap.period_start and ap.period_end
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
      'currency', v_currency
    )
  );

  return p_entry_id;
end;
$$;
revoke all on function public.post_journal_entry(uuid,uuid,text) from public, anon;
grant execute on function public.post_journal_entry(uuid,uuid,text) to authenticated;
