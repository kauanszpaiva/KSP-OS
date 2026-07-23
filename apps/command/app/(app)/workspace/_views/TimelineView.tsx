'use client';

import { EmptyState, Panel, StatePill } from '../../_components/ui';
import { formatDate } from '../../../../lib/format';
import { buildDateScale, effectiveDate } from '../_lib/viewModel';
import type { ViewProps } from '../_lib/types';
import type { CommitmentState } from '@ksp/database';

const LANES: { key: CommitmentState; label: string; dot: string }[] = [
  { key: 'blocked', label: 'Blocked', dot: 'bg-risk' },
  { key: 'proof_submitted', label: 'In review', dot: 'bg-warn' },
  { key: 'in_progress', label: 'In progress', dot: 'bg-brand' },
  { key: 'open', label: 'Open', dot: 'bg-ink-4' },
  { key: 'completed', label: 'Completed', dot: 'bg-good' }
];

export function TimelineView({ commitments, todayISO, onOpen }: ViewProps) {
  const dated = commitments.filter((c) => effectiveDate(c));
  if (dated.length === 0) {
    return <EmptyState title="No dated commitments." hint="Add due or next-action dates to see them on the timeline." />;
  }
  const scale = buildDateScale(dated, new Date(todayISO));

  return (
    <Panel className="overflow-x-auto p-4">
      <div className="min-w-[720px]">
        {/* Month axis */}
        <div className="relative mb-2 h-5 border-b border-line">
          {scale.months.map((m, i) => (
            <span key={i} className="absolute top-0 text-[10px] font-medium uppercase tracking-wide text-ink-4" style={{ left: `${m.leftPct}%` }}>
              {m.label}
            </span>
          ))}
        </div>

        <div className="relative space-y-5 pt-2">
          {/* Today line spanning all lanes */}
          {scale.todayPct !== null && scale.todayPct >= 0 && scale.todayPct <= 100 && (
            <span className="pointer-events-none absolute inset-y-0 z-10 w-px bg-brand/50" style={{ left: `${scale.todayPct}%` }} aria-hidden />
          )}
          {LANES.map((lane) => {
            const items = dated.filter((c) => c.state === lane.key);
            if (items.length === 0) return null;
            return (
              <div key={lane.key}>
                <p className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-ink-4">{lane.label}</p>
                <div className="relative h-8 rounded bg-canvas/50">
                  <span className="absolute inset-x-0 top-1/2 h-px bg-line" aria-hidden />
                  {items.map((c) => {
                    const left = scale.pct(effectiveDate(c));
                    if (left === null) return null;
                    return (
                      <button
                        key={c.id}
                        type="button"
                        onClick={() => onOpen(c.id)}
                        title={`${c.title} · ${formatDate(effectiveDate(c))}`}
                        className="group absolute top-1/2 -translate-x-1/2 -translate-y-1/2"
                        style={{ left: `${Math.min(99, Math.max(1, left))}%` }}
                      >
                        <span className={`block h-3 w-3 rounded-full ring-2 ring-surface ${lane.dot}`} />
                        <span className="pointer-events-none absolute left-1/2 top-4 hidden -translate-x-1/2 whitespace-nowrap rounded bg-ink px-1.5 py-0.5 text-[10px] text-white group-hover:block group-focus:block">
                          {c.title}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>

        <p className="mt-4 flex items-center gap-2 text-[11px] text-ink-4">
          <StatePill state="in_progress" /> positioned by due or next-action date · vertical line is today
        </p>
      </div>
    </Panel>
  );
}
