'use client';

import { useState } from 'react';
import { BarChart, Donut, Reveal, Segmented } from '@ksp/ui';
import { formatDate } from '../../../lib/format';
import { EmptyState, StatePill } from './ui';

export interface HorizonItem {
  id: string;
  title: string;
  subtitle: string;
  date: string;
  kind: 'commitment' | 'milestone';
  state: string;
  daysUntil: number;
}

function ListView({ items }: { items: HorizonItem[] }) {
  return (
    <Reveal className="overflow-hidden rounded-xl border border-line bg-surface shadow-card">
      {items.map((item, i) => (
        <div
          key={`${item.kind}-${item.id}`}
          className={`flex items-center justify-between gap-4 px-4 py-3 transition-colors duration-fast hover:bg-surface-2 ${i > 0 ? 'border-t border-line' : ''}`}
        >
          <div className="min-w-0 flex-1">
            <p className="truncate text-[14px] font-medium text-ink">{item.title}</p>
            <p className="truncate text-[12px] text-ink-3">{item.subtitle}</p>
          </div>
          <div className="flex shrink-0 items-center gap-3">
            <StatePill state={item.state} />
            <span className="tnum text-[12.5px] text-ink-3">{formatDate(item.date)}</span>
          </div>
        </div>
      ))}
    </Reveal>
  );
}

const BUCKETS = [
  { label: 'This week', min: 0, max: 7 },
  { label: 'Next 3 weeks', min: 8, max: 30 },
  { label: 'Next 2 months', min: 31, max: 90 }
];

function ChartView({ items, range }: { items: HorizonItem[]; range: number }) {
  const barData = BUCKETS.filter((b) => b.min <= range).map((b) => ({
    label: b.label,
    value: items.filter((i) => i.daysUntil >= b.min && i.daysUntil <= Math.min(b.max, range)).length
  }));

  const commitmentCount = items.filter((i) => i.kind === 'commitment').length;
  const milestoneCount = items.filter((i) => i.kind === 'milestone').length;

  return (
    <div className="grid gap-8 lg:grid-cols-[1.4fr_1fr]">
      <Reveal>
        <p className="mb-3 text-[11px] font-semibold uppercase tracking-wider text-ink-4">Due-soon load</p>
        <div className="rounded-xl border border-line bg-surface p-5">
          <BarChart data={barData} />
        </div>
      </Reveal>
      <Reveal delay={60}>
        <p className="mb-3 text-[11px] font-semibold uppercase tracking-wider text-ink-4">Commitments vs. milestones</p>
        <div className="rounded-xl border border-line bg-surface p-5">
          <Donut
            segments={[
              { label: 'Commitments', value: commitmentCount, tone: 'brand' },
              { label: 'Milestones', value: milestoneCount, tone: 'accent' }
            ]}
          />
        </div>
      </Reveal>
    </div>
  );
}

export function HorizonView({ items, range }: { items: HorizonItem[]; range: number }) {
  const [view, setView] = useState<'list' | 'chart'>('list');

  if (items.length === 0) {
    return <EmptyState icon="horizon" title={`Nothing due in the next ${range} days.`} hint="Widen the range or check back once work is scheduled." />;
  }

  return (
    <div>
      <div className="mb-5">
        <Segmented
          items={[
            { value: 'list', label: 'List' },
            { value: 'chart', label: 'Chart' }
          ]}
          value={view}
          onValueChange={(v) => setView(v as 'list' | 'chart')}
        />
      </div>
      {view === 'list' ? <ListView items={items} /> : <ChartView items={items} range={range} />}
    </div>
  );
}
