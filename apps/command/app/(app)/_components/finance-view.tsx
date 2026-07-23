'use client';

import { useState } from 'react';
import { BarChart, Donut, Reveal, Segmented } from '@ksp/ui';
import type { ChartAccount, Subscription } from '@ksp/database';
import { formatDate, isOverdue } from '../../../lib/format';
import { EmptyState, Panel, SectionLabel } from './ui';
import { CalendarView, type CalendarItem } from './calendar-view';

function money(minor: number): string {
  return (minor / 100).toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 });
}

function monthlyCost(sub: Subscription): number {
  return sub.billing_frequency === 'annual' ? Math.round(sub.cost_minor / 12) : sub.cost_minor;
}

function ListView({ chartAccounts }: { chartAccounts: ChartAccount[] }) {
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
        <p className="mb-3 text-[11px] font-semibold uppercase tracking-wider text-ink-4">Monthly burn by vendor</p>
        <div className="rounded-xl border border-line bg-surface p-5">
          {barData.length === 0 ? <p className="text-[13px] text-ink-3">No active subscriptions.</p> : <BarChart data={barData} valueFormatter={money} />}
        </div>
      </Reveal>
      <Reveal delay={60}>
        <p className="mb-3 text-[11px] font-semibold uppercase tracking-wider text-ink-4">Journal entries: draft vs. posted</p>
        <div className="rounded-xl border border-line bg-surface p-5">
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
  chartAccounts,
  subscriptions,
  draftEntryCount,
  postedEntryCount
}: {
  chartAccounts: ChartAccount[];
  subscriptions: Subscription[];
  draftEntryCount: number;
  postedEntryCount: number;
}) {
  const [view, setView] = useState<'list' | 'renewals' | 'chart'>('list');

  if (chartAccounts.length === 0) {
    return <EmptyState icon="finance" title="No chart of accounts yet." hint="Once accounts exist, this overview will show posting activity and subscription burn." />;
  }

  return (
    <div>
      <div className="mb-5">
        <Segmented
          items={[
            { value: 'list', label: 'List' },
            { value: 'renewals', label: 'Renewals' },
            { value: 'chart', label: 'Chart' }
          ]}
          value={view}
          onValueChange={(v) => setView(v as 'list' | 'renewals' | 'chart')}
        />
      </div>
      {view === 'list' && <ListView chartAccounts={chartAccounts} />}
      {view === 'renewals' && <RenewalsView subscriptions={subscriptions} />}
      {view === 'chart' && <ChartView subscriptions={subscriptions} draftEntryCount={draftEntryCount} postedEntryCount={postedEntryCount} />}
    </div>
  );
}
