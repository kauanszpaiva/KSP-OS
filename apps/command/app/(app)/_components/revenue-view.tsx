'use client';

import { useState } from 'react';
import { BarChart, Donut, Reveal, Segmented } from '@ksp/ui';
import { formatDate } from '../../../lib/format';
import type { LeadView } from '../data';
import { EmptyState, Panel, SectionLabel, StatePill } from './ui';
import { Board, type BoardColumn } from './board-view';
import { LeadStatusForm } from './growth-forms';

function money(minor: number): string {
  return (minor / 100).toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 });
}

function ListView({ leads }: { leads: LeadView[] }) {
  const active = leads.filter((l) => l.status === 'active');
  const closed = leads.filter((l) => l.status !== 'active');
  return (
    <div className="space-y-8">
      <Reveal>
        <SectionLabel right={<span className="tnum text-[12px] text-ink-3">{active.length}</span>}>Active</SectionLabel>
        <Panel className="divide-y divide-line">
          {active.map((l) => (
            <div key={l.id} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
              <div className="min-w-0 flex-1">
                <p className="truncate text-[14px] font-medium text-ink">{l.name}</p>
                <p className="mt-0.5 truncate text-[12px] text-ink-3">
                  {l.ownerName}
                  {l.next_action ? ` · ${l.next_action}` : ''}
                  {l.target_close_date ? ` · closes ${formatDate(l.target_close_date)}` : ''}
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-3">
                <span className="tnum text-[13px] text-ink-2">
                  {l.expected_value_minor != null ? money(l.expected_value_minor) : '—'}
                  {l.probability != null && <span className="text-ink-4"> · {l.probability}%</span>}
                </span>
                <LeadStatusForm id={l.id} target="archived">Close</LeadStatusForm>
              </div>
            </div>
          ))}
        </Panel>
      </Reveal>

      {closed.length > 0 && (
        <Reveal delay={60}>
          <SectionLabel right={<span className="tnum text-[12px] text-ink-3">{closed.length}</span>}>Closed</SectionLabel>
          <Panel className="divide-y divide-line">
            {closed.map((l) => (
              <div key={l.id} className="flex items-center justify-between gap-3 px-4 py-3">
                <span className="truncate text-[13.5px] font-medium text-ink">{l.name}</span>
                <StatePill state={l.status} />
              </div>
            ))}
          </Panel>
        </Reveal>
      )}
    </div>
  );
}

/**
 * `leads.status` is binary (active/archived) — there is no real pipeline-stage
 * column (documented gap from C4.1: "would need a real stage/pipeline-position
 * column to do that properly"). Rather than fabricate a stage field nothing
 * writes to, Board/Chart both bucket active leads by `probability` instead —
 * a real, already-captured field that behaves like a stage progression. This
 * is a deliberate stand-in for "by lead status" as the V3 plan described it,
 * not a literal read of a `status` enum that doesn't have pipeline stages.
 */
const PROBABILITY_BUCKETS = [
  { value: 'early', label: 'Early (<25%)', min: 0, max: 24 },
  { value: 'developing', label: 'Developing (25–50%)', min: 25, max: 50 },
  { value: 'strong', label: 'Strong (51–75%)', min: 51, max: 75 },
  { value: 'committed', label: 'Committed (76%+)', min: 76, max: 100 }
];

function bucketFor(probability: number | null): (typeof PROBABILITY_BUCKETS)[number] {
  const p = probability ?? 0;
  return PROBABILITY_BUCKETS.find((b) => p >= b.min && p <= b.max) ?? PROBABILITY_BUCKETS[0];
}

function BoardViewForRevenue({ leads }: { leads: LeadView[] }) {
  const active = leads.filter((l) => l.status === 'active');
  const closed = leads.filter((l) => l.status !== 'active');
  const columns: BoardColumn<LeadView>[] = [
    ...PROBABILITY_BUCKETS.map((b) => ({ value: b.value, label: b.label, items: active.filter((l) => bucketFor(l.probability).value === b.value) })),
    { value: 'closed', label: 'Closed', items: closed }
  ];

  return (
    <Board
      columns={columns}
      renderCard={(l) => (
        <div className="space-y-2">
          <p className="truncate text-[13px] font-medium text-ink">{l.name}</p>
          <p className="truncate text-[11px] text-ink-3">
            {l.ownerName}
            {l.target_close_date ? ` · closes ${formatDate(l.target_close_date)}` : ''}
          </p>
          <p className="tnum text-[11px] text-ink-4">
            {l.expected_value_minor != null ? money(l.expected_value_minor) : '—'}
            {l.probability != null && ` · ${l.probability}%`}
          </p>
          {l.status === 'active' && (
            <div className="border-t border-line pt-2">
              <LeadStatusForm id={l.id} target="archived">Close</LeadStatusForm>
            </div>
          )}
        </div>
      )}
    />
  );
}

function ChartView({ leads }: { leads: LeadView[] }) {
  const active = leads.filter((l) => l.status === 'active');
  const closed = leads.filter((l) => l.status !== 'active');

  const barData = PROBABILITY_BUCKETS.map((b) => ({
    label: b.label,
    value: active.filter((l) => bucketFor(l.probability).value === b.value).reduce((sum, l) => sum + (l.expected_value_minor ?? 0), 0)
  }));

  return (
    <div className="grid gap-8 lg:grid-cols-[1.4fr_1fr]">
      <Reveal>
        <p className="mb-3 text-[11px] font-semibold uppercase tracking-wider text-ink-4">Pipeline value by stage (funnel)</p>
        <div className="rounded-xl border border-line bg-surface p-5">
          <BarChart data={barData} valueFormatter={money} />
        </div>
      </Reveal>
      <Reveal delay={60}>
        <p className="mb-3 text-[11px] font-semibold uppercase tracking-wider text-ink-4">Active vs. closed</p>
        <div className="rounded-xl border border-line bg-surface p-5">
          <Donut
            segments={[
              { label: 'Active', value: active.length, tone: 'brand' },
              { label: 'Closed', value: closed.length, tone: 'neutral' }
            ]}
          />
        </div>
      </Reveal>
    </div>
  );
}

export function RevenueView({ leads }: { leads: LeadView[] }) {
  const [view, setView] = useState<'list' | 'board' | 'chart'>('list');

  if (leads.length === 0) {
    return <EmptyState icon="revenue" title="No leads yet." hint="Add the first opportunity to start tracking weighted pipeline." />;
  }

  return (
    <div>
      <div className="mb-5">
        <Segmented
          items={[
            { value: 'list', label: 'List' },
            { value: 'board', label: 'Board' },
            { value: 'chart', label: 'Chart' }
          ]}
          value={view}
          onValueChange={(v) => setView(v as 'list' | 'board' | 'chart')}
        />
      </div>
      {view === 'list' && <ListView leads={leads} />}
      {view === 'board' && <BoardViewForRevenue leads={leads} />}
      {view === 'chart' && <ChartView leads={leads} />}
    </div>
  );
}
