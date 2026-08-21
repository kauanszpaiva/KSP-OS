import { canViewFinance } from '@ksp/auth';
import { requireSession } from '../../../lib/session';
import { getServerSupabase } from '../../../lib/supabase';
import { getFinanceOverview, getSubscriptions, getAccountingPeriods, getJournalEntries } from '../data';
import { getCashControlData } from './data';
import { getInvoiceConsoleData, type InvoiceConsoleData } from './invoice-data';
import { EmptyState, Figure, PageHeader } from '../_components/ui';
import { FinanceView } from '../_components/finance-view';

function money(minor: number): string {
  return (minor / 100).toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 });
}

async function safeLoad<T>(work: Promise<T>, fallback: T): Promise<T> {
  try {
    return await work;
  } catch {
    return fallback;
  }
}

const emptyInvoiceData: InvoiceConsoleData = {
  schemaReady: false,
  emailConfigured: false,
  clients: [],
  invoices: []
};

export default async function FinancePage() {
  const ctx = await requireSession();
  const supabase = await getServerSupabase();

  if (!canViewFinance(ctx)) {
    return (
      <div>
        <PageHeader eyebrow="Control" title="Finance" description="Executive-only." />
        <EmptyState icon="finance" title="Executive access only." hint="Finance records are restricted to the founder and executive operations." />
      </div>
    );
  }

  const overviewFallback = { chartAccounts: [], draftEntryCount: 0, postedEntryCount: 0, monthlySubscriptionBurnMinor: 0 };
  const cashFallback = { schemaReady: false, accounts: [], transactions: [], statements: [], unreconciledCount: 0, unknownBalanceAccountCount: 0 };

  const [overview, subscriptions, periods, entries, cash, invoiceData] = supabase
    ? await Promise.all([
        safeLoad(getFinanceOverview(supabase), overviewFallback),
        safeLoad(getSubscriptions(supabase), []),
        safeLoad(getAccountingPeriods(supabase), []),
        safeLoad(getJournalEntries(supabase), []),
        safeLoad(getCashControlData(supabase), cashFallback),
        safeLoad(getInvoiceConsoleData(supabase), emptyInvoiceData)
      ])
    : [overviewFallback, [], [], [], cashFallback, emptyInvoiceData];

  const cashStatus = !cash.schemaReady
    ? 'Migration required'
    : cash.accounts.length === 0
      ? 'Not configured'
      : cash.unknownBalanceAccountCount > 0
        ? 'Needs reconciliation'
        : `${cash.unreconciledCount} unreconciled`;

  return (
    <div>
      <PageHeader
        eyebrow="Control"
        title="Finance"
        description="Cash truth, receivables, recurring spend and controlled accounting operations."
        action={
          <div className="flex gap-6">
            <Figure label="Cash status" value={cashStatus} />
            <Figure label="Tracked subscriptions" value={money(overview.monthlySubscriptionBurnMinor)} />
            <Figure label="Posted entries" value={overview.postedEntryCount} tone="good" />
          </div>
        }
      />

      <FinanceView
        cash={cash}
        chartAccounts={overview.chartAccounts}
        subscriptions={subscriptions}
        draftEntryCount={overview.draftEntryCount}
        postedEntryCount={overview.postedEntryCount}
        periods={periods}
        entries={entries}
        invoiceData={invoiceData}
      />
    </div>
  );
}
