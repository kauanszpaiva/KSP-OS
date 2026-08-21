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

type GanttZoom = 'compact' | 'standard' | 'detailed';

const ZOOM_CONFIG: Record<GanttZoom, { pxPerDay: number; markEvery: number; label: string }> = {
  compact: { pxPerDay: 5, markEvery: 14, label: '2 weeks' },
  standard: { pxPerDay: 9, markEvery: 7, label: 'Week' },
  detailed: { pxPerDay: 18, markEvery: 2, label: '2 days' }
};

function stateLabel(state: string): string {
  return state.replace(/_/g, ' ');
}

function GanttView({ items, dependencies }: { items: TimelineItem[]; dependencies: TimelineDependency[] }) {
  const [zoom, setZoom] = useState<GanttZoom>('standard');
  const zoomConfig = ZOOM_CONFIG[zoom];

  const { startDay, totalDays, marks } = useMemo(() => {
    const days = items.flatMap((i) => [parseDay(i.end), ...(i.start ? [parseDay(i.start)] : [])]);
    const today = parseDay(new Date().toISOString().slice(0, 10));
    const minDay = days.length > 0 ? Math.min(...days, today) : today;
    const maxDay = days.length > 0 ? Math.max(...days, today) : today;
    const start = minDay - 3;
    const total = Math.max(maxDay - start + 6, 21);
    const axisMarks: Array<{ day: number; label: string; month: string }> = [];
    for (let d = 0; d <= total; d += zoomConfig.markEvery) {
      const date = new Date((start + d) * 86_400_000);
      axisMarks.push({
        day: d,
        label: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        month: date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
      });
    }
    return { startDay: start, totalDays: total, marks: axisMarks };
  }, [items, zoomConfig.markEvery]);

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

  const stats = useMemo(() => {
    const durations = items.filter((item) => item.start && parseDay(item.start) < parseDay(item.end)).length;
    const milestones = items.length - durations;
    const overdue = items.filter((item) => isOverdue(item.end) && !['done', 'completed'].includes(item.state)).length;
    return { durations, milestones, overdue };
  }, [items]);

  const timelineWidth = Math.max(totalDays * zoomConfig.pxPerDay, 760);
  let lastGroup: string | undefined;

  return (
    <div className="rounded-xl border border-line bg-surface shadow-card">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line px-3 py-2.5 sm:px-4">
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-[11px] text-ink-3">
          <span><strong className="font-semibold text-ink-2">{items.length}</strong> items</span>
          <span><strong className="font-semibold text-ink-2">{stats.durations}</strong> ranges</span>
          <span><strong className="font-semibold text-ink-2">{stats.milestones}</strong> milestones</span>
          {stats.overdue > 0 && <span className="font-medium text-risk">{stats.overdue} overdue</span>}
        </div>
        <div className="flex items-center gap-1 rounded-lg border border-line bg-surface-2 p-0.5" aria-label="Gantt zoom">
          {(Object.keys(ZOOM_CONFIG) as GanttZoom[]).map((value) => (
            <button
              key={value}
              type="button"
              onClick={() => setZoom(value)}
              className={`rounded-md px-2.5 py-1 text-[10.5px] font-medium transition-colors ${zoom === value ? 'bg-surface text-ink shadow-sm' : 'text-ink-3 hover:text-ink'}`}
              title={`Timeline marks every ${ZOOM_CONFIG[value].label.toLowerCase()}`}
            >
              {value === 'compact' ? 'Compact' : value === 'standard' ? 'Week' : 'Detail'}
            </button>
          ))}
        </div>
      </div>

      <div className="overflow-x-auto">
        <div className="relative" style={{ minWidth: `${timelineWidth + 360}px` }}>
          <div className="sticky top-0 z-30 flex h-11 border-b border-line bg-surface/95 backdrop-blur-sm">
            <div className="sticky left-0 z-40 flex w-[300px] shrink-0 items-center border-r border-line bg-surface px-3 text-[10px] font-semibold uppercase tracking-[0.12em] text-ink-4 sm:w-[340px]">
              Project / milestone
            </div>
            <div className="relative" style={{ width: `${timelineWidth}px` }}>
              {marks.map((mark) => (
                <div
                  key={mark.day}
                  className="absolute bottom-0 top-0 border-l border-line/70"
                  style={{ left: `${(mark.day / totalDays) * 100}%` }}
                >
                  <span className="absolute left-1.5 top-1.5 whitespace-nowrap text-[10.5px] font-medium text-ink-3">{mark.label}</span>
                </div>
              ))}
            </div>
            <div className="sticky right-0 z-40 flex w-20 shrink-0 items-center justify-end border-l border-line bg-surface px-3 text-[10px] font-semibold uppercase tracking-[0.12em] text-ink-4">
              Due
            </div>
          </div>

          <div className="relative">
            {todayOffset !== null && (
              <span
                className="pointer-events-none absolute bottom-0 top-0 z-20 w-px bg-brand/60"
                style={{ left: `calc(300px + ${todayOffset}% * ${timelineWidth / 100})` }}
                aria-hidden
              />
            )}

            {items.map((item) => {
              const endDay = parseDay(item.end) - startDay;
              const startDayOffset = item.start ? parseDay(item.start) - startDay : null;
              const hasRange = startDayOffset !== null && startDayOffset < endDay;
              const overdue = isOverdue(item.end) && !['done', 'completed'].includes(item.state);
              const waitsOn = dependentsByToId.get(item.id);
              const showGroupHeader = item.groupLabel && item.groupLabel !== lastGroup;
              if (item.groupLabel) lastGroup = item.groupLabel;

              return (
                <div key={item.id}>
                  {showGroupHeader && (
                    <div className="sticky left-0 z-20 flex h-7 items-center border-b border-line bg-surface-2 px-3 text-[10px] font-semibold uppercase tracking-[0.11em] text-ink-4">
                      {item.groupLabel}
                    </div>
                  )}

                  <div className="group flex min-h-12 border-b border-line last:border-b-0 hover:bg-surface-2/45">
                    <div className="sticky left-0 z-10 flex w-[300px] shrink-0 items-center border-r border-line bg-surface px-3 py-2 group-hover:bg-surface-2 sm:w-[340px]">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className={`h-2 w-2 shrink-0 rounded-full ${stateToneDotClass(item.state)}`} aria-hidden />
                          <p className="truncate text-[12.5px] font-semibold text-ink">{item.title}</p>
                        </div>
                        <div className="mt-0.5 flex min-w-0 items-center gap-2 pl-4 text-[10.5px] text-ink-3">
                          <span className="truncate">{item.subtitle}</span>
                          <span className="shrink-0 capitalize text-ink-4">{stateLabel(item.state)}</span>
                        </div>
                        {waitsOn && waitsOn.length > 0 && (
                          <div className="mt-1 truncate pl-4 text-[10px] text-ink-4" title={`Waits on ${waitsOn.join(', ')}`}>
                            ↳ waits on {waitsOn.join(', ')}
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="relative min-h-12" style={{ width: `${timelineWidth}px` }}>
                      {marks.map((mark) => (
                        <span
                          key={mark.day}
                          className="pointer-events-none absolute bottom-0 top-0 border-l border-line/45"
                          style={{ left: `${(mark.day / totalDays) * 100}%` }}
                          aria-hidden
                        />
                      ))}

                      {todayOffset !== null && (
                        <span
                          className="pointer-events-none absolute bottom-0 top-0 z-10 w-px bg-brand/55"
                          style={{ left: `${todayOffset}%` }}
                          aria-hidden
                        >
                          <span className="absolute -top-5 left-1/2 -translate-x-1/2 rounded-full bg-brand px-1.5 py-0.5 text-[9px] font-semibold text-on-brand first:block hidden">
                            Today
                          </span>
                        </span>
                      )}

                      {hasRange ? (
                        <div
                          className={`absolute top-1/2 z-10 h-5 -translate-y-1/2 rounded-md ${stateToneDotClass(item.state)} ${overdue ? 'ring-2 ring-risk/35' : ''} shadow-sm`}
                          style={{
                            left: `${(startDayOffset / totalDays) * 100}%`,
                            width: `${Math.max(((endDay - startDayOffset) / totalDays) * 100, 1.4)}%`
                          }}
                          title={`${item.title} — ${formatDate(item.start ?? null)} → ${formatDate(item.end)}`}
                        >
                          <span className="absolute inset-y-0 right-1.5 flex items-center text-[9px] font-semibold text-white/90">
                            {Math.max(endDay - startDayOffset, 1)}d
                          </span>
                        </div>
                      ) : (
                        <span
                          className={`absolute top-1/2 z-10 h-3.5 w-3.5 -translate-x-1/2 -translate-y-1/2 rotate-45 rounded-[3px] ${stateToneDotClass(item.state)} ${overdue ? 'ring-2 ring-risk/40' : ''} shadow-sm`}
                          style={{ left: `${(endDay / totalDays) * 100}%` }}
                          title={`${item.title} — ${formatDate(item.end)}`}
                        />
                      )}
                    </div>

                    <div className={`sticky right-0 z-10 flex w-20 shrink-0 items-center justify-end border-l border-line bg-surface px-3 text-[11px] group-hover:bg-surface-2 ${overdue ? 'font-semibold text-risk' : 'text-ink-3'}`}>
                      {formatDate(item.end)}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 border-t border-line px-3 py-2 text-[10px] text-ink-4 sm:px-4">
        <span className="inline-flex items-center gap-1.5"><span className="h-2.5 w-5 rounded-sm bg-brand" /> Duration</span>
        <span className="inline-flex items-center gap-1.5"><span className="h-2.5 w-2.5 rotate-45 rounded-[2px] bg-ink-4" /> Milestone</span>
        <span className="inline-flex items-center gap-1.5"><span className="h-3 w-px bg-brand/60" /> Today</span>
        <span className="ml-auto">Drag horizontally to inspect the timeline</span>
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
