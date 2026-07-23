'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Reveal, Segmented } from '@ksp/ui';
import { formatDate, isOverdue } from '../../../lib/format';
import type { CommentView, MemberRef, TaskView } from '../data';
import { updateTaskStatus } from '../actions';
import { EmptyState, Panel, SectionLabel } from './ui';
import { Board, type BoardColumn } from './board-view';
import { CalendarView, type CalendarItem } from './calendar-view';
import { CompleteTaskForm, TaskReassignForm, TaskStatusForm } from './mission-workspace-forms';
import { CommentThread } from './comment-thread';

function TaskRow({ task, members, comments }: { task: TaskView; members: MemberRef[]; comments: CommentView[] }) {
  const overdue = isOverdue(task.due_date);
  return (
    <details className="group border-t border-line transition-colors duration-fast first:border-t-0 hover:bg-surface-2/60 open:bg-canvas/60">
      <summary className="flex flex-wrap cursor-pointer list-none items-center justify-between gap-3 px-4 py-3 marker:hidden [&::-webkit-details-marker]:hidden">
        <div className="min-w-0 flex-1">
          <p className="truncate text-[14px] font-medium text-ink">{task.title}</p>
          <p className="mt-0.5 text-[12px] text-ink-3">
            {task.ownerName}
            {task.projectName ? ` · ${task.projectName}` : ''}
            {task.due_date && <span className={overdue ? 'text-risk' : ''}> · due {formatDate(task.due_date)}</span>}
            {task.blocked && <span className="text-risk"> · blocked</span>}
            {comments.length > 0 && <span> · {comments.length} comment{comments.length === 1 ? '' : 's'}</span>}
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-1">
          <TaskStatusForm id={task.id} blocked={task.blocked} />
          <CompleteTaskForm id={task.id} />
        </div>
      </summary>
      <div className="space-y-3 px-4 pb-4">
        <TaskReassignForm id={task.id} ownerId={task.owner_id} members={members} />
        <div className="border-t border-line pt-3">
          <CommentThread objectTable="tasks" objectId={task.id} comments={comments} />
        </div>
      </div>
    </details>
  );
}

function ListView({
  tasks,
  members,
  commentsByTask
}: {
  tasks: TaskView[];
  members: MemberRef[];
  commentsByTask: Map<string, CommentView[]>;
}) {
  const open = tasks.filter((t) => t.status === 'active' && !t.blocked);
  const blocked = tasks.filter((t) => t.status === 'active' && t.blocked);
  const done = tasks.filter((t) => t.status !== 'active');

  return (
    <div className="space-y-8">
      {blocked.length > 0 && (
        <Reveal>
          <SectionLabel right={<span className="tnum text-[12px] text-risk">{blocked.length}</span>}>Blocked</SectionLabel>
          <Panel>
            {blocked.map((t) => (
              <TaskRow key={t.id} task={t} members={members} comments={commentsByTask.get(t.id) ?? []} />
            ))}
          </Panel>
        </Reveal>
      )}
      <Reveal delay={60}>
        <SectionLabel right={<span className="tnum text-[12px] text-ink-3">{open.length}</span>}>Open</SectionLabel>
        {open.length === 0 ? (
          <p className="rounded-lg border border-line bg-surface px-4 py-5 text-[13px] text-ink-3">Nothing open.</p>
        ) : (
          <Panel>
            {open.map((t) => (
              <TaskRow key={t.id} task={t} members={members} comments={commentsByTask.get(t.id) ?? []} />
            ))}
          </Panel>
        )}
      </Reveal>
      {done.length > 0 && (
        <Reveal delay={120}>
          <SectionLabel right={<span className="tnum text-[12px] text-ink-3">{done.length}</span>}>Done</SectionLabel>
          <Panel>
            {done.map((t) => (
              <TaskRow key={t.id} task={t} members={members} comments={commentsByTask.get(t.id) ?? []} />
            ))}
          </Panel>
        </Reveal>
      )}
    </div>
  );
}

