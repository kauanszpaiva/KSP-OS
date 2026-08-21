'use server';

import { revalidatePath } from 'next/cache';
import { getAuthContext, isExecutive, type AuthContext } from '@ksp/auth';
import type { SupabaseClient } from '@ksp/database';
import { sendInvoiceIssued } from '@ksp/notifications';
import { getServerSupabase } from '../../../lib/supabase';

export interface InvoiceActionResult {
  ok: boolean;
  message?: string;
  error?: string;
}

interface InvoiceGate {
  supabase: SupabaseClient;
  ctx: AuthContext;
}

async function invoiceGate(): Promise<InvoiceGate> {
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

function moneyToMinor(raw: string): number {
  const normalized = raw.replace(/[$,\s]/g, '');
  if (!/^\d+(\.\d{1,2})?$/.test(normalized)) throw new Error('Enter a valid positive amount with at most two decimals.');
  const [whole, decimals = ''] = normalized.split('.');
  const minor = Number(whole) * 100 + Number(decimals.padEnd(2, '0'));
  if (!Number.isSafeInteger(minor) || minor <= 0) throw new Error('Invoice amounts must be greater than zero.');
  return minor;
}

async function audit(supabase: SupabaseClient, ctx: AuthContext, action: string, table: string, id: string, summary: string) {
  const { error } = await (supabase as any).from('audit_events').insert({
    organization_id: ctx.organizationId,
    actor_id: ctx.user.id,
    action,
    target_table: table,
    target_id: id,
    classification: 'restricted',
    metadata: { summary }
  });
  return !error;
}

export async function createInvoiceDraft(_previous: InvoiceActionResult, form: FormData): Promise<InvoiceActionResult> {
  try {
    const { supabase, ctx } = await invoiceGate();
    const db = supabase as any;
    const clientId = text(form, 'client_id', true);
    const billingContactId = text(form, 'billing_contact_id', true);
    const dueDate = text(form, 'due_date') || null;
    const currency = (text(form, 'currency') || 'USD').toUpperCase();
    if (!/^[A-Z]{3}$/.test(currency)) throw new Error('Currency must be a three-letter ISO code.');

    const descriptions = form.getAll('line_description').map((value) => String(value).trim());
    const amounts = form.getAll('line_amount').map((value) => String(value).trim());
    if (descriptions.length !== amounts.length || descriptions.length === 0) throw new Error('Add at least one invoice line.');

    const lines = descriptions
      .map((description, index) => ({ description, amount_minor: amounts[index] ? moneyToMinor(amounts[index] as string) : 0, quantity: 1 }))
      .filter((line) => line.description && line.amount_minor > 0);
    if (lines.length === 0) throw new Error('Add at least one complete invoice line.');
    if (lines.length > 20) throw new Error('An invoice can contain at most 20 lines in this workflow.');

    const { data: ready, error: readyError } = await db.rpc('invoice_schema_ready');
    if (readyError || ready !== true) return { ok: false, error: 'Invoice system migration is not active in this environment yet.' };

    const { data: invoiceId, error } = await db.rpc('create_customer_invoice_draft', {
      p_client_organization_id: clientId,
      p_billing_contact_id: billingContactId,
      p_due_date: dueDate,
      p_currency: currency,
      p_lines: lines
    });
    if (error || !invoiceId) return { ok: false, error: error?.message || 'Could not create the invoice draft.' };

    const audited = await audit(supabase, ctx, 'finance.invoice_drafted', 'customer_invoices', invoiceId, 'Customer invoice draft created');
    revalidatePath('/finance');
    return audited
      ? { ok: true, message: 'Invoice draft created. Review it below, then issue and email it.' }
      : { ok: true, message: 'Invoice draft created, but its audit event needs review.' };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : 'Could not create the invoice.' };
  }
}

