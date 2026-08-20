import { canViewFinance } from '@ksp/auth';
import { requireSession } from '../../../lib/session';
import { getServerSupabase } from '../../../lib/supabase';
import { getFinanceOverview, getSubscriptions } from '../data';
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

  const [overview, subscriptions] = supabase
    ? await Promise.all([getFinanceOverview(supabase), getSubscriptions(supabase)])
    : [{ chartAccounts: [], draftEntryCount: 0, postedEntryCount: 0, monthlySubscriptionBurnMinor: 0 }, []];

  return (
    <div>
      <PageHeader
        eyebrow="Control"
        title="Finance"
        description="A read-only overview. Posting, reconciliation, and the journal workbench are intentionally not built yet — they require a documented invariant review and human finance sign-off before any write path ships (see docs/rebuild/command/05_control_section.md)."
        action={
          <div className="flex gap-6">
            <Figure label="Draft entries" value={overview.draftEntryCount} />
            <Figure label="Posted entries" value={overview.postedEntryCount} tone="good" />
            <Figure label="Monthly burn" value={money(overview.monthlySubscriptionBurnMinor)} />
          </div>
        }
      />

      <FinanceView
        chartAccounts={overview.chartAccounts}
        subscriptions={subscriptions}
        draftEntryCount={overview.draftEntryCount}
        postedEntryCount={overview.postedEntryCount}
      />
    </div>
  );
}
