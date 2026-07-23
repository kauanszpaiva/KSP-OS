'use client';

import { EmptyState, Figure, Ring, Rail } from '../../_components/ui';
import { isOverdue } from '../../../../lib/format';
import { BarSeries, ChartCard, Sparkline, StackedRail, type Segment } from '../_components/charts';
import { effectiveDate } from '../_lib/viewModel';
import type { ViewProps } from '../_lib/types';

const STATE_SEGMENTS: { key: string; label: string; tone: Segment['tone'] }[] = [
  { key: 'open', label: 'Open', tone: 'neutral' },
  { key: 'in_progress', label: 'In progress', tone: 'brand' },
  { key: 'blocked', label: 'Blocked', tone: 'risk' },
  { key: 'proof_submitted', label: 'In review', tone: 'warn' },
  { key: 'completed', label: 'Completed', tone: 'good' }
];

export function ChartsView({ commitments, members, todayISO }: ViewProps) {
  if (commitments.length === 0) {
    return <EmptyState title="No data to chart yet." hint="Create commitments to populate these charts." />;
  }

  const total = commitments.length;
  const completed = commitments.filter((c) => c.state === 'completed').length;
  const active = commitments.filter((c) => ['open', 'in_progress', 'blocked'].includes(c.state));
  const overdue = commitments.filter((c) => isOverdue(c.due_date) && c.state !== 'completed').length;
  const avgProgress = Math.round(active.reduce((s, c) => s + c.progress, 0) / (active.length || 1));
  const completionPct = Math.round((completed / total) * 100);

  const segments: Segment[] = STATE_SEGMENTS.map((s) => ({
    label: s.label,
    tone: s.tone,
    value: commitments.filter((c) => c.state === s.key).length
  }));

  // Per-owner average progress on active work.
  const byOwner = members
    .map((m) => {
      const items = active.filter((c) => c.owner_id === m.id || c.assignees.some((a) => a.profileId === m.id));
      const avg = items.length ? Math.round(items.reduce((s, c) => s + c.progress, 0) / items.length) : 0;
      return { name: m.displayName, count: items.length, avg };
    })
    .filter((o) => o.count > 0)
    .sort((a, b) => b.count - a.count);

  // Commitments created per week over the trailing 8 weeks (throughput).
  const today = new Date(todayISO);
  const weeks = Array.from({ length: 8 }, (_, i) => {
    const end = new Date(today);
    end.setDate(today.getDate() - (7 - i) * 7);
    const start = new Date(end);
    start.setDate(end.getDate() - 7);
    const count = commitments.filter((c) => {
      const t = new Date(c.created_at).getTime();
      return t > start.getTime() && t <= end.getTime();
    }).length;
    return { label: end.toLocaleDateString('en-US', { month: 'numeric', day: 'numeric' }), value: count };
  });

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-4">
        <div className="rounded-lg border border-line bg-surface p-4"><Figure label="Total" value={total} /></div>
        <div className="rounded-lg border border-line bg-surface p-4"><Figure label="Active" value={active.length} tone="brand" /></div>
        <div className="rounded-lg border border-line bg-surface p-4"><Figure label="Completed" value={completed} tone="good" /></div>
        <div className="rounded-lg border border-line bg-surface p-4"><Figure label="Overdue" value={overdue} tone={overdue ? 'risk' : 'neutral'} /></div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <ChartCard title="Completion">
          <div className="flex items-center gap-5">
            <Ring value={completionPct} size={84} />
            <div className="space-y-1 text-[12.5px] text-ink-3">
              <p><span className="tnum font-semibold text-ink">{completed}</span> of <span className="tnum">{total}</span> complete</p>
              <p>Active work avg progress <span className="tnum font-semibold text-ink">{avgProgress}%</span></p>
            </div>
          </div>
        </ChartCard>

        <ChartCard title="Distribution by state">
          <StackedRail segments={segments} />
        </ChartCard>

        <ChartCard title="Throughput — created per week (8w)">
          <BarSeries data={weeks} />
          <div className="mt-2"><Sparkline values={weeks.map((w) => w.value)} /></div>
        </ChartCard>

        <ChartCard title="Progress by owner (active)">
          {byOwner.length === 0 ? (
            <p className="text-[12px] text-ink-4">No active work assigned.</p>
          ) : (
            <ul className="space-y-2.5">
              {byOwner.map((o) => (
                <li key={o.name} className="grid grid-cols-[120px_1fr_auto] items-center gap-3">
                  <span className="truncate text-[12.5px] text-ink-2">{o.name}</span>
                  <Rail value={o.avg} />
                  <span className="tnum text-[11.5px] text-ink-3">{o.avg}% · {o.count}</span>
                </li>
              ))}
            </ul>
          )}
        </ChartCard>
      </div>
    </div>
  );
}
