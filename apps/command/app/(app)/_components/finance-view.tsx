'use client';

import { useState } from 'react';
import { BarChart, Donut, Reveal, Segmented } from '@ksp/ui';
import type { ChartAccount, Subscription } from '@ksp/database';
import type { AccountingPeriod, JournalEntry } from '../data';
import type { CashControlData } from '../finance/data';
import type { InvoiceConsoleData } from '../finance/invoice-data';
import { isOverdue } from '../../../lib/format';
import { defaultFinanceView, FINANCE_VIEWS, type FinanceViewKey } from '../../../lib/finance-view-state';
import { EmptyState, Panel, SectionLabel } from './ui';
import { CalendarView, type CalendarItem } from './calendar-view';
import { CashControl } from '../finance/_components/cash-control';
import { JournalWorkbench } from '../finance/_components/journal-workbench';
import { PeriodsConsole } from '../finance/_components/periods-console';
import { SubscriptionsConsole } from '../finance/_components/subscriptions-console';
import { InvoicesConsole } from '../finance/_components/invoices-console';

function money(minor: number): string {
  return (minor / 100).toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 });
}

function monthlyCost(sub: Subscription): number {
  return sub.billing_frequency === 'annual' ? Math.round(sub.cost_minor / 12) : sub.cost_minor;
}

function ListView({ chartAccounts }: { chartAccounts: ChartAccount[] }) {
  if (chartAccounts.length === 0) {
    return <EmptyState icon="finance" title="No chart of accounts yet." hint="Cash Control works independently. Add accounting accounts when you are ready to post journals." />;
  }
  return (
    <Reveal>
      <SectionLabel>Chart of accounts</SectionLabel>
      <Panel className="divide-y divide-line">
        {chartAccounts.map((a) => (
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
  );
}

function RenewalsView({ subscriptions }: { subscriptions: Subscription[] }) {
  const active = subscriptions.filter((s) => s.status === 'active' && s.renewal_date);
  if (active.length === 0) {
    return <EmptyState icon="finance" title="No upcoming renewals." hint="Active subscriptions with a renewal date will show up here." />;
  }
  const items: CalendarItem[] = active.map((s) => ({
    id: s.id,
    title: `${s.vendor} · ${s.product}`,
    subtitle: `${money(monthlyCost(s))}/mo${isOverdue(s.renewal_date) ? ' · overdue' : ''}`,
    date: s.renewal_date as string,
    state: isOverdue(s.renewal_date) ? 'blocked' : 'active'
  }));
  return <CalendarView items={items} />;
}

function ChartView({ subscriptions, draftEntryCount, postedEntryCount }: { subscriptions: Subscription[]; draftEntryCount: number; postedEntryCount: number }) {
  const active = subscriptions.filter((s) => s.status === 'active');
  const byVendor = new Map<string, number>();
  for (const s of active) byVendor.set(s.vendor, (byVendor.get(s.vendor) ?? 0) + monthlyCost(s));
  const barData = Array.from(byVendor.entries())
    .map(([label, value]) => ({ label, value }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 8);

  return (
    <div className="grid gap-8 lg:grid-cols-[1.4fr_1fr]">
      <Reveal>
        <p className="mb-3 text-[11px] font-semibold uppercase tracking-wider text-ink-4">Tracked subscriptions by vendor</p>
        <div className="rounded-xl border border-line bg-surface p-4 sm:p-5">
          {barData.length === 0 ? <p className="text-[13px] text-ink-3">No active subscriptions.</p> : <BarChart data={barData} valueFormatter={money} />}
        </div>
      </Reveal>
      <Reveal delay={60}>
        <p className="mb-3 text-[11px] font-semibold uppercase tracking-wider text-ink-4">Journal entries: draft vs. posted</p>
        <div className="rounded-xl border border-line bg-surface p-4 sm:p-5">
          <Donut
            segments={[
              { label: 'Draft', value: draftEntryCount, tone: 'warn' },
              { label: 'Posted', value: postedEntryCount, tone: 'good' }
            ]}
          />
        </div>
      </Reveal>
    </div>
  );
}

export function FinanceView({
  cash,
  chartAccounts,
  subscriptions,
  draftEntryCount,
  postedEntryCount,
  periods,
  entries,
  invoiceData
}: {
  cash: CashControlData;
  chartAccounts: ChartAccount[];
  subscriptions: Subscription[];
  draftEntryCount: number;
  postedEntryCount: number;
  periods: AccountingPeriod[];
  entries: JournalEntry[];
  invoiceData: InvoiceConsoleData;
}) {
  const [view, setView] = useState<FinanceViewKey>(() => defaultFinanceView({ cashReady: cash.schemaReady, invoiceReady: invoiceData.schemaReady }));

  return (
    <div className="min-w-0">
      <div className="mb-4 sm:hidden">
        <label htmlFor="finance-mobile-view" className="mb-1.5 block text-[10px] font-semibold uppercase tracking-[0.12em] text-ink-4">
          Finance workspace
        </label>
        <select
          id="finance-mobile-view"
          value={view}
          onChange={(event) => setView(event.target.value as FinanceViewKey)}
          className="h-11 w-full rounded-xl border border-line-2 bg-surface px-3 text-[14px] font-medium text-ink shadow-card outline-none transition-colors focus:border-brand focus:shadow-focus"
        >
          {FINANCE_VIEWS.map((item) => (
            <option key={item.value} value={item.value}>{item.label}</option>
          ))}
        </select>
      </div>

      <div className="mb-5 hidden max-w-full overflow-x-auto pb-1 sm:block">
        <Segmented
          items={[...FINANCE_VIEWS]}
          value={view}
          onValueChange={(value) => setView(value as FinanceViewKey)}
        />
      </div>

      <div className="min-w-0">
        {view === 'cash' && <CashControl data={cash} />}
        {view === 'accounts' && <ListView chartAccounts={chartAccounts} />}
        {view === 'renewals' && <RenewalsView subscriptions={subscriptions} />}
        {view === 'chart' && <ChartView subscriptions={subscriptions} draftEntryCount={draftEntryCount} postedEntryCount={postedEntryCount} />}
        {view === 'journal' && <JournalWorkbench entries={entries} accounts={chartAccounts} />}
        {view === 'periods' && <PeriodsConsole periods={periods} />}
        {view === 'subscriptions' && <SubscriptionsConsole subscriptions={subscriptions} />}
        {view === 'invoices' && <InvoicesConsole data={invoiceData} />}
      </div>
    </div>
  );
}
