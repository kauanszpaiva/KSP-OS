'use client';

import { Button } from '@ksp/ui';
import { Panel } from '../../_components/ui';
import type { Invoice, ClientRef } from '../../data';
import { draftInvoiceSafely, issueInvoiceSafely, markInvoicePaidSafely } from '../actions';

export function InvoicesConsole({ invoices, clients }: { invoices: Invoice[], clients: ClientRef[] }) {
  return (
    <div className="space-y-6">
      <Panel className="p-6">
        <div className="mb-4">
          <h3 className="text-lg font-medium">Draft New Invoice</h3>
          <p className="mt-1 text-[12.5px] text-ink-3">Issuing records the invoice internally. KSP OS will not invent a billing email or send an external message without a verified recipient.</p>
        </div>
        <form action={draftInvoiceSafely} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Client</label>
            <select name="client_id" className="w-full rounded-md border border-line p-2 text-sm" required>
              {clients.map(c => <option key={c.id} value={c.id}>{c.displayName}</option>)}
            </select>
          </div>
          <Button type="submit">Draft Invoice</Button>
        </form>
      </Panel>

      <Panel className="p-6">
        <h3 className="text-lg font-medium mb-4">Invoices</h3>
        {invoices.length === 0 ? (
          <p className="text-sm text-ink-3">No invoices yet.</p>
        ) : (
          <div className="space-y-4">
            {invoices.map(inv => (
              <div key={inv.id} className="border border-line rounded-lg p-4 flex justify-between items-center">
                <div>
                  <p className="font-medium">{inv.clientName || 'Unknown Client'}</p>
                  <p className="text-sm text-ink-3">Amount: {(inv.amount_minor / 100).toLocaleString('en-US', { style: 'currency', currency: 'USD' })} | Balance: {(inv.balance_minor / 100).toLocaleString('en-US', { style: 'currency', currency: 'USD' })}</p>
                  <p className="text-sm text-ink-3">Status: {inv.status}</p>
                </div>
                <div className="flex gap-2">
                  {inv.status === 'draft' && (
                    <form action={issueInvoiceSafely}>
                      <input type="hidden" name="invoice_id" value={inv.id} />
                      <Button type="submit" variant="primary">Issue Invoice</Button>
                    </form>
                  )}
                  {inv.status === 'active' && (
                    <form action={markInvoicePaidSafely}>
                      <input type="hidden" name="invoice_id" value={inv.id} />
                      <Button type="submit">Mark Paid</Button>
                    </form>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </Panel>
    </div>
  );
}
