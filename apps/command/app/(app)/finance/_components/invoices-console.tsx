'use client';

import { useActionState, useMemo, useState } from 'react';
import { createInvoiceDraft, issueInvoiceAndEmail, type InvoiceActionResult } from '../invoice-actions';
import type { InvoiceConsoleData, InvoiceView } from '../invoice-data';

const initial: InvoiceActionResult = { ok: false };
const field = 'min-w-0 w-full rounded-lg border border-line-2 bg-surface px-3 py-2.5 text-[13px] text-ink placeholder:text-ink-4 transition-colors focus:border-brand focus:outline-none focus:shadow-focus';
const label = 'mb-1 block text-[10.5px] font-semibold uppercase tracking-[0.08em] text-ink-3';
const secondaryButton = 'rounded-lg border border-line-2 bg-surface px-3 py-2.5 text-[12.5px] font-semibold text-ink-2 transition-colors hover:border-brand hover:text-brand disabled:cursor-not-allowed disabled:opacity-50';
const primaryButton = 'rounded-lg bg-brand px-4 py-2.5 text-[12.5px] font-semibold text-on-brand shadow-card transition-colors hover:bg-brand-strong disabled:cursor-not-allowed disabled:opacity-50';

function money(minor: number, currency = 'USD') {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(minor / 100);
}

function ResultMessage({ state }: { state: InvoiceActionResult }) {
  if (state.ok && state.message) return <p role="status" className="text-[12.5px] leading-snug text-good">{state.message}</p>;
  if (!state.ok && state.error) return <p role="alert" className="text-[12.5px] leading-snug text-risk">{state.error}</p>;
  return null;
}

function CreateInvoiceForm({ data }: { data: InvoiceConsoleData }) {
  const [state, action, pending] = useActionState(createInvoiceDraft, initial);
  const recipients = useMemo(() => data.clients.flatMap((client) => client.contacts.map((contact) => ({
    key: `${client.id}|${contact.id}`,
    clientId: client.id,
    contactId: contact.id,
    label: `${client.displayName} — ${contact.name} <${contact.email}>`
  }))), [data.clients]);
  const [recipientKey, setRecipientKey] = useState(recipients[0]?.key ?? '');
  const [lines, setLines] = useState([{ key: 1 }]);
  const selected = recipients.find((recipient) => recipient.key === recipientKey);

  if (!data.schemaReady) {
    return (
      <div className="rounded-xl border border-warn/30 bg-warn/5 p-4">
        <p className="text-[13px] font-semibold text-ink">Invoice database is not released yet.</p>
        <p className="mt-1 text-[12.5px] leading-snug text-ink-3">The Finance page stays usable, but invoice creation is blocked until the reviewed customer-invoice migration is applied.</p>
      </div>
    );
  }

  if (recipients.length === 0) {
    return (
      <div className="rounded-xl border border-line bg-surface-2 p-4">
        <p className="text-[13px] font-semibold text-ink">No client billing email is available.</p>
        <p className="mt-1 text-[12.5px] leading-snug text-ink-3">Add an email to a contact linked to the client before creating an invoice. KSP OS will not guess a recipient address.</p>
      </div>
    );
  }

  return (
    <form action={action} className="min-w-0 space-y-4 rounded-xl border border-line bg-surface p-3.5 shadow-card sm:p-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <h3 className="text-[15px] font-semibold text-ink">Create invoice</h3>
          <p className="mt-0.5 text-[12px] leading-snug text-ink-3">Choose the billing contact, add the work, save the draft, then issue and email it.</p>
        </div>
        <span className={`inline-flex w-fit shrink-0 items-center gap-1.5 rounded-full bg-surface-2 px-2.5 py-1 text-[11px] font-medium ${data.emailConfigured ? 'text-good' : 'text-warn'}`}>
          <span className={`h-1.5 w-1.5 rounded-full ${data.emailConfigured ? 'bg-good' : 'bg-warn'}`} />
          {data.emailConfigured ? 'Email ready' : 'Email key missing'}
        </span>
      </div>

      <input type="hidden" name="client_id" value={selected?.clientId ?? ''} />
      <input type="hidden" name="billing_contact_id" value={selected?.contactId ?? ''} />
      <input type="hidden" name="currency" value="USD" />

      <div className="grid min-w-0 gap-3 md:grid-cols-[minmax(0,1fr)_180px]">
        <label className="min-w-0">
          <span className={label}>Client & billing recipient</span>
          <select className={field} value={recipientKey} onChange={(event) => setRecipientKey(event.target.value)} required>
            {recipients.map((recipient) => <option key={recipient.key} value={recipient.key}>{recipient.label}</option>)}
          </select>
        </label>
        <label className="min-w-0">
          <span className={label}>Due date</span>
          <input className={field} type="date" name="due_date" />
        </label>
      </div>

      <div className="min-w-0 space-y-2">
        <div className="flex items-center justify-between gap-3">
          <span className={label}>Invoice lines</span>
          <button type="button" className="shrink-0 text-[12px] font-semibold text-brand hover:underline disabled:opacity-50" disabled={lines.length >= 20} onClick={() => setLines((current) => [...current, { key: Math.max(...current.map((line) => line.key)) + 1 }])}>+ Add line</button>
        </div>
        {lines.map((line, index) => (
          <div key={line.key} className="grid min-w-0 gap-2 sm:grid-cols-[minmax(0,1fr)_150px_auto]">
            <input className={field} name="line_description" placeholder={index === 0 ? 'Service or deliverable' : 'Additional line'} required />
            <input className={field} name="line_amount" inputMode="decimal" placeholder="0.00" aria-label={`Line ${index + 1} amount`} required />
            <button type="button" className={`${secondaryButton} w-full sm:w-auto`} disabled={lines.length === 1} onClick={() => setLines((current) => current.filter((item) => item.key !== line.key))}>Remove</button>
          </div>
        ))}
      </div>

      <ResultMessage state={state} />
      <div className="flex flex-col-reverse gap-2.5 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-[11.5px] leading-snug text-ink-4">Nothing is emailed until you explicitly issue the draft.</p>
        <button type="submit" className={`${primaryButton} w-full sm:w-auto`} disabled={pending || !selected}>{pending ? 'Creating…' : 'Create draft'}</button>
      </div>
    </form>
  );
}

