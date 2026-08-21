'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Avatar, Icon, Reveal, Segmented } from '@ksp/ui';
import { formatDate, isOverdue } from '../../../lib/format';
import type { CommentView, MemberRef, TaskView } from '../data';
import { updateTaskStatus } from '../actions';
import { EmptyState, Panel, SectionLabel, StatePill } from './ui';
import { Board, type BoardColumn } from './board-view';
import { CalendarView, type CalendarItem } from './calendar-view';
import { CompleteTaskForm, TaskReassignForm, TaskStatusForm } from './mission-workspace-forms';
import { CommentThread } from './comment-thread';
import { DeleteButton } from './crud-forms';
import { deleteTask } from '../actions';

function TaskRow({ task, members, comments }: { task: TaskView; members: MemberRef[]; comments: CommentView[] }) {
  const overdue = isOverdue(task.due_date);
  const active = task.status === 'active';
  return (
    <details className="group border-t border-line transition-colors duration-fast first:border-t-0 hover:bg-surface-2/45 open:bg-canvas/55">
      <summary className="grid cursor-pointer list-none grid-cols-[auto_minmax(0,1fr)_auto] items-start gap-2.5 px-3 py-3 marker:hidden sm:px-4 [&::-webkit-details-marker]:hidden">
        <Avatar name={task.ownerName} size="sm" />
        <div className="min-w-0">
          <p className="truncate text-[13.5px] font-medium leading-tight text-ink sm:text-[14px]">{task.title}</p>
          <p className="mt-1 line-clamp-1 text-[11.5px] text-ink-3 sm:text-[12px]">
            {task.ownerName}
            {task.projectName ? ` · ${task.projectName}` : ''}
            {task.due_date && <span className={overdue ? 'font-medium text-risk' : ''}> · due {formatDate(task.due_date)}</span>}
            {comments.length > 0 && <span> · {comments.length} comment{comments.length === 1 ? '' : 's'}</span>}
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          {task.blocked ? <StatePill state="blocked" /> : overdue && active ? <span className="text-[11.5px] font-medium text-risk">Overdue</span> : <StatePill state={active ? 'open' : 'done'} />}
          <Icon name="chevron-down" className="h-4 w-4 text-ink-4 transition-transform group-open:rotate-180" />
        </div>
      </summary>
      <div className="space-y-3 border-t border-line px-3 pb-3 pt-3 sm:px-4 sm:pb-4">
        <div className="flex flex-wrap items-center gap-2">
          {active && <TaskStatusForm id={task.id} blocked={task.blocked} />}
          {active && <CompleteTaskForm id={task.id} />}
          <TaskReassignForm id={task.id} ownerId={task.owner_id} members={members} />
          <DeleteButton action={deleteTask} id={task.id} label="Delete task" confirmText={`Delete task "${task.title}"? This can't be undone.`} />
        </div>
        {comments.length > 0 && (
          <div className="flex items-center gap-2 text-[11px] text-ink-4">
            <span>People in thread</span>
            <span className="inline-flex -space-x-2">
              <Avatar name={task.ownerName} size="sm" />
              {comments.slice(0, 3).map((comment) => <Avatar key={comment.id} name={comment.authorName} size="sm" />)}
            </span>
          </div>
        )}
        <div className="border-t border-line pt-3">
          <CommentThread objectTable="tasks" objectId={task.id} comments={comments} />
        </div>
      </div>
    </details>
  );
}