/**
 * "Column" here is a derived bucket (status + blocked), not a single DB
 * field — movement reuses the exact same TaskStatusForm/CompleteTaskForm
 * the List view already uses (mark blocked/unblock, mark done) rather than
 * a generic move-to-any-column control, since there's no single status
 * value a Board could set directly. There's no "reopen a done task" action
 * in either view today — Done has no exit control, matching existing
 * behavior.
 */
function BoardViewForWorkspace({ tasks, commentsByTask }: { tasks: TaskView[]; commentsByTask: Map<string, CommentView[]> }) {
  const router = useRouter();
  const columns: BoardColumn<TaskView>[] = [
    { value: 'blocked', label: 'Blocked', items: tasks.filter((t) => t.status === 'active' && t.blocked) },
    { value: 'open', label: 'Open', items: tasks.filter((t) => t.status === 'active' && !t.blocked) },
    { value: 'done', label: 'Done', items: tasks.filter((t) => t.status !== 'active') }
  ];

  // Dragging a card to a column maps to the same task mutation the inline
  // controls use (mark done / block / unblock), then refreshes the server
  // components so RLS-scoped data re-renders. A same-column drop never fires.
  async function moveTask(task: TaskView, toColumn: string) {
    const fd = new FormData();
    fd.set('id', task.id);
    if (toColumn === 'done') {
      fd.set('status', 'archived');
    } else if (toColumn === 'blocked') {
      fd.set('status', 'active');
      fd.set('blocked', 'true');
    } else {
      fd.set('status', 'active');
      fd.set('blocked', 'false');
    }
    await updateTaskStatus({ ok: false }, fd);
    router.refresh();
  }

  return (
    <Board
      columns={columns}
      onDropItem={moveTask}
      renderCard={(task) => {
        const overdue = isOverdue(task.due_date);
        const comments = commentsByTask.get(task.id) ?? [];
        return (
          <div className="space-y-2">
            <p className="truncate text-[13px] font-medium text-ink">{task.title}</p>
            <p className="truncate text-[11px] text-ink-3">
              {task.ownerName}
              {task.projectName ? ` · ${task.projectName}` : ''}
              {comments.length > 0 && ` · ${comments.length} comment${comments.length === 1 ? '' : 's'}`}
            </p>
            {task.due_date && (
              <p className={`tnum text-[11px] ${overdue ? 'font-medium text-risk' : 'text-ink-4'}`}>due {formatDate(task.due_date)}</p>
            )}
            {task.status === 'active' && (
              <div className="flex items-center gap-1 border-t border-line pt-2">
                <TaskStatusForm id={task.id} blocked={task.blocked} />
                <CompleteTaskForm id={task.id} />
              </div>
            )}
          </div>
        );
      }}
    />
  );
}

function CalendarViewForWorkspace({ tasks }: { tasks: TaskView[] }) {
  const items: CalendarItem[] = tasks
    .filter((t): t is TaskView & { due_date: string } => Boolean(t.due_date))
    .map((t) => ({
      id: t.id,
      title: t.title,
      subtitle: t.ownerName,
      date: t.due_date,
      state: t.status === 'active' ? (t.blocked ? 'blocked' : 'open') : 'done'
    }));
  return <CalendarView items={items} />;
}

export function WorkspaceView({
  tasks,
  members,
  commentsByTask
}: {
  tasks: TaskView[];
  members: MemberRef[];
  commentsByTask: Map<string, CommentView[]>;
}) {
  const [view, setView] = useState<'list' | 'board' | 'calendar'>('list');

  if (tasks.length === 0) {
    return <EmptyState icon="workspace" title="No tasks yet." hint="Anything that isn't a full commitment can still live here." />;
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
      {view === 'list' && <ListView tasks={tasks} members={members} commentsByTask={commentsByTask} />}
      {view === 'board' && <BoardViewForWorkspace tasks={tasks} commentsByTask={commentsByTask} />}
      {view === 'calendar' && <CalendarViewForWorkspace tasks={tasks} />}
    </div>
  );
}