function IssueEmailForm({ invoice, emailConfigured }: { invoice: InvoiceView; emailConfigured: boolean }) {
  const [state, action, pending] = useActionState(issueInvoiceAndEmail, initial);
  const delivered = invoice.delivery?.status === 'sent' || invoice.delivery?.status === 'delivered';
  const failed = invoice.delivery?.status === 'failed';
  if (delivered) return <span className="text-[11.5px] font-medium text-good">Emailed {invoice.delivery?.recipient_email}</span>;
  return (
    <form action={action} className="w-full space-y-1.5 sm:w-auto">
      <input type="hidden" name="invoice_id" value={invoice.id} />
      <button type="submit" className={`${primaryButton} w-full sm:w-auto`} disabled={pending || !emailConfigured}>{pending ? 'Sending…' : failed || invoice.status === 'issued' ? 'Retry email' : 'Issue & email'}</button>
      {!emailConfigured && <p className="text-[11px] leading-snug text-warn sm:max-w-[220px]">Invoice email delivery is not configured in this deployment.</p>}
      <ResultMessage state={state} />
    </form>
  );
}

function deliveryLabel(invoice: InvoiceView) {
  if (!invoice.delivery) return invoice.status === 'draft' ? 'Not sent' : 'Pending email';
  if (invoice.delivery.status === 'failed') return 'Email failed';
  if (invoice.delivery.status === 'sent') return 'Email sent';
  if (invoice.delivery.status === 'delivered') return 'Delivered';
  if (invoice.delivery.status === 'bounced') return 'Bounced';
  return 'Sending';
}

