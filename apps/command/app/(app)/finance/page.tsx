import { canViewFinance } from '@ksp/auth';
import { requireSession } from '../../../lib/session';
import { getServerSupabase } from '../../../lib/supabase';
import { getFinanceOverview, getSubscriptions, getAccountingPeriods, getJournalEntries, getInvoices, getClientRefs } from '../data';
import { getCashControlData } from './data';
import { EmptyState, Figure, PageHeader } from '../_components/ui';
import { FinanceView } from '../_components/finance-view';

function money(minor: number): string {
  return (minor / 100).toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 });
}

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

  const [overview, subscriptions, periods, entries, invoices, clients, cash] = supabase
    ? await Promise.all([
        getFinanceOverview(supabase),
        getSubscriptions(supabase),
        getAccountingPeriods(supabase),
        getJournalEntries(supabase),
        getInvoices(supabase),
        getClientRefs(supabase),
        getCashControlData(supabase)
      ])
    : [
        { chartAccounts: [], draftEntryCount: 0, postedEntryCount: 0, monthlySubscriptionBurnMinor: 0 },
        [],
        [],
        [],
        [],
        [],
        { accounts: [], transactions: [], statements: [], unreconciledCount: 0, unknownBalanceAccountCount: 0 }
      ];

  const cashStatus = cash.accounts.length === 0
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
        invoices={invoices}
        clients={clients}
      />
    </div>
  );
}
