'use client';

import { useMemo, useState } from 'react';
import { Reveal, Segmented } from '@ksp/ui';
import { formatDate, isOverdue } from '../../../lib/format';
import { StatePill, stateToneDotClass } from './ui';

export interface ScheduleItem {
  id: string;
  title: string;
  subtitle: string;
  date: string;
  state: string;
}

function monthKey(date: string): string {
  return date.slice(0, 7);
}

function monthLabel(key: string): string {
  const [year, month] = key.split('-').map(Number);
  return new Date(year, month - 1, 1).toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
}

function parseDay(date: string): number {
  return Math.floor(new Date(`${date}T00:00:00Z`).getTime() / 86_400_000);
}

/**
 * A date-axis timeline, not a duration-bar Gantt chart — commitments and
 * milestones only carry a single due_date/next_action_date each, no start
 * date, so there is no real "duration" to draw a bar's length from. Rather
 * than fabricate one, each item renders as a marker positioned by date
 * along a shared horizontal axis. Labeled "Gantt" per Kauan's own naming,
 * documented honestly here and in docs/rebuild/command/03_execution_section.md
 * as a date-axis view, not a critical-path/duration chart — that still
 * needs a start-date column this phase doesn't add.
 */
function GanttView({ items }: { items: ScheduleItem[] }) {
  const { startDay, totalDays, weekMarks } = useMemo(() => {
    const days = items.map((i) => parseDay(i.date));
    const minDay = Math.min(...days);
    const maxDay = Math.max(...days);
    const start = minDay - 2;
    const total = Math.max(maxDay - start + 3, 14);
    const marks: Array<{ day: number; label: string }> = [];
    for (let d = 0; d <= total; d += 7) {
      const date = new Date((start + d) * 86_400_000);
      marks.push({ day: d, label: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) });
    }
    return { startDay: start, totalDays: total, weekMarks: marks };
  }, [items]);

  return (
    <div className="overflow-x-auto rounded-xl border border-line bg-surface">
      <div style={{ minWidth: `${Math.max(totalDays * 10, 640)}px` }}>
        <div className="relative h-8 border-b border-line">
          {weekMarks.map((mark) => (
            <span
              key={mark.day}
              className="absolute top-0 -translate-x-1/2 whitespace-nowrap px-1 pt-2 text-[10.5px] text-ink-4"
              style={{ left: `${(mark.day / totalDays) * 100}%` }}
            >
              {mark.label}
            </span>
          ))}
        </div>
        <div className="space-y-0">
          {items.map((item, i) => {
            const day = parseDay(item.date) - startDay;
            const overdue = isOverdue(item.date) && item.state !== 'done' && item.state !== 'completed';
            return (
              <div key={item.id} className="relative flex items-center gap-3 border-t border-line px-3 py-2 first:border-t-0">
                <div className="w-40 shrink-0 truncate text-[12.5px] text-ink-2 sm:w-56">
                  <span className="font-medium text-ink">{item.title}</span>
                  <span className="text-ink-4"> · {item.subtitle}</span>
                </div>
                <div className="relative h-5 flex-1">
                  <span
                    className={`absolute top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full ${stateToneDotClass(item.state)} ${overdue ? 'ring-2 ring-risk/40' : ''} h-2.5 w-2.5`}
                    style={{ left: `${(day / totalDays) * 100}%` }}
                    title={`${item.title} — ${formatDate(item.date)}`}
                  />
                </div>
                <span className={`tnum w-16 shrink-0 text-right text-[11.5px] ${overdue ? 'font-medium text-risk' : 'text-ink-3'}`}>{formatDate(item.date)}</span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function ListView({ items }: { items: ScheduleItem[] }) {
  const byMonth = new Map<string, ScheduleItem[]>();
  for (const item of items) {
    const key = monthKey(item.date);
    const arr = byMonth.get(key) ?? [];
    arr.push(item);
    byMonth.set(key, arr);
  }

  return (
    <div className="relative space-y-9 pl-6">
      <span className="absolute bottom-2 left-[7px] top-2 w-px bg-line" aria-hidden />
      {[...byMonth.entries()].map(([month, monthItems], i) => (
        <Reveal key={month} delay={i * 50}>
          <div className="relative mb-3">
            <span className="absolute -left-[22px] top-1 h-3 w-3 rounded-full bg-brand ring-4 ring-canvas" aria-hidden />
            <h2 className="font-display text-[15px] font-semibold text-ink">{monthLabel(month)}</h2>
          </div>
          <div className="space-y-2">
            {monthItems.map((item) => {
              const overdue = isOverdue(item.date) && !['done', 'completed'].includes(item.state);
              return (
                <div
                  key={item.id}
                  className="flex items-center justify-between gap-3 rounded-lg border border-line bg-surface px-4 py-2.5 transition-colors duration-fast hover:bg-surface-2"
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[13.5px] font-medium text-ink">{item.title}</p>
                    <p className="truncate text-[11.5px] text-ink-3">{item.subtitle}</p>
                  </div>
                  <div className="flex shrink-0 items-center gap-3">
                    <StatePill state={item.state} />
                    <span className={`tnum text-[12px] ${overdue ? 'font-medium text-risk' : 'text-ink-3'}`}>{formatDate(item.date)}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </Reveal>
      ))}
    </div>
  );
}

export function ScheduleView({ items }: { items: ScheduleItem[] }) {
  const [view, setView] = useState<'list' | 'gantt'>('list');
  return (
    <div>
      <div className="mb-5">
        <Segmented
          items={[
            { value: 'list', label: 'List' },
            { value: 'gantt', label: 'Gantt' }
          ]}
          value={view}
          onValueChange={(v) => setView(v as 'list' | 'gantt')}
        />
      </div>
      {view === 'list' ? <ListView items={items} /> : <GanttView items={items} />}
    </div>
  );
}
