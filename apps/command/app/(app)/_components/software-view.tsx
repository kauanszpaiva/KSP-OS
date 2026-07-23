'use client';

import { useState } from 'react';
import { Reveal, Segmented } from '@ksp/ui';
import { formatDate, isOverdue } from '../../../lib/format';
import type { TaskView } from '../data';
import { EmptyState, Panel, SectionLabel } from './ui';
import { Board, type BoardColumn } from './board-view';
import { CalendarView, type CalendarItem } from './calendar-view';
import { TaskLinkForm } from './control-forms';

function ListView({ tasks }: { tasks: TaskView[] }) {
  const open = tasks.filter((t) => t.status === 'active');
  const blocked = open.filter((t) => t.blocked);
  const inFlight = open.filter((t) => !t.blocked);

  return (
    <div className="space-y-8">
      {blocked.length > 0 && (
        <Reveal>
          <SectionLabel right={<span className="tnum text-[12px] text-risk">{blocked.length}</span>}>Blocked</SectionLabel>
          <Panel className="divide-y divide-line">
            {blocked.map((t) => (
              <div key={t.id} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[14px] font-medium text-ink">{t.title}</p>
                  <p className="mt-0.5 text-[12px] text-ink-3">
                    {t.ownerName}
                    {t.projectName ? ` · ${t.projectName}` : ''}
                  </p>
                </div>
                <TaskLinkForm id={t.id} currentLink={t.link} />
              </div>
            ))}
          </Panel>
        </Reveal>
      )}

      <Reveal delay={60}>
        <SectionLabel right={<span className="tnum text-[12px] text-ink-3">{inFlight.length}</span>}>In flight</SectionLabel>
        {inFlight.length === 0 ? (
          <p className="rounded-lg border border-line bg-surface px-4 py-5 text-[13px] text-ink-3">Nothing open.</p>
        ) : (
          <Panel className="divide-y divide-line">
            {inFlight.map((t) => {
              const overdue = isOverdue(t.due_date);
              return (
                <div key={t.id} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[14px] font-medium text-ink">{t.title}</p>
                    <p className="mt-0.5 text-[12px] text-ink-3">
                      {t.ownerName}
                      {t.projectName ? ` · ${t.projectName}` : ''}
                      {t.due_date && <span className={overdue ? 'text-risk' : ''}> · due {formatDate(t.due_date)}</span>}
                    </p>
                  </div>
                  <TaskLinkForm id={t.id} currentLink={t.link} />
                </div>
              );
            })}
          </Panel>
        )}
      </Reveal>
    </div>
  );
}

/**
 * Software has no reassignment/comments UI (unlike Workspace) — this Board
 * is a thin wrapper over the same shared `Board` primitive, not a reuse of
 * `WorkspaceView`, so it doesn't gain scope Software never asked for. Cards
 * reuse the exact same `TaskLinkForm` the List view already used.
 */
function BoardViewForSoftware({ tasks }: { tasks: TaskView[] }) {
  const columns: BoardColumn<TaskView>[] = [
    { value: 'blocked', label: 'Blocked', items: tasks.filter((t) => t.status === 'active' && t.blocked) },
    { value: 'in_flight', label: 'In flight', items: tasks.filter((t) => t.status === 'active' && !t.blocked) },
    { value: 'done', label: 'Done', items: tasks.filter((t) => t.status !== 'active') }
  ];

  return (
    <Board
      columns={columns}
      renderCard={(t) => {
        const overdue = isOverdue(t.due_date);
        return (
          <div className="space-y-2">
            <p className="truncate text-[13px] font-medium text-ink">{t.title}</p>
            <p className="truncate text-[11px] text-ink-3">
              {t.ownerName}
              {t.projectName ? ` · ${t.projectName}` : ''}
            </p>
            {t.due_date && <p className={`tnum text-[11px] ${overdue ? 'font-medium text-risk' : 'text-ink-4'}`}>due {formatDate(t.due_date)}</p>}
            {t.status === 'active' && (
              <div className="border-t border-line pt-2">
                <TaskLinkForm id={t.id} currentLink={t.link} />
              </div>
            )}
          </div>
        );
      }}
    />
  );
}

function CalendarViewForSoftware({ tasks }: { tasks: TaskView[] }) {
  const items: CalendarItem[] = tasks
    .filter((t): t is TaskView & { due_date: string } => Boolean(t.due_date))
    .map((t) => ({ id: t.id, title: t.title, subtitle: t.ownerName, date: t.due_date, state: t.status === 'active' ? (t.blocked ? 'blocked' : 'open') : 'done' }));
  return <CalendarView items={items} />;
}

export function SoftwareView({ tasks }: { tasks: TaskView[] }) {
  const [view, setView] = useState<'list' | 'board' | 'calendar'>('list');

  if (tasks.length === 0) {
    return <EmptyState icon="software" title="Nothing in the queue." hint="Tasks created in Workspace will surface here too — this is the same list, dev-focused." />;
  }

  return (
    <div>
      <div className="mb-5">
        <Segmented
          items={[
            { value: 'list', label: 'List' },
            { value: 'board', label: 'Board' },
            { value: 'calendar', label: 'Calendar' }
          ]}
          value={view}
          onValueChange={(v) => setView(v as 'list' | 'board' | 'calendar')}
        />
      </div>
      {view === 'list' && <ListView tasks={tasks} />}
      {view === 'board' && <BoardViewForSoftware tasks={tasks} />}
      {view === 'calendar' && <CalendarViewForSoftware tasks={tasks} />}
    </div>
  );
}
