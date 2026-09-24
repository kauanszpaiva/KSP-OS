import { canViewFinance } from '@ksp/auth';
import {
  DistributionBars,
  DonutChart,
  Meter,
  VizBoard,
  VizPanel,
  VisualEmpty,
  VisualGrid,
  distribution,
  groupSums
} from '@ksp/ui';
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

  // Finance board. Every figure below comes from a record this page already
  // loaded; a mixed-currency set refuses to total instead of inventing one.
  const invoices = invoiceData.invoices;
  const invoiceStatusMix = distribution(invoices.map((invoice) => invoice.status), {
    limit: 6,
    otherLabel: 'Other statuses'
  });
  const invoiceValueByStatus = groupSums(
    invoices,
    (invoice) => invoice.status,
    (invoice) => invoice.amount_minor,
    { limit: 6, otherLabel: 'Other statuses', currency: (invoice) => invoice.currency }
  );
  const spendByVendor = groupSums(
    subscriptions,
    (subscription) => subscription.vendor,
    (subscription) => subscription.cost_minor,
    { limit: 6, otherLabel: 'Other vendors', currency: (subscription) => subscription.currency }
  );
  const reconciledCount = cash.transactions.filter(
    (transaction) => transaction.reconciliation_status === 'reconciled'
  ).length;

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

      <VizBoard
        aside={`${invoices.length} invoice${invoices.length === 1 ? '' : 's'} · ${subscriptions.length} subscription${subscriptions.length === 1 ? '' : 's'}`}
        className="mb-5"
        note="Recorded amounts only — nothing is accrued or forecast"
        title="Finance board"
      >
        <VisualGrid>
          <VizPanel index={0} note="Status of every invoice in this window" title="Invoice status">
            <DonutChart
              caption="Share of invoices by status"
              centerLabel="invoices"
              centerValue={String(invoices.length)}
              empty="No invoice was returned, or the invoice schema is not promoted here."
              items={invoiceStatusMix}
            />
          </VizPanel>

          <VizPanel index={1} note="amount_minor per invoice status" title="Invoice value by status">
            {invoiceValueByStatus.mixedCurrency ? (
              <VisualEmpty>
                The returned invoices use more than one currency, so no value chart is shown.
              </VisualEmpty>
            ) : (
              <DistributionBars
                empty="No invoice value was returned in this window."
                items={invoiceValueByStatus.items}
                valueFormatter={money}
              />
            )}
          </VizPanel>

          <VizPanel index={2} note="cost_minor per recorded vendor" title="Recurring spend by vendor">
            {spendByVendor.mixedCurrency ? (
              <VisualEmpty>
                The returned subscriptions use more than one currency, so no spend chart is shown.
              </VisualEmpty>
            ) : (
              <DistributionBars
                empty="No subscription was returned in this window."
                items={spendByVendor.items}
                tone="scale"
                valueFormatter={money}
              />
            )}
          </VizPanel>

          <VizPanel index={3} note="Reconciliation state and balance confidence" title="Cash reconciliation">
            <div className="grid gap-4">
              <Meter
                detail={
                  cash.transactions.length === 0
                    ? 'No cash transaction was returned in this window.'
                    : `${reconciledCount} of ${cash.transactions.length} returned transactions are reconciled.`
                }
                index={0}
                label="Transactions reconciled"
                max={Math.max(cash.transactions.length, 1)}
                tone={cash.unreconciledCount > 0 ? 'warn' : 'good'}
                value={reconciledCount}
              />
              <Meter
                detail={`${cash.unknownBalanceAccountCount} of ${cash.accounts.length || 0} returned accounts have no known balance.`}
                index={1}
                label="Accounts with a known balance"
                max={Math.max(cash.accounts.length, 1)}
                tone={cash.unknownBalanceAccountCount > 0 ? 'warn' : 'good'}
                value={cash.accounts.length - cash.unknownBalanceAccountCount}
              />
              <p className="text-[11px] leading-snug text-ink-3">
                Statements on record: <span className="tnum font-semibold text-ink">{cash.statements.length}</span> ·
                draft journal entries:{' '}
                <span className="tnum font-semibold text-ink">{overview.draftEntryCount}</span> ·
                posted: <span className="tnum font-semibold text-ink">{overview.postedEntryCount}</span>
                {overview.chartAccounts.length > 0 ? (
                  <>
                    {' '}
                    · chart accounts:{' '}
                    <span className="tnum font-semibold text-ink">{overview.chartAccounts.length}</span>
                  </>
                ) : null}
                {' '}
                · periods: <span className="tnum font-semibold text-ink">{periods.length}</span> · entries:{' '}
                <span className="tnum font-semibold text-ink">{entries.length}</span>
              </p>
            </div>
          </VizPanel>
        </VisualGrid>
      </VizBoard>

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
