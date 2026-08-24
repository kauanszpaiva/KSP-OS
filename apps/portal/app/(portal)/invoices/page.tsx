import { requirePortalSession } from '../../../lib/session';
import { createServerClient } from '@ksp/database';
import { Card, Badge, ShapeMark, cx } from '@ksp/ui';
import Link from 'next/link';
import { cookies } from 'next/headers';
import { ProgressiveList } from '../_components/progressive-list';

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

export default async function InvoicesPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const ctx = await requirePortalSession();
  const cookieStore = await cookies();
  const db = createServerClient(cookieStore as any);
  const params = await searchParams;
  const statusFilter = params.status || 'all';
  const clientOrganizationIds = [...new Set(ctx.memberships.map((membership) => membership.clientOrganizationId))];

  let query = db!
    .from('customer_invoices')
    .select('*, projects(name)')
    .in('client_organization_id', clientOrganizationIds)
    .order('created_at', { ascending: false });

  if (statusFilter === 'unpaid') {
    query = query.in('status', ['issued', 'overdue', 'partially_paid']);
  } else if (statusFilter === 'paid') {
    query = query.eq('status', 'paid');
  }

  const { data: invoices, error } = await query;

  if (error || !invoices) {
    return (
      <div className="flex min-w-0 flex-col gap-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-ink">Invoices</h1>
          <p className="mt-1 text-sm text-ink-3">Manage your billing and payments.</p>
        </div>
        <Card className="flex flex-col items-center justify-center py-16 text-center">
          <p className="text-[14px] font-medium text-ink">Unable to load invoices</p>
          <p className="mt-1 text-[13px] text-ink-3">Please try again later.</p>
        </Card>
      </div>
    );
  }

  const unpaidCount = invoices.filter((i: any) => ['issued', 'overdue', 'partially_paid'].includes(i.status)).length;
  const totalUnpaidMinor = invoices
    .filter((i: any) => ['issued', 'overdue', 'partially_paid'].includes(i.status))
    .reduce((sum: number, i: any) => sum + i.amount_minor, 0);

  return (
    <div className="flex min-w-0 flex-col gap-6">
      <div className="flex min-w-0 flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          <h1 className="text-2xl font-bold tracking-tight text-ink">Invoices</h1>
          <p className="mt-1 text-sm text-ink-3">Manage your billing and payments.</p>
        </div>
        {unpaidCount > 0 && (
          <div className="flex w-full flex-wrap items-center gap-4 rounded-xl border border-warn/30 bg-warn-tint px-4 py-3 sm:w-auto sm:flex-nowrap">
            <div className="min-w-0">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-warn">Total Due</p>
              <p className="break-words text-[18px] font-bold text-ink">{formatCurrency(totalUnpaidMinor, invoices[0]?.currency || 'USD')}</p>
            </div>
            <div className="hidden h-8 w-px bg-warn/30 sm:block" />
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-wider text-warn">Unpaid Invoices</p>
              <p className="text-[18px] font-bold text-ink">{unpaidCount}</p>
            </div>
          </div>
        )}
      </div>

      <div className="flex flex-wrap gap-2">
        <Link
          href="/invoices?status=all"
          className={cx(
            'rounded-full px-4 py-1.5 text-[13px] font-medium transition-colors',
            statusFilter === 'all' ? 'bg-ink text-canvas' : 'bg-surface text-ink-2 hover:bg-surface-2'
          )}
        >
          All
        </Link>
        <Link
          href="/invoices?status=unpaid"
          className={cx(
            'rounded-full px-4 py-1.5 text-[13px] font-medium transition-colors',
            statusFilter === 'unpaid' ? 'bg-ink text-canvas' : 'bg-surface text-ink-2 hover:bg-surface-2'
          )}
        >
          Unpaid
        </Link>
        <Link
          href="/invoices?status=paid"
          className={cx(
            'rounded-full px-4 py-1.5 text-[13px] font-medium transition-colors',
            statusFilter === 'paid' ? 'bg-ink text-canvas' : 'bg-surface text-ink-2 hover:bg-surface-2'
          )}
        >
          Paid
        </Link>
      </div>

      {invoices.length === 0 ? (
        <Card className="flex flex-col items-center justify-center py-16 text-center">
          <p className="text-[14px] font-medium text-ink">No invoices found</p>
          <p className="mt-1 text-[13px] text-ink-3">
            {statusFilter === 'all' ? 'You have no invoices yet.' : `You have no ${statusFilter} invoices.`}
          </p>
        </Card>
      ) : (
        <Card className="min-w-0 overflow-hidden">
          <ProgressiveList initial={5}>{invoices.map((invoice: any) => (
            <Link key={invoice.id} href={`/invoices/${invoice.id}`} className="grid min-w-0 grid-cols-[auto_1fr_auto] items-center gap-3 border-t border-line px-4 py-3 first:border-t-0 hover:bg-surface-2">
              <ShapeMark shape="circle" icon="finance" label="Invoice" tone={invoice.status === 'paid' ? 'good' : invoice.status === 'overdue' ? 'risk' : 'brand'} size="sm" />
              <div className="min-w-0">
                <div className="flex min-w-0 items-center gap-2">
                  <span className="truncate font-mono text-[12.5px] font-medium text-brand">{invoice.invoice_number}</span>
                  <StatusBadge status={invoice.status} />
                </div>
                <p className="truncate text-[12px] text-ink-3">{invoice.projects?.name || 'General billing'}{invoice.due_date ? ` · Due ${invoice.due_date}` : ''}</p>
              </div>
              <span className="tnum shrink-0 text-[14px] font-semibold text-ink">{formatCurrency(invoice.amount_minor, invoice.currency)}</span>
            </Link>
          ))}</ProgressiveList>
        </Card>
      )}
    </div>
  );
}
