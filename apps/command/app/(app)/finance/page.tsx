import { canViewFinance } from '@ksp/auth';
import { requireSession } from '../../../lib/session';
import { getServerSupabase } from '../../../lib/supabase';
import { getFinanceOverview, getSubscriptions, getAccountingPeriods, getJournalEntries } from '../data';
import { getCashControlData } from './data';
import { getInvoiceConsoleData, type InvoiceConsoleData } from './invoice-data';
import { EmptyState, PageHeader } from '../_components/ui';
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

function SummaryValue({ label, value, tone = 'neutral' }: { label: string; value: string; tone?: 'neutral' | 'good' | 'warn' }) {
  const toneClass = tone === 'good' ? 'text-good' : tone === 'warn' ? 'text-warn' : 'text-ink';
  return (
    <div className="min-w-0 px-3 py-2.5 sm:px-4">
      <p className="text-[9.5px] font-semibold uppercase tracking-[0.1em] text-ink-4 sm:text-[10.5px]">{label}</p>
      <p className={`mt-1 break-words text-[13px] font-semibold leading-tight sm:text-[15px] ${toneClass}`}>{value}</p>
    </div>
  );
}

export default async function FinancePage() {
  const ctx = await requireSession();
  const supabase = await getServerSupabase();

  if (!canViewFinance(ctx)) {
    return (
      <div className="min-w-0 overflow-x-clip">
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
    ? 'Setup needed'
    : cash.accounts.length === 0
      ? 'Not configured'
      : cash.unknownBalanceAccountCount > 0
        ? 'Needs review'
        : cash.unreconciledCount > 0
          ? `${cash.unreconciledCount} unreconciled`
          : 'Reconciled';

  return (
    <div className="min-w-0 overflow-x-clip">
      <PageHeader
        eyebrow="Control"
        title="Finance"
        description="Receivables, cash truth, recurring spend and controlled accounting operations."
        action={
          <div className="grid w-full grid-cols-3 divide-x divide-line overflow-hidden rounded-xl border border-line bg-surface md:w-[430px]">
            <SummaryValue label="Cash" value={cashStatus} tone={!cash.schemaReady || cash.unknownBalanceAccountCount > 0 ? 'warn' : 'good'} />
            <SummaryValue label="Monthly spend" value={money(overview.monthlySubscriptionBurnMinor)} />
            <SummaryValue label="Posted" value={String(overview.postedEntryCount)} tone="good" />
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