function ListView({ tasks, members, commentsByTask }: { tasks: TaskView[]; members: MemberRef[]; commentsByTask: Map<string, CommentView[]> }) {
  const open = tasks.filter((task) => task.status === 'active' && !task.blocked);
  const blocked = tasks.filter((task) => task.status === 'active' && task.blocked);
  const done = tasks.filter((task) => task.status !== 'active');

  return (
    <div className="space-y-5 md:space-y-6">
      {blocked.length > 0 && (
        <Reveal>
          <SectionLabel right={<span className="tnum text-[12px] text-risk">{blocked.length}</span>}>Blocked</SectionLabel>
          <Panel>{blocked.map((task) => <TaskRow key={task.id} task={task} members={members} comments={commentsByTask.get(task.id) ?? []} />)}</Panel>
        </Reveal>
      )}
      <Reveal delay={60}>
        <SectionLabel right={<span className="tnum text-[12px] text-ink-3">{open.length}</span>}>Open</SectionLabel>
        {open.length === 0 ? (
          <p className="rounded-lg border border-line bg-surface px-4 py-4 text-[13px] text-ink-3">Nothing open.</p>
        ) : (
          <Panel>{open.map((task) => <TaskRow key={task.id} task={task} members={members} comments={commentsByTask.get(task.id) ?? []} />)}</Panel>
        )}
      </Reveal>
      {done.length > 0 && (
        <Reveal delay={120}>
          <SectionLabel right={<span className="tnum text-[12px] text-ink-3">{done.length}</span>}>Done</SectionLabel>
          <details className="rounded-xl border border-line bg-surface shadow-card">
            <summary className="flex cursor-pointer list-none items-center justify-between px-4 py-3 text-[12.5px] font-medium text-ink-2 marker:hidden [&::-webkit-details-marker]:hidden">
              <span>Completed work · {done.length}</span>
              <Icon name="chevron-down" className="h-4 w-4 text-ink-4" />
            </summary>
            <div className="border-t border-line">{done.map((task) => <TaskRow key={task.id} task={task} members={members} comments={commentsByTask.get(task.id) ?? []} />)}</div>
          </details>
        </Reveal>
      )}
    </div>
  );
}

function BoardViewForWorkspace({ tasks, commentsByTask }: { tasks: TaskView[]; commentsByTask: Map<string, CommentView[]> }) {
  const router = useRouter();
  const columns: BoardColumn<TaskView>[] = [
    { value: 'blocked', label: 'Blocked', items: tasks.filter((task) => task.status === 'active' && task.blocked) },
    { value: 'open', label: 'Open', items: tasks.filter((task) => task.status === 'active' && !task.blocked) },
    { value: 'done', label: 'Done', items: tasks.filter((task) => task.status !== 'active') }
  ];

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
            <div className="flex items-center gap-1.5">
              <Avatar name={task.ownerName} size="sm" />
              <p className="min-w-0 truncate text-[11px] text-ink-3">
                {task.ownerName}{task.projectName ? ` · ${task.projectName}` : ''}{comments.length > 0 && ` · ${comments.length} comment${comments.length === 1 ? '' : 's'}`}
              </p>
            </div>
            {task.due_date && <p className={`tnum text-[11px] ${overdue ? 'font-medium text-risk' : 'text-ink-4'}`}>due {formatDate(task.due_date)}</p>}
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
    .filter((task): task is TaskView & { due_date: string } => Boolean(task.due_date))
    .map((task) => ({ id: task.id, title: task.title, subtitle: task.ownerName, date: task.due_date, state: task.status === 'active' ? (task.blocked ? 'blocked' : 'open') : 'done' }));
  return <CalendarView items={items} />;
}

export function WorkspaceView({ tasks, members, commentsByTask }: { tasks: TaskView[]; members: MemberRef[]; commentsByTask: Map<string, CommentView[]> }) {
  const [view, setView] = useState<'list' | 'board' | 'calendar'>('list');

  if (tasks.length === 0) {
    return <EmptyState icon="workspace" title="No tasks yet." hint="Anything that isn't a full commitment can still live here." />;
  }

  return (
    <div>
      <div className="mb-4">
        <Segmented items={[{ value: 'list', label: 'List' }, { value: 'board', label: 'Board' }, { value: 'calendar', label: 'Calendar' }]} value={view} onValueChange={(value) => setView(value as 'list' | 'board' | 'calendar')} />
      </div>
      {view === 'list' && <ListView tasks={tasks} members={members} commentsByTask={commentsByTask} />}
      {view === 'board' && <BoardViewForWorkspace tasks={tasks} commentsByTask={commentsByTask} />}
      {view === 'calendar' && <CalendarViewForWorkspace tasks={tasks} />}
    </div>
  );
}