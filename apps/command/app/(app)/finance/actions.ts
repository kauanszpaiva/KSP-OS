'use server';

import { revalidatePath } from 'next/cache';
import { getAuthContext, isExecutive, type AuthContext } from '@ksp/auth';
import type { SupabaseClient } from '@ksp/database';
import { getServerSupabase } from '../../../lib/supabase';

interface FinanceGate {
  supabase: SupabaseClient;
  ctx: AuthContext;
}

async function financeGate(): Promise<FinanceGate> {
  const supabase = await getServerSupabase();
  if (!supabase) throw new Error('Finance is not configured.');
  const ctx = await getAuthContext(supabase);
  if (!ctx || !isExecutive(ctx)) throw new Error('Executive finance access required.');
  return { supabase, ctx };
}

function text(form: FormData, key: string, required = false): string {
  const value = String(form.get(key) ?? '').trim();
  if (required && !value) throw new Error(`${key} is required.`);
  return value;
}

function currency(form: FormData, key = 'currency'): string {
  const value = text(form, key, true).toUpperCase();
  if (!/^[A-Z]{3}$/.test(value)) throw new Error('Currency must be a three-letter ISO code.');
  return value;
}

function moneyToMinor(raw: string, { positiveOnly = false }: { positiveOnly?: boolean } = {}): number {
  const normalized = raw.trim();
  if (!/^-?\d+(\.\d{1,2})?$/.test(normalized)) throw new Error('Enter a valid money amount with at most two decimals.');
  const negative = normalized.startsWith('-');
  const unsigned = negative ? normalized.slice(1) : normalized;
  const [whole, decimals = ''] = unsigned.split('.');
  const minor = Number(whole) * 100 + Number(decimals.padEnd(2, '0'));
  const signed = negative ? -minor : minor;
  if (!Number.isSafeInteger(signed)) throw new Error('Amount is outside the supported range.');
  if (positiveOnly && signed <= 0) throw new Error('Amount must be greater than zero.');
  return signed;
}

async function audit(supabase: SupabaseClient, ctx: AuthContext, action: string, table: string, id: string, summary: string) {
  const { error } = await supabase.from('audit_events').insert({
    organization_id: ctx.organizationId,
    actor_id: ctx.user.id,
    action,
    target_table: table,
    target_id: id,
    classification: 'restricted',
    metadata: { summary }
  });
  if (error) throw new Error('The finance change was saved but its audit record could not be written. Stop and review before continuing.');
}

export async function createFinancialAccount(form: FormData) {
  const { supabase, ctx } = await financeGate();
  const name = text(form, 'name', true);
  const accountKind = text(form, 'account_kind', true);
  if (!['bank', 'cash', 'card', 'processor', 'wallet', 'clearing', 'loan'].includes(accountKind)) throw new Error('Invalid account type.');
  const accountCurrency = currency(form);
  const openingRaw = text(form, 'opening_balance');
  const openingBalanceMinor = openingRaw ? moneyToMinor(openingRaw) : null;
  const openingBalanceDate = text(form, 'opening_balance_date') || null;
  if (openingBalanceDate && openingBalanceMinor == null) throw new Error('Opening balance date requires an opening balance.');

  const { data, error } = await supabase.from('financial_accounts').insert({
    organization_id: ctx.organizationId,
    name,
    account_kind: accountKind,
    institution_name: text(form, 'institution_name') || null,
    currency: accountCurrency,
    opening_balance_minor: openingBalanceMinor,
    opening_balance_date: openingBalanceDate,
    // This is a manual founder-entered value until a statement/import explicitly proves another source.
    balance_source: 'manual',
    created_by: ctx.user.id
  }).select('id').single();
  if (error || !data) throw new Error(error?.message || 'Could not create the financial account.');
  await audit(supabase, ctx, 'finance.account_created', 'financial_accounts', data.id, `Financial account created: ${name}`);
  revalidatePath('/finance');
}

export async function createCashTransaction(form: FormData) {
  const { supabase, ctx } = await financeGate();
  const accountId = text(form, 'financial_account_id', true);
  const direction = text(form, 'direction', true);
  if (!['inflow', 'outflow'].includes(direction)) throw new Error('Invalid cash direction.');
  const amountMinor = moneyToMinor(text(form, 'amount', true), { positiveOnly: true });

  const { data: account } = await supabase.from('financial_accounts').select('id, currency').eq('id', accountId).eq('organization_id', ctx.organizationId).maybeSingle();
  if (!account) throw new Error('Financial account not found or inaccessible.');

  const { data, error } = await supabase.from('cash_transactions').insert({
    organization_id: ctx.organizationId,
    financial_account_id: accountId,
    occurred_on: text(form, 'occurred_on', true),
    description: text(form, 'description', true),
    direction,
    amount_minor: amountMinor,
    currency: account.currency,
    source: 'manual',
    vendor_name: text(form, 'vendor_name') || null,
    external_reference: text(form, 'external_reference') || null,
    evidence_reference: text(form, 'evidence_reference') || null,
    project_id: text(form, 'project_id') || null,
    client_id: text(form, 'client_id') || null,
    created_by: ctx.user.id
  }).select('id').single();
  if (error || !data) throw new Error(error?.message || 'Could not record the cash transaction.');
  await audit(supabase, ctx, 'finance.cash_transaction_created', 'cash_transactions', data.id, 'Cash transaction recorded');
  revalidatePath('/finance');
}

