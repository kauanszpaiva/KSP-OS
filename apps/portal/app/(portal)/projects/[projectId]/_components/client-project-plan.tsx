'use client';

import { useMemo, useState } from 'react';
import type { ClientSafeMilestone } from '../../../../../lib/client-safe-project';
import { ProgressiveList } from '../../../_components/progressive-list';

type PlanView = 'timeline' | 'gantt' | 'calendar' | 'roadmap';

const VIEW_OPTIONS: Array<{ id: PlanView; label: string; description: string }> = [
  { id: 'timeline', label: 'Timeline', description: 'Phases and milestones in order' },
  { id: 'gantt', label: 'Gantt', description: 'Schedule across time' },
  { id: 'calendar', label: 'Calendar', description: 'Milestones by date' },
  { id: 'roadmap', label: 'Roadmap', description: 'The path from now to completion' }
];

const STATUS_LABEL: Record<ClientSafeMilestone['status'], string> = {
  pending: 'Planned',
  in_progress: 'In progress',
  done: 'Completed',
  at_risk: 'Needs attention'
};

function parseDateOnly(value: string): Date {
  const [year, month, day] = value.split('-').map(Number);
  return new Date(year, month - 1, day, 12, 0, 0, 0);
}

function addDays(date: Date, days: number): Date {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

function diffDays(start: Date, end: Date): number {
  const ms = end.getTime() - start.getTime();
  return Math.max(0, Math.round(ms / 86_400_000));
}

function formatDate(value: string | null): string {
  if (!value) return 'Date to be confirmed';
  return new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric' }).format(parseDateOnly(value));
}

function statusClasses(status: ClientSafeMilestone['status']): string {
  if (status === 'done') return 'border-good/30 bg-good/10 text-good';
  if (status === 'in_progress') return 'border-brand/30 bg-brand/10 text-brand';
  if (status === 'at_risk') return 'border-warn/30 bg-warn/10 text-warn';
  return 'border-line bg-surface-2 text-ink-3';
}

function dotClasses(status: ClientSafeMilestone['status']): string {
  if (status === 'done') return 'bg-good';
  if (status === 'in_progress') return 'bg-brand';
  if (status === 'at_risk') return 'bg-warn';
  return 'bg-ink-4';
}

function TimelineView({ milestones }: { milestones: ClientSafeMilestone[] }) {
  return (
    <div className="relative" role="list" aria-label="Project timeline">
      <ProgressiveList initial={4}>
      {milestones.map((milestone, index) => (
        <div key={milestone.id} role="listitem" className="relative grid grid-cols-[28px_1fr] gap-3 border-t border-line py-3 first:border-t-0">
          <div className="relative flex justify-center">
            <span className={`mt-1.5 h-2.5 w-2.5 rounded-full ring-4 ring-surface ${dotClasses(milestone.status)}`} />
            {index < milestones.length - 1 && <span className="absolute top-4 bottom-[-12px] w-px bg-line" />}
          </div>
          <div className="min-w-0">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div>
                {milestone.phase && <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-ink-4">{milestone.phase}</p>}
                <p className="mt-0.5 text-[14px] font-medium text-ink">{milestone.title}</p>
              </div>
              <span className={`rounded-full border px-2 py-1 text-[11px] font-medium ${statusClasses(milestone.status)}`}>{STATUS_LABEL[milestone.status]}</span>
            </div>
            <p className="mt-1 text-[12px] text-ink-3">{formatDate(milestone.dueDate)}</p>
          </div>
        </div>
      ))}
      </ProgressiveList>
    </div>
  );
}

interface GanttItem extends ClientSafeMilestone {
  start: Date;
  end: Date;
}

function GanttView({ milestones }: { milestones: ClientSafeMilestone[] }) {
  const dated = milestones.filter((milestone): milestone is ClientSafeMilestone & { dueDate: string } => Boolean(milestone.dueDate));
  if (dated.length === 0) return <EmptyPlanView message="Dates will appear here as the schedule is confirmed." />;

  const items: GanttItem[] = dated.map((milestone, index) => {
    const end = parseDateOnly(milestone.dueDate);
    const previousEnd = index > 0 ? parseDateOnly(dated[index - 1].dueDate) : null;
    const inferredStart = previousEnd ? addDays(previousEnd, 1) : addDays(end, -6);
    const start = inferredStart.getTime() > end.getTime() ? end : inferredStart;
    return { ...milestone, start, end };
  });

  const windowStart = new Date(Math.min(...items.map((item) => item.start.getTime())));
  const windowEnd = new Date(Math.max(...items.map((item) => item.end.getTime())));
  const totalDays = Math.max(1, diffDays(windowStart, windowEnd) + 1);

  const markers = Array.from({ length: Math.min(5, totalDays) }, (_, index) => {
    const ratio = Math.min(1, index / Math.max(1, Math.min(5, totalDays) - 1));
    return addDays(windowStart, Math.round((totalDays - 1) * ratio));
  });

  return (
    <>
      <div className="divide-y divide-line md:hidden" role="list" aria-label="Project schedule">
        <ProgressiveList initial={4}>
          {items.map((item) => (
            <div key={item.id} role="listitem" className="flex min-h-11 items-center justify-between gap-3 py-3">
              <div className="min-w-0">
                <p className="truncate text-[13px] font-medium text-ink">{item.phase ?? item.title}</p>
                {item.phase && <p className="mt-0.5 truncate text-[11.5px] text-ink-4">{item.title}</p>}
              </div>
              <span className={`shrink-0 rounded-full border px-2 py-1 text-[11px] font-medium ${statusClasses(item.status)}`}>{formatDate(item.dueDate)}</span>
            </div>
          ))}
        </ProgressiveList>
      </div>
      <div className="hidden overflow-x-auto pb-1 md:block">
      <div className="min-w-[680px]">
        <div className="grid grid-cols-[180px_1fr] gap-4 border-b border-line pb-2">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-ink-4">Phase</span>
          <div className="flex justify-between text-[11px] text-ink-4">
            {markers.map((marker) => <span key={marker.toISOString()}>{new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric' }).format(marker)}</span>)}
          </div>
        </div>
        <div className="divide-y divide-line">
          {items.map((item) => {
            const left = (diffDays(windowStart, item.start) / totalDays) * 100;
            const width = ((diffDays(item.start, item.end) + 1) / totalDays) * 100;
            return (
              <div key={item.id} className="grid grid-cols-[180px_1fr] gap-4 py-3">
                <div className="min-w-0">
                  <p className="truncate text-[13px] font-medium text-ink">{item.phase ?? item.title}</p>
                  <p className="mt-0.5 truncate text-[11px] text-ink-4">{item.title}</p>
                </div>
                <div className="relative h-9 rounded-lg bg-surface-2" aria-label={`${item.title}, ${formatDate(item.dueDate)}`}>
                  <div className="absolute inset-y-0 left-1/4 w-px bg-line/70" />
                  <div className="absolute inset-y-0 left-1/2 w-px bg-line/70" />
                  <div className="absolute inset-y-0 left-3/4 w-px bg-line/70" />
                  <div
                    className={`absolute top-2 h-5 min-w-[24px] rounded-md border ${statusClasses(item.status)}`}
                    style={{ left: `${left}%`, width: `${Math.max(width, 4)}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>
      </div>
    </>
  );
}

function CalendarView({ milestones }: { milestones: ClientSafeMilestone[] }) {
  const dated = milestones.filter((milestone): milestone is ClientSafeMilestone & { dueDate: string } => Boolean(milestone.dueDate));
  if (dated.length === 0) return <EmptyPlanView message="Milestones will appear on the calendar once dates are confirmed." />;

  const focus = dated.find((milestone) => milestone.status === 'in_progress') ?? dated.find((milestone) => milestone.status === 'pending') ?? dated[dated.length - 1];
  const focusDate = parseDateOnly(focus.dueDate);
  const year = focusDate.getFullYear();
  const month = focusDate.getMonth();
  const first = new Date(year, month, 1, 12);
  const gridStart = addDays(first, -first.getDay());
  const cells = Array.from({ length: 42 }, (_, index) => addDays(gridStart, index));

  return (
    <div>
      <div className="mb-3 flex items-end justify-between gap-3">
        <h3 className="font-display text-[18px] font-semibold text-ink">{new Intl.DateTimeFormat('en-US', { month: 'long', year: 'numeric' }).format(focusDate)}</h3>
        <p className="text-[11px] text-ink-4">Milestone dates</p>
      </div>
      <div className="divide-y divide-line md:hidden" role="list" aria-label="Milestones in this calendar month">
        <ProgressiveList initial={4}>
          {dated.filter((milestone) => parseDateOnly(milestone.dueDate).getMonth() === month && parseDateOnly(milestone.dueDate).getFullYear() === year).map((milestone) => (
            <div key={milestone.id} role="listitem" className="flex min-h-11 items-center justify-between gap-3 py-3">
              <div className="min-w-0">
                <p className="truncate text-[13px] font-medium text-ink">{milestone.phase ?? milestone.title}</p>
                {milestone.phase && <p className="mt-0.5 truncate text-[11.5px] text-ink-4">{milestone.title}</p>}
              </div>
              <span className={`shrink-0 rounded-full border px-2 py-1 text-[11px] font-medium ${statusClasses(milestone.status)}`}>{formatDate(milestone.dueDate)}</span>
            </div>
          ))}
        </ProgressiveList>
      </div>
      <div className="hidden grid-cols-7 border-l border-t border-line text-center text-[10px] font-semibold uppercase tracking-wider text-ink-4 md:grid">
        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => <div key={day} className="border-b border-r border-line bg-surface-2 py-2">{day}</div>)}
      </div>
      <div className="hidden grid-cols-7 border-l border-line md:grid">
        {cells.map((date) => {
          const iso = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
          const dayMilestones = dated.filter((milestone) => milestone.dueDate === iso);
          const inMonth = date.getMonth() === month;
          return (
            <div key={iso} className={`min-h-[92px] border-b border-r border-line p-1.5 ${inMonth ? 'bg-surface' : 'bg-surface-2/60'}`}>
              <p className={`text-[11px] ${inMonth ? 'text-ink-3' : 'text-ink-4'}`}>{date.getDate()}</p>
              <div className="mt-1 space-y-1">
                {dayMilestones.map((milestone) => (
                  <div key={milestone.id} className={`rounded-md border px-1.5 py-1 text-left text-[10px] leading-tight ${statusClasses(milestone.status)}`} title={milestone.title}>
                    <span className="line-clamp-2">{milestone.phase ?? milestone.title}</span>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function RoadmapView({ milestones }: { milestones: ClientSafeMilestone[] }) {
  return (
    <>
      <div className="divide-y divide-line md:hidden" role="list" aria-label="Project roadmap">
        <ProgressiveList initial={4}>
          {milestones.map((milestone, index) => (
            <div key={milestone.id} role="listitem" className="grid min-h-11 grid-cols-[28px_1fr_auto] items-center gap-3 py-3">
              <span className={`flex h-7 w-7 items-center justify-center rounded-full border text-[11px] font-semibold ${statusClasses(milestone.status)}`}>{index + 1}</span>
              <div className="min-w-0">
                <p className="truncate text-[13px] font-medium text-ink">{milestone.title}</p>
                <p className="mt-0.5 truncate text-[11.5px] text-ink-4">{milestone.phase ?? `Stage ${index + 1}`}</p>
              </div>
              <span className="shrink-0 text-[11px] text-ink-4">{formatDate(milestone.dueDate)}</span>
            </div>
          ))}
        </ProgressiveList>
      </div>
      <ol className="hidden gap-3 md:grid md:grid-cols-2 xl:grid-cols-4" aria-label="Project roadmap">
        {milestones.map((milestone, index) => (
          <li key={milestone.id} className="relative rounded-xl border border-line bg-surface p-4">
            <div className="mb-4 flex items-center justify-between gap-3">
              <span className={`flex h-8 w-8 items-center justify-center rounded-full border text-[12px] font-semibold ${statusClasses(milestone.status)}`}>{index + 1}</span>
              <span className="text-[11px] text-ink-4">{formatDate(milestone.dueDate)}</span>
            </div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-ink-4">{milestone.phase ?? `Stage ${index + 1}`}</p>
            <p className="mt-1 text-[14px] font-medium text-ink">{milestone.title}</p>
            <p className="mt-3 text-[11px] font-medium text-ink-3">{STATUS_LABEL[milestone.status]}</p>
          </li>
        ))}
      </ol>
    </>
  );
}

function EmptyPlanView({ message }: { message: string }) {
  return (
    <div className="rounded-xl border border-dashed border-line-2 bg-surface-2 px-5 py-8 text-center">
      <p className="text-[13px] text-ink-3">{message}</p>
    </div>
  );
}

export function ClientProjectPlan({ milestones }: { milestones: ClientSafeMilestone[] }) {
  const [view, setView] = useState<PlanView>('timeline');
  const ordered = useMemo(() => [...milestones].sort((a, b) => a.sortOrder - b.sortOrder || (a.dueDate ?? '').localeCompare(b.dueDate ?? '')), [milestones]);

  return (
    <section aria-labelledby="project-plan-heading">
      <div className="mb-4 flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-ink-4">Project plan</p>
          <h2 id="project-plan-heading" className="mt-1 font-display text-[20px] font-semibold text-ink">Schedule &amp; progress</h2>
        </div>
        <p className="max-w-md text-[12px] text-ink-4">A simple view of phases, dates and progress. Internal implementation details are intentionally excluded.</p>
      </div>

      <div role="tablist" aria-label="Project plan views" className="mb-4 grid grid-cols-2 gap-1 rounded-xl border border-line bg-surface-2 p-1 sm:grid-cols-4">
        {VIEW_OPTIONS.map((option) => (
          <button
            key={option.id}
            type="button"
            role="tab"
            aria-selected={view === option.id}
            aria-controls={`project-plan-${option.id}`}
            onClick={() => setView(option.id)}
            className={`rounded-lg px-3 py-2 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand ${view === option.id ? 'bg-surface text-ink shadow-card' : 'text-ink-3 hover:text-ink'}`}
          >
            <span className="block text-[12.5px] font-semibold">{option.label}</span>
            <span className="mt-0.5 hidden text-[10.5px] text-ink-4 lg:block">{option.description}</span>
          </button>
        ))}
      </div>

      <div id={`project-plan-${view}`} role="tabpanel" tabIndex={0} className="rounded-2xl border border-line bg-surface p-3 shadow-card sm:p-5">
        {ordered.length === 0 ? (
          <EmptyPlanView message="The client-facing plan has not been published yet." />
        ) : view === 'timeline' ? (
          <TimelineView milestones={ordered} />
        ) : view === 'gantt' ? (
          <GanttView milestones={ordered} />
        ) : view === 'calendar' ? (
          <CalendarView milestones={ordered} />
        ) : (
          <RoadmapView milestones={ordered} />
        )}
      </div>
    </section>
  );
}
