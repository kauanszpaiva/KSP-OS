'use client';

import { useMemo, useState } from 'react';
import { Reveal, Segmented } from '@ksp/ui';
import { formatDate, isOverdue } from '../../../lib/format';
import { StatePill, stateToneDotClass } from './ui';

export interface TimelineItem {
  id: string;
  title: string;
  subtitle: string;
  /** Optional — when present alongside `end` and distinct from it, renders a real duration bar. */
  start?: string | null;
  /** The anchor date (due_date/next_action_date/etc.) — always present, even for point-in-time items. */
  end: string;
  state: string;
  /** Optional row grouping (e.g. by mission) — renders a divider header when more than one distinct label is present. */
  groupLabel?: string;
}

/** `fromId` must happen before `toId` — mirrors mission_dependencies' project→depends_on_project_id shape. */
export interface TimelineDependency {
  fromId: string;
  toId: string;
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
 * Date-axis Gantt: renders a real duration bar when an item has a `start`
 * distinct from its `end` (only true for missions/tasks post-migration
 * 202607230009), and falls back to the original marker-dot rendering for
 * every item that only carries a single point-in-time date (commitments
 * and anything else not covered by that migration) — the same honest
 * fallback this component has used since Phase C3.6, just no longer the
 * only rendering path.
 *
 * Dependencies render as a small inline "waits on: …" annotation on the
 * dependent row rather than a drawn elbow connector between rows — a
 * pixel-accurate connector (matching the ClickUp/Asana screenshots
 * exactly) needs real DOM measurement (ResizeObserver/getBoundingClientRect
 * across a scrollable, variable-width axis), not pure data math; this is a
 * stated v1 simplification, not a silent gap.
 */
function GanttView({ items, dependencies }: { items: TimelineItem[]; dependencies: TimelineDependency[] }) {
  const { startDay, totalDays, weekMarks } = useMemo(() => {
    const days = items.flatMap((i) => [parseDay(i.end), ...(i.start ? [parseDay(i.start)] : [])]);
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

  const dependentsByToId = useMemo(() => {
    const byId = new Map(items.map((i) => [i.id, i]));
    const map = new Map<string, string[]>();
    for (const dep of dependencies) {
      const from = byId.get(dep.fromId);
      if (!from) continue;
      const arr = map.get(dep.toId) ?? [];
      arr.push(from.title);
      map.set(dep.toId, arr);
    }
    return map;
  }, [items, dependencies]);

  const todayOffset = useMemo(() => {
    const t = parseDay(new Date().toISOString().slice(0, 10)) - startDay;
    return t >= 0 && t <= totalDays ? (t / totalDays) * 100 : null;
  }, [startDay, totalDays]);

  let lastGroup: string | undefined;

  return (
    <div className="overflow-x-auto rounded-xl border border-line bg-surface">
      <div className="relative" style={{ minWidth: `${Math.max(totalDays * 10, 640)}px` }}>
        {todayOffset !== null && (
          <span className="pointer-events-none absolute bottom-0 top-8 z-10 w-px bg-brand/40" style={{ left: `${todayOffset}%` }} aria-hidden>
            <span className="absolute -top-[7px] left-1/2 -translate-x-1/2 rounded-full bg-brand px-1.5 py-0.5 text-[9px] font-semibold text-on-brand">
              Today
            </span>
          </span>
        )}
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
            const endDay = parseDay(item.end) - startDay;
            const startDayOffset = item.start ? parseDay(item.start) - startDay : null;
            const hasRange = startDayOffset !== null && startDayOffset < endDay;
            const overdue = isOverdue(item.end) && item.state !== 'done' && item.state !== 'completed';
            const waitsOn = dependentsByToId.get(item.id);
            const showGroupHeader = item.groupLabel && item.groupLabel !== lastGroup;
            if (item.groupLabel) lastGroup = item.groupLabel;
            return (
              <div key={item.id}>
                {showGroupHeader && (
                  <div className="border-t border-line bg-surface-2/60 px-3 py-1 text-[10.5px] font-semibold uppercase tracking-wider text-ink-4">
                    {item.groupLabel}
                  </div>
                )}
                <div className="relative flex h-11 items-center gap-3 border-t border-line px-3 transition-colors duration-fast first:border-t-0 hover:bg-surface-2/60">
                  <div className="w-40 shrink-0 truncate text-[12.5px] text-ink-2 sm:w-56">
                    <span className="font-medium text-ink">{item.title}</span>
                    <span className="text-ink-4"> · {item.subtitle}</span>
                    {waitsOn && waitsOn.length > 0 && (
                      <span className="mt-0.5 flex items-center gap-1">
                        <span className="inline-flex max-w-full items-center gap-1 truncate rounded-full bg-surface-2 px-1.5 py-0.5 text-[10px] font-medium text-ink-3">
                          ⛓ {waitsOn.join(', ')}
                        </span>
                      </span>
                    )}
                  </div>
                  <div className="relative h-5 flex-1">
                    {hasRange ? (
                      <span
                        className={`absolute top-1/2 -translate-y-1/2 rounded-full bg-gradient-to-r from-white/25 to-transparent shadow-sm ${stateToneDotClass(item.state)} ${overdue ? 'ring-2 ring-risk/40' : ''} h-3.5`}
                        style={{ left: `${(startDayOffset / totalDays) * 100}%`, width: `${Math.max(((endDay - startDayOffset) / totalDays) * 100, 1.2)}%` }}
                        title={`${item.title} — ${formatDate(item.start ?? null)} → ${formatDate(item.end)}`}
                      />
                    ) : (
                      <span
                        className={`absolute top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-gradient-to-br from-white/30 to-transparent shadow-sm ring-2 ring-surface ${stateToneDotClass(item.state)} ${overdue ? 'ring-risk/50' : ''} h-3 w-3`}
                        style={{ left: `${(endDay / totalDays) * 100}%` }}
                        title={`${item.title} — ${formatDate(item.end)}`}
                      />
                    )}
                  </div>
                  <span className={`tnum w-16 shrink-0 text-right text-[11.5px] ${overdue ? 'font-medium text-risk' : 'text-ink-3'}`}>{formatDate(item.end)}</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function ListView({ items }: { items: TimelineItem[] }) {
  const byMonth = new Map<string, TimelineItem[]>();
  for (const item of items) {
    const key = monthKey(item.end);
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
              const overdue = isOverdue(item.end) && !['done', 'completed'].includes(item.state);
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
                    <span className={`tnum text-[12px] ${overdue ? 'font-medium text-risk' : 'text-ink-3'}`}>{formatDate(item.end)}</span>
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

export function TimelineView({ items, dependencies = [] }: { items: TimelineItem[]; dependencies?: TimelineDependency[] }) {
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
      {view === 'list' ? <ListView items={items} /> : <GanttView items={items} dependencies={dependencies} />}
    </div>
  );
}