export async function createReconciliationStatement(form: FormData) {
  const { supabase, ctx } = await financeGate();
  const accountId = text(form, 'financial_account_id', true);
  const endingBalanceMinor = moneyToMinor(text(form, 'ending_balance', true));
  const { data: account } = await supabase.from('financial_accounts').select('id, currency').eq('id', accountId).eq('organization_id', ctx.organizationId).maybeSingle();
  if (!account) throw new Error('Financial account not found or inaccessible.');

  const { data, error } = await supabase.from('reconciliation_statements').insert({
    organization_id: ctx.organizationId,
    financial_account_id: accountId,
    statement_end_date: text(form, 'statement_end_date', true),
    ending_balance_minor: endingBalanceMinor,
    currency: account.currency,
    source: 'statement',
    evidence_reference: text(form, 'evidence_reference') || null,
    created_by: ctx.user.id
  }).select('id').single();
  if (error || !data) throw new Error(error?.message || 'Could not save the reconciliation statement.');
  await audit(supabase, ctx, 'finance.reconciliation_statement_created', 'reconciliation_statements', data.id, 'Reconciliation statement added');
  revalidatePath('/finance');
}

export async function reconcileCashStatement(form: FormData) {
  const { supabase, ctx } = await financeGate();
  const statementId = text(form, 'statement_id', true);
  const { error } = await supabase.rpc('reconcile_cash_statement', {
    p_statement_id: statementId,
    p_actor_id: ctx.user.id
  });
  if (error) {
    const message = error.message.includes('statement_does_not_reconcile')
      ? 'Statement does not match the book balance. Review missing or incorrect transactions first.'
      : error.message.includes('opening_balance_required_before_reconciliation')
        ? 'Set a verified opening balance before reconciling this account.'
        : error.message;
    throw new Error(message);
  }
  revalidatePath('/finance');
}

// Invoice safety bridge: these actions preserve the current simple invoice UI but
// never invent a billing recipient and never send an external email implicitly.
export async function draftInvoiceSafely(form: FormData) {
  const { supabase, ctx } = await financeGate();
  const clientId = text(form, 'client_id', true);
  const { data: client } = await supabase.from('client_organizations').select('id').eq('id', clientId).eq('organization_id', ctx.organizationId).maybeSingle();
  if (!client) throw new Error('Client not found in the active organization.');

  const { data, error } = await supabase.from('invoices').insert({
    organization_id: ctx.organizationId,
    client_id: clientId,
    status: 'draft'
  }).select('id').single();
  if (error || !data) throw new Error(error?.message || 'Could not draft the invoice.');
  await audit(supabase, ctx, 'finance.invoice_drafted', 'invoices', data.id, 'Invoice drafted');
  revalidatePath('/finance');
}

export async function issueInvoiceSafely(form: FormData) {
  const { supabase, ctx } = await financeGate();
  const id = text(form, 'invoice_id', true);
  const { data, error } = await supabase.from('invoices')
    .update({ status: 'active', issued_at: new Date().toISOString() })
    .eq('id', id)
    .eq('organization_id', ctx.organizationId)
    .eq('status', 'draft')
    .select('id')
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) throw new Error('Invoice not found in draft state for this organization.');
  await audit(supabase, ctx, 'finance.invoice_issued', 'invoices', id, 'Invoice issued internally; no email sent without a verified billing recipient');
  revalidatePath('/finance');
}

export async function markInvoicePaidSafely(form: FormData) {
  const { supabase, ctx } = await financeGate();
  const id = text(form, 'invoice_id', true);
  const { data, error } = await supabase.from('invoices')
    .update({ status: 'posted', balance_minor: 0 })
    .eq('id', id)
    .eq('organization_id', ctx.organizationId)
    .eq('status', 'active')
    .select('id')
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) throw new Error('Invoice not found in active state for this organization.');
  await audit(supabase, ctx, 'finance.invoice_marked_paid', 'invoices', id, 'Invoice marked paid');
  revalidatePath('/finance');
}
