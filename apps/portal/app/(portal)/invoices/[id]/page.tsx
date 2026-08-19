import { requirePortalSession } from '../../../../lib/session';
import { createServerClient } from '@ksp/database';
import { Card, Badge, Icon, Button } from '@ksp/ui';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { cookies } from 'next/headers';

export const dynamic = 'force-dynamic';

function formatCurrency(minor: number, currency: string) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
  }).format(minor / 100);
}

function StatusBadge({ status }: { status: string }) {
  if (status === 'paid') return <Badge tone="good">Paid</Badge>;
  if (status === 'overdue') return <Badge tone="risk">Overdue</Badge>;
  if (status === 'partially_paid') return <Badge tone="warn">Partially Paid</Badge>;
  if (status === 'issued') return <Badge tone="brand">Issued</Badge>;
  return <Badge tone="neutral">{status}</Badge>;
}

export default async function InvoiceDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const ctx = await requirePortalSession();
  const cookieStore = await cookies();
  const db = createServerClient(cookieStore as any);

  const { data: invoice, error } = await db!
    .from('customer_invoices')
    .select('*, projects(name), invoice_lines(*), customer_payments(*)')
    .eq('id', id)
    .single();

  if (error || !invoice) {
    notFound();
  }

  const amountPaid = (invoice.customer_payments as any[])?.reduce((sum, p) => sum + p.amount_minor, 0) || 0;
  const amountDue = invoice.amount_minor - amountPaid;

  return (
    <div className="flex flex-col gap-6">
      <Link href="/invoices" className="flex items-center gap-2 text-[13px] font-medium text-ink-3 transition-colors hover:text-ink">
        &larr; Back to Invoices
      </Link>

      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-ink">Invoice {invoice.invoice_number}</h1>
          <p className="mt-1 text-sm text-ink-3">{(invoice.projects as any)?.name || 'General Billing'}</p>
          <div className="mt-2 flex items-center gap-2">
            <StatusBadge status={invoice.status} />
            <span className="text-[13px] text-ink-3">
              Issued: {invoice.issue_date || 'N/A'} {invoice.due_date && `• Due: ${invoice.due_date}`}
            </span>
          </div>
        </div>
        <div className="flex gap-2">
          {invoice.url && (
            <Button variant="secondary">
              <a href={invoice.url} target="_blank" rel="noreferrer" className="flex items-center">
                <Icon name="content" className="mr-2 h-4 w-4" />
                Download PDF
              </a>
            </Button>
          )}
          <Button variant="secondary">
            <a href={`/invoices/${invoice.id}/print`} target="_blank" rel="noreferrer" className="flex items-center">
              <Icon name="content" className="mr-2 h-4 w-4" />
              Print
            </a>
          </Button>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        <div className="md:col-span-2 flex flex-col gap-6">
          <Card className="flex flex-col overflow-hidden">
            <div className="border-b border-line bg-surface-2 px-4 py-3">
              <h3 className="text-[13px] font-semibold text-ink">Line Items</h3>
            </div>
            <div className="flex flex-col divide-y divide-line">
              {(invoice.invoice_lines as any[])?.length ? (
                (invoice.invoice_lines as any[]).map((line) => (
                  <div key={line.id} className="flex flex-col gap-2 p-4 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <p className="text-[14px] font-medium text-ink">{line.description}</p>
                      <p className="text-[12px] text-ink-3">Qty: {line.quantity}</p>
                    </div>
                    <p className="text-[14px] font-semibold text-ink">{formatCurrency(line.amount_minor, line.currency)}</p>
                  </div>
                ))
              ) : (
                <div className="p-4 text-[13px] text-ink-3">No line items found.</div>
              )}
            </div>
          </Card>

          {(invoice.customer_payments as any[]) && (invoice.customer_payments as any[]).length > 0 && (
            <Card className="flex flex-col overflow-hidden">
              <div className="border-b border-line bg-surface-2 px-4 py-3">
                <h3 className="text-[13px] font-semibold text-ink">Payment History</h3>
              </div>
              <div className="flex flex-col divide-y divide-line">
                {(invoice.customer_payments as any[]).map((payment) => (
                  <div key={payment.id} className="flex items-center justify-between p-4">
                    <div>
                      <p className="text-[13px] font-medium text-ink">{payment.payment_date}</p>
                      <p className="text-[12px] text-ink-3 capitalize">{payment.status}</p>
                    </div>
                    <div className="flex items-center gap-4">
                      <p className="text-[14px] font-medium text-ink">{formatCurrency(payment.amount_minor, payment.currency)}</p>
                      {payment.receipt_url && (
                        <a href={payment.receipt_url} target="_blank" rel="noreferrer" className="text-[13px] text-brand hover:underline">
                          Receipt
                        </a>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          )}
        </div>

        <div className="flex flex-col gap-6">
          <Card className="flex flex-col p-4">
            <h3 className="text-[13px] font-semibold text-ink">Summary</h3>
            <div className="mt-4 flex flex-col gap-3 text-[14px]">
              <div className="flex justify-between">
                <span className="text-ink-2">Total Amount</span>
                <span className="font-medium text-ink">{formatCurrency(invoice.amount_minor, invoice.currency)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-ink-2">Amount Paid</span>
                <span className="font-medium text-ink">{formatCurrency(amountPaid, invoice.currency)}</span>
              </div>
              <div className="my-1 h-px w-full bg-line" />
              <div className="flex justify-between font-semibold">
                <span className="text-ink">Amount Due</span>
                <span className="text-ink">{formatCurrency(amountDue, invoice.currency)}</span>
              </div>
            </div>

            {amountDue > 0 && (
              <div className="mt-6 rounded-lg bg-surface-2 p-3 text-[12px] text-ink-3 text-center">
                Payment options are managed externally according to your contract terms.
              </div>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}
