'use client';

import { useState } from 'react';
import { Avatar, Badge, BarChart, Donut, Reveal, Segmented } from '@ksp/ui';
import type { TeamLoadView } from '../data';
import { EmptyState, Panel } from './ui';

const OVERLOAD_THRESHOLD = 5;

function ListView({ load }: { load: TeamLoadView[] }) {
  return (
    <Reveal>
      <Panel className="divide-y divide-line">
        {load.map((row) => {
          const total = row.openCommitments + row.openTasks;
          const overloaded = total >= OVERLOAD_THRESHOLD;
          return (
            <div key={row.profileId} className="flex items-center gap-4 px-4 py-3">
              <Avatar name={row.displayName} />
              <div className="min-w-0 flex-1">
                <p className="truncate text-[14px] font-medium text-ink">{row.displayName}</p>
                <p className="mt-0.5 text-[12px] text-ink-3">
                  {row.missionCount} mission{row.missionCount === 1 ? '' : 's'}
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-3">
                <div className="text-right">
                  <p className="tnum text-[11px] uppercase tracking-wide text-ink-3">Commitments</p>
                  <p className="tnum text-lg font-semibold text-ink">{row.openCommitments}</p>
                </div>
                <div className="text-right">
                  <p className="tnum text-[11px] uppercase tracking-wide text-ink-3">Tasks</p>
                  <p className="tnum text-lg font-semibold text-ink">{row.openTasks}</p>
                </div>
                {overloaded && <Badge tone="warn">Overloaded</Badge>}
              </div>
            </div>
          );
        })}
      </Panel>
    </Reveal>
  );
}

function ChartView({ load }: { load: TeamLoadView[] }) {
  const barData = load
    .map((row) => ({ label: row.displayName, value: row.openCommitments + row.openTasks, tone: (row.openCommitments + row.openTasks >= OVERLOAD_THRESHOLD ? 'warn' : 'brand') as 'warn' | 'brand' }))
    .sort((a, b) => b.value - a.value);

  const totalCommitments = load.reduce((sum, row) => sum + row.openCommitments, 0);
  const totalTasks = load.reduce((sum, row) => sum + row.openTasks, 0);

  return (
    <div className="grid gap-8 lg:grid-cols-[1.4fr_1fr]">
      <Reveal>
        <p className="mb-3 text-[11px] font-semibold uppercase tracking-wider text-ink-4">Open load per person</p>
        <div className="rounded-xl border border-line bg-surface p-5">
          <BarChart data={barData} />
        </div>
      </Reveal>
      <Reveal delay={60}>
        <p className="mb-3 text-[11px] font-semibold uppercase tracking-wider text-ink-4">Commitments vs. tasks</p>
        <div className="rounded-xl border border-line bg-surface p-5">
          <Donut
            segments={[
              { label: 'Commitments', value: totalCommitments, tone: 'brand' },
              { label: 'Tasks', value: totalTasks, tone: 'accent' }
            ]}
          />
        </div>
      </Reveal>
    </div>
  );
}

export function TeamView({ load }: { load: TeamLoadView[] }) {
  const [view, setView] = useState<'list' | 'chart'>('list');

  if (load.length === 0) {
    return <EmptyState icon="team" title="No team members found." />;
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
      {view === 'list' ? <ListView load={load} /> : <ChartView load={load} />}
    </div>
  );
}
