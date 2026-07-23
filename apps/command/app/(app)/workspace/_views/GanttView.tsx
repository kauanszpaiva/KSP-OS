'use client';

import { EmptyState, Panel } from '../../_components/ui';
import { formatDate, isOverdue } from '../../../../lib/format';
import { buildDateScale, effectiveDate } from '../_lib/viewModel';
import type { ViewProps } from '../_lib/types';

const MIN_BAR_PCT = 1.5;

export function GanttView({ commitments, todayISO, onOpen }: ViewProps) {
  const dated = commitments.filter((c) => effectiveDate(c));
  if (dated.length === 0) {
    return <EmptyState title="No scheduled commitments." hint="Add dates to see start-to-due bars here." />;
  }
  const scale = buildDateScale(dated, new Date(todayISO));
  // Sort by start so bars cascade top-to-bottom.
  const rows = [...dated].sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());

  return (
    <Panel className="overflow-x-auto p-0">
      <div className="min-w-[820px]">
        {/* Month header */}
        <div className="relative ml-[220px] h-6 border-b border-line">
          {scale.months.map((m, i) => (
            <div key={i} className="absolute top-0 h-full border-l border-line pl-1 text-[10px] font-medium uppercase tracking-wide text-ink-4" style={{ left: `${m.leftPct}%` }}>
              {m.label}
            </div>
          ))}
        </div>

        <div className="relative">
          {/* Today line across all rows */}
          {scale.todayPct !== null && scale.todayPct >= 0 && scale.todayPct <= 100 && (
            <span
              className="pointer-events-none absolute bottom-0 top-0 z-10 w-px bg-brand/50"
              style={{ left: `calc(220px + (100% - 220px) * ${scale.todayPct / 100})` }}
              aria-hidden
            />
          )}
          {rows.map((c) => {
            const startPct = scale.pct(c.created_at) ?? 0;
            const endPct = scale.pct(effectiveDate(c)) ?? startPct;
            const left = Math.max(0, Math.min(startPct, endPct));
            const width = Math.max(MIN_BAR_PCT, Math.abs(endPct - startPct));
            const overdue = isOverdue(c.due_date) && c.state !== 'completed';
            const nextPct = scale.pct(c.next_action_date);
            const barTone =
              c.state === 'completed' ? 'bg-good' : overdue || c.state === 'blocked' ? 'bg-risk' : c.state === 'proof_submitted' ? 'bg-warn' : 'bg-brand';
            return (
              <div key={c.id} className="flex items-center border-b border-line last:border-0 hover:bg-canvas/40">
                <button type="button" onClick={() => onOpen(c.id)} className="w-[220px] shrink-0 truncate px-3 py-2.5 text-left text-[12.5px] font-medium text-ink hover:text-brand">
                  {c.title}
                </button>
                <div className="relative h-9 flex-1">
                  <div
                    className={`absolute top-1/2 h-4 -translate-y-1/2 overflow-hidden rounded ${barTone} cursor-pointer`}
                    style={{ left: `${left}%`, width: `${width}%` }}
                    onClick={() => onOpen(c.id)}
                    title={`${formatDate(c.created_at)} → ${formatDate(effectiveDate(c))} · ${c.progress}%`}
                  >
                    <span className="block h-full bg-white/25" style={{ width: `${100 - c.progress}%`, marginLeft: `${c.progress}%` }} />
                  </div>
                  {nextPct !== null && (
                    <span
                      className="absolute top-1/2 h-2.5 w-2.5 -translate-x-1/2 -translate-y-1/2 rotate-45 border border-surface bg-ink"
                      style={{ left: `${nextPct}%` }}
                      title={`Next action ${formatDate(c.next_action_date)}`}
                      aria-hidden
                    />
                  )}
                </div>
              </div>
            );
          })}
        </div>
        <p className="px-3 py-2 text-[11px] text-ink-4">Bar = start (created) → due · lighter tail = remaining · ◆ = next-action · vertical line = today</p>
      </div>
    </Panel>
  );
}
