import { IncShell, ownerRoleLabel } from '../../components/inc-shell';
import { OwnerPageHeader, SurfaceStatus } from '../../components/owner-surface';
import { StreamList } from '../../components/stream-list';
import { TabGroup } from '../../components/tabs';
import { DistributionBars, DonutChart, Panel, StatCard, StatGrid, VisualGrid } from '../../components/visual-data';
import { getFinanceRows } from '../../lib/inc-data';
import { requireIncOwner } from '../../lib/inc-session';
import { getServerSupabase } from '../../lib/supabase';
import {
  distribution,
  formatMinorUnits,
  groupRows,
  singleCurrencyTotal,
  statusFacets
} from '../../lib/visual-data';

const RISK_PREFIX = 'Risk ';

/** Money is only totalled when every returned row shares one currency. */
function moneyCard(result: ReturnType<typeof singleCurrencyTotal>) {
  if (result.count === 0) {
    return { valueText: '—', note: 'No returned row carried an amount.' };
  }
  if (result.mixed) {
    return {
      valueText: `${result.count} rows`,
      note: 'More than one currency is present, so no single total is shown. Count of returned rows with an amount.'
    };
  }
  return {
    valueText: formatMinorUnits(result.total, result.currency),
    note: `Sum of the ${result.count} returned rows that carry an amount.`
  };
}

export default async function IncFinancePage() {
  const ctx = await requireIncOwner();
  const supabase = await getServerSupabase();
  const rows = supabase ? await getFinanceRows(supabase) : [];

  const invoices = groupRows(rows, 'invoice');
  const approvals = groupRows(rows, 'approval');
  const subscriptions = groupRows(rows, 'subscription');

  const invoiceMoney = moneyCard(singleCurrencyTotal(invoices));
  const approvalMoney = moneyCard(singleCurrencyTotal(approvals));
  const subscriptionMoney = moneyCard(singleCurrencyTotal(subscriptions));

  const invoiceMix = distribution(invoices.map((row) => row.status), { limit: 6, otherLabel: 'Other statuses' });
  const approvalMix = distribution(approvals.map((row) => row.status), { limit: 6, otherLabel: 'Other statuses' });
  const subscriptionMix = distribution(subscriptions.map((row) => row.status), { limit: 6, otherLabel: 'Other statuses' });
  const riskMix = distribution(
    approvals.map((row) => (row.meta?.startsWith(RISK_PREFIX) ? row.meta.slice(RISK_PREFIX.length) : undefined))
  );
  const pendingApprovals = approvals.filter((row) => /pending|open|review|await/i.test(row.status ?? '')).length;

  return (
    <IncShell mfa={ctx.mfa} ownerName={ctx.user.displayName} roleLabel={ownerRoleLabel(ctx.internalRoles)}>
      <OwnerPageHeader
        aside="Financial mutations remain governed by their existing approval, MFA and database rules. INC does not bypass those controls."
        description="Owner-level finance evidence across invoices, approvals and recurring subscriptions."
        eyebrow="Money & approvals"
        icon="banknote"
        title="Finance"
      />
      <SurfaceStatus
        title="No duplicate finance engine"
        body="INC reads the canonical finance records. Mutation workflows will be moved behind shared domain services before Command-only actions are retired."
        tone="ok"
      />

      <section className="section" aria-labelledby="finance-summary">
        <div className="sectionHeader">
          <h2 id="finance-summary">Financial operating stream</h2>
          <p>Amounts are summed only across rows that share one currency</p>
        </div>
        <StatGrid label="Finance metrics">
          <StatCard icon="banknote" index={0} label="Invoice value returned" note={invoiceMoney.note} valueText={invoiceMoney.valueText} />
          <StatCard icon="history" index={1} label="Invoices returned" note="Most recent 30 ordered by created_at" value={invoices.length} />
          <StatCard
            icon="shield"
            index={2}
            label="Approvals awaiting decision"
            note="Returned approvals whose status reads as pending/open/review"
            tone={pendingApprovals > 0 ? 'warning' : 'ok'}
            value={pendingApprovals}
          />
          <StatCard
            icon="database"
            index={3}
            label="Recurring subscription cost"
            note={subscriptionMoney.note}
            valueText={subscriptionMoney.valueText}
          />
        </StatGrid>
      </section>

      <section className="section" aria-labelledby="finance-visuals">
        <div className="sectionHeader">
          <h2 id="finance-visuals">Financial signals</h2>
          <p>Status and risk shape of the returned finance rows</p>
        </div>
        <VisualGrid>
          <Panel index={0} note="Invoice status in the returned window" title="Invoice status mix">
            <DonutChart
              caption="Share of returned invoices by status"
              centerLabel="invoices"
              centerValue={String(invoices.length)}
              emptyLabel="No invoices were returned in this environment."
              items={invoiceMix}
            />
          </Panel>
          <Panel index={1} note="Approval status in the returned window" title="Approval status mix">
            <DistributionBars emptyLabel="No approvals were returned." items={approvalMix} />
          </Panel>
          <Panel index={2} note="risk_level recorded on returned approvals" title="Approval risk">
            <DistributionBars emptyLabel="No approval risk levels were returned." items={riskMix} />
          </Panel>
          <Panel index={3} note={subscriptionMoney.note} title="Recurring subscriptions">
            <DistributionBars emptyLabel="No subscriptions were returned." items={subscriptionMix} />
          </Panel>
        </VisualGrid>
      </section>

      <section className="section" aria-labelledby="finance-stream">
        <div className="sectionHeader">
          <h2 id="finance-stream">Finance streams</h2>
          <p>Invoices · approvals · subscriptions</p>
        </div>
        <TabGroup
          label="Finance streams"
          tabs={[
            { id: 'invoices', label: 'Invoices', icon: 'banknote', note: String(invoices.length) },
            { id: 'approvals', label: 'Approvals', icon: 'shield', note: String(approvals.length) },
            { id: 'subscriptions', label: 'Subscriptions', icon: 'database', note: String(subscriptions.length) }
          ]}
          panels={[
            <StreamList
              empty="No invoices were returned in this environment."
              facets={statusFacets(invoices)}
              key="invoices"
              rows={invoices}
              searchPlaceholder="Search invoice status or amount"
            />,
            <StreamList
              empty="No approval requests were returned in this environment."
              facets={statusFacets(approvals)}
              key="approvals"
              rows={approvals}
              searchPlaceholder="Search approval type, status or risk"
            />,
            <StreamList
              empty="No subscriptions were returned in this environment."
              facets={statusFacets(subscriptions)}
              key="subscriptions"
              rows={subscriptions}
              searchPlaceholder="Search vendor, product or status"
            />
          ]}
        />
      </section>
    </IncShell>
  );
}