export function InvoicesConsole({ data }: { data: InvoiceConsoleData }) {
  return (
    <div className="min-w-0 space-y-5">
      {data.loadError && (
        <div className="rounded-xl border border-risk/30 bg-risk/5 px-4 py-3">
          <p className="text-[12.5px] font-medium text-risk">Invoice data warning</p>
          <p className="mt-0.5 text-[12px] leading-snug text-ink-3">{data.loadError}</p>
        </div>
      )}

      <CreateInvoiceForm data={data} />

      <div className="min-w-0">
        <div className="mb-2 flex items-end justify-between gap-3">
          <div>
            <h3 className="text-[13px] font-semibold text-ink">Invoices</h3>
            <p className="mt-0.5 text-[11.5px] text-ink-4">Draft → issue + email → delivery status.</p>
          </div>
          <span className="tnum shrink-0 text-[11.5px] text-ink-4">{data.invoices.length} total</span>
        </div>

        {!data.schemaReady ? (
          <div className="rounded-xl border border-dashed border-line-2 px-4 py-7 text-center text-[12.5px] text-ink-3">Invoice history will appear after the invoice migration is released.</div>
        ) : data.invoices.length === 0 ? (
          <div className="rounded-xl border border-dashed border-line-2 px-4 py-7 text-center text-[12.5px] text-ink-3">No invoices yet.</div>
        ) : (
          <div className="min-w-0 overflow-hidden rounded-xl border border-line bg-surface">
            <div className="hidden grid-cols-[130px_minmax(150px,1fr)_120px_120px_150px_minmax(180px,auto)] gap-3 border-b border-line bg-surface-2 px-4 py-2 text-[10.5px] font-semibold uppercase tracking-wide text-ink-4 lg:grid">
              <span>Invoice</span><span>Client</span><span>Amount</span><span>Status</span><span>Delivery</span><span>Actions</span>
            </div>
            {data.invoices.map((invoice) => (
              <div key={invoice.id} className="min-w-0 border-b border-line px-3.5 py-3.5 last:border-b-0 sm:px-4 lg:grid lg:grid-cols-[130px_minmax(150px,1fr)_120px_120px_150px_minmax(180px,auto)] lg:items-start lg:gap-3 lg:py-3">
                <div className="flex items-start justify-between gap-3 lg:block">
                  <div>
                    <p className="font-mono text-[12.5px] font-semibold text-ink">{invoice.invoice_number}</p>
                    <p className="mt-0.5 text-[11px] text-ink-4">Due {invoice.due_date || 'on receipt'}</p>
                  </div>
                  <p className="tnum shrink-0 text-[13px] font-semibold text-ink lg:hidden">{money(invoice.amount_minor, invoice.currency)}</p>
                </div>

                <div className="mt-3 min-w-0 lg:mt-0">
                  <p className="truncate text-[12.5px] font-medium text-ink">{invoice.clientName}</p>
                  <p className="mt-0.5 truncate text-[11px] text-ink-4">{invoice.billing_email || 'No billing email'}</p>
                  {invoice.lines.length > 0 && <p className="mt-1 line-clamp-2 text-[11px] leading-snug text-ink-3">{invoice.lines.map((line) => line.description).join(' · ')}</p>}
                </div>

                <p className="tnum hidden text-[12.5px] font-semibold text-ink lg:block">{money(invoice.amount_minor, invoice.currency)}</p>

                <div className="mt-3 grid grid-cols-2 gap-3 rounded-lg bg-surface-2 px-3 py-2.5 lg:mt-0 lg:contents">
                  <div>
                    <p className="text-[9.5px] font-semibold uppercase tracking-wide text-ink-4 lg:hidden">Status</p>
                    <p className="mt-0.5 text-[12px] font-medium capitalize text-ink-2 lg:mt-0">{invoice.status.replace(/_/g, ' ')}</p>
                  </div>
                  <div>
                    <p className="text-[9.5px] font-semibold uppercase tracking-wide text-ink-4 lg:hidden">Delivery</p>
                    <p className={`mt-0.5 text-[12px] font-medium lg:mt-0 ${invoice.delivery?.status === 'failed' || invoice.delivery?.status === 'bounced' ? 'text-risk' : invoice.delivery?.status === 'sent' || invoice.delivery?.status === 'delivered' ? 'text-good' : 'text-ink-3'}`}>{deliveryLabel(invoice)}</p>
                    {invoice.delivery?.last_error && <p className="mt-0.5 line-clamp-2 text-[10.5px] leading-snug text-risk">{invoice.delivery.last_error}</p>}
                  </div>
                </div>

                <div className="mt-3 flex w-full flex-wrap items-start gap-2 lg:mt-0 lg:w-auto">
                  {invoice.status !== 'paid' && <IssueEmailForm invoice={invoice} emailConfigured={data.emailConfigured} />}
                  {invoice.status === 'paid' && <span className="text-[11.5px] font-semibold text-good">Paid</span>}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
