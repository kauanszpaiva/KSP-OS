import { canViewFinance } from '@ksp/auth';
import { Reveal } from '@ksp/ui';
import { requireSession } from '../../../lib/session';
import { getServerSupabase } from '../../../lib/supabase';
import { getFinanceOverview } from '../data';
import { EmptyState, Figure, PageHeader, Panel, SectionLabel } from '../_components/ui';

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

  const overview = supabase
    ? await getFinanceOverview(supabase)
    : { chartAccounts: [], draftEntryCount: 0, postedEntryCount: 0, monthlySubscriptionBurnMinor: 0 };

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

      {overview.chartAccounts.length === 0 ? (
        <EmptyState icon="finance" title="No chart of accounts yet." hint="Once accounts exist, this overview will show posting activity and subscription burn." />
      ) : (
        <Reveal>
          <SectionLabel>Chart of accounts</SectionLabel>
          <Panel className="divide-y divide-line">
            {overview.chartAccounts.map((a) => (
              <div key={a.id} className="flex items-center justify-between px-4 py-3">
                <div className="min-w-0">
                  <p className="truncate text-[13.5px] font-medium text-ink">{a.name}</p>
                  <p className="mt-0.5 text-[11.5px] uppercase tracking-wide text-ink-4">{a.code}</p>
                </div>
                <span className="text-[12px] capitalize text-ink-3">{a.account_type}</span>
              </div>
            ))}
          </Panel>
        </Reveal>
      )}
    </div>
  );
}