export async function issueInvoiceAndEmail(_previous: InvoiceActionResult, form: FormData): Promise<InvoiceActionResult> {
  try {
    const { supabase, ctx } = await invoiceGate();
    const db = supabase as any;
    const invoiceId = text(form, 'invoice_id', true);

    const { data: invoice, error: invoiceError } = await db
      .from('customer_invoices')
      .select('id, organization_id, client_organization_id, invoice_number, amount_minor, currency, status, billing_email, due_date, issue_date, issued_at')
      .eq('id', invoiceId)
      .eq('organization_id', ctx.organizationId)
      .maybeSingle();
    if (invoiceError || !invoice) return { ok: false, error: invoiceError?.message || 'Invoice not found.' };
    if (!['draft', 'approved', 'issued'].includes(invoice.status)) return { ok: false, error: `Invoice cannot be emailed from status ${invoice.status}.` };
    if (!invoice.billing_email) return { ok: false, error: 'This invoice has no billing email.' };

    const [{ data: client }, { data: lines, error: linesError }, { data: existingDelivery }] = await Promise.all([
      db.from('client_organizations').select('display_name').eq('id', invoice.client_organization_id).eq('organization_id', ctx.organizationId).maybeSingle(),
      db.from('invoice_lines').select('description, amount_minor').eq('invoice_id', invoiceId).eq('organization_id', ctx.organizationId).order('id'),
      db.from('invoice_email_deliveries').select('*').eq('invoice_id', invoiceId).eq('event_type', 'issued').maybeSingle()
    ]);
    if (linesError || !lines?.length) return { ok: false, error: linesError?.message || 'Invoice has no line items.' };
    if (existingDelivery?.status === 'sent' || existingDelivery?.status === 'delivered') {
      return { ok: true, message: `Invoice ${invoice.invoice_number} was already emailed to ${existingDelivery.recipient_email}.` };
    }

    const now = new Date().toISOString();
    const issueDate = invoice.issue_date || now.slice(0, 10);
    if (invoice.status !== 'issued') {
      const { error: issueError } = await db.from('customer_invoices')
        .update({ status: 'issued', issue_date: issueDate, issued_at: now })
        .eq('id', invoiceId)
        .eq('organization_id', ctx.organizationId)
        .in('status', ['draft', 'approved']);
      if (issueError) return { ok: false, error: issueError.message };
    }

    const idempotencyKey = existingDelivery?.idempotency_key || `invoice-issued/${invoiceId}`;
    const attempts = Number(existingDelivery?.attempt_count ?? 0) + 1;
    const deliveryPayload = {
      organization_id: ctx.organizationId,
      invoice_id: invoiceId,
      event_type: 'issued',
      recipient_email: invoice.billing_email,
      provider: 'resend',
      status: 'pending',
      idempotency_key: idempotencyKey,
      attempt_count: attempts,
      last_error: null,
      updated_at: now
    };

    const { data: delivery, error: deliveryError } = existingDelivery
      ? await db.from('invoice_email_deliveries').update(deliveryPayload).eq('id', existingDelivery.id).select('id').single()
      : await db.from('invoice_email_deliveries').insert(deliveryPayload).select('id').single();
    if (deliveryError || !delivery) return { ok: false, error: deliveryError?.message || 'Could not create the invoice delivery record.' };

    const portalBase = process.env.NEXT_PUBLIC_PORTAL_BASE_URL?.trim().replace(/\/$/, '');
    const result = await sendInvoiceIssued({
      to: invoice.billing_email,
      clientName: client?.display_name || 'Client',
      invoiceNumber: invoice.invoice_number,
      amountMinor: Number(invoice.amount_minor),
      currency: invoice.currency,
      invoiceId,
      dueDate: invoice.due_date,
      lines: (lines as Array<{ description: string; amount_minor: number }>).map((line) => ({
        description: line.description,
        amountMinor: Number(line.amount_minor)
      })),
      invoiceUrl: portalBase ? `${portalBase}/invoices/${invoiceId}` : null,
      idempotencyKey
    });

    if (!result.ok) {
      await db.from('invoice_email_deliveries').update({
        status: 'failed',
        last_error: result.error || 'Provider delivery failed.',
        updated_at: new Date().toISOString()
      }).eq('id', delivery.id);
      await audit(supabase, ctx, 'finance.invoice_email_failed', 'customer_invoices', invoiceId, 'Invoice issued but email delivery failed');
      revalidatePath('/finance');
      return { ok: false, error: `Invoice ${invoice.invoice_number} was issued, but email delivery failed: ${result.error || 'provider error'}. Use Retry Email after configuration is corrected.` };
    }

    await db.from('invoice_email_deliveries').update({
      status: 'sent',
      provider_message_id: result.providerMessageId || null,
      sent_at: new Date().toISOString(),
      last_error: null,
      updated_at: new Date().toISOString()
    }).eq('id', delivery.id);
    await audit(supabase, ctx, 'finance.invoice_issued_emailed', 'customer_invoices', invoiceId, `Invoice emailed to billing recipient ${invoice.billing_email}`);
    revalidatePath('/finance');
    return { ok: true, message: `Invoice ${invoice.invoice_number} was issued and emailed to ${invoice.billing_email}.` };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : 'Could not issue and email the invoice.' };
  }
}
