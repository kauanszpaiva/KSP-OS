'use client';

import { EmptyState, Panel, Rail } from '../../_components/ui';
import { formatDate, isOverdue } from '../../../../lib/format';
import { buildDateScale, effectiveDate } from '../_lib/viewModel';
import type { ViewProps } from '../_lib/types';
import type { CommitmentView } from '../../data';

export function RoadmapView({ commitments, outcomes, todayISO, onOpen }: ViewProps) {
  if (commitments.length === 0) {
    return <EmptyState title="Nothing to map." hint="Link commitments to company outcomes to build the roadmap." />;
  }
  const scale = buildDateScale(commitments, new Date(todayISO));

  const lanes: { id: string; title: string; items: CommitmentView[] }[] = outcomes.map((o) => ({
    id: o.id,
    title: o.title,
    items: commitments.filter((c) => c.outcome_id === o.id)
  }));
  const unlinked = commitments.filter((c) => !c.outcome_id);
  if (unlinked.length) lanes.push({ id: '_unlinked', title: 'Unlinked', items: unlinked });

  return (
    <Panel className="overflow-x-auto p-0">
      <div className="min-w-[820px]">
        <div className="relative ml-[200px] h-6 border-b border-line">
          {scale.months.map((m, i) => (
            <div key={i} className="absolute top-0 h-full border-l border-line pl-1 text-[10px] font-medium uppercase tracking-wide text-ink-4" style={{ left: `${m.leftPct}%` }}>
              {m.label}
            </div>
          ))}
        </div>

        <div className="relative">
          {scale.todayPct !== null && scale.todayPct >= 0 && scale.todayPct <= 100 && (
            <span className="pointer-events-none absolute bottom-0 top-0 z-10 w-px bg-brand/50" style={{ left: `calc(200px + (100% - 200px) * ${scale.todayPct / 100})` }} aria-hidden />
          )}
          {lanes.map((lane) => (
            <div key={lane.id} className="flex items-stretch border-b border-line last:border-0">
              <div className="w-[200px] shrink-0 border-r border-line bg-canvas/40 px-3 py-3">
                <p className="text-[12.5px] font-semibold text-ink">{lane.title}</p>
                <p className="tnum text-[11px] text-ink-4">{lane.items.length} commitment{lane.items.length === 1 ? '' : 's'}</p>
              </div>
              <div className="relative flex-1 py-2">
                {lane.items.length === 0 && <p className="px-3 py-2 text-[11px] text-ink-4">No commitments</p>}
                {lane.items.map((c) => {
                  const start = scale.pct(c.created_at) ?? 0;
                  const end = scale.pct(effectiveDate(c)) ?? start;
                  const left = Math.max(0, Math.min(start, end));
                  const width = Math.max(8, Math.abs(end - start));
                  const overdue = isOverdue(c.due_date) && c.state !== 'completed';
                  const tone = c.state === 'completed' ? 'good' : overdue || c.state === 'blocked' ? 'risk' : c.state === 'proof_submitted' ? 'warn' : 'brand';
                  return (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => onOpen(c.id)}
                      className="relative my-1 flex h-7 items-center overflow-hidden rounded-md border border-line bg-surface px-2 text-left shadow-card hover:border-brand"
                      style={{ marginLeft: `${left}%`, width: `${width}%`, minWidth: 96 }}
                      title={`${c.title} · due ${formatDate(effectiveDate(c))}`}
                    >
                      <span className="truncate text-[11.5px] font-medium text-ink">{c.title}</span>
                      <span className="absolute inset-x-0 bottom-0">
                        <Rail value={c.progress} tone={tone as 'good' | 'risk' | 'warn' | 'brand'} />
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>
    </Panel>
  );
}
